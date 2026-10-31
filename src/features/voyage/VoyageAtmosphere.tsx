import { useSyncExternalStore } from 'react';
import {
  parseVoyageTheme,
  VOYAGE_THEME_DEFAULT,
  type VoyageTheme,
} from '../settings/voyage-theme.ts';
import { MeridianField } from './MeridianField.tsx';

function subscribeTheme(onStoreChange: () => void): () => void {
  window.addEventListener('voyage-theme-change', onStoreChange);
  return () => window.removeEventListener('voyage-theme-change', onStoreChange);
}

function themeSnapshot(): VoyageTheme {
  return parseVoyageTheme(document.documentElement.dataset.voyageTheme);
}

function AlbumField() {
  return (
    <div className="voyage-atmosphere voyage-album-wash" aria-hidden="true">
      <svg
        className="voyage-atmosphere__svg"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="voyage-album-a" cx="30%" cy="20%" r="55%">
            <stop
              offset="0%"
              stopColor="var(--voyage-accent)"
              stopOpacity="0.22"
            />
            <stop
              offset="100%"
              stopColor="var(--voyage-accent)"
              stopOpacity="0"
            />
          </radialGradient>
          <radialGradient id="voyage-album-b" cx="75%" cy="35%" r="45%">
            <stop
              offset="0%"
              stopColor="var(--voyage-brand)"
              stopOpacity="0.1"
            />
            <stop
              offset="100%"
              stopColor="var(--voyage-brand)"
              stopOpacity="0"
            />
          </radialGradient>
        </defs>
        <ellipse
          className="voyage-album-wash__blob"
          cx="360"
          cy="200"
          rx="420"
          ry="280"
          fill="url(#voyage-album-a)"
        />
        <ellipse
          className="voyage-album-wash__blob"
          cx="900"
          cy="280"
          rx="340"
          ry="240"
          fill="url(#voyage-album-b)"
          style={{ animationDelay: '2.5s' }}
        />
      </svg>
    </div>
  );
}

function InstrumentField() {
  const ticks = [120, 240, 360, 480, 600, 720, 840, 960, 1080];
  return (
    <div
      className="voyage-atmosphere voyage-instrument-grid"
      aria-hidden="true"
    >
      <svg
        className="voyage-atmosphere__svg"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        {ticks.map(x => (
          <line
            key={`v-${x}`}
            className="voyage-instrument-grid__line"
            x1={x}
            y1="40"
            x2={x}
            y2="720"
            strokeWidth="1"
          />
        ))}
        {[160, 320, 480, 640].map(y => (
          <line
            key={`h-${y}`}
            className="voyage-instrument-grid__line"
            x1="40"
            y1={y}
            x2="1160"
            y2={y}
            strokeWidth="1"
          />
        ))}
        {ticks.map(x => (
          <line
            key={`t-${x}`}
            className="voyage-instrument-grid__tick"
            x1={x}
            y1="40"
            x2={x}
            y2="64"
            strokeWidth="1.5"
          />
        ))}
        <line
          className="voyage-instrument-grid__tick"
          x1="40"
          y1="160"
          x2="1160"
          y2="160"
          strokeWidth="1.25"
        />
      </svg>
    </div>
  );
}

/**
 * Décor d’accueil selon le thème voyage (ambiance / album / instrument).
 * Suit `data-voyage-theme` via l’évènement `voyage-theme-change`.
 */
export function VoyageAtmosphere() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    themeSnapshot,
    () => VOYAGE_THEME_DEFAULT
  );

  if (theme === 'album') return <AlbumField />;
  if (theme === 'instrument') return <InstrumentField />;
  return <MeridianField />;
}
