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

DTOs são recebidos via `application/json` (`[FromBody]`). Erros de validação
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
| Parâmetros | — |
| Resposta 200 | Lista de `PostResponseDto` (mais recentes primeiro) |
| Resposta 401 | Token ausente/inválido |

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
| Autenticação | ✅ Sim (Owner = usuário do token) |
| Body (entrada) | `CreatePostDto` — `title` (obrigatório, máx. 200), `content` (obrigatório) |
| Resposta 201 | `PostResponseDto` criado (header `Location: /api/posts/{id}`) |
| Resposta 400 | Validação do body falhou |
| Resposta 401 | Token ausente/inválido |

> **Posts 100% anônimos:** todo post é criado **sem dono** e exibe
> `ownerUsername = "Gossip Girl"`. Apenas usuários com role `Admin` podem
> editá-lo ou excluí-lo.

**Efeitos colaterais** (após sucesso no banco):
- Webhook do bot Bostossauro (fire-and-forget) com payload `{"message":"xoxo"}`.
- Evento SignalR `ReceiveNewGossip` com o `PostResponseDto` para todos os clientes.

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

## 5. Hub SignalR — `GossipHub`

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

## 6. Estrutura dos DTOs de resposta

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

---

## Observações

- As rotas usam a restrição `{id:guid}` — valores fora do formato `Guid` não
  casam e resultam em resposta de rota não encontrada (ASP.NET Core).
- **Blindagem de dados:** todos os controllers de dados (`PostController`,
  `AdminController`) e o hub `GossipHub` exigem **`[Authorize]`** (JWT).
  Somente as rotas públicas do `AuthController` (`register`, `login`,
  `confirm-email`, `refresh`) podem ser acessadas sem token. O controller de
  exemplo `WeatherForecastController` foi removido.
- **Login só é liberado** após e-mail confirmado (`confirm-email`) e aprovação
  do Admin (`/api/admin/users/{id}/approve`).
- **Refresh token** é rotacionado a cada `login` e a cada `refresh`, com
  validade de 7 dias (`RefreshTokenExpiryTime`).
- **Admin** também pode **revogar** uma aprovação (`/revoke`, derruba a sessão)
  e **deletar** um usuário (`DELETE /api/admin/users/{id}`).

