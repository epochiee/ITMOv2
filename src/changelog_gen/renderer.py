"""Render commits to Markdown."""

from changelog_gen.parser import Commit


def _item(commit: Commit) -> str:
    scope = f"**{commit.scope}**: " if commit.scope else ""
    return f"- {scope}{commit.description}"


def render(commits: list[Commit], version: str = "Unreleased") -> str:
    breaking = [c for c in commits if c.breaking]
    regular = [c for c in commits if not c.breaking]

    lines = [f"## {version}", ""]
    if breaking:
        lines += ["### Breaking Changes", ""]
        lines += [_item(c) for c in breaking]
        lines.append("")
        if regular:
            lines += ["### Changes", ""]
    lines += [_item(c) for c in regular]
    return "\n".join(lines) + "\n"
