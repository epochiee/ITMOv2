import express from 'express'
import type { ErrorRequestHandler } from 'express'
import catalog from '../catalog/blueprints.json' with { type: 'json' }
import { calculate } from './calculate.ts'
import { validate } from '../shared/validate.ts'

export function createApp() {
  const app = express()
  app.get('/api/v1/blueprints', (_req, res) =>
    res.json({ blueprints: catalog }),
  )
  app.post(
    '/api/v1/calculations',
    express.json({ strict: false }),
    (req, res) => {
      const checked = validate(req.body, catalog)
      if (!checked.ok) {
        res
          .status(422)
          .json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Проверьте поля заказа',
              fields: checked.fields,
            },
          })
        return
      }
      res.json(calculate(checked.blueprint, checked.order))
    },
  )
  const errors: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed')
      res
        .status(400)
        .json({ error: { code: 'INVALID_JSON', message: 'Некорректный JSON' } })
    else
      res
        .status(500)
        .json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Не удалось обработать запрос',
          },
        })
  }
  app.use(errors)
  return app
}
