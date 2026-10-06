import { useEffect, useRef, useState } from 'react';

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

/* ------------------------------------------------------------------ *
 * A porcentagem é estimada pelo tempo, não medida.
 *
 * A API não devolve progresso: `POST /api/ai/gossipfy` é uma chamada só
 * que responde quando as duas etapas da IA terminam. Não há stream nem
 * evento intermediário para contar.
 *
 * Então a barra anda sozinha, com uma curva que desacelera e **para em
 * 92%**. Isso é de propósito: ela nunca chega a 100% antes de o texto
 * existir. Se a IA demorar mais que o normal, a barra fica quase cheia
 * esperando — o que é honesto ("falta pouco, ainda não acabou") e é bem
 * melhor que uma barra que crava 100% e depois fica parada mentindo.
 * ------------------------------------------------------------------ */

/** Onde a curva estaciona enquanto a resposta não chega. */
const TETO = 92;

/**
 * Constante de tempo da curva. Com 3,5s a barra passa de 80% por volta
 * dos 10s — que é a média medida da chamada.
 */
const TAU_MS = 3500;

/** Quanto tempo a barra fica cheia antes de sumir, ao terminar. */
const REMATE_MS = 260;

const PASSO_MS = 100;

export function GossipfyOverlay({ ativo }: { ativo: boolean }) {
  const [indice, setIndice] = useState(0);
  const [pct, setPct] = useState(0);
  const [visivel, setVisivel] = useState(false);
  const estavaAtivo = useRef(false);

  // Recados rotativos.
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

  // Barra: sobe enquanto ativo, remata em 100% ao terminar.
  useEffect(() => {
    if (ativo) {
      estavaAtivo.current = true;
      setVisivel(true);
      setPct(0);

      const inicio = Date.now();
      const timer = window.setInterval(() => {
        const decorrido = Date.now() - inicio;
        // Exponencial que desacelera: rápida no começo, quase parada
        // perto do teto. Nunca alcança 100 sozinha.
        setPct(TETO * (1 - Math.exp(-decorrido / TAU_MS)));
      }, PASSO_MS);

      return () => window.clearInterval(timer);
    }

    if (!estavaAtivo.current) return;
    estavaAtivo.current = false;

    // Chegou: fecha a conta em 100% por um instante, senão a barra
    // sumiria pela metade e a espera ficaria sem desfecho.
    setPct(100);
    const timer = window.setTimeout(() => setVisivel(false), REMATE_MS);
    return () => window.clearTimeout(timer);
  }, [ativo]);

  if (!visivel) return null;

  const arredondado = Math.round(pct);

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-field bg-white/85">
      <div className="flex w-full flex-col items-center gap-2 px-6">
        <span role="status" aria-live="polite" className="font-hand text-[26px] leading-none text-eventos">
          {ativo ? RECADOS[indice] : 'prontinho.'}
        </span>

        <div className="flex w-full items-center gap-2">
          {/*
            `aria-valuenow` aqui e nenhum aria-live: leitor de tela
            consulta a barra quando quer, em vez de ouvir a porcentagem
            mudar dez vezes por segundo.
          */}
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={arredondado}
            aria-label="gossipficando"
            className="h-[7px] flex-1 overflow-hidden rounded-full border border-[#e2e2d6] bg-[#f4f4ec]"
          >
            <div
              className="h-full rounded-full bg-eventos transition-[width] duration-150 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>

          <span className="w-9 flex-none text-right font-body text-[10.5px] tabular-nums text-muted">
            {arredondado}%
          </span>
        </div>
      </div>
    </div>
  );
}
