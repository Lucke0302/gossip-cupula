import { Card } from './Card';
import { VoteButtons } from './VoteButtons';
import { fuzzyTime, fuzzyTimeLong, plural } from '../lib/format';
import type { PostDetail as PostDetailType } from '../types';

/**
 * `commentCount` sobrescreve o contador do post quando a lista de
 * comentários já foi carregada. Faz diferença com a API real: ela não
 * tem rota de comentários, então o post sempre chega com zero — o número
 * certo é o tamanho da lista que a tela realmente recebeu.
 */
export function PostDetail({
  post,
  commentCount,
}: {
  post: PostDetailType;
  commentCount?: number;
}) {
  const total = commentCount ?? post.commentCount;

  return (
    <Card as="article" padding="tight">
      <h1 className="px-2 pb-[9px] pt-[6px] text-center font-serif text-[18px] leading-[1.3] text-[#222]">
        {post.title}
      </h1>

      {post.imageUrl ? (
        <img
          src={post.imageUrl}
          alt={post.imageAlt ?? ''}
          loading="lazy"
          decoding="async"
          className="block w-full rounded-sm"
        />
      ) : null}

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
          {plural(total, 'comentário', 'comentários')}
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
