-- Anti-pause Supabase Free (voir keep-alive.sql).

create table if not exists public.keep_alive (
  id bigint generated always as identity primary key,
  pinged_at timestamptz not null default now()
);

alter table public.keep_alive enable row level security;

drop policy if exists "anon read keep_alive" on public.keep_alive;
create policy "anon read keep_alive"
  on public.keep_alive
  for select
  to anon
  using (true);

insert into public.keep_alive (pinged_at)
select now()
where not exists (select 1 from public.keep_alive);
