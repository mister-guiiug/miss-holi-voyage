import { useId } from 'react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import type { FlightOption, Trip } from '../../entities/schemas.ts';
import { useI18n } from '../../i18n/index.ts';
import { downloadTripIcs } from './tripIcs.ts';

type Props = {
  trip: Trip;
  /** Le vol retenu, dont l'heure prime sur la fenêtre de dates. */
  flight: FlightOption | null;
  /**
   * Les champs de dates diffèrent de ce qui est enregistré. L'export lit le
   * voyage ENREGISTRÉ : exporter maintenant mettrait à l'agenda les dates
   * d'avant la saisie, sans rien dire.
   */
  dirty: boolean;
};

/**
 * « Ajouter à mon agenda » : le départ et le retour du voyage en `.ics`
 * (`tripIcs.ts`). Bloqué par `aria-disabled`, pas par `disabled` : le bouton
 * garde le focus, et la phrase sous lui dit ce qui manque.
 */
export function AgendaExport({ trip, flight, dirty }: Props) {
  const { t } = useI18n();
  const hintId = useId();
  const hasDate = Boolean(
    trip.dateWindowStart ||
    trip.dateWindowEnd ||
    flight?.departAt ||
    flight?.returnAt
  );
  const blocked = !hasDate || dirty;
  // Une saisie en cours d'abord : sur un premier voyage, « renseignez une
  // date » sous des champs déjà remplis dirait le contraire de l'écran.
  let hint = t('voyage.ics.hint');
  if (dirty) hint = t('voyage.ics.needSave');
  else if (!hasDate) hint = t('voyage.ics.needDate');

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="secondary"
        aria-disabled={blocked}
        aria-describedby={hintId}
        onClick={() => {
          if (blocked) return;
          const url = new URL(
            `voyage/${encodeURIComponent(trip.id)}`,
            new URL(import.meta.env.BASE_URL, window.location.origin)
          ).href;
          downloadTripIcs({ trip, flight, url }, t);
        }}
      >
        {t('voyage.ics.export')}
      </Button>
      <p id={hintId} className="text-muted m-0 text-xs">
        {hint}
      </p>
    </div>
  );
}
