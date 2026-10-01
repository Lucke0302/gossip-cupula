import { z } from 'zod';

/* ------------------------------------------------------------------ *
 * REGRA CENTRAL: ANONIMATO
 *
 * Post e Comment NAO possuem authorId, authorName, ownerUsername,
 * avatar, email nem nada derivado do autor. Isso nao e' um detalhe de
 * UI: e' o formato do dado. Os schemas abaixo sao `.strict()`, entao se
 * o backend mandar QUALQUER campo a mais a validacao explode e o erro
 * aparece — que e' exatamente o que queremos. Um campo de autor que
 * vazou nunca vai chegar calado ate' a tela.
 *
 * A autoria so' existe no payload de criacao (POST), autenticada via
 * token. A resposta de leitura volta sem ela.
 * ------------------------------------------------------------------ */

/** Id opaco. Nunca sequencial — id sequencial denuncia ordem de criacao. */
export const opaqueIdSchema = z
  .string()
  .min(8)
  .regex(/^[A-Za-z0-9_-]+$/, 'id deve ser opaco (sem separadores)');

/**
 * Carimbo de tempo grosseiro. O backend arredonda para a HORA cheia em
 * UTC antes de responder. Precisao de segundos denunciaria quem postou
 * ("foi quem saiu da mesa 23h47").
 */
export const coarseTimestampSchema = z
  .string()
  .datetime({ offset: true })
  .refine((value) => {
    const d = new Date(value);
    return d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
  }, 'timestamp precisa vir arredondado para a hora cheia (anonimato)');

export const postSchema = z
  .object({
    id: opaqueIdSchema,
    title: z.string().min(1).max(200),
    excerpt: z.string(),
    /*
     * Fotos do post: LISTA de URLs publicas (bucket do OCI), nunca null —
     * lista vazia quando o post nao tem foto. Ja' existiu aqui um
     * `imageUrl` singular; o contrato novo so' conhece array, entao o
     * campo antigo saiu em vez de virar um segundo jeito de dizer a
     * mesma coisa.
     */
    imageUrls: z.array(z.string()),
    /*
     * Quantidade de comentarios. Vem projetada no proprio post (COUNT no
     * mesmo SELECT da API), entao o feed mostra o numero certo sem
     * carregar a lista de comentarios de cada post.
     */
    commentCount: z.number().int().nonnegative(),
    /*
     * Contagens agregadas. Sao so' numeros: a API nunca diz QUEM votou, e
     * tambem nao diz se VOCE votou — nao existe campo do tipo "myVote".
     * Por isso o estado visual do proprio voto e' lembrado no navegador,
     * nao no servidor (veja src/lib/votes.ts).
     */
    likes: z.number().int().nonnegative(),
    dislikes: z.number().int().nonnegative(),
    publishedAt: coarseTimestampSchema,
  })
  .strict();

/** 1 = amei, -1 = credo. Os mesmos valores que o VoteDto da API espera. */
export const voteValueSchema = z.union([z.literal(1), z.literal(-1)]);

export const voteResultSchema = z
  .object({
    postId: z.string(),
    likes: z.number().int().nonnegative(),
    dislikes: z.number().int().nonnegative(),
  })
  .strict();

export type VoteValue = z.infer<typeof voteValueSchema>;
export type VoteResult = z.infer<typeof voteResultSchema>;

export const postDetailSchema = postSchema
  .extend({
    /** Paragrafos do corpo. Array para nao depender de HTML do servidor. */
    body: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const commentSchema = z
  .object({
    id: opaqueIdSchema,
    text: z.string().min(1).max(500),
    publishedAt: coarseTimestampSchema,
  })
  .strict();

export const pageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z
    .object({
      items: z.array(item),
      /** Cursor opaco. Nada de `?page=2` — offset expoe ordem e volume. */
      nextCursor: z.string().nullable(),
    })
    .strict();

export const photoSchema = z
  .object({
    id: opaqueIdSchema,
    url: z.string().url(),
    alt: z.string().min(1),
    caption: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    publishedAt: coarseTimestampSchema,
  })
  .strict();

export const linkSchema = z
  .object({
    id: opaqueIdSchema,
    label: z.string().min(1),
    url: z.string().url(),
    note: z.string(),
    section: z.enum(['welcome', 'fofocas', 'fotos', 'eventos', 'links']),
  })
  .strict();

/**
 * Sessao, do ponto de vista do navegador.
 *
 * Repare no que NAO tem aqui: token. Os tokens ficam no cookie HttpOnly
 * que o proxy-com-sessao escreve, e o JavaScript desta pagina nao os le' —
 * por isso o unico dado de sessao que chega ao cliente e' quem voce e'.
 *
 * `nickname` NUNCA e' anexado a um post ou comentario; so existe pra
 * pessoa saber que esta logada. `role` libera as acoes de admin.
 */
export const sessionSchema = z
  .object({
    nickname: z.string().max(50),
    role: z.enum(['user', 'admin']),
  })
  .strict();

export type Post = z.infer<typeof postSchema>;
export type PostDetail = z.infer<typeof postDetailSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type Photo = z.infer<typeof photoSchema>;
export type LinkItem = z.infer<typeof linkSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Page<T> = { items: T[]; nextCursor: string | null };

/* ---------------------------- payloads de escrita ---------------------------- */
/* Aqui a autoria existe — mas implicitamente, via token. Nenhum campo de
   identidade viaja no corpo. */

/*
 * Limites do post.
 *
 * O minimo existe so' pra barrar envio vazio ou acidental — a API aceita
 * qualquer conteudo nao-vazio, entao nao faz sentido o front ser muito
 * mais exigente que ela. "ela voltou." e' um babado legitimo.
 *
 * As mensagens dizem o numero: "conta mais" sozinho nao informa quanto
 * falta, e a pessoa fica tentando adivinhar.
 */
export const POST_TITLE_MIN = 4;
export const POST_CONTENT_MIN = 10;
export const POST_CONTENT_MAX = 1200;

/**
 * Quantas fotos cabem num post.
 *
 * Dez e' o teto do backend (`CreatePostFormRequest.MaxImages`). Passar
 * disso faz o servidor recusar o request inteiro, entao o formulario
 * corta antes — validacao no cliente e' conveniencia, nao seguranca.
 */
export const MAX_POST_IMAGES = 10;

export const createPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(POST_TITLE_MIN, `a manchete precisa de pelo menos ${POST_TITLE_MIN} caracteres`)
    .max(200, 'manchete até 200 caracteres'),
  content: z
    .string()
    .trim()
    .min(POST_CONTENT_MIN, `o babado precisa de pelo menos ${POST_CONTENT_MIN} caracteres`)
    .max(POST_CONTENT_MAX, `o babado cabe em ${POST_CONTENT_MAX} caracteres`),
  /*
   * Arquivos escolhidos no formulario. Sao `File` de verdade, e nao data
   * URL: quem viaja pro servidor e' o arquivo cru, dentro de um
   * multipart/form-data. O reencode no canvas (NewPostPage) acontece
   * antes de entrar aqui, entao o que sobe ja' perdeu o EXIF.
   */
  images: z
    .array(z.instanceof(File))
    .max(MAX_POST_IMAGES, `no máximo ${MAX_POST_IMAGES} fotos por post`)
    .default([]),
});

export const createCommentSchema = z.object({
  text: z
    .string()
    .trim()
    .min(2, 'escreve alguma coisa')
    .max(500, 'comentário até 500 caracteres'),
});

export const loginSchema = z.object({
  nickname: z.string().trim().min(2, 'apelido obrigatório').max(50),
  password: z.string().min(6, 'senha de no mínimo 6 caracteres').max(100),
  remember: z.boolean().default(false),
});

/*
 * O codigo de convite saiu: a API nao tem esse conceito. O que ela exige
 * pra criar conta e' username + e-mail + senha, e o e-mail e' de verdade
 * — e' pra ele que vai a confirmacao sem a qual o login nao libera.
 *
 * E-mail e' dado de cadastro: nao acompanha post nem comentario.
 */
export const registerSchema = z.object({
  nickname: z.string().trim().min(2, 'apelido obrigatório').max(50),
  email: z.string().trim().email('e-mail inválido').max(256),
  password: z.string().min(6, 'senha de no mínimo 6 caracteres').max(100),
  oath: z.literal(true, {
    errorMap: () => ({ message: 'sem o juramento não tem cúpula' }),
  }),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

/* ------------------------------ eventos ------------------------------ */

/**
 * Cores possiveis da estrelinha. Sao as mesmas das secoes do design —
 * rosa (eventos), coral (fofocas), amarelo (fotos), azul (welcome) e
 * verde (links).
 */
export const EVENT_COLORS = ['#E86B9E', '#E8763A', '#E8D44D', '#6BB9E8', '#8DC63F'] as const;

export const eventColorSchema = z.enum(EVENT_COLORS);

/**
 * Um compromisso fixado no calendario.
 *
 * Igual a Post e Comment: NAO tem autor. Quem fixou a estrelinha some no
 * caminho — e' de proposito, e' o mesmo requisito do resto do site. Por
 * consequencia, qualquer pessoa da cupula pode desfixar o que foi
 * fixado; nao existe dono pra conferir.
 */
export const eventSchema = z
  .object({
    id: opaqueIdSchema,
    /** Data do evento, YYYY-MM-DD. O grao e' o dia: sem hora exata aqui. */
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve ser YYYY-MM-DD'),
    title: z.string().min(1).max(120),
    /** Texto livre: "22h", "horário a confirmar". Nao e' timestamp. */
    time: z.string().max(40),
    place: z.string().max(120),
    description: z.string().max(500),
    color: eventColorSchema,
    /** Quantos confirmaram. Agregado: a API nunca diz QUEM. */
    goingCount: z.number().int().nonnegative(),
    /**
     * Se VOCE confirmou. E' o unico dado pessoal do objeto, e so' faz
     * sentido pra quem pediu — o servidor responde isso olhando o token
     * de quem chamou, nunca expondo a lista de confirmados.
     */
    isGoing: z.boolean(),
  })
  .strict();

export const goingResultSchema = z
  .object({
    eventId: z.string(),
    goingCount: z.number().int().nonnegative(),
    isGoing: z.boolean(),
  })
  .strict();

export type EventColor = z.infer<typeof eventColorSchema>;
export type CalendarEvent = z.infer<typeof eventSchema>;
export type GoingResult = z.infer<typeof goingResultSchema>;

/**
 * Campos do formulario de novo evento.
 *
 * Hora e local sao opcionais: fixar uma estrelinha tem que ser rapido,
 * mas isso aqui e' uma agenda — quem ja' sabe onde e que horas consegue
 * dizer na hora. Vazio vira o padrao de "marcado anonimamente".
 *
 *  e' texto livre ("22h", "depois do jantar") e nao timestamp:
 * hora exata em campo de data convida ordenacao por minuto, que e' o
 * tipo de metadado que o resto do site evita.
 */
export const createEventSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z
    .string()
    .trim()
    .min(3, 'conta pelo menos o que vai rolar')
    .max(120, 'cabe em 120 caracteres'),
  time: z.string().trim().max(40, 'o horário cabe em 40 caracteres').default(''),
  place: z.string().trim().max(120, 'o local cabe em 120 caracteres').default(''),
  color: eventColorSchema,
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
