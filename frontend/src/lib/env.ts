/**
 * Tudo com prefixo VITE_ vai pro bundle e fica publico. Por isso aqui so'
 * moram URL e flags — nunca segredo.
 */
const rawApiUrl = import.meta.env.VITE_API_URL?.trim() ?? '';

/**
 * Caminho da API vista pelo navegador. O padrao e' /api porque o front
 * sempre fala com a propria origem: quem repassa para a API de verdade e'
 * o proxy (Vite em dev, funcao da Vercel em producao).
 */
export const API_URL = (rawApiUrl || '/api').replace(/\/+$/, '');

/**
 * Mocks so' ligam por opt-in explicito.
 *
 * Ja' foi o contrario — sem VITE_API_URL o app caia nos mocks sozinho.
 * Era uma armadilha: um deploy sem variavel de ambiente serviria dados
 * de mentira com cara de verdade, sem ninguem perceber. Agora, sem
 * configuracao, ele fala com a API e falha alto se ela nao responder.
 *
 * Atencao: isto NAO desliga tudo. Comentarios ainda passam
 * `source: 'mock'` no service porque a API nao tem essas rotas — segue
 * mockado ate' o backend implementa-las. Posts, eventos, fotos e links vao
 * pra API de verdade; mocks so' entram com VITE_USE_MOCKS=true.
 */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';
