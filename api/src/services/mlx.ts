import { OpenAI } from "openai";
import type { ChatCompletionsRequest, Model } from "../schemas/mlx.js";

const client = new OpenAI({
  baseURL: "http://localhost:10004/v1",
  apiKey: "",
});

export const getModels = async (): Promise<Model[]> => {
  const models = await client.models.list();
  return models.data.map((model) => ({
    id: model.id,
  }));
};

export const postChatCompletions = async (request: ChatCompletionsRequest) => {
  return client.chat.completions.create({ ...request, stream: false });
};

export const postChatCompletionsWithSSE = async (
  request: ChatCompletionsRequest,
) => {
  return client.chat.completions.create({ ...request, stream: true });
};
