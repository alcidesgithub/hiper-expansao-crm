import { defineConfig } from "prisma/config";

try {
  require("dotenv/config");
} catch {
  // In containerized production, env vars are injected by the runtime.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
