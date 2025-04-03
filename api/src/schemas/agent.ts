import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { agentHistoriesTable, agentsTable } from "../db.js";
import { omitTimestamp } from "./util.js";
import { z } from "zod";
import { modelId } from "./mlx.js";

export const selectAgentHistorySchema = createSelectSchema(agentHistoriesTable);

export const selectAgentSchema = createSelectSchema(agentsTable);
export type Agent = z.infer<typeof selectAgentSchema>;
export const createAgentSchema =
  createInsertSchema(agentsTable).omit(omitTimestamp);
export type CreateAgent = z.infer<typeof createAgentSchema>;
export const updateAgentSchema =
  createUpdateSchema(agentsTable).omit(omitTimestamp);
export const requestParamsAgentSchema = z.object({
  agentId: z
    .string()
    .refine((v) => !Number.isNaN(Number(v)), {
      message: "agentId must be a number",
    })
    .transform((v) => Number(v)),
});
export const runAgentSchema = z.object({
  model: modelId,
  message: z.string(),
});

const tool = z.object({
  name: z.string(),
  args: z.record(z.any()).optional().default({}),
});
export const toolResponseSchema = tool.array().or(tool.transform((v) => [v]));
