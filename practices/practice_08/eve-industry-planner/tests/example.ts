import fixtures from '../docs/practice-08/api-example.json' with { type: 'json' }
import type { Order, Result } from '../shared/contract'

export const sample: Order = fixtures.order
export const expected: Result = {
  ...fixtures.result,
  totals: { ...fixtures.result.totals, outcome: fixtures.result.totals.outcome as Result['totals']['outcome'] },
}
export const { emptyCatalog, calculationError, validationError } = fixtures
