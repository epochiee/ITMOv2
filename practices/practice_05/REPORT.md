# Практика 5. SDD в существующем проекте (OpenSpec) + ДЗ 5

Проект: **changelog-gen** из практики 4 (Python CLI: git-история в формате Conventional Commits → Markdown changelog). Скопирован из ветки `practice_04` в [`changelog-gen/`](changelog-gen/) без артефактов защиты практики 4 (presentation, reflection, evidence с видео).

Клиент: Claude Code (Opus 5.5). OpenSpec 1.14.1 инициализирован с `--tools claude,opencode --profile core --language ru`, поэтому в проекте лежат и `/opsx:*` для Claude Code, и `/opsx-*` для OpenCode. Отдельные «проверяющие чаты» — отдельные агенты без истории основного чата.

Решения человека (одобрение спеки, приёмка, принятие diff) по договорённости со студентом принимал агент, каждое записано с обоснованием в `evidence/`.

## Быстрая проверка

```bash
make -C practices/practice_05 install   # venv + зависимости
make -C practices/practice_05 test      # ruff + pytest + openspec validate --all --strict
make -C practices/practice_05 specs     # активные changes и main specs
```

## Часть 1. Одна фича через полный цикл: `--types`

Фича из списка слайда 5 — №1 «Фильтр существующего списка»: `changelog-gen --types feat,fix` оставляет в changelog только нужные типы коммитов. OpenSpec change: `filter-commit-types`.

| Шаг | Что сделано | Подтверждение |
|---|---|---|
| 0. Подготовка | Node 25.2.0, `npm i -g @fission-ai/openspec@1.14.1`, `openspec init --profile core` (6 workflow). Baseline: `bash scripts/check.sh` → `check ok`, 22 теста | `evidence/02-propose-cli.txt` (версия, `list --json`) |
| 1. Explore | Прочитаны `cli.py`, `parser.py`, `renderer.py`, тесты. Найдено: любой аргумент уходит в `git log` (`--types feat` → трейсбек). Записаны 5 условий приёмки и что сохраняем | [`evidence/01-explore.md`](evidence/01-explore.md) |
| 2. Propose | proposal, delta-spec `changelog-cli` (7 требований), design, tasks; `openspec validate --strict` — OK | [`evidence/02-propose-cli.txt`](evidence/02-propose-cli.txt), [`changelog-gen/openspec/`](changelog-gen/openspec/) |
| 3. Review + update | Отдельный агент-ревьюер: «готово после правок», 4 существенных + 4 мелких замечания, все приняты. `/opsx:update` | [`evidence/03-review.md`](evidence/03-review.md), [`evidence/03-update-validate.txt`](evidence/03-update-validate.txt) |
| 4. Apply | 7/7 задач, сначала характеризационный тест на старом коде; `cli.py` +36/−3, тестов 22 → 41 | [`evidence/04-apply.md`](evidence/04-apply.md), [`evidence/04-apply-run.txt`](evidence/04-apply-run.txt), [`evidence/04-apply-cli.diff`](evidence/04-apply-cli.diff) |
| 5. Проверка | Отдельный агент-проверяющий: основной / ошибочный / старый / граничные сценарии, старая и новая версии сравнены через `cmp`; расхождений нет. Фича принята | [`evidence/05-verify.md`](evidence/05-verify.md) |
| 6. Sync + archive | Создана main spec `openspec/specs/changelog-cli/spec.md` (7 требований, 18 сценариев); change перенесён в `archive/2026-10-27-filter-commit-types` | [`evidence/06-sync.txt`](evidence/06-sync.txt), [`evidence/06-archive.txt`](evidence/06-archive.txt) |

Итоговое поведение:

```text
$ changelog-gen --types feat,fix practice_04~12..practice_04   # только Features и Fixes
$ changelog-gen --types feat,feature                           # код 2: unknown type 'feature', expected one of ...
$ changelog-gen --no-merges                                    # код 2: BREAKING, раньше уходило в git
```

## Часть 2. Правило OpenSpec под проект

Связанная фича `--output FILE` (change `write-changelog-file`, остановлен до apply). Правило `rules.design: Объясни взаимодействие диаграммой Mermaid.` добавлено в `openspec/config.yaml`, проверено через `openspec instructions design --json` и применено к фрагменту «Взаимодействие»: +30 строк диаграммы, проза не изменена. Подробно: [`evidence/07-08-rule.md`](evidence/07-08-rule.md); до — [`07-fragment-before.md`](evidence/07-fragment-before.md), после — [`08-fragment-after.md`](evidence/08-fragment-after.md), diff — [`08-fragment.diff`](evidence/08-fragment.diff), диаграмма — [`08-mermaid-preview.html`](evidence/08-mermaid-preview.html).

## ДЗ 5. Две команды — одна фича (Spec Kit)

Локальный сервис `changelog-gen-web` (страница + API), спеки UI и логики от двух независимых агентов-«команд». Согласование — 13 решений и общий контракт; затем plan → tasks → код → проверки. Подробно, со ссылками на все артефакты, сравнением с OpenSpec и рефлексией: [`homework/README.md`](homework/README.md).

Итог по коду проекта: `core.py` (общая логика CLI и сервиса), `web.py`, `static/index.html`. Тестов 85 (было 22 в начале практики), `make -C practices/practice_05 test` → `check ok` и `openspec validate --all --strict` — 2/2.

## Возникшие проблемы и как решены

| # | Проблема | Что сделано |
|---|---|---|
| 1 | `Read` не открыл PDF презентации: нет `pdftoppm` (poppler) | Поставил `pypdf` и `pymupdf` в **глобальный** Python 3.12 (`pip` подтянул и `pymupdf4llm`, `networkx`, `psutil`, `tabulate`), текст и картинки слайдов извлёк скриптом. Если глобальные пакеты не нужны — `pip uninstall pymupdf pymupdf4llm pymupdf-layout pypdf` |
| 2 | Исходников changelog-gen нет в рабочем дереве: в `practices/practice_04/changelog-gen/` (неотслеживаемый) остались только `.venv`, `defense.md` и `__pycache__` | Проект взят из ветки `practice_04` через `git archive`. Неотслеживаемый остаток практики 4 не трогал |
| 3 | Практика рассчитана на OpenCode/Codex, а OpenCode не установлен; работал Claude Code | `openspec init --tools claude,opencode`: в проекте есть и `/opsx:*` (Claude), и `/opsx-*` (OpenCode). Slash-команды я сам вызвать не могу — выполнял те же workflow через skills |
| 4 | Сессия открыта в корне репозитория курса, поэтому skills и `CLAUDE.md` проекта сначала не подгрузились, а hook проверки из `changelog-gen/.claude/settings.json` не срабатывал | Шаги 1–4 вёл по тексту `SKILL.md` вручную. Позже клиент обнаружил skills, и sync/archive/propose шли через штатный Skill. `bash scripts/check.sh` запускал руками после каждой группы задач |
| 5 | OpenSpec по умолчанию шлёт анонимную телеметрию | Все команды после `init` — с `OPENSPEC_TELEMETRY=0` (так и в `Makefile`). Сам `init` мог успеть отправить статистику. Глобальный конфиг не менял |
| 6 | Решения человека (одобрение спеки, приёмка, принятие diff) | По выбору студента принимал агент, каждое решение с обоснованием записано в `evidence/`. **Перед сдачей стоит прочитать эти решения самому** |
| 7 | В проекте не закреплена версия `ruff`; 0.17.3 с текущими правилами по умолчанию ругался на `subprocess.run` без `check` (PLW1510) и на `except Exception` (BLE001) | Явный `check=False` в тесте; `noqa` с обоснованием там, где перехват всего осознан (FR-021). Рекомендую закрепить версию в `pyproject.toml` |
| 8 | `argparse` переносит `--help` по ширине терминала — тест на текст справки падал | Тест нормализует пробелы |
| 9 | Brownfield-находка: `changelog-gen --output=x` (до изменения) и `changelog-gen -- --output=x` (после) передают опцию в `git log` и пишут файл | В CLI — записанный риск (design `filter-commit-types`). В веб-сервисе закрыто: проверка диапазона + `--end-of-options RANGE --` |
| 10 | Неверный диапазон в CLI по-прежнему падает с трейсбеком `CalledProcessError` | Вне границ `filter-commit-types` (так записано в proposal). Кандидат на следующее изменение |
| 11 | `specify init` упал с «claude not found»: у десктопного Claude Code нет CLI `claude` в PATH; `specify` поставился в `~/.local/bin`, которого нет в PATH | `--ignore-agent-tools`, PATH дописывал в каждой команде. Предварительно проверил init в черновой папке, чтобы убедиться, что он не трогает `CLAUDE.md`, `AGENTS.md` и hook |
| 12 | Spec Kit рассчитан на одну «текущую» фичу (`.specify/feature.json`, автонумерация) — две параллельные команды получили бы обе `001` | Каталоги фич задал явно, командам запретил писать `feature.json`; plan для второй фичи — через `SPECIFY_FEATURE_DIRECTORY` + `SPECIFY_FEATURE_NO_PERSIST=1` |
| 13 | Шаблон Spec Kit требует спеку «без API и деталей реализации», а ДЗ хочет в спеке логики «правила и API» | HTTP-конкретика вынесена в общий контракт `specs/contracts/`; спеки ссылаются на него |
| 14 | Windows: `SO_REUSEADDR` позволяет второму серверу молча занять тот же порт | `allow_reuse_address = False` на win32; тест на занятый порт |
| 15 | Windows: консольный скрипт печатает CRLF (текстовый stdout), а CLI читает `git log` в кодировке локали. Здесь локаль UTF-8 (cp65001), но на системе с cp1251 кириллица в CLI испортится; сервис читает явно в UTF-8 | Не исправлял (вне задач). Рекомендация: `encoding="utf-8"` в `cli.read_messages` отдельным изменением |
| 16 | Моя ошибка проверки: первое сравнение «CLI = API» дало ложное «differ» — Python на Windows писал с CRLF в другой `/tmp`, чем у bash | Пересравнил через файлы в одной папке и бинарный stdout → `identical`. Ошибка оставлена видимой в `homework/evidence/api-quickstart.txt` |
| 17 | `openspec view` после archive показывает «Completed Changes: 0», хотя change лежит в `archive/2026-10-27-filter-commit-types` | Архивировал по skill (перемещение каталога, как в его инструкции). Похоже, дашборд считает только активные changes с выполненными задачами. На `validate` и `list --specs` не влияет |
| 18 | Ничего не закоммичено: работа лежит в ветке `practice_05` неотслеживаемыми файлами | Коммит — по вашему решению |

Глобально установлено в ходе работы: `@fission-ai/openspec@1.14.1` (npm -g), `specify-cli` (uv tool), Python-пакеты из п. 1.

## Структура

```text
practices/practice_05/
├── REPORT.md                 # этот отчёт
├── Makefile                  # install / test / specs / run
├── evidence/                 # подтверждения шагов 1–8 практики
├── homework/                 # ДЗ: бриф, промпты команд, согласование, README, evidence
└── changelog-gen/            # проект
    ├── openspec/             # OpenSpec: config.yaml (rules.design), specs/changelog-cli, changes/
    ├── .specify/, specs/     # Spec Kit: конституция, фичи 001/002, общий контракт
    ├── src/changelog_gen/    # parser, renderer, core, cli, web, static/index.html
    └── tests/                # 85 тестов
```
