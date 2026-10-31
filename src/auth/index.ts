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
import {
  navigateurHorsLigne,
  storedSupabaseSession,
} from '@mister-guiiug/dev-pwa-config/auth/stored-session';
import { useAuthContext } from '@mister-guiiug/dev-pwa-config/react/auth-provider';
import { supabase } from '../backend/supabase.ts';
import { coverage } from '../backend/index.ts';

type AuthApi = SupabaseClient['auth'];

async function apiAuth(): Promise<AuthApi> {
  // La fabrique ne publie que `SupabaseLike` ; le SDK réel porte toute l’API auth.
  const client = (await supabase.getClient()) as unknown as SupabaseClient;
  return client.auth;
}

/**
 * Client paresseux : méthodes async, SAUF l’abonnement — rendu synchrone avec
 * abonnement différé quand le SDK arrive.
 */
function sdkALaDemande(): { auth: object } {
  const auth = {
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
     */
    signOut: async (opts?: { scope?: 'local' | 'global' }) =>
      (await apiAuth()).signOut({ ...opts, scope: 'local' }),
  };
  return { auth };
}

/**
 * Hors ligne, un `SIGNED_OUT` sans session effacée du stockage n’est PAS une
 * déconnexion réelle (renouvellement de jeton abandonné) — on l’ignore.
 */
function avecLaGardeHorsLigne(
  adaptateur: SupabaseAuthAdapter
): SupabaseAuthAdapter {
  return {
    ...adaptateur,
    onAuthStateChange: callback =>
      adaptateur.onAuthStateChange((event, session) => {
        if (!session && navigateurHorsLigne() && storedSupabaseSession()) {
          return;
        }
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

/** Où le lien magique ramène — origine servie + base Vite. */
export function adresseDeRetour(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`;
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
