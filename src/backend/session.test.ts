import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  caseDeSession,
  identifiantDeSession,
  identifiantRange,
} from './session.ts';

/**
 * QUI EST CONNECTÉ, SANS LE DEMANDER AU RÉSEAU — et dans la session de CE
 * projet : toutes les apps de la famille partagent une origine, donc un
 * `localStorage`.
 */

const URL_PROJET = 'https://abcdefghijklmnop.supabase.co';
const CASE = 'sb-abcdefghijklmnop-auth-token';

const session = (id: string, expiresAt = 4_102_444_800) =>
  JSON.stringify({
    access_token: 'a',
    refresh_token: 'r',
    expires_at: expiresAt,
    user: { id },
  });

afterEach(() => {
  delete (navigator as { onLine?: boolean }).onLine;
  localStorage.clear();
  vi.unstubAllEnvs();
});

describe('caseDeSession', () => {
  it('est la case où le SDK installé range la session', () => {
    // La formule est DÉRIVÉE, pas lue : c'est ce test qui verra une montée du
    // SDK qui la changerait.
    const client = createClient(URL_PROJET, 'cle-anon-de-test', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const range = (client.auth as unknown as { storageKey: string }).storageKey;
    expect(caseDeSession(URL_PROJET)).toBe(range);
    expect(range).toBe(CASE);
  });

  it('sans URL de projet, il n’y a pas de case', () => {
    expect(caseDeSession('')).toBeNull();
    expect(caseDeSession('pas une url')).toBeNull();
  });
});

describe('identifiantRange', () => {
  it('lit la session de CE projet, jamais celle d’une sœur de la même origine', () => {
    localStorage.setItem('sb-uneautreapp-auth-token', session('u-soeur'));
    expect(identifiantRange(URL_PROJET)).toBeNull();

    localStorage.setItem(CASE, session('u-moi'));
    expect(identifiantRange(URL_PROJET)).toBe('u-moi');
  });

  it('périmée, elle compte encore : hors ligne, une heure passée ne déconnecte pas', () => {
    localStorage.setItem(CASE, session('u-moi', 1));
    expect(identifiantRange(URL_PROJET)).toBe('u-moi');
  });

  it('illisible, elle ne compte pas', () => {
    localStorage.setItem(CASE, '{tronqué');
    expect(identifiantRange(URL_PROJET)).toBeNull();
  });
});

describe('identifiantDeSession', () => {
  const horsLigne = () =>
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });

  it('hors ligne, ne demande rien au SDK', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', URL_PROJET);
    localStorage.setItem(CASE, session('u-moi', 1));
    horsLigne();
    const sdk = vi.fn(async () => null);
    expect(await identifiantDeSession(sdk)).toBe('u-moi');
    expect(sdk).not.toHaveBeenCalled();
  });

  it('en ligne, croit le SDK — y compris quand il dit « personne »', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', URL_PROJET);
    localStorage.setItem(CASE, session('u-moi'));
    expect(await identifiantDeSession(async () => 'u-moi')).toBe('u-moi');
    expect(await identifiantDeSession(async () => null)).toBeNull();
  });

  it('le SDK lève (renouvellement impossible) : le stockage', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', URL_PROJET);
    localStorage.setItem(CASE, session('u-moi', 1));
    const echoue = async (): Promise<string | null> => {
      throw new Error('AuthRetryableFetchError');
    };
    expect(await identifiantDeSession(echoue)).toBe('u-moi');
  });

  it('le SDK ne répond pas (portail captif) : le stockage, après l’attente', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', URL_PROJET);
    localStorage.setItem(CASE, session('u-moi', 1));
    const muet = () => new Promise<string | null>(() => {});
    expect(await identifiantDeSession(muet, 10)).toBe('u-moi');
  });
});
