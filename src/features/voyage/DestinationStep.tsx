import { useId, useMemo, useState } from 'react';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import {
  CONTINENTS,
  DESTINATIONS,
  PARTIR_HUB_URL,
  countryCodeForName,
  destinationMetaLine,
  destinationsByContinent,
  flagEmoji,
  popularDestinations,
  proposeDestinations,
  searchDestinations,
  type Destination,
  type DestinationContinent,
} from '../../entities/destinations.ts';
import type { StepStatus } from '../../entities/schemas.ts';
import { useI18n } from '../../i18n/index.ts';
import { StepActions } from './StepActions.tsx';

type Props = {
  country: string;
  region: string;
  /** YYYY-MM-DD — filtre le catalogue sur le mois de départ. */
  dateStart?: string;
  status: StepStatus;
  onCountryChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onPick: (dest: Destination, place?: string) => void;
  onMarkReady: () => void;
  onLock: () => void;
  onUnlock: () => void;
};

function monthFromDate(iso: string | undefined): number | null {
  if (!iso || iso.length < 7) return null;
  const m = Number(iso.slice(5, 7));
  return m >= 1 && m <= 12 ? m : null;
}

function matchDestination(
  country: string,
  region: string
): Destination | undefined {
  const c = country.trim().toLowerCase();
  const r = region.trim().toLowerCase();
  if (!c) return undefined;
  const sameCountry = DESTINATIONS.filter(
    d => d.country.toLowerCase() === c || d.name.toLowerCase() === c
  );
  if (sameCountry.length === 0) return undefined;
  if (r) {
    const byPlace = sameCountry.find(
      d =>
        d.name.toLowerCase() === r ||
        d.region?.toLowerCase() === r ||
        d.places?.some(p => p.toLowerCase() === r)
    );
    if (byPlace) return byPlace;
  }
  return sameCountry[0];
}

function DestinationCard({
  dest,
  onPick,
  placesLabel,
}: {
  dest: Destination;
  onPick: (d: Destination, place?: string) => void;
  placesLabel: string;
}) {
  const emoji = flagEmoji(dest.countryCode);
  const meta = destinationMetaLine(dest);
  const places = dest.places?.slice(0, 8) ?? [];

  return (
    <li>
      <div className="voyage-destination__card">
        <button
          type="button"
          className="voyage-destination__card-main"
          onClick={() => onPick(dest)}
        >
          <span className="voyage-destination__card-head">
            <span className="voyage-destination__card-flag" aria-hidden>
              {emoji}
            </span>
            <span className="voyage-destination__card-titles">
              <span className="voyage-destination__card-name">
                {dest.name}
                {emoji ? ` ${emoji}` : ''}
              </span>
              {meta ? (
                <span className="voyage-destination__card-meta">{meta}</span>
              ) : (
                <span className="voyage-destination__card-meta">
                  {dest.country}
                  {dest.region ? ` · ${dest.region}` : ''}
                </span>
              )}
            </span>
          </span>
          <span className="voyage-destination__card-summary">
            {dest.summary}
          </span>
        </button>
        {places.length > 0 ? (
          <div className="voyage-destination__card-places">
            <span className="voyage-destination__card-places-label">
              {placesLabel}
            </span>
            <span className="voyage-destination__card-pills">
              {places.map(p => (
                <button
                  key={p}
                  type="button"
                  className="voyage-destination__pill voyage-destination__pill--action"
                  onClick={() => onPick(dest, p)}
                >
                  {p}
                </button>
              ))}
            </span>
          </div>
        ) : null}
      </div>
    </li>
  );
}

/** Étape destination : catalogue Destinations (partir.com), auto-complétion enrichie. */
export function DestinationStep({
  country,
  region,
  dateStart,
  status,
  onCountryChange,
  onRegionChange,
  onPick,
  onMarkReady,
  onLock,
  onUnlock,
}: Props) {
  const { t } = useI18n();
  const searchId = useId();
  const [query, setQuery] = useState('');
  const [continent, setContinent] = useState<DestinationContinent | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  /** Recherche / catalogue visibles tant qu’aucune destination, ou après « Changer ». */
  const [browseMode, setBrowseMode] = useState(() => !country.trim());

  const locked = status === 'locked';
  const month = monthFromDate(dateStart);
  const code = countryCodeForName(country);
  const flag = flagEmoji(code);
  const hasChoice = Boolean(country.trim());
  const showSearch = !locked && (browseMode || !hasChoice);
  const matched = useMemo(
    () => matchDestination(country, region),
    [country, region]
  );
  const regionChoices = matched?.places ?? [];

  const familySuggestions = useMemo(
    () =>
      proposeDestinations({
        month,
        familyFriendly: true,
        limit: 6,
      }),
    [month]
  );

  const searchHits = useMemo(() => {
    if (!query.trim()) return [];
    return searchDestinations(query, { limit: 10, continent });
  }, [query, continent]);

  const browseList = useMemo(() => {
    if (!catalogOpen && !query.trim()) return familySuggestions;
    if (continent) return destinationsByContinent(continent);
    if (catalogOpen) return popularDestinations(12);
    return familySuggestions;
  }, [catalogOpen, continent, familySuggestions, query]);

  const popular = useMemo(() => popularDestinations(8), []);

  const listToShow = query.trim() ? searchHits : browseList;
  const resultsCount = listToShow.length;

  const applyPick = (dest: Destination, place?: string) => {
    onPick(dest, place);
    setQuery('');
    setCatalogOpen(false);
    setBrowseMode(false);
  };

  const startChange = () => {
    if (locked) return;
    setBrowseMode(true);
    setCatalogOpen(true);
    setQuery('');
  };

  return (
    <div
      className={`voyage-destination flex flex-col gap-4${locked ? ' voyage-destination--locked' : ''}`}
    >
      {showSearch ? (
        <div className="voyage-destination__search">
          <label
            className="voyage-destination__search-label"
            htmlFor={searchId}
          >
            {t('voyage.destinationSearch')}
          </label>
          <div className="voyage-destination__search-row">
            <input
              id={searchId}
              type="search"
              className="voyage-destination__search-input"
              value={query}
              autoComplete="off"
              autoFocus={browseMode && hasChoice}
              placeholder={t('voyage.destinationSearchPlaceholder')}
              onChange={e => {
                setQuery(e.target.value);
                if (e.target.value.trim()) setCatalogOpen(true);
              }}
              onFocus={() => setCatalogOpen(true)}
            />
            {query ? (
              <button
                type="button"
                className="voyage-destination__search-clear"
                aria-label={t('voyage.destinationSearchClear')}
                onClick={() => setQuery('')}
              >
                ×
              </button>
            ) : null}
          </div>
          <p
            className="voyage-destination__results-count m-0"
            aria-live="polite"
          >
            {query.trim() || catalogOpen
              ? t('voyage.destinationResults', { count: resultsCount })
              : null}
          </p>
        </div>
      ) : null}

      {hasChoice && !showSearch ? (
        <div className="voyage-destination__chosen">
          <div className="voyage-destination__chosen-row">
            {flag ? (
              <span className="voyage-destination__flag" aria-hidden="true">
                {flag}
              </span>
            ) : null}
            <div className="voyage-destination__chosen-text">
              <p className="voyage-destination__chosen-label m-0">
                {t('voyage.destinationChosen')}
              </p>
              <p className="voyage-destination__chosen-name m-0">
                {region.trim() || country}
                {region.trim() && country.trim() && region !== country
                  ? ` · ${country}`
                  : ''}
              </p>
            </div>
            {!locked ? (
              <Button type="button" variant="secondary" onClick={startChange}>
                {t('voyage.destinationChange')}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {hasChoice && !showSearch && !locked ? (
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
          {regionChoices.length > 0 ? (
            <div className="voyage-destination__region-pick">
              <p className="voyage-destination__region-pick-label m-0">
                {t('voyage.destinationPickRegion')}
              </p>
              <div className="voyage-destination__card-pills">
                {regionChoices.map(p => (
                  <button
                    key={p}
                    type="button"
                    className={
                      region === p
                        ? 'voyage-destination__pill voyage-destination__pill--action is-selected'
                        : 'voyage-destination__pill voyage-destination__pill--action'
                    }
                    onClick={() => onRegionChange(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {showSearch ? (
        <div className="voyage-destination__catalog">
          <div className="voyage-destination__catalog-toolbar">
            <Button
              type="button"
              variant={catalogOpen ? 'primary' : 'secondary'}
              onClick={() => setCatalogOpen(o => !o)}
            >
              {catalogOpen
                ? t('voyage.destinationCatalogHide')
                : t('voyage.destinationCatalog')}
            </Button>
            <span className="voyage-destination__catalog-count">
              {t('voyage.destinationCatalogCount', {
                count: DESTINATIONS.length,
              })}
            </span>
          </div>

          {catalogOpen || query.trim() ? (
            <div className="voyage-destination__browse">
              <nav
                className="voyage-destination__continents"
                aria-label={t('voyage.destinationContinents')}
              >
                <button
                  type="button"
                  className={
                    continent == null
                      ? 'voyage-destination__continent is-active'
                      : 'voyage-destination__continent'
                  }
                  onClick={() => setContinent(null)}
                >
                  {t('voyage.destinationPopular')}
                </button>
                {CONTINENTS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className={
                      continent === c.id
                        ? 'voyage-destination__continent is-active'
                        : 'voyage-destination__continent'
                    }
                    onClick={() => {
                      setContinent(c.id);
                      setCatalogOpen(true);
                    }}
                  >
                    {c.label}
                    <span className="voyage-destination__continent-n">
                      {destinationsByContinent(c.id).length}
                    </span>
                  </button>
                ))}
              </nav>

              {!query.trim() && continent == null ? (
                <div className="voyage-destination__popular-row">
                  {popular.map(d => (
                    <button
                      key={d.id}
                      type="button"
                      className="voyage-destination__popular-pill"
                      onClick={() => applyPick(d)}
                    >
                      <span aria-hidden>{flagEmoji(d.countryCode)}</span>
                      {d.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <p className="voyage-destination__suggest-title m-0">
            {query.trim()
              ? t('voyage.destinationAutocomplete')
              : catalogOpen
                ? continent
                  ? CONTINENTS.find(c => c.id === continent)?.label
                  : t('voyage.destinationPopular')
                : t('voyage.destinationSuggest')}
            {!query.trim() && !catalogOpen && month != null
              ? ` — ${t('voyage.destinationSuggestMonth', { month })}`
              : ''}
          </p>

          <ul className="voyage-destination__cards">
            {listToShow.map(dest => (
              <DestinationCard
                key={dest.id}
                dest={dest}
                onPick={applyPick}
                placesLabel={t('voyage.destinationPlaces')}
              />
            ))}
          </ul>

          {listToShow.length === 0 ? (
            <p className="voyage-destination__empty m-0">
              {t('voyage.destinationEmpty')}
            </p>
          ) : null}

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

          {hasChoice ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setBrowseMode(false)}
            >
              {t('voyage.destinationKeepChoice')}
            </Button>
          ) : null}
        </div>
      ) : null}

      <StepActions
        status={status}
        canMarkReady={hasChoice}
        onMarkReady={onMarkReady}
        onLock={onLock}
        onUnlock={onUnlock}
      />
    </div>
  );
}
