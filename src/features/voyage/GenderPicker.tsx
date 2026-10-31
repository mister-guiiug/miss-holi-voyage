import type { MemberGender } from '../../entities/member-profile.ts';
import { memberGenderSchema } from '../../entities/member-profile.ts';
import { useI18n } from '../../i18n/index.ts';

const OPTIONS = memberGenderSchema.options;

type Props = {
  value: MemberGender;
  onChange: (next: MemberGender) => void;
  name?: string;
};

/** Sélecteur de sexe — pastilles, libellés entièrement en français. */
export function GenderPicker({ value, onChange, name = 'gender' }: Props) {
  const { t } = useI18n();

  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-2 text-sm font-medium">{t('voyage.gender')}</legend>
      <div className="voyage-gender flex flex-wrap gap-2" role="radiogroup">
        {OPTIONS.map(opt => {
          const on = value === opt;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={on}
              name={name}
              className={on ? 'voyage-chip voyage-chip--on' : 'voyage-chip'}
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
