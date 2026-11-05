import { useEffect } from 'react';
import { ErrorBanner } from '@mister-guiiug/dev-pwa-config/react/error-banner';
import { useI18n } from '../../i18n/index.ts';
import { useCopie } from '../../backend/dernier-etat.ts';
import { useVoyage } from './store.ts';

/**
 * CE QUE L'ÉCRAN MONTRE, ET D'OÙ IL VIENT (ADR 0016).
 *
 * Connecté et hors ligne, le foyer affiché est une COPIE : celle de la
 * dernière lecture réussie. L'écran le dit, et de quand — sans quoi on la
 * prendrait pour l'état du moment, et l'on s'étonnerait qu'un geste soit
 * refusé. Et un geste refusé le dit aussi : les écrans appellent les actions
 * du magasin sans attendre leur issue, ce bandeau est le seul à la voir.
 *
 * Dans la coquille, sous `ConnectionBanner` : la coupure est le contexte, la
 * copie et le refus en sont les conséquences.
 */
export function VoyageEtat() {
  const { t, fmt } = useI18n();
  const copie = useCopie(state => state.voyage);
  const error = useVoyage(state => state.error);
  const errorOffline = useVoyage(state => state.errorOffline);
  const dismissError = useVoyage(state => state.dismissError);
  const load = useVoyage(state => state.load);

  // Le réseau revenu, relire : la copie n'a plus de raison d'être affichée.
  useEffect(() => {
    if (!copie) return;
    const relire = () => void load();
    window.addEventListener('online', relire);
    return () => window.removeEventListener('online', relire);
  }, [copie, load]);

  return (
    <>
      {copie ? (
        <ErrorBanner
          tone="info"
          message={t('voyage.offline.copy', { when: fmt.relative(copie) })}
        />
      ) : null}
      {error ? (
        <ErrorBanner
          tone={errorOffline ? 'warning' : 'danger'}
          message={
            errorOffline === 'read'
              ? t('voyage.offline.noCopy')
              : errorOffline === 'write'
                ? t('voyage.offline.refused')
                : error
          }
          onDismiss={dismissError}
        />
      ) : null}
    </>
  );
}
