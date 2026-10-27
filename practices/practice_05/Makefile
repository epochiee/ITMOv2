.PHONY: install test specs run

SHELL := bash
PROJECT := changelog-gen
# Windows venv keeps python in Scripts/, POSIX in bin/
PY = $$( [ -x .venv/Scripts/python ] && echo .venv/Scripts/python || echo .venv/bin/python )
export OPENSPEC_TELEMETRY := 0

install:
	cd $(PROJECT) && python -m venv .venv && $(PY) -m pip install -q -e ".[dev]"

test:
	bash $(PROJECT)/scripts/check.sh
	cd $(PROJECT) && openspec validate --all --strict --no-interactive

specs:
	cd $(PROJECT) && openspec list && openspec list --specs

run:
	cd $(PROJECT) && $(PY) -m changelog_gen.web
