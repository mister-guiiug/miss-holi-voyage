-- Foyers, voyages, étapes, vols, POI, questions IA, artefacts, décisions.
-- Tables verrouillées dès la création ; politiques et RPCs d'invitation ici.

create extension if not exists pgcrypto with schema extensions;

create type household_role as enum ('owner', 'editor', 'viewer');
create type step_status as enum ('draft', 'ready', 'locked');
create type trip_step_key as enum (
  'destination', 'specs', 'dates', 'flights', 'style', 'excursions'
);
create type poi_vote_value as enum ('interested', 'maybe', 'no');
create type itinerary_style as enum ('hub', 'roadtrip', 'undecided');

create or replace function bump_version() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.version = old.version + 1;
  new.updated_at = now();
  return new;
end;
$$;

-- ── Foyers ──────────────────────────────────────────────────────────────────

create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  notes text not null default '' check (char_length(notes) <= 2000),
  version integer not null default 1,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table households enable row level security;
create trigger households_bump_version
  before update on households
  for each row execute function bump_version();

create table household_memberships (
  household_id uuid not null references households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role household_role not null default 'editor',
  invited_by uuid references auth.users (id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
alter table household_memberships enable row level security;
create unique index household_memberships_one_owner
  on household_memberships (household_id) where role = 'owner';
create index household_memberships_user_idx on household_memberships (user_id);

create table household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  age_band text not null default 'adult'
    check (age_band in ('infant', 'child', 'teen', 'adult', 'senior')),
  mobility_notes text not null default '' check (char_length(mobility_notes) <= 500),
  food_notes text not null default '' check (char_length(food_notes) <= 500),
  sleep_notes text not null default '' check (char_length(sleep_notes) <= 500),
  interests text[] not null default '{}',
  linked_user_id uuid references auth.users (id) on delete set null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table household_members enable row level security;
create trigger household_members_touch
  before update on household_members
  for each row execute function touch_updated_at();

create table invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  token_hash text not null unique,
  role household_role not null default 'editor'
    check (role in ('editor', 'viewer')),
  expires_at timestamptz not null,
  max_uses integer not null default 5 check (max_uses between 1 and 50),
  uses integer not null default 0,
  revoked_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table invitations enable row level security;
create index invitations_household_idx on invitations (household_id);

-- ── Voyages ─────────────────────────────────────────────────────────────────

create table trips (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  destination_country text not null default '' check (char_length(destination_country) <= 80),
  destination_region text not null default '' check (char_length(destination_region) <= 120),
  destination_notes text not null default '' check (char_length(destination_notes) <= 2000),
  date_window_start date,
  date_window_end date,
  budget_ceiling numeric,
  budget_currency char(3) not null default 'EUR' check (budget_currency ~ '^[A-Z]{3}$'),
  style itinerary_style not null default 'undecided',
  style_notes text not null default '' check (char_length(style_notes) <= 2000),
  is_current boolean not null default false,
  version integer not null default 1,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table trips enable row level security;
create trigger trips_bump_version
  before update on trips
  for each row execute function bump_version();
create index trips_household_idx on trips (household_id);

create table trip_steps (
  trip_id uuid not null references trips (id) on delete cascade,
  step_key trip_step_key not null,
  status step_status not null default 'draft',
  updated_at timestamptz not null default now(),
  primary key (trip_id, step_key)
);
alter table trip_steps enable row level security;

create table flight_options (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  origin text not null default '' check (char_length(origin) <= 12),
  destination text not null default '' check (char_length(destination) <= 12),
  depart_at timestamptz,
  return_at timestamptz,
  stops integer not null default 0 check (stops between 0 and 6),
  price numeric,
  currency char(3) not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  baggage_notes text not null default '' check (char_length(baggage_notes) <= 500),
  source_url text not null default '' check (char_length(source_url) <= 2000),
  raw_paste text not null default '' check (char_length(raw_paste) <= 8000),
  created_at timestamptz not null default now()
);
alter table flight_options enable row level security;
create index flight_options_trip_idx on flight_options (trip_id);

create table flight_choices (
  trip_id uuid primary key references trips (id) on delete cascade,
  flight_option_id uuid not null references flight_options (id) on delete cascade,
  chosen_at timestamptz not null default now(),
  chosen_by uuid references auth.users (id) on delete set null
);
alter table flight_choices enable row level security;

create table poi_candidates (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  zone text not null default '' check (char_length(zone) <= 120),
  duration_hours numeric,
  min_age integer,
  season_notes text not null default '' check (char_length(season_notes) <= 500),
  cost_band text not null default 'unknown'
    check (cost_band in ('free', 'low', 'mid', 'high', 'unknown')),
  why_match text not null default '' check (char_length(why_match) <= 1000),
  source text not null default 'manual'
    check (source in ('manual', 'ai', 'import')),
  created_at timestamptz not null default now()
);
alter table poi_candidates enable row level security;
create index poi_candidates_trip_idx on poi_candidates (trip_id);

create table poi_votes (
  poi_id uuid not null references poi_candidates (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  vote poi_vote_value not null,
  notes text not null default '' check (char_length(notes) <= 500),
  updated_at timestamptz not null default now(),
  primary key (poi_id, user_id)
);
alter table poi_votes enable row level security;

create table spec_questions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  prompt text not null check (char_length(prompt) between 1 and 500),
  rationale text not null default '' check (char_length(rationale) <= 1000),
  priority integer not null default 5 check (priority between 1 and 10),
  answer text not null default '' check (char_length(answer) <= 2000),
  status text not null default 'open'
    check (status in ('open', 'answered', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table spec_questions enable row level security;
create trigger spec_questions_touch
  before update on spec_questions
  for each row execute function touch_updated_at();
create index spec_questions_trip_idx on spec_questions (trip_id);

-- Schéma prêt pour W2 ; génération UI désactivée en v1.
create table artifacts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  artifact_type text not null check (char_length(artifact_type) between 1 and 80),
  title text not null check (char_length(title) between 1 and 160),
  content_markdown text not null default '',
  content_json jsonb not null default '{}'::jsonb,
  prompt_source text not null default '',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table artifacts enable row level security;
create trigger artifacts_touch
  before update on artifacts
  for each row execute function touch_updated_at();
create index artifacts_trip_idx on artifacts (trip_id);

create table decision_log (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  step_key text not null default '',
  summary text not null check (char_length(summary) between 1 and 500),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table decision_log enable row level security;
create index decision_log_trip_idx on decision_log (trip_id, created_at desc);

-- ── Helpers d'appartenance ──────────────────────────────────────────────────

create or replace function household_role(p_household uuid) returns household_role
language sql stable security definer set search_path = public as $$
  select role from household_memberships
   where household_id = p_household and user_id = auth.uid();
$$;

create or replace function is_household_member(p_household uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select household_role(p_household) is not null;
$$;

create or replace function can_edit_household(p_household uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(household_role(p_household) in ('owner', 'editor'), false);
$$;

create or replace function trip_household(p_trip uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from trips where id = p_trip;
$$;

create or replace function is_trip_member(p_trip uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_household_member(trip_household(p_trip));
$$;

create or replace function can_edit_trip(p_trip uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select can_edit_household(trip_household(p_trip));
$$;

-- ── RPCs foyer / invitation ─────────────────────────────────────────────────

create or replace function create_household(p_name text, p_notes text default '')
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  hid uuid;
begin
  if uid is null then
    raise exception 'session requise' using errcode = '42501';
  end if;
  if char_length(trim(p_name)) < 1 then
    raise exception 'nom requis' using errcode = 'ST422';
  end if;
  insert into households (name, notes, created_by)
  values (trim(p_name), coalesce(p_notes, ''), uid)
  returning id into hid;
  insert into household_memberships (household_id, user_id, role)
  values (hid, uid, 'owner');
  return hid;
end;
$$;

create or replace function create_invitation(
  p_household uuid,
  p_role household_role default 'editor',
  p_expires interval default interval '14 days',
  p_max_uses integer default 5
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_id uuid;
  v_expires timestamptz := now() + p_expires;
begin
  if auth.uid() is null or household_role(p_household) is distinct from 'owner' then
    raise exception 'seul le propriétaire invite' using errcode = '42501';
  end if;
  if p_role = 'owner' then
    raise exception 'une invitation ne donne pas la propriété' using errcode = 'ST422';
  end if;
  insert into invitations (household_id, token_hash, role, expires_at, max_uses, created_by)
  values (
    p_household,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    p_role,
    v_expires,
    coalesce(p_max_uses, 5),
    auth.uid()
  )
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'token', v_token, 'expires_at', v_expires);
end;
$$;

create or replace function accept_invitation(p_token text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  uid uuid := auth.uid();
  inv invitations%rowtype;
begin
  if uid is null then
    raise exception 'session requise' using errcode = '42501';
  end if;
  select * into inv from invitations
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if not found then
    raise exception 'invitation inconnue' using errcode = 'ST404';
  end if;
  if inv.revoked_at is not null or inv.expires_at < now() or inv.uses >= inv.max_uses then
    raise exception 'invitation invalide' using errcode = 'ST410';
  end if;
  insert into household_memberships (household_id, user_id, role, invited_by)
  values (inv.household_id, uid, inv.role, inv.created_by)
  on conflict (household_id, user_id) do nothing;
  update invitations set uses = uses + 1 where id = inv.id;
  return jsonb_build_object('household_id', inv.household_id, 'role', inv.role);
end;
$$;

create or replace function ensure_trip_steps(p_trip uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  k trip_step_key;
begin
  foreach k in array enum_range(null::trip_step_key) loop
    insert into trip_steps (trip_id, step_key)
    values (p_trip, k)
    on conflict do nothing;
  end loop;
end;
$$;

create or replace function create_trip(
  p_household uuid,
  p_title text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  tid uuid;
begin
  if not can_edit_household(p_household) then
    raise exception 'écriture refusée' using errcode = '42501';
  end if;
  update trips set is_current = false where household_id = p_household and is_current;
  insert into trips (household_id, title, is_current, created_by)
  values (p_household, trim(p_title), true, auth.uid())
  returning id into tid;
  perform ensure_trip_steps(tid);
  insert into decision_log (trip_id, actor_user_id, step_key, summary)
  values (tid, auth.uid(), 'destination', 'Voyage créé');
  return tid;
end;
$$;

create or replace function log_decision(
  p_trip uuid,
  p_step text,
  p_summary text,
  p_payload jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  did uuid;
begin
  if not is_trip_member(p_trip) then
    raise exception 'lecture refusée' using errcode = '42501';
  end if;
  insert into decision_log (trip_id, actor_user_id, step_key, summary, payload)
  values (p_trip, auth.uid(), coalesce(p_step, ''), p_summary, coalesce(p_payload, '{}'::jsonb))
  returning id into did;
  return did;
end;
$$;

grant execute on function create_household(text, text) to authenticated;
grant execute on function create_invitation(uuid, household_role, interval, integer) to authenticated;
grant execute on function accept_invitation(text) to authenticated;
grant execute on function create_trip(uuid, text) to authenticated;
grant execute on function ensure_trip_steps(uuid) to authenticated;
grant execute on function log_decision(uuid, text, text, jsonb) to authenticated;
grant execute on function household_role(uuid) to authenticated;
grant execute on function is_household_member(uuid) to authenticated;
grant execute on function can_edit_household(uuid) to authenticated;
grant execute on function is_trip_member(uuid) to authenticated;
grant execute on function can_edit_trip(uuid) to authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────────

create policy households_select on households
  for select to authenticated
  using (is_household_member(id));
create policy households_update on households
  for update to authenticated
  using (can_edit_household(id))
  with check (can_edit_household(id));
-- insert via create_household only

create policy memberships_select on household_memberships
  for select to authenticated
  using (is_household_member(household_id));
create policy memberships_delete on household_memberships
  for delete to authenticated
  using (
    user_id = auth.uid()
    or household_role(household_id) = 'owner'
  );

create policy members_select on household_members
  for select to authenticated
  using (is_household_member(household_id));
create policy members_write on household_members
  for insert to authenticated
  with check (can_edit_household(household_id));
create policy members_update on household_members
  for update to authenticated
  using (can_edit_household(household_id))
  with check (can_edit_household(household_id));
create policy members_delete on household_members
  for delete to authenticated
  using (can_edit_household(household_id));

create policy invitations_select on invitations
  for select to authenticated
  using (household_role(household_id) = 'owner');

create policy trips_select on trips
  for select to authenticated
  using (is_household_member(household_id));
create policy trips_insert on trips
  for insert to authenticated
  with check (can_edit_household(household_id));
create policy trips_update on trips
  for update to authenticated
  using (can_edit_household(household_id))
  with check (can_edit_household(household_id));
create policy trips_delete on trips
  for delete to authenticated
  using (can_edit_household(household_id));

create policy trip_steps_select on trip_steps
  for select to authenticated
  using (is_trip_member(trip_id));
create policy trip_steps_upsert on trip_steps
  for all to authenticated
  using (can_edit_trip(trip_id))
  with check (can_edit_trip(trip_id));

create policy flight_options_select on flight_options
  for select to authenticated using (is_trip_member(trip_id));
create policy flight_options_write on flight_options
  for insert to authenticated with check (can_edit_trip(trip_id));
create policy flight_options_update on flight_options
  for update to authenticated
  using (can_edit_trip(trip_id)) with check (can_edit_trip(trip_id));
create policy flight_options_delete on flight_options
  for delete to authenticated using (can_edit_trip(trip_id));

create policy flight_choices_select on flight_choices
  for select to authenticated using (is_trip_member(trip_id));
create policy flight_choices_write on flight_choices
  for insert to authenticated with check (can_edit_trip(trip_id));
create policy flight_choices_update on flight_choices
  for update to authenticated
  using (can_edit_trip(trip_id)) with check (can_edit_trip(trip_id));
create policy flight_choices_delete on flight_choices
  for delete to authenticated using (can_edit_trip(trip_id));

create policy poi_candidates_select on poi_candidates
  for select to authenticated using (is_trip_member(trip_id));
create policy poi_candidates_write on poi_candidates
  for insert to authenticated with check (can_edit_trip(trip_id));
create policy poi_candidates_update on poi_candidates
  for update to authenticated
  using (can_edit_trip(trip_id)) with check (can_edit_trip(trip_id));
create policy poi_candidates_delete on poi_candidates
  for delete to authenticated using (can_edit_trip(trip_id));

create policy poi_votes_select on poi_votes
  for select to authenticated
  using (
    exists (
      select 1 from poi_candidates p
      where p.id = poi_id and is_trip_member(p.trip_id)
    )
  );
create policy poi_votes_write on poi_votes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from poi_candidates p
      where p.id = poi_id and is_trip_member(p.trip_id)
    )
  );
create policy poi_votes_update on poi_votes
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy poi_votes_delete on poi_votes
  for delete to authenticated using (user_id = auth.uid());

create policy spec_questions_select on spec_questions
  for select to authenticated using (is_trip_member(trip_id));
create policy spec_questions_write on spec_questions
  for insert to authenticated with check (can_edit_trip(trip_id));
create policy spec_questions_update on spec_questions
  for update to authenticated
  using (can_edit_trip(trip_id)) with check (can_edit_trip(trip_id));
create policy spec_questions_delete on spec_questions
  for delete to authenticated using (can_edit_trip(trip_id));

create policy artifacts_select on artifacts
  for select to authenticated
  using (is_trip_member(trip_id));
create policy artifacts_write on artifacts
  for all to authenticated
  using (can_edit_trip(trip_id))
  with check (can_edit_trip(trip_id));

create policy decision_log_select on decision_log
  for select to authenticated
  using (is_trip_member(trip_id));
-- insert via log_decision
