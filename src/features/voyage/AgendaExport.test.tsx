import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../i18n/index.ts';
import type { Trip } from '../../entities/schemas.ts';
import { AgendaExport } from './AgendaExport.tsx';

/**
 * LE BOUTON, PAS LE FICHIER : ce que le `.ics` contient est tenu par
 * `tripIcs.test.ts`. Ici : quand le bouton exporte, quand il refuse et ce
 * qu'il dit alors.
 */
const downloadText = vi.hoisted(() => vi.fn(() => true));
vi.mock('@mister-guiiug/dev-pwa-config/download', () => ({ downloadText }));

const trip = (over: Partial<Trip> = {}): Trip => ({
  id: 't1',
  householdId: 'h1',
  title: 'Été en Écosse',
  destinationCountry: '',
  destinationRegion: '',
  destinationNotes: '',
  dateWindowStart: '2027-07-10',
  dateWindowEnd: '2027-07-24',
  budgetCeiling: null,
  budgetCurrency: 'EUR',
  style: 'undecided',
  styleNotes: '',
  isCurrent: true,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...over,
});

function monter(props: Parameters<typeof AgendaExport>[0]) {
  render(
    <I18nProvider>
      <AgendaExport {...props} />
    </I18nProvider>
  );
  return screen.getByRole('button', { name: 'Ajouter à mon agenda (.ics)' });
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('dwc_locale', 'fr');
  downloadText.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('AgendaExport', () => {
  it('dates enregistrées : télécharge le .ics du voyage', async () => {
    const bouton = monter({ trip: trip(), flight: null, dirty: false });
    expect(bouton).not.toHaveAttribute('aria-disabled', 'true');
    expect(bouton).toHaveAccessibleDescription(
      'Le départ et le retour, avec deux rappels : une semaine avant le départ, puis la veille.'
    );

    await userEvent.click(bouton);

    expect(downloadText).toHaveBeenCalledTimes(1);
    const [ics, nom, type] = downloadText.mock.calls[0] as unknown as [
      string,
      string,
      string,
    ];
    expect(nom).toBe('ete-en-ecosse-agenda.ics');
    expect(type).toBe('text/calendar;charset=utf-8');
    expect(ics).toContain('SUMMARY:Départ : Été en Écosse');
    expect(ics).toContain('SUMMARY:Retour : Été en Écosse');
    // L'adresse du voyage dans l'application, sous la base de Vite.
    expect(ics).toMatch(/URL:http:\/\/localhost(:\d+)?\/voyage\/t1/);
  });

  it('une saisie non validée : refuse, et dit pourquoi', async () => {
    const bouton = monter({ trip: trip(), flight: null, dirty: true });
    expect(bouton).toHaveAttribute('aria-disabled', 'true');
    expect(bouton).toHaveAccessibleDescription(
      'Validez l’étape pour exporter ces dates.'
    );

    await userEvent.click(bouton);

    expect(downloadText).not.toHaveBeenCalled();
  });

  it('aucune date : refuse, et dit ce qui manque', async () => {
    const bouton = monter({
      trip: trip({ dateWindowStart: null, dateWindowEnd: null }),
      flight: null,
      dirty: false,
    });
    expect(bouton).toHaveAttribute('aria-disabled', 'true');
    expect(bouton).toHaveAccessibleDescription(
      'Renseignez une date d’aller ou de retour pour l’ajouter à votre agenda.'
    );

    await userEvent.click(bouton);

    expect(downloadText).not.toHaveBeenCalled();
  });

  it('premier voyage, dates saisies mais pas validées : demande de valider', () => {
    // Rien d'enregistré ET une saisie en cours : « renseignez une date » sous
    // des champs remplis dirait le contraire de l'écran (relevé par l'e2e).
    const bouton = monter({
      trip: trip({ dateWindowStart: null, dateWindowEnd: null }),
      flight: null,
      dirty: true,
    });
    expect(bouton).toHaveAttribute('aria-disabled', 'true');
    expect(bouton).toHaveAccessibleDescription(
      'Validez l’étape pour exporter ces dates.'
    );
  });
});
