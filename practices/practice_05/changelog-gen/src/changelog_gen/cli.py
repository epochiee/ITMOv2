"""Command line entry point: read git log, print a changelog."""

import argparse
import subprocess
import sys

from changelog_gen.core import TypesError, build_preview, parse_types
from changelog_gen.parser import TYPES


def read_messages(rev_range: str = "HEAD") -> list[str]:
    out = subprocess.run(
        ["git", "log", "--format=%B%x00", rev_range], capture_output=True, text=True, check=True
    )
    return [m.strip() for m in out.stdout.split("\0") if m.strip()]


def _types(value: str) -> list[str]:
    try:
        return parse_types([value])
    except TypesError as exc:
        raise argparse.ArgumentTypeError(str(exc)) from None


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="changelog-gen",
        description="Print a Markdown changelog from Conventional Commits in git history.",
        allow_abbrev=False,
    )
    parser.add_argument("range", nargs="?", default="HEAD", help="git revision range (default: HEAD)")
    parser.add_argument(
        "--types",
        action="append",
        type=_types,
        metavar="TYPE[,TYPE...]",
        help=f"only include these commit types; repeatable, breaking changes are always included "
        f"(types: {', '.join(TYPES)})",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    types = [t for chunk in args.types for t in chunk] if args.types else None
    preview = build_preview(read_messages(args.range), types)
    for _, reason in preview.skipped:
        print(f"skip: {reason}", file=sys.stderr)
    sys.stdout.write(preview.markdown)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
