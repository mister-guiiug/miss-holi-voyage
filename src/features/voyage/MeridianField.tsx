/**
 * Champ de méridiens animé — SVG + CSS only, zéro bitmap.
 * Un humain ne maintient pas une grille orthodromique qui respire avec l’heure.
 */
export function MeridianField() {
  return (
    <div className="voyage-meridian" aria-hidden="true">
      <svg
        className="voyage-meridian__svg"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="voyage-glow" cx="50%" cy="35%" r="55%">
            <stop
              offset="0%"
              stopColor="var(--voyage-glow)"
              stopOpacity="0.55"
            />
            <stop
              offset="70%"
              stopColor="var(--voyage-glow)"
              stopOpacity="0.08"
            />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="voyage-horizon" x1="0" y1="0" x2="1" y2="0.2">
            <stop
              offset="0%"
              stopColor="var(--voyage-accent)"
              stopOpacity="0"
            />
            <stop
              offset="50%"
              stopColor="var(--voyage-accent)"
              stopOpacity="0.35"
            />
            <stop
              offset="100%"
              stopColor="var(--voyage-accent)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        <rect width="1200" height="800" fill="url(#voyage-glow)" />
        <g
          className="voyage-meridian__arcs"
          fill="none"
          stroke="url(#voyage-horizon)"
        >
          <path d="M-40 520 C 200 180, 520 120, 1240 380" strokeWidth="1.2" />
          <path d="M-40 600 C 280 260, 640 80, 1240 300" strokeWidth="0.9" />
          <path d="M-40 420 C 360 640, 760 40, 1240 520" strokeWidth="1.1" />
          <path d="M80 -20 C 200 280, 900 520, 1180 820" strokeWidth="0.8" />
          <path d="M400 -40 C 480 300, 700 500, 1100 860" strokeWidth="0.7" />
        </g>
        <g className="voyage-meridian__dots" fill="var(--voyage-accent)">
          <circle className="voyage-waypoint" cx="220" cy="310" r="3.5" />
          <circle className="voyage-waypoint" cx="510" cy="210" r="3" />
          <circle className="voyage-waypoint" cx="780" cy="340" r="4" />
          <circle className="voyage-waypoint" cx="960" cy="250" r="2.8" />
          <circle className="voyage-waypoint" cx="640" cy="480" r="3.2" />
        </g>
      </svg>
    </div>
  );
}
