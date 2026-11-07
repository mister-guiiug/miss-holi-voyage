import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

/**
 * L'EXPORT AGENDA, DU CLIC AU FICHIER. Le contenu du `.ics` est tenu par
 * `src/features/voyage/tripIcs.test.ts` ; ici, ce qu'aucun test unitaire ne
 * voit : le bouton refuse une saisie non validée, puis le navigateur reçoit
 * bien un fichier, sous son nom, avec les dates ENREGISTRÉES.
 */
test.describe('@critical l’agenda du voyage', () => {
  test('les dates validées partent en .ics, rappels compris', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByLabel('Nom du foyer').fill(`foyer agenda ${Date.now()}`);
    await page.getByRole('button', { name: 'Créer le foyer' }).click();

    const voyage = 'Été en Écosse';
    await page.getByLabel('Titre du voyage').fill(voyage);
    await page.getByRole('button', { name: 'Créer le voyage' }).click();
    await page.getByRole('link', { name: voyage }).click();

    const dates = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Fenêtre de dates' }) });
    const exporter = dates.getByRole('button', {
      name: 'Ajouter à mon agenda (.ics)',
    });
    await expect(exporter).toHaveAttribute('aria-disabled', 'true');

    await dates.getByLabel('Aller', { exact: true }).fill('2027-07-10');
    await dates.getByLabel('Retour', { exact: true }).fill('2027-07-24');
    // Saisi, pas encore enregistré : exporter mettrait les anciennes dates.
    await expect(exporter).toHaveAttribute('aria-disabled', 'true');
    await expect(exporter).toHaveAccessibleDescription(
      'Validez l’étape pour exporter ces dates.'
    );

    await dates.getByRole('button', { name: 'Valider l’étape' }).click();
    await expect(exporter).not.toHaveAttribute('aria-disabled', 'true');

    const arrivee = page.waitForEvent('download');
    await exporter.click();
    const fichier = await arrivee;
    expect(fichier.suggestedFilename()).toBe('ete-en-ecosse-agenda.ics');

    const ics = await readFile(await fichier.path(), 'utf8');
    expect(ics).toContain('DTSTART;VALUE=DATE:20270710');
    expect(ics).toContain('DTSTART;VALUE=DATE:20270724');
    expect(ics).toContain('SUMMARY:Départ : Été en Écosse');
    expect(ics).toContain('TRIGGER:-P6DT15H');
  });
});
