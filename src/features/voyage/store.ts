import { create } from 'zustand';
import { createLogger } from '@mister-guiiug/dev-pwa-config/logger';
import { backend } from '../../backend/index.ts';
import {
  emptyVoyageSnapshot,
  type VoyageSnapshot,
} from '../../entities/schemas.ts';
import type { StyleProposal } from '../../entities/ai-tools.ts';

const log = createLogger('voyage');

type VoyageState = VoyageSnapshot & {
  ready: boolean;
  error: string | null;
  styleProposals: StyleProposal[];
  load: () => Promise<void>;
  createHousehold: (name: string) => Promise<string>;
  createInvite: (householdId: string) => Promise<string>;
  acceptInvite: (token: string) => Promise<void>;
  addMember: (
    householdId: string,
    displayName: string,
    ageBand?: string
  ) => Promise<void>;
  createTrip: (householdId: string, title: string) => Promise<string>;
  updateTrip: (
    tripId: string,
    patch: Parameters<typeof backend.voyage.updateTrip>[1]
  ) => Promise<void>;
  setStepStatus: (
    tripId: string,
    stepKey: Parameters<typeof backend.voyage.setStepStatus>[1],
    status: Parameters<typeof backend.voyage.setStepStatus>[2]
  ) => Promise<void>;
  suggestQuestions: (tripId: string) => Promise<void>;
  answerQuestion: (id: string, answer: string) => Promise<void>;
  addFlight: (
    tripId: string,
    label: string,
    extras?: {
      origin?: string;
      destination?: string;
      price?: number | null;
      rawPaste?: string;
    }
  ) => Promise<void>;
  chooseFlight: (tripId: string, flightId: string) => Promise<void>;
  proposeStyles: (tripId: string) => Promise<void>;
  setStyle: (
    tripId: string,
    style: 'hub' | 'roadtrip' | 'undecided',
    notes?: string
  ) => Promise<void>;
  proposePois: (tripId: string) => Promise<void>;
  votePoi: (
    poiId: string,
    vote: 'interested' | 'maybe' | 'no'
  ) => Promise<void>;
};

async function refresh(set: (p: Partial<VoyageState>) => void) {
  const snap = await backend.voyage.load();
  set({ ...snap, ready: true, error: null });
}

export const useVoyage = create<VoyageState>((set, get) => ({
  ...emptyVoyageSnapshot(),
  ready: false,
  error: null,
  styleProposals: [],

  load: async () => {
    try {
      await refresh(set);
    } catch (cause) {
      log.error('lecture voyage', { cause });
      set({ error: String(cause), ready: true });
    }
  },

  createHousehold: async name => {
    const hh = await backend.voyage.createHousehold(name);
    await refresh(set);
    return hh.id;
  },

  createInvite: async householdId => {
    const { token } = await backend.voyage.createInvite(householdId);
    await refresh(set);
    return token;
  },

  acceptInvite: async token => {
    await backend.voyage.acceptInvite(token);
    await refresh(set);
  },

  addMember: async (householdId, displayName, ageBand = 'adult') => {
    await backend.voyage.addMember({
      householdId,
      displayName,
      ageBand: ageBand as 'adult',
      mobilityNotes: '',
      foodNotes: '',
      sleepNotes: '',
      interests: [],
      position: get().members.length,
    });
    await refresh(set);
  },

  createTrip: async (householdId, title) => {
    const trip = await backend.voyage.createTrip(householdId, title);
    await refresh(set);
    return trip.id;
  },

  updateTrip: async (tripId, patch) => {
    await backend.voyage.updateTrip(tripId, patch);
    await refresh(set);
  },

  setStepStatus: async (tripId, stepKey, status) => {
    await backend.voyage.setStepStatus(tripId, stepKey, status);
    await refresh(set);
  },

  suggestQuestions: async tripId => {
    await backend.voyage.runSuggestQuestions(tripId);
    await refresh(set);
  },

  answerQuestion: async (id, answer) => {
    await backend.voyage.answerQuestion(id, answer, 'answered');
    await refresh(set);
  },

  addFlight: async (tripId, label, extras = {}) => {
    await backend.voyage.addFlight({
      tripId,
      label,
      origin: extras.origin ?? '',
      destination: extras.destination ?? '',
      departAt: null,
      returnAt: null,
      stops: 0,
      price: extras.price ?? null,
      currency: 'EUR',
      baggageNotes: '',
      sourceUrl: '',
      rawPaste: extras.rawPaste ?? '',
    });
    await refresh(set);
  },

  chooseFlight: async (tripId, flightId) => {
    await backend.voyage.chooseFlight(tripId, flightId);
    await refresh(set);
  },

  proposeStyles: async tripId => {
    const styleProposals = await backend.voyage.runProposeStyle(tripId);
    set({ styleProposals });
  },

  setStyle: async (tripId, style, notes) => {
    await backend.voyage.setStyle(tripId, style, notes);
    await refresh(set);
  },

  proposePois: async tripId => {
    await backend.voyage.runProposePois(tripId);
    await refresh(set);
  },

  votePoi: async (poiId, vote) => {
    await backend.voyage.votePoi(poiId, vote);
    await refresh(set);
  },
}));
