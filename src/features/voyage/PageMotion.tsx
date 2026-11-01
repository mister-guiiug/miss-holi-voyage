import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

function prefersCssPageEnter(): boolean {
  if (typeof document === 'undefined') return true;
  if ('startViewTransition' in document) return false;
  return true;
}

/**
 * Entrée de page CSS quand View Transitions n’est pas disponible.
 * Sinon le fondu croisé est porté par `VoyageLink` (`viewTransition`).
 */
export function PageMotion({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const cssEnter = prefersCssPageEnter();
  return (
    <div
      key={cssEnter ? pathname : 'vt'}
      className={cssEnter ? 'voyage-page' : undefined}
      data-voyage-path={pathname}
    >
      {children}
    </div>
  );
}
