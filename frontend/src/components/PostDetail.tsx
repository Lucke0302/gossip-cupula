import { Card } from './Card';
import { fuzzyTime, fuzzyTimeLong, plural } from '../lib/format';
import type { PostDetail as PostDetailType } from '../types';

export function PostDetail({ post }: { post: PostDetailType }) {
  return (
    <Card as="article" padding="tight">
      <h1 className="px-2 pb-[9px] pt-[6px] text-center font-serif text-[16px] leading-[1.3] text-[#222]">
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
        <p className="font-body text-[11px] text-muted">
          <time dateTime={post.publishedAt} title={fuzzyTimeLong(post.publishedAt)}>
            {fuzzyTime(post.publishedAt)}
          </time>
          {' · '}
          {plural(post.commentCount, 'comentário', 'comentários')}
        </p>
        <span aria-hidden="true" className="font-body text-[10px] tracking-[.04em] text-[#7aa8d8]">
          xoxo, cúpula
        </span>
      </footer>
    </Card>
  );
}
