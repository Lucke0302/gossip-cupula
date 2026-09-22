import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Layout } from '../components/Layout';
import { PostCard } from '../components/PostCard';
import { FeedSkeleton, PostCardSkeleton } from '../components/Skeleton';
import { Button } from '../components/ui';
import { DEFAULT_SECTIONS } from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useInfiniteSentinel } from '../hooks/useInfiniteSentinel';
import { usePostsFeed } from '../hooks/usePosts';

export default function FeedPage() {
  const { isAuthenticated } = useAuth();
  const feed = usePostsFeed(isAuthenticated);

  const posts = useMemo(
    () => feed.data?.pages.flatMap((page) => page.items) ?? [],
    [feed.data],
  );

  const sentinelRef = useInfiniteSentinel(() => {
    if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
  }, feed.hasNextPage === true);

  return (
    <Layout wordmark="hero" sections={DEFAULT_SECTIONS}>
      {feed.isPending ? <FeedSkeleton /> : null}

      {feed.isError ? <ErrorState error={feed.error} onRetry={() => void feed.refetch()} /> : null}

      {feed.isSuccess && posts.length === 0 ? (
        <EmptyState
          title="ninguém falou nada hoje"
          description="silêncio nessa cúpula é sinal de que alguém está guardando algo grande. seja você a primeira a estragar a surpresa."
          action={
            <Link to="/novo" className="no-underline">
              <Button>solta o babado</Button>
            </Link>
          }
        />
      ) : null}

      {posts.length > 0 ? (
        <section aria-label="Feed de fofocas" className="flex flex-col gap-5">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}

          {feed.isFetchingNextPage ? <PostCardSkeleton imageHeight={180} dim /> : null}

          {/* Sentinela do scroll infinito. O botão abaixo cobre o teclado. */}
          <div ref={sentinelRef} aria-hidden="true" className="h-px" />

          {feed.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                onClick={() => void feed.fetchNextPage()}
                disabled={feed.isFetchingNextPage}
              >
                {feed.isFetchingNextPage ? 'apurando…' : 'mais babado'}
              </Button>
            </div>
          ) : (
            <p className="text-center font-body text-[11px] text-[#8a8a80]">
              acabou o babado por enquanto. volta mais tarde.
            </p>
          )}
        </section>
      ) : null}
    </Layout>
  );
}
