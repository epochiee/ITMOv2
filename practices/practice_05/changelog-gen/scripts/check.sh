#!/usr/bin/env bash
# Единая проверка: ruff + pytest. Код 2 + вывод в stderr => hook вернёт ошибку агенту.
cd "$(dirname "$0")/.." || exit 1
PY=.venv/Scripts/python
[ -x "$PY" ] || PY=.venv/bin/python
out=$({ $PY -m ruff check . && $PY -m pytest -q; } 2>&1)
code=$?
if [ $code -ne 0 ]; then
  echo "CHECK FAILED:" >&2
  echo "$out" >&2
  exit 2
fi
echo "check ok"
