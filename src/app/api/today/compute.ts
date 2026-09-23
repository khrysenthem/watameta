import type { DayForecast } from "@/forecasting/compute";

export interface Reading {
  recordedAt: Date;
  value: number;
}

export interface TodayHour {
  hour: number;
  value: number | null;
  source: "actual" | "forecast" | null;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Builds today's 24-hour cumulative-reading profile: the actual reading for
 * every hour that's already been recorded, and a projected running total
 * (last known reading + accumulated forecasted consumption) for every hour
 * still ahead of `now`.
 *
 * A gap in past data (a missing hour before the last known reading) is left
 * as null rather than guessed at — the projection only ever walks forward
 * from the most recent known reading.
 *
 * `todayReadings` and `lastKnown` are passed in separately (rather than one
 * full history array) so the caller can fetch each with a targeted query —
 * `lastKnown` in particular must come from the *full* reading history, not
 * just today's, since the true most recent reading could be from any day.
 */
export function computeTodayProfile(params: {
  now: Date;
  /** Must be UTC midnight of the day being profiled. */
  todayStart: Date;
  /** Only readings recorded on the target calendar day, in any order. */
  todayReadings: Reading[];
  /** The most recent reading at or before `now`, from the full history. */
  lastKnown: Reading | undefined;
  /** 7-length, from computeWeeklyForecast. */
  forecast: DayForecast[];
}): TodayHour[] {
  const { now, todayStart, todayReadings, forecast } = params;
  const todayEnd = new Date(todayStart.getTime() + 24 * ONE_HOUR_MS);

  const actualByHour = new Map<number, number>();
  for (const r of todayReadings) {
    if (r.recordedAt >= todayStart && r.recordedAt < todayEnd && r.recordedAt <= now) {
      actualByHour.set(r.recordedAt.getUTCHours(), r.value);
    }
  }

  const lastKnown = params.lastKnown && params.lastKnown.recordedAt <= now ? params.lastKnown : undefined;

  const projectedByHour = new Map<number, number>();
  if (lastKnown) {
    let cursor = new Date(lastKnown.recordedAt.getTime() + ONE_HOUR_MS);
    let runningValue = lastKnown.value;

    while (cursor < todayEnd) {
      const average = forecast[cursor.getUTCDay()]?.hours[cursor.getUTCHours()]?.average ?? 0;
      runningValue += average;

      if (cursor >= todayStart) {
        projectedByHour.set(cursor.getUTCHours(), runningValue);
      }

      cursor = new Date(cursor.getTime() + ONE_HOUR_MS);
    }
  }

  return Array.from({ length: 24 }, (_, hour) => {
    const actual = actualByHour.get(hour);
    if (actual !== undefined) return { hour, value: actual, source: "actual" as const };

    const projected = projectedByHour.get(hour);
    if (projected !== undefined) return { hour, value: projected, source: "forecast" as const };

    return { hour, value: null, source: null };
  });
}
