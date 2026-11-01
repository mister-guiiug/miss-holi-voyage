-- Code d’invitation court (XXXX-XXXX), comme le backend local.
-- Avant : create_invitation ne renvoyait que le jeton hex (48 car.) ; le client
-- l’affichait tel quel. On conserve le jeton pour les liens déjà émis.

alter table invitations
  add column if not exists code_hash text;

create unique index if not exists invitations_code_hash_uidx
  on invitations (code_hash)
  where code_hash is not null;

create or replace function create_invitation(
  p_household uuid,
  p_role household_role default 'editor',
  p_expires interval default interval '14 days',
  p_max_uses integer default 5
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_raw text;
  v_code text;
  v_code_hash text;
  v_id uuid;
  v_expires timestamptz := now() + p_expires;
  v_attempt integer;
  v_byte integer;
begin
  if auth.uid() is null or household_role(p_household) is distinct from 'owner' then
    raise exception 'seul le propriétaire invite' using errcode = '42501';
  end if;
  if p_role = 'owner' then
    raise exception 'une invitation ne donne pas la propriété' using errcode = 'ST422';
  end if;

  for v_attempt in 1..12 loop
    v_raw := '';
    for v_byte in 1..8 loop
      v_raw := v_raw || substr(
        v_alphabet,
        1 + (get_byte(extensions.gen_random_bytes(1), 0) % length(v_alphabet)),
        1
      );
    end loop;
    v_code := substr(v_raw, 1, 4) || '-' || substr(v_raw, 5, 4);
    v_code_hash := encode(extensions.digest(v_raw, 'sha256'), 'hex');
    begin
      insert into invitations (
        household_id, token_hash, code_hash, role, expires_at, max_uses, created_by
      ) values (
        p_household,
        encode(extensions.digest(v_token, 'sha256'), 'hex'),
        v_code_hash,
        p_role,
        v_expires,
        coalesce(p_max_uses, 5),
        auth.uid()
      )
      returning id into v_id;
      exit;
    exception
      when unique_violation then
        if v_attempt = 12 then
          raise;
        end if;
        -- collision sur code_hash : nouveau code, même jeton régénéré
        v_token := encode(extensions.gen_random_bytes(24), 'hex');
    end;
  end loop;

  return jsonb_build_object(
    'id', v_id,
    'token', v_token,
    'code', v_code,
    'expires_at', v_expires
  );
end;
$$;

create or replace function accept_invitation(p_token text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  uid uuid := auth.uid();
  inv invitations%rowtype;
  v_raw text := trim(p_token);
  v_compact text := upper(regexp_replace(v_raw, '[^A-Za-z0-9]', '', 'g'));
begin
  if uid is null then
    raise exception 'session requise' using errcode = '42501';
  end if;

  select * into inv from invitations
   where token_hash = encode(extensions.digest(v_raw, 'sha256'), 'hex')
      or token_hash = encode(extensions.digest(lower(v_raw), 'sha256'), 'hex')
      or (code_hash is not null
          and code_hash = encode(extensions.digest(v_compact, 'sha256'), 'hex'));

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

grant execute on function create_invitation(uuid, household_role, interval, integer) to authenticated;
grant execute on function accept_invitation(text) to authenticated;
