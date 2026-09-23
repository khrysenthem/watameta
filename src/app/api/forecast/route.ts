import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/database";
import { computeWeeklyForecast } from "@/forecasting/compute";

export const GET = auth(async (request) => {
  if (!request.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const readings = await db
    .selectFrom("readings")
    .select(["recorded_at", "value"])
    .where("user_id", "=", request.auth.user.id)
    .orderBy("recorded_at", "asc")
    .execute();

  const forecast = computeWeeklyForecast(
    readings.map((r) => ({ recordedAt: r.recorded_at, value: r.value })),
  );

  return NextResponse.json({ forecast });
});
