# Spec Delta

## Purpose

Командная строка `changelog-gen`: какие коммиты git-истории попадают в changelog, куда печатается результат и как CLI сообщает о пропусках и ошибках использования.

## ADDED Requirements

### Requirement: Выбор диапазона коммитов
CLI SHALL читать коммиты из диапазона git, переданного единственным необязательным позиционным аргументом, а без аргумента — из `HEAD`. Результат MUST печататься в stdout в формате Markdown, код завершения 0.

#### Scenario: Запуск без аргументов
- **WHEN** пользователь запускает `changelog-gen` в git-репозитории
- **THEN** stdout содержит changelog по всем коммитам, достижимым из `HEAD`
- **AND** код завершения 0

#### Scenario: Запуск с диапазоном
- **WHEN** пользователь запускает `changelog-gen v1.0..HEAD`
- **THEN** в stdout попадают только коммиты из этого диапазона

### Requirement: Сообщения о нераспознанных коммитах
CLI SHALL пропускать сообщения, которые не являются Conventional Commits, и MUST сообщать о каждом пропуске строкой в stderr, начинающейся с `skip:`. Пропуск не влияет на код завершения.

#### Scenario: В истории есть коммит не по формату
- **WHEN** в диапазоне есть коммит `update stuff` и коммит `fix: bug`
- **THEN** stdout содержит `- bug`
- **AND** stderr содержит строку, начинающуюся с `skip:`, с текстом `update stuff`
- **AND** код завершения 0

### Requirement: Фильтр по типам коммитов
При флаге `--types` со списком типов через запятую CLI SHALL выводить только коммиты перечисленных типов, а также breaking-коммиты любого типа (см. требование «Breaking-изменения не отфильтровываются»). Пробелы вокруг значений MUST игнорироваться. Повтор флага MUST объединять значения. Без флага выводятся коммиты всех типов.

#### Scenario: Оставить только feat и fix
- **WHEN** в диапазоне коммиты `feat: add x`, `fix: bug`, `docs: readme`, `chore: deps`
- **AND** пользователь запускает `changelog-gen --types feat,fix`
- **THEN** stdout содержит `- add x` и `- bug`
- **AND** stdout не содержит `readme` и `deps`

#### Scenario: Пробелы вокруг значений
- **WHEN** пользователь запускает `changelog-gen --types " feat , fix "`
- **THEN** результат совпадает с `changelog-gen --types feat,fix`

#### Scenario: Повтор флага
- **WHEN** пользователь запускает `changelog-gen --types feat --types fix`
- **THEN** результат совпадает с `changelog-gen --types feat,fix`

#### Scenario: Фильтр вместе с диапазоном
- **WHEN** пользователь запускает `changelog-gen --types feat v1.0..HEAD` или `changelog-gen v1.0..HEAD --types feat`
- **THEN** в stdout попадают только коммиты типа `feat` из диапазона `v1.0..HEAD`

#### Scenario: Без флага вывод не меняется
- **WHEN** пользователь запускает `changelog-gen` без `--types`
- **THEN** stdout и строки `skip:` в stderr совпадают с зафиксированным до изменения характеризационным тестом на той же истории

### Requirement: Breaking-изменения не отфильтровываются
Коммит с breaking-изменением (`!` в заголовке или футер `BREAKING CHANGE:`) MUST попадать в вывод в секцию Breaking Changes независимо от значения `--types`.

#### Scenario: Breaking-коммит неотобранного типа
- **WHEN** в диапазоне коммиты `refactor(api)!: drop v1` и `feat: add x`
- **AND** пользователь запускает `changelog-gen --types feat`
- **THEN** stdout содержит секцию `### Breaking Changes` со строкой `- **api**: drop v1`
- **AND** stdout содержит `- add x`

### Requirement: Проверка значения --types
Если `--types` содержит неизвестный тип или пустое значение, CLI MUST завершиться с кодом 2, не читая git-историю. В stderr MUST быть недопустимое значение и список допустимых типов; stdout MUST быть пуст. Типы сравниваются с учётом регистра.

#### Scenario: Опечатка в типе
- **WHEN** пользователь запускает `changelog-gen --types feat,feature`
- **THEN** код завершения 2
- **AND** stderr содержит `feature` и перечень `feat, fix, docs, style, refactor, perf, test, build, ci, chore`
- **AND** stdout пуст

#### Scenario: Пустое значение
- **WHEN** пользователь запускает `changelog-gen --types ""` или `changelog-gen --types feat,`
- **THEN** код завершения 2 и stdout пуст

#### Scenario: Тип в верхнем регистре
- **WHEN** пользователь запускает `changelog-gen --types FEAT`
- **THEN** код завершения 2

#### Scenario: Ошибка видна даже вне git-репозитория
- **WHEN** пользователь запускает `changelog-gen --types feature` в каталоге без git
- **THEN** код завершения 2 и stderr говорит о недопустимом типе, а не об ошибке git

### Requirement: Пустой результат фильтра
Если после фильтрации не осталось ни одного коммита, CLI SHALL вывести только заголовок `## Unreleased` и завершиться с кодом 0.

#### Scenario: Нет коммитов нужного типа
- **WHEN** в диапазоне только `docs: readme`
- **AND** пользователь запускает `changelog-gen --types feat`
- **THEN** stdout равен `## Unreleased\n`
- **AND** код завершения 0

### Requirement: Ошибки использования
Неизвестный флаг, сокращённое имя флага или больше одного позиционного аргумента MUST приводить к коду завершения 2 и сообщению об использовании в stderr без трейсбека.

#### Scenario: Неизвестный флаг
- **WHEN** пользователь запускает `changelog-gen --foo`
- **THEN** код завершения 2
- **AND** stderr содержит `usage:` и не содержит `Traceback`

#### Scenario: Сокращённое имя флага
- **WHEN** пользователь запускает `changelog-gen --type feat`
- **THEN** код завершения 2
- **AND** фильтр не применяется

#### Scenario: Флаг git больше не проходит в git
- **WHEN** пользователь запускает `changelog-gen --no-merges`
- **THEN** код завершения 2 и stderr содержит `usage:`

#### Scenario: Два позиционных аргумента
- **WHEN** пользователь запускает `changelog-gen HEAD~1 HEAD`
- **THEN** код завершения 2 и stdout пуст
