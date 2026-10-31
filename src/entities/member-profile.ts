import { z } from 'zod';

/**
 * Sexe déclaré pour l’avatar et le ton du profil.
 * Les libellés UX sont en français (`voyage.gender.*`) ; les clés restent
 * stables pour le magasin et le MCP.
 */
export const memberGenderSchema = z.enum([
  'female',
  'male',
  'other',
  'unspecified',
]);
export type MemberGender = z.infer<typeof memberGenderSchema>;

/**
 * Centres d’intérêt voyageur — catalogue figé (détente / culturel / nature +
 * profils inspirés des questionnaires famille). Max 4 pour forcer un ordre
 * d’importance sans questionnaire interminable.
 */
export const memberInterestIdSchema = z.enum([
  'detente',
  'culturel',
  'nature',
  'gastronomie',
  'randonnee',
  'plongee',
  'familial',
  'baroudeur',
  'photographe',
  'sportif',
  'festivalier',
  'romantique',
  'lent',
]);
export type MemberInterestId = z.infer<typeof memberInterestIdSchema>;

export const MAX_MEMBER_INTERESTS = 4;

export const MEMBER_INTERESTS: readonly { id: MemberInterestId }[] = [
  { id: 'detente' },
  { id: 'culturel' },
  { id: 'nature' },
  { id: 'gastronomie' },
  { id: 'randonnee' },
  { id: 'plongee' },
  { id: 'familial' },
  { id: 'baroudeur' },
  { id: 'photographe' },
  { id: 'sportif' },
  { id: 'festivalier' },
  { id: 'romantique' },
  { id: 'lent' },
];

export function isMemberInterestId(value: string): value is MemberInterestId {
  return memberInterestIdSchema.safeParse(value).success;
}

export function toggleMemberInterest(
  current: readonly string[],
  id: MemberInterestId,
  max = MAX_MEMBER_INTERESTS
): MemberInterestId[] {
  const known = current.filter(isMemberInterestId);
  if (known.includes(id)) {
    return known.filter(x => x !== id);
  }
  if (known.length >= max) return known;
  return [...known, id];
}
