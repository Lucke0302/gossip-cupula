import { request } from '../lib/http';
import { linkSchema, pageSchema, photoSchema, type LinkItem, type Page, type Photo } from '../types';

/* ------------------------------------------------------------------ *
 * Galeria e links.
 *
 * As duas rotas já existem na API (`GET /api/photos` e `GET /api/links`) e
 * devolvem o mesmo envelope paginado `{ items, nextCursor }` do resto do
 * site. Sem `source: 'mock'`: a fonte segue a flag VITE_USE_MOCKS.
 * ------------------------------------------------------------------ */

const photoPageSchema = pageSchema(photoSchema);
const linkPageSchema = pageSchema(linkSchema);

export function listPhotos(signal?: AbortSignal): Promise<Page<Photo>> {
  return request('/photos', { schema: photoPageSchema, signal });
}

export function listLinks(signal?: AbortSignal): Promise<Page<LinkItem>> {
  return request('/links', { schema: linkPageSchema, signal });
}
