import { adminDb, errorResponse, json, requireAdmin } from '../../lib/supabase';

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const name = String(body.name || `product-${Date.now()}.jpg`).replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `${Date.now()}-${name}`;

    const { data, error } = await adminDb.storage
      .from('product-images')
      .createSignedUploadUrl(path);

    if (error) return errorResponse(error.message, 500);

    const { data: publicUrlData } = adminDb.storage
      .from('product-images')
      .getPublicUrl(path);

    return json({
      path: data.path,
      token: data.token,
      publicUrl: publicUrlData.publicUrl
    });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Unauthorized', 401);
  }
}
