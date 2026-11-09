import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const g = globalThis as unknown as { pg?: ReturnType<typeof postgres> };
// Reuse one pool across dev hot reloads. PG_POOL=1 for a test database that takes one query at a time.
const client = (g.pg ??= postgres(process.env.DATABASE_URL!, { max: Number(process.env.PG_POOL) || 10 }));

export const db = drizzle(client, { schema });
export * from "./schema";
