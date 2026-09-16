import { adminDb, errorResponse, json, requireAdmin } from '../lib/supabase.js';
import { seedProducts } from '../lib/products';

export async function GET() {
  const { data, error } = await adminDb.from('products').select('*').order('created_at', { ascending: false });
  if (error) return errorResponse(error.message, 500);
  if (!data?.length) {
    const { data: seeded, error: seedError } = await adminDb.from('products').insert(seedProducts).select('*');
    if (seedError) return errorResponse(seedError.message, 500);
    return json({ products: seeded || [] });
  }
  return json({ products: data });
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const product = normalizeProduct(body);
    if (!product.name || product.price < 0 || !product.image) return errorResponse('Name, valid price and image are required.');
    const { data, error } = await adminDb.from('products').insert(product).select('*').single();
    if (error) return errorResponse(error.message, 500);
    return json({ product: data }, 201);
  } catch (e) { return errorResponse(e instanceof Error ? e.message : 'Unauthorized', 401); }
}

function normalizeProduct(body:any){return {name:String(body.name||'').trim(),category:String(body.category||'Clothing'),price:Number(body.price||0),image:String(body.image||''),description:String(body.description||''),sizes:Array.isArray(body.sizes)?body.sizes:[],colors:Array.isArray(body.colors)?body.colors:[],stock:body.stock&&typeof body.stock==='object'?body.stock:{},image_urls:Array.isArray(body.imageUrls)?body.imageUrls:(Array.isArray(body.image_urls)?body.image_urls:[])}}
