import { beforeAll, afterAll, expect, it } from 'vitest'
import { once } from 'node:events'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp } from '../server/app'
import catalog from '../catalog/blueprints.json'
import { expected, sample } from './example'
let server: Server
let url: string
beforeAll(async () => {
  server = createApp().listen(0, '127.0.0.1')
  await once(server, 'listening')
  url = 'http://127.0.0.1:' + (server.address() as AddressInfo).port + '/api/v1'
})
afterAll(
  () =>
    new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    ),
)
const post = (body: string) =>
  fetch(url + '/calculations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
it('возвращает три рецепта', async () => {
  const res = await fetch(url + '/blueprints')
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ blueprints: catalog })
  expect(catalog).toHaveLength(3)
})
it('возвращает контрольный заказ', async () => {
  const res = await post(JSON.stringify(sample))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual(expected)
})
it.each([
  [{ blueprintId: 'unknown' }, 'blueprintId'],
  [{ runs: 0 }, 'runs'],
  [{ runs: 10001 }, 'runs'],
  [{ runs: 1.5 }, 'runs'],
  [{ runs: '10' }, 'runs'],
  [
    { materialUnitPricesIsk: { tritanium: '0' } },
    'materialUnitPricesIsk.pyerite',
  ],
  [
    { materialUnitPricesIsk: { ...sample.materialUnitPricesIsk, other: '0' } },
    'materialUnitPricesIsk.other',
  ],
  [{ jobFeeIsk: undefined }, 'jobFeeIsk'],
  ...[
    1,
    '',
    ' 1',
    '1\n',
    '-1',
    '+1',
    '01',
    '00',
    '1.0',
    '1e3',
    '1000000000001',
  ].map((v): [Record<string, unknown>, string] => [
    { saleUnitPriceIsk: v },
    'saleUnitPriceIsk',
  ]),
])('отклоняет %j', async (patch, key) => {
  const res = await post(JSON.stringify({ ...sample, ...Object(patch) }))
  expect(res.status).toBe(422)
  const { error } = await res.json()
  expect(error.code).toBe('VALIDATION_ERROR')
  expect(error.fields[String(key)]).toBeTruthy()
})
it('ошибка синтаксиса JSON', async () => {
  const res = await post('{')
  expect(res.status).toBe(400)
  expect((await res.json()).error.code).toBe('INVALID_JSON')
})
