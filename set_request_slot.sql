-- Think Nest: save the class time a parent chooses when asking for a place for their child
create or replace function public.set_request_slot(kid uuid, cid bigint, slot text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare cap int; used numeric;
begin
  -- only the child's own parent can do this
  if not exists (select 1 from parent_links where parent_id = auth.uid() and student_id = kid) then
    raise exception 'NOT_YOUR_CHILD';
  end if;
  -- stop when that class time is already full
  select max_students into cap from courses where id = cid;
  if cap is not null then
    select coalesce(sum(s.taken), 0) into used from course_slot_places(cid) s where s.slot = set_request_slot.slot;
    if used >= cap then raise exception 'SLOT_FULL'; end if;
  end if;
  update course_requests set time_slot = set_request_slot.slot
   where course_id = cid and student_id = kid and status in ('parent', 'teacher');
end $$;

grant execute on function public.set_request_slot(uuid, bigint, text) to authenticated;
