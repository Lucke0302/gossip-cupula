import { Card } from './Card';

/** Esqueleto do cartao de post — o shimmer 1.4s do design. */
export function PostCardSkeleton({ imageHeight = 250, dim = false }: { imageHeight?: number; dim?: boolean }) {
  return (
    <Card padding="tight" className={dim ? 'opacity-75' : ''}>
      <div className="skeleton-line mx-auto mb-3 mt-1.5 h-[14px] w-[62%] animate-shimmer rounded-[3px]" />
      <div
        className="skeleton-line animate-shimmer rounded-sm"
        style={{ height: `${imageHeight}px` }}
      />
      <div className="flex flex-col gap-1.5 px-[3px] pt-3">
        <div className="h-[9px] rounded-[3px] bg-[#ededE4]" />
        <div className="h-[9px] rounded-[3px] bg-[#ededE4]" />
        <div className="h-[9px] w-[74%] rounded-[3px] bg-[#ededE4]" />
      </div>
      <div className="flex justify-end pt-[11px]">
        <span className="animate-pulse2008 font-body text-[10.5px] tracking-[.04em] text-[#c2c2b6]">
          xoxo, cúpula
        </span>
      </div>
    </Card>
  );
}

export function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-5" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">apurando o babado…</span>
      <PostCardSkeleton imageHeight={250} />
      <PostCardSkeleton imageHeight={150} dim />
      <p aria-hidden="true" className="animate-pulse2008 text-center font-body text-[11.5px] text-[#c9c9be]">
        apurando o babado...
      </p>
    </div>
  );
}

export function GallerySkeleton() {
  return (
    <div
      className="columns-2 gap-3 sm:columns-3 [&>*]:mb-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">carregando a galeria…</span>
      {[220, 300, 180, 260, 200, 240].map((height, index) => (
        <div
          key={index}
          className="skeleton-line animate-shimmer break-inside-avoid rounded-card"
          style={{ height: `${height}px` }}
        />
      ))}
    </div>
  );
}
