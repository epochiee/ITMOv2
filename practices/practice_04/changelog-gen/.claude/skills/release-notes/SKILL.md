---
name: release-notes
description: Generate release notes / CHANGELOG entry for changelog-gen from git history in Conventional Commits format. Use when asked to prepare a release, update CHANGELOG.md or summarize changes since a tag.
---

# release-notes

1. Определи диапазон: от последнего тега (`git describe --tags --abbrev=0`). Если тегов нет, то от коммита,
   который последним менял `CHANGELOG.md` (`git log -1 --format=%H -- CHANGELOG.md`); если и его нет — весь `HEAD`.
   Так новая секция не повторяет записи прошлых версий.
2. Получи темы коммитов: `git log --format=%s <range>`.
3. Для **каждой** темы вызови MCP tool `parse_commit` (сервер `changelog-gen`). Не разбирай формат сам.
   Если `ok: false` — запомни тему коммита целиком и продолжай.
4. Сгруппируй по `type` в порядке: breaking, feat, fix, остальное. Нераспознанные коммиты (например,
   merge-коммиты) вынеси в секцию `### Not recognized`, а не теряй их. Оформи по `template.md`;
   пустые секции не выводи.
5. Запусти `python .claude/skills/release-notes/scripts/validate.py <файл с новой секцией>` — проверяет структуру
   (заголовок версии, непустые секции, нет дублей внутри секции); проверяй только новую секцию, а не весь `CHANGELOG.md`. Исправляй, пока код возврата не 0.
6. Допиши результат сверху `CHANGELOG.md`, затем запусти `bash scripts/check.sh`.

В ответе покажи: диапазон, число распознанных/нераспознанных коммитов, вывод валидатора.
