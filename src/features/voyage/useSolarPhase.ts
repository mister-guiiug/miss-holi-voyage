import { useEffect, useState } from 'react';

export type SolarPhase = 'dawn' | 'day' | 'dusk' | 'night';

/** Phase solaire locale — ce qu’un thème figé ne peut pas offrir. */
export function solarPhaseAt(date = new Date()): SolarPhase {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'dusk';
  return 'night';
}

export function useSolarPhase(): SolarPhase {
  const [phase, setPhase] = useState<SolarPhase>(() => solarPhaseAt());

  useEffect(() => {
    const apply = () => {
      const next = solarPhaseAt();
      setPhase(next);
      document.documentElement.dataset.solar = next;
    };
    apply();
    const id = window.setInterval(apply, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return phase;
}
