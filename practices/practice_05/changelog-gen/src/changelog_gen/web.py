"""Local web service: preview a changelog section in the browser (127.0.0.1 only).

Contract: specs/contracts/changelog-preview-api.md.
"""

import argparse
import json
import subprocess
import sys
import traceback
import unicodedata
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from importlib.resources import files
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from changelog_gen.core import TypesError, build_preview, parse_types
from changelog_gen.parser import TYPES

DEFAULT_PORT = 8765
DEFAULT_RANGE = "HEAD"
MAX_RANGE_LENGTH = 200
MAX_COMMITS = 1000
GIT_TIMEOUT = 10
ROUTES = ("/", "/api/meta", "/api/changelog")


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str, field=None, details=None):
        super().__init__(message)
        self.status, self.code, self.field, self.details = status, code, field, details or {}

    def body(self) -> dict:
        return {
            "error": {
                "code": self.code,
                "message": str(self),
                "field": self.field,
                "details": self.details,
            }
        }


def _not_a_repository() -> ApiError:
    return ApiError(503, "not_a_repository", "service directory is not a git repository")


def check_range(raw: str | None) -> str:
    """Apply the contract's range rules before git sees the value."""
    value = (raw or "").strip()
    if not value:
        return DEFAULT_RANGE
    if len(value) > MAX_RANGE_LENGTH:
        rule = "too_long"
    elif value.startswith("-"):
        rule = "leading_dash"
    elif any(ch.isspace() for ch in value):
        rule = "whitespace"
    elif any(unicodedata.category(ch) == "Cc" for ch in value):
        rule = "control_char"
    else:
        return value
    details = {"rule": rule, "max_length": MAX_RANGE_LENGTH}
    raise ApiError(400, "invalid_range", f"range rejected: {rule}", "range", details)


def _git(repo: Path, *args: str) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(
            ["git", *args],
            cwd=repo,
            capture_output=True,
            encoding="utf-8",
            errors="replace",
            timeout=GIT_TIMEOUT,
            check=False,
        )
    except FileNotFoundError:
        raise ApiError(500, "git_error", "git executable not found", details={"reason": "not_found"}) from None
    except subprocess.TimeoutExpired:
        message = f"git did not finish in {GIT_TIMEOUT}s"
        raise ApiError(500, "git_error", message, details={"reason": "timeout"}) from None


def repo_name(repo: Path) -> str:
    result = _git(repo, "rev-parse", "--show-toplevel")
    if result.returncode != 0:
        raise _not_a_repository()
    return Path(result.stdout.strip()).name


def read_history(repo: Path, rev_range: str) -> list[str]:
    """Read at most MAX_COMMITS + 1 messages; the range is only ever a revision."""
    result = _git(
        repo, "log", "--format=%B%x00", "-n", str(MAX_COMMITS + 1),
        "--end-of-options", rev_range, "--",
    )  # fmt: skip
    if result.returncode != 0:
        if _git(repo, "rev-parse", "--git-dir").returncode != 0:
            raise _not_a_repository()
        unborn = _git(repo, "rev-parse", "--verify", "-q", "HEAD").returncode != 0
        if rev_range == DEFAULT_RANGE and unborn:
            return []
        details = {"range": rev_range}
        raise ApiError(422, "unknown_range", f"unknown revision or range {rev_range!r}", "range", details)
    entries = result.stdout.split("\0")[:-1]
    if len(entries) > MAX_COMMITS:
        message = f"range has more than {MAX_COMMITS} commits"
        raise ApiError(422, "range_too_large", message, "range", {"limit": MAX_COMMITS})
    return [m.strip() for m in entries if m.strip()]


def meta(repo: Path) -> dict:
    return {
        "repository": repo_name(repo),
        "types": list(TYPES),
        "default_range": DEFAULT_RANGE,
        "max_range_length": MAX_RANGE_LENGTH,
        "max_commits": MAX_COMMITS,
    }


def changelog(repo: Path, params: dict[str, list[str]]) -> dict:
    unknown = sorted(set(params) - {"range", "types"})
    if unknown:
        name = unknown[0]
        raise ApiError(400, "invalid_request", f"unknown parameter {name!r}", name, {"parameter": name})
    if len(params.get("range", [])) > 1:
        message = "parameter 'range' given more than once"
        raise ApiError(400, "invalid_request", message, "range", {"parameter": "range"})
    types = None
    if "types" in params:
        try:
            types = parse_types(params["types"])
        except TypesError as exc:
            details = {"invalid": exc.invalid, "allowed": list(TYPES)}
            raise ApiError(400, "invalid_types", str(exc), "types", details) from None
    rev_range = check_range(params.get("range", [None])[0])
    preview = build_preview(read_history(repo, rev_range), types)
    return {
        "range": rev_range,
        "types": types,
        "markdown": preview.markdown,
        "stats": {
            "total": preview.total,
            "included": preview.included,
            "filtered_out": preview.filtered_out,
            "skipped": len(preview.skipped),
        },
        "skipped": [{"header": header, "reason": reason} for header, reason in preview.skipped],
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "changelog-gen-web"

    def do_GET(self):
        self._handle(self._get)

    def do_POST(self):
        self._handle(self._method_not_allowed)

    do_PUT = do_PATCH = do_DELETE = do_HEAD = do_OPTIONS = do_POST

    def _handle(self, action):
        try:
            port = self.server.server_port
            if self.headers.get("Host") not in (f"127.0.0.1:{port}", f"localhost:{port}"):
                raise ApiError(403, "forbidden", "unexpected Host header")
            url = urlsplit(self.path)
            if url.path not in ROUTES:
                raise ApiError(404, "not_found", f"no route for {url.path}")
            action(url)
        except ApiError as exc:
            self._send_json(exc.status, exc.body())
        except Exception:  # noqa: BLE001 - client gets a contract error, details stay in the terminal
            traceback.print_exc()
            error = ApiError(500, "git_error", "unexpected server error", details={"reason": "failed"})
            self._send_json(500, error.body())

    def _get(self, url):
        repo = self.server.repo
        if url.path == "/":
            page = files("changelog_gen").joinpath("static/index.html").read_bytes()
            self._send(200, page, "text/html; charset=utf-8")
        elif url.path == "/api/meta":
            self._send_json(200, meta(repo))
        else:
            try:
                params = parse_qs(url.query, keep_blank_values=True, errors="strict")
            except UnicodeDecodeError:
                raise ApiError(400, "invalid_request", "query is not valid UTF-8") from None
            self._send_json(200, changelog(repo, params))

    def _method_not_allowed(self, url):
        raise ApiError(405, "method_not_allowed", f"{self.command} is not allowed")

    def _send_json(self, status: int, data: dict):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self._send(status, body, "application/json; charset=utf-8")

    def _send(self, status: int, body: bytes, content_type: str):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)


class Server(ThreadingHTTPServer):
    daemon_threads = True
    # On Windows SO_REUSEADDR lets a second server bind a busy port silently.
    allow_reuse_address = sys.platform != "win32"

    def __init__(self, repo: Path, port: int):
        super().__init__(("127.0.0.1", port), Handler)
        self.repo = repo


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="changelog-gen-web",
        description="Serve a local changelog preview page for the git repository in the current "
        "directory (127.0.0.1 only).",
        allow_abbrev=False,
    )
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help=f"default: {DEFAULT_PORT}")
    args = parser.parse_args(argv)
    if not 1 <= args.port <= 65535:
        parser.error("--port must be between 1 and 65535")
    repo = Path.cwd()
    try:
        name = repo_name(repo)
    except ApiError as exc:
        print(f"changelog-gen-web: {exc}; run it inside a git working tree", file=sys.stderr)
        return 1
    try:
        server = Server(repo, args.port)
    except OSError as exc:
        print(f"changelog-gen-web: cannot listen on 127.0.0.1:{args.port}: {exc.strerror}", file=sys.stderr)
        return 1
    url = f"http://127.0.0.1:{server.server_port}/"
    print(f"Serving changelog preview for {name} at {url} (Ctrl+C to stop)", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
