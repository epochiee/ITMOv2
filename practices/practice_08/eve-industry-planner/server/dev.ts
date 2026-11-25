import { createServer } from 'vite'
import { createApp } from './app.ts'
const vite = await createServer({ server: { middlewareMode: true } })
const port = Number(process.env.PORT || 5173)
createApp()
  .use(vite.middlewares)
  .listen(port, '127.0.0.1', () =>
    console.log('Верфь · http://127.0.0.1:' + port),
  )
