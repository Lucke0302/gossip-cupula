import { request } from '../lib/http';
import { linkSchema, pageSchema, photoSchema, type LinkItem, type Page, type Photo } from '../types';

/* ------------------------------------------------------------------ *
 * Galeria e links.
 *
 * Como os comentarios: a API nao tem /photos nem /links, entao estas
 * chamadas ficam presas na camada de mocks (`source: 'mock'`) ate' as
 * rotas existirem. O contrato esperado esta' no README.
 * ------------------------------------------------------------------ */

const photoPageSchema = pageSchema(photoSchema);
const linkPageSchema = pageSchema(linkSchema);

export function listPhotos(signal?: AbortSignal): Promise<Page<Photo>> {
  return request('/photos', { schema: photoPageSchema, source: 'mock', signal });
}

export function listLinks(signal?: AbortSignal): Promise<Page<LinkItem>> {
  return request('/links', { schema: linkPageSchema, source: 'mock', signal });
}
