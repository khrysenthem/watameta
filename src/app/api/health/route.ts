import { NextResponse } from "next/server";

/**
 * Liveness/readiness check for load balancer target groups. Deliberately has
 * no auth and no DB dependency — a broken database shouldn't make the
 * container itself look unhealthy and get cycled by ECS.
 */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
