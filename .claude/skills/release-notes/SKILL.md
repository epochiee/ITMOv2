---
name: release-notes
description: Generate release notes / CHANGELOG entry for changelog-gen from git history in Conventional Commits format. Use when asked to prepare a release, update CHANGELOG.md or summarize changes since a tag.
---

# release-notes

1. Определи диапазон: последний тег (`git describe --tags --abbrev=0`) или весь `HEAD`, если тегов нет.
2. Получи темы коммитов: `git log --format=%s <range>`.
3. Для **каждой** темы вызови MCP tool `parse_commit` (сервер `changelog-gen`). Не разбирай формат сам.
   Если `ok: false` — выпиши коммит в список «не распознано» и продолжай.
4. Сгруппируй по `type` в порядке: breaking, feat, fix, остальное. Оформи по `template.md`.
5. Запусти `python .claude/skills/release-notes/scripts/validate.py <файл>` — проверяет структуру
   (заголовок версии, непустые секции, нет дублей). Исправляй, пока код возврата не 0.
6. Допиши результат сверху `CHANGELOG.md`, затем запусти `bash scripts/check.sh`.

В ответе покажи: диапазон, число распознанных/нераспознанных коммитов, вывод валидатора.
