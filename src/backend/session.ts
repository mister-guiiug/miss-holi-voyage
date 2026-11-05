import { navigateurHorsLigne } from '@mister-guiiug/dev-pwa-config/auth/stored-session';

/**
 * QUI EST CONNECTÉ, SANS DEMANDER AU RÉSEAU (ADR 0016).
 *
 * Distant ou local : tout le port voyage se décide là-dessus. La question
 * passait par `auth.getUser()`, qui interroge le SERVEUR : hors ligne, elle
 * répondait « personne », et un utilisateur connecté lisait et écrivait en
 * silence dans le magasin de l'appareil — un foyer vide ou un autre, et des
 * créations qui ne partaient jamais.
 *
 * La réponse est rangée sur l'appareil, dans la session que le SDK y écrit.
 * `auth.getSession()` la lit, mais n'est pas une simple lecture : jeton
 * d'accès périmé — il ne vit qu'une heure — elle part le RENOUVELER, avec des
 * reprises pendant une trentaine de secondes. D'où les trois chemins de
 * `identifiantDeSession`, ceux de l'adaptateur du socle et de mister-settle.
 *
 * CE N'EST PAS UN CONTRÔLE D'ACCÈS. L'identifiant choisit le chemin et nomme
 * une copie locale ; ce que la base laisse lire ou écrire, c'est la RLS qui
 * le décide, à partir du jeton.
 */

/**
 * LA CASE DE CE PROJET, PAS LA PREMIÈRE VENUE.
 *
 * `storedSupabaseSession()` du socle rend la première case
 * `sb-<ref>-auth-token` qu'il trouve. Or toutes les applications de la
 * famille sont servies depuis la même origine, donc le même `localStorage` :
 * sur un appareil qui sert aussi à une autre app Supabase du parc, la session
 * lue pourrait être la sienne. Le nom se dérive donc de l'URL du projet,
 * comme le fait le SDK — et `session.test.ts` le confronte au SDK installé,
 * pour qu'une montée qui changerait la formule se voie.
 */
export function caseDeSession(
  url: string | undefined = import.meta.env.VITE_SUPABASE_URL
): string | null {
  if (!url) return null;
  try {
    return `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
  } catch {
    return null;
  }
}

/**
 * L'identifiant lu dans la session rangée sur l'appareil, PÉRIMÉE OU NON :
 * hors ligne, un jeton expiré ne dit rien de l'utilisateur, il dit qu'une
 * heure a passé. Best-effort : stockage refusé ou illisible → `null`.
 */
export function identifiantRange(
  url: string | undefined = import.meta.env.VITE_SUPABASE_URL
): string | null {
  const nom = caseDeSession(url);
  if (!nom) return null;
  try {
    const brut = globalThis.localStorage?.getItem(nom);
    if (!brut) return null;
    const session = JSON.parse(brut) as { user?: { id?: unknown } } | null;
    const id = session?.user?.id;
    return typeof id === 'string' && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

/**
 * Combien de temps attendre le SDK avant de se rabattre sur le stockage.
 * `navigator.onLine` ne protège que du cas franc : il est vrai derrière un
 * portail captif, où l'appel part et ne revient jamais — sans lever.
 */
const ATTENTE_MS = 5_000;

/** Marqueur d'attente dépassée, distinct de « personne ». */
const TROP_LONG = Symbol('attente dépassée');

/**
 * L'utilisateur connecté, ou `null`.
 *
 * @param demanderAuSdk `auth.getSession()` ramené à l'identifiant — injecté
 *   pour que la décision s'éprouve sans client ni réseau.
 */
export async function identifiantDeSession(
  demanderAuSdk: () => Promise<string | null>,
  attenteMs: number = ATTENTE_MS
): Promise<string | null> {
  // Hors ligne : ne rien demander, la réponse est déjà sur l'appareil.
  if (navigateurHorsLigne()) return identifiantRange();

  let minuteur: ReturnType<typeof setTimeout> | undefined;
  try {
    const issue = await Promise.race([
      demanderAuSdk(),
      new Promise<typeof TROP_LONG>(resoudre => {
        minuteur = setTimeout(() => resoudre(TROP_LONG), attenteMs);
      }),
    ]);
    return issue === TROP_LONG ? identifiantRange() : issue;
  } catch {
    // Renouvellement impossible : le stockage sait encore. Un jeton RÉVOQUÉ,
    // lui, a déjà été retiré du stockage par le SDK — et rend `null`.
    return identifiantRange();
  } finally {
    clearTimeout(minuteur);
  }
}
