import type { ReactNode } from 'react';
import type { StepStatus } from '../../entities/schemas.ts';
import { StepStatusBadge } from './StepStatusBadge.tsx';

type Props = {
  title?: ReactNode;
  lead?: ReactNode;
  /** État de l’étape — pastille à côté du titre. */
  status?: StepStatus;
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
};

/** Section de carnet : filet haut + titre éditorial. Remplace les Card empilées. */
export function VoyageSheet({
  title,
  lead,
  status,
  children,
  className = '',
  as: Tag = 'section',
}: Props) {
  return (
    <Tag
      className={`voyage-sheet ${status ? `voyage-sheet--${status}` : ''} ${className}`.trim()}
    >
      {title ? (
        <div className="voyage-sheet__heading">
          <h3 className="voyage-sheet__title">{title}</h3>
          {status ? <StepStatusBadge status={status} withLabel /> : null}
        </div>
      ) : null}
      {lead ? <p className="voyage-sheet__lead">{lead}</p> : null}
      {children}
    </Tag>
  );
}

export function VoyageRule({ className = '' }: { className?: string }) {
  return <hr className={`voyage-rule ${className}`.trim()} />;
}
