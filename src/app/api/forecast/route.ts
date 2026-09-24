import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/database";
import { resolveSessionUserId } from "@/resolve-session-user";
import { computeWeeklyForecast } from "@/forecasting/compute";

export const GET = auth(async (request) => {
  const userId = await resolveSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const readings = await db
    .selectFrom("readings")
    .select(["recorded_at", "value"])
    .where("user_id", "=", userId)
    .orderBy("recorded_at", "asc")
    .execute();

  const forecast = computeWeeklyForecast(
    readings.map((r) => ({ recordedAt: r.recorded_at, value: r.value })),
  );

  return NextResponse.json({ forecast });
});
