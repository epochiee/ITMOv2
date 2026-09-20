# Журнал экспериментов Практики 2

Файл ведёт OpenCode по вашим запросам. Агент записывает фактические результаты экспериментов и вносит изменения в связанные файлы. Свою оценку сообщайте ему в чате; вручную заполнять шаблон не нужно.

| Техника | Артефакт Практики 1 | Запрос | Изменение | Ссылка |
|---|---|---|---|---|
| Few-shot | tests_load.md | Перепиши строку сценария «Большой diff» под SLA. Полный запрос: см. few_shot/experiment.md | P95 <= 5s; >= 99% 2xx; измерения P50/P95; стоп при error rate > 1% | few_shot/experiment.md |
| R.C.T.F. | tests_load.md | Уточни одну строку под SLA/ADR. Полный запрос: см. rctf/experiment.md | Обновлённая строка «Большой diff 60 KB (<= лимит ADR) \| …» | rctf/experiment.md |
| Chain of Verification | tests_load.md | Проверь согласованность с problem.md и ADR. Полный запрос: см. chain_of_verification/experiment.md | Подтвердили соответствие; добавили примечание про параметризацию лимита | chain_of_verification/experiment.md |
| Tree of Thoughts | tests_load.md | Альтернативы SLA и выбор. Полный запрос: см. tree_of_thoughts/experiment.md | Оставили вариант A, отклонили B/C | tree_of_thoughts/experiment.md |
| RAG | tests_load.md | Сформулируй пороги только по локальным источникам. Полный запрос: см. rag/experiment.md | Сводная строка + ссылки на problem.md и adr.md | rag/experiment.md |
| ReAct | tests_load.md | Одно редактирование под SLA/ADR. Полный запрос: см. react/experiment.md | Обновлённая строка; шаги наблюдений | react/experiment.md |

- Выбранный слабый артефакт Практики 1: practices/practice_01/tests_load.md
- Что в нём нужно улучшить: согласованность с problem.md/adr.md и проверяемость формулировок.
- Как поймём, что изменение полезно: строка «Большой diff 60 KB» соответствует SLA (P50<=2s, P95<=5s), имеет явный критерий по доле 2xx и правило остановки; grep-проверки «Few-shot», «R.C.T.F.», «Chain of Verification», «Tree of Thoughts», «RAG», «ReAct» проходят.

| Техника | Файл эксперимента | Изменённый файл Практики 1 | Конкретное изменение | Проверка | Что отклонили |
|---|---|---|---|---|---|
| Few-shot | [`few_shot/experiment.md`](few_shot/experiment.md) | practices/practice_01/tests_load.md | Обновлена строка «Большой diff 60 KB…» с явными порогами | Визуальная сверка; grep SLA | Внешние источники SLA |
| R.C.T.F. | [`rctf/experiment.md`](rctf/experiment.md) | practices/practice_01/tests_load.md | Согласование порогов с problem.md/ADR | Визуальная сверка | Уточнение инструментов за пределами k6/locust |
| Chain of Verification | [`chain_of_verification/experiment.md`](chain_of_verification/experiment.md) | practices/practice_01/tests_load.md | Подтвердили согласованность; без доп. правок | Проверка источников | Строже P95<=4s без источника |
| Tree of Thoughts | [`tree_of_thoughts/experiment.md`](tree_of_thoughts/experiment.md) | practices/practice_01/tests_load.md | Выбор варианта A; B/C отвергнуты | Сопоставление с SLA | Альтернативы B/C |
| RAG | [`rag/experiment.md`](rag/experiment.md) | practices/practice_01/tests_load.md | Сводная строка по локальным источникам | Ссылки на problem.md/adr.md | Любые пороги без источника |
| ReAct | [`react/experiment.md`](react/experiment.md) | practices/practice_01/tests_load.md | Одно редактирование строки по SLA/ADR | Журнал действий | Лишние правки файлов |
