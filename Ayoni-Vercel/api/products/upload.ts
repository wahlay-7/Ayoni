import { adminDb, errorResponse, json, requireAdmin } from '../../lib/supabase';
export async function POST(request: Request) {
  try { await requireAdmin(request); const body = await request.json(); const content = String(body.content || ''); const contentType = String(body.contentType || 'image/jpeg'); const name = String(body.name || `product-${Date.now()}.jpg`).replace(/[^a-zA-Z0-9._-]/g, '-');
    if (!content || !contentType.startsWith('image/')) return errorResponse('Valid image content is required.'); const raw = content.includes(',') ? content.split(',')[1] : content; const bytes = Buffer.from(raw, 'base64');
    if (bytes.byteLength > 5 * 1024 * 1024) return errorResponse('Image must be 5MB or smaller.'); const path = `${Date.now()}-${name}`;
    const { error } = await adminDb.storage.from('product-images').upload(path, bytes, { contentType, upsert: false }); if (error) return errorResponse(error.message, 500);
    const { data } = adminDb.storage.from('product-images').getPublicUrl(path); return json({ url: data.publicUrl });
  } catch (e) { return errorResponse(e instanceof Error ? e.message : 'Unauthorized', 401); }
}
