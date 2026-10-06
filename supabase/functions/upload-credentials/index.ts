import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { env, json, preflight } from '../_shared/http.ts';
Deno.serve(async (req) => {
  const options = preflight(req); if (options) return options;
  try {
    const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return json({ error: 'unauthorized' }, 401);
    if (user.app_metadata?.role !== 'admin') return json({ error: 'forbidden' }, 403);
    const { title } = await req.json();
    if (typeof title !== 'string' || title.trim().length < 1 || title.length > 180) return json({ error: 'invalid_title' }, 400);
    const vdo = await fetch(`https://dev.vdocipher.com/api/videos?title=${encodeURIComponent(title.trim())}`, { method: 'PUT', headers: { Authorization: `Apisecret ${env('VODOCIPHER_API_SECRET')}`, Accept: 'application/json' } });
    const body = await vdo.json();
    if (!vdo.ok) return json({ error: 'vdocipher_upload_credentials_failed', detail: body }, 502);
    return json(body);
  } catch (error) { console.error(error); return json({ error: 'internal_error' }, 500); }
});
