-- BMI / SEGAK read-only bridge to Portal Koku master data.
-- Requires existing Koku tables: academic_sessions, classes, students, student_enrolments.
-- All functions below SELECT only. They provide no write path to Koku tables.
-- Execute permission is restricted to service_role (the Edge Function runtime).

create or replace function public.segak_bridge_authorized(p_bridge_token text)
returns boolean
language sql
stable
security definer
set search_path=public,extensions
as $$
  select encode(extensions.digest(coalesce(p_bridge_token,''),'sha256'),'hex') =
         coalesce((select value from public.segak_settings where key='app_password_sha256'),'');
$$;

create or replace function public.segak_bridge_sessions(p_bridge_token text)
returns table(id uuid,year integer,name text,is_active boolean)
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if not public.segak_bridge_authorized(p_bridge_token) then
    raise exception 'unauthorized' using errcode='42501';
  end if;
  return query
  select a.id,a.year,a.name,a.is_active
  from public.academic_sessions a
  where a.is_active=true
  order by a.year;
end;
$$;

create or replace function public.segak_bridge_classes(p_bridge_token text,p_year integer)
returns table(id uuid,session_id uuid,year_level integer,name text,code text,class_teacher_name text)
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if not public.segak_bridge_authorized(p_bridge_token) then
    raise exception 'unauthorized' using errcode='42501';
  end if;
  return query
  select c.id,c.session_id,c.year_level,c.name,c.code,c.class_teacher_name
  from public.classes c
  join public.academic_sessions a on a.id=c.session_id
  where a.year=p_year and c.year_level between 1 and 6
  order by c.year_level,c.code,c.name;
end;
$$;

create or replace function public.segak_bridge_roster(p_bridge_token text,p_year integer,p_class_code text)
returns table(
  student_id uuid,full_name text,normalized_name text,class_id uuid,class_code text,
  class_name text,year_level integer,class_teacher_name text,permission_status text,
  enrolment_is_current boolean
)
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if not public.segak_bridge_authorized(p_bridge_token) then
    raise exception 'unauthorized' using errcode='42501';
  end if;
  return query
  select s.id,s.full_name,s.normalized_name,c.id,c.code,c.name,c.year_level,
         c.class_teacher_name,e.permission_status,e.is_current
  from public.student_enrolments e
  join public.students s on s.id=e.student_id
  join public.classes c on c.id=e.class_id
  join public.academic_sessions a on a.id=e.session_id
  where a.year=p_year and c.code=p_class_code and s.active=true
  order by s.full_name;
end;
$$;

create or replace function public.segak_bridge_year_roster(p_bridge_token text,p_year integer)
returns table(
  student_id uuid,full_name text,normalized_name text,class_id uuid,class_code text,
  class_name text,year_level integer,class_teacher_name text,permission_status text,
  enrolment_is_current boolean
)
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if not public.segak_bridge_authorized(p_bridge_token) then
    raise exception 'unauthorized' using errcode='42501';
  end if;
  return query
  select s.id,s.full_name,s.normalized_name,c.id,c.code,c.name,c.year_level,
         c.class_teacher_name,e.permission_status,e.is_current
  from public.student_enrolments e
  join public.students s on s.id=e.student_id
  join public.classes c on c.id=e.class_id
  join public.academic_sessions a on a.id=e.session_id
  where a.year=p_year and c.year_level between 1 and 6 and s.active=true
  order by c.year_level,c.code,s.full_name;
end;
$$;

create or replace function public.segak_bridge_find_students(p_bridge_token text,p_year integer,p_names text[])
returns table(student_id uuid,full_name text,class_code text,class_name text,year_level integer)
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if not public.segak_bridge_authorized(p_bridge_token) then
    raise exception 'unauthorized' using errcode='42501';
  end if;
  return query
  select distinct on (s.id) s.id,s.full_name,c.code,c.name,c.year_level
  from public.student_enrolments e
  join public.students s on s.id=e.student_id
  join public.classes c on c.id=e.class_id
  join public.academic_sessions a on a.id=e.session_id
  where a.year=p_year
    and upper(regexp_replace(trim(s.full_name),'\s+',' ','g'))=any(
      select upper(regexp_replace(trim(n),'\s+',' ','g')) from unnest(p_names)n
    )
  order by s.id,e.is_current desc,e.created_at desc;
end;
$$;

revoke all on function public.segak_bridge_authorized(text) from public,anon,authenticated;
revoke all on function public.segak_bridge_sessions(text) from public,anon,authenticated;
revoke all on function public.segak_bridge_classes(text,integer) from public,anon,authenticated;
revoke all on function public.segak_bridge_roster(text,integer,text) from public,anon,authenticated;
revoke all on function public.segak_bridge_year_roster(text,integer) from public,anon,authenticated;
revoke all on function public.segak_bridge_find_students(text,integer,text[]) from public,anon,authenticated;

grant execute on function public.segak_bridge_authorized(text) to service_role;
grant execute on function public.segak_bridge_sessions(text) to service_role;
grant execute on function public.segak_bridge_classes(text,integer) to service_role;
grant execute on function public.segak_bridge_roster(text,integer,text) to service_role;
grant execute on function public.segak_bridge_year_roster(text,integer) to service_role;
grant execute on function public.segak_bridge_find_students(text,integer,text[]) to service_role;
