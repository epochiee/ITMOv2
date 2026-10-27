<!--
Sync Impact Report
- Version change: template → 1.0.0
- Principles added: I. Core-first, II. One parser, III. Stdlib only, IV. Tested behaviour, V. Safe local surface
- Sections added: Development Workflow, Governance
- Removed sections: none
- Follow-up TODOs: none
-->
# changelog-gen Constitution

## Core Principles

### I. Core-first

Логика changelog (разбор, фильтр, рендер) MUST жить в чистых функциях пакета `changelog_gen`. CLI и веб-сервис — тонкие адаптеры: разбирают вход, вызывают ядро, форматируют ответ. Одинаковое поведение CLI и сервиса достигается общим кодом, а не копией.

### II. One parser

Сообщения коммитов MUST разбираться только через `changelog_gen.parser.parse_commit`. Собственные регулярные выражения для Conventional Commits запрещены: расхождение двух разборщиков уже приводило к ошибкам.

### III. Stdlib only

Рантайм-зависимости MUST оставаться пустыми (`dependencies = []`). Веб-часть строится на `http.server` и статическом HTML/JS без сборки. Новая зависимость допускается только после явного согласования и записи причины в plan.

### IV. Tested behaviour

Любое изменение наблюдаемого поведения MUST сопровождаться тестом в `tests/`. Работа считается готовой, когда `bash scripts/check.sh` (ruff + pytest) завершается кодом 0. Сквозной сценарий и хотя бы одна проверка ошибки или границы обязательны для каждой пользовательской истории.

### V. Safe local surface

Сервис MUST слушать только `127.0.0.1`. Пользовательский ввод MUST проверяться до вызова `git` и никогда не должен попадать в git как опция. Ошибки возвращаются данными с понятным кодом, без трейсбеков и внутренних путей.

## Development Workflow

- Спецификации UI и логики согласуются через общий контракт до генерации кода; расхождения решает человек и фиксирует в обеих спеках.
- Коммиты — Conventional Commits на английском в повелительном наклонении.
- Файлы правятся штатными Edit/Write, чтобы срабатывал hook проверки.

## Governance

Конституция важнее локальных договорённостей в plan и tasks. Изменение принципа — отдельная правка с повышением версии (MAJOR — удаление или переопределение принципа, MINOR — новый принцип, PATCH — уточнения). Каждый plan проходит Constitution Check; нарушение допускается только с записью обоснования в Complexity Tracking. Оперативные правила для агента — в `AGENTS.md`.

**Version**: 1.0.0 | **Ratified**: 2026-10-27 | **Last Amended**: 2026-10-27
