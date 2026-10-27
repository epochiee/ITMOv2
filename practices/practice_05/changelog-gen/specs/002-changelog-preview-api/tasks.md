# Tasks: Логика предпросмотра changelog (HTTP API)

**Input**: `spec.md`, `plan.md`, `research.md`, контракт `specs/contracts/changelog-preview-api.md`
**Tests**: обязательны (конституция IV). Готово = `bash scripts/check.sh` с кодом 0.

## Phase 1: Setup

- [x] T001 Добавить в `pyproject.toml` скрипт `changelog-gen-web = "changelog_gen.web:main"` и `package-data` для `static/*.html`; переустановить пакет (`pip install -e ".[dev]"`) и проверить, что `changelog-gen-web --help` запускается

## Phase 2: Foundational (общее ядро, блокирует US)

- [x] T002 Создать `src/changelog_gen/core.py`: `TypesError`, `parse_types(values)`, `select(commits, types)`, `build_preview(messages, types)` (markdown, stats, skipped); тесты `tests/test_core.py`
- [x] T003 Перевести `cli.py` на `core.parse_types` и `core.select` без изменения поведения; проверка — все тесты `tests/test_cli.py` проходят без правок

## Phase 3: US1 — секция по диапазону = CLI (P1) 🎯 MVP

- [x] T004 [US1] `web.py`: чтение истории `git log --format=%B%x00 -n N+1 --end-of-options RANGE --` с таймаутом, классификация ошибок git (R3), операция «Построить секцию» → словарь по контракту п. 4
- [x] T005 [US1] HTTP: `ThreadingHTTPServer` на 127.0.0.1, маршруты `/api/meta`, `/api/changelog`, `/`; JSON с `Cache-Control: no-store`
- [x] T006 [US1] Сквозной тест: на временной истории `markdown` из `/api/changelog` побайтно равен stdout `changelog-gen` (без фильтра, с `--types`, с диапазоном), `stats` и `skipped` верны

## Phase 4: US2 — фильтр как в CLI (P1)

- [x] T007 [US2] `types` через запятую и повтором, `invalid_types` с `invalid`/`allowed` до git; тесты (пустое `types=`, `feat,`, `FEAT`, повтор)

## Phase 5: US3 — безопасность ввода (P1)

- [x] T008 [US3] Проверка диапазона FR-008 (`too_long`, `leading_dash`, `whitespace`, `control_char`), пустой → `HEAD`; тест: `range=--output=x` → 400 и файл не создан; `range=README` при существующем файле → `unknown_range`
- [x] T009 [US3] Проверка `Host` (403 `forbidden`), 404, 405, `invalid_request` (неизвестный параметр, два `range`); тесты

## Phase 6: US4 — ошибки git и окружения (P2)

- [x] T010 [US4] `unknown_range` (422), пустой репозиторий при `HEAD` → 200 `total=0`, иной диапазон там → `unknown_range`; `not_a_repository` (503) для `/api/meta` и `/api/changelog`; `git_error` (`timeout` через подмену); тесты

## Phase 7: US5 — большой диапазон (P2)

- [x] T011 [US5] Лимит N=1000 → `range_too_large` (422, `limit`), читается не больше N+1; тест с уменьшенным лимитом (подмена константы)

## Phase 8: US6 — страница и справочник, запуск (P3)

- [x] T012 [US6] `/api/meta` с `repository`, `types`, `default_range`, `max_range_length`, `max_commits`; `main()`: `--port`, отказ запуска вне репозитория и при занятом порте (ненулевой код, сообщение); тесты

## Phase 9: Polish

- [x] T013 Обновить `AGENTS.md` (структура: `core.py`, `web.py`, `static/`) и `bash scripts/check.sh` → 0; ручная проверка по `quickstart.md`

## Dependencies

T001 → T002 → T003 → T004 → T005 → (T006…T012 в любом порядке) → T013. Фича 001 (страница) зависит от T005.
