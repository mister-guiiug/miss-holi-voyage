import type { AgeBand } from '../../entities/schemas.ts';
import type { MemberGender } from '../../entities/member-profile.ts';

type Props = {
  displayName: string;
  ageBand: AgeBand;
  gender: MemberGender;
  className?: string;
};

function palette(gender: MemberGender, ageBand: AgeBand) {
  if (ageBand === 'infant' || ageBand === 'child') {
    return gender === 'male'
      ? {
          skin: '#f3c9a0',
          hair: '#5c3d2e',
          shirt: '#3dccc7',
          accent: '#f0a202',
        }
      : gender === 'female'
        ? {
            skin: '#f3c9a0',
            hair: '#8b4513',
            shirt: '#e8913a',
            accent: '#7ec8c8',
          }
        : {
            skin: '#f3c9a0',
            hair: '#6b5b4f',
            shirt: '#5b8def',
            accent: '#f0a202',
          };
  }
  if (ageBand === 'teen') {
    return gender === 'male'
      ? {
          skin: '#e8b890',
          hair: '#2a1f18',
          shirt: '#0b6e6e',
          accent: '#f0a202',
        }
      : gender === 'female'
        ? {
            skin: '#e8b890',
            hair: '#3b2314',
            shirt: '#c45c26',
            accent: '#3dccc7',
          }
        : {
            skin: '#e8b890',
            hair: '#4a3728',
            shirt: '#5b8def',
            accent: '#e8913a',
          };
  }
  if (ageBand === 'senior') {
    return {
      skin: '#e0b896',
      hair: '#d8d2c8',
      shirt: gender === 'female' ? '#b85c38' : '#0b6e6e',
      accent: '#f0a202',
    };
  }
  return gender === 'male'
    ? { skin: '#e8b890', hair: '#2c2118', shirt: '#0b6e6e', accent: '#f0a202' }
    : gender === 'female'
      ? {
          skin: '#e8b890',
          hair: '#3b2314',
          shirt: '#c45c26',
          accent: '#3dccc7',
        }
      : {
          skin: '#e8b890',
          hair: '#5a4638',
          shirt: '#1e3a4c',
          accent: '#f0a202',
        };
}

/**
 * Avatar illustré (SVG inline) — âge + sexe pilotent la silhouette, sans asset
 * externe. Style « personnage » pour la liste famille, pas un monogramme.
 */
export function MemberAvatar({
  displayName,
  ageBand,
  gender,
  className = '',
}: Props) {
  const c = palette(gender, ageBand);
  const small = ageBand === 'infant' || ageBand === 'child';
  const label = displayName.trim() || 'voyageur';

  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      width={56}
      height={56}
      role="img"
      aria-label={label}
    >
      <circle cx="32" cy="32" r="30" fill="var(--dwc-surface-2)" />
      <circle
        cx="32"
        cy="32"
        r="28"
        fill="none"
        stroke={c.accent}
        strokeWidth="1.5"
        opacity="0.55"
      />
      {/* buste */}
      <ellipse
        cx="32"
        cy="58"
        rx={small ? 14 : 18}
        ry={small ? 10 : 12}
        fill={c.shirt}
      />
      {/* tête */}
      <circle cx="32" cy={small ? 28 : 26} r={small ? 12 : 14} fill={c.skin} />
      {/* cheveux */}
      {gender === 'female' ? (
        <>
          <path
            d={
              small
                ? 'M20 28c0-10 6-16 12-16s12 6 12 16c-3-6-8-8-12-8s-9 2-12 8z'
                : 'M17 28c0-12 7-18 15-18s15 6 15 18c-4-7-9-10-15-10s-11 3-15 10z'
            }
            fill={c.hair}
          />
          <path
            d={
              small
                ? 'M18 30c-1 8 2 14 6 16 0-6 1-10 2-12-4-1-6-2-8-4zM46 30c1 8-2 14-6 16 0-6-1-10-2-12 4-1 6-2 8-4z'
                : 'M16 30c-1 10 2 16 7 18 0-7 1-12 2-14-5-1-7-2-9-4zM48 30c1 10-2 16-7 18 0-7-1-12-2-14 5-1 7-2 9-4z'
            }
            fill={c.hair}
          />
        </>
      ) : gender === 'male' ? (
        <path
          d={
            small
              ? 'M20 26c1-9 6-14 12-14s11 5 12 14c-3-5-8-7-12-7s-9 2-12 7z'
              : 'M18 24c1-10 7-16 14-16s13 6 14 16c-4-6-9-8-14-8s-10 2-14 8z'
          }
          fill={c.hair}
        />
      ) : (
        <path
          d={
            small
              ? 'M21 27c1-8 5-13 11-13s10 5 11 13c-2-4-6-6-11-6s-9 2-11 6z'
              : 'M19 25c1-9 6-15 13-15s12 6 13 15c-3-5-8-7-13-7s-10 2-13 7z'
          }
          fill={c.hair}
        />
      )}
      {/* yeux */}
      <circle cx="27" cy={small ? 28 : 26} r="1.4" fill="#1a1a1a" />
      <circle cx="37" cy={small ? 28 : 26} r="1.4" fill="#1a1a1a" />
      {/* sourire */}
      <path
        d={small ? 'M27 33c2 2.2 6 2.2 8 0' : 'M26 31c2.5 2.8 7.5 2.8 10 0'}
        fill="none"
        stroke="#1a1a1a"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      {ageBand === 'senior' ? (
        <path
          d="M24 22c2-1 4-1 6 0M34 22c2-1 4-1 6 0"
          fill="none"
          stroke="#c4a882"
          strokeWidth="1"
          opacity="0.7"
        />
      ) : null}
    </svg>
  );
}
