import { cors } from "hono/cors"
import { serve } from '@hono/node-server'
import { OpenAPIHono } from "@hono/zod-openapi"
import { swaggerUI } from '@hono/swagger-ui'
import { modelRouter } from "./routes/model.js"


const app = new OpenAPIHono()

app.use(cors())

const router = app.route('/models', modelRouter)
export type AppType = typeof router

app.get('/docs', swaggerUI({ url: '/doc' }))
app.doc('/doc', {
  info: {
    title: 'Local AI Workspace API',
    version: 'v1'
  },
  openapi: '3.1.0'
})

serve({
  fetch: app.fetch,
  port: 8000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
