"""Changelog logic shared by the CLI and the web service."""

from dataclasses import dataclass, field

from changelog_gen.parser import TYPES, Commit, CommitParseError, parse_commit
from changelog_gen.renderer import render


class TypesError(ValueError):
    """Raised when a type filter contains an empty or unknown type."""

    def __init__(self, invalid: list[str]):
        self.invalid = invalid
        super().__init__(
            f"unknown type {', '.join(map(repr, invalid))}, expected one of {', '.join(TYPES)}"
        )


def parse_types(values: list[str]) -> list[str]:
    """Merge comma-separated type lists into known types in `TYPES` order."""
    names = [name.strip() for value in values for name in value.split(",")]
    bad = [name for name in names if name not in TYPES]
    if bad:
        raise TypesError(bad)
    return [t for t in TYPES if t in names]


def select(commits: list[Commit], types: list[str] | None) -> list[Commit]:
    """Keep commits of the given types; breaking changes are always kept."""
    if types is None:
        return commits
    return [c for c in commits if c.breaking or c.type in types]


@dataclass(frozen=True)
class Preview:
    markdown: str
    total: int
    included: int
    filtered_out: int
    skipped: list[tuple[str, str]] = field(default_factory=list)  # (header, reason)


def build_preview(messages: list[str], types: list[str] | None) -> Preview:
    commits, skipped = [], []
    for message in messages:
        try:
            commits.append(parse_commit(message))
        except CommitParseError as exc:
            skipped.append((message.splitlines()[0], str(exc)))
    included = select(commits, types)
    return Preview(
        render(included), len(messages), len(included), len(commits) - len(included), skipped
    )
