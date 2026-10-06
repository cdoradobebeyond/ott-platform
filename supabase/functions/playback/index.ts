import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { env, json, preflight } from '../_shared/http.ts';
Deno.serve(async (req) => {
  const options = preflight(req); if (options) return options;
  try {
    const url = env('SUPABASE_URL');
    const caller = createClient(url, env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: { user }, error } = await caller.auth.getUser();
    if (error || !user) return json({ error: 'unauthorized' }, 401);
    const { videoId, deviceId } = await req.json();
    if (typeof videoId !== 'string' || typeof deviceId !== 'string' || deviceId.length < 8 || deviceId.length > 120) return json({ error: 'invalid_payload' }, 400);
    const claims = user.app_metadata ?? {};
    const rawCustomerType = claims.customerType;
    const customerType = rawCustomerType === 'hostelería' ? 'hosteleria' : rawCustomerType;
    const deviceLimit = Number(claims.deviceLimit);
    if (!['particular', 'hosteleria'].includes(customerType) || !Number.isInteger(deviceLimit) || deviceLimit < 1 || deviceLimit > 100) return json({ error: 'invalid_subscription_claims' }, 403);
    const admin = createClient(url, env('SUPABASE_SERVICE_ROLE_KEY'));
    const { data: content } = await admin.from('content').select('id,status').eq('vdocipher_id', videoId).maybeSingle();
    if (!content || content.status !== 'published') return json({ error: 'content_unavailable' }, 404);
    const { data: allowed, error: claimError } = await admin.rpc('claim_playback_device', { p_user_id: user.id, p_device_id: deviceId, p_customer_type: customerType, p_device_limit: deviceLimit });
    if (claimError) throw claimError;
    if (!allowed) return json({ error: 'device_limit_reached', deviceLimit }, 409);
    const vdo = await fetch(`https://dev.vdocipher.com/api/videos/${encodeURIComponent(videoId)}/otp`, { method: 'POST', headers: { Authorization: `Apisecret ${env('VODOCIPHER_API_SECRET')}`, Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl: 300 }) });
    const playback = await vdo.json();
    if (!vdo.ok) return json({ error: 'vdocipher_playback_failed' }, 502);
    return json({ ...playback, deviceLimit, customerType });
  } catch (error) { console.error(error); return json({ error: 'internal_error' }, 500); }
});
