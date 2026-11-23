import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { expect, test } from '@playwright/test'

test('HTML-прототип открывается локально и показывает состояния сценария', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1240, height: 900 })
  await page.goto(pathToFileURL(resolve('docs/practice-08/prototype.html')).href)
  const state = page.getByLabel('Состояние прототипа')
  await expect(page.getByText('Расчёт ещё не выполнен')).toBeVisible()
  await page.getByRole('combobox', { name: 'Чертёж', exact: true }).selectOption('shield-module')
  await expect(state).toHaveValue('entry')
  await expect(page.getByText('20 за запуск · 200 на партию')).toBeVisible()
  await page.getByRole('button', { name: 'Рассчитать', exact: true }).click()
  await expect(page.getByText('Выполняется расчёт партии…')).toBeVisible()
  await expect(page.getByText('100 000 ISK')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('10-prototype.png'), fullPage: true })

  for (const [value, text] of [
    ['catalog', 'Загрузка каталога…'],
    ['empty', 'Нет доступных чертежей'],
    ['invalid', 'Укажите целое число от 1 до 10 000'],
    ['error', 'Не удалось рассчитать заказ. Проверьте данные и повторите расчёт.'],
    ['catalog-error', 'Не удалось загрузить каталог'],
  ]) {
    await state.selectOption(value)
    await expect(page.getByText(text, { exact: value !== 'empty' && value !== 'catalog-error' })).toBeVisible()
  }
  await page.setViewportSize({ width: 360, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
})
