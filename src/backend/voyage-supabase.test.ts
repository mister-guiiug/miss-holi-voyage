import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { idbEnMemoire } from '../test/idb-en-memoire.ts';
import { useCopie } from './dernier-etat.ts';
import { supabase } from './supabase.ts';
import { createLocalVoyage } from './voyage-local.ts';
import { createSupabaseVoyage } from './voyage-supabase.ts';

/**
 * CE QUE CES TESTS FIGENT (ADR 0016) : connecté veut dire DISTANT, réseau ou
 * pas. Hors ligne, le foyer affiché est la dernière copie lue au serveur ; une
 * écriture est refusée ; et le magasin de l'appareil — celui de la personne
 * sans compte — n'est jamais lu ni écrit à sa place.
 *
 * Le défaut d'origine : la session se demandait au SERVEUR (`getUser()`), qui
 * hors ligne répond « personne ». Le client de comptoir ci-dessous fait de
 * même, pour que ces tests disent ce que l'ancienne voie aurait fait.
 */

const URL_PROJET = 'https://abcdefghijklmnop.supabase.co';
const CASE = 'sb-abcdefghijklmnop-auth-token';
const UID = 'u-moi';

const FOYER = {
  id: 'h1',
  name: 'Foyer distant',
  notes: '',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

/** Coupe (ou rétablit) le réseau tel que le navigateur le déclare. */
function horsLigne(coupe: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    get: () => !coupe,
  });
}

/** La session que le SDK a rangée lors d'une visite en ligne. */
function sessionRangee() {
  localStorage.setItem(
    CASE,
    JSON.stringify({
      access_token: 'a',
      refresh_token: 'r',
      // Périmée depuis longtemps : hors ligne, ça ne dit rien de l'utilisateur.
      expires_at: 1,
      user: { id: UID },
    })
  );
}

/**
 * Un client Supabase de comptoir. `coupure` : le réseau tombe pendant
 * l'appel, navigateur toujours « en ligne » (portail captif).
 */
function clientFactice(options: { coupure?: boolean } = {}) {
  const repondre = (rows: unknown[]) =>
    options.coupure
      ? { data: null, error: { message: 'TypeError: Failed to fetch' } }
      : { data: rows, error: null };
  const requete = (rows: unknown[]) => {
    const issue = Promise.resolve(repondre(rows));
    return Object.assign(issue, { order: () => issue });
  };
  const tables: Record<string, unknown[]> = { households: [FOYER] };
  return {
    auth: {
      // Ce que fait le SDK : `getUser()` interroge le serveur.
      getUser: async () => ({
        data: { user: navigator.onLine ? { id: UID } : null },
      }),
      getSession: async () => {
        const brut = localStorage.getItem(CASE);
        return {
          data: { session: brut ? { user: { id: UID } } : null },
          error: null,
        };
      },
    },
    from: (table: string) => ({ select: () => requete(tables[table] ?? []) }),
    rpc: vi.fn(async () => ({
      data: null,
      error: { message: 'invitation expirée' },
    })),
  };
}

function monter(client: ReturnType<typeof clientFactice>) {
  vi.spyOn(supabase, 'getClient').mockResolvedValue(client as never);
  const local = createLocalVoyage();
  const espions = {
    load: vi.spyOn(local, 'load'),
    createTrip: vi.spyOn(local, 'createTrip'),
    acceptInvite: vi.spyOn(local, 'acceptInvite'),
  };
  const idb = idbEnMemoire();
  return {
    voyage: createSupabaseVoyage(local, { idb }),
    local: espions,
    idb,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv('VITE_SUPABASE_URL', URL_PROJET);
  useCopie.setState({ voyage: null, notes: null });
});

afterEach(() => {
  delete (navigator as { onLine?: boolean }).onLine;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('voyage connecté, hors ligne', () => {
  it('relit la dernière copie, datée — pas le magasin local', async () => {
    sessionRangee();
    const { voyage, local } = monter(clientFactice());

    horsLigne(false);
    expect((await voyage.load()).households.map(h => h.name)).toEqual([
      'Foyer distant',
    ]);
    expect(useCopie.getState().voyage).toBeNull();

    horsLigne(true);
    const relu = await voyage.load();
    expect(relu.households.map(h => h.name)).toEqual(['Foyer distant']);
    expect(useCopie.getState().voyage).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(local.load).not.toHaveBeenCalled();
  });

  it('sans copie : une erreur, pas un foyer vide ni celui de l’appareil', async () => {
    sessionRangee();
    const { voyage, local } = monter(clientFactice());
    horsLigne(true);

    await expect(voyage.load()).rejects.toMatchObject({
      name: 'HorsLigneError',
    });
    expect(local.load).not.toHaveBeenCalled();
  });

  it('une écriture est refusée, et rien n’atterrit sur l’appareil', async () => {
    sessionRangee();
    const { voyage, local } = monter(clientFactice());
    horsLigne(true);

    await expect(voyage.createTrip('h1', 'Été')).rejects.toMatchObject({
      name: 'HorsLigneError',
    });
    expect(local.createTrip).not.toHaveBeenCalled();
  });

  it('le réseau qui tombe en cours d’appel ressert aussi la copie', async () => {
    sessionRangee();
    horsLigne(false);
    const enLigne = monter(clientFactice());
    await enLigne.voyage.load();

    // Navigateur toujours « en ligne », mais rien ne passe.
    vi.spyOn(supabase, 'getClient').mockResolvedValue(
      clientFactice({ coupure: true }) as never
    );
    const relu = await enLigne.voyage.load();
    expect(relu.households.map(h => h.name)).toEqual(['Foyer distant']);
    expect(enLigne.local.load).not.toHaveBeenCalled();
  });

  it('la copie d’un compte ne sert pas à un autre', async () => {
    sessionRangee();
    horsLigne(false);
    const { voyage, idb } = monter(clientFactice());
    await voyage.load();
    expect([...idb.valeurs.keys()]).toEqual([`voyage:${UID}`]);
  });
});

describe('voyage connecté, en ligne', () => {
  it('acceptInvite : un refus distant reste un refus', async () => {
    sessionRangee();
    horsLigne(false);
    const { voyage, local } = monter(clientFactice());

    await expect(voyage.acceptInvite('ABCD-EFGH')).rejects.toThrow(
      'invitation expirée'
    );
    expect(local.acceptInvite).not.toHaveBeenCalled();
  });
});

describe('voyage sans compte', () => {
  it('reste sur le magasin de l’appareil, réseau ou pas', async () => {
    const { voyage, local } = monter(clientFactice());
    horsLigne(true);
    await voyage.load();
    expect(local.load).toHaveBeenCalled();
  });
});
