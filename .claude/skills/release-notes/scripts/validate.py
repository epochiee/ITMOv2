"""Validate a release-notes Markdown file. Exit 0 if ok, 1 with messages otherwise."""

import re
import sys


def validate(text: str) -> list[str]:
    errors = []
    lines = text.splitlines()
    if not lines or not re.match(r"^## \S+ — \d{4}-\d{2}-\d{2}$", lines[0]):
        errors.append("first line must be '## <version> — <YYYY-MM-DD>'")
    section = None
    seen: set[str] = set()
    items: dict[str, int] = {}
    for line in lines[1:]:
        if line.startswith("### "):
            section = line[4:].strip()
            items[section] = 0
        elif line.startswith("- "):
            if section is None:
                errors.append(f"item outside section: {line}")
                continue
            items[section] += 1
            if line in seen:
                errors.append(f"duplicate entry: {line}")
            seen.add(line)
    errors += [f"empty section: {name}" for name, n in items.items() if n == 0]
    return errors


if __name__ == "__main__":
    with open(sys.argv[1], encoding="utf-8") as f:
        problems = validate(f.read())
    for p in problems:
        print(p)
    print("OK" if not problems else f"{len(problems)} problem(s)")
    raise SystemExit(1 if problems else 0)
