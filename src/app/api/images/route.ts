import { NextResponse } from "next/server";
import { ApiError, errorResponse } from "@/lib/api/errors";
import { createImageRecord, listImages } from "@/lib/images/repository";
import { getImageObjectPaths, getSupabaseAdminClient, uploadImageObject } from "@/lib/images/storage";
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

    const id = crypto.randomUUID();
    const paths = getImageObjectPaths(id, validation.extension);
    const buffer = Buffer.from(await file.arrayBuffer());
    const originalUrl = await uploadImageObject({
      path: paths.originalPath,
      body: buffer,
      contentType: file.type,
      supabase
    });

    const image = await createImageRecord(
      {
        id,
        originalPath: paths.originalPath,
        originalUrl,
        originalFileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size
      },
      supabase
    );

    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
