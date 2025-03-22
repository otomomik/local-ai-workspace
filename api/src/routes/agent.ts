import { stream } from "hono/streaming"
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { createAgentSchema, requestParamsAgentSchema, runAgentSchema, selectAgentSchema } from "../schemas/agent.js";
import { createAgent, extractFirstXMLElement, getAgentById, getAgents, task } from "../services/agent.js";
import { postChatCompletions } from "../services/mlx.js";

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
      const {
        name,
        absolutePath
      } = c.req.valid("json")
      const agent = await createAgent({
        name, absolutePath
      })
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
  .openapi(
    createRoute({
      method: 'post',
      path: '/{agentId}/run',
      tags,
      request: {
        params: requestParamsAgentSchema,
        body: {
          content: {
            "application/json": {
              schema: runAgentSchema
            }
          }
        }
      },
      responses: {
        200: {
          description: 'run agent',
          content: {
            "text/event-stream": {
              schema: z.string()
            }
          }
        }
      }
    }), async c => {
      const { agentId } = c.req.valid("param")
      const {
        model,
        message
      } = c.req.valid("json")

      const agent = await getAgentById(agentId)
      return stream(c, async stream => {
        while (true) {
          const messages: Parameters<typeof postChatCompletions>[0]["messages"] = [
            {
              role: "system",
              content: `あなたは自立型のエンジニアです。
ユーザーの入力内容からルールにしたがって作業を行います。
必ずXML形式で出力すること。
ツールは必ず1つだけ出力すること。

## ルール
- DockerのContainerで作業する前提です。
- 不要な出力を行わないこと
- ツールに沿って作業を行うこと

## ツール
- taskEnd
  - ユーザーの入力内容の作業が完了したことを示します

## 出力例

### 例1

<taskEnd></taskEnd>
`
            },
            {
              role: "user",
              content: message
            }
          ]

          const generated = await postChatCompletions({
            model,
            messages,
          })
          const extractedXML = extractFirstXMLElement(
            generated.choices[0].message.content ?? ""
          )
          if (extractedXML === "") {
            continue
          }

          const toolName = extractedXML.match(/<([a-zA-Z_][\w-]*)\b[^>]*>/)?.[1]!
          if (!(toolName in task)) {
            continue
          }

          const toolResult = task[toolName]()
          stream.writeln(`data: ${JSON.stringify({
            tool: {
              name: toolName,
              result: toolResult
            }
          })}`)
          if (toolName === "taskEnd") {
            break
          }

        }

        stream.close()
      })
    })
