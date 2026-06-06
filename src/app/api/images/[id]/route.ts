import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/errors";
import { getImageById, markImageDeleted } from "@/lib/images/repository";
import { deleteImagePrefix, getSupabaseAdminClient } from "@/lib/images/storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const supabase = getSupabaseAdminClient();
    await getImageById(id, supabase);
    await deleteImagePrefix(`uplane/${id}`, supabase);
    await markImageDeleted(id, supabase);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
