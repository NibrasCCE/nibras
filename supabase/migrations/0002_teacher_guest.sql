-- =====================================================================
-- Nibras · guest teacher (run once, after 0001_nibras.sql)
-- Adds a third role, "teacher". A guest teacher enters without an account
-- (Supabase anonymous sign-in) and can only try the AI chat.
-- Also needs: Authentication → Sign In / Providers → «Allow anonymous sign-ins» ON.
-- Safe to run more than once.
-- =====================================================================

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('student','parent','teacher'));

-- same function as in 0001, with "teacher" accepted as a role.
-- A teacher gets a profile row only: no progress, no link code, no contact details.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text := coalesce(m->>'role', 'student');
  k text := coalesce(m->>'ident_kind', 'email');
begin
  if r not in ('student','parent','teacher') then r := 'student'; end if;
  insert into public.profiles (id, role, nick, avatar, name, ident, ident_kind, code, prefs)
  values (
    new.id, r,
    left(nullif(m->>'nick', ''), 16),
    coalesce(nullif(m->>'avatar', ''), 'cat'),
    left(nullif(m->>'name', ''), 24),
    case when r = 'parent' then m->>'ident' end, k,  -- students and teachers: no e-mail/phone copied into profiles
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
