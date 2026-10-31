import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  appliquerVoyageTheme,
  ecrireVoyageTheme,
  lireVoyageTheme,
  parseVoyageTheme,
  VOYAGE_THEME_DEFAULT,
  VOYAGE_THEME_STORAGE_KEY,
} from './voyage-theme.ts';

describe('voyage-theme', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.voyageTheme;
  });

  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.voyageTheme;
  });

  it('parse : défaut sur valeur inconnue', () => {
    expect(parseVoyageTheme(null)).toBe(VOYAGE_THEME_DEFAULT);
    expect(parseVoyageTheme('inconnu')).toBe('ambiance');
    expect(parseVoyageTheme('album')).toBe('album');
  });

  it('lire / écrire dans localStorage', () => {
    expect(lireVoyageTheme()).toBe('ambiance');
    ecrireVoyageTheme('instrument');
    expect(localStorage.getItem(VOYAGE_THEME_STORAGE_KEY)).toBe('instrument');
    expect(lireVoyageTheme()).toBe('instrument');
  });

  it('appliquer pose data-voyage-theme et émet l’évènement', () => {
    let seen = 0;
    const onChange = () => {
      seen += 1;
    };
    window.addEventListener('voyage-theme-change', onChange);
    appliquerVoyageTheme('album');
    expect(document.documentElement.dataset.voyageTheme).toBe('album');
    expect(seen).toBe(1);
    window.removeEventListener('voyage-theme-change', onChange);
  });
});
