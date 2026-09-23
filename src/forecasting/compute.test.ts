import { describe, expect, it } from "vitest";
import { computeWeeklyForecast } from "./compute";

function reading(iso: string, value: number) {
  return { recordedAt: new Date(iso), value };
}

describe("computeWeeklyForecast", () => {
  it("returns a 7x24 grid of nulls for no readings", () => {
    const forecast = computeWeeklyForecast([]);

    expect(forecast).toHaveLength(7);
    for (const day of forecast) {
      expect(day.hours).toHaveLength(24);
      for (const hour of day.hours) {
        expect(hour.average).toBeNull();
        expect(hour.sampleCount).toBe(0);
      }
    }
  });

  it("produces no deltas from a single reading", () => {
    const forecast = computeWeeklyForecast([reading("2023-01-02T10:00:00Z", 100)]);
    const monday = forecast[1]; // 2023-01-02 is a Monday
    expect(monday.hours[10].average).toBeNull();
  });

  it("computes a single hour-over-hour delta on the correct day/hour bucket", () => {
    // 2023-01-02 is a Monday (dayOfWeek 1)
    const forecast = computeWeeklyForecast([
      reading("2023-01-02T09:00:00Z", 100),
      reading("2023-01-02T10:00:00Z", 105),
    ]);

    expect(forecast[1].hours[10]).toMatchObject({ average: 5, sampleCount: 1 });
    expect(forecast[1].hours[9].average).toBeNull();
  });

  it("averages consumption across matching weeks", () => {
    // Three consecutive Mondays at 10:00, consumption 4, 6, 8 -> average 6
    const forecast = computeWeeklyForecast([
      reading("2023-01-02T09:00:00Z", 100),
      reading("2023-01-02T10:00:00Z", 104),
      reading("2023-01-09T09:00:00Z", 200),
      reading("2023-01-09T10:00:00Z", 206),
      reading("2023-01-16T09:00:00Z", 300),
      reading("2023-01-16T10:00:00Z", 308),
    ]);

    expect(forecast[1].hours[10]).toMatchObject({ average: 6, sampleCount: 3 });
  });

  it("keeps different days of the week in separate buckets", () => {
    const forecast = computeWeeklyForecast([
      reading("2023-01-02T09:00:00Z", 100), // Monday
      reading("2023-01-02T10:00:00Z", 105), // +5
      reading("2023-01-07T09:00:00Z", 200), // Saturday
      reading("2023-01-07T10:00:00Z", 220), // +20
    ]);

    expect(forecast[1].hours[10]).toMatchObject({ average: 5, sampleCount: 1 });
    expect(forecast[6].hours[10]).toMatchObject({ average: 20, sampleCount: 1 });
  });

  it("skips a pair when the gap is not exactly one hour", () => {
    const forecast = computeWeeklyForecast([
      reading("2023-01-02T09:00:00Z", 100),
      reading("2023-01-02T11:00:00Z", 110), // 2 hour gap
    ]);

    for (const day of forecast) {
      for (const hour of day.hours) {
        expect(hour.sampleCount).toBe(0);
      }
    }
  });

  it("skips a pair when the value decreases (meter reset/data error)", () => {
    const forecast = computeWeeklyForecast([
      reading("2023-01-02T09:00:00Z", 100),
      reading("2023-01-02T10:00:00Z", 90),
    ]);

    expect(forecast[1].hours[10]).toMatchObject({ average: null, sampleCount: 0 });
  });

  it("treats a zero delta as a valid (zero-consumption) sample", () => {
    const forecast = computeWeeklyForecast([
      reading("2023-01-02T09:00:00Z", 100),
      reading("2023-01-02T10:00:00Z", 100),
    ]);

    expect(forecast[1].hours[10]).toMatchObject({ average: 0, sampleCount: 1 });
  });

  it("does not depend on input order", () => {
    const inOrder = computeWeeklyForecast([
      reading("2023-01-02T09:00:00Z", 100),
      reading("2023-01-02T10:00:00Z", 105),
    ]);
    const reversed = computeWeeklyForecast([
      reading("2023-01-02T10:00:00Z", 105),
      reading("2023-01-02T09:00:00Z", 100),
    ]);

    expect(reversed).toEqual(inOrder);
  });
});
