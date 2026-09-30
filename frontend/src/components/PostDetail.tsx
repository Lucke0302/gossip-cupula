import { Card } from './Card';
import { PostImages } from './PostImages';
import { VoteButtons } from './VoteButtons';
import { fuzzyTime, fuzzyTimeLong, plural } from '../lib/format';
import type { PostDetail as PostDetailType } from '../types';

/**
 * O contador de comentários vem do próprio post.
 *
 * A API projeta o COUNT no mesmo SELECT que traz a lista, então
 * `commentCount` já chega com o total. Antes a tela preferia o tamanho da
 * lista carregada — o que passa a mentir assim que a lista é paginada
 * (mostraria só o que coube na primeira página). O comentário otimista
 * mexe nesse mesmo campo, direto no cache da query (veja
 * useCreateComment), então o número reage na hora do envio.
 */
export function PostDetail({ post }: { post: PostDetailType }) {
  return (
    <Card as="article" padding="tight">
      <h1 className="px-2 pb-[9px] pt-[6px] text-center font-serif text-[18px] leading-[1.3] text-[#222]">
        {post.title}
      </h1>

      <PostImages urls={post.imageUrls} />

      {post.body.map((paragraph, index) => (
        <p
          key={index}
          className="px-[3px] pt-[10px] font-body text-post text-body first-of-type:pt-[10px]"
        >
          {paragraph}
        </p>
      ))}

      <footer className="mt-[10px] flex items-center justify-between gap-3 border-t border-hairline px-[3px] pb-[2px] pt-[10px]">
        <p className="font-body text-[11.5px] text-muted">
          <time dateTime={post.publishedAt} title={fuzzyTimeLong(post.publishedAt)}>
            {fuzzyTime(post.publishedAt)}
          </time>
          {' · '}
          {plural(post.commentCount, 'comentário', 'comentários')}
        </p>
        <span aria-hidden="true" className="font-body text-[10.5px] tracking-[.04em] text-[#7aa8d8]">
          xoxo, cúpula
        </span>
      </footer>

      <div className="mt-2 border-t border-hairline px-[3px] pb-[2px] pt-2.5">
        <VoteButtons post={post} />
      </div>
    </Card>
  );
}
