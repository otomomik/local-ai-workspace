import { eq } from "drizzle-orm";
import { agentHistoriesTable, agentsTable } from "../db.js";
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

export const extractFirstXMLElement = (input: string) => {
  const regex = /<([a-zA-Z_][\w-]*)\b[^>]*>[\s\S]*?<\/\1>/;
  const match = input.match(regex);
  return match ? match[0] : "";
}

const agentTaskEnd = () => {
  console.log("taskEnd")
  return ""
}

export const agentTask: Record<string, (...props: any) => string> = {
  taskEnd: agentTaskEnd
} as const

export const getAgentHistoriesById = async (agentId: Agent["id"]) => {
  const agentHistories = await db.select().from(agentHistoriesTable).where(eq(
    agentHistoriesTable.agentId, agentId
  ))
  return agentHistories
}
