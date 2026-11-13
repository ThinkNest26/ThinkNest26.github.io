-- Think Nest: shows how "ask for a place" works in the database (it changes nothing)
select pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('request_course', 'teacher_decide_request');
