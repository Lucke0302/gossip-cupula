import { fuzzyTime, fuzzyTimeLong } from '../lib/format';
import { isPending } from '../hooks/useComments';
import type { Comment } from '../types';

/**
 * Lista de comentarios. O selo diz "ANÔNIMO" para todos porque nao ha
 * nada mais a dizer: o objeto Comment tem id, texto e hora. So.
 */
export function CommentList({ comments }: { comments: Comment[] }) {
  if (comments.length === 0) {
    return (
      <p className="py-2 text-center font-body text-[11.5px] text-[#8a8a80]">
        ninguém abriu a boca ainda. seja a primeira.
      </p>
    );
  }

  return (
    <ul className="flex list-none flex-col gap-[11px] p-0">
      {comments.map((comment) => {
        const pending = isPending(comment);
        return (
          <li
            key={comment.id}
            className={`border-b border-dotted border-hairline-dot pb-[11px] last:border-b-0 last:pb-0 ${
              pending ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex rounded-full border border-[#ddd] px-2 py-[2px] font-body text-[9px] leading-[1.6] tracking-[.06em] text-[#777]">
                ANÔNIMO
              </span>
              {pending ? (
                <span className="font-body text-[10px] text-muted">enviando…</span>
              ) : (
                <time
                  dateTime={comment.publishedAt}
                  title={fuzzyTimeLong(comment.publishedAt)}
                  className="font-body text-[10px] text-[#a5a59b]"
                >
                  {fuzzyTime(comment.publishedAt)}
                </time>
              )}
            </div>
            <p className="mt-1.5 font-body text-[12px] leading-[1.35] text-body">{comment.text}</p>
          </li>
        );
      })}
    </ul>
  );
}
