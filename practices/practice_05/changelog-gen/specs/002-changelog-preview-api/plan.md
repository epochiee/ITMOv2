# Implementation Plan: Логика предпросмотра changelog (HTTP API)

**Branch**: `002-changelog-preview-api` (ветка не создавалась, работа в `practice_05`) | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/002-changelog-preview-api/spec.md` · **Contract**: [`specs/contracts/changelog-preview-api.md`](../contracts/changelog-preview-api.md)

## Summary

Локальный HTTP-сервис `changelog-gen-web` на `http.server`: `GET /` отдаёт страницу команды 1, `GET /api/meta` — справочник, `GET /api/changelog` — секцию changelog, побайтно равную выводу CLI. Разбор типов и фильтр выносятся из `cli.py` в общий модуль `core.py`, чтобы CLI и сервис не расходились (конституция, I). Диапазон проверяется до git и передаётся как `git log … --end-of-options RANGE --` (FR-008, FR-009). Решения — в [research.md](research.md).

## Technical Context

**Language/Version**: Python ≥ 3.10 (проверяется на 3.12.10)
**Primary Dependencies**: только стандартная библиотека (`http.server`, `subprocess`, `json`, `urllib.parse`, `importlib.resources`); git ≥ 2.24 (`--end-of-options`), на стенде 2.51
**Storage**: N/A (читает git-историю, ничего не пишет)
**Testing**: pytest + ruff через `bash scripts/check.sh`; HTTP-тесты поднимают `ThreadingHTTPServer` на порту 0 во временном git-репозитории
**Target Platform**: локальная машина разработчика (Windows / Linux / macOS)
**Project Type**: CLI-утилита + локальный веб-сервис в том же пакете
**Performance Goals**: ответ ≤ 2 с на истории до 1000 коммитов (SC спеки)
**Constraints**: только `127.0.0.1`; проверка `Host`; таймаут git 10 с; лимит 1000 коммитов; без новых зависимостей
**Scale/Scope**: один пользователь, 3 маршрута, ~10 кодов ошибок

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Принцип | Как выполняется | Статус |
|---|---|---|
| I. Core-first | `core.py`: `parse_types()`, `select()`, `build_preview()`; CLI и `web.py` — адаптеры. CLI переводится на `core` без изменения поведения (тесты CLI не меняются) | ✅ |
| II. One parser | Разбор только `parser.parse_commit`; своих регулярок нет | ✅ |
| III. Stdlib only | `dependencies = []` остаётся; страница — один HTML без сборки | ✅ |
| IV. Tested behaviour | Юнит-тесты `core`/`web`, HTTP-тесты, сквозной тест «CLI = API», ошибки и границы; `check.sh` = готово | ✅ |
| V. Safe local surface | `127.0.0.1`, `Host`-проверка, проверка диапазона до git, `--end-of-options`, ошибки без путей и трейсбеков | ✅ |

Повторная проверка после Phase 1: нарушений нет, Complexity Tracking пуст.

## Project Structure

### Documentation (this feature)

```text
specs/002-changelog-preview-api/
├── spec.md          # команда 2, Agreed
├── plan.md          # этот файл
├── research.md      # Phase 0: решения
├── quickstart.md    # Phase 1: запуск и ручная проверка
├── checklists/requirements.md
└── tasks.md         # /speckit-tasks
specs/contracts/changelog-preview-api.md   # общий контракт (Phase 1 contracts)
```

Модель данных не выносится в `data-model.md`: сущности описаны в spec (Key Entities), формат — в контракте.

### Source Code (repository root)

```text
src/changelog_gen/
├── core.py          # NEW: parse_types, select, build_preview (общие для CLI и сервиса)
├── cli.py           # CHANGED: использует core, поведение прежнее
├── web.py           # NEW: проверки ввода, git, маршруты, запуск сервиса
├── static/index.html# NEW (фича 001): страница
├── parser.py, renderer.py   # без изменений
tests/
├── test_core.py     # NEW
├── test_web.py      # NEW: юнит + HTTP + сквозной CLI = API
└── test_cli.py      # без изменений (страховка рефакторинга)
pyproject.toml       # CHANGED: скрипт changelog-gen-web, package-data static/*.html
```

**Structure Decision**: один пакет `changelog_gen` (Option 1). Отдельные backend/frontend не нужны: страница — статический файл внутри пакета.

## Complexity Tracking

Нарушений конституции нет.
