# Spec Delta

## MODIFIED Requirements

### Requirement: Выбор диапазона коммитов
CLI SHALL читать коммиты из диапазона git, переданного единственным необязательным позиционным аргументом, а без аргумента — из `HEAD`. Без `--output` результат MUST печататься в stdout в формате Markdown, код завершения 0.

#### Scenario: Запуск без аргументов
- **WHEN** пользователь запускает `changelog-gen` в git-репозитории
- **THEN** stdout содержит changelog по всем коммитам, достижимым из `HEAD`
- **AND** код завершения 0

#### Scenario: Запуск с диапазоном
- **WHEN** пользователь запускает `changelog-gen v1.0..HEAD`
- **THEN** в stdout попадают только коммиты из этого диапазона

### Requirement: Пустой результат фильтра
Если после фильтрации не осталось ни одного коммита и `--output` не задан, CLI SHALL вывести только заголовок `## Unreleased` и завершиться с кодом 0.

#### Scenario: Нет коммитов нужного типа
- **WHEN** в диапазоне только `docs: readme`
- **AND** пользователь запускает `changelog-gen --types feat`
- **THEN** stdout равен `## Unreleased\n`
- **AND** код завершения 0

## ADDED Requirements

### Requirement: Запись секции в начало файла
С флагом `--output FILE` CLI SHALL записать сгенерированную секцию в начало `FILE`, сохранив прежнее содержимое после одной пустой строки, и MUST оставить stdout пустым. Несуществующий файл создаётся. В stderr печатается строка `wrote FILE`.

#### Scenario: Дописать в существующий CHANGELOG
- **WHEN** `CHANGELOG.md` содержит `## 0.1.0\n\n- old\n`
- **AND** в диапазоне коммит `feat: add x`
- **AND** пользователь запускает `changelog-gen --output CHANGELOG.md`
- **THEN** файл равен `## Unreleased\n\n### Features\n\n- add x\n\n## 0.1.0\n\n- old\n`
- **AND** stdout пуст, stderr содержит `wrote CHANGELOG.md`, код 0

#### Scenario: Файла ещё нет
- **WHEN** `CHANGELOG.md` не существует
- **AND** пользователь запускает `changelog-gen --output CHANGELOG.md`
- **THEN** файл создан и содержит только новую секцию

#### Scenario: Вместе с фильтром и диапазоном
- **WHEN** пользователь запускает `changelog-gen v1.0..HEAD --types feat --output CHANGELOG.md`
- **THEN** в файл попадает та же секция, которую `changelog-gen v1.0..HEAD --types feat` напечатал бы в stdout

### Requirement: Пустой результат не меняет файл
Если с `--output` не осталось ни одного коммита, CLI MUST NOT изменять `FILE` и SHALL вывести в stderr `nothing to write` с кодом 0.

#### Scenario: Нечего записывать
- **WHEN** в диапазоне только `docs: readme`
- **AND** пользователь запускает `changelog-gen --types feat --output CHANGELOG.md`
- **THEN** содержимое и время изменения `CHANGELOG.md` не изменились
- **AND** stderr содержит `nothing to write`, код 0

### Requirement: Ошибка записи не портит файл
Если записать `FILE` не удалось, CLI MUST завершиться с кодом 1 и сообщением о причине в stderr без трейсбека; прежнее содержимое `FILE` MUST остаться без изменений.

#### Scenario: Каталога нет
- **WHEN** пользователь запускает `changelog-gen --output no/such/dir/CHANGELOG.md`
- **THEN** код завершения 1
- **AND** stderr содержит `cannot write` и не содержит `Traceback`

#### Scenario: Сбой посреди записи
- **WHEN** запись временного файла прерывается ошибкой
- **THEN** `CHANGELOG.md` совпадает с содержимым до запуска
