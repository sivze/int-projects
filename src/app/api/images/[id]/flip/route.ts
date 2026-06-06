import { NextResponse } from "next/server";
import { ApiError, errorResponse } from "@/lib/api/errors";
import { getImageById, setImageFailed, setImageProcessed, setImageProcessing } from "@/lib/images/repository";
import {
  downloadImageObject,
  getImageObjectPaths,
  getSupabaseAdminClient,
  uploadImageObject
} from "@/lib/images/storage";
import { flipImage } from "@/lib/images/transform";
import type { FlipDirection } from "@/lib/images/types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseDirection(value: unknown): FlipDirection {
  if (value === "horizontal" || value === "vertical") {
    return value;
  }

  throw new ApiError(400, "Flip direction must be horizontal or vertical.");
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const supabase = getSupabaseAdminClient();
    const body = (await request.json().catch(() => ({}))) as { direction?: unknown };
    const direction = parseDirection(body.direction ?? "horizontal");
    const image = await getImageById(id, supabase);

    if (!image.processedPath || image.processedStage !== "background_removed") {
      throw new ApiError(409, "Remove the background before flipping the image.");
    }

    const paths = getImageObjectPaths(id, "png");
    const outputPath =
      direction === "horizontal" ? paths.horizontalFlippedPath : paths.verticalFlippedPath;

    await setImageProcessing(id, supabase);
    const source = await downloadImageObject(image.processedPath, supabase);
    const flipped = await flipImage(source, direction);
    const processedUrl = await uploadImageObject({
      path: outputPath,
      body: flipped,
      contentType: "image/png",
      supabase
    });
    const updated = await setImageProcessed(
      id,
      {
        processedPath: outputPath,
        processedUrl,
        processedStage: "flipped"
      },
      supabase
    );

    return NextResponse.json({ image: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image flip failed.";
    await setImageFailed(id, message).catch(() => undefined);
    return errorResponse(error);
  }
}
