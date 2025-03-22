import { agentsTable } from "../db.js";
import { db } from "./drizzle.js";

export const getAgents = async () => {
  const agents = await db.select().from(agentsTable)
  return agents
}
