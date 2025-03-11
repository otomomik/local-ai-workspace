import { serve } from '@hono/node-server'
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi"
import { swaggerUI } from '@hono/swagger-ui'


const app = new OpenAPIHono()

app.openapi(
  createRoute({
    method: 'get',
    path: '/',
    responses: {
      200: {
        description: 'Hello Hono!',
        content: {
          'application/json': {
            schema: z.object({
              type: z.string(),
              example: z.string()
            })
          }
        }
      }
    }
  }),
  c => {
    return c.json(
      {
        type: 'string',
        example: 'Hello Hono!'
      },
    )

  }
)

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
