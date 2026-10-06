import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;

export async function requestPlayback(videoId, deviceId) {
  if (!supabase) throw new Error('Configura Supabase para habilitar la reproducción.');
  const { data, error } = await supabase.functions.invoke('playback', { body: { videoId, deviceId } });
  if (error) throw error;
  return data;
}

export async function heartbeatPlayback(deviceId) {
  if (!supabase) throw new Error('Configura Supabase para habilitar la reproducción.');
  const { data, error } = await supabase.functions.invoke('heartbeat-playback', { body: { deviceId } });
  if (error) throw error;
  return data;
}

export async function releasePlayback(deviceId) {
  if (!supabase) throw new Error('Configura Supabase para habilitar la reproducción.');
  const { data, error } = await supabase.functions.invoke('release-playback', { body: { deviceId } });
  if (error) throw error;
  return data;
}

export async function beginVdocipherUpload(file, title, metadata = {}) {
  if (!supabase) throw new Error('Configura Supabase para habilitar las subidas.');
  if (!file || !file.type.startsWith('video/')) throw new Error('Selecciona un archivo de vídeo.');
  if (file.size > 5 * 1024 ** 3) throw new Error('El límite de subida directa de VdoCipher es 5 GB.');
  const { data: credentials, error } = await supabase.functions.invoke('upload-credentials', { body: { title } });
  if (error) throw error;
  const payload = credentials.clientPayload;
  const form = new FormData();
  for (const key of ['key', 'policy', 'x-amz-algorithm', 'x-amz-credential', 'x-amz-date', 'x-amz-signature']) {
    if (payload[key]) form.append(key, payload[key]);
  }
  form.append('success_action_status', '201');
  form.append('success_action_redirect', '');
  form.append('file', file);
  const response = await fetch(payload.uploadLink, { method: 'POST', body: form });
  if (!response.ok) throw new Error(`VdoCipher rechazó la subida (${response.status}).`);
  const { data: saved, error: saveError } = await supabase.functions.invoke('register-content', {
    body: { videoId: credentials.videoId, title, metadata },
  });
  if (saveError) throw saveError;
  return saved.content;
}

export async function signInWithOAuth(provider) {
  if (!supabase) throw new Error('Configura Supabase para habilitar el inicio de sesión.');
  return supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
}
