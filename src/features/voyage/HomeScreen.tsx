import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { EmptyState } from '@mister-guiiug/dev-pwa-config/react/empty-state';
import { SkeletonGroup } from '@mister-guiiug/dev-pwa-config/react/skeleton';
import { AppFooter } from '@mister-guiiug/dev-pwa-config/react/app-footer';
import { useI18n } from '../../i18n/index.ts';
import { REPO_URL } from '../../app/links.ts';
import { normalizeInviteCode } from '../../entities/invite-code.ts';
import { useVoyage } from './store.ts';
import { VoyageAtmosphere } from './VoyageAtmosphere.tsx';
import { VoyageRule } from './VoyageSheet.tsx';

/**
 * Accueil carnet : marque, teaser foyer en filet, voyage en composition centrale.
 */
export function HomeScreen() {
  const { t } = useI18n();
  const ready = useVoyage(s => s.ready);
  const load = useVoyage(s => s.load);
  const households = useVoyage(s => s.households);
  const trips = useVoyage(s => s.trips);
  const members = useVoyage(s => s.members);
  const createHousehold = useVoyage(s => s.createHousehold);
  const acceptInvite = useVoyage(s => s.acceptInvite);
  const createTrip = useVoyage(s => s.createTrip);

  const [hhName, setHhName] = useState('');
  const [tripTitle, setTripTitle] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showNewTrip, setShowNewTrip] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const currentHousehold = households[0];
  const householdTrips = currentHousehold
    ? trips.filter(tr => tr.householdId === currentHousehold.id)
    : [];
  const memberCount = currentHousehold
    ? members.filter(m => m.householdId === currentHousehold.id).length
    : 0;
  const currentTrip =
    householdTrips.find(tr => tr.isCurrent) ?? householdTrips[0];
  const otherTrips = householdTrips.filter(tr => tr.id !== currentTrip?.id);

  return (
    <div className="voyage-shell flex flex-col gap-6">
      <VoyageAtmosphere />

      <header className="voyage-rise relative pt-2">
        <p className="voyage-brand text-4xl sm:text-5xl">{t('app.name')}</p>
        <p className="voyage-lede text-muted mt-3 max-w-prose text-base">
          {t('app.tagline')}
        </p>
      </header>

      {!ready ? (
        <SkeletonGroup label={t('voyage.trips')} lines={3} />
      ) : !currentHousehold ? (
        <div className="voyage-rise voyage-rise-delay-1">
          <EmptyState
            title={t('voyage.noHousehold')}
            description={t('voyage.noHouseholdHint')}
          >
            <form
              className="mt-4 flex flex-col gap-3"
              onSubmit={e => {
                e.preventDefault();
                if (!hhName.trim()) return;
                setBusy(true);
                void createHousehold(hhName.trim()).finally(() =>
                  setBusy(false)
                );
                setHhName('');
              }}
            >
              <TextField
                label={t('voyage.householdName')}
                value={hhName}
                onChange={e => setHhName(e.target.value)}
              />
              <Button type="submit" disabled={busy || !hhName.trim()}>
                {t('voyage.createHousehold')}
              </Button>
            </form>
            <form
              className="mt-6 flex flex-col gap-3"
              onSubmit={e => {
                e.preventDefault();
                if (!inviteToken.trim()) return;
                setBusy(true);
                setJoinError(null);
                void acceptInvite(normalizeInviteCode(inviteToken))
                  .catch(() => setJoinError(t('voyage.inviteInvalid')))
                  .finally(() => setBusy(false));
                setInviteToken('');
              }}
            >
              <TextField
                label={t('voyage.inviteCodeLabel')}
                value={inviteToken}
                onChange={e => setInviteToken(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              {joinError ? (
                <p role="alert" className="text-danger m-0 text-sm">
                  {joinError}
                </p>
              ) : null}
              <Button type="submit" variant="secondary" disabled={busy}>
                {t('voyage.acceptInvite')}
              </Button>
              <Link to="/rejoindre" className="voyage-ink-link text-sm">
                {t('voyage.joinTitle')}
              </Link>
            </form>
          </EmptyState>
        </div>
      ) : (
        <>
          <Link
            to="/foyer"
            className="voyage-hh-teaser voyage-rise voyage-rise-delay-1"
          >
            <span className="voyage-hh-teaser__name">
              {currentHousehold.name}
            </span>
            <span className="text-muted text-sm">
              {memberCount} {t('voyage.members')} — {t('voyage.openHousehold')}
            </span>
          </Link>

          <section className="voyage-rise voyage-rise-delay-2">
            {householdTrips.length === 0 ? (
              <div className="voyage-trip-hero voyage-trip-hero--empty">
                <p className="voyage-brand m-0 text-2xl sm:text-3xl">
                  {t('voyage.noTripsHero')}
                </p>
                <p className="text-muted mt-2 max-w-prose text-sm">
                  {t('voyage.noTrips')}
                </p>
                <form
                  className="mt-5 flex flex-wrap items-end gap-2"
                  onSubmit={e => {
                    e.preventDefault();
                    if (!tripTitle.trim()) return;
                    void createTrip(currentHousehold.id, tripTitle.trim());
                    setTripTitle('');
                  }}
                >
                  <TextField
                    label={t('voyage.tripTitle')}
                    value={tripTitle}
                    onChange={e => setTripTitle(e.target.value)}
                  />
                  <Button type="submit">{t('voyage.createTrip')}</Button>
                </form>
              </div>
            ) : (
              <>
                {currentTrip ? (
                  <article className="voyage-trip-hero">
                    <Link
                      to={`/voyage/${currentTrip.id}`}
                      className="voyage-trip-hero__link"
                    >
                      <span className="voyage-trip-hero__kicker">
                        {t('voyage.currentTrip')}
                      </span>
                      <span className="voyage-trip-hero__title">
                        {currentTrip.title}
                      </span>
                      <span className="voyage-trip-hero__meta">
                        {currentTrip.destinationCountry ||
                          t('voyage.noDestination')}
                        {currentTrip.style !== 'undecided'
                          ? ` · ${t(`voyage.styleLabel.${currentTrip.style}`)}`
                          : ''}
                      </span>
                      <span className="voyage-trip-hero__cta">
                        {t('voyage.continueTrip')}
                      </span>
                    </Link>
                  </article>
                ) : null}

                {otherTrips.length > 0 ? (
                  <ul className="m-0 mt-2 flex list-none flex-col p-0">
                    {otherTrips.map(tr => (
                      <li
                        key={tr.id}
                        className="voyage-trip-hero voyage-trip-hero--secondary"
                      >
                        <Link
                          to={`/voyage/${tr.id}`}
                          className="voyage-trip-hero__link"
                        >
                          <span
                            className="voyage-trip-hero__title"
                            style={{ fontSize: '1.35rem' }}
                          >
                            {tr.title}
                          </span>
                          <span className="voyage-trip-hero__meta">
                            {tr.destinationCountry || t('voyage.noDestination')}
                            {tr.style !== 'undecided'
                              ? ` · ${t(`voyage.styleLabel.${tr.style}`)}`
                              : ''}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <VoyageRule className="mt-4" />
                {!showNewTrip ? (
                  <button
                    type="button"
                    className="voyage-ink-btn mt-3"
                    onClick={() => setShowNewTrip(true)}
                  >
                    {t('voyage.createTrip')}
                  </button>
                ) : (
                  <form
                    className="voyage-member-add--open mt-3 flex flex-wrap items-end gap-2"
                    onSubmit={e => {
                      e.preventDefault();
                      if (!tripTitle.trim()) return;
                      void createTrip(currentHousehold.id, tripTitle.trim());
                      setTripTitle('');
                      setShowNewTrip(false);
                    }}
                  >
                    <TextField
                      label={t('voyage.tripTitle')}
                      value={tripTitle}
                      onChange={e => setTripTitle(e.target.value)}
                      autoFocus
                    />
                    <Button type="submit">{t('voyage.createTrip')}</Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowNewTrip(false)}
                    >
                      {t('voyage.cancelEdit')}
                    </Button>
                  </form>
                )}
              </>
            )}
          </section>
        </>
      )}

      <AppFooter repoUrl={REPO_URL} issues />
    </div>
  );
}
