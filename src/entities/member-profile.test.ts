import { describe, expect, it } from 'vitest';
import {
  MAX_MEMBER_INTERESTS,
  toggleMemberInterest,
} from './member-profile.ts';

describe('toggleMemberInterest', () => {
  it('ajoute puis retire un centre d’intérêt', () => {
    const a = toggleMemberInterest([], 'detente');
    expect(a).toEqual(['detente']);
    expect(toggleMemberInterest(a, 'detente')).toEqual([]);
  });

  it(`refuse au-delà de ${MAX_MEMBER_INTERESTS}`, () => {
    const full = toggleMemberInterest(
      ['detente', 'culturel', 'nature', 'randonnee'],
      'plongee'
    );
    expect(full).toHaveLength(4);
    expect(full).not.toContain('plongee');
  });
});
