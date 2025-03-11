import { serve } from '@hono/node-server'
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi"

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
app.get('/', (c) => {
  return c.text('Hello Hono!')
})

serve({
  fetch: app.fetch,
  port: 8000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
