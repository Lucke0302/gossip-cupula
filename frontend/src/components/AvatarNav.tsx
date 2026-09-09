import { NavLink } from 'react-router-dom';

/**
 * Os botoes circulares do design. Sao links de verdade (NavLink), entao
 * navegam por teclado e anunciam a rota atual com aria-current.
 */
const ITEMS = [
  { to: '/', label: 'home', end: true },
  { to: '/novo', label: 'posts', end: false },
  { to: '/fotos', label: 'fotos', end: false },
  { to: '/links', label: 'links', end: false },
] as const;

export function AvatarNav({ orientation = 'vertical' }: { orientation?: 'vertical' | 'horizontal' }) {
  const isRow = orientation === 'horizontal';

  return (
    <nav
      aria-label="Atalhos"
      className={
        isRow
          ? 'flex gap-3 overflow-x-auto px-3.5 pb-1 pt-4'
          : 'flex w-[90px] flex-col items-center gap-4 pt-1'
      }
    >
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className="flex flex-none flex-col items-center gap-[3px] no-underline"
        >
          {({ isActive }) => (
            <>
              <span
                aria-hidden="true"
                className={`stripes-dark block h-[56px] w-[56px] rounded-full shadow-soft transition-[border-color] sm:h-[62px] sm:w-[62px] ${
                  isActive ? 'border-2 border-wordmark/40' : 'border-2 border-wordmark/[.18]'
                }`}
              />
              <span
                className={`font-display text-[14px] font-light sm:text-[15px] ${
                  isActive ? 'text-wordmark' : 'text-muted-dim'
                }`}
              >
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
      {isRow ? <span className="flex-none basis-5" aria-hidden="true" /> : null}
    </nav>
  );
}
