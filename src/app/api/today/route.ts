import { NextResponse } from "next/server";
import { sql } from "kysely";
import { auth } from "@/auth";
import { db } from "@/db/database";
import { computeWeeklyForecast } from "@/forecasting/compute";
import { computeTodayProfile } from "./compute";

export const GET = auth(async (request) => {
  if (!request.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = request.auth.user.id;
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const todayDow = todayStart.getUTCDay();
  const yesterdayDow = (todayDow + 6) % 7;

  const [lastKnownRow, todaysRows, forecastRows] = await Promise.all([
    // The projection baseline: the single most recent reading overall, which
    // could be from any day — must not be restricted to today's/yesterday's
    // day-of-week like the forecast query below.
    db
      .selectFrom("readings")
      .select(["recorded_at", "value"])
      .where("user_id", "=", userId)
      .where("recorded_at", "<=", now)
      .orderBy("recorded_at", "desc")
      .limit(1)
      .executeTakeFirst(),
    db
      .selectFrom("readings")
      .select(["recorded_at", "value"])
      .where("user_id", "=", userId)
      .where("recorded_at", ">=", todayStart)
      .where("recorded_at", "<", todayEnd)
      .execute(),
    // computeTodayProfile only ever reads today's (and, crossing midnight,
    // yesterday's) forecast bucket, so there's no need to pull every
    // historical reading through computeWeeklyForecast just to get those —
    // only fetch the reading pairs that can contribute to those two buckets.
    // "at time zone 'UTC'" matters here: Date#getUTCDay() (used everywhere
    // else) and Postgres's default EXTRACT(dow) session-timezone behavior
    // would otherwise disagree.
    db
      .selectFrom("readings")
      .select(["recorded_at", "value"])
      .where("user_id", "=", userId)
      .where(sql<number>`extract(dow from recorded_at at time zone 'UTC')`, "in", [
        todayDow,
        yesterdayDow,
      ])
      .orderBy("recorded_at", "asc")
      .execute(),
  ]);

  const forecast = computeWeeklyForecast(
    forecastRows.map((r) => ({ recordedAt: r.recorded_at, value: r.value })),
  );

  const hours = computeTodayProfile({
    now,
    todayStart,
    todayReadings: todaysRows.map((r) => ({ recordedAt: r.recorded_at, value: r.value })),
    lastKnown: lastKnownRow ? { recordedAt: lastKnownRow.recorded_at, value: lastKnownRow.value } : undefined,
    forecast,
  });

  return NextResponse.json({
    date: todayStart.toISOString().slice(0, 10),
    hours,
  });
});
