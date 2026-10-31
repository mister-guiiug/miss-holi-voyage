import { describe, expect, it } from 'vitest';
import {
  countryCodeForName,
  flagEmoji,
  proposeDestinations,
} from './destinations.ts';

describe('destinations (partir.com embarqué)', () => {
  it('drapeau depuis le code ISO', () => {
    expect(flagEmoji('FR')).toBe('🇫🇷');
    expect(flagEmoji('vn')).toBe('🇻🇳');
    expect(flagEmoji('')).toBe('');
    expect(flagEmoji('FRA')).toBe('');
  });

  it('retrouve le code pays depuis le nom', () => {
    expect(countryCodeForName('Portugal')).toBe('PT');
    expect(countryCodeForName('grèce')).toBe('GR');
    expect(countryCodeForName('')).toBe('');
  });

  it('propose des destinations famille, filtrables par mois', () => {
    const hiver = proposeDestinations({
      month: 1,
      familyFriendly: true,
      limit: 5,
    });
    expect(hiver.length).toBeGreaterThan(0);
    expect(hiver.every(d => d.tags.includes('famille'))).toBe(true);
    expect(hiver.every(d => d.months.includes(1))).toBe(true);
    expect(hiver.every(d => d.countryCode.length === 2)).toBe(true);
  });
});
