import { create } from 'zustand';
import { createLogger } from '@mister-guiiug/dev-pwa-config/logger';
import { backend } from '../../backend/index.ts';
import { HorsLigneError } from '../../backend/dernier-etat.ts';
import {
  emptyVoyageSnapshot,
  type VoyageSnapshot,
} from '../../entities/schemas.ts';
import type { StyleProposal } from '../../entities/ai-tools.ts';
import { ageBandFromBirthDate } from '../../entities/ticket-age.ts';
import type {
  MemberGender,
  MemberInterestId,
} from '../../entities/member-profile.ts';

const log = createLogger('voyage');

type VoyageState = VoyageSnapshot & {
  ready: boolean;
  /** Le dernier échec — lecture ou écriture —, affiché par `VoyageEtat`. */
  error: string | null;
  /**
   * Cet échec vient de la coupure (`HorsLigneError`) — en lisant (aucune
   * copie sur l'appareil) ou en écrivant (refusé) : connecté et sans réseau,
   * rien ne part. L'écran le dit avec ses mots, pas ceux du journal.
   */
  errorOffline: 'read' | 'write' | null;
  /**
   * La lecture a échoué et il n'y a rien à montrer : ni le foyer, ni « aucun
   * foyer » — qui se lirait « il n'existe pas » et inviterait à en recréer un.
   */
  unavailable: boolean;
  dismissError: () => void;
  styleProposals: StyleProposal[];
  load: () => Promise<void>;
  clear: () => Promise<void>;
  /** L'identifiant créé, ou `null` si l'écriture a échoué (voir `error`). */
  createHousehold: (name: string) => Promise<string | null>;
  updateHousehold: (
    householdId: string,
    patch: { name?: string; notes?: string }
  ) => Promise<void>;
  createInvite: (
    householdId: string
  ) => Promise<{ token: string; code: string; expiresAt: string }>;
  acceptInvite: (tokenOrCode: string) => Promise<void>;
  addMember: (
    householdId: string,
    displayName: string,
    opts?: {
      ageBand?: string;
      birthDate?: string | null;
      gender?: MemberGender;
      interests?: MemberInterestId[];
    }
  ) => Promise<void>;
  updateMember: (
    memberId: string,
    patch: {
      displayName?: string;
      birthDate?: string | null;
      ageBand?: 'infant' | 'child' | 'teen' | 'adult' | 'senior';
      gender?: MemberGender;
      interests?: MemberInterestId[];
    }
  ) => Promise<void>;
  /** L'identifiant créé, ou `null` si l'écriture a échoué (voir `error`). */
  createTrip: (householdId: string, title: string) => Promise<string | null>;
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

type Poser = (p: Partial<VoyageState>) => void;

async function refresh(set: Poser) {
  const snap = await backend.voyage.load();
  set({
    ...snap,
    ready: true,
    error: null,
    errorOffline: null,
    unavailable: false,
  });
}

/** L'échec tel que l'écran le porte. */
function echec(
  cause: unknown,
  pendant: 'read' | 'write'
): Partial<VoyageState> {
  return {
    error: cause instanceof Error ? cause.message : String(cause),
    errorOffline: cause instanceof HorsLigneError ? pendant : null,
  };
}

/**
 * UNE ÉCRITURE QUI ÉCHOUE SE VOIT. Les écrans appellent ces actions en
 * `void` : un rejet n'y avait aucun témoin, sinon la console — et, depuis
 * que connecté et hors ligne veut dire « refusé » (ADR 0016), le rapporteur
 * d'erreurs aurait reçu chaque geste fait sans réseau. L'échec est porté par
 * le magasin, que `VoyageEtat` affiche ; la promesse se résout.
 *
 * `acceptInvite`, `createInvite` et `clear` n'y passent pas : leurs écrans
 * attrapent le rejet et disent eux-mêmes ce qui s'est passé.
 */
async function ecrire(set: Poser, geste: () => Promise<void>): Promise<void> {
  try {
    await geste();
  } catch (cause) {
    if (cause instanceof HorsLigneError)
      log.warn('écriture refusée', { cause });
    else log.error('écriture voyage', { cause });
    set(echec(cause, 'write'));
  }
}

export const useVoyage = create<VoyageState>((set, get) => ({
  ...emptyVoyageSnapshot(),
  ready: false,
  error: null,
  errorOffline: null,
  unavailable: false,
  styleProposals: [],

  dismissError: () => set({ error: null, errorOffline: null }),

  load: async () => {
    try {
      await refresh(set);
    } catch (cause) {
      log.error('lecture voyage', { cause });
      set({ ...echec(cause, 'read'), ready: true, unavailable: true });
    }
  },

  clear: async () => {
    try {
      await backend.voyage.clear();
      await refresh(set);
    } catch (cause) {
      log.error('effacement voyage', { cause });
      set(echec(cause, 'write'));
      throw cause;
    }
  },

  createHousehold: async name => {
    let id: string | null = null;
    await ecrire(set, async () => {
      id = (await backend.voyage.createHousehold(name)).id;
      await refresh(set);
    });
    return id;
  },

  updateHousehold: async (householdId, patch) => {
    await ecrire(set, async () => {
      await backend.voyage.updateHousehold(householdId, patch);
      await refresh(set);
    });
  },

  createInvite: async householdId => {
    const invite = await backend.voyage.createInvite(householdId);
    await refresh(set);
    return invite;
  },

  acceptInvite: async tokenOrCode => {
    await backend.voyage.acceptInvite(tokenOrCode);
    await refresh(set);
  },

  addMember: async (householdId, displayName, opts = {}) => {
    const birthDate = opts.birthDate ?? null;
    const ageBand = birthDate
      ? ageBandFromBirthDate(birthDate)
      : ((opts.ageBand as 'adult') ?? 'adult');
    await ecrire(set, async () => {
      await backend.voyage.addMember({
        householdId,
        displayName,
        birthDate,
        ageBand,
        gender: opts.gender ?? 'unspecified',
        mobilityNotes: '',
        foodNotes: '',
        sleepNotes: '',
        interests: opts.interests ?? [],
        position: get().members.length,
      });
      await refresh(set);
    });
  },

  updateMember: async (memberId, patch) => {
    const next = { ...patch };
    if (patch.birthDate) {
      next.ageBand = ageBandFromBirthDate(patch.birthDate);
    }
    await ecrire(set, async () => {
      await backend.voyage.updateMember(memberId, next);
      await refresh(set);
    });
  },

  createTrip: async (householdId, title) => {
    let id: string | null = null;
    await ecrire(set, async () => {
      id = (await backend.voyage.createTrip(householdId, title)).id;
      await refresh(set);
    });
    return id;
  },

  updateTrip: async (tripId, patch) => {
    await ecrire(set, async () => {
      await backend.voyage.updateTrip(tripId, patch);
      await refresh(set);
    });
  },

  setStepStatus: async (tripId, stepKey, status) => {
    await ecrire(set, async () => {
      await backend.voyage.setStepStatus(tripId, stepKey, status);
      await refresh(set);
    });
  },

  suggestQuestions: async tripId => {
    await ecrire(set, async () => {
      await backend.voyage.runSuggestQuestions(tripId);
      await refresh(set);
    });
  },

  answerQuestion: async (id, answer) => {
    await ecrire(set, async () => {
      await backend.voyage.answerQuestion(id, answer, 'answered');
      await refresh(set);
    });
  },

  addFlight: async (tripId, label, extras = {}) => {
    await ecrire(set, async () => {
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
    });
  },

  chooseFlight: async (tripId, flightId) => {
    await ecrire(set, async () => {
      await backend.voyage.chooseFlight(tripId, flightId);
      await refresh(set);
    });
  },

  proposeStyles: async tripId => {
    await ecrire(set, async () => {
      const styleProposals = await backend.voyage.runProposeStyle(tripId);
      set({ styleProposals });
    });
  },

  setStyle: async (tripId, style, notes) => {
    await ecrire(set, async () => {
      await backend.voyage.setStyle(tripId, style, notes);
      await refresh(set);
    });
  },

  proposePois: async tripId => {
    await ecrire(set, async () => {
      await backend.voyage.runProposePois(tripId);
      await refresh(set);
    });
  },

  votePoi: async (poiId, vote) => {
    await ecrire(set, async () => {
      await backend.voyage.votePoi(poiId, vote);
      await refresh(set);
    });
  },
}));
