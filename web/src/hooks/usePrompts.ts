import { InferRequestType } from "hono"
import { useHono } from "./useHono.ts"

export const usePrompts = () => {
  const hono = useHono()

  const postPrompts = async (request: InferRequestType<typeof hono.prompts.$post>["json"]) => {
    const res = await hono.prompts.$post({
      json: request
    })
    if (!res.ok) {
      throw new Error(`Failed to fetch prompts: ${res.statusText}`)

    }
    return await res.json()
  }

  const postPromptsWithSSE = async (request: InferRequestType<typeof hono.prompts.sse.$post>["json"], callback: (chunk: {
    choices: {
      delta: {
        content: string
      }
    }[]
  }) => boolean) => {
    const res = await hono.prompts.sse.$post({
      json: request
    })
    if (!res.ok) {
      throw new Error(`Failed to fetch prompts: ${res.statusText}`)

    }
    const reader = res.body?.getReader()
    if (!reader) {
      throw new Error("Failed to get reader")
    }

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const decoded = decoder.decode(value).split("data: ")[1]
      const json = JSON.parse(decoded)
      const stop = callback(json)
      if (stop) {
        break
      }
    }
  }

  return {
    postPrompts,
    postPromptsWithSSE
  }
}
