-- =====================================================================
-- Nibras · limit on guest teachers (run once, after 0002_teacher_guest.sql)
-- At most N guest teachers can exist at the same time. A guest's place is
-- freed when they press «خروج», or automatically H hours after they entered.
-- To change the numbers, edit the two functions below and run this file again.
-- Safe to run more than once.
-- =====================================================================

-- N: how many guest teachers at the same time
create or replace function public.guest_teacher_limit()
returns int language sql immutable as $$ select 2 $$;

-- H: hours until an unused place is freed (a guest who closed the tab without «خروج»)
create or replace function public.guest_teacher_hours()
returns int language sql immutable as $$ select 24 $$;

-- The landing page asks this before letting a guest in (returns no personal data).
create or replace function public.guest_teacher_open()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'open', count(*) < public.guest_teacher_limit(),
    'max',  public.guest_teacher_limit())
  from public.profiles
  where role = 'teacher'
    and created_at > now() - make_interval(hours => public.guest_teacher_hours());
$$;
revoke all on function public.guest_teacher_open() from public;
grant execute on function public.guest_teacher_open() to anon, authenticated;

-- Same function as in 0002, plus the limit. The check lives here, on the server,
-- so it holds even if someone skips the web page.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text := coalesce(m->>'role', 'student');
  k text := coalesce(m->>'ident_kind', 'email');
begin
  if r not in ('student','parent','teacher') then r := 'student'; end if;

  if r = 'teacher' then
    -- free the places of guests who entered more than H hours ago
    delete from auth.users u using public.profiles p
     where p.id = u.id and p.role = 'teacher' and u.id <> new.id
       and p.created_at <= now() - make_interval(hours => public.guest_teacher_hours());
    if (select count(*) from public.profiles where role = 'teacher') >= public.guest_teacher_limit() then
      raise exception 'guest_teacher_limit_reached';
    end if;
  end if;

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
