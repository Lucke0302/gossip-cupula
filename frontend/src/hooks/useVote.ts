import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { lembrarVoto, meuVoto } from '../lib/votes';
import { votePost } from '../services/posts.service';
import type { Post, PostDetail, VoteValue } from '../types';

/**
 * Voto de um post.
 *
 * O servidor alterna sozinho: clicar no mesmo botão de novo remove o
 * voto, clicar no outro troca. O hook espelha essa regra na hora (para
 * o número reagir ao clique) e corrige com a resposta real em seguida.
 */
export function useVote(post: Post | PostDetail) {
  const client = useQueryClient();
  const [voto, setVoto] = useState<VoteValue | null>(() => meuVoto(post.id));
  const [enviando, setEnviando] = useState(false);

  const aplicar = useCallback(
    (likes: number, dislikes: number) => {
      // Atualiza o post no cache: detalhe e todas as páginas do feed.
      client.setQueryData<PostDetail>(queryKeys.post(post.id), (atual) =>
        atual ? { ...atual, likes, dislikes } : atual,
      );
      client.setQueryData<{ pages: Array<{ items: Post[]; nextCursor: string | null }> }>(
        queryKeys.posts,
        (atual) =>
          atual
            ? {
                ...atual,
                pages: atual.pages.map((pagina) => ({
                  ...pagina,
                  items: pagina.items.map((item) =>
                    item.id === post.id ? { ...item, likes, dislikes } : item,
                  ),
                })),
              }
            : atual,
      );
    },
    [client, post.id],
  );

  const votar = useCallback(
    async (escolha: VoteValue) => {
      if (enviando) return;

      const anterior = voto;
      const proximo: VoteValue | null = anterior === escolha ? null : escolha;

      // Otimista: recalcula os dois contadores a partir do que muda.
      let likes = post.likes;
      let dislikes = post.dislikes;
      if (anterior === 1) likes -= 1;
      if (anterior === -1) dislikes -= 1;
      if (proximo === 1) likes += 1;
      if (proximo === -1) dislikes += 1;

      setVoto(proximo);
      lembrarVoto(post.id, proximo);
      aplicar(Math.max(likes, 0), Math.max(dislikes, 0));
      setEnviando(true);

      try {
        // A API só aceita 1 ou -1; a remoção é o mesmo voto de novo.
        const resultado = await votePost(post.id, escolha);
        aplicar(resultado.likes, resultado.dislikes);
      } catch {
        // Falhou: desfaz o otimismo e devolve os números de antes.
        setVoto(anterior);
        lembrarVoto(post.id, anterior);
        aplicar(post.likes, post.dislikes);
      } finally {
        setEnviando(false);
      }
    },
    [aplicar, enviando, post.dislikes, post.id, post.likes, voto],
  );

  return { voto, votar, enviando };
}
