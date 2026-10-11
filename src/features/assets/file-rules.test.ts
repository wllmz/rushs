import { describe, expect, it } from "vitest";
import { acceptAttribute, buildStoragePath, formatFileSize, MAX_FILE_SIZE, validateRushFile } from "./file-rules";

describe("acceptAttribute", () => {
  it("lists every accepted type, or only those of one kind", () => {
    expect(acceptAttribute().split(",")).toHaveLength(6);
    expect(acceptAttribute("image")).toBe("image/jpeg,image/png,image/webp");
  });
});

describe("validateRushFile", () => {
  it("accepts a video or an image within the size limit", () => {
    expect(validateRushFile({ type: "video/mp4", size: 10_000_000 })).toBeNull();
    expect(validateRushFile({ type: "image/png", size: MAX_FILE_SIZE })).toBeNull();
  });

  it("rejects other types", () => {
    expect(validateRushFile({ type: "application/pdf", size: 1000 })).toMatch("Format non pris en charge");
    expect(validateRushFile({ type: "", size: 1000 })).toMatch("Format non pris en charge");
  });

  it("keeps a new version to the kind of its asset", () => {
    expect(validateRushFile({ type: "video/webm", size: 1000 }, "video")).toBeNull();
    expect(validateRushFile({ type: "image/png", size: 1000 }, "video")).toMatch("doit en être une aussi");
  });

  it("rejects an empty or oversized file", () => {
    expect(validateRushFile({ type: "video/mp4", size: 0 })).toBe("Le fichier est vide.");
    expect(validateRushFile({ type: "video/mp4", size: MAX_FILE_SIZE + 1 })).toBe(
      "Fichier trop lourd : 50 Mo maximum.",
    );
  });
});

describe("buildStoragePath", () => {
  it("files the upload under its project and asset, with the extension of its type", () => {
    expect(buildStoragePath("p1", "a1", "f1", "video/quicktime")).toBe("p1/a1/f1.mov");
  });
});

describe("formatFileSize", () => {
  it("shows kilobytes under a megabyte, megabytes above", () => {
    expect(formatFileSize(512)).toBe("1 Ko");
    expect(formatFileSize(300 * 1024)).toBe("300 Ko");
    expect(formatFileSize(12.5 * 1024 * 1024)).toBe("12,5 Mo");
  });
});
