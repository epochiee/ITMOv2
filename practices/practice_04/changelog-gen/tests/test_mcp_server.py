import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "mcp_server"))

from server import parse_commit


def test_parse_commit_ok():
    assert parse_commit("feat(api)!: drop v1") == {
        "ok": True,
        "type": "feat",
        "scope": "api",
        "description": "drop v1",
        "breaking": True,
    }


def test_parse_commit_invalid_input_returns_error_data():
    result = parse_commit("update stuff")
    assert result["ok"] is False
    assert "update stuff" in result["error"]


def test_parse_commit_empty_message():
    assert parse_commit("")["ok"] is False
