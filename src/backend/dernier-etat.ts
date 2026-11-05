import { create } from 'zustand';
import type { z } from 'zod';
import { createIdb, type IdbStore } from '@mister-guiiug/dev-pwa-config/idb';
import { classifyBackendError } from '@mister-guiiug/dev-pwa-config/backend';
import { navigateurHorsLigne } from '@mister-guiiug/dev-pwa-config/auth/stored-session';

/**
 * LE DERNIER ÉTAT CONNU (ADR 0016) : chaque lecture distante réussie garde sa
 * réponse dans IndexedDB, datée, et la ressert QUAND LE RÉSEAU MANQUE —
 * jamais autrement. Le motif est celui de `mister-settle/src/backend/cached.ts`.
 *
 * AUCUN CACHE DU SERVICE WORKER NE COUVRE SUPABASE. Un commentaire l'affirmait
 * (« hors ligne, c'est le service worker qui répond ») : c'était faux, et c'est
 * ce qui laissait les notes rendre `[]` et le voyage retomber sur le magasin
 * local. La copie est ici, et l'écran sait qu'il la lit, et de quand.
 *
 * Ce qui ressort de la copie est REVALIDÉ par le schéma du port : une copie
 * écrite par une autre version de l'application ne passe pas.
 *
 * Les écritures ne passent jamais par ici : elles partent, attendent dans la
 * file (notes), ou sont refusées (voyage) — jamais servies depuis une copie.
 */

/** La base des copies. Le nom EST l'isolation : la famille partage l'origine. */
export const copies: IdbStore = createIdb('miss-holi-voyage-copies');

/** Les ports dont l'écran peut lire une copie. */
export type PortCopie = 'voyage' | 'notes';

/**
 * De quand date ce que l'écran montre, port par port : `null` = lu au serveur
 * (ou sur l'appareil, en local) ; une date ISO = la copie de ce moment-là.
 */
export const useCopie = create<Record<PortCopie, string | null>>(() => ({
  voyage: null,
  notes: null,
}));

function marquer(port: PortCopie, at: string | null): void {
  useCopie.setState({ [port]: at } as Partial<
    Record<PortCopie, string | null>
  >);
}

/**
 * CONNECTÉ, MAIS SANS RÉSEAU : ce qui ne peut pas partir le dit, plutôt que
 * d'atterrir ailleurs. Le message est pour le journal ; l'écran reconnaît la
 * classe et parle avec ses propres mots (`voyage.offline.*`).
 */
export class HorsLigneError extends Error {
  readonly code = 'hors-ligne';
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'HorsLigneError';
  }
}

/** La lecture a manqué le réseau — par opposition à un refus de la base. */
export function estCoupure(cause: unknown): boolean {
  if (cause instanceof HorsLigneError || navigateurHorsLigne()) return true;
  const message = cause instanceof Error ? cause.message : String(cause);
  return classifyBackendError(message) === 'network';
}

interface Enveloppe {
  at: string;
  data: unknown;
}

/**
 * Une lecture distante qui garde sa copie et la ressert hors ligne.
 *
 * `cle` nomme la copie ET son propriétaire (`voyage:<uid>`) : sur un appareil
 * partagé, un compte ne relit jamais celle d'un autre, même si la purge de la
 * déconnexion n'a pas eu lieu.
 *
 * HORS LIGNE DÉCLARÉ, on ne tente même pas : chaque appel PostgREST commence
 * par joindre le jeton, donc par `getSession()`, qui part renouveler un jeton
 * périmé pendant une demi-minute. Le navigateur sait déjà la réponse.
 */
export function avecDernierEtat<T>(options: {
  port: PortCopie;
  schema: z.ZodType<T>;
  lire: () => Promise<T>;
  idb?: IdbStore;
}): (cle: string) => Promise<T> {
  const { port, schema, lire, idb = copies } = options;

  const relire = async (cle: string, cause: unknown): Promise<T> => {
    const enveloppe = await idb.get<Enveloppe>(cle);
    const lu = enveloppe ? schema.safeParse(enveloppe.data) : null;
    if (!enveloppe || !lu?.success) {
      throw new HorsLigneError(
        `hors ligne : aucune copie de « ${port} » sur cet appareil`,
        { cause }
      );
    }
    marquer(port, enveloppe.at);
    return lu.data;
  };

  return async cle => {
    if (navigateurHorsLigne()) {
      return relire(cle, new HorsLigneError('navigateur hors ligne'));
    }
    let data: T;
    try {
      data = await lire();
    } catch (cause) {
      if (!estCoupure(cause)) throw cause;
      return relire(cle, cause);
    }
    await idb.set(cle, { at: new Date().toISOString(), data } as Enveloppe);
    marquer(port, null);
    return data;
  };
}

/**
 * LA DÉCONNEXION EMPORTE LES COPIES. Le cache d'une app ne tient pas compte
 * du compte qui l'a rempli : sans cette purge, le suivant sur un appareil
 * partagé relirait hors ligne le foyer du précédent.
 */
export async function purgerCopies(idb: IdbStore = copies): Promise<void> {
  await idb.clear();
  useCopie.setState({ voyage: null, notes: null });
}
