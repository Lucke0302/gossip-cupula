import { useVote } from '../hooks/useVote';
import type { Post, PostDetail } from '../types';

/**
 * Contador de votos, no espírito de 2008: dois links de texto miúdos com
 * o número entre parênteses, nada de ícone animado. O voto ativo fica
 * colorido e em negrito — é o que o blogspot fazia com "você curtiu".
 */
export function VoteButtons({ post }: { post: Post | PostDetail }) {
  const { voto, votar, enviando } = useVote(post);

  const base =
    'font-body text-[11px] underline underline-offset-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => void votar(1)}
        disabled={enviando}
        aria-pressed={voto === 1}
        className={`${base} ${voto === 1 ? 'font-bold text-fofocas' : 'text-[#8a8a80] hover:text-fofocas'}`}
      >
        amei ({post.likes})
      </button>

      <span aria-hidden="true" className="font-body text-[11px] text-[#c9c9be]">
        ·
      </span>

      <button
        type="button"
        onClick={() => void votar(-1)}
        disabled={enviando}
        aria-pressed={voto === -1}
        className={`${base} ${voto === -1 ? 'font-bold text-welcome' : 'text-[#8a8a80] hover:text-welcome'}`}
      >
        credo ({post.dislikes})
      </button>
    </div>
  );
}
