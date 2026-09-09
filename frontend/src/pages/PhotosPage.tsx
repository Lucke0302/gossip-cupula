import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Layout } from '../components/Layout';
import { GallerySkeleton } from '../components/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { usePhotos } from '../hooks/useGallery';
import { fuzzyTime } from '../lib/format';

const SECTIONS = [
  {
    key: 'welcome',
    label: 'welcome',
    color: 'text-welcome',
    description: 'nenhuma dessas fotos tem crédito. de propósito.',
  },
  { key: 'fofocas', label: 'fofocas', color: 'text-fofocas', to: '/' },
  {
    key: 'fotos',
    label: 'fotos',
    color: 'text-fotos',
    description: 'quem apareceu, com quem e vestindo o quê.',
  },
  { key: 'eventos', label: 'eventos', color: 'text-eventos', to: '/links' },
  { key: 'links', label: 'links', color: 'text-links', to: '/links' },
];

export default function PhotosPage() {
  const { isAuthenticated } = useAuth();
  const photos = usePhotos(isAuthenticated);

  return (
    <Layout sections={SECTIONS}>
      <h1 className="mb-4 text-center font-display text-[28px] font-light text-fotos">
        galeria da semana
      </h1>

      {photos.isPending ? <GallerySkeleton /> : null}

      {photos.isError ? (
        <ErrorState error={photos.error} onRetry={() => void photos.refetch()} />
      ) : null}

      {photos.isSuccess && photos.data.items.length === 0 ? (
        <EmptyState
          title="ninguém foi fotografado essa semana"
          description="ou todo mundo ficou esperto e ficou longe da porta principal."
          glyph="0"
        />
      ) : null}

      {photos.isSuccess && photos.data.items.length > 0 ? (
        <ul className="columns-1 gap-3 sm:columns-2 [&>li]:mb-3 [&>li]:break-inside-avoid">
          {photos.data.items.map((photo) => (
            <li key={photo.id}>
              <Card padding="tight" as="figure" className="m-0">
                <img
                  src={photo.url}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  loading="lazy"
                  decoding="async"
                  className="block w-full rounded-sm"
                />
                <figcaption className="flex items-baseline justify-between gap-2 px-[3px] pb-0.5 pt-2">
                  <span className="font-body text-[11.5px] leading-[1.35] text-body">
                    {photo.caption}
                  </span>
                  <time dateTime={photo.publishedAt} className="flex-none font-body text-[10.5px] text-muted">
                    {fuzzyTime(photo.publishedAt)}
                  </time>
                </figcaption>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
    </Layout>
  );
}
