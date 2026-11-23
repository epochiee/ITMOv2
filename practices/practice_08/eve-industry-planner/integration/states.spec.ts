import { expect, test } from '@playwright/test'
import { calculationError, emptyCatalog, expected, sample } from '../tests/example'

test('браузер показывает загрузку, пустой каталог и повтор загрузки', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1240, height: 900 })
  const firstResponse = Promise.withResolvers<void>()
  let requests = 0
  await page.route('**/api/v1/blueprints', async (route) => {
    if (++requests === 1) {
      await firstResponse.promise
      await route.fulfill({ status: 200, json: emptyCatalog })
    } else {
      await route.fallback()
    }
  })

  await page.goto('/')
  try {
    await expect(page.getByRole('status')).toHaveText('Загрузка каталога…')
    await expect(page.getByRole('button', { name: 'Рассчитать' })).toBeDisabled()
    await page.screenshot({ path: testInfo.outputPath('03-catalog-loading.png'), fullPage: true })
  } finally {
    firstResponse.resolve()
  }
  await expect(page.getByRole('status')).toHaveText('Нет доступных чертежей')
  await expect(page.getByRole('button', { name: 'Рассчитать' })).toBeDisabled()
  await page.screenshot({ path: testInfo.outputPath('04-catalog-empty.png'), fullPage: true })
  await page.getByRole('button', { name: 'Обновить каталог' }).click()
  await expect(page.getByRole('option', { name: 'Чертёж щитового модуля' })).toBeAttached()
  expect(requests).toBe(2)
})

test('браузер блокирует двойной клик и Enter, показывает ошибку и выполняет повтор', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1240, height: 900 })
  const firstResponse = Promise.withResolvers<void>()
  const bodies: unknown[] = []
  await page.route('**/api/v1/calculations', async (route) => {
    const request = route.request()
    expect(request.method()).toBe('POST')
    bodies.push(request.postDataJSON())
    if (bodies.length === 1) {
      await firstResponse.promise
      await route.fulfill({ status: 500, json: calculationError })
    } else {
      await route.fulfill({ status: 200, json: expected })
    }
  })

  await page.goto('/')
  await page.getByRole('combobox', { name: 'Чертёж' }).selectOption(sample.blueprintId)
  const submit = page.getByRole('button', { name: 'Рассчитать', exact: true })
  const runs = page.getByRole('textbox', { name: 'Число запусков' })
  await runs.fill('0')
  await submit.click()
  await expect(runs).toBeFocused()
  await expect(page.getByText('Укажите целое число от 1 до 10 000')).toBeVisible()
  await expect(page.getByText('Введите сумму в ISK')).toHaveCount(3)
  expect(bodies).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('05-validation.png'), fullPage: true })

  for (const [label, value] of [
    ['Число запусков', '10'],
    ['Цена за единицу Тританиум', '1000'],
    ['Цена за единицу Пайерит', '1200'],
    ['Цена продажи за изделие', '45000'],
    ['Сбор за работу на партию', '20000'],
    ['Сбор при продаже на партию', '10000'],
  ]) {
    await page.getByRole('textbox', { name: label, exact: true }).fill(value)
  }
  const position = (await submit.boundingBox())!
  try {
    await page.mouse.dblclick(position.x + position.width / 2, position.y + position.height / 2)
    await expect(page.getByRole('status')).toHaveText('Выполняется расчёт партии…')
    await expect(page.getByRole('button', { name: 'Расчёт…' })).toBeDisabled()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
    await expect.poll(() => bodies.length).toBe(1)
    await page.evaluate(() => window.getSelection()?.removeAllRanges())
    await page.screenshot({
      path: testInfo.outputPath('06-calculating.png'),
      fullPage: true,
      animations: 'disabled',
    })
  } finally {
    firstResponse.resolve()
  }

  await expect(page.getByRole('alert')).toHaveText(/Не удалось рассчитать заказ/)
  await expect(submit).toBeFocused()
  await expect(page.getByRole('textbox', { name: 'Цена продажи за изделие' })).toHaveValue('45000')
  expect(bodies).toEqual([sample])
  await page.screenshot({ path: testInfo.outputPath('09-error.png'), fullPage: true })

  await page.keyboard.press('Enter')
  await expect(page.getByText('100 000 ISK', { exact: true })).toBeVisible()
  expect(bodies).toEqual([sample, sample])
})
