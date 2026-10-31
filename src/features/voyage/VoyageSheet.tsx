import type { ReactNode } from 'react';

type Props = {
  title?: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
};

/** Section de carnet : filet haut + titre éditorial. Remplace les Card empilées. */
export function VoyageSheet({
  title,
  lead,
  children,
  className = '',
  as: Tag = 'section',
}: Props) {
  return (
    <Tag className={`voyage-sheet ${className}`.trim()}>
      {title ? <h3 className="voyage-sheet__title">{title}</h3> : null}
      {lead ? <p className="voyage-sheet__lead">{lead}</p> : null}
      {children}
    </Tag>
  );
}

export function VoyageRule({ className = '' }: { className?: string }) {
  return <hr className={`voyage-rule ${className}`.trim()} />;
}
