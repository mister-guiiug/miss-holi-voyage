import { describe, expect, it } from 'vitest';
import { createInviteCode, normalizeInviteCode } from './invite-code.ts';

describe('invite-code', () => {
  it('produit XXXX-XXXX sans caractères ambigus', () => {
    const code = createInviteCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(code).not.toMatch(/[01IO]/);
  });

  it('normalise la saisie', () => {
    expect(normalizeInviteCode('ab3k7mnp')).toBe('AB3K-7MNP');
    expect(normalizeInviteCode('ab3k-7mnp')).toBe('AB3K-7MNP');
  });
});
