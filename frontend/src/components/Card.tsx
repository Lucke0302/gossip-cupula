import type { CSSProperties, ElementType, ReactNode } from 'react';

/**
 * O cartao branco base. Todo conteudo do blog vive dentro de um destes:
 * fundo #FFF, raio 12px, sombra 0 6px 18px rgba(0,0,0,.55).
 */
export function Card({
  children,
  as: Tag = 'div',
  className = '',
  padding = 'normal',
  style,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  padding?: 'normal' | 'tight' | 'roomy' | 'none';
  /** Escape hatch para o que não cabe em classe — o papel pautado do calendário, por exemplo. */
  style?: CSSProperties;
}) {
  const pad = {
    none: '',
    tight: 'p-[10px] pb-[6px]',
    normal: 'p-3',
    roomy: 'px-5 py-5',
  }[padding];

  return (
    <Tag className={`rounded-card bg-card text-body shadow-paper ${pad} ${className}`} style={style}>
      {children}
    </Tag>
  );
}
