"""Security regression tests for the found attacks.

Each test asserts the *secure* behaviour, so it passes against the fixed
service.py and fails against the original vulnerable one. Data is synthetic.
"""

import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from service import Shop, make_handler


class SecurityTest(unittest.TestCase):
    def setUp(self):
        self.shop = Shop()
        self.addCleanup(self.shop.close)

    def request(self, method, path, body=None, headers=None):
        with self.shop.lock:
            return self.shop.dispatch(method, path, body or {}, headers or {})

    def auth(self, username="alice", password="learn-alice"):
        status, result = self.request("POST", "/login", {"username": username, "password": password})
        self.assertEqual(status, 200)
        return {"X-Token": result["token"]}

    # --- SQL injection (parameterization) ---------------------------------
    def test_profile_sqli_returns_only_own_row(self):
        status, rows = self.request("GET", "/profile?id=0 OR 1=1", headers=self.auth())
        self.assertEqual(status, 200)
        self.assertEqual([r["name"] for r in rows], ["TEST_ALICE"])

    def test_search_sqli_does_not_leak_other_profiles(self):
        status, rows = self.request("GET", "/search?q=%' OR '1'='1", headers=self.auth())
        self.assertEqual(status, 200)
        self.assertTrue(all(r["name"] == "TEST_ALICE" for r in rows))

    def test_assistant_context_order_id_must_be_integer(self):
        status, _ = self.request("GET", "/assistant/context?order_id=0 OR 1=1", headers=self.auth())
        self.assertEqual(status, 400)

    # --- broken access control / IDOR -------------------------------------
    def test_profile_requires_session(self):
        self.assertEqual(self.request("GET", "/profile?id=1")[0], 401)

    def test_profile_ignores_foreign_id(self):
        status, rows = self.request("GET", "/profile?id=2", headers=self.auth())
        self.assertEqual((status, rows[0]["name"]), (200, "TEST_ALICE"))

    def test_orders_requires_session_and_scopes_to_owner(self):
        self.assertEqual(self.request("GET", "/orders")[0], 401)
        status, rows = self.request("GET", "/orders", headers=self.auth())
        self.assertEqual(status, 200)
        self.assertTrue(all(o["owner"] == 1 for o in rows))

    def test_files_rejects_cross_user_and_private(self):
        auth = self.auth()
        # A path that points at another user or the private area is refused.
        for path in ("files/bob/receipt.txt", "../bob/receipt.txt", "private/operator-note.txt",
                     "../private/operator-note.txt"):
            self.assertEqual(self.request("GET", f"/files?path={path}", headers=auth)[0], 403, path)
        # The 'user' query param is ignored: identity comes from the session, so
        # user=bob still yields Alice's own receipt, never Bob's data.
        status, spoof = self.request("GET", "/files?user=bob&path=receipt.txt", headers=auth)
        self.assertEqual(status, 200)
        self.assertIn("TEST_ALICE", spoof["content"])
        self.assertNotIn("TEST_BOB", spoof["content"])
        # The plain own receipt is readable.
        status, own = self.request("GET", "/files?path=receipt.txt", headers=auth)
        self.assertEqual(status, 200)
        self.assertIn("TEST_ALICE", own["content"])

    # --- privilege escalation ---------------------------------------------
    def test_admin_export_ignores_client_role_header(self):
        self.assertEqual(self.request("GET", "/admin/export", headers={"X-Role": "staff"})[0], 403)
        customer = {**self.auth(), "X-Role": "staff"}
        self.assertEqual(self.request("GET", "/admin/export", headers=customer)[0], 403)
        staff = self.auth("staff", "learn-staff")
        self.assertEqual(self.request("GET", "/admin/export", headers=staff)[0], 200)

    def test_debug_logs_staff_only_and_has_no_secrets(self):
        self.assertEqual(self.request("GET", "/debug/logs", headers=self.auth())[0], 403)
        staff = self.auth("staff", "learn-staff")
        status, logs = self.request("GET", "/debug/logs", headers=staff)
        self.assertEqual(status, 200)
        dump = json.dumps(logs, ensure_ascii=False)
        self.assertNotIn("learn-", dump)
        self.assertNotIn("X-Token", dump)

    # --- business logic ----------------------------------------------------
    def test_order_price_is_catalog_price(self):
        auth = self.auth()
        status, order = self.request("POST", "/orders", {"product": "chair", "price": 1}, auth)
        self.assertEqual((status, order["price"]), (201, 5000))
        _, order = self.request("POST", "/orders", {"product": "chair", "price": -5000}, auth)
        self.assertEqual(order["price"], 5000)

    # --- stored XSS --------------------------------------------------------
    def test_reviews_view_escapes_html(self):
        auth = self.auth()
        self.request("POST", "/reviews", {"product": "chair", "text": "<script>alert(1)</script>"}, auth)
        _, page = self.request("GET", "/reviews/view", headers=auth)
        self.assertNotIn("<script>", page)
        self.assertIn("&lt;script&gt;", page)

    # --- excessive agency in the assistant executor -----------------------
    def test_execute_requires_session(self):
        status, _ = self.request("POST", "/assistant/execute",
                                 {"decision": {"tool": "export_profiles"}})
        self.assertEqual(status, 401)

    def test_execute_read_file_scoped_to_own_dir(self):
        auth = self.auth()
        ok = self.request("POST", "/assistant/execute",
                          {"decision": {"tool": "read_file", "arguments": {"path": "files/alice/receipt.txt"}}}, auth)
        self.assertEqual(ok[0], 200)
        self.assertIn("TEST_ALICE", ok[1]["content"])
        for bad in ("files/bob/receipt.txt", "private/operator-note.txt", "../private/operator-note.txt"):
            status, _ = self.request("POST", "/assistant/execute",
                                     {"decision": {"tool": "read_file", "arguments": {"path": bad}}}, auth)
            self.assertEqual(status, 403, bad)

    def test_execute_export_profiles_is_staff_only(self):
        self.assertEqual(self.request("POST", "/assistant/execute",
                                      {"decision": {"tool": "export_profiles"}}, self.auth())[0], 403)
        staff = self.auth("staff", "learn-staff")
        self.assertEqual(self.request("POST", "/assistant/execute",
                                      {"decision": {"tool": "export_profiles"}}, staff)[0], 200)

    def test_execute_delete_tree_not_exposed(self):
        status, _ = self.request("POST", "/assistant/execute",
                                 {"decision": {"tool": "delete_tree", "arguments": {"path": "files"}}}, self.auth())
        self.assertEqual(status, 400)


class ErrorLeakTest(unittest.TestCase):
    """The HTTP layer must not leak exception text or type on a 500."""

    @classmethod
    def setUpClass(cls):
        cls.shop = Shop()
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(cls.shop))
        cls.server.daemon_threads = True
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.thread.join(timeout=5)
        cls.server.server_close()
        cls.shop.close()

    def test_malformed_json_gives_generic_error(self):
        request = Request(self.base + "/login", data=b"{not json",
                          headers={"Content-Type": "application/json"}, method="POST")
        try:
            response = urlopen(request, timeout=5)
        except HTTPError as exc:
            response = exc
        with response:
            status, body = response.status, json.loads(response.read().decode())
        self.assertEqual(status, 500)
        self.assertEqual(body, {"error": "internal error"})
        self.assertNotIn("type", body)


if __name__ == "__main__":
    unittest.main()
