import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { agentsTable } from "../db.js";
import { omitTimestamp } from "./util.js";
import { z } from "zod";

export const selectAgentSchema = createSelectSchema(agentsTable)
export type Agent = z.infer<typeof selectAgentSchema>
export const createAgentSchema = createInsertSchema(agentsTable).omit(omitTimestamp)
export const updateAgentSchema = createUpdateSchema(agentsTable).omit(omitTimestamp)
export const requestParamsAgentSchema = z.object({
  agentId: z.string().refine(v => !Number.isNaN(Number(v)), {
    message: "agentId must be a number",
  }).transform(v => Number(v)),
})
