import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import {
  flagEmoji,
  countryCodeForName,
  proposeDestinations,
  PARTIR_HUB_URL,
  type Destination,
} from '../../entities/destinations.ts';
import { useI18n } from '../../i18n/index.ts';

type Props = {
  country: string;
  region: string;
  /** YYYY-MM-DD — filtre le catalogue sur le mois de départ. */
  dateStart?: string;
  onCountryChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onPick: (dest: Destination) => void;
  onMarkReady: () => void;
  onLock: () => void;
};

function monthFromDate(iso: string | undefined): number | null {
  if (!iso || iso.length < 7) return null;
  const m = Number(iso.slice(5, 7));
  return m >= 1 && m <= 12 ? m : null;
}

/** Étape destination : suggestions partir.com + drapeau + saisie libre. */
export function DestinationStep({
  country,
  region,
  dateStart,
  onCountryChange,
  onRegionChange,
  onPick,
  onMarkReady,
  onLock,
}: Props) {
  const { t } = useI18n();
  const month = monthFromDate(dateStart);
  const suggestions = proposeDestinations({
    month,
    familyFriendly: true,
    limit: 8,
  });
  const code = countryCodeForName(country);
  const flag = flagEmoji(code);

  return (
    <div className="voyage-destination flex flex-col gap-4">
      <div className="voyage-destination__fields flex flex-col gap-3">
        <div className="voyage-destination__country-row">
          {flag ? (
            <span
              className="voyage-destination__flag"
              aria-hidden="true"
              title={country}
            >
              {flag}
            </span>
          ) : (
            <span
              className="voyage-destination__flag voyage-destination__flag--empty"
              aria-hidden="true"
            >
              ··
            </span>
          )}
          <TextField
            className="voyage-destination__field"
            label={t('voyage.country')}
            value={country}
            onChange={e => onCountryChange(e.target.value)}
          />
        </div>
        <TextField
          label={t('voyage.region')}
          value={region}
          onChange={e => onRegionChange(e.target.value)}
        />
      </div>

      <div className="voyage-destination__suggest">
        <p className="voyage-destination__suggest-title m-0">
          {t('voyage.destinationSuggest')}
          {month != null
            ? ` — ${t('voyage.destinationSuggestMonth', { month })}`
            : ''}
        </p>
        <ul className="voyage-destination__list">
          {suggestions.map(dest => {
            const emoji = flagEmoji(dest.countryCode);
            return (
              <li key={dest.id}>
                <button
                  type="button"
                  className="voyage-destination__chip"
                  onClick={() => onPick(dest)}
                >
                  <span className="voyage-destination__chip-flag" aria-hidden>
                    {emoji}
                  </span>
                  <span className="voyage-destination__chip-body">
                    <span className="voyage-destination__chip-name">
                      {dest.name}
                    </span>
                    <span className="voyage-destination__chip-meta">
                      {dest.country}
                      {dest.region ? ` · ${dest.region}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="voyage-destination__attribution m-0">
          {t('voyage.destinationAttribution')}{' '}
          <a
            href={PARTIR_HUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="voyage-ink-link"
          >
            partir.com
          </a>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onMarkReady}>
          {t('voyage.markReady')}
        </Button>
        <Button type="button" variant="secondary" onClick={onLock}>
          {t('voyage.lock')}
        </Button>
      </div>
    </div>
  );
}
