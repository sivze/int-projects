import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/errors";
import {
  getImageById,
  setImageFailed,
  setImageProcessed,
  setImageProcessing
} from "@/lib/images/repository";
import { removeBackground } from "@/lib/images/replicate";
import { getImageObjectPaths, getSupabaseAdminClient, uploadImageObject } from "@/lib/images/storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const supabase = getSupabaseAdminClient();
    const image = await getImageById(id, supabase);
    const paths = getImageObjectPaths(id, "png");

    await setImageProcessing(id, supabase);
    const output = await removeBackground(image.originalUrl);
    const processedUrl = await uploadImageObject({
      path: paths.backgroundRemovedPath,
      body: output,
      contentType: "image/png",
      supabase
    });
    const updated = await setImageProcessed(
      id,
      {
        processedPath: paths.backgroundRemovedPath,
        processedUrl,
        processedStage: "background_removed"
      },
      supabase
    );

    return NextResponse.json({ image: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Background removal failed.";
    await setImageFailed(id, message).catch(() => undefined);
    return errorResponse(error);
  }
}
