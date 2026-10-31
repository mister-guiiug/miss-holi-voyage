/**
 * Thème voyage — skin d’ambiance, orthogonal au clair/sombre du socle.
 *
 * Persistance chrome en `localStorage` (pas le magasin versionné domaine) :
 * une préférence d’affichage, pas une donnée de voyage. ADR 0015.
 */
import { useCallback, useState } from 'react';

export const VOYAGE_THEMES = ['ambiance', 'album', 'instrument'] as const;

export type VoyageTheme = (typeof VOYAGE_THEMES)[number];

export const VOYAGE_THEME_DEFAULT: VoyageTheme = 'ambiance';

export const VOYAGE_THEME_STORAGE_KEY = 'miss-holi-voyage:voyage-theme';

export function isVoyageTheme(value: unknown): value is VoyageTheme {
  return (
    typeof value === 'string' &&
    (VOYAGE_THEMES as readonly string[]).includes(value)
  );
}

export function parseVoyageTheme(value: unknown): VoyageTheme {
  return isVoyageTheme(value) ? value : VOYAGE_THEME_DEFAULT;
}

export function lireVoyageTheme(
  storage: Pick<Storage, 'getItem'> | null = typeof localStorage !== 'undefined'
    ? localStorage
    : null
): VoyageTheme {
  if (!storage) return VOYAGE_THEME_DEFAULT;
  try {
    return parseVoyageTheme(storage.getItem(VOYAGE_THEME_STORAGE_KEY));
  } catch {
    return VOYAGE_THEME_DEFAULT;
  }
}

export function ecrireVoyageTheme(
  theme: VoyageTheme,
  storage: Pick<Storage, 'setItem'> | null = typeof localStorage !== 'undefined'
    ? localStorage
    : null
): void {
  if (!storage) return;
  try {
    storage.setItem(VOYAGE_THEME_STORAGE_KEY, theme);
  } catch {
    /* quota / mode privé : l’attribut DOM suffit pour la session. */
  }
}

/** Pose `data-voyage-theme` sur `<html>` — lu par le CSS et l’atmosphère. */
export function appliquerVoyageTheme(theme: VoyageTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.voyageTheme = theme;
  window.dispatchEvent(new Event('voyage-theme-change'));
}

export function useVoyageTheme(): {
  theme: VoyageTheme;
  setTheme: (next: VoyageTheme) => void;
} {
  const [theme, setThemeState] = useState<VoyageTheme>(() => {
    const initial = lireVoyageTheme();
    appliquerVoyageTheme(initial);
    return initial;
  });

  const setTheme = useCallback((next: VoyageTheme) => {
    const resolved = parseVoyageTheme(next);
    ecrireVoyageTheme(resolved);
    appliquerVoyageTheme(resolved);
    setThemeState(resolved);
  }, []);

  return { theme, setTheme };
}
