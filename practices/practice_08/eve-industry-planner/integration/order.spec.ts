import { expect, test } from '@playwright/test'
import { expected, sample } from '../tests/example'

test('проходит контрольный заказ с клавиатуры через настоящий Express API', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1240, height: 900 })
  await page.goto('/')
  await expect(page.getByRole('option', { name: 'Чертёж щитового модуля' })).toBeAttached()
  await expect(page.getByRole('button', { name: 'Рассчитать' })).toBeEnabled()
  await page.screenshot({ path: testInfo.outputPath('01-start.png'), fullPage: true, animations: 'disabled' })

  const blueprint = page.getByRole('combobox', { name: 'Чертёж' })
  await page.keyboard.press('Tab')
  await expect(blueprint).toBeFocused()
  const outline = page.locator('.MuiInputBase-root').filter({ has: blueprint })
  await expect(outline).toHaveCSS('outline-width', '3px')
  await page.keyboard.press('ArrowDown')
  await expect(blueprint).toHaveValue(sample.blueprintId)

  for (const [label, value] of [
    ['Число запусков', '10'],
    ['Цена за единицу Тританиум', '1000'],
    ['Цена за единицу Пайерит', '1200'],
    ['Цена продажи за изделие', '45000'],
    ['Сбор за работу на партию', '20000'],
    ['Сбор при продаже на партию', '10000'],
  ]) {
    const input = page.getByRole('textbox', { name: label, exact: true })
    await page.keyboard.press('Tab')
    await expect(input).toBeFocused()
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.insertText(value)
    await expect(input).toHaveValue(value)
  }
  await page.keyboard.press('Tab')
  const submit = page.getByRole('button', { name: 'Рассчитать', exact: true })
  await expect(submit).toBeFocused()
  await expect(submit).toHaveCSS('outline-width', '3px')
  await page.screenshot({ path: testInfo.outputPath('02-entry.png'), fullPage: true })

  const response = page.waitForResponse(
    (res) => res.url().endsWith('/api/v1/calculations') && res.request().method() === 'POST',
  )
  await page.keyboard.press('Enter')
  const res = await response
  expect(res.status()).toBe(200)
  expect(res.request().postDataJSON()).toEqual(sample)
  expect(await res.json()).toEqual(expected)

  const report = page.getByRole('complementary', { name: 'Результат расчёта' })
  await expect(report.getByRole('heading', { name: 'Щитовой модуль' })).toBeFocused()
  for (const text of [
    '320 000 ISK',
    '340 000 ISK',
    '350 000 ISK',
    '35 000,00 ISK',
    '450 000 ISK',
    'Прибыль',
    '100 000 ISK',
    '35 000 ISK',
  ]) {
    await expect(report.getByText(text, { exact: true })).toBeVisible()
  }
  await page.screenshot({ path: testInfo.outputPath('07-result.png'), fullPage: true })

  await page.setViewportSize({ width: 360, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
  await expect(report.getByText('100 000 ISK')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('08-mobile.png'), fullPage: true })

  await page.getByRole('textbox', { name: 'Число запусков' }).fill('11')
  await expect(report.getByText(/Результат устарел/)).toBeVisible()
})
