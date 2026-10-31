import { describe, expect, it } from 'vitest';
import { createSupabaseClientFactory } from '@mister-guiiug/dev-pwa-config/supabase-client';

/**
 * Sans `env: import.meta.env`, la fabrique lit `{}` et `getClient()` échoue
 * alors que le sélecteur de backend (qui lit l'env Vite) croit le mode distant
 * prêt — connexion / déconnexion cassées. Relevé sur miss-holi-voyage ; le
 * même commentaire vit dans mister-settle (07/09/2026).
 */
describe('fabrique Supabase et environnement Vite', () => {
  it('sans env, getClient refuse — piège du squelette', async () => {
    const factory = createSupabaseClientFactory({ auth: { flowType: 'pkce' } });
    expect(factory.isConfigured()).toBe(false);
    await expect(factory.getClient()).rejects.toThrow(
      /configuration manquante/
    );
  });

  it('avec env renseigné, isConfigured passe', () => {
    const factory = createSupabaseClientFactory({
      env: {
        VITE_SUPABASE_URL: 'https://exemple.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'cle-anon-de-test',
      },
      auth: { flowType: 'pkce' },
    });
    expect(factory.isConfigured()).toBe(true);
    expect(factory.missing()).toEqual([]);
  });
});
