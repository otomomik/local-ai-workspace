import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { createAgentSchema, requestParamsAgentSchema, selectAgentSchema } from "../schemas/agent.js";
import { createAgent, getAgentById, getAgents } from "../services/agent.js";

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
  .openapi(
    createRoute({
      method: 'post',
      path: '/',
      tags,
      request: {
        body: {
          content: {
            "application/json": {
              schema: createAgentSchema
            }
          }
        }
      },
      responses: {
        200: {
          description: 'create agent',
          content: {
            "application/json": {
              schema: selectAgentSchema
            }
          }
        }

      }
    }),
    async c => {
      const value = c.req.valid("json")
      const agent = await createAgent(value)
      return c.json(agent)
    }
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/{agentId}',
      tags,
      request: {
        params: requestParamsAgentSchema
      },
      responses: {
        200: {
          description: 'get agent by id',
          content: {
            "application/json": {
              schema: selectAgentSchema
            }
          }
        }
      }
    }), async c => {
      const { agentId } = c.req.valid("param")
      const agent = await getAgentById(agentId)
      return c.json(agent)
    })
