import { useHono } from "./useHono.ts"

export const usePrompts = () => {
  const hono = useHono()

  const postPrompts = async (request: Parameters<typeof hono.prompts.$post>[0]["json"]) => {
    const res = await hono.prompts.$post({
      json: request
    })
    if (!res.ok) {
      throw new Error(`Failed to fetch prompts: ${res.statusText}`)

    }
    return await res.json()
  }

  const postPromptsWithSSE = async (request: Parameters<typeof hono.prompts.sse.$post>[0]["json"], callback: (chunk: any) => boolean) => {
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

      const decoded = decoder.decode(value)
      const stop = callback(decoded)
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
