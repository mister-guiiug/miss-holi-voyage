import {
  MEMBER_INTERESTS,
  MAX_MEMBER_INTERESTS,
  toggleMemberInterest,
  type MemberInterestId,
} from '../../entities/member-profile.ts';
import { useI18n } from '../../i18n/index.ts';

type Props = {
  value: readonly string[];
  onChange: (next: MemberInterestId[]) => void;
  idPrefix?: string;
};

/**
 * Grille de profils voyageur (max 4) — pastilles cliquables, libellés FR via i18n.
 */
export function InterestPicker({
  value,
  onChange,
  idPrefix = 'interest',
}: Props) {
  const { t } = useI18n();
  const selected = new Set(
    value.filter((v): v is MemberInterestId =>
      MEMBER_INTERESTS.some(i => i.id === v)
    )
  );
  const count = selected.size;

  return (
    <fieldset className="voyage-interests m-0 min-w-0 border-0 p-0">
      <legend className="voyage-interests__legend">
        {t('voyage.interests')}
      </legend>
      <p className="text-muted mt-1 mb-3 text-xs">
        {t('voyage.interestsHint').replace('{n}', String(MAX_MEMBER_INTERESTS))}
        <span className="ms-2 tabular-nums">
          {count} / {MAX_MEMBER_INTERESTS}
        </span>
      </p>
      <div className="voyage-interests__grid" role="group">
        {MEMBER_INTERESTS.map(item => {
          const on = selected.has(item.id);
          const disabled = !on && count >= MAX_MEMBER_INTERESTS;
          return (
            <button
              key={item.id}
              id={`${idPrefix}-${item.id}`}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              className={
                on ? 'voyage-interest voyage-interest--on' : 'voyage-interest'
              }
              onClick={() =>
                onChange(toggleMemberInterest([...selected], item.id))
              }
            >
              <span className="voyage-interest__emoji" aria-hidden>
                {item.emoji}
              </span>
              <span className="voyage-interest__label">
                {t(`voyage.interest.${item.id}`)}
              </span>
              <span className="voyage-interest__desc text-muted">
                {t(`voyage.interestDesc.${item.id}`)}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
