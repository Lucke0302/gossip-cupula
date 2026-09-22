import { Link } from 'react-router-dom';
import { Card } from './Card';
import { VoteButtons } from './VoteButtons';
import { fuzzyTime, fuzzyTimeLong, plural } from '../lib/format';
import type { Post } from '../types';

/**
 * Cartao do feed.
 *
 * Repare que nao ha nada de autor pra renderizar — o tipo `Post` nem tem
 * o campo. A assinatura visivel e' sempre a mesma: "xoxo, cúpula".
 */
export function PostCard({ post }: { post: Post }) {
  return (
    <Card as="article" padding="tight">
      <h2 className="px-2 pb-[9px] pt-[5px] text-center font-serif text-[17px] leading-[1.3] text-[#222]">
        <Link to={`/post/${post.id}`} className="text-[#222] no-underline hover:underline">
          {post.title}
        </Link>
      </h2>

      {post.imageUrl ? (
        <Link to={`/post/${post.id}`} tabIndex={-1} aria-hidden="true" className="block">
          <img
            src={post.imageUrl}
            alt={post.imageAlt ?? ''}
            loading="lazy"
            decoding="async"
            className="block w-full rounded-sm"
          />
        </Link>
      ) : null}

      <p className="px-[3px] pt-[10px] font-body text-post text-body">{post.excerpt}</p>

      <div className="flex items-center justify-between gap-3 px-[3px] pb-[2px] pt-[9px]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-[11.5px]">
          <Link to={`/post/${post.id}`} className="text-link">
            {plural(post.commentCount, 'comentário', 'comentários')}
          </Link>
          <time dateTime={post.publishedAt} title={fuzzyTimeLong(post.publishedAt)} className="text-muted">
            {fuzzyTime(post.publishedAt)}
          </time>
        </div>
        <span aria-hidden="true" className="font-body text-[10.5px] tracking-[.04em] text-[#7aa8d8]">
          xoxo, cúpula
        </span>
      </div>

      <div className="mt-1 border-t border-hairline px-[3px] pb-[2px] pt-2">
        <VoteButtons post={post} />
      </div>
    </Card>
  );
}
