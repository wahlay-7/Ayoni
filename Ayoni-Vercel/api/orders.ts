import crypto from 'node:crypto';
import { adminDb, errorResponse, getUser, json, requireAdmin } from '../lib/supabase';

async function paystackInitialize(orderId: string, email: string, amountNaira: number, origin: string) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return null;
  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, amount: Math.round(amountNaira * 100), callback_url: `${origin}/?payment=success&order=${orderId}`, metadata: { orderId } }),
  });
  const result = await response.json();
  if (!response.ok || !result.status) throw new Error(result.message || 'Paystack initialization failed');
  return result.data?.authorization_url || null;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { data, error } = await adminDb.from('orders').select('*').order('created_at', { ascending: false });
    if (error) return errorResponse(error.message, 500);
    return json({ orders: data || [] });
  } catch (e) { return errorResponse(e instanceof Error ? e.message : 'Admin access required', 401); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const customer = body.customer || {}; const items = Array.isArray(body.items) ? body.items : [];
    const total = Number(body.total || 0); const user = await getUser(request);
    if (!customer.name || !customer.phone || !customer.email || !customer.address || !items.length || total <= 0) return errorResponse('Complete customer and order details are required.');
    const { data: order, error } = await adminDb.from('orders').insert({ user_id: user?.id ?? null, customer, items, total, status: 'pending', payment_status: 'unpaid' }).select('*').single();
    if (error) return errorResponse(error.message, 500);
    const paymentUrl = await paystackInitialize(order.id, String(customer.email), total, new URL(request.url).origin);
    if (paymentUrl) await adminDb.from('orders').update({ payment_url: paymentUrl }).eq('id', order.id);
    return json({ orderId: order.id, paymentUrl, whatsappNumber: process.env.AYONI_WHATSAPP_NUMBER || '' }, 201);
  } catch (e) { return errorResponse(e instanceof Error ? e.message : 'Could not create order', 500); }
}
