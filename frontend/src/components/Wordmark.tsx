import { Link } from 'react-router-dom';

type Size = 'hero' | 'page' | 'compact';

const SIZES: Record<Size, string> = {
  // Jost 200, tracking -.045em, caixa baixa — direto dos tokens do design.
  hero: 'text-[56px] sm:text-[96px] lg:text-[152px]',
  page: 'text-[46px] sm:text-[72px] lg:text-[96px]',
  compact: 'text-[40px] sm:text-[52px]',
};

export function Wordmark({ size = 'page', asLink = true }: { size?: Size; asLink?: boolean }) {
  const text = (
    <span
      className={`block text-center font-display font-extralight leading-[0.86] tracking-[-0.05em] text-wordmark ${SIZES[size]}`}
      style={{ textShadow: '0 0 26px rgba(237,239,192,.28)' }}
    >
      gossip da cúpula
    </span>
  );

  if (!asLink) return <h1 className="px-3">{text}</h1>;

  return (
    <h1 className="px-3">
      <Link to="/" className="block no-underline" aria-label="Gossip da Cúpula — ir para o feed">
        {text}
      </Link>
    </h1>
  );
}
