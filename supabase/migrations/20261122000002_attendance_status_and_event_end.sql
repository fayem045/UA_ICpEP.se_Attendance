alter table public.events add column if not exists ends_at timestamptz;

create or replace function public.set_attendance_status()
returns trigger
language plpgsql
as $$
declare
  start_ts timestamptz;
begin
  select starts_at into start_ts
  from public.events
  where id = new.event_id;

  if start_ts is not null then
    new.status := case
      when now() <= start_ts + interval '10 minutes' then 'Present'
      else 'Late'
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists attendance_auto_status on public.attendances;

create trigger attendance_auto_status
before insert on public.attendances
for each row
when (new.status is distinct from 'Absent')
execute function public.set_attendance_status();
