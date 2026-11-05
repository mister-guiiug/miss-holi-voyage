import type { IdbStore } from '@mister-guiiug/dev-pwa-config/idb';

/**
 * Une base `IdbStore` tenue en mémoire : jsdom n'a pas d'IndexedDB, et la
 * vraie (`createIdb`) s'y dégrade en « rien n'est gardé » — ce qui ferait
 * passer à vide tout test de copie hors ligne.
 */
export function idbEnMemoire(): IdbStore & { valeurs: Map<string, unknown> } {
  const valeurs = new Map<string, unknown>();
  const blobs = new Map<string, Blob>();
  return {
    name: 'test',
    valeurs,
    available: async () => true,
    get: (async (cle: string, repli?: unknown) =>
      valeurs.has(cle)
        ? structuredClone(valeurs.get(cle))
        : repli) as IdbStore['get'],
    set: async (cle, valeur) => {
      valeurs.set(cle, structuredClone(valeur));
      return true;
    },
    remove: async cle => valeurs.delete(cle),
    keys: async () => [...valeurs.keys()],
    clear: async () => {
      valeurs.clear();
      return true;
    },
    getBlob: async cle => blobs.get(cle),
    setBlob: async (cle, blob) => {
      blobs.set(cle, blob);
      return true;
    },
    removeBlob: async cle => blobs.delete(cle),
    close: async () => {},
  };
}
