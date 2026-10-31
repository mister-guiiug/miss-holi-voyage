-- Sexe du voyageur : avatar + ton du profil (nullable côté magasin local via
-- défaut Zod `unspecified`). Valeurs alignées sur memberGenderSchema.

alter table household_members
  add column if not exists gender text not null default 'unspecified'
    check (gender in ('female', 'male', 'other', 'unspecified'));

comment on column household_members.gender is
  'Sexe déclaré (female|male|other|unspecified) pour avatar et préférences.';
