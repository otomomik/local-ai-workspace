import { sql } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

const timestamps = (deletedAt: boolean = false) => ({
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "string",
  })
    .default(sql`(now() AT TIME ZONE 'utc'::text)`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .default(sql`(now() AT TIME ZONE 'utc'::text)`)
    .notNull()
    .$onUpdate(() => sql`(now() AT TIME ZONE 'utc'::text)`),
  ...(deletedAt ? {
    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
      mode: "string",
    }),
  } : {})
});

export const projectsTable = pgTable("projects", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  name: text("name").notNull(),
  absolutePath: text("absolute_path").notNull(),
  ...timestamps()
})
