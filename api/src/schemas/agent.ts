import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { agentsTable } from "../db.js";
import { omitTimestamp } from "./util.js";

export const selectAgentSchema = createSelectSchema(agentsTable)
export const createAgentSchema = createInsertSchema(agentsTable).omit(omitTimestamp)
export const updateAgentSchema = createUpdateSchema(agentsTable).omit(omitTimestamp)
