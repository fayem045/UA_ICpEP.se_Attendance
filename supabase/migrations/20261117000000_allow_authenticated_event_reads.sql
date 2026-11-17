grant select on table public.events to authenticated;

drop policy if exists "Authenticated users can view events" on public.events;

create policy "Authenticated users can view events"
on public.events
for select
to authenticated
using (true);
