/**
 * Tudo com prefixo VITE_ vai pro bundle e fica publico. Por isso aqui so'
 * moram URL e flags — nunca segredo.
 */
const rawApiUrl = import.meta.env.VITE_API_URL?.trim() ?? '';

export const API_URL = rawApiUrl.replace(/\/+$/, '');

/** Sem API configurada, o app cai nos mocks sozinho em vez de quebrar. */
export const USE_MOCKS =
  import.meta.env.VITE_USE_MOCKS === 'true' || API_URL === '';
