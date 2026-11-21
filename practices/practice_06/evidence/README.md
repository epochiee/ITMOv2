# Доказательства атак (evidence)

Протоколы воспроизведения атак против локального процесса Mini Shop. Данные синтетические,
сервис слушает только `127.0.0.1`.

- `attack_demo.py` — клиент на стандартной библиотеке: 17 проб по HTTP, печатает вердикт
  по каждой и сохраняет протокол запросов/ответов.
- `before/transcript.json` — исходный сервис: **17 УЯЗВИМО**.
- `after/transcript.json` — исправленный сервис: **16 ЗАКРЫТО + 1 СНИЖЕНО** (V9).
- `llm/` — прогон prompt injection на реальной модели (изолированный агент Claude Sonnet
  в роли `shop-planner`): контексты, решения модели и результаты их передачи в
  `/assistant/execute`. Подробности — в [llm/README.md](llm/README.md).
- `gen_context.py`, `exec_decision.py` — детерминированная сборка контекста и передача
  решения через dispatch-API (без сетевого слоя).

## Запуск

```bash
# терминал 1 — сервис
cd practices/practice_06/lab
python3 service.py --port 8066

# терминал 2 — пробы
cd practices/practice_06/evidence
python3 attack_demo.py --base http://127.0.0.1:8066 --out after   # или --out before на исходном коде
```

Сопоставление находок и их разбор — в [../REPORT_01.md](../REPORT_01.md) и
[../REPORT_02.md](../REPORT_02.md); модель угроз — в [../THREAT_MODEL.md](../THREAT_MODEL.md).
