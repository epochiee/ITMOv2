"""Real MCP client: starts mcp_server/server.py over stdio and calls parse_commit."""

import asyncio
import json
import sys

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

CASES = ["feat(api)!: drop v1", "fix: handle empty log", "update stuff", ""]


async def main() -> None:
    params = StdioServerParameters(command=sys.executable, args=["mcp_server/server.py"])
    async with stdio_client(params) as (read, write), ClientSession(read, write) as session:
        await session.initialize()
        tools = await session.list_tools()
        print("tools:", [t.name for t in tools.tools])
        for message in CASES:
            result = await session.call_tool("parse_commit", {"message": message})
            print(f"parse_commit({message!r}) isError={result.is_error}")
            print(json.dumps(json.loads(result.content[0].text), ensure_ascii=False))


asyncio.run(main())
