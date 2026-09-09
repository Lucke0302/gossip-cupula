import type { ReactNode } from 'react';
import { Card } from './Card';

export function EmptyState({
  title,
  description,
  action,
  hint,
  glyph = '?',
}: {
  title: string;
  description: string;
  action?: ReactNode;
  hint?: string;
  glyph?: string;
}) {
  return (
    <Card padding="none" className="px-6 py-8 text-center">
      <span
        aria-hidden="true"
        className="mx-auto mb-4 flex h-[58px] w-[58px] items-center justify-center rounded-full border border-dashed border-[#c9c9bb] font-mono text-[10.5px] text-[#a9a99b]"
      >
        {glyph}
      </span>
      <p className="font-serif text-[19px] leading-[1.3] text-[#222]">{title}</p>
      <p className="mt-[9px] font-body text-post text-[#555]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
      {hint ? <p className="mt-3 font-body text-[11px] text-muted">{hint}</p> : null}
    </Card>
  );
}
