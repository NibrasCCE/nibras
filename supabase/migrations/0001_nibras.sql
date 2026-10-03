-- =====================================================================
-- Nibras · database setup (run once in Supabase → SQL Editor → Run)
-- Tables: profiles, progress, links (parent ↔ student), ai_usage
-- Every table has Row Level Security: each user sees only their own data,
-- and a parent sees only the students linked to them.
-- =====================================================================

-- ---------- tables ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('student','parent')),
  nick        text,
  avatar      text not null default 'cat',
  name        text,
  ident       text,
  ident_kind  text,
  code        text unique,
  prefs       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists public.progress (
  student_id  uuid primary key references public.profiles(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create table if not exists public.links (
  parent_id   uuid not null references public.profiles(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (parent_id, student_id)
);
create index if not exists links_student_idx on public.links(student_id);

create table if not exists public.ai_usage (
  user_id  uuid not null references auth.users(id) on delete cascade,
  day      date not null default current_date,
  count    int  not null default 0,
  primary key (user_id, day)
);

alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.links    enable row level security;
alter table public.ai_usage enable row level security;

-- ---------- helpers ----------
create or replace function public.is_parent_of(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.links where parent_id = auth.uid() and student_id = p_student);
$$;

create or replace function public.gen_link_code()
returns text language plpgsql set search_path = public as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where code = c);
  end loop;
  return c;
end $$;

-- ---------- policies ----------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_parent_of(id));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists progress_select on public.progress;
create policy progress_select on public.progress for select to authenticated
  using (student_id = auth.uid() or public.is_parent_of(student_id));

drop policy if exists progress_update on public.progress;
create policy progress_update on public.progress for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists links_select on public.links;
create policy links_select on public.links for select to authenticated
  using (parent_id = auth.uid() or student_id = auth.uid());

drop policy if exists links_delete on public.links;
create policy links_delete on public.links for delete to authenticated
  using (parent_id = auth.uid());
-- links are created only through link_child() below; ai_usage only through bump_ai_usage().

-- users may not change their own role, link code, or id
create or replace function public.protect_profile()
returns trigger language plpgsql as $$
begin
  new.id := old.id;
  new.role := old.role;
  new.code := old.code;
  new.created_at := old.created_at;
  return new;
end $$;
drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles
  for each row execute function public.protect_profile();

-- ---------- create profile when someone signs up ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text := coalesce(m->>'role', 'student');
  k text := coalesce(m->>'ident_kind', 'email');
begin
  if r not in ('student','parent') then r := 'student'; end if;
  insert into public.profiles (id, role, nick, avatar, name, ident, ident_kind, code, prefs)
  values (
    new.id, r,
    left(nullif(m->>'nick', ''), 16),
    coalesce(nullif(m->>'avatar', ''), 'cat'),
    left(nullif(m->>'name', ''), 24),
    case when r = 'parent' then m->>'ident' end, k,  -- students: no e-mail/phone copied into profiles
    case when r = 'student' then public.gen_link_code() end,
    case when r = 'parent' then jsonb_build_object(
      'channel', case when k = 'phone' then 'sms' else 'email' end,
      'email',   case when k = 'email' then coalesce(m->>'ident', '') else '' end,
      'phone',   case when k = 'phone' then coalesce(m->>'ident', '') else '' end,
      'diag', true, 'skill', true, 'level', true)
    else '{}'::jsonb end
  );
  if r = 'student' then
    insert into public.progress (student_id, data) values (new.id, '{}'::jsonb);
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RPC: parent links a student with the 6-character code ----------
create or replace function public.link_child(p_code text)
returns json language plpgsql security definer set search_path = public as $$
declare
  me public.profiles;
  s  public.profiles;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role <> 'parent' then
    return json_build_object('ok', false, 'error', 'not_parent');
  end if;
  select * into s from public.profiles where code = upper(trim(p_code)) and role = 'student';
  if s.id is null then
    return json_build_object('ok', false, 'error', 'bad_code');
  end if;
  if exists (select 1 from public.links where parent_id = me.id and student_id = s.id) then
    return json_build_object('ok', false, 'error', 'already');
  end if;
  insert into public.links (parent_id, student_id) values (me.id, s.id);
  return json_build_object('ok', true, 'student_id', s.id, 'nick', s.nick);
end $$;

-- ---------- RPC: daily AI message counter (called by the Edge Function) ----------
create or replace function public.bump_ai_usage(p_limit int)
returns json language plpgsql security definer set search_path = public as $$
declare c int;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'count', 0);
  end if;
  insert into public.ai_usage (user_id, day, count) values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1
  returning count into c;
  return json_build_object('ok', c <= p_limit, 'count', c);
end $$;

-- ---------- RPC: delete my own account (and everything linked to it) ----------
create or replace function public.delete_me()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then return; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- ---------- permissions ----------
revoke all on function public.link_child(text)    from public, anon;
revoke all on function public.bump_ai_usage(int)  from public, anon;
revoke all on function public.delete_me()         from public, anon;
revoke all on function public.gen_link_code()     from public, anon, authenticated;
grant execute on function public.link_child(text)   to authenticated;
grant execute on function public.bump_ai_usage(int) to authenticated;
grant execute on function public.delete_me()        to authenticated;
grant execute on function public.is_parent_of(uuid) to authenticated;

grant select, update on public.profiles to authenticated;
grant select, update on public.progress to authenticated;
grant select, delete on public.links    to authenticated;
