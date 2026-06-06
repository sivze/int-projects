import { NextResponse } from "next/server";
import { ApiError, errorResponse } from "@/lib/api/errors";
import {
  createImageRecord,
  listImages,
  setImageFailed,
  setImageProcessed,
  setImageProcessing
} from "@/lib/images/repository";
import { removeBackground } from "@/lib/images/replicate";
import { getImageObjectPaths, getSupabaseAdminClient, uploadImageObject } from "@/lib/images/storage";
import { flipImage } from "@/lib/images/transform";
import { validateImageUpload } from "@/lib/images/validation";

export const runtime = "nodejs";

export async function GET() {
  try {
    const images = await listImages();
    return NextResponse.json({ images });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  let imageId: string | null = null;

  try {
    const supabase = getSupabaseAdminClient();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new ApiError(400, "Upload one image file.");
    }

    const validation = validateImageUpload(file);

    if (!validation.ok) {
      throw new ApiError(400, validation.message);
    }

    imageId = crypto.randomUUID();
    const paths = getImageObjectPaths(imageId, validation.extension);
    const buffer = Buffer.from(await file.arrayBuffer());
    const originalUrl = await uploadImageObject({
      path: paths.originalPath,
      body: buffer,
      contentType: file.type,
      supabase
    });

    const image = await createImageRecord(
      {
        id: imageId,
        originalPath: paths.originalPath,
        originalUrl,
        originalFileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size
      },
      supabase
    );

    await setImageProcessing(image.id, supabase);

    const backgroundRemoved = await removeBackground(originalUrl);
    await uploadImageObject({
      path: paths.backgroundRemovedPath,
      body: backgroundRemoved,
      contentType: "image/png",
      supabase
    });

    const flipped = await flipImage(backgroundRemoved, "horizontal");
    const processedUrl = await uploadImageObject({
      path: paths.horizontalFlippedPath,
      body: flipped,
      contentType: "image/png",
      supabase
    });

    const processedImage = await setImageProcessed(
      image.id,
      {
        processedPath: paths.horizontalFlippedPath,
        processedUrl,
        processedStage: "flipped"
      },
      supabase
    );

    return NextResponse.json({ image: processedImage }, { status: 201 });
  } catch (error) {
    if (imageId) {
      const message = error instanceof Error ? error.message : "Image processing failed.";
      await setImageFailed(imageId, message).catch(() => undefined);
    }

    return errorResponse(error);
  }
}
