// Liveness/readiness probe for load balancers, Docker HEALTHCHECK, and
// uptime monitors. Deliberately unauthenticated and side-effect free.
import { sql } from "drizzle-orm";
import { db } from "@/db";

export async function GET() {
  const startedAt = Date.now();

  try {
    await db.execute(sql`select 1`);
    return Response.json(
      {
        status: "ok",
        database: "up",
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    return Response.json(
      {
        status: "error",
        database: "down",
        error: err instanceof Error ? err.message : "unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
