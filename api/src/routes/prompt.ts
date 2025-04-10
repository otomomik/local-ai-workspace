import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { promptRequest, promptResponse } from "../schemas/mlx.js";
import { stream } from "hono/streaming";
import {
  postChatCompletions,
  postChatCompletionsWithSSE,
} from "../services/mlx.js";

const tags = ["prompt"];

export const promptRouter = new OpenAPIHono()
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      tags,
      request: {
        body: {
          content: {
            "application/json": {
              schema: promptRequest,
            },
          },
        },
      },
      responses: {
        200: {
          description: "post prompts",
          content: {
            "application/json": {
              schema: promptResponse,
            },
          },
        },
      },
    }),
    async (c) => {
      const request = c.req.valid("json");
      const generated = await postChatCompletions(request);
      return c.json(
        {
          content: generated.choices[0].message.content ?? "",
        },
        200,
      );
    },
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/sse",
      tags,
      request: {
        body: {
          content: {
            "application/json": {
              schema: promptRequest,
            },
          },
        },
      },
      responses: {
        200: {
          description: "post prompts sse",
          content: {
            "text/event-stream": {
              schema: z.string(),
            },
          },
        },
      },
    }),
    (c) => {
      const request = c.req.valid("json");
      return stream(c, async (stream) => {
        const generating = await postChatCompletionsWithSSE(request);

        for await (const chunk of generating) {
          if (chunk.choices[0].delta.content) {
            stream.writeln(`data: ${JSON.stringify(chunk)}`);
          }
        }

        stream.close();
      });
    },
  );
