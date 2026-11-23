import { useEffect, useRef } from 'react'
import { Paper } from '@mui/material'
import type { Result } from '../shared/contract'
const groups = new Intl.NumberFormat('ru-RU')
export function digits(raw: string | number) {
  const [whole, fraction] = String(raw).split('.')
  return (
    groups.format(BigInt(whole)) +
    (fraction === undefined ? '' : ',' + fraction)
  )
}
const outcomes = {
  profit: 'Прибыль',
  loss: 'Убыток',
  break_even: 'Выход в ноль',
}
export default function ResultPanel({
  result,
  stale,
}: {
  result: Result | null
  stale: boolean
}) {
  const t = result?.totals
  const productHeading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (result) productHeading.current?.focus()
  }, [result])
  return (
    <Paper
      component="aside"
      variant="outlined"
      className="report"
      aria-label="Результат расчёта"
    >
      <header>
        <span className="kicker">РАСЧЁТ ПАРТИИ</span>
        <h2>Сводка заказа</h2>
      </header>
      {!result || !t ? (
        <div className="empty">
          <span className="ledger" aria-hidden="true">
            ≡
          </span>
          <h3>Расчёт ещё не выполнен</h3>
          <p>Выберите чертёж, заполните цены и нажмите «Рассчитать».</p>
        </div>
      ) : (
        <div className="report-body">
          {stale && (
            <strong className="stale">
              Результат устарел · пересчитайте заказ
            </strong>
          )}
          <h3 ref={productHeading} tabIndex={-1}>{result.productName}</h3>
          <p>
            {digits(result.productQuantity)} шт. · Запусков:{' '}
            {digits(result.runs)}
          </p>
          <section className={'outcome ' + t.outcome}>
            <span>{outcomes[t.outcome]}</span>
            <strong>{digits(t.profitIsk)} ISK</strong>
          </section>
          <h4>Материалы</h4>
          {result.materials.map((m) => (
            <div className="detail" key={m.id}>
              <b>{m.name}</b>
              <span>
                {digits(m.quantity)} × {digits(m.unitPriceIsk)} ISK ={' '}
                {digits(m.totalCostIsk)} ISK
              </span>
            </div>
          ))}
          <dl>
            {[
              ['Стоимость материалов', t.materialsCostIsk],
              ['Сбор за работу', t.jobFeeIsk],
              ['Производственная себестоимость', t.productionCostIsk],
              ['Сбор при продаже', t.saleFeeIsk],
              ['Полные затраты', t.totalCostIsk],
              ['Затраты на изделие с учётом продажи', t.unitCostIsk],
              ['Выручка', t.revenueIsk],
              ['Цена безубыточности за изделие', t.breakEvenUnitPriceIsk],
            ].map(([label, v]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{digits(v)} ISK</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Paper>
  )
}
