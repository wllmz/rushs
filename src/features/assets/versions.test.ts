import { describe, expect, it } from "vitest";
import { pickVersion } from "./versions";

const versions = [{ number: 1 }, { number: 3 }, { number: 2 }];

describe("pickVersion", () => {
  it("shows the requested version", () => {
    expect(pickVersion(versions, "2")).toEqual({ number: 2 });
  });

  it("falls back on the latest when nothing, garbage or an unknown number is asked", () => {
    expect(pickVersion(versions, undefined)).toEqual({ number: 3 });
    expect(pickVersion(versions, ["1", "2"])).toEqual({ number: 3 });
    expect(pickVersion(versions, "02")).toEqual({ number: 3 });
    expect(pickVersion(versions, "1.5")).toEqual({ number: 3 });
    expect(pickVersion(versions, "9")).toEqual({ number: 3 });
  });

  it("returns nothing for an asset without versions", () => {
    expect(pickVersion([], "1")).toBeUndefined();
  });
});
