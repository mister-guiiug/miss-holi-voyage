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
import {
  isMemberInterestId,
  MEMBER_INTERESTS,
} from '../../entities/member-profile.ts';
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

/**
 * Liste famille + édition inline : nom, sexe, naissance, centres d’intérêt,
 * avatar illustré.
 */
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

  function openEdit(m: HouseholdMember) {
    setEditingId(m.id);
    setEditName(m.displayName);
    setEditBirth(m.birthDate ?? '');
    setEditGender(m.gender ?? 'unspecified');
    setEditInterests(knownInterests(m.interests));
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
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
            <li
              key={m.id}
              className="voyage-member border-border border-b pb-3 last:border-b-0"
            >
              <div className="flex items-start gap-3">
                <MemberAvatar
                  displayName={m.displayName}
                  ageBand={m.ageBand}
                  gender={gender}
                  className="voyage-member__avatar shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="voyage-member__open text-left"
                    aria-expanded={open}
                    onClick={() => (open ? setEditingId(null) : openEdit(m))}
                  >
                    <span className="block font-medium">{m.displayName}</span>
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
                    <ul className="voyage-member__tags mt-2 flex list-none flex-wrap gap-1.5 p-0">
                      {interests.map(id => {
                        const meta = MEMBER_INTERESTS.find(i => i.id === id);
                        return (
                          <li
                            key={id}
                            className="voyage-chip voyage-chip--soft"
                          >
                            <span aria-hidden>{meta?.emoji}</span>{' '}
                            {t(`voyage.interest.${id}`)}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              </div>

              {open ? (
                <form
                  className="voyage-member__edit mt-3 flex flex-col gap-3"
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

      <form
        className="voyage-member-add flex flex-col gap-3"
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
        }}
      >
        <div className="flex flex-wrap items-end gap-2">
          <TextField
            label={t('voyage.memberName')}
            value={memberName}
            onChange={e => setMemberName(e.target.value)}
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
        </div>
        <button
          type="button"
          className="text-muted self-start text-sm underline-offset-2 hover:underline"
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

      {inviteSlot}
    </div>
  );
}
