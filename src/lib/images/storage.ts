import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { IMAGE_BUCKET, type ImageExtension } from "./types";

export type ImageObjectPaths = {
  prefix: string;
  originalPath: string;
  backgroundRemovedPath: string;
  horizontalFlippedPath: string;
  verticalFlippedPath: string;
};

export function getImageObjectPaths(id: string, extension: ImageExtension): ImageObjectPaths {
  const prefix = `uplane/${id}`;

  return {
    prefix,
    originalPath: `${prefix}/original.${extension}`,
    backgroundRemovedPath: `${prefix}/processed-bg.png`,
    horizontalFlippedPath: `${prefix}/processed-flipped-horizontal.png`,
    verticalFlippedPath: `${prefix}/processed-flipped-vertical.png`
  };
}

export function getSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server environment variables are not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });
}

export function getPublicUrl(path: string, supabase = getSupabaseAdminClient()): string {
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadImageObject({
  path,
  body,
  contentType,
  supabase = getSupabaseAdminClient()
}: {
  path: string;
  body: Buffer;
  contentType: string;
  supabase?: SupabaseClient;
}): Promise<string> {
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, body, {
    contentType,
    upsert: true
  });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return getPublicUrl(path, supabase);
}

export async function downloadImageObject(
  path: string,
  supabase = getSupabaseAdminClient()
): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).download(path);

  if (error) {
    throw new Error(`Storage download failed: ${error.message}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function deleteImagePrefix(
  prefix: string,
  supabase = getSupabaseAdminClient()
): Promise<void> {
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).list(prefix);

  if (error) {
    throw new Error(`Storage list failed: ${error.message}`);
  }

  const paths = (data ?? []).map((item) => `${prefix}/${item.name}`);

  if (paths.length === 0) {
    return;
  }

  const { error: removeError } = await supabase.storage.from(IMAGE_BUCKET).remove(paths);

  if (removeError) {
    throw new Error(`Storage delete failed: ${removeError.message}`);
  }
}
