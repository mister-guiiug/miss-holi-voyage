import { useState } from 'react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import type { StyleProposal } from '../../entities/ai-tools.ts';
import { useI18n } from '../../i18n/index.ts';

type StyleKey = 'hub' | 'roadtrip';

type Props = {
  currentStyle: 'hub' | 'roadtrip' | 'undecided';
  proposals: StyleProposal[];
  onPropose: () => void;
  onChoose: (style: StyleKey, summary: string) => void;
};

function HubArt() {
  return (
    <svg
      className="voyage-style-art"
      viewBox="0 0 320 160"
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="hub-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7ec8c8" />
          <stop offset="55%" stopColor="#d5eeee" />
          <stop offset="100%" stopColor="#e8f2f5" />
        </linearGradient>
      </defs>
      <rect width="320" height="160" fill="url(#hub-sky)" />
      <circle
        className="voyage-style-sun"
        cx="268"
        cy="36"
        r="18"
        fill="#f0a202"
        opacity="0.9"
      />
      <path d="M0 118h320v42H0z" fill="#0b6e6e" opacity="0.12" />
      {/* aéroport / hub */}
      <rect x="48" y="78" width="72" height="48" rx="4" fill="#0b6e6e" />
      <rect x="58" y="88" width="18" height="22" rx="2" fill="#d5eeee" />
      <rect x="84" y="88" width="18" height="22" rx="2" fill="#d5eeee" />
      <rect
        x="136"
        y="62"
        width="44"
        height="64"
        rx="3"
        fill="#0a1620"
        opacity="0.55"
      />
      <rect
        x="190"
        y="70"
        width="36"
        height="56"
        rx="3"
        fill="#0b6e6e"
        opacity="0.75"
      />
      <rect x="236" y="86" width="52" height="40" rx="3" fill="#1e3a4c" />
      {/* rayons / trajets journée */}
      <g
        className="voyage-style-rays"
        stroke="#0b6e6e"
        strokeWidth="2"
        fill="none"
        opacity="0.45"
      >
        <path d="M84 102c40-28 90-28 130 0" />
        <path d="M84 102c28-18 70-40 120-18" />
        <path d="M84 102c50-8 100 10 140 28" />
      </g>
      <circle cx="84" cy="102" r="5" fill="#f0a202" />
    </svg>
  );
}

function RoadtripArt() {
  return (
    <svg
      className="voyage-style-art"
      viewBox="0 0 320 160"
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="rt-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8913a" />
          <stop offset="40%" stopColor="#f4b183" />
          <stop offset="100%" stopColor="#e8f2f5" />
        </linearGradient>
      </defs>
      <rect width="320" height="160" fill="url(#rt-sky)" />
      <path
        d="M0 100 L80 55 L140 90 L200 40 L280 85 L320 60 V160 H0z"
        fill="#0b6e6e"
        opacity="0.35"
      />
      <path
        d="M0 118 L90 70 L160 105 L240 58 L320 95 V160 H0z"
        fill="#1e3a4c"
        opacity="0.4"
      />
      {/* route */}
      <path
        d="M-10 160 Q80 110 160 120 T340 90"
        fill="none"
        stroke="#0a1620"
        strokeWidth="18"
        opacity="0.55"
      />
      <path
        className="voyage-style-road-dash"
        d="M-10 160 Q80 110 160 120 T340 90"
        fill="none"
        stroke="#f0a202"
        strokeWidth="3"
        strokeDasharray="10 14"
      />
      {/* voiture */}
      <g className="voyage-style-car">
        <rect x="148" y="108" width="36" height="14" rx="4" fill="#0b6e6e" />
        <path d="M154 108 L162 98 H174 L182 108z" fill="#3dccc7" />
        <circle cx="156" cy="124" r="5" fill="#0a1620" />
        <circle cx="176" cy="124" r="5" fill="#0a1620" />
      </g>
    </svg>
  );
}

const ORDER: StyleKey[] = ['hub', 'roadtrip'];

/**
 * Choix hub / roadtrip : cartes illustrées, motion CSS, libellés FR.
 * Les propositions IA enrichissent le texte quand elles sont dispo.
 */
export function StyleChoice({
  currentStyle,
  proposals,
  onPropose,
  onChoose,
}: Props) {
  const { t } = useI18n();
  const [picking, setPicking] = useState<StyleKey | null>(null);

  const byStyle = (style: StyleKey) => proposals.find(p => p.style === style);

  const order: StyleKey[] =
    proposals[0]?.style === 'roadtrip' ? ['roadtrip', 'hub'] : ORDER;

  const cards = order.map(style => {
    const proposal = byStyle(style);
    return {
      style,
      summary: proposal?.summary ?? t(`voyage.styleDesc.${style}`),
      hint: proposal?.airportHints ?? t(`voyage.styleHint.${style}`),
    };
  });

  return (
    <div className="voyage-style-choice">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="voyage-brand m-0 text-2xl">{t('voyage.step.style')}</h3>
        <Button type="button" variant="secondary" onClick={onPropose}>
          {t('voyage.proposeStyles')}
        </Button>
      </div>
      <p className="text-muted mt-2 mb-4 text-sm">{t('voyage.styleLead')}</p>

      <ul className="voyage-style-grid m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
        {cards.map((card, i) => {
          const selected = currentStyle === card.style;
          const pulsing = picking === card.style;
          return (
            <li
              key={card.style}
              className={[
                'voyage-style-card',
                selected ? 'voyage-style-card--selected' : '',
                pulsing ? 'voyage-style-card--pulse' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="voyage-style-card__media">
                {card.style === 'hub' ? <HubArt /> : <RoadtripArt />}
                {selected ? (
                  <span className="voyage-style-card__badge">
                    {t('voyage.styleSelected')}
                  </span>
                ) : null}
              </div>
              <div className="voyage-style-card__body">
                <p className="voyage-style-card__title m-0">
                  {t(`voyage.styleLabel.${card.style}`)}
                </p>
                <p className="mt-2 text-sm">{card.summary}</p>
                <p className="text-muted mt-1 text-xs">{card.hint}</p>
                <Button
                  type="button"
                  className="mt-3"
                  variant={selected ? 'secondary' : 'primary'}
                  onClick={() => {
                    setPicking(card.style);
                    onChoose(card.style, card.summary);
                    window.setTimeout(() => setPicking(null), 600);
                  }}
                >
                  {selected
                    ? t('voyage.styleSelected')
                    : t('voyage.chooseStyle')}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-muted mt-3 text-sm">
        {t('voyage.currentStyle')} :{' '}
        <strong>
          {currentStyle === 'undecided'
            ? t('voyage.styleLabel.undecided')
            : t(`voyage.styleLabel.${currentStyle}`)}
        </strong>
      </p>
    </div>
  );
}
