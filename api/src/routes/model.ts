import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getModels } from "../services/mlx.js";
import { modelSchema } from "../schemas/mlx.js";

const tags = ["model"];

export const modelRouter = new OpenAPIHono().openapi(
  createRoute({
    method: "get",
    path: "/",
    tags,
    responses: {
      200: {
        description: "get models",
        content: {
          "application/json": {
            schema: modelSchema.array(),
          },
        },
      },
    },
  }),
  async (c) => {
    const models = await getModels();
    return c.json(models, 200);
  },
);
