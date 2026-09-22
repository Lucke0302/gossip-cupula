import { useEffect, useRef } from 'react';

/**
 * Dispara `onReach` quando o elemento observado entra na viewport.
 * Serve o scroll infinito sem prender o teclado: a pagina tambem tem um
 * botao "mais babado" visivel, entao quem navega por Tab nunca depende
 * de rolar ate o fim.
 */
export function useInfiniteSentinel(onReach: () => void, active: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  const callback = useRef(onReach);
  callback.current = onReach;

  useEffect(() => {
    const node = ref.current;
    if (!node || !active) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) callback.current();
      },
      { rootMargin: '320px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [active]);

  return ref;
}
