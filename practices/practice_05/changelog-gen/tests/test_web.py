import json
import re
import socket
import subprocess
import sys
import threading
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import pytest

from changelog_gen import web

HISTORY = ("fix: bug", "update stuff", "docs: readme", "feat(api): add x", "refactor(core)!: drop v1")


def _git(repo, *args):
    subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True)


def _repo(path, *messages):
    _git(path, "init", "-q")
    _git(path, "config", "user.email", "t@example.com")
    _git(path, "config", "user.name", "t")
    for message in messages:
        _git(path, "commit", "-q", "--allow-empty", "-m", message)
    return path


@pytest.fixture
def serve():
    servers = []

    def start(repo):
        server = web.Server(repo, 0)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        servers.append((server, thread))
        return f"http://127.0.0.1:{server.server_port}"

    yield start
    for server, thread in servers:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()


def call(base, path, method="GET", host=None):
    request = Request(base + path, method=method)
    if host:
        request.add_header("Host", host)
    try:
        response = urlopen(request, timeout=10)
    except HTTPError as exc:
        response = exc
    with response:
        body = response.read().decode("utf-8")
        content_type = response.headers["Content-Type"]
        data = json.loads(body) if content_type.startswith("application/json") else body
        return response.status, response.headers, data


def cli_output(repo, *argv):
    result = subprocess.run(
        [sys.executable, "-m", "changelog_gen.cli", *argv],
        cwd=repo, capture_output=True, check=True,
    )  # fmt: skip
    return result.stdout.decode("utf-8").replace("\r\n", "\n")


# --- unit: range rules ---------------------------------------------------------------------


@pytest.mark.parametrize("raw", [None, "", "   "])
def test_check_range_defaults_to_head(raw):
    assert web.check_range(raw) == "HEAD"


@pytest.mark.parametrize(
    ("raw", "rule"),
    [
        ("--output=x", "leading_dash"),
        ("-3", "leading_dash"),
        ("HEAD main", "whitespace"),
        ("HEAD\nmain", "whitespace"),
        ("HEAD\x00", "control_char"),
        ("a" * 201, "too_long"),
    ],
)
def test_check_range_rejects(raw, rule):
    with pytest.raises(web.ApiError) as excinfo:
        web.check_range(raw)

    assert excinfo.value.code == "invalid_range"
    assert excinfo.value.details == {"rule": rule, "max_length": 200}


def test_check_range_trims_and_keeps_revision_syntax():
    assert web.check_range("  v1.0..HEAD@{0}~2^:x/y+z ") == "v1.0..HEAD@{0}~2^:x/y+z"


# --- US1: section equals CLI ---------------------------------------------------------------


@pytest.mark.parametrize(
    ("query", "argv"),
    [("", ()), ("?types=feat,fix", ("--types", "feat,fix")), ("?range=HEAD~3..HEAD&types=docs",
                                                             ("HEAD~3..HEAD", "--types", "docs"))],
)
def test_changelog_matches_cli_byte_for_byte(query, argv, tmp_path, serve):
    repo = _repo(tmp_path, *HISTORY)
    base = serve(repo)

    status, headers, data = call(base, "/api/changelog" + query)

    assert status == 200
    assert headers["Cache-Control"] == "no-store"
    assert data["markdown"] == cli_output(repo, *argv)


def test_changelog_stats_and_skipped(tmp_path, serve):
    base = serve(_repo(tmp_path, *HISTORY))

    _, _, data = call(base, "/api/changelog?types=feat")

    assert data["range"] == "HEAD"
    assert data["types"] == ["feat"]
    assert data["stats"] == {"total": 5, "included": 2, "filtered_out": 2, "skipped": 1}
    assert data["skipped"] == [
        {"header": "update stuff", "reason": "not a Conventional Commit header: 'update stuff'"}
    ]


# --- US2: types like CLI -------------------------------------------------------------------


def test_types_repeated_and_spaced_are_merged(tmp_path, serve):
    base = serve(_repo(tmp_path, *HISTORY))

    _, _, a = call(base, "/api/changelog?types=fix&types=%20feat%20")
    _, _, b = call(base, "/api/changelog?types=feat,fix")

    assert a == b
    assert a["types"] == ["feat", "fix"]


@pytest.mark.parametrize(("query", "invalid"), [("types=", [""]), ("types=feat,", [""]),
                                                ("types=FEAT,feature", ["FEAT", "feature"])])
def test_invalid_types_fail_before_git(query, invalid, tmp_path, serve, monkeypatch):
    monkeypatch.setattr(web, "read_history", lambda *a: pytest.fail("git must not be called"))
    base = serve(_repo(tmp_path, *HISTORY))

    status, _, data = call(base, "/api/changelog?" + query)

    assert status == 400
    assert data["error"]["code"] == "invalid_types"
    assert data["error"]["field"] == "types"
    assert data["error"]["details"] == {"invalid": invalid, "allowed": list(web.TYPES)}


# --- US3: input safety ---------------------------------------------------------------------


def test_option_injection_is_rejected_and_writes_nothing(tmp_path, serve):
    repo = _repo(tmp_path, *HISTORY)
    base = serve(repo)

    status, _, data = call(base, "/api/changelog?range=--output%3Dpwned.txt")

    assert status == 400
    assert data["error"]["details"]["rule"] == "leading_dash"
    assert not (repo / "pwned.txt").exists()


def test_range_is_never_read_as_a_path(tmp_path, serve):
    repo = _repo(tmp_path, *HISTORY)
    (repo / "README").write_text("x", encoding="utf-8")
    base = serve(repo)

    status, _, data = call(base, "/api/changelog?range=README")

    assert status == 422
    assert data["error"] == {
        "code": "unknown_range",
        "message": "unknown revision or range 'README'",
        "field": "range",
        "details": {"range": "README"},
    }


@pytest.mark.parametrize(
    ("path", "method", "host", "status", "code"),
    [
        ("/api/meta", "GET", "evil.example:80", 403, "forbidden"),
        ("/nope", "GET", None, 404, "not_found"),
        ("/api/changelog", "POST", None, 405, "method_not_allowed"),
        ("/api/changelog?foo=1", "GET", None, 400, "invalid_request"),
        ("/api/changelog?range=HEAD&range=HEAD", "GET", None, 400, "invalid_request"),
        ("/api/changelog?range=%FF", "GET", None, 400, "invalid_request"),
    ],
)
def test_protocol_errors(path, method, host, status, code, tmp_path, serve):
    base = serve(_repo(tmp_path, *HISTORY))

    got_status, _, data = call(base, path, method, host)

    assert (got_status, data["error"]["code"]) == (status, code)


def test_localhost_host_is_allowed(tmp_path, serve):
    base = serve(_repo(tmp_path, *HISTORY))
    port = base.rsplit(":", 1)[1]

    status, _, _ = call(base, "/api/meta", host=f"localhost:{port}")

    assert status == 200


# --- US4: git and environment errors -------------------------------------------------------


def test_unknown_range(tmp_path, serve):
    base = serve(_repo(tmp_path, *HISTORY))

    status, _, data = call(base, "/api/changelog?range=v9.9..HEAD")

    assert (status, data["error"]["code"], data["error"]["details"]) == (
        422, "unknown_range", {"range": "v9.9..HEAD"}
    )


def test_empty_repository_head_is_empty_result(tmp_path, serve):
    base = serve(_repo(tmp_path))

    status, _, data = call(base, "/api/changelog")
    other, _, error = call(base, "/api/changelog?range=main")

    assert status == 200
    assert data["markdown"] == "## Unreleased\n"
    assert data["stats"] == {"total": 0, "included": 0, "filtered_out": 0, "skipped": 0}
    assert (other, error["error"]["code"]) == (422, "unknown_range")


def test_not_a_repository(tmp_path, serve):
    base = serve(tmp_path)

    meta_status, _, meta = call(base, "/api/meta")
    log_status, _, log = call(base, "/api/changelog")

    assert (meta_status, meta["error"]["code"]) == (503, "not_a_repository")
    assert (log_status, log["error"]["code"]) == (503, "not_a_repository")
    assert str(tmp_path) not in json.dumps(meta) + json.dumps(log)


def test_git_timeout_is_reported_and_service_survives(tmp_path, serve, monkeypatch):
    base = serve(_repo(tmp_path, *HISTORY))
    real_run = subprocess.run

    def slow_git(cmd, **kwargs):
        if cmd[:2] == ["git", "log"]:
            raise subprocess.TimeoutExpired(cmd, web.GIT_TIMEOUT)
        return real_run(cmd, **kwargs)

    monkeypatch.setattr(web.subprocess, "run", slow_git)
    status, _, data = call(base, "/api/changelog")
    monkeypatch.setattr(web.subprocess, "run", real_run)

    assert (status, data["error"]["code"], data["error"]["details"]) == (
        500, "git_error", {"reason": "timeout"}
    )
    assert call(base, "/api/changelog")[0] == 200


# --- US5: large range ----------------------------------------------------------------------


def test_range_too_large(tmp_path, serve, monkeypatch):
    monkeypatch.setattr(web, "MAX_COMMITS", 4)
    base = serve(_repo(tmp_path, *HISTORY))

    status, _, data = call(base, "/api/changelog")
    ok, _, _ = call(base, "/api/changelog?range=HEAD~4..HEAD")

    assert (status, data["error"]["code"], data["error"]["details"]) == (
        422, "range_too_large", {"limit": 4}
    )
    assert ok == 200


# --- US6: meta, page, startup --------------------------------------------------------------


def test_meta(tmp_path, serve):
    repo = tmp_path / "my-repo"
    repo.mkdir()
    base = serve(_repo(repo, *HISTORY))

    status, _, data = call(base, "/api/meta")

    assert status == 200
    assert data == {
        "repository": "my-repo",
        "types": list(web.TYPES),
        "default_range": "HEAD",
        "max_range_length": 200,
        "max_commits": 1000,
    }


def test_page_is_self_contained(tmp_path, serve):
    base = serve(_repo(tmp_path, *HISTORY))

    status, headers, page = call(base, "/")

    assert status == 200
    assert headers["Content-Type"] == "text/html; charset=utf-8"
    for marker in ('id="range"', 'id="types"', 'id="show"', 'id="output"', 'id="copy"', "/api/meta"):
        assert marker in page
    assert not re.search(r"""(src|href)=["']https?:""", page)
    assert "innerHTML" not in page


def test_main_refuses_to_start_outside_repository(tmp_path, monkeypatch, capsys):
    monkeypatch.chdir(tmp_path)

    assert web.main(["--port", "8765"]) == 1
    assert "not a git repository" in capsys.readouterr().err


def test_main_refuses_busy_port(tmp_path, monkeypatch, capsys):
    monkeypatch.chdir(_repo(tmp_path, *HISTORY))
    with socket.socket() as busy:
        busy.bind(("127.0.0.1", 0))
        busy.listen()
        port = busy.getsockname()[1]

        assert web.main(["--port", str(port)]) == 1
    assert "cannot listen" in capsys.readouterr().err


def test_main_rejects_bad_port():
    with pytest.raises(SystemExit) as excinfo:
        web.main(["--port", "70000"])

    assert excinfo.value.code == 2
