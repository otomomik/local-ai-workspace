import { OpenAI } from "openai"
import type { Model } from "../schemas/mlx.js"

const client = new OpenAI({
  baseURL: "http://host.docker.internal:10240/v1",
  apiKey: ""
})

export const getModels = async (): Promise<Model[]> => {
  const models = await client.models.list()
  return models.data.map(model => ({
    id: model.id,
  }))
}
