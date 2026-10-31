import { createId } from '@mister-guiiug/dev-pwa-config/id';
import { createVersionedStore } from '@mister-guiiug/dev-pwa-config/versioned-store';
import {
  emptyVoyageSnapshot,
  voyageSnapshotSchema,
  type FlightOption,
  type Household,
  type HouseholdMember,
  type PoiCandidate,
  type Trip,
  type VoyageSnapshot,
  STEP_ORDER,
} from '../entities/schemas.ts';
import {
  proposeItineraryStyle,
  proposePois,
  suggestSpecQuestions,
} from '../entities/ai-tools.ts';
import type { VoyageRepository } from './voyage-ports.ts';
import {
  createInviteCode,
  normalizeInviteCode,
} from '../entities/invite-code.ts';

const LOCAL_USER = 'local-user';

export const voyageStore = createVersionedStore<VoyageSnapshot>({
  store: 'miss-holi-voyage',
  key: 'voyage',
  version: 1,
  validate: (data: unknown) => voyageSnapshotSchema.parse(data),
  seed: emptyVoyageSnapshot,
  migrations: {} as Record<number, (data: unknown) => unknown>,
});

function now() {
  return new Date().toISOString();
}

function withSteps(tripId: string, snap: VoyageSnapshot): VoyageSnapshot {
  const missing = STEP_ORDER.filter(
    k => !snap.steps.some(s => s.tripId === tripId && s.stepKey === k)
  );
  if (missing.length === 0) return snap;
  return {
    ...snap,
    steps: [
      ...snap.steps,
      ...missing.map(stepKey => ({
        tripId,
        stepKey,
        status: 'draft' as const,
      })),
    ],
  };
}

function decide(
  snap: VoyageSnapshot,
  tripId: string,
  stepKey: string,
  summary: string
): VoyageSnapshot {
  return {
    ...snap,
    decisions: [
      {
        id: createId('dec'),
        tripId,
        stepKey,
        summary,
        createdAt: now(),
      },
      ...snap.decisions,
    ],
  };
}

export function createLocalVoyage(): VoyageRepository {
  return {
    async load() {
      return voyageStore.load();
    },

    async createHousehold(name, notes = '') {
      const snap = voyageStore.load();
      const household: Household = {
        id: createId('hh'),
        name: name.trim(),
        notes,
        createdAt: now(),
        updatedAt: now(),
      };
      const next: VoyageSnapshot = {
        ...snap,
        households: [household, ...snap.households],
        memberships: [
          {
            householdId: household.id,
            userId: LOCAL_USER,
            role: 'owner',
            joinedAt: now(),
          },
          ...snap.memberships,
        ],
      };
      voyageStore.save(next);
      return household;
    },

    async createInvite(householdId) {
      const token = createId('inv').replace(/^inv_/, '');
      const code = createInviteCode();
      const snap = voyageStore.load();
      const expiresAt = new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000
      ).toISOString();
      voyageStore.save({
        ...snap,
        inviteTokens: [
          { householdId, token, code, role: 'editor', expiresAt },
          ...snap.inviteTokens,
        ],
      });
      return { token, code, expiresAt };
    },

    async acceptInvite(tokenOrCode) {
      const snap = voyageStore.load();
      const normalized = normalizeInviteCode(tokenOrCode);
      const inv = snap.inviteTokens.find(
        i =>
          i.token === tokenOrCode.trim() ||
          (i.code && normalizeInviteCode(i.code) === normalized)
      );
      if (!inv) throw new Error('invitation inconnue');
      if (
        !snap.memberships.some(
          m => m.householdId === inv.householdId && m.userId === LOCAL_USER
        )
      ) {
        voyageStore.save({
          ...snap,
          memberships: [
            {
              householdId: inv.householdId,
              userId: LOCAL_USER,
              role: inv.role === 'owner' ? 'editor' : inv.role,
              joinedAt: now(),
            },
            ...snap.memberships,
          ],
        });
      }
      return inv.householdId;
    },

    async addMember(member) {
      const snap = voyageStore.load();
      const row: HouseholdMember = {
        ...member,
        id: createId('mem'),
        birthDate: member.birthDate ?? null,
        interests: member.interests ?? [],
        ageBand: member.ageBand ?? 'adult',
        mobilityNotes: member.mobilityNotes ?? '',
        foodNotes: member.foodNotes ?? '',
        sleepNotes: member.sleepNotes ?? '',
        position: member.position ?? snap.members.length,
      };
      voyageStore.save({ ...snap, members: [...snap.members, row] });
      return row;
    },

    async updateMember(memberId, patch) {
      const snap = voyageStore.load();
      const idx = snap.members.findIndex(m => m.id === memberId);
      if (idx < 0) throw new Error(`membre inconnu: ${memberId}`);
      const prev = snap.members[idx]!;
      const row: HouseholdMember = { ...prev, ...patch };
      const members = snap.members.slice();
      members[idx] = row;
      voyageStore.save({ ...snap, members });
      return row;
    },

    async createTrip(householdId, title) {
      const snap = voyageStore.load();
      const trip: Trip = {
        id: createId('trip'),
        householdId,
        title: title.trim(),
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
        createdAt: now(),
        updatedAt: now(),
      };
      let next: VoyageSnapshot = {
        ...snap,
        trips: [
          trip,
          ...snap.trips.map(t =>
            t.householdId === householdId ? { ...t, isCurrent: false } : t
          ),
        ],
      };
      next = withSteps(trip.id, next);
      next = decide(next, trip.id, 'destination', 'Voyage créé');
      voyageStore.save(next);
      return trip;
    },

    async updateTrip(tripId, patch) {
      const snap = voyageStore.load();
      const trips = snap.trips.map(t =>
        t.id === tripId ? { ...t, ...patch, updatedAt: now() } : t
      );
      voyageStore.save({ ...snap, trips });
      return trips.find(t => t.id === tripId)!;
    },

    async setStepStatus(tripId, stepKey, status) {
      let snap = withSteps(tripId, voyageStore.load());
      snap = {
        ...snap,
        steps: snap.steps.map(s =>
          s.tripId === tripId && s.stepKey === stepKey ? { ...s, status } : s
        ),
      };
      snap = decide(snap, tripId, stepKey, `Étape ${stepKey} → ${status}`);
      voyageStore.save(snap);
    },

    async runSuggestQuestions(tripId) {
      const snap = voyageStore.load();
      const trip = snap.trips.find(t => t.id === tripId);
      if (!trip) throw new Error('voyage introuvable');
      const members = snap.members.filter(
        m => m.householdId === trip.householdId
      );
      const generated = suggestSpecQuestions({ trip, members });
      const withoutOpen = snap.questions.filter(
        q => !(q.tripId === tripId && q.status === 'open')
      );
      voyageStore.save({
        ...snap,
        questions: [...generated, ...withoutOpen],
      });
      return generated;
    },

    async answerQuestion(questionId, answer, status = 'answered') {
      const snap = voyageStore.load();
      voyageStore.save({
        ...snap,
        questions: snap.questions.map(q =>
          q.id === questionId ? { ...q, answer, status } : q
        ),
      });
    },

    async addFlight(option) {
      const snap = voyageStore.load();
      const row: FlightOption = {
        ...option,
        id: createId('flt'),
        origin: option.origin ?? '',
        destination: option.destination ?? '',
        departAt: option.departAt ?? null,
        returnAt: option.returnAt ?? null,
        stops: option.stops ?? 0,
        price: option.price ?? null,
        currency: option.currency ?? 'EUR',
        baggageNotes: option.baggageNotes ?? '',
        sourceUrl: option.sourceUrl ?? '',
        rawPaste: option.rawPaste ?? '',
      };
      voyageStore.save({ ...snap, flights: [...snap.flights, row] });
      return row;
    },

    async chooseFlight(tripId, flightOptionId) {
      let snap = voyageStore.load();
      snap = {
        ...snap,
        flightChoices: { ...snap.flightChoices, [tripId]: flightOptionId },
      };
      snap = decide(snap, tripId, 'flights', 'Vol retenu');
      voyageStore.save(snap);
    },

    async runProposeStyle(tripId) {
      const snap = voyageStore.load();
      const trip = snap.trips.find(t => t.id === tripId);
      if (!trip) throw new Error('voyage introuvable');
      const members = snap.members.filter(
        m => m.householdId === trip.householdId
      );
      return proposeItineraryStyle({ trip, members });
    },

    async setStyle(tripId, style, notes = '') {
      let snap = voyageStore.load();
      snap = {
        ...snap,
        trips: snap.trips.map(t =>
          t.id === tripId
            ? { ...t, style, styleNotes: notes, updatedAt: now() }
            : t
        ),
      };
      snap = decide(snap, tripId, 'style', `Style ${style}`);
      voyageStore.save(snap);
    },

    async runProposePois(tripId) {
      const snap = voyageStore.load();
      const trip = snap.trips.find(t => t.id === tripId);
      if (!trip) throw new Error('voyage introuvable');
      const members = snap.members.filter(
        m => m.householdId === trip.householdId
      );
      const generated = proposePois({ trip, members });
      voyageStore.save({
        ...snap,
        pois: [
          ...generated,
          ...snap.pois.filter(p => p.tripId !== tripId || p.source !== 'ai'),
        ],
      });
      return generated;
    },

    async addPoi(poi) {
      const snap = voyageStore.load();
      const row: PoiCandidate = {
        ...poi,
        id: createId('poi'),
        zone: poi.zone ?? '',
        durationHours: poi.durationHours ?? null,
        minAge: poi.minAge ?? null,
        seasonNotes: poi.seasonNotes ?? '',
        costBand: poi.costBand ?? 'unknown',
        whyMatch: poi.whyMatch ?? '',
        source: poi.source ?? 'manual',
      };
      voyageStore.save({ ...snap, pois: [...snap.pois, row] });
      return row;
    },

    async votePoi(poiId, vote) {
      const snap = voyageStore.load();
      const others = snap.votes.filter(
        v => !(v.poiId === poiId && v.userId === LOCAL_USER)
      );
      voyageStore.save({
        ...snap,
        votes: [...others, { poiId, userId: LOCAL_USER, vote }],
      });
    },

    async listArtifacts(tripId) {
      return voyageStore.load().artifacts.filter(a => a.tripId === tripId);
    },
  };
}
