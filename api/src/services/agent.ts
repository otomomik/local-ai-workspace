import { eq } from "drizzle-orm";
import { agentsTable } from "../db.js";
import type { Agent, CreateAgent } from "../schemas/agent.js";
import { db } from "./drizzle.js";
import { HTTPException } from "hono/http-exception";

export const getAgents = async () => {
  const agents = await db.select().from(agentsTable)
  return agents
}

export const getAgentById = async (agentId: Agent["id"]) => {
  const agents = await db.select().from(agentsTable).where(eq(
    agentsTable.id,
    agentId
  ))
  if (agents.length === 0) {
    throw new HTTPException(404,
      { message: `agent with id ${agentId} not found` }
    )
  }

  return agents[0]
}

export const createAgent = async (value: CreateAgent) => {
  const [agent] = await db.insert(agentsTable).values(value).returning()
  return agent

}
