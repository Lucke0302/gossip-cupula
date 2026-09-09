import { request } from '../lib/http';
import { linkSchema, pageSchema, photoSchema, type LinkItem, type Page, type Photo } from '../types';

const photoPageSchema = pageSchema(photoSchema);
const linkPageSchema = pageSchema(linkSchema);

export function listPhotos(signal?: AbortSignal): Promise<Page<Photo>> {
  return request('/photos', { schema: photoPageSchema, signal });
}

export function listLinks(signal?: AbortSignal): Promise<Page<LinkItem>> {
  return request('/links', { schema: linkPageSchema, signal });
}
