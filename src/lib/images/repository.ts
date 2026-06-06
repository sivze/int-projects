import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";
import { getSupabaseAdminClient } from "./storage";
import {
  mapImageRecord,
  type ImageStatus,
  type ProcessedStage,
  type UplaneImage,
  type UplaneImageRecord
} from "./types";

const TABLE_NAME = "uplane_images";

export async function listImages(
  supabase: SupabaseClient = getSupabaseAdminClient()
): Promise<UplaneImage[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Image list failed: ${error.message}`);
  }

  return ((data ?? []) as UplaneImageRecord[]).map(mapImageRecord);
}

export async function getImageById(
  id: string,
  supabase: SupabaseClient = getSupabaseAdminClient()
): Promise<UplaneImage> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Image lookup failed: ${error.message}`);
  }

  if (!data) {
    throw new ApiError(404, "Image not found.");
  }

  return mapImageRecord(data as UplaneImageRecord);
}

export async function createImageRecord(
  record: {
    id: string;
    originalPath: string;
    originalUrl: string;
    originalFileName: string;
    mimeType: string;
    sizeBytes: number;
  },
  supabase: SupabaseClient = getSupabaseAdminClient()
): Promise<UplaneImage> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      id: record.id,
      original_path: record.originalPath,
      original_url: record.originalUrl,
      processed_stage: "none",
      status: "uploaded",
      original_file_name: record.originalFileName,
      mime_type: record.mimeType,
      size_bytes: record.sizeBytes
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Image record create failed: ${error.message}`);
  }

  return mapImageRecord(data as UplaneImageRecord);
}

export async function setImageProcessing(
  id: string,
  supabase: SupabaseClient = getSupabaseAdminClient()
): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({
      status: "processing",
      error: null
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Image status update failed: ${error.message}`);
  }
}

export async function setImageProcessed(
  id: string,
  update: {
    processedPath: string;
    processedUrl: string;
    processedStage: ProcessedStage;
  },
  supabase: SupabaseClient = getSupabaseAdminClient()
): Promise<UplaneImage> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({
      processed_path: update.processedPath,
      processed_url: update.processedUrl,
      processed_stage: update.processedStage,
      status: "complete",
      error: null
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Image processed update failed: ${error.message}`);
  }

  return mapImageRecord(data as UplaneImageRecord);
}

export async function setImageFailed(
  id: string,
  message: string,
  supabase: SupabaseClient = getSupabaseAdminClient()
): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({
      status: "failed" satisfies ImageStatus,
      error: message
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Image failure update failed: ${error.message}`);
  }
}

export async function markImageDeleted(
  id: string,
  supabase: SupabaseClient = getSupabaseAdminClient()
): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({
      status: "deleted" satisfies ImageStatus,
      deleted_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Image delete update failed: ${error.message}`);
  }
}
