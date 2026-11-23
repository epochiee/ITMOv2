# Решение практики 8 · «Верфь»

«Верфь» рассчитывает себестоимость и прибыль производственного заказа в EVE Online. Для контрольного заказа на 10 щитовых модулей Express API возвращает прибыль **100 000 ISK**, полные затраты **350 000 ISK** и цену безубыточности **35 000 ISK** за модуль.

## Запуск

Из корня ITMOv2 выполните:

```sh
cd practices/practice_08/eve-industry-planner
npm ci
npm run dev
```

Откройте `http://127.0.0.1:5173`. Для полного прогона из каталога проекта используйте `make verify`. Для демонстрации клиентских тестов с названиями сценариев используйте `make client`.

## Материалы для защиты

- [README защиты с командами и ожидаемыми результатами по каждому критерию](eve-industry-planner/docs/practice-08/README.md)
- [Интерактивный прототип](eve-industry-planner/docs/practice-08/prototype.html)
- [Скриншот результата](eve-industry-planner/docs/practice-08/screenshots/07-result.png) и [мобильный вид](eve-industry-planner/docs/practice-08/screenshots/08-mobile.png)
- [JSON контрольного заказа и ответов API](eve-industry-planner/docs/practice-08/api-example.json)
- [Вывод тестов](eve-industry-planner/docs/practice-08/test-results.txt) и [черновики PR и Issue](eve-industry-planner/docs/practice-08/github-drafts.md)
