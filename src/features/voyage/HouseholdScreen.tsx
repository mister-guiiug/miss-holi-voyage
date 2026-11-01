import { useEffect, useState } from 'react';
import { VoyageLink } from './VoyageLink.tsx';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { EmptyState } from '@mister-guiiug/dev-pwa-config/react/empty-state';
import { SkeletonGroup } from '@mister-guiiug/dev-pwa-config/react/skeleton';
import { useI18n } from '../../i18n/index.ts';
import { useVoyage } from './store.ts';
import { InviteShare } from './InviteShare.tsx';
import { FamilyMembersPanel } from './FamilyMembersPanel.tsx';
import { VoyageAtmosphere } from './VoyageAtmosphere.tsx';
import { VoyageSheet } from './VoyageSheet.tsx';

/** Menu foyer — page de carnet : nom éditable, voyageurs, invitation. */
export function HouseholdScreen() {
  const { t } = useI18n();
  const ready = useVoyage(s => s.ready);
  const load = useVoyage(s => s.load);
  const households = useVoyage(s => s.households);
  const trips = useVoyage(s => s.trips);
  const members = useVoyage(s => s.members);
  const createHousehold = useVoyage(s => s.createHousehold);
  const updateHousehold = useVoyage(s => s.updateHousehold);
  const createInvite = useVoyage(s => s.createInvite);
  const addMember = useVoyage(s => s.addMember);
  const updateMember = useVoyage(s => s.updateMember);

  const [hhName, setHhName] = useState('');
  const [editName, setEditName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastInvite, setLastInvite] = useState<{
    code: string;
    expiresAt: string;
  } | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  const current = households[0];
  const householdMembers = current
    ? members.filter(m => m.householdId === current.id)
    : [];
  const ticketOn =
    trips.find(tr => tr.householdId === current?.id)?.dateWindowStart ??
    new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (current && !editingName) setEditName(current.name);
  }, [current, editingName]);

  if (!ready) {
    return <SkeletonGroup label={t('voyage.householdMenu')} lines={4} />;
  }

  if (!current) {
    return (
      <div className="voyage-shell flex flex-col gap-6">
        <VoyageAtmosphere />
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
              void createHousehold(hhName.trim()).finally(() => setBusy(false));
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
          <VoyageLink
            to="/rejoindre"
            className="voyage-ink-link mt-4 inline-block text-sm"
          >
            {t('voyage.joinTitle')}
          </VoyageLink>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="voyage-shell flex flex-col gap-2">
      <VoyageAtmosphere />
      <header className="voyage-rise relative pt-1 pb-2">
        <p className="text-muted m-0 text-sm">{t('voyage.householdMenu')}</p>
        {editingName ? (
          <form
            className="mt-2 flex flex-wrap items-end gap-2"
            onSubmit={e => {
              e.preventDefault();
              if (!editName.trim()) return;
              void updateHousehold(current.id, { name: editName.trim() });
              setEditingName(false);
            }}
          >
            <TextField
              label={t('voyage.householdName')}
              value={editName}
              onChange={e => setEditName(e.target.value)}
              autoFocus
            />
            <Button type="submit" variant="secondary">
              {t('voyage.saveHouseholdName')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditName(current.name);
                setEditingName(false);
              }}
            >
              {t('voyage.cancelEdit')}
            </Button>
          </form>
        ) : (
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            <h2 className="voyage-brand m-0 text-3xl sm:text-4xl">
              {current.name}
            </h2>
            <button
              type="button"
              className="voyage-ink-btn text-sm"
              onClick={() => setEditingName(true)}
            >
              {t('voyage.editHouseholdName')}
            </button>
          </div>
        )}
        <p className="text-muted mt-2 text-sm">
          {householdMembers.length} {t('voyage.members')}
        </p>
      </header>

      <VoyageSheet
        title={t('voyage.membersTitle')}
        className="voyage-rise voyage-rise-delay-1"
      >
        <FamilyMembersPanel
          members={householdMembers}
          ticketOn={ticketOn}
          onAdd={input => {
            void addMember(current.id, input.displayName, {
              birthDate: input.birthDate,
              gender: input.gender,
              interests: input.interests,
            });
          }}
          onUpdate={(id, patch) => {
            void updateMember(id, patch);
          }}
          inviteSlot={
            <>
              <div className="mt-4">
                <button
                  type="button"
                  className="voyage-ink-btn"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void createInvite(current.id)
                      .then(inv =>
                        setLastInvite({
                          code: inv.code,
                          expiresAt: inv.expiresAt,
                        })
                      )
                      .catch((cause: unknown) => {
                        window.alert(
                          cause instanceof Error
                            ? cause.message
                            : t('voyage.inviteInvalid')
                        );
                      })
                      .finally(() => setBusy(false));
                  }}
                >
                  {t('voyage.createInvite')}
                </button>
              </div>
              {lastInvite ? (
                <InviteShare
                  code={lastInvite.code}
                  expiresAt={lastInvite.expiresAt}
                  onClose={() => setLastInvite(null)}
                />
              ) : null}
            </>
          }
        />
      </VoyageSheet>

      <p className="voyage-rise voyage-rise-delay-2 py-4 text-sm">
        <VoyageLink to="/" className="voyage-ink-link">
          {t('voyage.backToTrips')}
        </VoyageLink>
      </p>
    </div>
  );
}
