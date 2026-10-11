import { describe, expect, it } from "vitest";
import { formatDate } from "./format-date";

describe("formatDate", () => {
  it("prints the day in Paris, whatever the machine's time zone", () => {
    // 23:30 UTC on Oct 11 is already Oct 12 in Paris
    expect(formatDate("2026-10-11T23:30:00Z")).toBe("12 oct. 2026");
  });
});
