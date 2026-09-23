import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("skips the header row and parses time/value pairs", () => {
    const raw = "Time,Value\n2022-12-12 00:00,300100\n2022-12-12 01:00,300102";

    expect(parseCsv(raw)).toEqual([
      { recordedAt: "2022-12-12 00:00:00Z", value: 300100 },
      { recordedAt: "2022-12-12 01:00:00Z", value: 300102 },
    ]);
  });

  it("handles a trailing newline and a final line with no newline", () => {
    const raw = "Time,Value\n2022-12-12 00:00,300100\n";

    expect(parseCsv(raw)).toEqual([{ recordedAt: "2022-12-12 00:00:00Z", value: 300100 }]);
  });

  it("returns an empty array when there are no data rows", () => {
    expect(parseCsv("Time,Value")).toEqual([]);
  });
});
