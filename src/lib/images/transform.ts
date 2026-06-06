import sharp from "sharp";
import type { FlipDirection } from "./types";

export async function flipImage(input: Buffer, direction: FlipDirection): Promise<Buffer> {
  const pipeline = sharp(input, {
    failOn: "warning"
  });

  const flipped = direction === "horizontal" ? pipeline.flop() : pipeline.flip();

  return flipped.png().toBuffer();
}
