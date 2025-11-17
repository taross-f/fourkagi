import { type Config } from "drizzle-kit";

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite",
  },
  tablesFilter: ["fourkagi_*"],
} satisfies Config;
