import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let pool: Pool | undefined;

/** Lazily creates the pg pool so importing this module never requires DATABASE_URL to be set (e.g. in tests). */
export function getDb() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set (see .env.example)");
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return drizzle(pool, { schema });
}
