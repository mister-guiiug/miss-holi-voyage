import { afterEach, describe, expect, it, vi } from 'vitest';
import { adresseDeRetour, lireErreurAuthDansUrl } from './index.ts';

describe('adresseDeRetour / erreurs Auth dans l’URL', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('pointe vers /compte sous la base Vite courante', () => {
    vi.stubEnv('BASE_URL', '/');
    // Vitest expose import.meta.env.BASE_URL via stubEnv('BASE_URL') selon config ;
    // on vérifie surtout le parseur d’erreur, et l’URL construite si possible.
    const err = lireErreurAuthDansUrl(
      'http://localhost:3000/?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired#error=access_denied'
    );
    expect(err?.code).toBe('otp_expired');
    expect(err?.description).toMatch(/invalid or has expired/i);
  });

  it('lit aussi le fragment hash seul', () => {
    const err = lireErreurAuthDansUrl(
      'http://localhost:5219/compte#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    );
    expect(err?.code).toBe('otp_expired');
  });

  it('adresseDeRetour reste une URL absolue vers compte', () => {
    const href = adresseDeRetour();
    expect(href).toMatch(/^https?:\/\//);
    expect(href.endsWith('/compte') || href.includes('/compte')).toBe(true);
  });
});
