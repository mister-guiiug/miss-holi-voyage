import type { StepStatus } from '../../entities/schemas.ts';
import { useI18n } from '../../i18n/index.ts';

type Props = {
  status: StepStatus;
  /** Affiche un préfixe « État » pour les titres de section. */
  withLabel?: boolean;
  className?: string;
};

/** Pastille d’état d’étape — lisible hors du rail (brouillon / validée / figée). */
export function StepStatusBadge({
  status,
  withLabel = false,
  className = '',
}: Props) {
  const { t } = useI18n();
  return (
    <span
      className={`voyage-step-badge voyage-step-badge--${status} ${className}`.trim()}
      data-status={status}
    >
      {withLabel ? (
        <span className="voyage-step-badge__prefix">
          {t('voyage.stepStatusLabel')}
        </span>
      ) : null}
      <span className="voyage-step-badge__value">
        {t(`voyage.stepStatus.${status}`)}
      </span>
    </span>
  );
}
