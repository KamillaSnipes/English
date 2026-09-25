-- English live lessons — выполнить в Supabase: SQL Editor → New query → Run

create extension if not exists pgcrypto;

create table if not exists public.live_sessions (
  room_code text primary key,
  teacher_secret uuid not null default gen_random_uuid(),
  draft text not null default '',
  lesson_json jsonb,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.archived_lessons (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null,
  title text not null,
  subtitle text not null default '',
  lesson_json jsonb not null,
  sort_order bigint generated always as identity,
  created_at timestamptz not null default now()
);

create index if not exists archived_lessons_sort on public.archived_lessons (sort_order);

alter table public.live_sessions enable row level security;
alter table public.archived_lessons enable row level security;

-- Комната: создать и читать по коду (ученик знает только room_code)
create policy "live_sessions_select" on public.live_sessions
  for select to anon using (true);

create policy "live_sessions_insert" on public.live_sessions
  for insert to anon with check (true);

-- Прямое обновление закрыто — только через RPC с teacher_secret
create policy "live_sessions_no_update" on public.live_sessions
  for update to anon using (false);

create policy "archived_select" on public.archived_lessons
  for select to anon using (true);

create or replace function public.update_live_session(
  p_room_code text,
  p_teacher_secret uuid,
  p_draft text,
  p_lesson_json jsonb,
  p_title text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.live_sessions
  set
    draft = p_draft,
    lesson_json = p_lesson_json,
    title = coalesce(nullif(p_title, ''), title),
    updated_at = now()
  where room_code = p_room_code
    and teacher_secret = p_teacher_secret;

  if not found then
    raise exception 'wrong room or teacher secret';
  end if;
end;
$$;

create or replace function public.archive_live_session(
  p_room_code text,
  p_teacher_secret uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
  v_title text;
  v_sub text;
  v_id text;
  new_id uuid;
begin
  select lesson_json, title into v, v_title
  from public.live_sessions
  where room_code = p_room_code and teacher_secret = p_teacher_secret;

  if v is null then
    raise exception 'wrong room or teacher secret';
  end if;

  v_id := coalesce(v->>'id', 'arch-' || p_room_code);
  v_sub := coalesce(v->>'sub', '');

  insert into public.archived_lessons (lesson_id, title, subtitle, lesson_json)
  values (
    v_id,
    coalesce(nullif(v_title, ''), v->>'ttl', 'Урок'),
    v_sub,
    v
  )
  returning id into new_id;

  delete from public.live_sessions where room_code = p_room_code;
  return new_id;
end;
$$;

grant execute on function public.update_live_session(text, uuid, text, jsonb, text) to anon;
grant execute on function public.archive_live_session(text, uuid) to anon;

-- Realtime (если ошибка «already member» — включите live_sessions в Database → Replication)
do $$
begin
  alter publication supabase_realtime add table public.live_sessions;
exception
  when duplicate_object then null;
end $$;

alter table public.live_sessions replica identity full;
