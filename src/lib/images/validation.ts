import {
  allowedImageTypes,
  MAX_UPLOAD_SIZE_BYTES,
  type AllowedImageType,
  type ImageExtension
} from "./types";

type UploadLike = {
  name: string;
  type: string;
  size: number;
};

type ValidationResult =
  | {
      ok: true;
      extension: ImageExtension;
    }
  | {
      ok: false;
      message: string;
    };

const typeToExtension: Record<AllowedImageType, ImageExtension> = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/webp": "webp"
};

export function validateImageUpload(file: UploadLike): ValidationResult {
  if (!allowedImageTypes.includes(file.type as AllowedImageType)) {
    return {
      ok: false,
      message: "Upload a PNG, JPEG, or WebP image."
    };
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return {
      ok: false,
      message: "Upload an image smaller than 8 MB."
    };
  }

  return {
    ok: true,
    extension: typeToExtension[file.type as AllowedImageType]
  };
}
