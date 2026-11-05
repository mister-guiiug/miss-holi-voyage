import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { idbEnMemoire } from '../test/idb-en-memoire.ts';
import { purgerCopies, useCopie } from './dernier-etat.ts';
import { createSupabaseNotes, supabase } from './supabase.ts';

/**
 * LES NOTES HORS LIGNE : LA DERNIÈRE LISTE LUE, OU UNE ERREUR — JAMAIS `[]`.
 *
 * Une liste vide se lit « tout est effacé ». C'est ce que rendait l'adaptateur
 * quand `getUser()`, qui interroge le serveur, répondait « personne » faute de
 * réseau. Le client de comptoir fait de même.
 */

const URL_PROJET = 'https://abcdefghijklmnop.supabase.co';
const CASE = 'sb-abcdefghijklmnop-auth-token';

const NOTE = {
  id: 'note_1',
  text: 'passeports à renouveler',
  created_at: '2026-11-01T10:00:00.000Z',
};

function horsLigne(coupe: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    get: () => !coupe,
  });
}

function clientFactice() {
  const issue = Promise.resolve({ data: [NOTE], error: null });
  return {
    auth: {
      getUser: async () => ({
        data: { user: navigator.onLine ? { id: 'u-moi' } : null },
      }),
      getSession: async () => ({
        data: { session: { user: { id: 'u-moi' } } },
        error: null,
      }),
    },
    from: () => ({ select: () => ({ order: () => issue }) }),
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv('VITE_SUPABASE_URL', URL_PROJET);
  localStorage.setItem(
    CASE,
    JSON.stringify({
      access_token: 'a',
      refresh_token: 'r',
      expires_at: 1,
      user: { id: 'u-moi' },
    })
  );
  vi.spyOn(supabase, 'getClient').mockResolvedValue(clientFactice() as never);
  useCopie.setState({ voyage: null, notes: null });
});

afterEach(() => {
  delete (navigator as { onLine?: boolean }).onLine;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('notes distantes, hors ligne', () => {
  it('rendent la dernière liste lue, pas une liste vide', async () => {
    const notes = createSupabaseNotes({ idb: idbEnMemoire() });
    horsLigne(false);
    await notes.load();

    horsLigne(true);
    const relu = await notes.load();
    expect(relu.notes.map(n => n.text)).toEqual(['passeports à renouveler']);
    expect(useCopie.getState().notes).not.toBeNull();
  });

  it('sans copie, échouent — et l’écran le dit', async () => {
    const notes = createSupabaseNotes({ idb: idbEnMemoire() });
    horsLigne(true);
    await expect(notes.load()).rejects.toMatchObject({
      name: 'HorsLigneError',
    });
  });

  it('la déconnexion emporte la copie', async () => {
    const idb = idbEnMemoire();
    const notes = createSupabaseNotes({ idb });
    horsLigne(false);
    await notes.load();
    expect(idb.valeurs.size).toBe(1);

    await purgerCopies(idb);
    horsLigne(true);
    expect(idb.valeurs.size).toBe(0);
    await expect(notes.load()).rejects.toMatchObject({
      name: 'HorsLigneError',
    });
  });
});
