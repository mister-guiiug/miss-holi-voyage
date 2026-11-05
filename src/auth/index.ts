/**
 * Couche auth : SDK à la demande + abonnement synchrone.
 *
 * Le Proxy « tout async » du squelette cassait `onAuthStateChange` : le port
 * attend un désabonnement synchrone, recevait une Promise, et ni connexion
 * ni déconnexion ne mettaient à jour l’UI. Motif repris de miss-lookhouse
 * (ADR 0009 / garde hors ligne).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  supabaseAuthAdapter,
  type SupabaseAuthAdapter,
} from '@mister-guiiug/dev-pwa-config/auth/supabase';
import { navigateurHorsLigne } from '@mister-guiiug/dev-pwa-config/auth/stored-session';
import { useAuthContext } from '@mister-guiiug/dev-pwa-config/react/auth-provider';
import { supabase } from '../backend/supabase.ts';
import { coverage } from '../backend/index.ts';
import { purgerCopies } from '../backend/dernier-etat.ts';
import { identifiantRange } from '../backend/session.ts';

type AuthApi = SupabaseClient['auth'];

async function apiAuth(): Promise<AuthApi> {
  // La fabrique ne publie que `SupabaseLike` ; le SDK réel porte toute l’API auth.
  const client = (await supabase.getClient()) as unknown as SupabaseClient;
  return client.auth;
}

/**
 * Client paresseux : méthodes async, SAUF l’abonnement — rendu synchrone avec
 * abonnement différé quand le SDK arrive.
 *
 * SA CASE DE SESSION AUSSI EST SYNCHRONE (`storageKey`) : hors ligne,
 * l’adaptateur du socle lit la session sans appeler le SDK, et sans ce nom il
 * prendrait la première case `sb-*` d’un `localStorage` que toute la famille
 * partage — peut-être la session d’une autre app. La fabrique la connaît
 * avant le SDK (socle 6.31.0).
 */
function sdkALaDemande(): { auth: object } {
  const auth = {
    get storageKey() {
      return supabase.storageKey();
    },
    getSession: async () => (await apiAuth()).getSession(),
    onAuthStateChange: (
      callback: Parameters<AuthApi['onAuthStateChange']>[0]
    ) => {
      let abonnement: { unsubscribe: () => void } | null = null;
      let annule = false;
      apiAuth()
        .then(api => {
          if (annule) return;
          abonnement = api.onAuthStateChange(callback).data.subscription;
        })
        .catch(() => {
          /* SDK indisponible : getSession lira le stockage local. */
        });
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              annule = true;
              abonnement?.unsubscribe();
            },
          },
        },
      };
    },
    signInWithPassword: async (
      credentials: Parameters<AuthApi['signInWithPassword']>[0]
    ) => (await apiAuth()).signInWithPassword(credentials),
    signInWithOtp: async (
      credentials: Parameters<AuthApi['signInWithOtp']>[0]
    ) => (await apiAuth()).signInWithOtp(credentials),
    signUp: async (credentials: Parameters<AuthApi['signUp']>[0]) =>
      (await apiAuth()).signUp(credentials),
    signInAnonymously: async () => (await apiAuth()).signInAnonymously(),
    /**
     * Toujours locale : la globale exige le réseau et laisse la session
     * ouverte hors ligne. Même contrainte que `delete-account.ts`.
     *
     * Et elle emporte les copies hors ligne du foyer et des notes (ADR
     * 0016) : sur un appareil partagé, le compte suivant ne doit pas les
     * relire. L'évènement `SIGNED_OUT` purge aussi, mais il n'arrive qu'à un
     * abonné — le geste explicite ne dépend pas de lui.
     */
    signOut: async (opts?: { scope?: 'local' | 'global' }) => {
      const issue = await (
        await apiAuth()
      ).signOut({ ...opts, scope: 'local' });
      await purgerCopies();
      return issue;
    },
  };
  return { auth };
}

/**
 * Hors ligne, un `SIGNED_OUT` sans session effacée du stockage n’est PAS une
 * déconnexion réelle (renouvellement de jeton abandonné) — on l’ignore.
 *
 * LA SESSION DE CE PROJET, PAS CELLE D'UNE SŒUR : `storedSupabaseSession()`
 * du socle rend la première case `sb-*-auth-token` venue, et la famille
 * partage une origine. Une vraie déconnexion hors ligne était ignorée dès
 * qu'une autre app du parc avait une session sur l'appareil.
 *
 * Une déconnexion RÉELLE — geste, jeton révoqué, compte supprimé — purge les
 * copies hors ligne (ADR 0016).
 *
 * Exporté pour `index.test.tsx`.
 */
export function avecLaGardeHorsLigne(
  adaptateur: SupabaseAuthAdapter
): SupabaseAuthAdapter {
  return {
    ...adaptateur,
    onAuthStateChange: callback =>
      adaptateur.onAuthStateChange((event, session) => {
        if (!session && navigateurHorsLigne() && identifiantRange()) {
          return;
        }
        if (event === 'SIGNED_OUT') void purgerCopies();
        callback(event, session);
      }),
  };
}

let cache: SupabaseAuthAdapter | null | undefined;

export function authAdapter(): SupabaseAuthAdapter | null {
  if (cache !== undefined) return cache;
  if (coverage.kind !== 'supabase') {
    cache = null;
    return cache;
  }
  cache = avecLaGardeHorsLigne(
    supabaseAuthAdapter({ client: sdkALaDemande() })
  );
  return cache;
}

/**
 * Où le lien magique ramène.
 *
 * Calculé depuis l’origine SERVIE (jamais une constante) : le même bundle
 * tourne en local et sur Pages. Doit figurer dans Authentication → URL
 * Configuration du projet Supabase ; sans ça, GoTrue substitue le `Site URL`
 * (souvent encore `http://localhost:3000` à la création) et le PKCE échoue
 * avec `otp_expired` / `access_denied` sur le mauvais port.
 *
 * On vise `/compte` : l’échange `?code=` et le retour connecté y sont visibles.
 */
export function adresseDeRetour(): string {
  const base = import.meta.env.BASE_URL || '/';
  const root = new URL(base, window.location.origin);
  return new URL('compte', root).href;
}

/** Erreurs Auth présentes dans l’URL après un lien magique refusé. */
export function lireErreurAuthDansUrl(
  href: string = typeof window !== 'undefined' ? window.location.href : ''
): { code: string; description: string } | null {
  if (!href) return null;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const fromSearch = url.searchParams;
  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  const fromHash = new URLSearchParams(hash);
  const code =
    fromSearch.get('error_code') ||
    fromHash.get('error_code') ||
    fromSearch.get('error') ||
    fromHash.get('error');
  if (!code) return null;
  const description =
    fromSearch.get('error_description') ||
    fromHash.get('error_description') ||
    code;
  return { code, description: description.replace(/\+/g, ' ') };
}

/** Retire les paramètres d’erreur Auth de la barre d’adresse. */
export function nettoyerErreurAuthDansUrl(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  let changed = false;
  for (const key of [
    'error',
    'error_code',
    'error_description',
    'sb',
  ] as const) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (url.hash.includes('error')) {
    url.hash = '';
    changed = true;
  }
  if (changed) {
    window.history.replaceState(
      {},
      '',
      `${url.pathname}${url.search}${url.hash}`
    );
  }
}

export function useRole(): { admin: boolean; ready: boolean } {
  const { user, ready } = useAuthContext<unknown, Utilisateur>();
  const roles = user?.app_metadata?.roles;
  return {
    admin: Array.isArray(roles) && roles.includes('admin'),
    ready,
  };
}

interface Utilisateur {
  app_metadata?: { roles?: unknown };
}
