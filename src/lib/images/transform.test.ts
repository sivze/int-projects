import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { flipImage } from "./transform";

async function pixelAt(buffer: Buffer, x: number, y: number) {
  const { data } = await sharp(buffer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const offset = (y * 2 + x) * 4;
  return Array.from(data.subarray(offset, offset + 4));
}

describe("flipImage", () => {
  it("flips an image horizontally", async () => {
    const input = await sharp({
      create: {
        width: 2,
        height: 1,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([
        {
          input: Buffer.from([255, 0, 0, 255]),
          raw: { width: 1, height: 1, channels: 4 },
          left: 0,
          top: 0
        },
        {
          input: Buffer.from([0, 0, 255, 255]),
          raw: { width: 1, height: 1, channels: 4 },
          left: 1,
          top: 0
        }
      ])
      .png()
      .toBuffer();

    const output = await flipImage(input, "horizontal");

    expect(await pixelAt(output, 0, 0)).toEqual([0, 0, 255, 255]);
    expect(await pixelAt(output, 1, 0)).toEqual([255, 0, 0, 255]);
  });
});
