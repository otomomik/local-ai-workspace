import { stream } from "hono/streaming";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  createAgentSchema,
  requestParamsAgentSchema,
  runAgentSchema,
  selectAgentHistorySchema,
  selectAgentSchema,
  toolResponseSchema,
} from "../schemas/agent.js";
import {
  createAgent,
  getAgentById,
  getAgents,
  getAgentHistoriesById,
  extractContent,
} from "../services/agent.js";
import { postChatCompletions } from "../services/mlx.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  basicClientName,
  npmClientName,
  stopToolName,
} from "../services/mcp.js";
import nodePath from "node:path";
import { writeFile } from "node:fs/promises";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

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
      const configPath = nodePath.join(agent.absolutePath, "local.config.ts");
      const { default: getConfig } = await import(configPath);
      const config = getConfig(agent);
      console.log(config);
      const mcpServers = "mcpServers" in config ? config.mcpServers : {};

      // mcp
      const mcpClient = new Map<string, Client>();

      const basicMcpClient = new Client({
        name: "basicMcpClient",
        version: "0.0.1",
      });
      const basicTransport = new StdioClientTransport({
        command: "tsx",
        args: ["src/services/mcp.basic.ts"],
        env: {
          PATH: process.env.PATH!,
        },
      });
      await basicMcpClient.connect(basicTransport);
      mcpClient.set(basicClientName, basicMcpClient);

      const npmMcpClient = new Client({
        name: "npmMcpClient",
        version: "0.0.1",
      });
      const npmTransport = new StdioClientTransport({
        command: "tsx",
        args: ["src/services/mcp.npm.ts", agent.absolutePath],
        env: {
          PATH: process.env.PATH!,
        },
      });
      await npmMcpClient.connect(npmTransport);
      mcpClient.set(npmClientName, npmMcpClient);

      for (const key of Object.keys(mcpServers)) {
        const {
          command,
          args,
          env = {},
        }: {
          command: string;
          args: string[];
          env?: Record<string, string>;
        } = config.mcpServers[key];
        const client = new Client({
          name: key,
          version: "0.0.1",
        });
        const transport = new StdioClientTransport({
          command,
          args,
          env: {
            PATH: process.env.PATH!,
            ...env,
          },
        });
        await client.connect(transport);
        mcpClient.set(key, client);
      }

      const allTools: Awaited<
        ReturnType<typeof basicMcpClient.listTools>
      >["tools"] = [];

      for (const [key, client] of mcpClient.entries()) {
        const { tools } = await client.listTools();
        allTools.push(
          ...tools.map((tool) => ({
            ...tool,
            name: [key, tool.name].join("/"),
          })),
        );
      }

      const systemMessage = `You are an advanced autonomous AI agent designed to achieve tasks using given resources—tools and the work environment. The ultimate goal will be provided separately by the user. Your role is to autonomously evaluate the current task, choose the most appropriate tool from the provided list, and output the selected tool’s name along with the necessary parameters in the specified JSON format. Additionally, the work environment is provided in a separate JSON structure that may be extended in the future.

──────────────────────────────
Tool Definition Format

Each tool is provided in the following JSON format:

${JSON.stringify(
  allTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    args: tool.inputSchema,
  })),
  null,
  2,
)}
Note: The tool list will consist of multiple objects of the above structure.

──────────────────────────────
Output Format (For AI’s Output)

For each task, you must autonomously select one optimal tool from the provided tool list, then output the chosen tool’s name along with the required parameters in the following JSON format:

{
  "name": "Name of the selected tool",
  "args": {
      "param1": "Value set for parameter 1",
      "param2": "Value set for parameter 2",
      ...  // Include only the necessary parameters based on the tool definition
  }
}

Important: Do not include any additional explanations or commentary—output only the result as specified.

──────────────────────────────
Work Environment Format

The work environment information (e.g., specified working path, directory structure, available resources, etc.) will be provided in a separate JSON structure. The format is defined as follows:

${JSON.stringify(
  {
    work_path: agent.absolutePath,
  },
  null,
  2,
)}

Note: This structure is designed to be extendable so that more environmental parameters can be managed in the future.

──────────────────────────────
Basic Principles and Operational Process

1. Context Awareness and Information Retention  
   • Constantly maintain an up-to-date understanding of the current task requirements, work environment, and available tool information (per the Tool Definition Format).  
   • Learn from past executions and incorporate the insights into future decision-making.

2. Tool Selection and Output  
   • Review each tool’s "tool_name", "description", and "parameters" from the provided list, and autonomously select the one tool that best fits the current task.  
   • Consider factors such as efficiency and error avoidance when there are multiple candidates, and always narrow down to a single best tool.  
   • Output only the selected tool’s name and the necessary parameter settings in the JSON Output Format stated above.

3. Self-Improvement and Error Handling  
   • Continuously refine your tool selection and parameter settings based on execution results and feedback.  
   • Perform consistency checks on parameters and execute error handling procedures promptly if exceptions occur.

4. Resource Management and Efficiency  
   • Manage the work environment’s resources (files, memory, and other computational resources) to prevent unnecessary processing or wastage.  
   • Reallocate or optimize resources as needed in order to maximize performance.

──────────────────────────────
Overall Instruction

With this prompt, you are tasked with making efficient and flexible autonomous decisions for the current task by selecting the optimal tool and outputting the chosen tool’s name and required parameters strictly in the defined JSON format. Additionally, you should consider the work environment information as provided in its own JSON structure (which is subject to future expansion).

──────────────────────────────

Use this system prompt as the guiding framework to achieve your task autonomously, ensuring that all outputs conform exactly to the JSON formats provided.
`;

      const messages: Parameters<typeof postChatCompletions>[0]["messages"] = [
        {
          role: "system",
          content: systemMessage,
        },
      ];
      return stream(c, async (stream) => {
        while (true) {
          try {
            await writeFile(
              "./messages.json",
              JSON.stringify(messages, null, 2),
              {
                encoding: "utf-8",
              },
            );
            const generated = await postChatCompletions({
              model,
              messages,
            });
            const generatedContent =
              generated.choices[0].message.content ?? "[]";
            const { content } = extractContent(generatedContent);
            if (content == null) {
              continue;
            }

            const parsedContent = toolResponseSchema.parse(JSON.parse(content));
            let isBreak = false;
            for (const item of parsedContent) {
              const { tool, args } = item;
              const [clientName, ...toolName] = tool.split("/");
              const toolNameStr = toolName.join("/");
              const client = mcpClient.get(clientName);
              if (!client) {
                console.error(`client ${clientName} not found`);
                continue;
              }

              if (
                clientName === basicClientName &&
                stopToolName === toolNameStr
              ) {
                isBreak = true;
                break;
              }

              const toolResult = (await client.callTool({
                name: toolNameStr,
                arguments: args,
              })) as CallToolResult;

              messages.push({
                role: "assistant",
                content: JSON.stringify(item, null, 2),
              });
              messages.push({
                role: "user",
                content: JSON.stringify(
                  toolResult.content.map((c) => ({
                    text: `${!!toolResult.isError ? "Failed" : "Success"}: ${
                      c.type === "text" ? c.text : JSON.stringify(c, null, 2)
                    }`,
                  })),
                  null,
                  2,
                ),
              });
              stream.writeln(
                `date: ${JSON.stringify({
                  tool: tool,
                  assistant: item,
                  user: toolResult,
                })}`,
              );
            }

            if (isBreak) {
              break;
            }
          } catch (e) {
            console.error(e);
            continue;
          }
        }

        for (const client of mcpClient.values()) {
          await client.close();
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
