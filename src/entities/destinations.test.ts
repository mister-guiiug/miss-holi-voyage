import { describe, expect, it } from 'vitest';
import {
  CONTINENTS,
  DESTINATIONS,
  countryCodeForName,
  destinationMetaLine,
  destinationsByContinent,
  flagEmoji,
  getDestination,
  proposeDestinations,
  searchDestinations,
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

  it('couvre les continents du panneau Destinations', () => {
    expect(CONTINENTS.map(c => c.id)).toEqual([
      'europe',
      'asie',
      'afrique',
      'amerique_nord',
      'caraibes',
      'amerique_sud',
      'oceanie',
      'moyen_orient',
    ]);
    expect(DESTINATIONS.length).toBeGreaterThan(70);
    expect(destinationsByContinent('europe').length).toBeGreaterThan(40);
  });

  it('autocomplète (accents, lieux, enrichissement)', () => {
    const egy = searchDestinations('egy');
    expect(egy.some(d => d.id === 'egypte')).toBe(true);
    const egypte = getDestination('egypte');
    expect(egypte?.places).toContain('Louxor');
    expect(destinationMetaLine(egypte!)).toMatch(/1[\s\u202f]?100|1100/);
    expect(destinationMetaLine(egypte!)).toContain('Vol 4h30');

    const crete = searchDestinations('crète');
    expect(crete[0]?.id).toBe('crete');
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
