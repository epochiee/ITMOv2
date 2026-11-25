import { useEffect, useRef, useState } from 'react'
import { Alert, Button, CircularProgress, Paper, TextField } from '@mui/material'
import type { Blueprint, Result } from '../shared/contract'
import { validate } from '../shared/validate'
import ResultPanel, { digits } from './ResultPanel'

export default function App() {
  const [catalog, setCatalog] = useState<Blueprint[]>([])
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, reload] = useState(0)
  const [id, setId] = useState('')
  const [runs, setRuns] = useState('1')
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [job, setJob] = useState('0')
  const [saleFee, setSaleFee] = useState('0')
  const [sale, setSale] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const focusOnError = useRef<string | undefined>(undefined)
  const [result, setResult] = useState<Result | null>(null)
  const [stale, setStale] = useState(false)
  const formDisabled = busy || phase !== 'ready' || !catalog.length
  const blueprint = catalog.find((b) => b.id === id)
  const count =
    /^[0-9]+$/.test(runs.trim()) && +runs >= 1 && +runs <= 10000 ? +runs : 0
  useEffect(() => {
    const abort = new AbortController()
    async function fetchCatalog() {
      try {
        const res = await fetch('/api/v1/blueprints', { signal: abort.signal })
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (!Array.isArray(data.blueprints)) throw new Error()
        if (!abort.signal.aborted) {
          setCatalog(data.blueprints)
          setPhase('ready')
        }
      } catch {
        if (!abort.signal.aborted) setPhase('error')
      }
    }
    void fetchCatalog()
    return () => abort.abort()
  }, [attempt])
  useEffect(() => {
    if (busy || !focusOnError.current) return
    document.getElementById(focusOnError.current)?.focus()
    focusOnError.current = undefined
  }, [busy, errors, message])

  function showFieldErrors(fields: Record<string, string>) {
    focusOnError.current = Object.keys(fields)[0]
    setErrors(fields)
  }

  function retryCatalog() {
    setPhase('loading')
    reload((n) => n + 1)
  }

  function edit(key: string) {
    setStale(true)
    setMessage('')
    setErrors((prev) => {
      const copy = { ...prev }
      delete copy[key]
      return copy
    })
  }
  function choose(next: string) {
    edit('blueprintId')
    setErrors({})
    setId(next)
    setSale('')
    setPrices(
      Object.fromEntries(
        (catalog.find((b) => b.id === next)?.materials ?? []).map((m) => [
          m.id,
          prices[m.id] ?? '',
        ]),
      ),
    )
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (lock.current || phase !== 'ready' || !catalog.length) return
    const body = {
      blueprintId: id,
      runs: count,
      materialUnitPricesIsk: Object.fromEntries(
        Object.entries(prices).map(([k, v]) => [k, v.trim()]),
      ),
      jobFeeIsk: job.trim(),
      saleFeeIsk: saleFee.trim(),
      saleUnitPriceIsk: sale.trim(),
    }
    const check = validate(body, catalog)
    if (!check.ok) {
      showFieldErrors(check.fields)
      return
    }
    lock.current = true
    setBusy(true)
    setMessage('')
    setErrors({})
    try {
      const res = await fetch('/api/v1/calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        if (res.status === 422) {
          showFieldErrors((await res.json()).error?.fields ?? {})
        }
        throw new Error()
      }
      setResult(await res.json())
      setStale(false)
    } catch {
      focusOnError.current ??= 'calculate'
      setMessage(
        'Не удалось рассчитать заказ. Проверьте данные и повторите расчёт.',
      )
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  function input(
    key: string,
    label: string,
    value: string,
    update: (v: string) => void,
    money = true,
    materialLabelId?: string,
  ) {
    return (
      <TextField
        id={key}
        label={label}
        size="small"
        fullWidth
        disabled={formDisabled}
        value={value}
        error={!!errors[key]}
        helperText={errors[key]}
        onChange={(e) => {
          edit(key)
          update(e.target.value)
        }}
        onBlur={(e) => update(e.target.value.trim())}
        slotProps={{
          htmlInput: {
            inputMode: 'numeric',
            'aria-required': true,
            'aria-labelledby': materialLabelId
              ? `${key}-label ${materialLabelId}`
              : undefined,
          },
          input: money ? { endAdornment: <small>ISK</small> } : {},
        }}
      />
    )
  }
  return (
    <>
      <header className="bar">
        <div className="wrap mast">
          <span className="mark" aria-hidden="true">
            ◈
          </span>
          <b>Верфь</b>
          <span className="mast-sub">Промышленный планировщик</span>
        </div>
      </header>
      <main className="wrap">
        <div className="intro">
          <span className="kicker">EVE ONLINE / ПРОИЗВОДСТВО</span>
          <h1>Калькулятор заказа</h1>
          <p>
            Спланируйте выпуск партии и оцените прибыль. Рецепты условные, цены
            вводятся вручную.
          </p>
        </div>
        <div className="workspace">
          <Paper
            component="form"
            variant="outlined"
            className="order"
            noValidate
            onSubmit={submit}
          >
            <h2 className="order-title">Параметры партии</h2>
            {phase === 'loading' && (
              <p className="catalog-status" role="status">Загрузка каталога…</p>
            )}
            {phase === 'ready' && !catalog.length && (
              <div className="catalog-status">
                <p role="status">Нет доступных чертежей</p>
                <Button type="button" onClick={retryCatalog}>Обновить каталог</Button>
              </div>
            )}
            {phase === 'error' && (
              <Alert
                className="catalog-status"
                severity="error"
                action={<Button type="button" onClick={retryCatalog}>Повторить</Button>}
              >
                Не удалось загрузить каталог
              </Alert>
            )}
            <fieldset disabled={formDisabled}>
              <section>
                <div className="pair">
                  <TextField
                    select
                    fullWidth
                    disabled={formDisabled}
                    size="small"
                    id="blueprintId"
                    label="Чертёж"
                    value={id}
                    onChange={(e) => choose(e.target.value)}
                    error={!!errors.blueprintId}
                    helperText={errors.blueprintId}
                    slotProps={{
                      select: { native: true },
                      htmlInput: { 'aria-required': true },
                      inputLabel: { shrink: true },
                    }}
                  >
                    <option value="">Выберите чертёж</option>
                    {catalog.map((b) => (
                      <option value={b.id} key={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </TextField>
                  {input('runs', 'Число запусков', runs, setRuns, false)}
                </div>
                {blueprint && (
                  <p className="volume">
                    Выпуск за запуск <b>{digits(blueprint.outputPerRun)} шт.</b>{' '}
                    · На партию{' '}
                    <b>
                      {count ? digits(count * blueprint.outputPerRun) : '—'} шт.
                    </b>
                  </p>
                )}
              </section>
              <section>
                <h2>Материалы</h2>
                {blueprint ? (
                  blueprint.materials.map((m) => (
                    <div className="material" key={m.id}>
                      <div>
                        <strong id={'name-' + m.id}>{m.name}</strong>
                        <p>
                          {m.quantityPerRun} за запуск ·{' '}
                          {count ? digits(count * m.quantityPerRun) : '—'} на
                          партию
                        </p>
                      </div>
                      {input(
                        'materialUnitPricesIsk.' + m.id,
                        'Цена за единицу',
                        prices[m.id] ?? '',
                        (v) => setPrices((prev) => ({ ...prev, [m.id]: v })),
                        true,
                        'name-' + m.id,
                      )}
                    </div>
                  ))
                ) : (
                  <p className="hint">
                    Выберите чертёж, чтобы увидеть состав партии.
                  </p>
                )}
              </section>
              <section>
                <h2>Продажа и сборы</h2>
                <div className="fees">
                  {input(
                    'saleUnitPriceIsk',
                    'Цена продажи за изделие',
                    sale,
                    setSale,
                  )}
                  {input('jobFeeIsk', 'Сбор за работу на партию', job, setJob)}
                  {input(
                    'saleFeeIsk',
                    'Сбор при продаже на партию',
                    saleFee,
                    setSaleFee,
                  )}
                </div>
              </section>

              {message && (
                <Alert className="calculation-error" severity="error">{message}</Alert>
              )}
              {busy && (
                <p className="calculation-status" role="status">Выполняется расчёт партии…</p>
              )}
              <Button
                id="calculate"
                fullWidth
                type="submit"
                variant="contained"
                disabled={formDisabled}
                startIcon={busy ? <CircularProgress size={16} aria-hidden="true" /> : undefined}
              >
                {busy ? 'Расчёт…' : 'Рассчитать'}
              </Button>
            </fieldset>
          </Paper>
          <ResultPanel result={result} stale={stale} />
        </div>
      </main>
    </>
  )
}
