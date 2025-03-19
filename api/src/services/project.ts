import { projectsTable } from "../db.js"
import { db } from "./drizzle.js"

export const getProjects = async () => {
  const projects = await db.select().from(projectsTable)
  return projects
}
