import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Card } from '@mister-guiiug/dev-pwa-config/react/card';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { EmptyState } from '@mister-guiiug/dev-pwa-config/react/empty-state';
import { SkeletonGroup } from '@mister-guiiug/dev-pwa-config/react/skeleton';
import { AppFooter } from '@mister-guiiug/dev-pwa-config/react/app-footer';
import { useI18n } from '../../i18n/index.ts';
import { REPO_URL } from '../../app/links.ts';
import { useVoyage } from './store.ts';
import { MeridianField } from './MeridianField.tsx';

/**
 * Accueil voyage : marque en héros, champ méridien, foyers et voyages.
 * L’accroche `app.tagline` et le pied de page famille restent ici.
 */
export function HomeScreen() {
  const { t } = useI18n();
  const ready = useVoyage(s => s.ready);
  const load = useVoyage(s => s.load);
  const households = useVoyage(s => s.households);
  const trips = useVoyage(s => s.trips);
  const members = useVoyage(s => s.members);
  const createHousehold = useVoyage(s => s.createHousehold);
  const createInvite = useVoyage(s => s.createInvite);
  const acceptInvite = useVoyage(s => s.acceptInvite);
  const addMember = useVoyage(s => s.addMember);
  const createTrip = useVoyage(s => s.createTrip);

  const [hhName, setHhName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [tripTitle, setTripTitle] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [lastInvite, setLastInvite] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const currentHousehold = households[0];
  const householdTrips = currentHousehold
    ? trips.filter(tr => tr.householdId === currentHousehold.id)
    : [];
  const householdMembers = currentHousehold
    ? members.filter(m => m.householdId === currentHousehold.id)
    : [];

  return (
    <div className="voyage-shell flex flex-col gap-8">
      <MeridianField />

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
                void acceptInvite(inviteToken.trim()).finally(() =>
                  setBusy(false)
                );
                setInviteToken('');
              }}
            >
              <TextField
                label={t('voyage.inviteToken')}
                value={inviteToken}
                onChange={e => setInviteToken(e.target.value)}
              />
              <Button type="submit" variant="secondary" disabled={busy}>
                {t('voyage.acceptInvite')}
              </Button>
            </form>
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="voyage-rise voyage-rise-delay-1">
            <Card>
              <h2 className="voyage-brand text-2xl">{currentHousehold.name}</h2>
              <p className="text-muted mt-1 text-sm">
                {householdMembers.length} {t('voyage.members')}
              </p>
              <ul className="mt-3 flex flex-col gap-1 text-sm">
                {householdMembers.map(m => (
                  <li key={m.id}>
                    {m.displayName}{' '}
                    <span className="text-muted">({m.ageBand})</span>
                  </li>
                ))}
              </ul>
              <form
                className="mt-4 flex flex-wrap items-end gap-2"
                onSubmit={e => {
                  e.preventDefault();
                  if (!memberName.trim()) return;
                  void addMember(currentHousehold.id, memberName.trim());
                  setMemberName('');
                }}
              >
                <TextField
                  label={t('voyage.memberName')}
                  value={memberName}
                  onChange={e => setMemberName(e.target.value)}
                />
                <Button type="submit" variant="secondary">
                  {t('voyage.addMember')}
                </Button>
              </form>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    void createInvite(currentHousehold.id).then(setLastInvite);
                  }}
                >
                  {t('voyage.createInvite')}
                </Button>
              </div>
              {lastInvite ? (
                <p className="bg-surface-2 mt-3 break-all rounded-md p-2 text-xs">
                  {t('voyage.inviteReady')}: {lastInvite}
                </p>
              ) : null}
            </Card>
          </div>

          <section className="voyage-rise voyage-rise-delay-2 flex flex-col gap-3">
            <h2 className="voyage-brand text-2xl">{t('voyage.trips')}</h2>
            {householdTrips.length === 0 ? (
              <p className="text-muted text-sm">{t('voyage.noTrips')}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {householdTrips.map(tr => (
                  <li key={tr.id}>
                    <Card>
                      <Link
                        to={`/voyage/${tr.id}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {tr.title}
                      </Link>
                      <p className="text-muted mt-1 text-sm">
                        {tr.destinationCountry || t('voyage.noDestination')}
                        {tr.style !== 'undecided' ? ` · ${tr.style}` : ''}
                      </p>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="flex flex-wrap items-end gap-2"
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
          </section>
        </>
      )}

      <AppFooter repoUrl={REPO_URL} />
    </div>
  );
}
