import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { projectsTable } from "../db.js";
import { omitTimestamp } from "./util.js";

export const selectProjectSchema = createSelectSchema(projectsTable)
export const createProjectSchema = createInsertSchema(projectsTable).omit(omitTimestamp)
export const updateProjectSchema = createUpdateSchema(projectsTable).omit(omitTimestamp)
