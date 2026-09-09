import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useLinks } from '../hooks/useGallery';
import type { LinkItem } from '../types';

const SECTIONS = [
  {
    key: 'welcome',
    label: 'welcome',
    color: 'text-welcome',
    description: 'tudo que a cúpula guarda fora do feed.',
  },
  { key: 'fofocas', label: 'fofocas', color: 'text-fofocas', to: '/' },
  { key: 'fotos', label: 'fotos', color: 'text-fotos', to: '/fotos' },
  { key: 'eventos', label: 'eventos', color: 'text-eventos' },
  { key: 'links', label: 'links', color: 'text-links' },
];

/**
 * Versões escurecidas das cores de seção.
 * As originais são pensadas para texto claro sobre fundo preto; sobre o
 * cartão branco elas não alcançam contraste legível (o amarelo #E8D44D
 * fica praticamente invisível). Mesma identidade, contraste que passa.
 */
const SECTION_COLOR: Record<LinkItem['section'], string> = {
  welcome: 'text-[#1F6091]',
  fofocas: 'text-[#B4551F]',
  fotos: 'text-[#7A6A00]',
  eventos: 'text-[#AC3A6E]',
  links: 'text-[#4A731B]',
};

const ORDER: LinkItem['section'][] = ['welcome', 'fofocas', 'fotos', 'eventos', 'links'];

export default function LinksPage() {
  const { isAuthenticated } = useAuth();
  const links = useLinks(isAuthenticated);

  const grouped = ORDER.map((section) => ({
    section,
    items: (links.data?.items ?? []).filter((item) => item.section === section),
  })).filter((group) => group.items.length > 0);

  return (
    <Layout sections={SECTIONS}>
      <h1 className="mb-4 text-center font-display text-[28px] font-light text-links">links</h1>

      {links.isPending ? (
        <Card padding="roomy">
          <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-2.5">
            <span className="sr-only">carregando os links…</span>
            {[80, 60, 70, 55].map((width, index) => (
              <div
                key={index}
                className="skeleton-line h-[11px] animate-shimmer rounded-[3px]"
                style={{ width: `${width}%` }}
              />
            ))}
          </div>
        </Card>
      ) : null}

      {links.isError ? <ErrorState error={links.error} onRetry={() => void links.refetch()} /> : null}

      {links.isSuccess && grouped.length === 0 ? (
        <EmptyState
          title="nenhum link por aqui"
          description="a cúpula anda guardando tudo pra si. típico."
          glyph="—"
        />
      ) : null}

      {grouped.length > 0 ? (
        <Card padding="roomy" as="section">
          <div className="flex flex-col gap-5">
            {grouped.map((group) => (
              <div key={group.section}>
                <h2
                  className={`font-display text-[20px] font-light lowercase ${SECTION_COLOR[group.section]}`}
                >
                  {group.section}
                </h2>
                <ul className="mt-1.5 flex list-none flex-col gap-2.5 p-0">
                  {group.items.map((item) => (
                    <li
                      key={item.id}
                      className="border-b border-dotted border-hairline-dot pb-2.5 last:border-b-0 last:pb-0"
                    >
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="font-body text-[13px] text-link"
                      >
                        {item.label}
                      </a>
                      <p className="mt-1 font-body text-[11.5px] leading-[1.4] text-[#666]">
                        {item.note}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </Layout>
  );
}
