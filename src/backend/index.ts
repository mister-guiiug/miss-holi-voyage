import { createBackendSelector } from '@mister-guiiug/dev-pwa-config/backend';
import { createLogger } from '@mister-guiiug/dev-pwa-config/logger';
import { createLocalBackend } from './local.ts';
import { createLocalVoyage } from './voyage-local.ts';
import { createSupabaseNotes } from './supabase.ts';
import { createSupabaseVoyage } from './voyage-supabase.ts';
import { createQueuedNotes, type QueuedNotes } from './queued-notes.ts';
import type { Backend } from './ports.ts';

const log = createLogger('backend');

/**
 * LA FILE D'ÉCRITURES HORS LIGNE, s'il y a un réseau à traverser.
 *
 * Elle n'existe qu'en mode distant : entre l'application et `localStorage`,
 * il n'y a pas de réseau à attendre. `null` en local, et l'écran d'accueil
 * n'affiche alors aucun indicateur — il n'a rien à dire.
 */
let file: QueuedNotes | null = null;

/**
 * LE SÉLECTEUR DE BACKEND, DÉCLARÉ EN UNE FOIS.
 *
 * Trois règles, dans cet ordre : un choix explicite (`VITE_BACKEND`) gagne
 * toujours ; sinon la présence de toutes les variables requises décide ; sinon
 * on retombe sur le repli. Un choix explicite INCONNU est ignoré — mieux vaut
 * démarrer en local qu'échouer sur une faute de frappe dans un `.env`.
 *
 * **Le repli local n'est pas un détail.** Une app qui exige sa configuration
 * pour démarrer ne tourne ni hors ligne, ni en test, ni dans une CI sans
 * secrets, ni sur la page publique que quelqu'un ouvre sans compte.
 *
 * AJOUTER UN BACKEND DISTANT se fait ici, et seulement ici :
 *
 *     backends: {
 *       supabase: {
 *         requires: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
 *         create: (env, base) => ({ notes: createSupabaseNotes(env, base) }),
 *       },
 *     }
 *
 * `create` rend un objet PARTIEL : les ports non fournis restent ceux du repli.
 * C'est ce qui permet de migrer une app en production port par port, sans
 * attendre que tous les adaptateurs soient écrits.
 */
const selectBackend = createBackendSelector<Backend>({
  fallback: createLocalBackend,
  backends: {
    supabase: {
      // Les deux clés que le socle nomme lui-même (`SUPABASE_ENV_KEYS`).
      // Absente l'une des deux, ce backend n'est pas retenu et l'application
      // s'ouvre en local — sans erreur, et en le disant dans les réglages.
      requires: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
      // Ports distants : `notes` (file hors ligne) + `voyage` (foyers /
      // invitations collaboratives). Sans session, voyage retombe sur le
      // magasin local — mesuré : un SELECT notes en anon rendait 42501.
      //
      // L'ADAPTATEUR NOTES EST ENVELOPPÉ, PAS MODIFIÉ. `createQueuedNotes`
      // rend le même port et absorbe l'attente (ADR 0010).
      create: () => {
        file = createQueuedNotes(createSupabaseNotes());
        void file.start();
        return {
          notes: file.notes,
          voyage: createSupabaseVoyage(createLocalVoyage()),
        };
      },
    },
  },
  onFallback: ({ kind, missing, error }) => {
    log.warn('repli sur le backend local', { kind, missing, error });
  },
});

const selected = selectBackend(import.meta.env);

/** Le backend de l'application. */
export const backend = selected.backend;

/**
 * Où en est la migration : quels ports sont distants, lesquels sont restés
 * locaux. Une app à moitié migrée doit pouvoir le DIRE — c'est ce que l'écran
 * de réglages affiche, au lieu de laisser croire qu'un compte distant
 * fonctionne alors que tout est encore sur l'appareil.
 */
export const coverage = {
  kind: selected.kind,
  remote: selected.remote,
  local: selected.local,
};

/**
 * La file d'écritures du backend retenu, ou `null` quand il n'y a pas de
 * réseau à traverser. C'est ce que l'accueil observe pour dire « hors ligne »,
 * « N en attente » ou « refusée ».
 */
export const notesSync: QueuedNotes | null = file;

export type { Backend, Note, NotesSnapshot } from './ports.ts';
export { supabase } from './supabase.ts';
