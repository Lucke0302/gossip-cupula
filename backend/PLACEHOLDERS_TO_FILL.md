# Placeholders a preencher antes de produção

Varredura feita em **09/09/2026** no backend (`backend/`). Tudo listado abaixo
precisa de valores **reais** antes de subir para produção. Nenhum valor desta
lista deve permanecer como está em ambiente produtivo.

> Observação de git: a pasta `backend/` **ainda não foi commitada** neste
> repositório. Ao fazer o primeiro commit, o `.gitignore` já estará ignorando
> `appsettings.Development.json`, `appsettings.Production.json`, `.env` e
> `secrets/`.

---

## Obrigatório substituir

### 1. `backend/appsettings.json` → `Jwt:Secret`
- **Valor atual:** `PLACEHOLDER_CHANGE_ME_secret_key_at_least_32_chars_0123456789`
- **O que fazer:** trocar por um segredo aleatório forte (mín. 32 caracteres).
  Sugestão de geração:
  ```bash
  # PowerShell
  -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
  ```
- **Alternativa recomendada (sem versonar):** usar variável de ambiente
  `Jwt__Secret` ou `dotnet user-secrets`. O `Program.cs` lança erro na
  inicialização se `Jwt:Secret` não existir.

### 2. `backend/appsettings.json` → `BotWebhookUrl`
- **Valor atual:** `https://webhook.example.com/bostossauro/xoxo`
- **O que fazer:** substituir pela **URL real do webhook do bot Bostossauro**.
  É o destino do POST `{"message":"xoxo"}` disparado a cada post criado
  (`PostService.NotifyBostossauroWebhook`).

### 3. `backend/appsettings.Development.json` → `Jwt:Secret`
- **Valor atual:** mesmo placeholder `PLACEHOLDER_CHANGE_ME_...` (duplicado do
  `appsettings.json`).
- **O que fazer:** definir um segredo de desenvolvimento próprio (pode ser
  diferente do de produção). O arquivo agora está no `.gitignore`, então é um
  local seguro para valores locais — ou use `dotnet user-secrets`.

---

## Revisar / decidir (valores atuais funcionam, mas são genéricos)

### 4. `backend/appsettings.json` → `Jwt:Issuer` e `Jwt:Audience`
- **Valores atuais:** `GossipCupula` e `GossipCupulaClients`.
- **O que fazer:** definir valores definitivos/estáveis (ex.: domínio do
  serviço). Devem ser **idênticos** aos usados na validação do `JwtBearer` e
  pelos clientes que consomem o token.

### 5. `backend/appsettings.json` → `Jwt:ExpirationInMinutes`
- **Valor atual:** `60`.
- **O que fazer:** confirmar a política de expiração desejada (o fallback no
  `AuthService` também é 60).

---

## ⚠️ Atenção — credencial real já presente no arquivo versionável

### `backend/appsettings.json` → `ConnectionStrings:DefaultConnection`
- **Valor atual:** connection string **real** do PostgreSQL no Aiven, contendo
  `Username=avnadmin` e `Password=AVNS_...`.
- **Situação:** não é um placeholder — é uma credencial válida já inserida em
  um arquivo que seria versionado.
- **Recomendação forte:**
  1. Mover a connection string para variável de ambiente
     `ConnectionStrings__DefaultConnection` ou `secrets/` / User Secrets;
  2. Manter o `appsettings.json` versionado **sem** a senha (ou removê-lo do
     controle de versão);
  3. **Rotacionar a senha no Aiven** se ela já foi exposta em commits/PRs.

---

## Como o projeto lê as configurações

O `Program.cs` usa o `builder.Configuration` padrão do ASP.NET Core. A ordem
de precedência (do maior para o menor) permite sobrescrever o appsettings por
ambiente:
1. Variáveis de ambiente (chave com `__`, ex.: `Jwt__Secret`);
2. User Secrets (somente em Development);
3. `appsettings.{Environment}.json` (ex.: `appsettings.Development.json`);
4. `appsettings.json`.

Ou seja: para produção, o caminho mais seguro é definir as variáveis de
ambiente correspondentes e **não** depender dos placeholders dos arquivos.

---

## Itens que NÃO são segredos (apenas dados de exemplo/teste)

| Arquivo | Detalhe |
|---------|---------|
| `backend/GossipCupula.Api.http` | Usuário/e-mail fictícios (`dan.humphrey@example.com`) usados nos exemplos de request — troque pelos seus dados ao testar |
| `backend/Properties/launchSettings.json` | Portas/URLs locais de desenvolvimento — sem segredos |
