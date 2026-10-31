import { describe, expect, it } from 'vitest';
import {
  ageBandFromBirthDate,
  ageInYears,
  excursionTicketClass,
  flightTicketClass,
} from './ticket-age.ts';

describe('ticket-age', () => {
  it('calcule l’âge en années civiles', () => {
    expect(ageInYears('2015-06-15', '2026-06-14')).toBe(10);
    expect(ageInYears('2015-06-15', '2026-06-15')).toBe(11);
  });

  it('classe avion IATA-ish à la date de vol', () => {
    expect(flightTicketClass('2025-01-01', '2026-06-01')).toBe('infant');
    expect(flightTicketClass('2018-01-01', '2026-06-01')).toBe('child');
    expect(flightTicketClass('2010-01-01', '2026-06-01')).toBe('adult');
  });

  it('classe excursion : adulte dès 18 ans', () => {
    expect(excursionTicketClass('2010-01-01', '2026-06-01')).toBe('child');
    expect(excursionTicketClass('2008-01-01', '2026-06-01')).toBe('adult');
    expect(excursionTicketClass('2024-01-01', '2026-06-01')).toBe('infant');
  });

  it('retombe sur ageBand sans date de naissance', () => {
    expect(flightTicketClass(null, '2026-01-01', 'child')).toBe('child');
    expect(excursionTicketClass(undefined, '2026-01-01', 'teen')).toBe('child');
  });

  it('dérive ageBand depuis la naissance', () => {
    expect(ageBandFromBirthDate('2025-01-01', '2026-06-01')).toBe('infant');
    expect(ageBandFromBirthDate('2016-01-01', '2026-06-01')).toBe('child');
    expect(ageBandFromBirthDate('2010-01-01', '2026-06-01')).toBe('teen');
    expect(ageBandFromBirthDate('1990-01-01', '2026-06-01')).toBe('adult');
    expect(ageBandFromBirthDate('1950-01-01', '2026-06-01')).toBe('senior');
  });
});
