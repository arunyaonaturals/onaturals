import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use local SQLite for schema operations; runtime uses Turso adapter
    url: "file:./prisma/dev.db",
  },
});
