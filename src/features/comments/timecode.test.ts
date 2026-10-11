import { describe, expect, it } from "vitest";
import { formatTimecode } from "./timecode";

describe("formatTimecode", () => {
  it("shows minutes and seconds, floored", () => {
    expect(formatTimecode(0)).toBe("00:00");
    expect(formatTimecode(75.9)).toBe("01:15");
  });

  it("adds the hours past one hour", () => {
    expect(formatTimecode(3725)).toBe("1:02:05");
  });
});
