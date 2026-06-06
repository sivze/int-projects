import { describe, expect, it } from "vitest";
import { getImageObjectPaths } from "./storage";

describe("getImageObjectPaths", () => {
  it("generates stable object paths under the image prefix", () => {
    expect(getImageObjectPaths("abc-123", "jpeg")).toEqual({
      prefix: "uplane/abc-123",
      originalPath: "uplane/abc-123/original.jpeg",
      backgroundRemovedPath: "uplane/abc-123/processed-bg.png",
      horizontalFlippedPath: "uplane/abc-123/processed-flipped-horizontal.png",
      verticalFlippedPath: "uplane/abc-123/processed-flipped-vertical.png"
    });
  });
});
