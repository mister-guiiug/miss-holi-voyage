-- Le wipe local et la suppression de foyer côté propriétaire.
-- 0006 n’ouvrait que SELECT/UPDATE sur households : sans DELETE, un propriétaire
-- ne pouvait pas retirer un foyer (cascade memberships / trips / invitations).

create policy households_delete on households
  for delete to authenticated
  using (household_role(id) = 'owner');
