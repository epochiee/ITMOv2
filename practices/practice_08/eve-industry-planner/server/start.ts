import express from 'express'
import { createApp } from './app.ts'
const port = Number(process.env.PORT || 3000)
createApp()
  .use(express.static('dist'))
  .listen(port, '127.0.0.1', () =>
    console.log('Верфь · http://127.0.0.1:' + port),
  )
