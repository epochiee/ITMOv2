# Общий контракт: предпросмотр changelog (UI ↔ логика)

**Статус**: утверждён 2026-10-27 · **Стороны**: `specs/001-changelog-preview-ui` (команда 1), `specs/002-changelog-preview-api` (команда 2) · **Решения принимал**: человек (делегировано агенту основного чата, см. `practices/practice_05/homework/02-contract-negotiation.md`)

Контракт — единственный источник истины для данных, вызовов, ошибок и состояний на стыке. Обе спеки ссылаются на него, а не пересказывают.

## 1. Сервис

- Запуск: `changelog-gen-web [--port N]` в каталоге git-репозитория; адрес `http://127.0.0.1:8765` (порт по умолчанию 8765), слушает только `127.0.0.1`.
- Вне git-репозитория, при занятом порте или неверных параметрах не стартует: ненулевой код, сообщение в stderr.
- Принимаются только запросы с `Host` = `127.0.0.1:<порт>` или `localhost:<порт>`, иначе `403 forbidden` (защита от DNS rebinding). CORS-заголовков нет.
- Ответы API: `application/json; charset=utf-8`, `Cache-Control: no-store`.

## 2. Вызовы

| Вызов | Когда вызывает UI | Ответ |
|---|---|---|
| `GET /` | открытие страницы | `index.html` (HTML + встроенные CSS и JS, без сборки) |
| `GET /api/meta` | один раз при открытии страницы | справочник (п. 3) |
| `GET /api/changelog?range=<str>&types=<csv>` | только по явному действию: «Показать», Enter в поле диапазона, «Повторить», «Выбрать все типы и показать». Автозапросов и debounce нет; одновременно не больше одного запроса | секция (п. 4) |

Параметры `/api/changelog`:

- `range` — необязателен. Отправляется как введён, через `encodeURIComponent`. Пустой или из одних пробелов → `HEAD`; пробелы по краям обрезаются.
- `types` — необязателен. **Все типы отмечены → параметр не передаётся** (`types: null` в ответе, результат совпадает с `changelog-gen` без `--types`). Часть отмечена → `types=feat,fix` (порядок как в справочнике). Ни одного → UI запрос не отправляет. Пустое `types=` → `400 invalid_types`. Повтор `types=feat&types=fix` допустим и равен `feat,fix` (как в CLI).

## 3. `GET /api/meta` → 200

```json
{
  "repository": "changelog-gen",
  "types": ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore"],
  "default_range": "HEAD",
  "max_range_length": 200,
  "max_commits": 1000
}
```

`repository` — имя каталога корня репозитория, без пути. UI строит переключатели типов из `types` в этом порядке. Если репозиторий стал недоступен после старта, `/api/meta` отвечает ошибкой `not_a_repository` (п. 5) — UI показывает баннер сразу при открытии.

## 4. `GET /api/changelog` → 200

```json
{
  "range": "HEAD",
  "types": ["feat"],
  "markdown": "## Unreleased\n\n### Breaking Changes\n\n- **core**: drop v1\n\n### Features\n\n- **api**: add x\n",
  "stats": {"total": 5, "included": 2, "filtered_out": 2, "skipped": 1},
  "skipped": [{"header": "update stuff", "reason": "not a Conventional Commit header: 'update stuff'"}]
}
```

- `markdown` побайтно равен stdout `changelog-gen RANGE [--types T]` (LF). Заголовок всегда `## Unreleased`.
- `stats.total = included + filtered_out + skipped`. Без фильтра `filtered_out = 0`.
- `skipped` — первая строка сообщения и причина; хэш коммита не передаётся.
- Пустой результат — **успех** (`included = 0`, `markdown = "## Unreleased\n"`). Причину UI определяет по `stats`:
  - `total = 0` → в диапазоне нет коммитов (в т. ч. репозиторий без коммитов при `range = HEAD`);
  - `skipped = total > 0` → все коммиты не по формату;
  - иначе (`filtered_out > 0`) → нет коммитов выбранных типов.

## 5. Ошибки

```json
{"error": {"code": "invalid_range", "message": "range must not start with '-'", "field": "range", "details": {"rule": "leading_dash", "max_length": 200}}}
```

`message` — диагностика на английском для разработчика; UI его **не показывает** и строит текст сам по `code` и `details`.

| `code` | HTTP | `field` | `details` | Где показывает UI |
|---|---|---|---|---|
| `invalid_range` | 400 | `range` | `rule`: `leading_dash` / `whitespace` / `control_char` / `too_long`; `max_length` | у поля диапазона |
| `unknown_range` | 422 | `range` | `range` | у поля диапазона |
| `range_too_large` | 422 | `range` | `limit` | у поля диапазона |
| `invalid_types` | 400 | `types` | `invalid`, `allowed` | у группы типов (признак бага клиента) |
| `not_a_repository` | 503 | `null` | `{}` | блокирующий баннер страницы |
| `git_error` | 500 | `null` | `reason`: `not_found` / `timeout` / `failed` | баннер с «Повторить» |
| `invalid_request` | 400 | параметр или `null` | `parameter` | общий баннер «внутренняя ошибка» |
| `forbidden` / `not_found` / `method_not_allowed` | 403 / 404 / 405 | `null` | `{}` | общий баннер «внутренняя ошибка» |
| нет ответа (сеть) | — | — | — | баннер «сервис недоступен» с «Повторить» (определяет UI) |
| неизвестный `code` или не JSON | любой | — | — | общий баннер «внутренняя ошибка» |

Порядок проверок (одна ошибка на ответ): протокол (`forbidden` → `not_found` → `method_not_allowed`) → `invalid_request` → `invalid_types` → `invalid_range` → git (`not_a_repository`, `unknown_range`, `range_too_large`, `git_error`).

## 6. Правила диапазона (логика, до вызова git)

После обрезки пробелов: не длиннее 200 символов; не начинается с `-`; без пробельных и управляющих символов (включая NUL). Разрешены `. ~ ^ @ { } : / +`. Прошедший проверку диапазон передаётся как ревизия: `git log … --end-of-options RANGE --` (ни опция, ни путь). Больше 1000 коммитов → `range_too_large`, частичного результата нет. Таймаут git — 10 с → `git_error/timeout`.

## 7. Состояния экрана ↔ ответы

| Состояние UI | Вход |
|---|---|
| Пусто | открытие страницы, `/api/meta` 200 |
| Загрузка | запрос отправлен; через 5 с — подсказка «Большая история…» |
| Успех | 200, `included > 0` |
| Пустой результат | 200, `included = 0` |
| Ошибка | любой ответ из п. 5 или сбой сети |
