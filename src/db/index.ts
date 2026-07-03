import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

declare global {
  var __kintsuPool: Pool | undefined;
}

const pool =
  global.__kintsuPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  global.__kintsuPool = pool;
}

export const db = drizzle(pool, { schema });
export type Database = typeof db;
