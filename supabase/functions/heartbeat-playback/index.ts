import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { env, json, preflight } from '../_shared/http.ts';
Deno.serve(async (req) => {
  const options = preflight(req); if (options) return options;
  try {
    const url = env('SUPABASE_URL');
    const caller = createClient(url, env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: { user }, error } = await caller.auth.getUser();
    if (error || !user) return json({ error: 'unauthorized' }, 401);
    const { deviceId } = await req.json();
    if (typeof deviceId !== 'string') return json({ error: 'invalid_payload' }, 400);
    const admin = createClient(url, env('SUPABASE_SERVICE_ROLE_KEY'));
    const { data: active, error: touchError } = await admin.rpc('touch_playback_device', { p_user_id: user.id, p_device_id: deviceId });
    if (touchError) throw touchError;
    return active ? json({ ok: true }) : json({ error: 'playback_session_expired' }, 409);
  } catch (error) { console.error(error); return json({ error: 'internal_error' }, 500); }
});
