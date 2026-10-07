"""Command line entry point: read git log, print a changelog."""

import subprocess
import sys

from changelog_gen.parser import CommitParseError, parse_commit
from changelog_gen.renderer import render


def read_messages(rev_range: str = "HEAD") -> list[str]:
    out = subprocess.run(
        ["git", "log", "--format=%B%x00", rev_range], capture_output=True, text=True, check=True
    )
    return [m.strip() for m in out.stdout.split("\0") if m.strip()]


def main() -> int:
    commits = []
    for message in read_messages(sys.argv[1] if len(sys.argv) > 1 else "HEAD"):
        try:
            commits.append(parse_commit(message))
        except CommitParseError as exc:
            print(f"skip: {exc}", file=sys.stderr)
    sys.stdout.write(render(commits))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
