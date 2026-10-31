import type { AgeBand } from '../../entities/schemas.ts';
import type { MemberGender } from '../../entities/member-profile.ts';

type Props = {
  displayName: string;
  ageBand: AgeBand;
  gender: MemberGender;
  className?: string;
};

/** Monogramme encre — initiale dans un cercle trait fin. */
export function MemberAvatar({
  displayName,
  ageBand,
  gender,
  className = '',
}: Props) {
  const initial = (displayName.trim().charAt(0) || '?').toUpperCase();
  const label = displayName.trim() || 'voyageur';
  const size = ageBand === 'infant' || ageBand === 'child' ? 40 : 48;

  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role="img"
      aria-label={`${label}${gender !== 'unspecified' ? `, ${gender}` : ''}`}
    >
      <circle
        cx="24"
        cy="24"
        r="22"
        fill="var(--dwc-surface)"
        stroke="var(--voyage-brand)"
        strokeWidth="1.25"
      />
      <text
        x="24"
        y="24"
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--voyage-brand)"
        fontFamily="var(--font-display), Georgia, serif"
        fontSize="18"
        fontWeight="600"
      >
        {initial}
      </text>
    </svg>
  );
}
