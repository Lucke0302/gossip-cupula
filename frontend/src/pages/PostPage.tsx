import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/Card';
import { CommentForm } from '../components/CommentForm';
import { CommentList } from '../components/CommentList';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Layout } from '../components/Layout';
import { PostDetail } from '../components/PostDetail';
import { PostCardSkeleton } from '../components/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useComments } from '../hooks/useComments';
import { useDeletePost, usePost } from '../hooks/usePosts';
import { ApiError, messageFor } from '../lib/errors';

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
  const { isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const remover = useDeletePost();
  const [apagando, setApagando] = useState(false);

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

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link to="/" className="font-body text-[11.5px] text-welcome">
            ← voltar pro feed
          </Link>

          {/* Apagar é da cúpula: só admin vê. Quem barra é o 403 da API. */}
          {post.isSuccess && role === 'admin' && id ? (
            apagando ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-body text-[11.5px] text-[#e8a0a0]">
                  apagar de vez? não dá pra desfazer.
                </span>
                <button
                  type="button"
                  disabled={remover.isPending}
                  onClick={() =>
                    remover.mutate(id, {
                      onSuccess: () => {
                        push('apagado. como se nunca tivesse acontecido.', 'success');
                        navigate('/', { replace: true });
                      },
                      onError: (erro) => {
                        setApagando(false);
                        push(messageFor(erro), 'error');
                      },
                    })
                  }
                  className="font-body text-[11.5px] text-[#e88a8a] underline disabled:opacity-50"
                >
                  {remover.isPending ? 'apagando…' : 'sim, apaga'}
                </button>
                <button
                  type="button"
                  onClick={() => setApagando(false)}
                  className="font-body text-[11.5px] text-welcome underline"
                >
                  deixa
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setApagando(true)}
                className="font-body text-[11.5px] text-[#e88a8a] underline"
              >
                apagar este babado
              </button>
            )
          ) : null}
        </div>
      </div>
    </Layout>
  );
}
