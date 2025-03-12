import { z } from "@hono/zod-openapi"

export const modelSchema = z.object({
  id: z.string(),
})
export type Model = z.infer<typeof modelSchema>
