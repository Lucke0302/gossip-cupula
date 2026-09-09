import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { listLinks, listPhotos } from '../services/gallery.service';
import type { LinkItem, Page, Photo } from '../types';

export function usePhotos(enabled: boolean) {
  return useQuery<Page<Photo>, Error>({
    queryKey: queryKeys.photos,
    queryFn: ({ signal }) => listPhotos(signal),
    enabled,
  });
}

export function useLinks(enabled: boolean) {
  return useQuery<Page<LinkItem>, Error>({
    queryKey: queryKeys.links,
    queryFn: ({ signal }) => listLinks(signal),
    enabled,
  });
}
