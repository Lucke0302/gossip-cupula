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

Abre em `http://localhost:5173`.

> **PowerShell**: se `npm run dev` reclamar que `npm.ps1` não pode ser
> carregado, é a política de execução do Windows, não o projeto. Use
> `npm.cmd run dev`, ou libere scripts para o seu usuário com
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`.

### Dois modos

Copie `.env.example` para `.env` e escolha:

**Mocks** (padrão se não houver `.env`) — navega em todas as telas sem backend:

```bash
VITE_USE_MOCKS=true
```

| apelido      | senha       | papel |
| ------------ | ----------- | ----- |
| `gossipgirl` | `xoxo123`   | admin |
| `convidada`  | `cupula123` | user  |

**API real**:

```bash
VITE_API_URL=/api
VITE_USE_MOCKS=false
API_PROXY_TARGET=http://147.15.112.97:8080
```

Repare que `VITE_API_URL` é `/api`, e não a URL da API: o navegador só fala com
a própria origem. Veja a seção do proxy.

`API_PROXY_TARGET` **não tem** prefixo `VITE_` de propósito — ela é lida pelo
`vite.config.ts` (que roda no Node) e não entra no bundle.

Outros scripts: `npm run build`, `npm run preview`, `npm run typecheck`.

---

## O proxy-com-sessão

Tudo que o navegador chama em `/api` passa por `server/session-proxy.ts`. É um
módulo só, carregado pelo middleware do Vite em desenvolvimento e pela função
`api/[...path].ts` na Vercel — um handler, dois ambientes, sem risco de
comportarem diferente.

### Por que ele existe

Três problemas, uma solução:

1. **A API não tem CORS.** O preflight devolve `405` sem nenhum
   `Access-Control-Allow-Origin`, e não há configuração de CORS no
   `Program.cs`. Chamada direta do navegador seria bloqueada.
2. **A API é HTTP puro.** Página servida em HTTPS (Vercel) não pode chamar
   `http://` — mixed content.
3. **Os tokens vêm no corpo do JSON**, sem `Set-Cookie`. Guardar isso no
   navegador significaria deixar a sessão ao alcance de qualquer XSS.

Como a requisição sai de um servidor e não do navegador, (1) e (2) somem. E
como existe um servidor no meio, ele pode resolver (3):

```
navegador  →  /api/auth/login  →  [proxy]  →  API
                                     │
                                     ├─ tira os tokens do corpo
                                     ├─ Set-Cookie: HttpOnly; Secure; SameSite=Strict
                                     └─ devolve só { nickname, role }
```

Nas chamadas seguintes o proxy lê o cookie e monta o `Authorization: Bearer` do
lado do servidor. **O JavaScript da página nunca vê token nenhum** —
`document.cookie` volta string vazia.

### Renovação

O access token dura 15 minutos e a API não manda `expiresIn`, então o proxy lê
o claim `exp` do JWT e troca o par de tokens **antes** de vencer. Há também uma
retentativa reativa caso mesmo assim volte 401.

**Limitação conhecida:** a API rotaciona o refresh token a cada uso, e função
serverless não compartilha estado entre requisições. Se duas chamadas vencerem
no mesmo instante, as duas tentam renovar e uma perde a corrida — o pior caso é
voltar para o login. A renovação proativa torna isso raro, mas só dá para
eliminar de vez com estado compartilhado do lado do servidor.

---

## Anonimato — a regra que manda em tudo

É requisito **de dados**, não de interface.

### O que o front-end faz

- `Post` e `Comment` (`src/types/index.ts`) **não têm** `authorId`,
  `authorName`, `ownerUsername`, avatar nem e-mail. O campo não existe no tipo,
  então não há o que vazar na tela.
- `services/backend/dto.ts` descreve o DTO que a API manda hoje e converte para
  o domínio. Os objetos são montados **campo a campo** — não existe spread do
  DTO em lugar nenhum, e é isso que garante que `ownerUsername` e `editedBy`
  não cheguem ao estado por descuido.
- O schema do DTO é **`.strict()`**. `ownerUsername` está listado porque a API
  manda mesmo, mas qualquer campo **novo** derruba a validação na hora. Campo
  novo numa API de posts anônimos merece revisão antes de chegar perto de uma
  tela.
- Se `ownerUsername` vier diferente da constante `"Gossip Girl"`, o console
  solta um erro dizendo que **filtrar no cliente não protege nada** — o nome já
  viajou pela rede.
- `nickname` da sessão serve só para a pessoa saber que está logada. Não
  acompanha post nem comentário.
- Foto anexada passa por um `canvas` antes do upload
  (`src/pages/NewPostPage.tsx`), o que descarta o EXIF inteiro — GPS e horário
  do disparo incluídos.

### Metadados que denunciam

Anonimato não morre só por um campo `authorName`; morre por metadado.

| risco                       | como o front trata                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| timestamp com segundos      | `createdAt` é arredondado para a **hora cheia** em UTC na tradução. A UI nunca mostra mais que "terça · 23h".           |
| ID sequencial               | O GUID v4 da API é aleatório, então já serve como id opaco. O schema recusa qualquer id que não seja opaco.             |
| paginação por offset        | O feed pagina por **cursor opaco**. `?page=2` revelaria ordem e volume total.                                           |
| ordem de criação previsível | Nos mocks, empates de horário são embaralhados a cada request. Na API isso ainda não acontece — veja a lista abaixo.    |

> **Importante:** arredondar e descartar no cliente melhora o que **aparece**.
> O valor cheio continua saindo do servidor e está visível no devtools. A
> correção de verdade é no backend.

---

## O que o backend precisa fazer

Em ordem de gravidade.

### 1. Ninguém consegue logar (impasse de bootstrap)

`login` exige `IsApprovedByAdmin`, que só `POST /api/admin/users/{id}/approve`
seta, que exige role `Admin`. Mas o register crava `Role = "User"`
(`AuthService.cs:52`), não há seed, nenhuma migration insere usuário e nenhum
endpoint promove ninguém. Sem um admin criado por fora, **o sistema inteiro
fica trancado**.

Hoje existe um admin criado manualmente no banco. Para não depender disso,
escolha um: seed no `Program.cs` lendo de configuração, "primeiro usuário vira
admin" no register, ou migration com `HasData`.

### 2. Confirmação de e-mail não confirma nada

`POST /api/Auth/confirm-email` aceita só o e-mail, sem token — **qualquer um
confirma o e-mail de qualquer um**, e nenhum e-mail é enviado. Precisa de token
de uso único enviado por e-mail.

### 3. Anonimato

- **Não serialize o autor** em leitura de post. `PostResponseDto` manda
  `ownerUsername: "Gossip Girl"`. É constante, então não identifica ninguém
  hoje — mas é um campo de autor no contrato, e o `.strict()` do front existe
  para avisar se ele mudar.
- **Arredonde `createdAt`** para a hora cheia antes de serializar.
- **Embaralhe empates** de ordenação a cada request.
- **A lista "meus posts", se existir, é rota separada e autenticada.** Nunca um
  `?author=me` na rota pública: a existência do filtro já é o vazamento, porque
  prova que o servidor sabe cruzar post e autor ali.
- **Não logue** IP, user-agent ou correlação autor↔post junto ao conteúdo.

### 4. Funcionalidades que faltam

| o que falta          | efeito no front                                                     |
| -------------------- | -------------------------------------------------------------------- |
| comentários          | `/posts/{id}/comments` (GET/POST) não existe — o front usa mocks     |
| fotos e links        | `/photos` e `/links` não existem — idem                              |
| imagem no post       | `CreatePostDto` só tem `title` e `content`. **A foto anexada não é publicada**: a pessoa vê a prévia e ela não sai do navegador |
| paginação            | `GET /posts` devolve o array inteiro; a fatia é feita no cliente     |

### 5. Infraestrutura

- **CORS** com origem explícita (não `*`) — hoje contornado pelo proxy.
- **HTTPS** na API.
- Idealmente, `Set-Cookie: HttpOnly; Secure` no próprio backend, para o proxy
  não precisar fazer esse papel.

---

## Camada de API

```
src/services/
  auth.service.ts        login, cadastro, confirmação, sessão, logout
  posts.service.ts       escolhe a fonte (mocks ou API) e expõe uma só interface
  backend/dto.ts         DTO real da API + conversão para o domínio anônimo
  backend/posts.ts       posts contra a API, com paginação feita no cliente
  comments.service.ts    presos em mocks: a API não tem essas rotas
  gallery.service.ts     idem
  mock/                  dados e servidor falso
src/lib/
  http.ts                client HTTP único
  errors.ts              ApiError / ContractError / SessionExpiredError
server/session-proxy.ts  o proxy (dev e produção)
api/[...path].ts         casca da Vercel
```

Nenhum componente ou hook chama `fetch` direto. Tudo passa por `request()`, que
centraliza baseURL, `credentials`, headers, serialização, tratamento de erro e
validação Zod.

Comentários, fotos e links passam `source: 'mock'`, o que força a camada falsa
mesmo com a API ligada — sem isso essas telas levariam 404. Quando as rotas
existirem, é só tirar o `source`.

### Endpoints que o front usa

| método | rota no front         | para onde vai                                              |
| ------ | --------------------- | ---------------------------------------------------------- |
| `POST` | `/auth/login`         | `POST /api/Auth/login` com `{ identifier, password }`       |
| `POST` | `/auth/register`      | `POST /api/Auth/register` com `{ username, email, password }` |
| `POST` | `/auth/confirm-email` | `POST /api/Auth/confirm-email` (público)                    |
| `GET`  | `/auth/session`       | lido do cookie pelo proxy, sem ir à API                     |
| `POST` | `/auth/logout`        | limpa o cookie; a API não tem logout                        |
| `GET`  | `/posts`              | `GET /api/posts` → traduzido e paginado no cliente          |
| `GET`  | `/posts/:id`          | `GET /api/posts/{id}` → traduzido                           |
| `POST` | `/posts`              | `POST /api/posts` com `{ title, content }`                  |
| —      | comentários, fotos, links | mocks                                                   |

O formato exato de cada tipo está em `src/types/index.ts` — os schemas Zod
**são** a especificação.

---

## Rotas

| rota              | tela                                   | protegida |
| ----------------- | -------------------------------------- | --------- |
| `/`               | feed (scroll infinito + botão)         | sim       |
| `/post/:id`       | post + comentários + campo de comentar | sim       |
| `/novo`           | criar post                             | sim       |
| `/login`          | login (aceita usuário ou e-mail)       | não       |
| `/cadastro`       | cadastro                               | não       |
| `/conta-pendente` | aviso de conta aguardando liberação    | não       |
| `/links`          | links                                  | sim       |
| `/fotos`          | galeria                                | sim       |
| `*`               | 404 no mesmo visual                    | não       |

Todas as rotas são `lazy`, cada uma no seu chunk.

**Cadastro não entra.** A API devolve um token no register, mas o login só
libera depois de e-mail confirmado e aprovação de admin. Usar esse token para
deixar a pessoa navegando seria mentira de curto prazo — na próxima visita ela
levaria "aguardando aprovação" sem entender por quê. Então a sessão recém-criada
é descartada e a tela manda para `/conta-pendente`.

> **Nota sobre o escopo.** A especificação marcava só `/novo` como protegida.
> Aqui **todas as rotas que leem dados** ficam atrás do login, porque o backend
> exige `[Authorize]` em todo controller de dados — uma tela pública de feed só
> conseguiria renderizar 401. Para tornar o feed público, basta tirar as rotas
> de dentro do `<ProtectedRoute>` em `src/App.tsx`.

---

## Estados, acessibilidade e performance

- **Loading / erro / vazio** em toda tela que busca dados. Os esqueletos são os
  do design (shimmer 1.4s, "apurando o babado...").
- **Comentário otimista**: aparece na hora; se o POST falhar, some, o contador
  volta e o texto retorna ao campo.
- **Teclado**: foco visível global, link "pular para o conteúdo", `NavLink` com
  `aria-current`, e o scroll infinito sempre acompanhado de um botão "mais
  babado" — quem navega por Tab nunca depende de rolar até o fim.
- **Leitores de tela**: toasts em região `aria-live="polite"`, esqueletos com
  `role="status"` + `aria-busy`, erros de campo em `role="alert"` ligados por
  `aria-describedby`, `alt` em toda imagem.
- **Contraste**: as cores de seção são pensadas para texto claro sobre preto.
  Sobre o cartão branco (página de links) viram versões escurecidas — o amarelo
  `#E8D44D` sobre branco é ilegível.
- **`prefers-reduced-motion`**: shimmer e pulse desligam.
- **Imagens** com `loading="lazy"` + `decoding="async"`.
- Nenhum `any` no código.

---

## Deploy (Vercel)

- Root Directory do projeto: `frontend`.
- `api/[...path].ts` vira uma Vercel Function — o deploy **não é mais puramente
  estático**.
- `vercel.json` reescreve tudo que **não** começa com `api/` para
  `/index.html`. Sem isso, recarregar `/post/abc` dá 404.
- Configure `API_PROXY_TARGET` nas variáveis de ambiente do projeto (sem
  prefixo `VITE_`: ela é lida pela função, no servidor).
- **Nenhum segredo em variável `VITE_*`.** Tudo com esse prefixo é embutido no
  bundle e fica público.

---

## Assets

| arquivo              | o que é                                                      |
| -------------------- | ------------------------------------------------------------ |
| `public/bokeh.webp`  | o fundo do design, 1600x1000 — o mesmo `assets/bokeh.png` do canvas, em webp (63KB em vez de ~260KB) |
| `public/favicon.png` | ícone da aba, 512x512                                        |

A classe `.bokeh` (`src/index.css`) desenha o fundo numa camada
`position: fixed` do tamanho da viewport, com `background-size: cover`. Assim a
imagem preenche a tela em qualquer proporção — sem faixa preta nas laterais em
monitor largo, sem faixa embaixo em página comprida, e sem esticar conforme o
feed cresce.

Camada fixa em vez de `background-attachment: fixed` porque esse último engasga
no Safari iOS.

> O canvas usa `center top / 1600px auto`, que é o certo para um artboard de
> largura fixa. No navegador, com largura variável, isso deixaria as laterais
> pretas — daí o `cover`.
