-- Date de naissance des voyageurs : source pour classes billet avion / excursions.
-- age_band reste un libellé UX ; birth_date prime quand elle est renseignée.

alter table household_members
  add column if not exists birth_date date;

comment on column household_members.birth_date is
  'Date de naissance (jour) pour dériver infant/child/adult à une date de voyage.';
