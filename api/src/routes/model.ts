import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi"
import { getModels } from "../services/mlx.js"
import { modelSchema } from "../schemas/mlx.js"

export const modelRouter = new OpenAPIHono().openapi(
  createRoute({
    method: 'get',
    path: '/',
    responses: {
      200: {
        description: 'get models',
        content: {
          'application/json': {
            schema: z.array(modelSchema)
          }
        }
      }
    }
  }),
  async c => {
    const models = await getModels()
    return c.json(models, 200)
  }
)
