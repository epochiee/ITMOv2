"""Render commits to Markdown."""

from changelog_gen.parser import Commit


def render(commits: list[Commit], version: str = "Unreleased") -> str:
    lines = [f"## {version}", ""]
    for c in commits:
        scope = f"**{c.scope}**: " if c.scope else ""
        lines.append(f"- {scope}{c.description}")
    return "\n".join(lines) + "\n"
