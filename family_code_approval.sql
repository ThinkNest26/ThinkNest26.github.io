-- Think Nest: a family code now SENDS A REQUEST that the child must approve
-- (before, the code linked the parent straight away, with no approval).
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.

create or replace function public.request_child_by_code(code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare kid_email text;
begin
  select u.email into kid_email
    from profiles p join auth.users u on u.id = p.id
   where p.role = 'student'
     and upper(p.family_code) = upper(trim(request_child_by_code.code))
   limit 1;
  if kid_email is null then raise exception 'NO_SUCH_CODE'; end if;
  -- use the same approval request as "Add with email"
  return public.request_child(kid_email)::text;
end $$;

grant execute on function public.request_child_by_code(text) to authenticated;

-- Close the old shortcut, so nobody can link with a code without approval
do $$
declare f regprocedure;
begin
  for f in select oid::regprocedure from pg_proc
           where proname = 'link_child' and pronamespace = 'public'::regnamespace loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
end $$;
