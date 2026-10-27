# Implementation Plan: Экран предпросмотра changelog

**Branch**: `001-changelog-preview-ui` (ветка не создавалась, работа в `practice_05`) | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-changelog-preview-ui/spec.md` · **Contract**: [`specs/contracts/changelog-preview-api.md`](../contracts/changelog-preview-api.md) · **Зависит от**: [`002-changelog-preview-api/plan.md`](../002-changelog-preview-api/plan.md)

## Summary

Одна страница `src/changelog_gen/static/index.html` со встроенными CSS и JS (без сборки и библиотек), которую отдаёт `GET /` сервиса из фичи 002. Экран — конечный автомат из пяти состояний таблицы «Состояния экрана» (Пусто → Загрузка → Успех / Пустой результат / Ошибка). Данные — только из `/api/meta` и `/api/changelog` по контракту; тексты ошибок строятся по `code` и `details` (FR-020, FR-024).

## Technical Context

**Language/Version**: HTML5 + ES2020 (`fetch`, `async/await`, `navigator.clipboard`), без транспиляции
**Primary Dependencies**: нет (конституция III)
**Storage**: N/A
**Testing**: (1) pytest: `GET /` отдаёт страницу с нужными элементами и без внешних ресурсов; (2) сквозной сценарий в браузере против запущенного сервиса (основной, пустой результат, ошибка диапазона, недоступный сервис) с записью DOM-состояний в `homework/evidence/`
**Target Platform**: современный браузер на той же машине
**Project Type**: статическая страница внутри Python-пакета
**Performance Goals**: интерфейс откликается сразу; ожидание ответа ограничивает только сервис
**Constraints**: текст changelog выводится через `textContent` (буквально, FR-012) — никакого `innerHTML` для данных; одна активная загрузка (FR-010); без автозапросов (FR-008)
**Scale/Scope**: 1 экран, 5 состояний, ~9 видов сообщений об ошибках

## Constitution Check

| Принцип | Как выполняется | Статус |
|---|---|---|
| I. Core-first | Экран ничего не вычисляет из истории: фильтр, проверки и Markdown — в логике (FR-003, FR-009) | ✅ |
| II. One parser | Экран не разбирает коммиты и Markdown | ✅ |
| III. Stdlib only | Ванильный JS, нет CDN и npm | ✅ |
| IV. Tested behaviour | pytest на отдачу страницы + сквозной сценарий в браузере с ошибкой и границей | ✅ |
| V. Safe local surface | Относительные пути к API, данные только через `textContent`, `message` сервиса не показывается | ✅ |

## Project Structure

```text
specs/001-changelog-preview-ui/
├── spec.md, plan.md, tasks.md, checklists/requirements.md
src/changelog_gen/static/index.html   # NEW: разметка, стили, скрипт
tests/test_web.py                      # тест отдачи страницы (общий с 002)
```

**Structure Decision**: страница живёт в пакете рядом с сервисом и отдаётся им же (контракт, п. 2). Модель состояний — объект `state` в скрипте и функция `render()`, которая по нему переключает видимость зон; переходы — только в обработчиках событий и ответов.

## Complexity Tracking

Нарушений нет.
