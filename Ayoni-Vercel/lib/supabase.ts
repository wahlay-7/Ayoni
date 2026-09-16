import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || '';
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const adminDb = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

export const publicDb = createClient(url, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '', {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

export async function getUser(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data } = await publicDb.auth.getUser(token);
  return data.user ?? null;
}

export async function requireUser(request: Request) {
  const user = await getUser(request);
  if (!user) throw new Error('Authentication required');
  return user;
}

export async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  const configured = (process.env.AYONI_ADMIN_EMAIL || '').trim().toLowerCase();
  if (!configured || user.email?.toLowerCase() !== configured) throw new Error('Admin access required');
  return user;
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function errorResponse(message: string, status = 400) {
  return json({ error: message }, status);
}
