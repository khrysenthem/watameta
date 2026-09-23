import { describe, expect, it } from "vitest";
import { computeTodayProfile } from "./compute";
import type { DayForecast } from "@/forecasting/compute";

function reading(iso: string, value: number) {
  return { recordedAt: new Date(iso), value };
}

/** An all-null 7x24 forecast, with the given (dayOfWeek, hour) overrides applied. */
function forecastWith(overrides: { dayOfWeek: number; hour: number; average: number }[]): DayForecast[] {
  const grid = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    hours: Array.from({ length: 24 }, (_, hour) => ({ hour, average: null as number | null, sampleCount: 0 })),
  }));
  for (const o of overrides) {
    grid[o.dayOfWeek].hours[o.hour] = { hour: o.hour, average: o.average, sampleCount: 1 };
  }
  return grid;
}

describe("computeTodayProfile", () => {
  it("returns all nulls when there is no reading history at all", () => {
    const now = new Date("2023-01-02T12:00:00Z"); // Monday
    const todayStart = new Date("2023-01-02T00:00:00Z");

    const hours = computeTodayProfile({
      now,
      todayStart,
      todayReadings: [],
      lastKnown: undefined,
      forecast: forecastWith([]),
    });

    expect(hours).toHaveLength(24);
    for (const h of hours) {
      expect(h).toMatchObject({ value: null, source: null });
    }
  });

  it("uses the actual reading for every hour already recorded today", () => {
    const now = new Date("2023-01-02T10:30:00Z"); // Monday, mid-hour-10
    const todayStart = new Date("2023-01-02T00:00:00Z");

    const todayReadings = [
      reading("2023-01-02T08:00:00Z", 100),
      reading("2023-01-02T09:00:00Z", 105),
      reading("2023-01-02T10:00:00Z", 112),
    ];

    const hours = computeTodayProfile({
      now,
      todayStart,
      todayReadings,
      lastKnown: reading("2023-01-02T10:00:00Z", 112),
      forecast: forecastWith([]),
    });

    expect(hours[8]).toMatchObject({ value: 100, source: "actual" });
    expect(hours[9]).toMatchObject({ value: 105, source: "actual" });
    expect(hours[10]).toMatchObject({ value: 112, source: "actual" });
  });

  it("projects the rest of the day from the last known reading using the forecast", () => {
    const now = new Date("2023-01-02T10:30:00Z"); // Monday
    const todayStart = new Date("2023-01-02T00:00:00Z");

    const lastKnown = reading("2023-01-02T10:00:00Z", 100);
    const forecast = forecastWith([
      { dayOfWeek: 1, hour: 11, average: 5 },
      { dayOfWeek: 1, hour: 12, average: 3 },
    ]);

    const hours = computeTodayProfile({
      now,
      todayStart,
      todayReadings: [lastKnown],
      lastKnown,
      forecast,
    });

    expect(hours[10]).toMatchObject({ value: 100, source: "actual" });
    expect(hours[11]).toMatchObject({ value: 105, source: "forecast" }); // 100 + 5
    expect(hours[12]).toMatchObject({ value: 108, source: "forecast" }); // 105 + 3
  });

  it("treats a missing forecast bucket (no historical data) as zero consumption", () => {
    const now = new Date("2023-01-02T10:30:00Z");
    const todayStart = new Date("2023-01-02T00:00:00Z");
    const lastKnown = reading("2023-01-02T10:00:00Z", 100);

    const hours = computeTodayProfile({
      now,
      todayStart,
      todayReadings: [lastKnown],
      lastKnown,
      forecast: forecastWith([]),
    });

    expect(hours[11]).toMatchObject({ value: 100, source: "forecast" });
    expect(hours[23]).toMatchObject({ value: 100, source: "forecast" });
  });

  it("does not fill in a gap earlier in the day than the last known reading", () => {
    const now = new Date("2023-01-02T10:30:00Z");
    const todayStart = new Date("2023-01-02T00:00:00Z");
    // hour 8 is missing, hour 9 is known
    const lastKnown = reading("2023-01-02T09:00:00Z", 100);

    const hours = computeTodayProfile({
      now,
      todayStart,
      todayReadings: [lastKnown],
      lastKnown,
      forecast: forecastWith([]),
    });

    expect(hours[8]).toMatchObject({ value: null, source: null });
    expect(hours[9]).toMatchObject({ value: 100, source: "actual" });
  });

  it("projects forward correctly across a midnight boundary", () => {
    const now = new Date("2023-01-02T02:00:00Z"); // Monday, early morning
    const todayStart = new Date("2023-01-02T00:00:00Z");
    // last known reading is from Sunday night — not part of today's readings
    const lastKnown = reading("2023-01-01T23:00:00Z", 100);

    const forecast = forecastWith([
      { dayOfWeek: 1, hour: 0, average: 2 }, // Monday 00:00
      { dayOfWeek: 1, hour: 1, average: 4 }, // Monday 01:00
    ]);

    const hours = computeTodayProfile({
      now,
      todayStart,
      todayReadings: [],
      lastKnown,
      forecast,
    });

    expect(hours[0]).toMatchObject({ value: 102, source: "forecast" });
    expect(hours[1]).toMatchObject({ value: 106, source: "forecast" });
  });

  it("ignores readings timestamped after now", () => {
    const now = new Date("2023-01-02T10:00:00Z");
    const todayStart = new Date("2023-01-02T00:00:00Z");
    const todayReadings = [
      reading("2023-01-02T09:00:00Z", 100),
      reading("2023-01-02T11:00:00Z", 999), // in the future relative to `now`
    ];

    const hours = computeTodayProfile({
      now,
      todayStart,
      todayReadings,
      lastKnown: reading("2023-01-02T09:00:00Z", 100),
      forecast: forecastWith([]),
    });

    expect(hours[9]).toMatchObject({ value: 100, source: "actual" });
    expect(hours[11]).toMatchObject({ value: 100, source: "forecast" });
  });

  it("ignores a lastKnown reading timestamped after now", () => {
    const now = new Date("2023-01-02T10:00:00Z");
    const todayStart = new Date("2023-01-02T00:00:00Z");

    const hours = computeTodayProfile({
      now,
      todayStart,
      todayReadings: [],
      lastKnown: reading("2023-01-02T11:00:00Z", 999), // in the future relative to `now`
      forecast: forecastWith([]),
    });

    for (const h of hours) {
      expect(h).toMatchObject({ value: null, source: null });
    }
  });
});
