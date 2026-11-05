import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider } from '@mister-guiiug/dev-pwa-config/react/auth-provider';
import type { SupabaseAuthAdapter } from '@mister-guiiug/dev-pwa-config/auth/supabase';
import { copies } from '../backend/dernier-etat.ts';
import { avecLaGardeHorsLigne, useRole } from './index.ts';

/**
 * Ce que ce test fige : `useRole()` lit le rôle DANS LE JETON — et rien
 * d'autre. Jusqu'au 05/09/2026, rien n'écrivait `app_metadata.roles` ; le
 * badge admin ne pouvait jamais s'afficher, et ce test n'existait pas. Le
 * hook de `0004_role_dans_le_jeton.sql` recopie désormais `user_roles` dans
 * le jeton ; la moitié SQL est prouvée en pgTAP, celle-ci en est le crochet.
 */
function adapterAvec(session: unknown) {
  return {
    getSession: async () => session,
    onAuthStateChange: () => () => {},
  };
}

function wrapperPour(session: unknown) {
  const adapter = adapterAvec(session);
  return ({ children }: { children: ReactNode }) => (
    <AuthProvider adapter={adapter}>{children}</AuthProvider>
  );
}

describe('useRole', () => {
  it('voit un administrateur quand le jeton porte le rôle', async () => {
    const { result } = renderHook(() => useRole(), {
      wrapper: wrapperPour({
        user: { id: 'u1', app_metadata: { roles: ['admin'] } },
      }),
    });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.admin).toBe(true);
  });

  it('ne voit rien sans rôle — un tableau vide, ou un jeton muet', async () => {
    const vide = renderHook(() => useRole(), {
      wrapper: wrapperPour({ user: { id: 'u2', app_metadata: { roles: [] } } }),
    });
    await waitFor(() => expect(vide.result.current.ready).toBe(true));
    expect(vide.result.current.admin).toBe(false);

    // Le jeton d'un projet où le hook n'est PAS activé : `roles` absent.
    // C'est le cas silencieux que le README demande de régler à la main.
    const muet = renderHook(() => useRole(), {
      wrapper: wrapperPour({ user: { id: 'u3', app_metadata: {} } }),
    });
    await waitFor(() => expect(muet.result.current.ready).toBe(true));
    expect(muet.result.current.admin).toBe(false);
  });
});

/**
 * La garde hors ligne : un `SIGNED_OUT` émis hors ligne alors que la session
 * est encore rangée n'est qu'un renouvellement de jeton abandonné. Ce qui est
 * figé ici : la session regardée est celle de CE projet — la famille partage
 * une origine — et une vraie déconnexion emporte les copies hors ligne.
 */
describe('la garde hors ligne de l’adaptateur', () => {
  const URL_PROJET = 'https://abcdefghijklmnop.supabase.co';
  const session = (id: string) =>
    JSON.stringify({
      access_token: 'a',
      refresh_token: 'r',
      expires_at: 1,
      user: { id },
    });

  function garde() {
    let emettre: (event: string, session: unknown) => void = () => {};
    const adaptateur = {
      getSession: async () => null,
      onAuthStateChange: (cb: typeof emettre) => {
        emettre = cb;
        return () => {};
      },
    } as unknown as SupabaseAuthAdapter;
    const recu = vi.fn();
    avecLaGardeHorsLigne(adaptateur).onAuthStateChange(recu);
    return { recu, emettre: (event: string) => emettre(event, null) };
  }

  function horsLigne() {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
  }

  afterEach(() => {
    delete (navigator as { onLine?: boolean }).onLine;
    localStorage.clear();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('une vraie déconnexion passe, et purge les copies hors ligne', () => {
    const purge = vi.spyOn(copies, 'clear');
    const { recu, emettre } = garde();
    emettre('SIGNED_OUT');
    expect(recu).toHaveBeenCalledWith('SIGNED_OUT', null);
    expect(purge).toHaveBeenCalled();
  });

  it('hors ligne, la session de CE projet encore rangée : ignorée', () => {
    vi.stubEnv('VITE_SUPABASE_URL', URL_PROJET);
    localStorage.setItem('sb-abcdefghijklmnop-auth-token', session('u-moi'));
    const purge = vi.spyOn(copies, 'clear');
    horsLigne();
    const { recu, emettre } = garde();
    emettre('SIGNED_OUT');
    expect(recu).not.toHaveBeenCalled();
    expect(purge).not.toHaveBeenCalled();
  });

  it('hors ligne, seule la session d’une AUTRE app de la famille : la déconnexion passe', () => {
    vi.stubEnv('VITE_SUPABASE_URL', URL_PROJET);
    localStorage.setItem('sb-uneautreapp-auth-token', session('u-soeur'));
    horsLigne();
    const { recu, emettre } = garde();
    emettre('SIGNED_OUT');
    expect(recu).toHaveBeenCalledWith('SIGNED_OUT', null);
  });
});
