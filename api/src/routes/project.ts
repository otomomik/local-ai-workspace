import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { createProjectSchema } from "../schemas/project.js";

export const projectRoute = new OpenAPIHono().openapi(
  createRoute({
    method: 'get',
    path: '/',
    responses: {
      200: {
        description: 'get projects',
        content: {
          'application/json': {
            schema: createProjectSchema.array()
          }
        }

      }
    }
  }),
  c => {
    return c.json([])
  }
)
