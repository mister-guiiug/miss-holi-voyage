import { useState, type ReactNode } from 'react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import {
  excursionTicketClass,
  flightTicketClass,
} from '../../entities/ticket-age.ts';
import type { HouseholdMember } from '../../entities/schemas.ts';
import type {
  MemberGender,
  MemberInterestId,
} from '../../entities/member-profile.ts';
import { isMemberInterestId } from '../../entities/member-profile.ts';
import { useI18n } from '../../i18n/index.ts';
import { MemberAvatar } from './MemberAvatar.tsx';
import { GenderPicker } from './GenderPicker.tsx';
import { InterestPicker } from './InterestPicker.tsx';

type Patch = {
  displayName?: string;
  birthDate?: string | null;
  gender?: MemberGender;
  interests?: MemberInterestId[];
};

type Props = {
  members: HouseholdMember[];
  ticketOn: string;
  onAdd: (input: {
    displayName: string;
    birthDate: string | null;
    gender: MemberGender;
    interests: MemberInterestId[];
  }) => void;
  onUpdate: (memberId: string, patch: Patch) => void;
  inviteSlot?: ReactNode;
};

function knownInterests(raw: readonly string[]): MemberInterestId[] {
  return raw.filter(isMemberInterestId);
}

/** Liste famille en filets de carnet — monogrammes, pas pastilles. */
export function FamilyMembersPanel({
  members,
  ticketOn,
  onAdd,
  onUpdate,
  inviteSlot,
}: Props) {
  const { t } = useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBirth, setEditBirth] = useState('');
  const [editGender, setEditGender] = useState<MemberGender>('unspecified');
  const [editInterests, setEditInterests] = useState<MemberInterestId[]>([]);

  const [memberName, setMemberName] = useState('');
  const [memberBirth, setMemberBirth] = useState('');
  const [memberGender, setMemberGender] = useState<MemberGender>('unspecified');
  const [memberInterests, setMemberInterests] = useState<MemberInterestId[]>(
    []
  );
  const [showAddExtras, setShowAddExtras] = useState(false);
  const [showAddForm, setShowAddForm] = useState(members.length === 0);

  function openEdit(m: HouseholdMember) {
    setEditingId(m.id);
    setEditName(m.displayName);
    setEditBirth(m.birthDate ?? '');
    setEditGender(m.gender ?? 'unspecified');
    setEditInterests(knownInterests(m.interests));
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="m-0 flex list-none flex-col p-0">
        {members.map(m => {
          const flight = flightTicketClass(m.birthDate, ticketOn, m.ageBand);
          const excursion = excursionTicketClass(
            m.birthDate,
            ticketOn,
            m.ageBand
          );
          const open = editingId === m.id;
          const gender = m.gender ?? 'unspecified';
          const interests = knownInterests(m.interests);

          return (
            <li key={m.id} className="voyage-member">
              <div className="flex items-start gap-3">
                <MemberAvatar
                  displayName={m.displayName}
                  ageBand={m.ageBand}
                  gender={gender}
                  className="voyage-member__avatar"
                />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="voyage-member__open"
                    aria-expanded={open}
                    onClick={() => (open ? setEditingId(null) : openEdit(m))}
                  >
                    <span className="voyage-member__name block">
                      {m.displayName}
                    </span>
                    <span className="text-muted text-sm font-normal">
                      {t(`voyage.ageBandOption.${m.ageBand}`)}
                      {m.birthDate ? ` · ${m.birthDate}` : ''}
                      {gender !== 'unspecified'
                        ? ` · ${t(`voyage.genderOption.${gender}`)}`
                        : ''}
                    </span>
                  </button>
                  <p className="text-muted mt-1 text-xs">
                    {t('voyage.flightClass')}:{' '}
                    {t(`voyage.ticketClass.${flight}`)} ·{' '}
                    {t('voyage.excursionClass')}:{' '}
                    {t(`voyage.ticketClass.${excursion}`)}
                  </p>
                  {interests.length > 0 && !open ? (
                    <ul className="voyage-member__tags">
                      {interests.map(id => (
                        <li key={id}>{t(`voyage.interest.${id}`)}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>

              {open ? (
                <form
                  className="mt-3 flex flex-col gap-3"
                  onSubmit={e => {
                    e.preventDefault();
                    if (!editName.trim()) return;
                    onUpdate(m.id, {
                      displayName: editName.trim(),
                      birthDate: editBirth.trim() || null,
                      gender: editGender,
                      interests: editInterests,
                    });
                    setEditingId(null);
                  }}
                >
                  <TextField
                    label={t('voyage.memberName')}
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    required
                  />
                  <TextField
                    label={t('voyage.birthDate')}
                    type="date"
                    value={editBirth}
                    onChange={e => setEditBirth(e.target.value)}
                  />
                  <GenderPicker
                    value={editGender}
                    onChange={setEditGender}
                    name={`gender-${m.id}`}
                  />
                  <InterestPicker
                    value={editInterests}
                    onChange={setEditInterests}
                    idPrefix={`edit-${m.id}`}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" variant="secondary">
                      {t('voyage.saveMember')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      {t('voyage.cancelEdit')}
                    </Button>
                  </div>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>

      {!showAddForm ? (
        <button
          type="button"
          className="voyage-ink-btn self-start mt-2"
          onClick={() => setShowAddForm(true)}
        >
          {t('voyage.addMemberCta')}
        </button>
      ) : (
        <form
          className="voyage-member-add--open flex flex-col gap-3"
          onSubmit={e => {
            e.preventDefault();
            if (!memberName.trim()) return;
            onAdd({
              displayName: memberName.trim(),
              birthDate: memberBirth.trim() || null,
              gender: memberGender,
              interests: memberInterests,
            });
            setMemberName('');
            setMemberBirth('');
            setMemberGender('unspecified');
            setMemberInterests([]);
            setShowAddExtras(false);
            setShowAddForm(false);
          }}
        >
          <div className="flex flex-wrap items-end gap-2">
            <TextField
              label={t('voyage.memberName')}
              value={memberName}
              onChange={e => setMemberName(e.target.value)}
              autoFocus={members.length > 0}
            />
            <TextField
              label={t('voyage.birthDate')}
              type="date"
              value={memberBirth}
              onChange={e => setMemberBirth(e.target.value)}
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={!memberName.trim()}
            >
              {t('voyage.addMember')}
            </Button>
            {members.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowAddForm(false);
                  setShowAddExtras(false);
                }}
              >
                {t('voyage.cancelEdit')}
              </Button>
            ) : null}
          </div>
          <button
            type="button"
            className="voyage-ink-btn self-start text-sm"
            aria-expanded={showAddExtras}
            onClick={() => setShowAddExtras(v => !v)}
          >
            {showAddExtras
              ? t('voyage.hideProfileExtras')
              : t('voyage.showProfileExtras')}
          </button>
          {showAddExtras ? (
            <div className="flex flex-col gap-3">
              <GenderPicker value={memberGender} onChange={setMemberGender} />
              <InterestPicker
                value={memberInterests}
                onChange={setMemberInterests}
                idPrefix="add"
              />
            </div>
          ) : null}
        </form>
      )}

      {inviteSlot}
    </div>
  );
}
