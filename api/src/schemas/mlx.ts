import { z } from "@hono/zod-openapi";

export const modelId = z.string();
export const modelSchema = z.object({
  id: modelId,
});
[];
export type Model = z.infer<typeof modelSchema>;

const messageContent = z.object({
  content: z.string().or(
    z
      .object({
        type: z.literal("text"),
        text: z.string(),
      })
      .array(),
  ),
});
export const promptRequest = z.object({
  model: modelId,
  messages: z.array(
    z
      .object({
        role: z.enum(["system", "user", "assistant"]),
      })
      .and(messageContent),
  ),
});
export const promptResponse = z.object({
  content: z.string(),
});
export type ChatCompletionsRequest = z.infer<typeof promptRequest>;
export type ChatCompletionsResponse = z.infer<typeof promptResponse>;
