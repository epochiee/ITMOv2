# Research: логика предпросмотра changelog

## R1. Общий код с CLI
- **Decision**: модуль `core.py` с `parse_types(values) -> list[str] | None` (бросает `TypesError` со списком недопустимых), `select(commits, types)` и `build_preview(messages, types)`. `cli._types` и фильтр в `cli.main` переходят на него.
- **Rationale**: FR-006 требует побайтного совпадения с CLI «общим кодом, а не копией» (конституция I). Текст ошибки типов должен остаться прежним (`unknown type 'x', expected one of …`) — тесты CLI не меняются и страхуют рефакторинг.
- **Alternatives**: вызывать CLI подпроцессом — лишний процесс и разбор stdout; копия логики — расходится со временем.

## R2. Передача диапазона в git
- **Decision**: проверка по FR-008 до git, затем `git log --format=%B%x00 -n 1001 --end-of-options RANGE --`.
- **Rationale**: команда 2 проверила запуском: `--output=x` пишет файл, а `README` git понимает как путь. `--end-of-options` запрещает опции, завершающий `--` запрещает пути (FR-009). `-n 1001` ограничивает чтение (FR-016: не больше N+1).
- **Alternatives**: только проверка ведущего `-` — не защищает от путей; `git rev-list --count` перед `log` — второй вызов git.

## R3. Различение ошибок git
- **Decision**: при ненулевом коде `git log`: `git rev-parse --git-dir` неуспешен → `not_a_repository`; диапазон `HEAD` и `git rev-parse --verify -q HEAD` неуспешен → пустой результат (решение #7); иначе `unknown_range`. `FileNotFoundError` → `git_error/not_found`, `TimeoutExpired` → `git_error/timeout`.
- **Rationale**: сырой stderr git наружу не отдаём (FR-019); классификация по дополнительным дешёвым вызовам надёжнее разбора текста сообщений git (он локализуется).

## R4. HTTP-сервер
- **Decision**: `ThreadingHTTPServer(("127.0.0.1", port), Handler)`; `Handler` знает каталог репозитория и порт через атрибуты сервера. Проверка `Host` ∈ {`127.0.0.1:port`, `localhost:port`} первой (FR-026). Не-GET → 405. Логи запросов — одной строкой в stderr без тел.
- **Rationale**: stdlib (конституция III); тот же подход, что в лаборатории практики 6 курса.

## R5. Разбор параметров
- **Decision**: `parse_qs(query, keep_blank_values=True, strict_parsing=False, errors="strict")`. Неизвестный параметр или `range` больше одного раза → `invalid_request`; `UnicodeDecodeError` → `invalid_request`. `types` может повторяться.
- **Rationale**: FR-010, FR-019 (`invalid_request`).

## R6. Отдача страницы
- **Decision**: `importlib.resources.files("changelog_gen") / "static/index.html"`, в `pyproject.toml` — `[tool.setuptools.package-data] changelog_gen = ["static/*.html"]`.
- **Rationale**: один HTML без сборки (FR-025, решение #13), работает и из editable-установки.
