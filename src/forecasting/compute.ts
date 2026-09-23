export interface Reading {
  recordedAt: Date;
  value: number;
}

export interface HourlyForecast {
  hour: number;
  average: number | null;
  sampleCount: number;
}

export interface DayForecast {
  /** 0 = Sunday .. 6 = Saturday, per Date#getUTCDay(). */
  dayOfWeek: number;
  hours: HourlyForecast[];
}

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Averages hour-over-hour consumption (the delta between consecutive
 * cumulative meter readings) into a 7x24 (day-of-week x hour-of-day, UTC)
 * grid, so habitual patterns (e.g. weekday showers, weekend laundry) show up
 * as a repeating weekly profile instead of being smoothed away.
 *
 * A pair of readings only contributes a delta when they are exactly one hour
 * apart and non-decreasing — a larger gap (missing data) or a decrease
 * (meter reset/data error) can't be attributed to a single hour, so it's
 * skipped rather than silently corrupting the average.
 */
export function computeWeeklyForecast(readings: Reading[]): DayForecast[] {
  const sorted = [...readings].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());

  const buckets = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => ({ sum: 0, count: 0 })),
  );

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    if (curr.recordedAt.getTime() - prev.recordedAt.getTime() !== ONE_HOUR_MS) continue;

    const consumption = curr.value - prev.value;
    if (consumption < 0) continue;

    const bucket = buckets[curr.recordedAt.getUTCDay()][curr.recordedAt.getUTCHours()];
    bucket.sum += consumption;
    bucket.count += 1;
  }

  return buckets.map((hours, dayOfWeek) => ({
    dayOfWeek,
    hours: hours.map((bucket, hour) => ({
      hour,
      average: bucket.count > 0 ? bucket.sum / bucket.count : null,
      sampleCount: bucket.count,
    })),
  }));
}
