import useSWR from 'swr'
import { useHono } from './useHono'

export const useModels = () => {
  const hono = useHono()
  return useSWR(hono.models.$url().href, async () => {
    const res = await hono.models.$get()
    if (!res.ok) {
      throw new Error(`Failed to fetch models: ${res.statusText}`)
    }

    return await res.json()
  })
}
