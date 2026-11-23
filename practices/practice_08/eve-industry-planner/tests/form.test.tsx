// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import App from '../client/App'
import catalog from '../catalog/blueprints.json'
import { calculationError, emptyCatalog, expected, sample, validationError } from './example'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function mockFetch() {
  const fetch = vi.fn<typeof globalThis.fetch>()
  vi.stubGlobal('fetch', fetch)
  return fetch
}

function input(label: string) {
  return screen.getByRole<HTMLInputElement>('textbox', { name: label })
}

function fill(label: string, value: string) {
  fireEvent.change(input(label), { target: { value } })
}

function calculate() {
  return screen.getByRole<HTMLButtonElement>('button', { name: 'Рассчитать' })
}

async function chooseBlueprint(id = sample.blueprintId) {
  const blueprint = catalog.find((entry) => entry.id === id)!
  await screen.findByRole('option', { name: blueprint.name })
  fireEvent.change(screen.getByRole('combobox', { name: 'Чертёж' }), { target: { value: id } })
}

async function fillOrder() {
  await chooseBlueprint()
  fill('Число запусков', '10')
  fill('Цена за единицу Тританиум', ' 1000 ')
  fill('Цена за единицу Пайерит', '1200')
  fill('Цена продажи за изделие', '45000')
  fill('Сбор за работу на партию', '20000')
  fill('Сбор при продаже на партию', '10000')
}

function readyCatalog() {
  return Response.json({ blueprints: catalog })
}

it('показывает загрузку каталога, сбой, пустой ответ и восстановление по кнопке', async () => {
  const delayed = Promise.withResolvers<Response>()
  const fetch = mockFetch()
    .mockReturnValueOnce(delayed.promise)
    .mockResolvedValueOnce(Response.json(emptyCatalog))
    .mockResolvedValueOnce(readyCatalog())
  render(<App />)

  expect(screen.getByRole('status').textContent).toBe('Загрузка каталога…')
  expect(calculate().matches(':disabled')).toBe(true)
  await act(async () => delayed.resolve(Response.json(calculationError, { status: 500 })))
  expect(screen.getByRole('alert').textContent).toContain('Не удалось загрузить каталог')
  fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))

  expect((await screen.findByText('Нет доступных чертежей')).getAttribute('role')).toBe('status')
  expect(calculate().matches(':disabled')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Обновить каталог' }))
  await screen.findByRole('option', { name: catalog[0].name })
  expect(calculate().matches(':disabled')).toBe(false)
  expect(screen.queryByRole('status')).toBeNull()
  expect(fetch.mock.calls.map(([url]) => url)).toEqual(Array(3).fill('/api/v1/blueprints'))
})

it('показывает состав партии и сохраняет общие поля при смене чертежа', async () => {
  mockFetch().mockResolvedValueOnce(readyCatalog())
  render(<App />)
  expect(screen.getByText('Расчёт ещё не выполнен')).toBeTruthy()
  await chooseBlueprint()
  fill('Число запусков', '7')
  fill('Цена за единицу Тританиум', '0')
  fill('Цена за единицу Пайерит', '2')
  fill('Цена продажи за изделие', '5')
  fill('Сбор за работу на партию', '9')
  fill('Сбор при продаже на партию', '8')
  expect(screen.getByText('20 за запуск · 140 на партию')).toBeTruthy()
  expect(screen.getByText('7 шт.', { exact: true })).toBeTruthy()

  await chooseBlueprint('repair-module')
  expect(screen.getByText('15 за запуск · 105 на партию')).toBeTruthy()
  expect(screen.queryByRole('textbox', { name: 'Цена за единицу Пайерит' })).toBeNull()
  expect(input('Цена за единицу Тританиум').value).toBe('0')
  expect(input('Цена за единицу Мексаллон').value).toBe('')
  expect(input('Цена продажи за изделие').value).toBe('')
  expect(input('Число запусков').value).toBe('7')
  expect(input('Сбор за работу на партию').value).toBe('9')
  expect(input('Сбор при продаже на партию').value).toBe('8')
})

it('объясняет пропуск обязательных полей, переводит фокус и не отправляет POST', async () => {
  const fetch = mockFetch().mockResolvedValueOnce(readyCatalog())
  render(<App />)
  await screen.findByRole('option', { name: catalog[0].name })
  fireEvent.click(calculate())
  const blueprint = screen.getByRole('combobox', { name: 'Чертёж' })
  expect(document.activeElement).toBe(blueprint)
  expect(screen.getByText('Выберите чертёж из каталога')).toBeTruthy()

  await chooseBlueprint()
  fireEvent.click(calculate())
  expect(document.activeElement).toBe(input('Цена продажи за изделие'))
  expect(input('Цена за единицу Тританиум').getAttribute('aria-invalid')).toBe('true')
  expect(screen.getAllByText('Введите сумму в ISK')).toHaveLength(3)
  expect(fetch).toHaveBeenCalledTimes(1)
})

it('объясняет ошибку диапазона и формата, снимает сообщения после правки', async () => {
  const fetch = mockFetch().mockResolvedValueOnce(readyCatalog())
  render(<App />)
  await fillOrder()
  fill('Число запусков', '10001')
  fill('Цена за единицу Тританиум', '-1')
  fireEvent.click(calculate())

  expect(document.activeElement).toBe(input('Число запусков'))
  expect(screen.getByText('Укажите целое число от 1 до 10 000')).toBeTruthy()
  expect(screen.getByText(/Введите целое число от 0 до 1 000/)).toBeTruthy()
  expect(fetch).toHaveBeenCalledTimes(1)
  fill('Число запусков', '10')
  fill('Цена за единицу Тританиум', '0')
  expect(screen.queryByText('Укажите целое число от 1 до 10 000')).toBeNull()
  expect(input('Цена за единицу Тританиум').getAttribute('aria-invalid')).toBe('false')
})

it('показывает ответ 422 у нужного поля и сохраняет заказ для исправления', async () => {
  mockFetch()
    .mockResolvedValueOnce(readyCatalog())
    .mockResolvedValueOnce(Response.json(validationError, { status: 422 }))
  render(<App />)
  await fillOrder()
  fireEvent.click(calculate())

  await screen.findByText(validationError.error.fields.saleUnitPriceIsk)
  expect(screen.getByRole('alert').textContent).toContain('Не удалось рассчитать заказ')
  expect(input('Цена продажи за изделие').value).toBe('45000')
  expect(document.activeElement).toBe(input('Цена продажи за изделие'))
})

it('показывает ошибку 500 и позволяет повторить расчёт с теми же данными', async () => {
  const fetch = mockFetch()
    .mockResolvedValueOnce(readyCatalog())
    .mockResolvedValueOnce(Response.json(calculationError, { status: 500 }))
    .mockResolvedValueOnce(Response.json(expected))
  render(<App />)
  await fillOrder()
  fireEvent.click(calculate())

  expect((await screen.findByRole('alert')).textContent).toContain('повторите расчёт')
  expect(document.activeElement).toBe(calculate())
  expect(input('Цена продажи за изделие').value).toBe('45000')
  fireEvent.click(calculate())
  await screen.findByRole('heading', { name: 'Щитовой модуль' })
  expect(screen.queryByRole('alert')).toBeNull()
  expect(fetch.mock.calls[1][1]?.body).toBe(fetch.mock.calls[2][1]?.body)
})

it('на задержанном ответе блокирует повторный клик и повторную отправку формы', async () => {
  const delayed = Promise.withResolvers<Response>()
  const fetch = mockFetch()
    .mockResolvedValueOnce(readyCatalog())
    .mockReturnValueOnce(delayed.promise)
  render(<App />)
  await fillOrder()
  const button = calculate()
  const form = button.form!

  fireEvent.click(button)
  expect(screen.getByRole('status').textContent).toBe('Выполняется расчёт партии…')
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Расчёт…' }).disabled).toBe(true)
  fireEvent.click(button)
  // Повторные submit-события доходят до обработчика даже с отключённой кнопкой.
  fireEvent.submit(form)
  fireEvent.submit(form)
  expect(fetch.mock.calls.filter(([url]) => url === '/api/v1/calculations')).toHaveLength(1)

  await act(async () => delayed.resolve(Response.json(expected)))
  expect(screen.queryByRole('status')).toBeNull()
  expect(calculate().disabled).toBe(false)
})

it('проводит заказ от выбора чертежа до прибыли и помечает сводку после правки', async () => {
  const fetch = mockFetch()
    .mockResolvedValueOnce(readyCatalog())
    .mockResolvedValueOnce(Response.json(expected))
  render(<App />)
  await fillOrder()
  fireEvent.click(calculate())

  const [url, request] = fetch.mock.calls[1]
  expect(url).toBe('/api/v1/calculations')
  expect(request).toMatchObject({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  expect(JSON.parse(String(request?.body))).toEqual(sample)
  const report = within(screen.getByRole('complementary', { name: 'Результат расчёта' }))
  const heading = await report.findByRole('heading', { name: 'Щитовой модуль' })
  expect(document.activeElement).toBe(heading)
  expect(report.getByText('Прибыль')).toBeTruthy()
  for (const amount of ['320 000 ISK', '350 000 ISK', '100 000 ISK', '35 000 ISK']) {
    expect(report.getByText(amount, { exact: true })).toBeTruthy()
  }
  fill('Число запусков', '11')
  expect(report.getByText(/Результат устарел/)).toBeTruthy()
})
