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

export const extractFirstXMLElement = (input: string) => {
  const regex = /<([a-zA-Z_][\w-]*)\b[^>]*>[\s\S]*?<\/\1>/;
  const match = input.match(regex);
  return match ? match[0] : "";
};

type Task = {
  name: string;
  description: string;
  example?: string;
  callback: (props?: Record<string, string>) => string | null; // props = {}
};

const agentTaskEnd: Task = {
  name: "taskEnd",
  description: `- ユーザーが入力した目的が完了した際に呼び出すタスク
- 引数を受け取らない`,
  example: `<taskEnd></taskEnd>`,
  callback: () => null,
};

const agentDockerUp: Task = {
  name: "dockerUp",
  description: `- dockerのContainerを起動します。
- すでに起動している場合はエラーになりません。
- 引数を受け取らない`,
  example: `<dockerUp></dockerUp>`,
  callback: () => {
    return "started";
  },
};

export const agentTasks: Task[] = [agentDockerUp, agentTaskEnd];
