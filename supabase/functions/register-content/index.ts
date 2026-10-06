import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { env, json, preflight } from '../_shared/http.ts';
Deno.serve(async (req) => {
  const options = preflight(req); if (options) return options;
  try {
    const url = env('SUPABASE_URL');
    const anon = createClient(url, env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: { user }, error } = await anon.auth.getUser();
    if (error || !user) return json({ error: 'unauthorized' }, 401);
    if (user.app_metadata?.role !== 'admin') return json({ error: 'forbidden' }, 403);
    const { videoId, title, metadata = {} } = await req.json();
    if (typeof videoId !== 'string' || typeof title !== 'string') return json({ error: 'invalid_payload' }, 400);
    const admin = createClient(url, env('SUPABASE_SERVICE_ROLE_KEY'));
    const { data, error: insertError } = await admin.from('content').upsert({ vdocipher_id: videoId, title: title.trim(), synopsis: metadata.synopsis ?? '', genre: metadata.genre ?? '', status: 'processing', created_by: user.id }, { onConflict: 'vdocipher_id' }).select().single();
    if (insertError) throw insertError;
    return json({ content: data });
  } catch (error) { console.error(error); return json({ error: 'internal_error' }, 500); }
});
