import { describe, expect, it } from 'vitest';
import {
  proposeItineraryStyle,
  proposePois,
  suggestSpecQuestions,
} from './ai-tools.ts';
import type { HouseholdMember, Trip } from './schemas.ts';

const trip = (patch: Partial<Trip> = {}): Trip => ({
  id: 'trip_1',
  householdId: 'hh_1',
  title: 'Été',
  destinationCountry: '',
  destinationRegion: '',
  destinationNotes: '',
  dateWindowStart: null,
  dateWindowEnd: null,
  budgetCeiling: null,
  budgetCurrency: 'EUR',
  style: 'undecided',
  styleNotes: '',
  isCurrent: true,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...patch,
});

const member = (patch: Partial<HouseholdMember> = {}): HouseholdMember => ({
  id: 'mem_1',
  householdId: 'hh_1',
  displayName: 'Lou',
  birthDate: null,
  ageBand: 'child',
  gender: 'unspecified',
  mobilityNotes: '',
  foodNotes: '',
  sleepNotes: '',
  interests: [],
  position: 0,
  ...patch,
});

describe('contrats IA', () => {
  it('suggest_spec_questions priorise destination et dates', () => {
    const qs = suggestSpecQuestions({
      trip: trip(),
      members: [member()],
    });
    expect(qs.length).toBeGreaterThanOrEqual(3);
    expect(qs[0]?.priority).toBeGreaterThanOrEqual(qs.at(-1)!.priority);
    expect(qs.some(q => /pays/i.test(q.prompt))).toBe(true);
  });

  it('propose_itinerary_style met le hub en tête avec de jeunes enfants', () => {
    const styles = proposeItineraryStyle({
      trip: trip({ destinationCountry: 'Portugal' }),
      members: [member({ ageBand: 'infant' })],
    });
    expect(styles[0]?.style).toBe('hub');
  });

  it('propose_pois rend au moins 5 candidats structurés', () => {
    const pois = proposePois({
      trip: trip({ destinationCountry: 'Japon', style: 'hub' }),
      members: [member({ ageBand: 'adult' })],
    });
    expect(pois.length).toBeGreaterThanOrEqual(5);
    expect(pois.every(p => p.source === 'ai' && p.name.length > 0)).toBe(true);
  });
});
