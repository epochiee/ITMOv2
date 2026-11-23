import type { Blueprint, Order } from './contract.ts'

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
export function validate(value: unknown, catalog: Blueprint[]) {
  const body = object(value) ? value : {}
  const fields: Record<string, string> = {}
  const blueprint = catalog.find((b) => b.id === body.blueprintId)
  if (!blueprint) fields.blueprintId = 'Выберите чертёж из каталога'
  if (
    typeof body.runs !== 'number' ||
    !Number.isInteger(body.runs) ||
    body.runs < 1 ||
    body.runs > 10000
  )
    fields.runs = 'Укажите целое число от 1 до 10 000'

  function money(key: string, price: unknown) {
    if (price === '') {
      fields[key] = 'Введите сумму в ISK'
      return
    }
    if (
      typeof price !== 'string' ||
      price.length > 13 ||
      !price.length ||
      /[^0-9]/.test(price) ||
      (price.length > 1 && price.startsWith('0')) ||
      BigInt(price) > 1000000000000n
    )
      fields[key] =
        'Введите целое число от 0 до 1 000 000 000 000 без ведущих нулей'
  }
  for (const key of ['jobFeeIsk', 'saleFeeIsk', 'saleUnitPriceIsk'])
    money(key, body[key])
  if (blueprint) {
    const prices = object(body.materialUnitPricesIsk)
      ? body.materialUnitPricesIsk
      : {}
    for (const m of blueprint.materials)
      money('materialUnitPricesIsk.' + m.id, prices[m.id])
    for (const id of Object.keys(prices))
      if (!blueprint.materials.some((m) => m.id === id))
        fields['materialUnitPricesIsk.' + id] = 'Материал отсутствует в рецепте'
  }
  if (!blueprint || Object.keys(fields).length)
    return { ok: false as const, fields }
  return { ok: true as const, blueprint, order: body as unknown as Order }
}
