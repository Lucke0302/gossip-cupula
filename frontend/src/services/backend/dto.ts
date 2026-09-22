import { z } from 'zod';
import { ContractError } from '../../lib/errors';
import { postDetailSchema, postSchema, type Post, type PostDetail } from '../../types';

/* ------------------------------------------------------------------ *
 * O que a API REALMENTE manda, e como isso vira o domínio anônimo.
 *
 * Os tipos de `src/types` descrevem o contrato que a gente quer. Este
 * arquivo descreve o contrato que existe hoje — e a distância entre os
 * dois. Toda conversão mora aqui: nenhuma tela vê um DTO da API.
 * ------------------------------------------------------------------ */

/**
 * PostResponseDto, campo por campo, como está no swagger.
 *
 * É `.strict()` de propósito. `ownerUsername` está listado porque a API
 * manda mesmo — mas qualquer campo NOVO que aparecer derruba a validação
 * na hora, que é o alarme que a gente quer: campo novo numa API de posts
 * anônimos é exatamente o tipo de coisa que precisa de revisão antes de
 * chegar perto de uma tela.
 */
export const backendPostSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().nullable(),
    content: z.string().nullable(),
    ownerUsername: z.string().nullable(),
    createdAt: z.string(),
    editedAt: z.string().nullable(),
    editedBy: z.string().uuid().nullable(),
    likesCount: z.number().int(),
    dislikesCount: z.number().int(),
  })
  .strict();

export const backendPostListSchema = z.array(backendPostSchema);

export type BackendPost = z.infer<typeof backendPostSchema>;

/**
 * Valor fixo que a API usa hoje no lugar do autor.
 *
 * Enquanto for essa constante, ninguém é identificado. Se um dia vier
 * outra coisa, é porque a API começou a devolver autor de verdade — e aí
 * descartar no cliente NÃO protege nada, porque o nome já viajou pela
 * rede e está no devtools de quem quiser olhar. Por isso o aviso é
 * barulhento: é conserto de servidor, não de front.
 */
const AUTOR_ESPERADO = 'Gossip Girl';
const jaAvisou = new Set<string>();

function vigiarAutor(dto: BackendPost): void {
  const autor = dto.ownerUsername;
  if (autor === null || autor === AUTOR_ESPERADO) return;
  if (jaAvisou.has(autor)) return;
  jaAvisou.add(autor);
  console.error(
    `[anonimato] a API mandou ownerUsername="${autor}" no post ${dto.id}. ` +
      'O front descarta, mas o dado JÁ saiu do servidor — isso precisa ser ' +
      'corrigido na API, não aqui.',
  );
}

/* ------------------------------ conversões ------------------------------ */

/**
 * Arredonda para a hora cheia em UTC.
 *
 * A API manda `createdAt` com precisão de segundos. Isso reconstrói
 * ordem e cruza com "quem saiu da sala às 23h47", então a tela nunca vê
 * mais que a hora. Atenção: isso corta o que é EXIBIDO — o valor cheio
 * continua saindo da API. O arredondamento de verdade é no servidor.
 */
function horaCheia(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return new Date(0).toISOString().replace(/\.\d{3}Z$/, 'Z');
  data.setUTCMinutes(0, 0, 0);
  return data.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Quebra o texto em parágrafos, do jeito que o post foi escrito. */
function paragrafos(conteudo: string | null): string[] {
  const limpo = (conteudo ?? '').trim();
  if (!limpo) return ['esse babado veio vazio.'];
  const partes = limpo
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return partes.length > 0 ? partes : [limpo];
}

function resumo(corpo: string[]): string {
  const primeiro = corpo[0] ?? '';
  return primeiro.length > 220 ? `${primeiro.slice(0, 217).trimEnd()}…` : primeiro;
}

/**
 * Valida o objeto já traduzido contra o schema do domínio.
 *
 * Usa safeParse e converte a falha em ContractError de propósito: um
 * ZodError cru escapando daqui chegaria na tela como "alguma coisa deu
 * errado", sem dizer o quê e sem registrar nada. ContractError é o tipo
 * que o resto do app entende, e loga o campo culpado em dev.
 */
function validar<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  valor: unknown,
  onde: string,
): z.infer<TSchema> {
  const resultado = schema.safeParse(valor);
  if (!resultado.success) {
    if (import.meta.env.DEV) {
      console.error(`[contrato] tradução de ${onde}`, resultado.error.issues, valor);
    }
    throw new ContractError(onde, resultado.error.issues);
  }
  return resultado.data as z.infer<TSchema>;
}

/**
 * DTO → Post.
 *
 * Repare que o objeto é montado campo a campo. Não existe spread do DTO
 * em lugar nenhum deste arquivo, de propósito: é isso que garante que
 * `ownerUsername`, `editedBy` e qualquer coisa que venha junto não têm
 * como vazar para o estado da aplicação por descuido.
 *
 * O id fica como veio: GUID v4 é aleatório, não sequencial, então já
 * atende o requisito de id opaco — e precisa bater com a rota
 * `/posts/{id:guid}` na hora de abrir o post.
 */
export function toPost(dto: BackendPost): Post {
  vigiarAutor(dto);
  const corpo = paragrafos(dto.content);

  return validar(postSchema, {
    id: dto.id,
    title: dto.title ?? 'sem manchete',
    excerpt: resumo(corpo),
    // A API não tem campo de imagem. Foto anexada ainda não trafega.
    imageUrl: null,
    imageAlt: null,
    // A API não tem comentários. Fica em zero até as rotas existirem.
    commentCount: 0,
    likes: dto.likesCount,
    dislikes: dto.dislikesCount,
    publishedAt: horaCheia(dto.createdAt),
  }, 'post');
}

export function toPostDetail(dto: BackendPost): PostDetail {
  vigiarAutor(dto);
  const corpo = paragrafos(dto.content);

  return validar(postDetailSchema, {
    id: dto.id,
    title: dto.title ?? 'sem manchete',
    excerpt: resumo(corpo),
    imageUrl: null,
    imageAlt: null,
    commentCount: 0,
    likes: dto.likesCount,
    dislikes: dto.dislikesCount,
    publishedAt: horaCheia(dto.createdAt),
    body: corpo,
  }, 'post detalhado');
}
