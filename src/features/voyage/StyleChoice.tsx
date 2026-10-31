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

/** Line-art cartographique — base fixe (rayons depuis un point). */
function HubArt() {
  return (
    <svg
      className="voyage-style-art"
      viewBox="0 0 320 140"
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="320" height="140" fill="var(--dwc-surface-2)" />
      <g
        fill="none"
        stroke="var(--voyage-brand)"
        strokeWidth="1"
        opacity="0.55"
      >
        <circle cx="110" cy="78" r="28" />
        <circle cx="110" cy="78" r="48" strokeDasharray="3 4" />
        <path d="M110 78 L210 40" />
        <path d="M110 78 L240 78" />
        <path d="M110 78 L200 118" />
        <path d="M110 78 L40 50" />
      </g>
      <circle cx="110" cy="78" r="4" fill="var(--voyage-brand)" />
      <circle cx="210" cy="40" r="2.5" fill="var(--voyage-brand)" />
      <circle cx="240" cy="78" r="2.5" fill="var(--voyage-brand)" />
      <circle cx="200" cy="118" r="2.5" fill="var(--voyage-brand)" />
      <circle cx="40" cy="50" r="2.5" fill="var(--voyage-brand)" />
    </svg>
  );
}

/** Line-art — route qui traverse le paysage. */
function RoadtripArt() {
  return (
    <svg
      className="voyage-style-art"
      viewBox="0 0 320 140"
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="320" height="140" fill="var(--dwc-surface-2)" />
      <g fill="none" stroke="var(--voyage-brand)" strokeWidth="1" opacity="0.5">
        <path d="M0 95 L70 55 L130 85 L200 35 L280 70 L320 50" />
        <path d="M0 110 L90 70 L160 100 L250 55 L320 80" />
      </g>
      <path
        d="M-10 130 Q90 85 160 95 T340 70"
        fill="none"
        stroke="var(--voyage-brand)"
        strokeWidth="2"
      />
      <circle cx="70" cy="98" r="2.5" fill="var(--voyage-brand)" />
      <circle cx="160" cy="95" r="2.5" fill="var(--voyage-brand)" />
      <circle cx="250" cy="78" r="2.5" fill="var(--voyage-brand)" />
    </svg>
  );
}

const ORDER: StyleKey[] = ['hub', 'roadtrip'];

/** Deux pages de carnet côte à côte — sélection par filet, pas badge. */
export function StyleChoice({
  currentStyle,
  proposals,
  onPropose,
  onChoose,
}: Props) {
  const { t } = useI18n();

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
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="voyage-sheet__title m-0">{t('voyage.step.style')}</h3>
        <button
          type="button"
          className="voyage-ink-btn text-sm"
          onClick={onPropose}
        >
          {t('voyage.proposeStyles')}
        </button>
      </div>
      <p className="voyage-sheet__lead">{t('voyage.styleLead')}</p>

      <ul className="voyage-style-grid m-0 list-none p-0">
        {cards.map(card => {
          const selected = currentStyle === card.style;
          return (
            <li
              key={card.style}
              className={
                selected
                  ? 'voyage-style-card voyage-style-card--selected'
                  : 'voyage-style-card'
              }
            >
              <div className="voyage-style-card__media">
                {card.style === 'hub' ? <HubArt /> : <RoadtripArt />}
              </div>
              <div className="voyage-style-card__body">
                <p className="voyage-style-card__title">
                  {t(`voyage.styleLabel.${card.style}`)}
                </p>
                <p className="mt-2 text-sm leading-snug">{card.summary}</p>
                <p className="text-muted mt-1 text-xs leading-snug">
                  {card.hint}
                </p>
                {selected ? (
                  <p className="voyage-style-card__sel">
                    {t('voyage.styleSelected')}
                  </p>
                ) : null}
                <Button
                  type="button"
                  className="mt-auto pt-3"
                  variant={selected ? 'secondary' : 'primary'}
                  onClick={() => onChoose(card.style, card.summary)}
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
