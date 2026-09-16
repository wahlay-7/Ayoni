import { json } from '../lib/supabase';
const rates: Record<string, number> = { Kwara: 2500, Lagos: 5000, Abuja: 5500, Other: 7000 };
export async function GET(request: Request) {
  const state = new URL(request.url).searchParams.get('state') || 'Other';
  return json({ state, fee: rates[state] ?? rates.Other, rates });
}
