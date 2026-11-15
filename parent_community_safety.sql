-- Think Nest safety: parent-only accounts can't see, post, comment or like in the
-- student Community (space = 'community'). Parents use the Parent Café instead.
-- Teachers who are also parents keep their normal teacher access.
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.

create or replace function public.tn_is_parent_only()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'parent');
$$;

-- posts in the student community
drop policy if exists tn_no_parents_in_student_community on public.posts;
create policy tn_no_parents_in_student_community on public.posts
  as restrictive for all to authenticated
  using (space is distinct from 'community' or not public.tn_is_parent_only())
  with check (space is distinct from 'community' or not public.tn_is_parent_only());

-- comments on those posts
drop policy if exists tn_no_parents_in_student_community on public.post_comments;
create policy tn_no_parents_in_student_community on public.post_comments
  as restrictive for all to authenticated
  using (not public.tn_is_parent_only()
         or not exists (select 1 from posts p where p.id = post_id and p.space = 'community'))
  with check (not public.tn_is_parent_only()
         or not exists (select 1 from posts p where p.id = post_id and p.space = 'community'));

-- likes on those posts
drop policy if exists tn_no_parents_in_student_community on public.post_likes;
create policy tn_no_parents_in_student_community on public.post_likes
  as restrictive for all to authenticated
  using (not public.tn_is_parent_only()
         or not exists (select 1 from posts p where p.id = post_id and p.space = 'community'))
  with check (not public.tn_is_parent_only()
         or not exists (select 1 from posts p where p.id = post_id and p.space = 'community'));
