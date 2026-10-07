"""Render commits to Markdown."""

from changelog_gen.parser import Commit

BREAKING = "Breaking Changes"
SECTIONS = (("feat", "Features"), ("fix", "Fixes"))
OTHER = "Other"


def _section_title(commit: Commit) -> str:
    for type_, title in SECTIONS:
        if commit.type == type_:
            return title
    return OTHER


def _item(commit: Commit) -> str:
    scope = f"**{commit.scope}**: " if commit.scope else ""
    return f"- {scope}{commit.description}"


def render(commits: list[Commit], version: str = "Unreleased") -> str:
    grouped: dict[str, list[Commit]] = {}
    for c in commits:
        title = BREAKING if c.breaking else _section_title(c)
        grouped.setdefault(title, []).append(c)

    lines = [f"## {version}", ""]
    for title in [BREAKING] + [t for _, t in SECTIONS] + [OTHER]:
        if title not in grouped:
            continue
        lines += [f"### {title}", ""]
        lines += [_item(c) for c in grouped[title]]
        lines.append("")
    return "\n".join(lines).rstrip("\n") + "\n" if grouped else "\n".join(lines)
