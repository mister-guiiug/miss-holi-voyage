import { Link, type LinkProps } from 'react-router-dom';

/**
 * Lien avec transition de vue navigateur (quand supportée).
 * Remplace `Link` dans la coquille et les écrans voyage.
 */
export function VoyageLink({ viewTransition = true, ...props }: LinkProps) {
  return <Link viewTransition={viewTransition} {...props} />;
}
