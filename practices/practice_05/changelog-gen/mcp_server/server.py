"""MCP server exposing changelog-gen's commit parser as a tool."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from mcp.server.mcpserver import MCPServer

from changelog_gen.parser import CommitParseError
from changelog_gen.parser import parse_commit as _parse

mcp = MCPServer("changelog-gen")


@mcp.tool()
def parse_commit(message: str) -> dict:
    """Parse a Conventional Commit message into type, scope, description and breaking flag.

    Returns {"ok": true, ...fields} or {"ok": false, "error": "..."} for invalid input.
    """
    try:
        c = _parse(message)
    except CommitParseError as exc:
        return {"ok": False, "error": str(exc)}
    return {
        "ok": True,
        "type": c.type,
        "scope": c.scope,
        "description": c.description,
        "breaking": c.breaking,
    }


if __name__ == "__main__":
    mcp.run()
