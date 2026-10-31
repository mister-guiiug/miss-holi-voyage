import { expect, test } from '@playwright/test';

/**
 * Le SMOKE : ce qui doit marcher pour qu'une livraison ait un sens.
 *
 * Le tag `@critical` est celui que la CI de la famille exécute
 * (`playwright test --grep @critical`) : une spec sans lui n'est PAS jouée en
 * intégration continue, et le workflow rapporte « No tests found » sans
 * échouer. C'est une panne silencieuse que le parc a déjà connue.
 *
 * Ces tests passent sur un BUILD de production, service worker compris.
 *
 * Remplacés le 31/10/2026 : le squelette « Notes » n'est plus l'accueil — le
 * domaine est foyer + voyage. Création foyer possible sur l'accueil (état
 * vide) ; membres et édition du nom vivent sur `/foyer`.
 */
test.describe('@critical le cadre', () => {
  test("l'accueil s'ouvre et porte le nom de l'app", async ({ page }) => {
    await page.goto('/');
    // Le nom de l'app, pas celui de l'écran : c'est le seul `h1` que lit un
    // moteur. L'état vide du foyer est un `role=note`, pas un second titre.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Miss Holi Voyage'
    );
    await expect(page.getByText('Aucun foyer')).toBeVisible();
    await expect(page.getByLabel('Nom du foyer')).toBeVisible();
  });

  test('un foyer et un voyage survivent au rechargement', async ({ page }) => {
    await page.goto('/');

    const foyer = `foyer e2e ${Date.now()}`;
    await page.getByLabel('Nom du foyer').fill(foyer);
    await page.getByRole('button', { name: 'Créer le foyer' }).click();
    // Après création, l'accueil montre un teaser (lien), pas un h2.
    await expect(page.getByRole('link', { name: new RegExp(foyer) })).toBeVisible();

    const voyage = `voyage e2e ${Date.now()}`;
    await page.getByLabel('Titre du voyage').fill(voyage);
    await page.getByRole('button', { name: 'Créer le voyage' }).click();
    await expect(page.getByRole('link', { name: voyage })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('link', { name: new RegExp(foyer) })).toBeVisible();
    await expect(page.getByRole('link', { name: voyage })).toBeVisible();
  });

  test('un membre ajouté reste après rechargement', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Nom du foyer').fill(`foyer membre ${Date.now()}`);
    await page.getByRole('button', { name: 'Créer le foyer' }).click();
    await expect(page.getByRole('link', { name: /Gérer le foyer/ })).toBeVisible();

    await page.getByRole('link', { name: 'Foyer', exact: true }).click();
    // Formulaire d’ajout déjà ouvert quand le foyer est vide.
    const membre = `Alex ${Date.now()}`;
    await page.getByLabel('Prénom / surnom').fill(membre);
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(page.getByText(membre)).toBeVisible();

    await page.reload();
    await expect(page.getByText(membre)).toBeVisible();
  });

  test('hors ligne, un voyage créé n’est pas perdu au retour du réseau', async ({
    page,
    context,
  }) => {
    // Même contrat que le squelette notes : hors ligne, le geste aboutit, la
    // bannière le DIT, et la donnée survit au retour. Le magasin voyage est
    // local-first ; la bannière reste celle du socle.
    await page.goto('/');
    await expect(page.locator('[data-dwc="sync-status"]')).toHaveCount(0);

    const foyer = `foyer offline ${Date.now()}`;
    await page.getByLabel('Nom du foyer').fill(foyer);
    await page.getByRole('button', { name: 'Créer le foyer' }).click();
    await expect(page.getByRole('link', { name: new RegExp(foyer) })).toBeVisible();

    await context.setOffline(true);
    await expect(page.locator('[data-dwc="connection-banner"]')).toBeVisible({
      timeout: 5000,
    });

    const voyage = `voyage offline ${Date.now()}`;
    await page.getByLabel('Titre du voyage').fill(voyage);
    await page.getByRole('button', { name: 'Créer le voyage' }).click();
    await expect(page.getByRole('link', { name: voyage })).toBeVisible();

    await context.setOffline(false);
    await page.reload();
    await expect(page.getByRole('link', { name: voyage })).toBeVisible();
  });

  test('la navigation atteint les destinations', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Foyer' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Foyer');

    await page.getByRole('link', { name: 'Réglages' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Réglages'
    );

    await page.getByRole('link', { name: 'Compte' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Compte');

    await page.getByRole('link', { name: 'À propos' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'À propos'
    );
  });

  test('sans backend, l’écran de compte le DIT au lieu de disparaître', async ({
    page,
  }) => {
    await page.goto('/compte');
    await expect(page.getByText('Mode local')).toBeVisible();

    await expect(page.getByTestId('zone-dangereuse')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Supprimer mon compte' })
    ).toHaveCount(0);
  });

  test('un lien profond rafraîchi sert l’app, pas la page d’erreur', async ({
    page,
  }) => {
    await page.goto('/reglages');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Réglages'
    );
  });

  test('la fiche d’installation se propose quand le navigateur le permet', async ({
    page,
  }) => {
    await page.goto('/a-propos');
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      Object.assign(event, {
        prompt: () => Promise.resolve(),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      });
      window.dispatchEvent(event);
    });
    await expect(
      page.getByRole('region', { name: 'Installer l’application' })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Installer' })).toBeVisible();
  });

  test('« Signaler un problème » part avec la version et l’écran', async ({
    page,
  }) => {
    await page.goto('/a-propos');
    const lien = page.getByRole('link', { name: 'Signaler un problème' });
    await expect(lien).toHaveAttribute(
      'href',
      /\/issues\/new\?template=bug\.yml/
    );
    const url = new URL((await lien.getAttribute('href')) ?? '');
    expect(url.searchParams.get('version')).toMatch(/^v\d+\.\d+\.\d+/);
    expect(url.searchParams.get('environnement')).toContain('écran ');
    expect(url.searchParams.get('environnement')).toContain('/a-propos');
  });

  test('les trois liens de la famille : sur l’accueil et « À propos », nulle part ailleurs', async ({
    page,
  }) => {
    const pied = page.locator('[data-dwc="app-footer"]');
    const liens = ['Code source', 'M’offrir un café', 'Signaler un problème'];

    for (const route of ['/', '/a-propos']) {
      await page.goto(route);
      await expect(pied, `pied de page attendu sur ${route}`).toBeVisible();
      for (const nom of liens) {
        await expect(
          pied.getByRole('link', { name: nom, exact: true }),
          `${nom} attendu une fois sur ${route}`
        ).toHaveCount(1);
      }
    }

    for (const route of ['/reglages', '/compte', '/foyer']) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(pied, `pied de page interdit sur ${route}`).toHaveCount(0);
      for (const nom of liens) {
        await expect(
          page.getByRole('link', { name: nom, exact: true }),
          `${nom} ne doit pas être sur ${route}`
        ).toHaveCount(0);
      }
    }
  });

  test('la langue bascule, et le cadre suit', async ({ page }) => {
    await page.goto('/reglages');

    await page.getByRole('tab', { name: 'EN' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Settings'
    );
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
  });
});
