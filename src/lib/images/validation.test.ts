import { describe, expect, it } from "vitest";
import { validateImageUpload } from "./validation";

describe("validateImageUpload", () => {
  it("accepts supported image files within the size limit", () => {
    const result = validateImageUpload({
      name: "sample.png",
      type: "image/png",
      size: 1024
    });

    expect(result).toEqual({
      ok: true,
      extension: "png"
    });
  });

  it("rejects unsupported image formats", () => {
    const result = validateImageUpload({
      name: "sample.heic",
      type: "image/heic",
      size: 1024
    });

    expect(result).toEqual({
      ok: false,
      message: "Upload a PNG, JPEG, or WebP image."
    });
  });

  it("rejects files over 8 MB", () => {
    const result = validateImageUpload({
      name: "large.jpg",
      type: "image/jpeg",
      size: 8 * 1024 * 1024 + 1
    });

    expect(result).toEqual({
      ok: false,
      message: "Upload an image smaller than 8 MB."
    });
  });
});
