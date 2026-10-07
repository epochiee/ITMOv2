"""Parse Conventional Commit messages."""

import re
from dataclasses import dataclass

TYPES = ("feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore")

_HEADER = re.compile(r"^(?P<type>[a-z]+)(?:\((?P<scope>[^()\s]+)\))?(?P<bang>!)?: (?P<desc>\S.*)$")


class CommitParseError(ValueError):
    """Raised when a message is not a valid Conventional Commit."""


@dataclass(frozen=True)
class Commit:
    type: str
    scope: str | None
    description: str
    breaking: bool = False


def parse_commit(message: str) -> Commit:
    header = message.strip().splitlines()[0] if message.strip() else ""
    match = _HEADER.match(header)
    if not match:
        raise CommitParseError(f"not a Conventional Commit header: {header!r}")
    if match["type"] not in TYPES:
        raise CommitParseError(f"unknown type {match['type']!r}, expected one of {', '.join(TYPES)}")
    return Commit(match["type"], match["scope"], match["desc"], bool(match["bang"]))
