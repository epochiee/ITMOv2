import type { Blueprint, Order, Result } from '../shared/contract.ts'

export function calculate(b: Blueprint, order: Order): Result {
  const productQuantity = b.outputPerRun * order.runs
  const count = BigInt(productQuantity)
  const materials = b.materials.map(({ id, name, quantityPerRun }) => {
    const quantity = quantityPerRun * order.runs
    const unitPriceIsk = order.materialUnitPricesIsk[id]
    return {
      id,
      name,
      quantity,
      unitPriceIsk,
      totalCostIsk: String(BigInt(quantity) * BigInt(unitPriceIsk)),
    }
  })
  const materialCost = materials.reduce(
    (sum, m) => sum + BigInt(m.totalCostIsk),
    0n,
  )
  const production = materialCost + BigInt(order.jobFeeIsk)
  const total = production + BigInt(order.saleFeeIsk)
  const revenue = count * BigInt(order.saleUnitPriceIsk)
  const profit = revenue - total
  const cents = (total * 200n + count) / (2n * count)
  return {
    blueprintId: b.id,
    productName: b.productName,
    runs: order.runs,
    productQuantity,
    materials,
    totals: {
      materialsCostIsk: String(materialCost),
      jobFeeIsk: order.jobFeeIsk,
      saleFeeIsk: order.saleFeeIsk,
      productionCostIsk: String(production),
      totalCostIsk: String(total),
      unitCostIsk:
        String(cents / 100n) + '.' + String(cents % 100n).padStart(2, '0'),
      revenueIsk: String(revenue),
      profitIsk: String(profit),
      breakEvenUnitPriceIsk: String((total + count - 1n) / count),
      outcome: profit > 0n ? 'profit' : profit < 0n ? 'loss' : 'break_even',
    },
  }
}
