import type { MemberGender } from '../../entities/member-profile.ts';
import { memberGenderSchema } from '../../entities/member-profile.ts';
import { useI18n } from '../../i18n/index.ts';

const OPTIONS = memberGenderSchema.options;

type Props = {
  value: MemberGender;
  onChange: (next: MemberGender) => void;
  name?: string;
};

/** Sexe — sélection typo soulignée, pas de pastilles. */
export function GenderPicker({ value, onChange, name = 'gender' }: Props) {
  const { t } = useI18n();

  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-2 text-sm font-medium">{t('voyage.gender')}</legend>
      <div
        className="voyage-choice-row"
        role="radiogroup"
        aria-label={t('voyage.gender')}
      >
        {OPTIONS.map(opt => {
          const on = value === opt;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={on}
              name={name}
              className={
                on ? 'voyage-choice voyage-choice--on' : 'voyage-choice'
              }
              onClick={() => onChange(opt)}
            >
              {t(`voyage.genderOption.${opt}`)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
