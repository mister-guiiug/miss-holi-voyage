/**
 * Code d’invitation court et lisible (XXXX-XXXX), alphabet sans ambiguïté
 * (pas de 0/O/1/I). Distinct du jeton cryptographique stocké à côté.
 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function createInviteCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let raw = '';
  for (const b of bytes) {
    raw += ALPHABET[b % ALPHABET.length]!;
  }
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

/** Normalise saisie utilisateur : majuscules, tiret optionnel. */
export function normalizeInviteCode(input: string): string {
  const compact = input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (compact.length !== 8) return compact;
  return `${compact.slice(0, 4)}-${compact.slice(4)}`;
}

export function inviteSharePath(code: string, baseUrl?: string): string {
  const normalized = normalizeInviteCode(code);
  const base = (baseUrl ?? '/').replace(/\/?$/, '/');
  return `${base}rejoindre/${encodeURIComponent(normalized)}`;
}

export function inviteShareUrl(
  code: string,
  origin?: string,
  baseUrl?: string
): string {
  const path = inviteSharePath(code, baseUrl);
  if (origin) return new URL(path, origin).href;
  if (typeof window === 'undefined') return path;
  return new URL(
    inviteSharePath(code, import.meta.env.BASE_URL),
    window.location.origin
  ).href;
}
