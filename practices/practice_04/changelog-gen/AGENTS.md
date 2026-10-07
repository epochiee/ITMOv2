# changelog-gen

Python-утилита: читает git-историю в формате Conventional Commits и печатает changelog (Markdown).

## Структура
- `src/changelog_gen/parser.py` — разбор сообщения коммита (`parse_commit`, `Commit`).
- `src/changelog_gen/renderer.py` — вывод списка коммитов в Markdown.
- `src/changelog_gen/cli.py` — точка входа, читает `git log`.
- `mcp_server/server.py` — собственный MCP-сервер (tool `parse_commit`).
- `scripts/check.sh` — единая проверка (ruff + pytest). Её же запускает hook.
- `.claude/skills/release-notes/` — skill генерации release notes.

## Команды
Всегда используй python из `.venv` (на Windows: `.venv/Scripts/python`).
- Тесты: `.venv/Scripts/python -m pytest -q`
- Линтер: `.venv/Scripts/python -m ruff check .`
- Всё сразу: `bash scripts/check.sh`

## Правила
- Не пиши свой regex для коммитов: используй `changelog_gen.parser` или MCP tool `parse_commit`.
- Любое изменение поведения сопровождай тестом в `tests/`.
- Типы коммитов: feat, fix, docs, style, refactor, perf, test, build, ci, chore.
- Свои коммиты — только в формате Conventional Commits, на английском, в повелительном наклонении.
- Не трогай `tests/fixtures/` без прямой просьбы; не добавляй зависимости без согласования.
- Работа над фичами ведётся в отдельных ветках/worktree, прямых коммитов в `main` нет.

## Готово, когда
`bash scripts/check.sh` завершается кодом 0.
