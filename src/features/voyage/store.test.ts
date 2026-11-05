import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backend } from '../../backend/index.ts';
import { HorsLigneError } from '../../backend/dernier-etat.ts';
import { emptyVoyageSnapshot } from '../../entities/schemas.ts';
import { useVoyage } from './store.ts';

/**
 * Le magasin voyage porte l'issue des gestes : les écrans les appellent sans
 * l'attendre (`void`), et un rejet n'y avait aucun témoin.
 */

beforeEach(() => {
  localStorage.clear();
  useVoyage.setState({
    ...emptyVoyageSnapshot(),
    ready: false,
    error: null,
    errorOffline: null,
    unavailable: false,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('le magasin voyage', () => {
  it('une écriture refusée hors ligne est portée, et ne rejette pas', async () => {
    vi.spyOn(backend.voyage, 'createTrip').mockRejectedValue(
      new HorsLigneError('hors ligne : modification du voyage refusée')
    );

    await expect(
      useVoyage.getState().createTrip('h1', 'Été')
    ).resolves.toBeNull();
    expect(useVoyage.getState()).toMatchObject({ errorOffline: 'write' });
    expect(useVoyage.getState().error).toMatch(/refusée/);
  });

  it('un autre échec d’écriture est porté tel quel', async () => {
    vi.spyOn(backend.voyage, 'votePoi').mockRejectedValue(
      new Error('permission denied for table poi_votes')
    );
    await useVoyage.getState().votePoi('p1', 'maybe');
    expect(useVoyage.getState()).toMatchObject({
      error: 'permission denied for table poi_votes',
      errorOffline: null,
    });
  });

  it('une lecture impossible rend le foyer « indisponible », pas inexistant', async () => {
    vi.spyOn(backend.voyage, 'load').mockRejectedValue(
      new HorsLigneError('hors ligne : aucune copie')
    );
    await useVoyage.getState().load();
    expect(useVoyage.getState()).toMatchObject({
      ready: true,
      unavailable: true,
      errorOffline: 'read',
    });
  });

  it('une lecture réussie efface l’échec précédent', async () => {
    useVoyage.setState({
      error: 'x',
      errorOffline: 'read',
      unavailable: true,
    });
    await useVoyage.getState().load();
    expect(useVoyage.getState()).toMatchObject({
      error: null,
      errorOffline: null,
      unavailable: false,
    });
  });
});
