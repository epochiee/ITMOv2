import { expect, it } from 'vitest'
import { calculate } from '../server/calculate'
import catalog from '../catalog/blueprints.json'
import { expected, sample } from './example'
it('контрольный заказ', () =>
  expect(calculate(catalog[0], sample)).toEqual(expected))
it.each([
  ['35000', 'break_even', '0'],
  ['34999', 'loss', '-10'],
])('исход при цене %s', (saleUnitPriceIsk, outcome, profitIsk) => {
  expect(
    calculate(catalog[0], { ...sample, saleUnitPriceIsk }).totals,
  ).toMatchObject({ outcome, profitIsk })
})
it.each([
  [1, '101', '1.01', '2'],
  [2, '201', '1.01', '2'],
  [3, '301', '1.00', '2'],
])('округление для %i запусков', (runs, fee, unit, ceil) => {
  const result = calculate(catalog[2], {
    ...sample,
    runs: Number(runs),
    materialUnitPricesIsk: { tritanium: '0', pyerite: '0' },
    jobFeeIsk: String(fee),
    saleFeeIsk: '0',
  })
  expect(result.productQuantity).toBe(100 * Number(runs))
  expect(result.totals).toMatchObject({
    unitCostIsk: unit,
    breakEvenUnitPriceIsk: ceil,
  })
})
it('сохраняет единицы за пределом точности Number', () => {
  const result = calculate(catalog[2], {
    ...sample,
    runs: 10000,
    materialUnitPricesIsk: { tritanium: '1000000000000', pyerite: '0' },
    jobFeeIsk: '1',
    saleFeeIsk: '0',
    saleUnitPriceIsk: '1000000000000',
  })
  expect(result.totals).toMatchObject({
    totalCostIsk: '80000000000000001',
    profitIsk: '919999999999999999',
  })
})
