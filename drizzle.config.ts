import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit does not load `.env.local` the way Next does, so the `db:*`
 * scripts in package.json run it through dotenv-cli to supply DATABASE_URL.
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
