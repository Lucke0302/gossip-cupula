# gossip da cúpula — front-end

Blog de fofocas privado entre amigos, estética blogspot 2008 / Gossip Girl.
React 18 + TypeScript + Vite + Tailwind + React Router + TanStack Query +
React Hook Form + Zod.

O visual vem do canvas do Claude Design (`Gossip da Cúpula.dc.html`): tokens,
seis telas (tokens, home, post, novo post, login/cadastro, vazio/carregando) em
desktop 1180px e mobile 390px.

---

## Rodando

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`. **Sem nenhuma configuração**, o app sobe com a
camada de mocks ligada e dá pra navegar em todas as telas.

Contas de mentira:

| apelido      | senha       | papel |
| ------------ | ----------- | ----- |
| `gossipgirl` | `xoxo123`   | admin |
| `convidada`  | `cupula123` | user  |

Para falar com a API de verdade, copie `.env.example` para `.env` e ajuste:

```bash
VITE_API_URL=http://localhost:5195/api
VITE_USE_MOCKS=false
```

Outros scripts: `npm run build`, `npm run preview`, `npm run typecheck`.

---

## Anonimato — a regra que manda em tudo

Este é o requisito central e ele é **de dados**, não de interface.

### O que o front-end faz

- `Post` e `Comment` (em `src/types/index.ts`) **não têm** `authorId`,
  `authorName`, `ownerUsername`, avatar, e-mail nem nada derivado do autor.
  Não é campo escondido no CSS nem filtrado na renderização: o campo não
  existe no tipo, então não há o que vazar na tela.
- Os schemas Zod são **`.strict()`**. Se a API mandar qualquer campo a mais, a
  validação falha e vira `ContractError` visível — inclusive em dev, com o
  payload no console. Um campo de autor que escapou no backend quebra a tela
  na hora em vez de chegar calado até o HTML.
- A autoria só existe no **payload de criação**, e mesmo lá é implícita: vai no
  header `Authorization`, nunca no corpo. A resposta do `POST` volta com o
  mesmo formato anônimo de qualquer leitura.
- O `nickname` da sessão serve só pra pessoa saber que está logada. Ele não
  acompanha post nem comentário em lugar nenhum.
- Fotos anexadas passam por um `canvas` antes do upload
  (`src/pages/NewPostPage.tsx`), o que descarta o EXIF inteiro — GPS e horário
  do disparo incluídos.

### Metadados que denunciam

Anonimato não morre só por causa de um campo `authorName`. Morre por
metadado. O que o contrato exige:

| risco                       | como o contrato resolve                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| timestamp com segundos      | `publishedAt` vem **arredondado para a hora cheia em UTC**. O schema `coarseTimestampSchema` rejeita qualquer coisa com minuto/segundo diferente de zero. A UI nunca mostra mais que "terça · 23h". |
| ID sequencial               | IDs são **opacos** (`^[A-Za-z0-9_-]{8,}$`). Um `id: 1, 2, 3` entrega ordem de criação e volume — o schema recusa separadores e o backend não deve usar inteiros. |
| paginação por offset        | Feed pagina por **cursor opaco** (`nextCursor`). `?page=2` também revela ordem e volume total.                                                        |
| ordem de criação previsível | O servidor ordena por `publishedAt` (hora cheia) e **embaralha os empates a cada request**. Dois posts da mesma hora não têm ordem estável.           |

### O que o backend precisa fazer igual

Nada disso funciona se o servidor não fizer a parte dele. O contrato:

1. **Nunca serialize o autor** em resposta de leitura de post ou comentário.
   Não é "não mostrar": é não incluir no JSON. Hoje o
   `PostResponseDto` do backend .NET envia `ownerUsername: "Gossip Girl"` — um
   valor fixo, mas ainda assim um campo de autor no contrato. Remova-o: com os
   schemas `.strict()`, ele derruba a validação de propósito.
2. **Arredonde `publishedAt` para a hora cheia** antes de serializar. Guarde a
   precisão total no banco se precisar de auditoria, mas não exponha.
3. **IDs opacos e não sequenciais** (GUID sem hífen, base62, nanoid). Nunca
   inteiro autoincremento na resposta.
4. **Embaralhe empates** de ordenação a cada request.
5. **A lista "meus posts", se existir, é rota separada e autenticada.**
   Nunca um filtro `?author=me` na rota pública do feed: a existência do filtro
   já é o vazamento, porque prova que o servidor sabe cruzar post e autor
   naquela mesma rota. Ela deve devolver apenas os IDs que aquele token criou,
   sem nunca aceitar o id de outra pessoa como parâmetro.
6. **Não logue** IP, user-agent ou correlação autor↔post junto ao conteúdo.
   Log de aplicação também é vazamento — só que mais lento.
7. **Descarte metadados de imagem** no servidor também. O front tira o EXIF,
   mas o front é território hostil: quem controla o cliente pode não tirar.

---

## Autenticação

| peça                | onde vive                                       |
| ------------------- | ----------------------------------------------- |
| access token (15min) | **memória** (`useRef` no `AuthContext`) — nunca `localStorage`, nunca `sessionStorage`, nunca cookie legível por JS |
| refresh token        | **cookie `httpOnly` + `Secure`**, setado pelo backend. O JS nem enxerga. |

Todas as requisições saem com `credentials: 'include'`.

**Ciclo de 401** (`src/lib/http.ts`):

1. Requisição toma 401.
2. O client chama `POST /auth/refresh` **uma vez**.
3. Refaz a requisição original com o token novo.
4. Se der 401 de novo, derruba a sessão, limpa o cache do TanStack Query e o
   `ProtectedRoute` manda pro `/login`.

**Fila de refresh**: se cinco requisições tomarem 401 ao mesmo tempo, só uma
chama `/auth/refresh`; as outras esperam na mesma promise (`refreshInFlight`) e
depois repetem. Nada de N refreshes em paralelo rotacionando o token um por
cima do outro.

Ainda tem renovação proativa: o `AuthContext` agenda um refresh silencioso 60s
antes de o access token expirar, pra ninguém tomar 401 no meio de um clique.

No boot, o app tenta ressuscitar a sessão só com o cookie de refresh. É por
isso que recarregar `/post/abc` logado não pisca o `/login`.

---

## Camada de API

```
src/services/
  auth.service.ts      login, cadastro, refresh, sessão, logout
  posts.service.ts     feed (cursor), detalhe, criação
  comments.service.ts  lista e criação
  gallery.service.ts   fotos e links
  mock/                dados e servidor falso (mesmo contrato)
src/lib/
  http.ts              client HTTP único
  errors.ts            ApiError / ContractError / SessionExpiredError
```

Nenhum componente ou hook chama `fetch` direto. Tudo passa por
`request()`, que centraliza baseURL, `credentials`, headers, serialização,
tratamento de erro, o ciclo de refresh e a validação Zod.

A camada de mocks (`src/services/mock/server.ts`) implementa exatamente as
mesmas rotas, com os mesmos status e os mesmos corpos. Trocar
`VITE_USE_MOCKS=false` não muda uma linha de código de tela. Ela até injeta
falha em ~12% dos comentários, pra dar pra ver o rollback otimista acontecendo.

### Endpoints esperados

| método | rota                  | resposta                                             |
| ------ | --------------------- | ---------------------------------------------------- |
| `POST` | `/auth/login`         | `{ nickname, role, expiresIn, accessToken }` + cookie |
| `POST` | `/auth/register`      | idem                                                  |
| `POST` | `/auth/refresh`       | `{ accessToken, expiresIn }` + cookie rotacionado     |
| `POST` | `/auth/logout`        | `204`                                                 |
| `GET`  | `/auth/session`       | `{ nickname, role }`                                  |
| `GET`  | `/posts?cursor&limit` | `{ items: Post[], nextCursor }`                       |
| `GET`  | `/posts/:id`          | `PostDetail`                                          |
| `POST` | `/posts`              | `PostDetail` (201)                                    |
| `GET`  | `/posts/:id/comments` | `{ items: Comment[], nextCursor }`                    |
| `POST` | `/posts/:id/comments` | `Comment` (201)                                       |
| `GET`  | `/photos`             | `{ items: Photo[], nextCursor }`                      |
| `GET`  | `/links`              | `{ items: LinkItem[], nextCursor }`                   |

Formato exato de cada tipo: `src/types/index.ts` — os schemas Zod **são** a
especificação.

### Distância entre este contrato e o backend .NET de hoje

O `backend/` que está neste repositório ainda **não** cumpre o contrato acima.
Diferenças que precisam ser resolvidas do lado do servidor:

| item                | backend hoje                                     | contrato |
| ------------------- | ------------------------------------------------ | -------- |
| campo de autor      | `PostResponseDto.ownerUsername = "Gossip Girl"`   | não existe no JSON |
| comentários         | não existem endpoints                             | `/posts/:id/comments` (GET/POST) |
| refresh token       | vai e volta **no corpo** do `POST /auth/refresh`  | cookie `httpOnly` + `Secure` |
| login               | por `email` + senha                               | por `nickname` + senha (e-mail é identificador pessoal) |
| `createdAt`         | UTC com precisão de segundos                      | arredondado pra hora cheia |
| paginação           | `GET /posts` devolve tudo                         | cursor opaco + `limit` |
| fotos / links       | não existem                                       | `/photos`, `/links` |
| votos e SignalR     | existem (`/vote`, `ReceiveNewGossip`)             | fora do escopo desta entrega |

Enquanto isso não fecha, o front roda com `VITE_USE_MOCKS=true`.

---

## Rotas

| rota        | tela                                    | protegida |
| ----------- | --------------------------------------- | --------- |
| `/`         | feed (scroll infinito + botão)          | sim       |
| `/post/:id` | post + comentários + campo de comentar   | sim       |
| `/novo`     | criar post                               | sim       |
| `/login`    | login                                    | não       |
| `/cadastro` | cadastro                                 | não       |
| `/links`    | links                                    | sim       |
| `/fotos`    | galeria                                  | sim       |
| `*`         | 404 no mesmo visual                      | não       |

> **Nota sobre o escopo.** A especificação marcava só `/novo` como protegida.
> Aqui **todas as rotas que leem dados** ficam atrás do login, porque o backend
> exige `[Authorize]` em todo controller de dados — uma tela pública de feed só
> conseguiria renderizar um 401. Se o feed passar a ser público, é só tirar as
> rotas de dentro do `<ProtectedRoute>` em `src/App.tsx`.

Todas as rotas são `lazy`, cada uma no seu chunk.

---

## Estados, acessibilidade e performance

- **Loading / erro / vazio** em toda tela que busca dados. Os esqueletos são os
  do design (shimmer 1.4s, "apurando o babado...").
- **Comentário otimista**: aparece na hora, com o texto esmaecido e
  "enviando…"; se o POST falhar, some, o contador volta e o texto retorna pro
  campo pra pessoa não perder o que escreveu.
- **Teclado**: foco visível global, link "pular para o conteúdo", `NavLink` com
  `aria-current`, e o scroll infinito sempre acompanhado de um botão
  "mais babado" — quem navega por Tab nunca depende de rolar até o fim.
- **Leitores de tela**: toasts em região `aria-live="polite"`, esqueletos com
  `role="status"` + `aria-busy`, erros de campo em `role="alert"` ligados por
  `aria-describedby`, `alt` em toda imagem.
- **Contraste**: as cores de seção são calibradas pra texto claro sobre preto.
  Sobre o cartão branco (página de links) elas viram versões escurecidas — o
  amarelo `#E8D44D` sobre branco é ilegível.
- **`prefers-reduced-motion`**: shimmer e pulse desligam.
- **Imagens** com `loading="lazy"` + `decoding="async"`.
- Nenhum `any` no código.

---

## Deploy (Vercel)

- `vercel.json` reescreve **todas** as rotas para `/index.html`. Sem isso,
  recarregar `/post/abc` dá 404 — o servidor procuraria um arquivo com esse
  nome.
- Root Directory do projeto na Vercel: `frontend`.
- `VITE_API_URL` nas variáveis de ambiente do projeto.
- **Nenhum segredo em variável `VITE_*`.** Tudo com esse prefixo é embutido no
  bundle e fica público — chave de API, connection string e token não entram
  aí, em ambiente nenhum.
- O backend precisa liberar CORS com `Access-Control-Allow-Credentials: true` e
  origem explícita (não `*`), senão o cookie de refresh não viaja.

---

## Assets

| arquivo              | o que é                                                     |
| -------------------- | ----------------------------------------------------------- |
| `public/bokeh.webp`  | o fundo do design, 1600x1000 — o mesmo `assets/bokeh.png` do canvas, guardado em webp (63KB em vez de ~260KB) |
| `public/favicon.png` | ícone da aba, 512x512                                        |

A classe `.bokeh` (`src/index.css`) desenha o fundo numa camada
`position: fixed` do tamanho da viewport, com `background-size: cover`. Assim
a imagem preenche a tela inteira em qualquer proporção — sem faixa preta nas
laterais em monitor largo, sem faixa embaixo em página comprida, e sem esticar
conforme o feed cresce (que é o que aconteceria se fosse background do
elemento, já que ele acompanha a altura do conteúdo).

Camada fixa em vez de `background-attachment: fixed` porque esse último
engasga no Safari iOS.

> O canvas usa `center top / 1600px auto`, que é o certo para um artboard de
> largura fixa. No navegador, com largura de tela variável, isso deixaria as
> laterais pretas — daí o `cover`.
