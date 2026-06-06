export const IMAGE_BUCKET = "uplane-images";
export const MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024;

export const allowedImageTypes = ["image/png", "image/jpeg", "image/webp"] as const;

export type AllowedImageType = (typeof allowedImageTypes)[number];
export type ImageExtension = "png" | "jpg" | "jpeg" | "webp";

export type ProcessedStage = "none" | "background_removed" | "flipped";
export type ImageStatus = "uploaded" | "processing" | "complete" | "failed" | "deleted";
export type FlipDirection = "horizontal" | "vertical";

export type UplaneImageRecord = {
  id: string;
  original_path: string;
  processed_path: string | null;
  original_url: string;
  processed_url: string | null;
  processed_stage: ProcessedStage;
  status: ImageStatus;
  error: string | null;
  original_file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type UplaneImage = {
  id: string;
  originalPath: string;
  processedPath: string | null;
  originalUrl: string;
  processedUrl: string | null;
  processedStage: ProcessedStage;
  status: ImageStatus;
  error: string | null;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export function mapImageRecord(record: UplaneImageRecord): UplaneImage {
  return {
    id: record.id,
    originalPath: record.original_path,
    processedPath: record.processed_path,
    originalUrl: record.original_url,
    processedUrl: record.processed_url,
    processedStage: record.processed_stage,
    status: record.status,
    error: record.error,
    originalFileName: record.original_file_name,
    mimeType: record.mime_type,
    sizeBytes: record.size_bytes,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    deletedAt: record.deleted_at
  };
}
