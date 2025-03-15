import { hc } from "hono/client"
import type { AppType } from "../../../api/src"

export const useHono = () => {
  return hc<AppType>("http://localhost:10002")
}
