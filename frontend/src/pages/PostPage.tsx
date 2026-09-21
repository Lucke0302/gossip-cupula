import { Link, useParams } from 'react-router-dom';
import { Card } from '../components/Card';
import { CommentForm } from '../components/CommentForm';
import { CommentList } from '../components/CommentList';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Layout } from '../components/Layout';
import { PostDetail } from '../components/PostDetail';
import { PostCardSkeleton } from '../components/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { useComments } from '../hooks/useComments';
import { usePost } from '../hooks/usePosts';
import { ApiError } from '../lib/errors';

const SECTIONS = [
  {
    key: 'welcome',
    label: 'welcome',
    color: 'text-welcome',
    description: 'sem nomes, sem rostos, sem exceções.',
  },
  {
    key: 'fofocas',
    label: 'fofocas',
    color: 'text-fofocas',
    description: 'você está lendo a mais recente.',
  },
  { key: 'fotos', label: 'fotos', color: 'text-fotos', to: '/fotos' },
  { key: 'eventos', label: 'eventos', color: 'text-eventos', to: '/links' },
  { key: 'links', label: 'links', color: 'text-links', to: '/links' },
];

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();

  const post = usePost(id, isAuthenticated);
  const comments = useComments(id, isAuthenticated);

  const notFound = post.error instanceof ApiError && post.error.status === 404;

  return (
    <Layout sections={SECTIONS}>
      <div className="flex flex-col gap-4.5">
        {post.isPending ? <PostCardSkeleton imageHeight={250} /> : null}

        {notFound ? (
          <EmptyState
            title="esse babado não existe"
            description="ou foi apagado, ou o link chegou até você já torto. acontece."
            glyph="404"
          />
        ) : post.isError ? (
          <ErrorState error={post.error} onRetry={() => void post.refetch()} />
        ) : null}

        {post.isSuccess ? (
          <PostDetail post={post.data} commentCount={comments.data?.items.length} />
        ) : null}

        {post.isSuccess && id ? (
          <Card as="section" aria-labelledby="comentarios-titulo">
            <h2
              id="comentarios-titulo"
              className="pb-3 pt-0.5 text-center font-serif text-[16px] leading-none text-[#222]"
            >
              quem contou?
            </h2>

            {comments.isPending ? (
              <p className="animate-pulse2008 py-2 text-center font-body text-[11.5px] text-[#a5a59b]">
                conferindo com a fonte…
              </p>
            ) : null}

            {comments.isError ? (
              <p role="alert" className="py-2 text-center font-body text-[11.5px] text-[#c0392b]">
                não deu pra carregar os comentários.{' '}
                <button
                  type="button"
                  onClick={() => void comments.refetch()}
                  className="text-link underline"
                >
                  tentar de novo
                </button>
              </p>
            ) : null}

            {comments.isSuccess ? <CommentList comments={comments.data.items} /> : null}

            <CommentForm postId={id} />
          </Card>
        ) : null}

        <p className="text-center">
          <Link to="/" className="font-body text-[11.5px] text-welcome">
            ← voltar pro feed
          </Link>
        </p>
      </div>
    </Layout>
  );
}
