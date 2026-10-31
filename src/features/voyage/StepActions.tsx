import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import type { StepStatus } from '../../entities/schemas.ts';
import { useI18n } from '../../i18n/index.ts';
import { StepStatusBadge } from './StepStatusBadge.tsx';

type Props = {
  status: StepStatus;
  /** false = rien à valider encore (ex. destination vide). */
  canMarkReady?: boolean;
  onMarkReady: () => void;
  onLock: () => void;
  onUnlock: () => void;
};

/** Actions d’étape + rappel de l’état courant (validée / figée). */
export function StepActions({
  status,
  canMarkReady = true,
  onMarkReady,
  onLock,
  onUnlock,
}: Props) {
  const { t } = useI18n();
  const locked = status === 'locked';

  return (
    <div className="voyage-step-actions">
      <div className="voyage-step-actions__status" aria-live="polite">
        <StepStatusBadge status={status} withLabel />
        {locked ? (
          <p className="voyage-step-actions__hint m-0">
            {t('voyage.stepLockedHint')}
          </p>
        ) : null}
      </div>
      <div className="voyage-step-actions__buttons flex flex-wrap gap-2">
        {locked ? (
          <Button type="button" variant="secondary" onClick={onUnlock}>
            {t('voyage.unlock')}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant={status === 'ready' ? 'secondary' : 'primary'}
              onClick={onMarkReady}
              disabled={!canMarkReady}
            >
              {status === 'ready'
                ? t('voyage.markReadyDone')
                : t('voyage.markReady')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onLock}
              disabled={status !== 'ready'}
              title={
                status !== 'ready' ? t('voyage.lockNeedsReady') : undefined
              }
            >
              {t('voyage.lock')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
