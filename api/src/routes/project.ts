import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { selectProjectSchema } from "../schemas/project.js";
import { getProjects } from "../services/project.js";

export const projectRoute = new OpenAPIHono().openapi(
  createRoute({
    method: 'get',
    path: '/',
    responses: {
      200: {
        description: 'get projects',
        content: {
          'application/json': {
            schema: selectProjectSchema.array()
          }
        }
      }
    }
  }),
  async c => {
    const projects = await getProjects()
    return c.json(projects)
  }
)
