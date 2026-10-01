import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * O menu de texto colorido do blogspot. Cada seção tem sua cor fixa —
 * welcome azul, fofocas coral, fotos amarelo, eventos rosa, links verde.
 */
type Section = {
  key: string;
  label: string;
  color: string;
  description?: string;
  to?: string;
  cta?: string;
};

export const DEFAULT_SECTIONS: Section[] = [
  {
    key: 'welcome',
    label: 'welcome',
    color: 'text-welcome',
    description:
      'ao Gossip da Cúpula. O site SOBRE a cúpula, PARA a cúpula e FEITO pela cúpula. Sem nomes. Sem rostos.',
  },
  {
    key: 'fofocas',
    label: 'fofocas',
    color: 'text-fofocas',
    description: 'o babado fresco de quem finge não ler isso aqui.',
  },
  {
    key: 'fotos',
    label: 'fotos',
    color: 'text-fotos',
    description: 'quem apareceu, com quem e vestindo o quê.',
    to: '/fotos',
    cta: 'VER GALERIA DA SEMANA',
  },
  {
    key: 'eventos',
    label: 'eventos',
    color: 'text-eventos',
    description: 'seu convite provavelmente sumiu no correio.',
    to: '/eventos',
    cta: 'CLIQUE AQUI',
  },
  { key: 'links', label: 'links', color: 'text-links', to: '/links' },
];

export function Sidebar({
  sections = DEFAULT_SECTIONS,
  className = '',
  extra,
  extraAfter,
}: {
  sections?: Section[];
  className?: string;
  /**
   * Bloco opcional encaixado no meio do menu — hoje é o "próximos
   * babados" da tela de eventos, que no canvas mora logo abaixo da
   * seção eventos e acima de links.
   */
  extra?: ReactNode;
  /** Chave da seção depois da qual o `extra` entra. */
  extraAfter?: string;
}) {
  return (
    <nav aria-label="Seções" className={`flex flex-col gap-5 ${className}`}>
      {sections.map((section) => (
        <div key={section.key}>
          {section.to ? (
            <Link
              to={section.to}
              className={`font-display text-[26px] font-light no-underline sm:text-[28px] ${section.color}`}
            >
              {section.label}
            </Link>
          ) : (
            <p className={`font-display text-[26px] font-light sm:text-[28px] ${section.color}`}>
              {section.label}
            </p>
          )}

          {section.description ? (
            <p className="mt-[5px] font-body text-[12px] leading-[1.35] text-muted-dark">
              {section.description}{' '}
              {section.to && section.cta ? (
                <Link to={section.to} className="text-[11.5px] text-welcome">
                  {section.cta}
                </Link>
              ) : null}
            </p>
          ) : null}

          {extra && extraAfter === section.key ? <div className="mt-5">{extra}</div> : null}
        </div>
      ))}
    </nav>
  );
}
