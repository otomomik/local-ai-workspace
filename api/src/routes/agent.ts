import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { selectAgentSchema } from "../schemas/agent.js";
import { getAgents } from "../services/agent.js";

const tags = ["agent"]

export const agentRoute = new OpenAPIHono().openapi(
  createRoute({
    method: 'get',
    path: "/",
    tags,
    responses: {
      200: {
        description: 'get agents',
        content: {
          "application/json": {
            schema: selectAgentSchema.array()
          }
        }
      }
    }
  }),
  async c => {
    const agents = await getAgents()
    return c.json(agents)
  }
)
