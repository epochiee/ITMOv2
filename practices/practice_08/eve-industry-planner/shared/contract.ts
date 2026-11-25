export interface Blueprint {
  id: string
  name: string
  productName: string
  outputPerRun: number
  materials: { id: string; name: string; quantityPerRun: number }[]
}
export interface Order {
  blueprintId: string
  runs: number
  materialUnitPricesIsk: Record<string, string>
  jobFeeIsk: string
  saleFeeIsk: string
  saleUnitPriceIsk: string
}
export interface Result {
  blueprintId: string
  productName: string
  runs: number
  productQuantity: number
  materials: {
    id: string
    name: string
    quantity: number
    unitPriceIsk: string
    totalCostIsk: string
  }[]
  totals: Record<
    | 'materialsCostIsk'
    | 'jobFeeIsk'
    | 'saleFeeIsk'
    | 'productionCostIsk'
    | 'totalCostIsk'
    | 'unitCostIsk'
    | 'revenueIsk'
    | 'profitIsk'
    | 'breakEvenUnitPriceIsk',
    string
  > & { outcome: 'profit' | 'loss' | 'break_even' }
}
