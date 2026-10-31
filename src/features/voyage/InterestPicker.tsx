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

/** Centres d’intérêt — liste à cocher typographique, sans emoji. */
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
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-1 text-sm font-medium">
        {t('voyage.interests')}
      </legend>
      <p className="text-muted mb-2 mt-0 text-xs">
        {t('voyage.interestsHint').replace('{n}', String(MAX_MEMBER_INTERESTS))}
        <span className="ms-2 tabular-nums">
          {count} / {MAX_MEMBER_INTERESTS}
        </span>
      </p>
      <ul className="voyage-interest-list" role="group">
        {MEMBER_INTERESTS.map(item => {
          const on = selected.has(item.id);
          const disabled = !on && count >= MAX_MEMBER_INTERESTS;
          return (
            <li key={item.id}>
              <button
                id={`${idPrefix}-${item.id}`}
                type="button"
                aria-pressed={on}
                disabled={disabled}
                className={
                  on
                    ? 'voyage-interest-row voyage-interest-row--on'
                    : 'voyage-interest-row'
                }
                onClick={() =>
                  onChange(toggleMemberInterest([...selected], item.id))
                }
              >
                <span className="voyage-interest-row__mark" aria-hidden />
                <span>
                  <span className="voyage-interest-row__label">
                    {t(`voyage.interest.${item.id}`)}
                  </span>
                  <span className="voyage-interest-row__desc">
                    {t(`voyage.interestDesc.${item.id}`)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
