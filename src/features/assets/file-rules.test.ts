import { describe, expect, it } from "vitest";
import {
  ACCEPT_ATTRIBUTE,
  buildStoragePath,
  formatFileSize,
  MAX_FILE_SIZE,
  resolveRushType,
  validateRushFile,
} from "./file-rules";

describe("ACCEPT_ATTRIBUTE", () => {
  it("lists extensions as well as types, so the file picker never hides a rush", () => {
    expect(ACCEPT_ATTRIBUTE.split(",")).toEqual(expect.arrayContaining(["video/mp4", ".mp4", ".mov", ".jpeg"]));
  });
});

describe("resolveRushType", () => {
  it("keeps an accepted type given by the browser", () => {
    expect(resolveRushType({ name: "clip.bin", type: "video/webm" })).toBe("video/webm");
  });

  it("falls back on the extension when the browser gave no accepted type", () => {
    expect(resolveRushType({ name: "Interview.MP4", type: "" })).toBe("video/mp4");
    expect(resolveRushType({ name: "plan.mov", type: "application/octet-stream" })).toBe("video/quicktime");
  });

  it("leaves an unknown file unaccepted", () => {
    expect(resolveRushType({ name: "notes.pdf", type: "application/pdf" })).toBe("application/pdf");
    expect(resolveRushType({ name: "constructor", type: "" })).toBe("");
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
