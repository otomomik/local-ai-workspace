import { stream } from "hono/streaming";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  createAgentSchema,
  requestParamsAgentSchema,
  runAgentSchema,
  selectAgentHistorySchema,
  selectAgentSchema,
} from "../schemas/agent.js";
import {
  createAgent,
  extractFirstXMLElement,
  getAgentById,
  getAgents,
  agentTasks,
  getAgentHistoriesById,
} from "../services/agent.js";
import { postChatCompletions } from "../services/mlx.js";
import path from "path";

const tags = ["agent"];

export const agentRoute = new OpenAPIHono()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      tags,
      responses: {
        200: {
          description: "get agents",
          content: {
            "application/json": {
              schema: selectAgentSchema.array(),
            },
          },
        },
      },
    }),
    async (c) => {
      const agents = await getAgents();
      return c.json(agents);
    },
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      tags,
      request: {
        body: {
          content: {
            "application/json": {
              schema: createAgentSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: "create agent",
          content: {
            "application/json": {
              schema: selectAgentSchema,
            },
          },
        },
      },
    }),
    async (c) => {
      const { name, absolutePath } = c.req.valid("json");
      const agent = await createAgent({
        name,
        absolutePath,
      });
      return c.json(agent);
    },
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/{agentId}",
      tags,
      request: {
        params: requestParamsAgentSchema,
      },
      responses: {
        200: {
          description: "get agent by id",
          content: {
            "application/json": {
              schema: selectAgentSchema,
            },
          },
        },
      },
    }),
    async (c) => {
      const { agentId } = c.req.valid("param");
      const agent = await getAgentById(agentId);
      return c.json(agent);
    },
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/{agentId}/run",
      tags,
      request: {
        params: requestParamsAgentSchema,
        body: {
          content: {
            "application/json": {
              schema: runAgentSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: "run agent",
          content: {
            "text/event-stream": {
              schema: z.string(),
            },
          },
        },
      },
    }),
    async (c) => {
      const { agentId } = c.req.valid("param");
      const { model, message } = c.req.valid("json");

      const agent = await getAgentById(agentId);
      const configPath = path.join(agent.absolutePath, "local.config.ts");
      const { default: config } = await import(configPath);
      const systemMessage = (
        config.systemPrompt ??
        `あなたは自立型のエンジニアです。
ユーザーの入力内容からルールにしたがって作業を行います。
必ずXML形式で出力すること。
タスクは必ず1つだけ出力すること。

## ルール
- DockerのContainerで作業する前提です。
- 不要な出力を行わないこと
- タスクに沿って作業を行うこと

{tasks}

{examples}`
      )
        .replace("{tasks}", () => {
          if (agentTasks.length === 0) {
            return "";
          }

          return `## タスク

${agentTasks
  .map(
    (task) => `### ${task.name}

${task.description}`,
  )
  .join("\n\n")}`;
        })
        .replace("{examples}", () => {
          const exampleTasks = agentTasks.filter(
            (task) => task.example != null,
          );
          if (exampleTasks.length === 0) {
            return "";
          }

          return `## 出力例

${exampleTasks
  .map(
    (task) => `### ${task.name}

${task.example}`,
  )
  .join("\n\n")}`;
        });

      const messages: Parameters<typeof postChatCompletions>[0]["messages"] = [
        {
          role: "system",
          content: systemMessage,
        },
        {
          role: "user",
          content: message,
        },
      ];
      return stream(c, async (stream) => {
        while (true) {
          console.log(messages);
          const generated = await postChatCompletions({
            model,
            messages,
          });
          const extractedXML = extractFirstXMLElement(
            generated.choices[0].message.content ?? "",
          );
          if (extractedXML === "") {
            continue;
          }

          const toolName = extractedXML.match(
            /<([a-zA-Z_][\w-]*)\b[^>]*>/,
          )?.[1]!;
          const foundTask = agentTasks.find((task) => task.name === toolName);
          if (!foundTask) {
            continue;
          }

          messages.push({
            role: "assistant",
            content: extractedXML,
          });
          const toolResult = foundTask.callback();
          stream.writeln(
            `data: ${JSON.stringify({
              tool: {
                name: toolName,
                result: toolResult,
              },
            })} `,
          );
          if (toolResult == null) {
            break;
          }
          messages.push({
            role: "user",
            content: `## tool name

${toolName}

## tool result

${toolResult}`,
          });
        }

        stream.close();
      });
    },
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/{agentId}/histories",
      tags,
      request: {
        params: requestParamsAgentSchema,
      },
      responses: {
        200: {
          description: "get agent histories by id",
          content: {
            "application/json": {
              schema: selectAgentHistorySchema.array(),
            },
          },
        },
      },
    }),
    async (c) => {
      const { agentId } = c.req.valid("param");
      const agentHistories = await getAgentHistoriesById(agentId);
      return c.json(agentHistories);
    },
  );
