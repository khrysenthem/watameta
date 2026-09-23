import { describe, expect, it } from "vitest";
import { parseDateParam, parsePageParam } from "./params";

describe("parseDateParam", () => {
  it("returns undefined when no value is given", () => {
    expect(parseDateParam(null)).toBeUndefined();
  });

  it("parses a valid ISO date string", () => {
    const result = parseDateParam("2023-01-01T00:00:00Z");
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe("2023-01-01T00:00:00.000Z");
  });

  it("returns null for an invalid date string", () => {
    expect(parseDateParam("not-a-date")).toBeNull();
  });
});

describe("parsePageParam", () => {
  it("defaults to 1 when no value is given", () => {
    expect(parsePageParam(null)).toBe(1);
  });

  it("parses a positive integer string", () => {
    expect(parsePageParam("3")).toBe(3);
  });

  it("rejects zero", () => {
    expect(parsePageParam("0")).toBeNull();
  });

  it("rejects negative numbers", () => {
    expect(parsePageParam("-1")).toBeNull();
  });

  it("rejects non-numeric strings", () => {
    expect(parsePageParam("abc")).toBeNull();
  });

  it("rejects decimal numbers", () => {
    expect(parsePageParam("1.5")).toBeNull();
  });
});
