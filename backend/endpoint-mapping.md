# Mapeamento de Endpoints — GossipCupula.Api

Documentação das rotas atuais da API (backend .NET 10). Base de URL local:
`http://localhost:5195` (perfil `http` do `launchSettings.json`).

> **Swagger UI**: disponível em ambientes que **não** sejam Produção.
> - UI interativa: `GET /swagger`
> - Documento OpenAPI (JSON): `GET /swagger/v1/swagger.json`
>
> A UI possui o botão **Authorize** para inserir o token JWT, enviando o
> header `Authorization: Bearer {token}` em todas as requisições.

## Convenções de resposta

| Código | Significado |
|--------|-------------|
| 200 | Sucesso (corpo com o DTO de resposta) |
| 201 | Recurso criado (`POST /api/posts` inclui header `Location`) |
| 204 | Sucesso sem corpo (`DELETE`) |
| 400 | Requisição inválida (validação de DTO falhou, id não é `Guid`, etc.) |
| 401 | Não autenticado — token JWT ausente, inválido ou expirado |
| 403 | Autenticado, porém sem permissão (não é Owner e não é Admin) |
| 404 | Recurso não encontrado |
| 409 | Conflito — duas gravações simultâneas da mesma presença em um evento |

DTOs são recebidos via `application/json` (`[FromBody]`) — exceto o
`POST /api/posts`, que recebe `multipart/form-data` (`[FromForm]`, texto +
arquivos). Erros de validação
do `[ApiController]` seguem o formato `ProblemDetails`.

---

## 1. Auth — `AuthController`

### `POST /api/auth/register`

| Item | Detalhe |
|------|---------|
| Autenticação | ❌ Não (público) |
| Body (entrada) | `RegisterDto` — `username` (obrigatório, máx. 50), `email` (e-mail válido, máx. 256), `password` (6–100) |
| Resposta 200 | `AuthResponseDto` — `token`, `userId`, `username`, `role`, `refreshToken` |
| Resposta 400 | Validação do body falhou |
| Resposta 409 | `email` ou `username` já cadastrados |

> **Fluxo de validação de cadastro:** o usuário recém-cadastrado nasce com
> `IsEmailConfirmed = false` e `IsApprovedByAdmin = false`. Para conseguir
> logar, ele deve (1) confirmar o e-mail em `POST /api/auth/confirm-email` e
> (2) ter a conta aprovada por um Admin em `POST /api/admin/users/{id}/approve`.


### `POST /api/auth/login`

| Item | Detalhe |
|------|---------|
| Autenticação | ❌ Não (público) |
| Body (entrada) | `LoginDto` — `email`, `password` |
| Resposta 200 | `AuthResponseDto` — `token`, `userId`, `username`, `role`, `refreshToken` |
| Resposta 400 | Validação do body falhou |
| Resposta 400 | E-mail não confirmado — `{ "message": "Confirme seu e-mail antes de entrar." }` |
| Resposta 400 | Conta aguardando aprovação — `{ "message": "Sua conta está aguardando aprovação de um administrador." }` |
| Resposta 401 | E-mail ou senha inválidos |

### `POST /api/auth/confirm-email`

| Item | Detalhe |
|------|---------|
| Autenticação | ❌ Não (público) |
| Body (entrada) | `ConfirmEmailDto` — `email` (e-mail válido) |
| Resposta 200 | `{ "message": "E-mail confirmado com sucesso." }` |
| Resposta 400 | Validação do body falhou |
| Resposta 404 | Nenhum usuário com esse e-mail |

### `POST /api/auth/refresh`

| Item | Detalhe |
|------|---------|
| Autenticação | ❌ Não — usa o `refreshToken` (opaco) no body |
| Body (entrada) | `RefreshTokenDto` — `accessToken`, `refreshToken` |
| Resposta 200 | `AuthResponseDto` — novo par `token` + `refreshToken` (rotacionado a cada uso) |
| Resposta 400 | Validação do body falhou |
| Resposta 401 | Refresh token inválido ou expirado |

---

## 2. Admin — `AdminController` (base `/api/admin`)

Exige autenticação **com role `Admin`** no JWT (`[Authorize(Roles = "Admin")]`).
Sem token → **401**; token de usuário comum → **403**.

### `GET /api/admin/users`

| Item | Detalhe |
|------|---------|
| Autenticação | ✅ Sim — role `Admin` obrigatória |
| Parâmetros | — |
| Resposta 200 | Lista de `UserSummaryDto` — contas **não aprovadas primeiro**, depois as mais recentes |
| Resposta 401 | Token ausente/inválido |
| Resposta 403 | Usuário autenticado não tem role `Admin` |

```jsonc
// UserSummaryDto
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "role": "User | Admin",
  "isEmailConfirmed": true,
  "isApprovedByAdmin": false,
  "createdAt": "datetime (UTC)"
}
```

> `PasswordHash`, `RefreshToken` e `RefreshTokenExpiryTime` ficam fora da
> projeção — essas colunas nem são lidas do banco.

### `POST /api/admin/users/{id}/approve`

| Item | Detalhe |
|------|---------|
| Autenticação | ✅ Sim — role `Admin` obrigatória |
| Parâmetros | `id` — `Guid` (rota) |
| Resposta 204 | Conta aprovada (`IsApprovedByAdmin = true`) |
| Resposta 401 | Token ausente/inválido |
| Resposta 403 | Usuário autenticado não tem role `Admin` |
| Resposta 404 | Usuário inexistente |

### `POST /api/admin/users/{id}/revoke`

| Item | Detalhe |
|------|---------|
| Autenticação | ✅ Sim — role `Admin` obrigatória |
| Parâmetros | `id` — `Guid` (rota) |
| Resposta 204 | Aprovação revogada (`IsApprovedByAdmin = false`; `refreshToken`/expiração anulados) |
| Resposta 401 | Token ausente/inválido |
| Resposta 403 | Usuário autenticado não tem role `Admin` |
| Resposta 404 | Usuário inexistente |

### `DELETE /api/admin/users/{id}`

| Item | Detalhe |
|------|---------|
| Autenticação | ✅ Sim — role `Admin` obrigatória |
| Parâmetros | `id` — `Guid` (rota) |
| Resposta 204 | Usuário removido permanentemente (PostVotes dele em cascata; posts intactos) |
| Resposta 401 | Token ausente/inválido |
| Resposta 403 | Usuário autenticado não tem role `Admin` |
| Resposta 404 | Usuário inexistente |

---

## 3. Posts — `PostController` (base `/api/posts`)

Todos os endpoints de posts e votos exigem **`[Authorize]`** (header
`Authorization: Bearer {token}`). Sem token → **401**.

### `GET /api/posts`

| Item | Detalhe |
|------|---------|
| Autenticação | ✅ Sim |
| Parâmetros | `cursor` (query, opaco) e `limit` (query, 1..50, padrão 10) |
| Resposta 200 | `Page<PostResponseDto>` — `{ items, nextCursor }`, mais recentes primeiro |
| Resposta 401 | Token ausente/inválido |

> **Paginação no servidor (keyset).** O feed **não** devolve mais o array
> inteiro: a fatia é feita no banco, em `ORDER BY CreatedAt DESC, Id DESC`, e
> o `nextCursor` é um base64url opaco do par `(CreatedAt, Id)` do último item
> entregue. O `Id` desempata posts gravados no mesmo instante; um cursor
> inválido é ignorado (a listagem recomeça do topo). `limit` é limitado a
> 1..50. O `PostResponseDto` por item não mudou.

### `GET /api/posts/{id}`

| Item | Detalhe |
|------|---------|
| Autenticação | ✅ Sim |
| Parâmetros | `id` — `Guid` (rota) |
| Resposta 200 | `PostResponseDto` |
| Resposta 400 | `id` não é um `Guid` válido |
| Resposta 401 | Token ausente/inválido |
| Resposta 404 | Post inexistente |

### `POST /api/posts`

| Item | Detalhe |
|------|---------|
| Autenticação | ✅ Sim (post continua 100% anônimo — o token só autoriza) |
| Content-Type | `multipart/form-data` (formulário + arquivos) |
| Body (entrada) | `CreatePostFormRequest` — `text` (obrigatório; vira o `content` do post), `title` (opcional, máx. 200; quando ausente o título é derivado da 1ª linha do texto) e `images` (zero a 10 arquivos `image/*`) |
| Limites | 10 MB por imagem; 60 MB por request; JPEG/PNG/WEBP/GIF |
| Resposta 201 | `PostResponseDto` criado (header `Location: /api/posts/{id}`) |
| Resposta 400 | Validação falhou (texto vazio, imagem vazia/grande demais ou tipo não aceito) |
| Resposta 401 | Token ausente/inválido |
| Resposta 502 | Upload no OCI Object Storage falhou (nada é gravado) |

```http
POST /api/posts
Authorization: Bearer {token}
Content-Type: multipart/form-data; boundary=----Gossip

------Gossip
Content-Disposition: form-data; name="text"

o babado agora tem foto
------Gossip
Content-Disposition: form-data; name="images"; filename="babado.png"
Content-Type: image/png

<binário>
------Gossip--
```

**Fluxo do upload:** cada imagem sobe **em paralelo** para o bucket do OCI
Object Storage, com nome de objeto gerado no servidor
(`{guid}.{ext}` — o nome original do arquivo nunca vai para o bucket). O post
é gravado com o array de URLs públicas já resolvidas em `imageUrls`
(`text[]` no PostgreSQL). Se qualquer upload falhar, o post **não** é criado
(502) — URL quebrada no banco seria pior que post não publicado.

> **Posts 100% anônimos:** todo post é criado **sem dono** e exibe
> `ownerUsername = "Gossip Girl"`. Apenas usuários com role `Admin` podem
> editá-lo ou excluí-lo. O nome do arquivo enviado também é descartado
> (`IMG_20260930_da_camila.png` vira `{guid}.png`): a URL é pública.

**Efeitos colaterais** (após sucesso no banco):
- Webhook do bot Bostossauro (fire-and-forget) com payload `{"message":"xoxo"}`.
- Evento SignalR `ReceiveNewGossip` com o `PostResponseDto` (já com
  `imageUrls` e `commentCount`) para todos os clientes.

### `POST /api/posts/json`

Mesma criação, no contrato antigo (`application/json`: `title` + `content`),
sem imagens. Fica em rota própria porque o Swashbuckle não aceita duas
actions no mesmo método+path — a rota principal `POST /api/posts` agora é
`multipart/form-data`. | Resposta 201 = `PostResponseDto`.

### `PUT /api/posts/{id}`

| Item | Detalhe |
|------|---------|
| Autenticação | ✅ Sim |
| Parâmetros | `id` — `Guid` (rota) |
| Body (entrada) | `UpdatePostDto` — `content` (obrigatório) |
| Resposta 200 | `PostResponseDto` atualizado (`editedAt`/`editedBy` preenchidos) |
| Resposta 400 | Validação do body falhou / `id` inválido |
| Resposta 401 | Token ausente/inválido |
| Resposta 403 | Usuário não tem role `Admin` |
| Resposta 404 | Post inexistente |

### `DELETE /api/posts/{id}`

| Item | Detalhe |
|------|---------|
| Autenticação | ✅ Sim |
| Parâmetros | `id` — `Guid` (rota) |
| Resposta 204 | Post excluído (sem corpo) |
| Resposta 400 | `id` inválido |
| Resposta 401 | Token ausente/inválido |
| Resposta 403 | Usuário não tem role `Admin` |
| Resposta 404 | Post inexistente |

---

## 4. Votos — rota no `PostController`

### `POST /api/posts/{id}/vote`

| Item | Detalhe |
|------|---------|
| Autenticação | ✅ Sim (UserId = usuário do token) |
| Parâmetros | `id` — `Guid` (rota) |
| Body (entrada) | `VoteDto` — `voteType` (int: `1` = like, `-1` = dislike) |
| Resposta 200 | `{ postId, likes, dislikes }` (contagens atualizadas do post) |
| Resposta 400 | `voteType` ≠ 1/-1 ou body ausente/inválido |
| Resposta 401 | Token ausente/inválido |
| Resposta 404 | Post inexistente |

**Regras de negócio** (chave composta `PostId + UserId`):
- Voto inexistente → cria.
- Voto existente com o **mesmo** tipo → remove (tira o like/dislike).
- Voto existente com tipo **diferente** → troca (like ⇄ dislike).

**Efeito colateral**: evento SignalR `UpdateVoteCount` com
`{ postId, likes, dislikes }` para todos os clientes conectados.

---

## 5. Comentários — `CommentController` (base `/api/posts/{postId}/comments`)

Comentários são **100% anônimos**, igual aos posts: a tabela `Comments` não
tem `UserId`, `AuthorId` nem FK para `Users` — o banco não registra quem
escreveu. Só existem texto, post e instante de criação. O token do usuário
serve apenas para autorizar a requisição.

### `POST /api/posts/{postId}/comments`

| Item | Detalhe |
|------|---------|
| Autenticação | ✅ Sim |
| Parâmetros | `postId` — `Guid` (rota) |
| Body (entrada) | `CreateCommentRequest` — `text` (obrigatório; não pode ser vazio nem só espaços; máx. 500) |
| Resposta 201 | `CommentResponse` criado (sem header `Location`: não existe rota de comentário isolado) |
| Resposta 400 | Validação do body falhou |
| Resposta 401 | Token ausente/inválido |
| Resposta 404 | Post inexistente |

```jsonc
// request
{ "text": "soltei o babado" }
```

### `GET /api/posts/{postId}/comments`

| Item | Detalhe |
|------|---------|
| Autenticação | ✅ Sim |
| Parâmetros | `postId` — `Guid` (rota); `cursor` — query, opaco, opcional (vem de `nextCursor`); `limit` — query, 1–100, padrão 20 |
| Resposta 200 | `Page<CommentResponse>` — `{ items, nextCursor }`, **mais recentes primeiro** |
| Resposta 401 | Token ausente/inválido |

```jsonc
// 200
{
  "items": [
    { "id": "uuid", "text": "string", "publishedAt": "2026-09-29T17:00:00Z" }
  ],
  "nextCursor": "base64url | null"
}
```

### `GET /api/posts/{postId}/comments/count`

| Item | Detalhe |
|------|---------|
| Autenticação | ✅ Sim |
| Parâmetros | `postId` — `Guid` (rota) |
| Resposta 200 | `CommentCountResponse` — `{ "count": 3 }` |
| Resposta 401 | Token ausente/inválido |

```jsonc
// 200
{ "count": 0 }
```

**Regras de contrato:**

- É um `COUNT` no banco: nenhum comentário é lido, nenhum dado de autor
  existe. Só o número — não é uma listagem disfarçada.
- Rota isolada de propósito: o cartão do post precisa só do contador, e
  carregar a página de comentários para contar sairia caro em banda e em
  banco.
- **Post inexistente devolve 200 com `count: 0`**, igual ao `GET` da
  listagem: a rota não valida a existência do post, apenas filtra por
  `PostId`.

**Regras de negócio e de contrato:**

- **Anonimato no dado, não só na tela:** nenhum campo de autor existe na
  tabela, no DTO ou na resposta. Quem está logado é apenas autorizado.
- **`publishedAt` vem arredondado para a hora cheia em UTC** (minutos,
  segundos e milissegundos zerados). É regra de anonimato: um instante com
  precisão de segundos cruzado com o horário de acesso denunciaria quem
  comentou. O `CreatedAt` gravado mantém a precisão completa — o
  arredondamento acontece só na resposta.
- **Paginação por cursor (keyset), nunca offset**: `ORDER BY CreatedAt DESC,
  Id DESC` (o `Id` desempata comentários gravados no mesmo instante). O
  `nextCursor` é um base64url opaco do par `(CreatedAt, Id)` do último item;
  um cursor inválido é ignorado e a listagem recomeça do topo.
- **Post inexistente no `GET` devolve 200 com `items: []`** — a listagem não
  valida a existência do post, apenas filtra por `PostId`.
- **Excluir o post apaga os comentários em cascata** (`ON DELETE CASCADE`).

> **Contrato fechado com o front:** `frontend/src/types/index.ts` valida as
> respostas com `commentSchema` e `pageSchema`, ambos `.strict()`. Campo novo
> na resposta (`postId`, `createdAt`, autor...) **quebra** a validação com
> `unrecognized_keys` — por isso a resposta tem exatamente `id`, `text` e
> `publishedAt`, e a página exatamente `items` e `nextCursor`.

---

## 6. Eventos — `EventsController` (base `/api/events`)

Exige autenticação (`[Authorize]`), como o resto dos dados.

> **Autoria:** evento é a única exceção de autoria do site. `authorName` só vem
> preenchido quando a pessoa marcou "assinar" no POST — e é o único caso em que
> o nome é gravado. O nome sai do **token**, nunca do corpo: o front manda só a
> intenção (`signed`).
>
> **Presença:** a tabela `EventPresences` guarda quem confirmou (`EventId` +
> `UserId` como chave primária composta, o que impede confirmação duplicada),
> mas **nenhum `UserId` sai numa resposta**: o que trafega é o agregado
> (`goingCount`) e o estado de quem pediu (`isGoing`), projetados na própria
> consulta. Privacidade é a omissão na leitura, não a ausência no banco.

### `GET /api/events?month=YYYY-MM`

| Item | Detalhe |
|------|---------|
| Autenticação | ✅ Sim |
| Parâmetros | `month` — query, obrigatório, `YYYY-MM` |
| Resposta 200 | `Page<EventResponseDto>` — `{ items, nextCursor }`, em ordem de data. `nextCursor` é sempre `null` (um mês cabe numa resposta) |
| Resposta 400 | `month` ausente ou fora do formato — `{ "message": "..." }` |
| Resposta 401 | Token ausente/inválido |

### `POST /api/events`

| Item | Detalhe |
|------|---------|
| Autenticação | ✅ Sim |
| Body (entrada) | `CreateEventRequestDto` — `date` (`YYYY-MM-DD`, obrigatório), `title` (3–120, obrigatório), `time` (`"HH:mm"` ou `null`), `place` (opcional, máx. 120), `color` (uma das 5 cores do design), `signed` (bool) |
| Resposta 201 | `EventResponseDto` (sem header `Location`: não existe rota de evento isolado) |
| Resposta 400 | Validação do body falhou (título curto, data inválida, cor fora da paleta, horário fora do formato) |
| Resposta 401 | Token ausente/inválido |

**Regras de negócio:**
- `signed: false` (o padrão) → `authorName` **não é gravado**, fica `NULL`.
- `time` vazio → `NULL` ("a confirmar" é texto de tela, não valor guardado).
- `place` vazio → `"local em segredo"`; `description` nasce com
  `"marcado anonimamente. quem sabe, sabe."` (ou a variante de assinado).
- Quem fixa a estrelinha **já entra confirmado**: a resposta volta com
  `goingCount: 1` e `isGoing: true`.

### `DELETE /api/events/{id:guid}`

| Item | Detalhe |
|------|---------|
| Autenticação | ✅ Sim |
| Parâmetros | `id` — `Guid` (rota) |
| Resposta 204 | Evento excluído (as presenças saem em cascata) |
| Resposta 401 | Token ausente/inválido |
| Resposta 404 | Evento inexistente |

> Sem dono para conferir: `authorName` é assinatura, não propriedade, então
> **qualquer pessoa da cúpula pode desfixar**.

### `POST /api/events/{id:guid}/going`

| Item | Detalhe |
|------|---------|
| Autenticação | ✅ Sim (UserId = usuário do token) |
| Parâmetros | `id` — `Guid` (rota) |
| Resposta 200 | `GoingResultDto` — `{ eventId, goingCount, isGoing }` |
| Resposta 401 | Token ausente/inválido |
| Resposta 404 | Evento inexistente |
| Resposta 409 | Dois cliques simultâneos tentaram gravar a mesma presença |

**Regra:** confirmação inexistente → cria; existente → remove (toggle). A chave
composta barra a duplicata no banco, e o conflito vira **409** em vez de 500.

## 7. IA ("Gossipficar") — `AITransformationController` (base `/api/ai`)

Exige autenticação (`[Authorize]`): apenas usuários logados podem usar a IA.

### `POST /api/ai/gossipfy`

| Item | Detalhe |
|------|---------|
| Autenticação | ✅ Sim |
| Body (entrada) | `GossipfyRequest` — `content` (obrigatório; não pode ser vazio), `postId` (opcional, `Guid`) e `gossipifiedPostId` (opcional, `Guid`) |
| Resposta 200 | `GossipfyResponse` — `{ originalContent, transformedContent, warnings, gossipifiedPostId }` |
| Resposta 400 | `content` ausente/vazio — `{ "message": "O campo 'content' é obrigatório e não pode ser vazio." }` |
| Resposta 400 | Post já gossipificado (`postId` já possui `gossipifiedPostId`) — `{ "message": "Este post já foi gossipificado e não pode ser transformado novamente." }` |
| Resposta 400 | Texto temporário já gossipificado (`gossipifiedPostId` já existe na tabela `GossipifiedPosts`) — `{ "message": "Este texto temporário já foi gossipificado e não pode ser transformado novamente." }` |
| Resposta 401 | Token ausente/inválido |
| Resposta 404 | `postId` informado e o post não existe |
| Resposta 502 | Falha não mapeável na API da Anthropic (erros 401/403/404/429/5xx são repassados como `ProblemDetails`) |

```jsonc
// request
{
  "content": "A Serena terminou o namoro...",
  "postId": "00000000-0000-0000-0000-000000000000",           // opcional
  "gossipifiedPostId": "00000000-0000-0000-0000-000000000000" // opcional
}

// 200
{
  "originalContent": "...",
  "transformedContent": "Ei, Upper East Siders... XOXO — Gossip Girl.",
  "warnings": [],
  "gossipifiedPostId": "9f1c2e3a-1b2c-4d5e-8f90-a1b2c3d4e5f6" // token de rastreio — guarde e reenvie
}
```

**Pipeline de duas etapas** (IA da Anthropic — Claude):
1. **Etapa A (análise):** o texto é enviado com o System Prompt de *Análise
   Narrativa* e o modelo devolve um JSON, desserializado em `NarrativeAnalysis`.
   Falha no parse **não** interrompe o fluxo: entra um aviso em `warnings` e a
   redação segue só com o texto original.
2. **Etapa B (redação):** texto original + JSON da Etapa A geram a fofoca final
   em PT-BR ("XOXO — Gossip Girl.").

> **Prevenção de dupla gossipficação (tabela `GossipifiedPosts`):** a validação
> acontece **antes** de chamar a IA. Se `postId` for informado e o post já tiver
> `Posts.GossipifiedPostId` preenchido → **400**. Se `gossipifiedPostId` for
> informado e já existir na tabela `GossipifiedPosts` → **400**. Passando pela
> validação, o pipeline roda e um **novo** `GossipifiedPost` é gravado; o novo
> `gossipifiedPostId` volta na resposta.
>
> O frontend guarda esse Id e o reenvia: como FK `Posts.GossipifiedPostId` ao
> publicar o post definitivo (aceita nos DTOs de criação/edição de post) ou como
> `gossipifiedPostId` numa próxima transformação do mesmo texto ainda em edição.
> Isso substitui a antiga flag booleana `Posts.IsGossipfyed`.

> **Configuração:** chave em `Anthropic:ApiKey` (appsettings/secrets) ou na
> variável de ambiente `ANTHROPIC_API_KEY`. Modelos: `AnalysisModel`
> (Etapa A) e `RedactionModel` (Etapa B). A chamada HTTP usa resiliência (retry
> exponencial em erros transitórios).

---

## 8. Hub SignalR — `GossipHub`

| Item | Detalhe |
|------|---------|
| Endpoint | `/hubs/gossip` (WebSocket) |
| Negotiate | `POST /hubs/gossip/negotiate` |
| Autenticação | ✅ Sim — `[Authorize]` no `GossipHub` (401 sem token válido) |
| Eventos recebidos pelos clientes | `ReceiveNewGossip` (payload: `PostResponseDto`) e `UpdateVoteCount` (payload: `{ postId, likes, dislikes }`) |

Exemplo de conexão (JavaScript) — envie o token JWT via query `access_token`
(necessário no transporte WebSocket do navegador):

```js
const token = "SEU_TOKEN_JWT";

const connection = new signalR.HubConnectionBuilder()
  .withUrl("http://localhost:5195/hubs/gossip?access_token=" + token)
  .build();

connection.on("ReceiveNewGossip", (post) => console.log("Novo post:", post));
connection.on("UpdateVoteCount", (data) => console.log("Votos:", data));

connection.start();
```

---

## 8. Estrutura dos DTOs de resposta

### `PostResponseDto`

```jsonc
{
  "id": "uuid",
  "title": "string",
  "content": "string",
  "ownerUsername": "Gossip Girl",    // sempre — posts são 100% anônimos
  "createdAt": "datetime (UTC)",
  "editedAt": "datetime (UTC) | null",
  "editedBy": "uuid | null",         // id do Admin que editou
  "imageUrls": [                      // URLs públicas no OCI Object Storage
    "https://objectstorage.sa-saopaulo-1.oraclecloud.com/n/{ns}/b/{bucket}/o/{guid}.png"
  ],
  "commentCount": 3,                  // COUNT projetado no mesmo SELECT
  "likesCount": 0,
  "dislikesCount": 0
}
```

### `AuthResponseDto`

```jsonc
{
  "token": "string (JWT)",
  "userId": "uuid",
  "username": "string",
  "role": "User | Admin",
  "refreshToken": "string"
}
```

### `RegisterDto` / `LoginDto`

```jsonc
// RegisterDto
{ "username": "string", "email": "string", "password": "string" }

// LoginDto
{ "email": "string", "password": "string" }
```

### `EventResponseDto`

```jsonc
{
  "id": "uuid",
  "date": "2026-10-24",        // YYYY-MM-DD, sem hora: o grão é o dia
  "title": "baile de máscaras",
  "time": "23:00",             // "HH:mm" 24h, ou null = a confirmar
  "place": "salão da cúpula",
  "description": "marcado anonimamente. quem sabe, sabe.",
  "color": "#E86B9E",          // uma das 5 cores do design
  "authorName": null,          // null quando não assinou (o padrão)
  "goingCount": 31,            // agregado: nunca diz quem confirmou
  "isGoing": false             // se QUEM PEDIU confirmou
}
```

> `date` e `time` são **string** de propósito: um `TimeOnly` serializaria
> `"23:00:00"` e o regex do front (`horaSchema`) recusaria.

### `GoingResultDto`

```jsonc
// resposta de POST /api/events/{id}/going
{ "eventId": "uuid", "goingCount": 12, "isGoing": true }
```

> Sem `userId`: o serviço lê o usuário do token para decidir o toggle, mas o
> identificador não atravessa o DTO.

### `CreateEventRequestDto`

```jsonc
// POST /api/events
{ "date": "2026-10-24", "title": "baile de máscaras", "time": "23:00",
  "place": "salão da cúpula", "color": "#E86B9E", "signed": false }
```

> `time` e `place` são opcionais; `signed` é só a **intenção** de assinar — o
> nome vem do token.

---

## 7. Galeria e links — `PhotosController` e `LinksController`

Exigem autenticação (`[Authorize]`), como o resto dos dados. Os dois devolvem
o envelope `{ items, nextCursor }` (`pageSchema` no front, `.strict()`),
paginado por cursor opaco — o mesmo keyset de comentários/posts.

Os dois endpoints são **derivados dos posts**: o banco não tem tabela de
imagens nem de links. Os campos que a API não consegue tirar do banco estão
anotados abaixo (e o porquê). A consulta sempre projeta só as colunas
necessárias antes de trazer para a memória.

### `GET /api/photos`

| Item | Detalhe |
|------|---------|
| Autenticação | ✅ Sim |
| Parâmetros | `cursor` (query, opaco) e `limit` (query, 1..60, padrão 12) |
| Resposta 200 | `Page<PhotoResponseDto>` — `{ items, nextCursor }`, fotos mais recentes primeiro |
| Resposta 401 | Token ausente/inválido |

A lista é o **achatamento** (`SelectMany`) do array `Posts.ImageUrls`: cada
imagem de cada post vira um item, na ordem `(CreatedAt do post DESC, Id DESC,
índice da imagem ASC)`. A consulta projeta apenas `Id`, `Title`, `CreatedAt` e
`ImageUrls` — nada de `Content` nem de agregados. URLs inválidas (vazias ou
que não sejam absolutas http/https) são descartadas antes do keyset.

**Mapeamento — o que vem do banco e o que é derivado:**

| campo         | origem                                                               |
| ------------- | -------------------------------------------------------------------- |
| `id`          | derivado: `{postId:N}{índice:D2}` (id opaco por foto)                |
| `url`         | `Posts.ImageUrls[i]` (trim + exige URL absoluta http/https)          |
| `alt`         | derivado: texto fixo (o banco não guarda descrição por imagem)       |
| `caption`     | derivado: título do post                                            |
| `width`       | derivado: `1200` (dimensão real não é guardada)                     |
| `height`      | derivado: `1200`                                                     |
| `publishedAt` | `Posts.CreatedAt` arredondado para a hora cheia em UTC               |

> Guardar dimensão e legenda por imagem exigiria uma tabela própria (ou
> metadado capturado no upload) — a URL sozinha não carrega isso.

### `GET /api/links`

| Item | Detalhe |
|------|---------|
| Autenticação | ✅ Sim |
| Parâmetros | `cursor` (query, opaco) e `limit` (query, 1..100, padrão 20) |
| Resposta 200 | `Page<LinkResponseDto>` — `{ items, nextCursor }` |
| Resposta 401 | Token ausente/inválido |

As URLs externas são extraídas do **texto** do post (regex `https?://...`),
sem repetição dentro do mesmo post e na ordem em que aparecem. Um
`LIKE '%http%'` corta os posts sem link antes de trazer qualquer linha.

**Mapeamento — o que é derivado** (o banco não guarda link curado):

| campo     | origem                                                             |
| --------- | ------------------------------------------------------------------ |
| `id`      | derivado: `{postId:N}{índice:D2}`                                  |
| `url`     | URL extraída do `Posts.Content` (http/https, sem pontuação final)  |
| `label`   | derivado: host da URL (sem `www.`)                                 |
| `note`    | derivado: título do post                                           |
| `section` | derivado: sempre `links` (a seção não é inferível do texto)        |

> Uma tabela de links curados resolveria `label`/`note`/`section` sem
> adivinhação; enquanto a fonte é o texto do post, os três são derivados.

---

## Observações

- **Comentários são anônimos por construção:** a tabela `Comments` não tem
  `UserId`, `AuthorId` nem FK para `Users` — nem existe rota para editar ou
  excluir um comentário.
- **Os schemas do front são `.strict()`:** `PostResponseDto` ganhou
  `imageUrls` (array de URLs) e `commentCount` (inteiro) — os dois precisam
  entrar em `frontend/src/services/backend/dto.ts` (`backendPostSchema`) e em
  `frontend/src/types/index.ts`, senão a validação Zod do cliente quebra com
  `unrecognized_keys` e a lista de posts some. `CommentResponse` e
  `Page<CommentResponse>` **não** mudaram: o contador tem DTO próprio
  (`CommentCountResponse`).
- **Imagens (OCI Object Storage):** as fotos vão para um bucket público do
  OCI via Instance Principals (nenhuma chave no servidor). Configuração
  obrigatória em `appsettings` na seção `OCI` (`Namespace`, `BucketName`,
  `Region`). Localmente, fora da OCI, o serviço cai para o
  `~/.oci/config` do OCI CLI (`OCI:AuthMode = ConfigFile` força esse modo).
  Sem configuração válida, o upload responde **502** — o post não é criado.
- As rotas usam a restrição `{id:guid}` — valores fora do formato `Guid` não
  casam e resultam em resposta de rota não encontrada (ASP.NET Core).
- **Blindagem de dados:** todos os controllers de dados (`PostController`,
  `CommentController`, `EventsController`, `AdminController`) e o hub
  `GossipHub` exigem **`[Authorize]`** (JWT). Somente as rotas públicas do
  `AuthController` (`register`, `login`, `confirm-email`, `refresh`) podem ser
  acessadas sem token. O controller de exemplo `WeatherForecastController` foi
  removido.
- **Login só é liberado** após e-mail confirmado (`confirm-email`) e aprovação
  do Admin (`/api/admin/users/{id}/approve`).
- **Refresh token** é rotacionado a cada `login` e a cada `refresh`, com
  validade de 7 dias (`RefreshTokenExpiryTime`).
- **Admin** também pode **revogar** uma aprovação (`/revoke`, derruba a sessão)
  e **deletar** um usuário (`DELETE /api/admin/users/{id}`).
- **Migration pendente:** nenhuma. As migrations `AddPostImages` e `AddEvents`
  estão aplicadas no banco (a última cria `Events` e `EventPresences`, sem tocar
  em nenhuma tabela existente).

