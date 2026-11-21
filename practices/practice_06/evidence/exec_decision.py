"""Передать JSON-решение модели в /assistant/execute через dispatch-API.

Детерминированно (без HTTP). Импортирует Shop из PYTHONPATH (исходный или
исправленный сервис), логинится как alice и исполняет решение. Исключения
маппятся в 500, как это сделал бы HTTP-слой исходного сервиса.

    PYTHONPATH=<lab-dir> python3 exec_decision.py '<json-решение>'
"""

import json
import sys
from service import Shop


def main():
    decision = json.loads(sys.argv[1])
    shop = Shop()
    try:
        _, login = shop.dispatch("POST", "/login",
                                 {"username": "alice", "password": "learn-alice"}, {})
        headers = {"X-Token": login["token"]}
        try:
            with shop.lock:
                status, result = shop.dispatch("POST", "/assistant/execute",
                                               {"decision": decision}, headers)
        except Exception as exc:  # исходный сервис пробрасывает исключение в 500
            status, result = 500, {"error": str(exc), "type": type(exc).__name__}
        print(json.dumps({"decision": decision, "status": status, "result": result},
                         ensure_ascii=False))
    finally:
        shop.close()


if __name__ == "__main__":
    main()
