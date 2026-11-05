import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@mister-guiiug/dev-pwa-config/react/auth-provider';
import { ToastProvider } from '@mister-guiiug/dev-pwa-config/react/toast';
import { I18nProvider } from '../../i18n/index.ts';
import { authAdapter } from '../../auth/index.ts';
import { backend } from '../../backend/index.ts';
import { HorsLigneError, useCopie } from '../../backend/dernier-etat.ts';
import { emptyVoyageSnapshot } from '../../entities/schemas.ts';
import { Shell } from '../../App.tsx';
import { useVoyage } from './store.ts';

/**
 * CE QUE L'ÉCRAN DIT, CONNECTÉ ET HORS LIGNE (ADR 0016). Le port, lui, est
 * éprouvé dans `backend/voyage-supabase.test.ts` ; ici, on lui fait rendre ce
 * qu'il rend hors ligne, et l'on regarde l'écran.
 */

function monter() {
  render(
    <I18nProvider>
      <AuthProvider adapter={authAdapter()}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/']}>
            <Shell />
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </I18nProvider>
  );
}

const avecUnFoyer = () => ({
  ...emptyVoyageSnapshot(),
  households: [
    {
      id: 'h1',
      name: 'Foyer distant',
      notes: '',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ],
});

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('dwc_locale', 'fr');
  useCopie.setState({ voyage: null, notes: null });
  useVoyage.setState({
    ...emptyVoyageSnapshot(),
    ready: false,
    error: null,
    errorOffline: null,
    unavailable: false,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('l’accueil, connecté et hors ligne', () => {
  it('sans copie : « foyer indisponible », pas « aucun foyer » ni de quoi en créer un', async () => {
    vi.spyOn(backend.voyage, 'load').mockRejectedValue(
      new HorsLigneError('hors ligne : aucune copie')
    );
    monter();

    expect(await screen.findByText('Foyer indisponible')).toBeInTheDocument();
    expect(screen.queryByText('Aucun foyer')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nom du foyer')).not.toBeInTheDocument();
    expect(
      screen.getByText(/votre foyer n’a encore jamais été lu sur cet appareil/)
    ).toBeInTheDocument();
  });

  it('avec une copie : le foyer, et de quand il date', async () => {
    vi.spyOn(backend.voyage, 'load').mockImplementation(async () => {
      useCopie.setState({
        voyage: new Date(Date.now() - 3_600_000).toISOString(),
      });
      return avecUnFoyer();
    });
    monter();

    expect(await screen.findByText('Foyer distant')).toBeInTheDocument();
    expect(
      screen.getByText(/votre foyer tel qu’il était .*en lecture seule/)
    ).toBeInTheDocument();
  });

  it('un geste refusé le dit, au lieu de disparaître', async () => {
    vi.spyOn(backend.voyage, 'load').mockResolvedValue(avecUnFoyer());
    vi.spyOn(backend.voyage, 'createTrip').mockRejectedValue(
      new HorsLigneError('hors ligne : modification du voyage refusée')
    );
    monter();
    await screen.findByText('Foyer distant');

    await act(async () => {
      await useVoyage.getState().createTrip('h1', 'Été');
    });

    expect(
      screen.getByText(/la modification n’a pas été enregistrée/)
    ).toBeInTheDocument();
  });
});
