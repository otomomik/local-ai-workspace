import { eq } from "drizzle-orm";
import { agentHistoriesTable, agentsTable } from "../db.js";
import type { Agent, CreateAgent } from "../schemas/agent.js";
import { db } from "./drizzle.js";
import { HTTPException } from "hono/http-exception";

export const getAgents = async () => {
  const agents = await db.select().from(agentsTable);
  return agents;
};

export const getAgentById = async (agentId: Agent["id"]) => {
  const agents = await db
    .select()
    .from(agentsTable)
    .where(eq(agentsTable.id, agentId));
  if (agents.length === 0) {
    throw new HTTPException(404, {
      message: `agent with id ${agentId} not found`,
    });
  }

  return agents[0];
};

export const createAgent = async (value: CreateAgent) => {
  const [agent] = await db.insert(agentsTable).values(value).returning();
  return agent;
};

export const getAgentHistoriesById = async (agentId: Agent["id"]) => {
  const agentHistories = await db
    .select()
    .from(agentHistoriesTable)
    .where(eq(agentHistoriesTable.agentId, agentId));
  return agentHistories;
};

export const extractContent = (
  content: string,
): {
  think: string | null;
  content: string | null;
} => {
  const closeThinkTag = "</think>";
  let thinkContent = null;
  const closeThinkIndex = content.indexOf(closeThinkTag);
  const slicedContent = content.slice(
    closeThinkIndex === -1 ? 0 : closeThinkIndex + closeThinkTag.length,
  );
  if (closeThinkIndex !== -1) {
    thinkContent = content.slice(0, closeThinkIndex + closeThinkTag.length);
  }
  const brackets = ["{", "}"] as const;
  const startIndex = slicedContent.indexOf(brackets[0]);
  if (startIndex !== -1) {
    let bracketCount = 0;
    let endIndex = -1;
    for (let i = startIndex; i < slicedContent.length; i++) {
      if (slicedContent[i] === brackets[0]) {
        bracketCount++;
      } else if (slicedContent[i] === brackets[1]) {
        bracketCount--;
      }
      if (bracketCount === 0) {
        endIndex = i;
        break;
      }
    }
    if (endIndex !== -1) {
      return {
        think: thinkContent,
        content: slicedContent.slice(startIndex, endIndex + 1),
      };
    }
  }
  return {
    think: thinkContent,
    content: null,
  };
};
