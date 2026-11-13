-- Think Nest: tell both people when they are paired as learning partners (Coffee and connections)
create or replace function public.tn_notify_coffee_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare na text; nb text; pg text; word text;
begin
  select full_name into na from profiles where id = new.user_a;
  select full_name into nb from profiles where id = new.user_b;
  pg   := case when new.hub = 'parents' then 'parent-connect.html' else 'teacher-connect.html' end;
  word := case when new.hub = 'parents' then 'parent partner' else 'learning partner' end;
  insert into notifications (user_id, title, kind, link) values
    (new.user_a, '☕ You have been paired with ' || coalesce(nb, 'a colleague') || ' as your ' || word, 'friend', pg),
    (new.user_b, '☕ You have been paired with ' || coalesce(na, 'a colleague') || ' as your ' || word, 'friend', pg);
  return new;
end $$;

drop trigger if exists tn_coffee_match_notify on coffee_matches;
create trigger tn_coffee_match_notify
  after insert on coffee_matches
  for each row execute function public.tn_notify_coffee_match();
