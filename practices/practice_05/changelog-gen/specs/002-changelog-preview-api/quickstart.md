# Quickstart: предпросмотр changelog

```bash
cd practices/practice_05/changelog-gen
.venv/Scripts/python -m pip install -e ".[dev]"   # регистрирует changelog-gen-web
.venv/Scripts/changelog-gen-web --port 8765       # в любом git-репозитории
# Serving changelog preview for <repo> at http://127.0.0.1:8765/
```

Проверка API:

```bash
curl -s "http://127.0.0.1:8765/api/meta"
curl -s "http://127.0.0.1:8765/api/changelog?types=feat,fix"
curl -s "http://127.0.0.1:8765/api/changelog?range=--output=x"      # 400 invalid_range / leading_dash, файл не создан
curl -s "http://127.0.0.1:8765/api/changelog?types=feature"         # 400 invalid_types
curl -s -H "Host: evil.example:8765" "http://127.0.0.1:8765/api/meta" # 403 forbidden
```

Сверка с CLI: `markdown` из `/api/changelog?range=R&types=T` равен stdout `changelog-gen R --types T` (с LF).
