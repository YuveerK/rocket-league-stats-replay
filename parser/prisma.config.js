import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "../api/prisma/schema.prisma",
  migrations: {
    path: "../api/prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
