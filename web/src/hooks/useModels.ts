import useSWR from 'swr'
import { useHono } from './useHono'

export const useModels = () => {
  const hono = useHono()
  return useSWR(hono.models.$url().href, hono.models.$get)
}
