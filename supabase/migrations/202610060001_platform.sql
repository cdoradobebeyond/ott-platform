create extension if not exists pgcrypto;

create table if not exists public.content (
  id uuid primary key default gen_random_uuid(),
  vdocipher_id text not null unique,
  title text not null,
  synopsis text not null default '',
  genre text not null default '',
  poster_url text,
  hero_url text,
  duration_seconds integer,
  status text not null default 'processing' check (status in ('processing','published','draft','failed')),
  visibility text[] not null default array['web','lg_webos','samsung_tizen','ios','tvos','androidtv','android'],
  sort_order integer not null default 0,
  published_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.collection_items (
  collection_id uuid not null references public.collections(id) on delete cascade,
  content_id uuid not null references public.content(id) on delete cascade,
  sort_order integer not null default 0,
  primary key(collection_id, content_id)
);

create table if not exists public.playback_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  customer_type text not null check (customer_type in ('particular','hosteleria')),
  last_seen_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  unique(user_id, device_id)
);
create index if not exists playback_sessions_user_seen on public.playback_sessions(user_id, last_seen_at desc);

alter table public.content enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.playback_sessions enable row level security;

create policy "published content is readable" on public.content for select using (status = 'published' or (auth.uid() is not null and auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'));
create policy "admins manage content" on public.content for all using (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') with check (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
create policy "published collections readable" on public.collections for select using (is_published or (auth.uid() is not null and auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'));
create policy "admins manage collections" on public.collections for all using (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') with check (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
create policy "published collection items readable" on public.collection_items for select using (exists(select 1 from public.collections c where c.id=collection_id and c.is_published) or auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
create policy "admins manage collection items" on public.collection_items for all using (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') with check (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
create policy "users read own playback sessions" on public.playback_sessions for select using (auth.uid() = user_id);

-- Called only by the trusted playback Edge Function using the service role.
create or replace function public.claim_playback_device(p_user_id uuid, p_device_id text, p_customer_type text, p_device_limit integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare active_count integer;
begin
  if p_device_limit < 1 or p_device_limit > 100 then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  delete from public.playback_sessions where user_id = p_user_id and last_seen_at < now() - interval '90 seconds';
  if exists(select 1 from public.playback_sessions where user_id=p_user_id and device_id=p_device_id) then
    update public.playback_sessions set last_seen_at=now(), customer_type=p_customer_type where user_id=p_user_id and device_id=p_device_id;
    return true;
  end if;
  select count(*) into active_count from public.playback_sessions where user_id=p_user_id;
  if active_count >= p_device_limit then return false; end if;
  insert into public.playback_sessions(user_id, device_id, customer_type) values(p_user_id,p_device_id,p_customer_type);
  return true;
end $$;
revoke all on function public.claim_playback_device(uuid,text,text,integer) from public, anon, authenticated;
grant execute on function public.claim_playback_device(uuid,text,text,integer) to service_role;

create or replace function public.release_playback_device(p_user_id uuid, p_device_id text)
returns void language sql security definer set search_path = public as $$
  delete from public.playback_sessions where user_id=p_user_id and device_id=p_device_id;
$$;
revoke all on function public.release_playback_device(uuid,text) from public, anon, authenticated;
grant execute on function public.release_playback_device(uuid,text) to service_role;

create or replace function public.touch_playback_device(p_user_id uuid, p_device_id text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.playback_sessions set last_seen_at=now()
   where user_id=p_user_id and device_id=p_device_id;
  return found;
end $$;
revoke all on function public.touch_playback_device(uuid,text) from public, anon, authenticated;
grant execute on function public.touch_playback_device(uuid,text) to service_role;
