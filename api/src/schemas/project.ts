import { z } from "zod";

const id = z.number()
const name = z.string()
const absolutePath = z.string()

export const selectProjectSchema = z.object({
  id,
  name,
  absolutePath,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const createProjectSchema = z.object({
  name,
  absolutePath,
})

export const updateProjectSchema = createProjectSchema
