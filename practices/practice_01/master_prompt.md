Findings
- app/api.py:35-38 - Critical: отсутствует валидация тела запроса и доступ к payload["diff"] приведет к 500 при отсутствии ключа.
- app/api.py:35-38; app/review_service.py:19-22 - Critical: нет ограничения размера diff, риск DoS и переполнения контекста LLM.
- app/api.py:35-38 - High: нет явной схемы запроса/ответа (Pydantic), нестабильная OpenAPI и контракт.
- app/review_service.py:21 - High: отсутствует маппинг ошибок LLM в предсказуемые HTTP-ответы, возможны 500.
- app/api.py:35-38 - Medium: тип diff не проверяется на строку, возможна нестрогость контракта и неожиданные промпты.

Evidence
- Missing validation (app/api.py:35-38): "+def create_review(payload: dict) -> dict[str, str]:" | "+    return review_service.review(payload[\"diff\"])"
- No size limit (app/api.py:35-38; app/review_service.py:19-22): "+def create_review(payload: dict) -> dict[str, str]:" (нет проверок длины) | "+        prompt = f\"Review this pull request and find problems:\\n{diff}\""
- No schema (app/api.py:35-38): "+def create_review(payload: dict) -> dict[str, str]:" (payload как произвольный dict, без модели)
- No error mapping (app/review_service.py:21): "+        answer = self.llm.generate(prompt)" (без try/except и маппинга в 4xx/5xx)

Proposed fix summary
- Ввести модель запроса с полем diff:str и вернуть 422 при отсутствии/невалидности вместо KeyError/500.
- Ограничить максимальную длину diff на уровне валидации и возвращать 413 при превышении.
- Определить Pydantic-модели для запроса/ответа и явно задать response_model для стабильной OpenAPI.
- Обернуть вызов LLM в обработчик исключений и маппить сетевые/квотные ошибки в 502/503 с понятным сообщением.
- Явно валидировать, что diff — строка, а не другие JSON-типы.

Missing tests
- Успешный сценарий: корректный { "diff": "..." } возвращает 200 и { "comment": "..." }.
- Валидация: отсутствует ключ diff -> 422 с понятным сообщением.
- Валидация: diff не строка (число/объект) -> 422.
- Лимит: diff превышает максимальный размер -> 413.
- Ошибки LLM: исключение клиента -> контролируемый 502/503 с стабильным телом.
- OpenAPI: схема запроса/ответа содержит поле diff и comment как строки.

Open questions
- Каков целевой максимальный размер diff и где его конфигурировать.
- Каким кодом и сообщением маппить сбои LLM (502 vs 503) и какие таймауты принимать.
- Требуется ли аутентификация/авторизация и какие требования к rate limiting.
- Нужны ли ограничения по времени ответа (SLA) и стратегия при их превышении.
