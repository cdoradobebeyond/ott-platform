import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: 'pkce' },
});

export async function fetchPublished(platform: string) {
  const { data, error } = await supabase.from('content').select('*').eq('status', 'published')
    .contains('visibility', [platform]).order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function getPlayback(videoId: string, deviceId: string) {
  const { data, error } = await supabase.functions.invoke('playback', { body: { videoId, deviceId } });
  if (error) throw error;
  return data as { otp: string; playbackInfo: string; deviceLimit: number; customerType: string };
}

export async function releasePlayback(deviceId: string) {
  await supabase.functions.invoke('release-playback', { body: { deviceId } });
}

export async function heartbeatPlayback(deviceId: string) {
  const { error } = await supabase.functions.invoke('heartbeat-playback', { body: { deviceId } });
  if (error) throw error;
}
