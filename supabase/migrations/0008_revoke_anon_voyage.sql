-- Retirer EXECUTE à anon (et public) sur les SECURITY DEFINER du voyage.
-- Supabase accorde EXECUTE à anon par défaut ; `revoke … from public` ne
-- suffit pas — il faut nommer `anon` (structure-securite.test.sql).

revoke execute on function public.bump_version() from anon, public;
revoke execute on function public.household_role(uuid) from anon, public;
revoke execute on function public.is_household_member(uuid) from anon, public;
revoke execute on function public.can_edit_household(uuid) from anon, public;
revoke execute on function public.trip_household(uuid) from anon, public;
revoke execute on function public.is_trip_member(uuid) from anon, public;
revoke execute on function public.can_edit_trip(uuid) from anon, public;
revoke execute on function public.create_household(text, text) from anon, public;
revoke execute on function public.create_invitation(uuid, household_role, interval, integer) from anon, public;
revoke execute on function public.accept_invitation(text) from anon, public;
revoke execute on function public.ensure_trip_steps(uuid) from anon, public;
revoke execute on function public.create_trip(uuid, text) from anon, public;
revoke execute on function public.log_decision(uuid, text, text, jsonb) from anon, public;

-- authenticated conserve ce que 0006 lui a accordé.
grant execute on function public.household_role(uuid) to authenticated;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.can_edit_household(uuid) to authenticated;
grant execute on function public.trip_household(uuid) to authenticated;
grant execute on function public.is_trip_member(uuid) to authenticated;
grant execute on function public.can_edit_trip(uuid) to authenticated;
grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.create_invitation(uuid, household_role, interval, integer) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.ensure_trip_steps(uuid) to authenticated;
grant execute on function public.create_trip(uuid, text) to authenticated;
grant execute on function public.log_decision(uuid, text, text, jsonb) to authenticated;
