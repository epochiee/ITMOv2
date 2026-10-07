"""Render commits to Markdown."""

from changelog_gen.parser import Commit

SECTIONS = (("feat", "Features"), ("fix", "Fixes"))
OTHER = "Other"


def _section_title(commit: Commit) -> str:
    for type_, title in SECTIONS:
        if commit.type == type_:
            return title
    return OTHER


def render(commits: list[Commit], version: str = "Unreleased") -> str:
    grouped: dict[str, list[Commit]] = {}
    for c in commits:
        grouped.setdefault(_section_title(c), []).append(c)

    lines = [f"## {version}", ""]
    for title in [t for _, t in SECTIONS] + [OTHER]:
        if title not in grouped:
            continue
        lines += [f"### {title}", ""]
        for c in grouped[title]:
            scope = f"**{c.scope}**: " if c.scope else ""
            lines.append(f"- {scope}{c.description}")
        lines.append("")
    return "\n".join(lines).rstrip("\n") + "\n" if grouped else "\n".join(lines)
