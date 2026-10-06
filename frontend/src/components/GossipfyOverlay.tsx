import { useEffect, useState } from 'react';

/**
 * Véu que cobre o campo de texto enquanto a IA reescreve.
 *
 * Fica por cima do textarea, e não ao lado do botão, porque é ali que a
 * mudança vai acontecer — a espera precisa estar no lugar onde o
 * resultado aparece.
 *
 * As mensagens trocam porque a chamada leva ~10 segundos. Uma frase
 * parada nesse tempo lê como travamento, e a pessoa clica de novo; uma
 * sequência mostra que algo está andando mesmo sem barra de progresso.
 */
const RECADOS = [
  'ligando pra fonte…',
  'conferindo com quem estava lá…',
  'escolhendo as palavras com veneno…',
  'assinando xoxo…',
] as const;

/** Tempo de cada recado. Quatro deles cobrem os ~10s da chamada. */
const TROCA_MS = 2500;

export function GossipfyOverlay({ ativo }: { ativo: boolean }) {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (!ativo) {
      setIndice(0);
      return;
    }
    const timer = window.setInterval(() => {
      // Recicla: se a IA demorar mais que o previsto, as frases voltam
      // ao começo em vez de parar na última.
      setIndice((atual) => (atual + 1) % RECADOS.length);
    }, TROCA_MS);
    return () => window.clearInterval(timer);
  }, [ativo]);

  if (!ativo) return null;

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center rounded-field bg-white/85"
      role="status"
      aria-live="polite"
    >
      <div className="flex w-full flex-col items-center gap-2 px-4">
        <span className="font-hand text-[26px] leading-none text-eventos">
          {RECADOS[indice]}
        </span>
        {/* Mesma listra dos esqueletos do feed — a espera fala a mesma língua. */}
        <span
          aria-hidden="true"
          className="skeleton-line h-[8px] w-[70%] animate-shimmer rounded-[3px]"
        />
      </div>
    </div>
  );
}
