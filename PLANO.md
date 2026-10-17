# Rivo Suite — Plano do front de produção

> v2 · 2026-10-13 · Estado: **aprovado** (2026-10-12), com as respostas em §10.
> F0 em curso; o que mudou na execução está em §11.
>
> Fontes lidas: `identidade/` (README, tokens, preset, guia), `api/API-FRONTEND.md`
> (577 rotas, regenerado a 2026-10-10), `MENSAGEM-FRONT-2026-10-11.md`,
> `BACKEND-INTEGRATION-FEEDBACK.md` e `…FEEDBACK2.md` (em `../Obsoleto/`), os ADR
> 013, 025, 032, 033, 035, 042, 043, 050, 058, 059, 065, 067, 068, 069, 070, 071,
> 073 e 074, e `api/.claude/docs/rivo-suite-descricao-modulos.md`. Confirmações no
> código do backend (`api/src`) e por `GET` contra `https://syyt.tech` estão
> assinaladas como **Verificado**.
>
> Convenção (a do backend): **Facto** (documento ou código), **Verificado**
> (testado hoje), **Inferência**, **Hipótese**, **Decisão em aberto**.

---

## 0. Estado real, hoje (2026-10-12)

| O quê | Resultado | Fonte |
|---|---|---|
| `GET https://syyt.tech/health` | `200 {"status":"ok","database":"up"}` | Verificado |
| `GET /openapi/v1.json` | `404` (interruptor `EXPOSE_OPENAPI` desligado) | Verificado |
| CORS | Só `https://rivo.noirdataintelligence.com`. Uma origem arbitrária não recebe `Access-Control-Allow-Origin` | Verificado |
| Cabeçalhos expostos ao JS | `WWW-Authenticate, X-Page, X-Page-Size, X-Total-Count`. **Não** `Retry-After` nem `Content-Disposition` | Verificado (resposta + `api/src/Rivo.Api/Cors/BrowserClientCors.cs:86`) |
| `401` | Corpo vazio, `WWW-Authenticate: Bearer error="invalid_token"`. O motivo (inactividade, expirada, revogada) **não chega ao cliente** | Verificado |
| `staging.syyt.tech` | Não resolve. O ADR-074 foi **rejeitado** a 2026-10-11 | Verificado + ADR-074 |
| Base de produção | Recriada a 2026-10-11: só contas de arranque, perfis, séries, IVA `NOR` 14 %, INSS/IRT, isenções e dados da empresa | MENSAGEM-FRONT §1 |
| Plano de contas | Por carregar, à espera do contabilista. Balanço e DR vêm a zero | MENSAGEM-FRONT §5 |
| IA | Ligada, fornecedor activo OpenAI, recurso a Anthropic | MENSAGEM-FRONT §4 |
| Leituras autenticadas | **Não feitas**: não houve credenciais nesta conversa | — |

**Contradição a resolver.** O pedido manda propor «activar o staging do ADR-074»,
mas esse ADR está **rejeitado**: o utilizador decidiu testar em `syyt.tech` e
limpar a base recriando-a. Fica como decisão D1 (§10), com alternativas.

---

## 1. Arquitectura

### 1.1 Stack (confirmada, com quatro ajustes justificados)

| Peça | Escolha | Nota |
|---|---|---|
| Linguagem / build | TypeScript `strict` (+ `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) · Vite · React | Versões estáveis do dia do arranque, **fixadas exactas** |
| Estilo | **Tailwind v3.4** com `identidade/tailwind.preset.ts` tal como está | O preset é v3. A v4 obrigava a reescrever o mapeamento em `@theme`, uma segunda fonte de verdade da IV |
| Componentes | Primitivas Radix + componentes shadcn **copiados para o repositório** e adaptados aos tokens | São código nosso, não uma dependência |
| Dados | TanStack Query v5 (cache só em memória) · **TanStack Table v8** (acrescentado: tabelas com paginação do servidor) | |
| Rotas | React Router (data router, `lazy` por rota) | |
| Formulários | react-hook-form + zod + `@hookform/resolvers` | |
| Cliente HTTP | `openapi-fetch` + tipos de `openapi-typescript` | Cliente tipado pelas rotas, com *middleware*. Ver §2 |
| Decimal | **`big.js`** (acrescentado, ~6 KB) | Dinheiro nunca em `number` (§2.6) |
| Gráficos | Recharts, carregado só nos *chunks* com dashboards | SVG, tooltips, cores por `hsl(var(--chart-n))`. Sem 3D nem gradientes |
| Ícones | Lucide (`strokeWidth={1.75}`) | |
| Fontes | `@fontsource-variable/inter` + `@fontsource/jetbrains-mono` (400/500) | Empacotadas pelo Vite, servidas do próprio domínio |
| HTML rico | DOMPurify, carregado só onde é preciso (base de conhecimento, respostas de IA) | |
| Testes | Vitest + Testing Library + MSW (**só em `devDependencies`**) · Playwright + `@axe-core/playwright` | |
| Tema | **Provider próprio** (cerca de 40 linhas) + `public/theme-init.js` externo, em vez de `next-themes` | O `next-themes` injecta um `<script>` inline para evitar o flash de tema, o que obriga a `unsafe-inline` na CSP. O README da IV sugere `next-themes`, e este desvio está justificado aqui |

Ficam de fora: bibliotecas de datas (usa-se `Intl`, e as datas da API são
`YYYY-MM-DD`), estado global (Redux, Zustand: o estado do servidor está no
Query e o resto é local), i18n (só pt-AO) e XLSX (decisão D11).

### 1.2 Estrutura de pastas

```
front/
├─ openapi/
│  ├─ v1.json              # exportado do backend; versionado; cabeçalho com data e commit do backend
│  └─ README.md            # como foi obtido (§2.1)
├─ public/
│  ├─ theme-init.js        # aplica .dark antes do 1.º paint (sem inline)
│  ├─ logo/…               # cópia de identidade/logo (SVG + favicons)
│  └─ fonts/ (via bundle)
├─ src/
│  ├─ app/                 # main.tsx, router.tsx, providers, error boundary global
│  ├─ shells/              # backoffice/, colaborador/, cliente/ (layout, menu, barra superior)
│  ├─ lib/
│  │  ├─ api/              # client.ts, schema.d.ts (GERADO), problem.ts, pagination.ts, download.ts
│  │  ├─ auth/             # session.ts (memória), idle.ts, permissions.ts, returnTo.ts, broadcast.ts
│  │  ├─ money/            # Big, parse/serialize, formatação
│  │  ├─ format/           # datas, números, percentagens, NIF/IBAN visual
│  │  ├─ validation/       # primitivas zod: texto normalizado, NIF, IBAN, IsoDate, Money, enums
│  │  └─ security/         # safeUrl, sanitize (DOMPurify lazy), csvEscape, filename
│  ├─ ui/                  # Button, Field, Badge(estado), Card, Kpi, ChartCard, DataTable, EmptyState,
│  │                       # Dialog, Drawer, Toast, Tabs, Skeleton, Masked, Can, PageHeader…
│  └─ features/
│     ├─ identity/ dashboard/ notifications/ alerts/ commercial/ invoicing/ approval/
│     ├─ treasury/ payables/ expenses/ ledger/ fiscal/ hr/ payroll/ procurement/
│     ├─ inventory/ assets/ documents/ messaging/ crm/ projects/ fleet/ analytics/ esg/ ai/ audit/
│     └─ <módulo>/{api.ts, keys.ts, schemas.ts, routes.tsx, pages/, components/}
├─ tests/
│  ├─ fixtures/            # dados de teste — SÓ aqui; tipados contra schema.d.ts
│  ├─ msw/                 # handlers de teste
│  ├─ e2e/leitura/         # smoke de produção (só GET; ver §8)
│  └─ e2e/escrita/         # só contra base local
├─ vercel.json
├─ .env.example            # VITE_API_URL=, VITE_GOOGLE_CLIENT_ID=  (sem valores secretos: não há)
└─ .env.local              # no .gitignore
```

### 1.3 Camadas e regras de dependência

```
pages (ecrãs) → features/<m>/components → ui/
      ↓                 ↓
features/<m>/api.ts (useQuery/useMutation, chaves) → lib/api/client.ts → fetch
      ↓
lib/validation (zod)  ·  lib/money  ·  lib/format  ·  lib/auth
```

- Um ecrã nunca chama `fetch` nem `client` directamente: usa os *hooks* de
  `features/<m>/api.ts`. É aí que vivem as chaves de cache e as invalidações.
- `ui/` não conhece a API nem permissões de domínio, só props.
- `lib/api/schema.d.ts` é **gerado** e nunca se edita à mão (há uma verificação
  no CI).
- Uma regra de lint (`import/no-restricted-paths`) impõe estas direcções. Uma
  feature não importa de outra, a não ser pelos tipos públicos em `index.ts`.

### 1.4 Estado

| Tipo | Onde |
|---|---|
| Dados do servidor | TanStack Query (memória). Sem `persistQueryClient` |
| Sessão (token, prazos, `me`) | Módulo `lib/auth/session.ts`: variável em memória e, se D3 o aprovar, `sessionStorage` só para o token |
| Filtros de listagem | Query string, **só ids, enums e datas** (nunca nomes, NIF ou e-mails, §7.6). A pesquisa por texto fica em estado local |
| Preferências não sensíveis | `localStorage` só para o tema e a barra lateral colapsada, através de um único módulo `prefs.ts` (a lint proíbe `localStorage` noutros sítios) |

### 1.5 Rotas e *code splitting*

- Um `routes.tsx` por feature, carregado com `lazy()`. Cada módulo é um *chunk*.
  O shell e o login ficam no *chunk* inicial (meta: menos de 150 KB gzip).
- Cada rota declara `meta: { title, requires, shell, fase }`. O menu **deriva**
  desta tabela, não há uma segunda lista.
- Rotas públicas, fora da guarda: `/entrar`, `/convite`, `/recuperar-password`,
  `/recuperar`. **Os caminhos `/convite?u=…&t=…` e `/recuperar?u=…&t=…` vêm do
  backend** (`InviteUser.cs:89`, `RecoverPassword.cs:77`) e não podem mudar sem
  coordenação.
- Prefixos por shell: backoffice em `/` (`/facturas`, `/clientes`…), portal do
  colaborador em `/eu/…`, portal do cliente em `/cliente/…`.
- *Error boundary* por rota, com «Recarregar» e o `traceId` quando existe.

---

## 2. Cliente HTTP — um único ponto de saída

`lib/api/client.ts` cria **uma** instância `openapi-fetch` com `baseUrl =
import.meta.env.VITE_API_URL` (a falta da variável no build de produção faz
falhar o build). Todo o tráfego passa por estes *middlewares*, por esta ordem:

| # | Middleware | Comportamento |
|---|---|---|
| 1 | Autenticação | Junta `Authorization: Bearer <token>` só se o URL começar por `VITE_API_URL`. Nunca envia o token para outra origem |
| 2 | Cancelamento e *timeout* | `AbortSignal.any([signalDoQuery, AbortSignal.timeout(t)])`. Leituras 20 s, escritas 30 s, *uploads* 120 s. O Query cancela ao desmontar ou quando a chave muda |
| 3 | `401` | Se não for `/identity/login*`, termina a sessão localmente (§7.1): limpa o token, `queryClient.clear()`, o estado e as outras abas (BroadcastChannel), e redirecciona para `/entrar?voltar=<caminho interno validado>` |
| 4 | Problem Details | Converte 4xx/5xx num `ApiError { status, title, detail, errors, traceId, raw }`. Aceita `application/problem+json` e JSON com `erro` (a forma antiga, que o ADR-073 normaliza) e corpo vazio (o `401`). Os sufixos técnicos já vêm limpos do servidor (ADR-073) |
| 5 | Paginação | Lê `X-Page`, `X-Page-Size`, `X-Total-Count` (expostos, verificado) e devolve `{ items, page, pageSize, total }`. O corpo é sempre um array |
| 6 | Métodos | `retry` **só em GET**, no máximo 2, com recuo exponencial e só para falhas de rede e 502/503/504. Nunca em 4xx. **Escritas nunca repetem**: duplicar um POST de factura é um documento fiscal a mais |

### 2.1 Tipos gerados do OpenAPI

- `npm run api:types` corre `openapi-typescript openapi/v1.json -o src/lib/api/schema.d.ts`.
- Como o OpenAPI está desligado em produção (Verificado: 404), o `v1.json`
  obtém-se **de uma de duas formas**, sem nunca escrever tipos à mão:
  1. **Recomendado:** subir a API localmente
     (`docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build`,
     com `EXPOSE_OPENAPI=true` no `.env` local) e fazer
     `curl http://localhost:5080/openapi/v1.json`. É o mesmo código que está em
     produção, se se usar o mesmo commit que o deploy publicou.
  2. Pedir ao backend o ficheiro exportado a cada release, com o commit.
- O `openapi/README.md` regista a data, o commit do backend e o comando usado.
  Um diff no `v1.json` é revisto como uma mudança de contrato.
- Onde o OpenAPI diverge do comportamento real (o feedback registou casos, como
  `BudgetLineView` e `DraftRequest`, corrigidos no ADR-073 com nomes únicos),
  vale o OpenAPI do commit actual. A divergência confirmada vai ao backend e não
  se remenda no front.

### 2.2 Erros → interface

| Código | Tratamento |
|---|---|
| `400` | `errors` mapeado para os campos (§4.6). O que não casa com nenhum campo vai para um alerta no topo do formulário |
| `401` | §7.1. Excepção: no login é «E-mail ou password incorrectos» |
| `403` | Painel «Não pode fazer isto» com o `detail` do servidor, que distingue a segregação de funções («quem submeteu não decide»), a falta de colaborador ligado (ADR-050) e o alvo SuperAdmin (ADR-070). Sem `detail`: «Não tem permissão para esta acção.» |
| `404` | «Não encontrado, ou não tem acesso.» A frase é neutra de propósito, porque o 404 pode querer dizer «não é seu» |
| `409` | Concorrência (ADR-035): recarrega, mostra o estado actual ao lado do que a pessoa escreveu e deixa-a decidir (§4.6). Regra de negócio (duplicado, estado inválido): mostra o `detail` |
| `415` / `413` | «Este tipo de ficheiro não é aceite» / «Ficheiro grande de mais», com a lista branca (§7.5) |
| `422` | IA: `title: "Dados insuficientes"` é um estado vazio informativo e mostra o `detail`. Outro `title`: «O assistente não pode responder a isto» |
| `429` | Contagem decrescente **se** `Retry-After` for legível. Hoje não é (falta expô-lo no CORS, lacuna B1). Até lá: «Limite de pedidos atingido. Tente dentro de alguns minutos», sem contagem inventada |
| `501` | A capacidade não está configurada (Google, IA, isenção): esconde ou desactiva a funcionalidade |
| `502` | IA: mostra o `detail` (o motivo do fornecedor) |
| `503` / rede | Faixa «Sem ligação ao servidor», com nova tentativa. Confirmação por `GET /health` |
| `5xx` | «Ocorreu um erro no servidor.» Se houver `traceId`: «Código para o suporte: …» |

### 2.3 Paginação (ADR-068)

- Sem `page`/`pageSize` a API devolve **tudo**. As listagens que crescem
  (facturas, lançamentos, movimentos, colaboradores, notificações…) pedem sempre
  `page` e `pageSize` (25 por omissão; 25, 50 e 100 à escolha; o tecto do
  servidor é 200).
- Muitas listagens **não aceitam paginação** (por exemplo `/hr/tickets`,
  `/commercial/opportunities`, `/finance/proformas`, `/finance/expenses`,
  `/identity/users`): a tabela pagina no cliente, com virtualização se passar de
  500 linhas. A lista completa está na lacuna B7.
- A ordenação e a pesquisa de texto **não existem do lado do servidor** (lacuna
  B6). Por isso, numa listagem paginada pelo servidor, ordenar uma coluna
  ordenaria só a página visível, o que engana. Nessas tabelas só se ordena pela
  ordem do servidor e só se filtra pelos parâmetros que cada rota aceita. A
  ordenação e a pesquisa livres ficam só nas listagens carregadas por inteiro.

### 2.4 Escritas

- `useMutation` com o botão bloqueado e `aria-busy` enquanto o pedido corre.
  Um segundo clique é ignorado.
- O sucesso invalida chaves explícitas (`keys.ts` por feature). Sem *optimistic
  updates* em nada que tenha efeito fiscal ou financeiro.
- `202` = **pendente de aprovação**. Tem estado próprio («Enviado para
  aprovação», ícone `warning`, ligação ao pedido) e nunca se mostra como
  sucesso.

### 2.5 Downloads

`download(path, nomeSugerido)`: um `fetch` com o token devolve um `Blob`, que
passa a `URL.createObjectURL`, é descarregado por um `<a download="nome">` e
revogado logo a seguir. Nunca há `iframe`, `window.open` nem `blob:` como
navegação. O nome do ficheiro **constrói-se localmente** (por exemplo
`FT 2026-17.pdf`) e é sanitizado, porque `Content-Disposition` não é legível
cross-origin (lacuna B2). Mesmo quando passar a ser, o nome do servidor também
é sanitizado.

### 2.6 Dinheiro e números

- **Facto:** a API serializa `decimal` como número JSON e recusa arredondamentos
  diferentes dos seus.
- **Regra:** um valor monetário converte-se para `Big` **na fronteira**
  (`new Big(String(n))`). Um `double` com até 15 algarismos significativos volta
  a texto exactamente (até 9 999 999 999 999,99 Kz), e o teste unitário que o
  prova é obrigatório. Nenhuma conta se faz em `number`.
- **Envio:** os valores sobem como texto decimal (`"1234.50"`). **Inferência**
  (confirmar com o backend): o ASP.NET Core Minimal API usa
  `JsonSerializerDefaults.Web`, que aceita números em texto. Se não aceitar, a
  alternativa é `JSON.rawJSON`, que põe o número literal exacto no corpo.
- O tipo `Money` (*branded*) impede passar um `number` onde se espera dinheiro.
- Os totais de linhas de factura mostrados no formulário são **pré-visualização**
  (com `Big` e o mesmo arredondamento declarado pelo backend). O valor que conta
  é o que o servidor devolve depois de emitir.

---

## 3. Modelo de permissões

### 3.1 De onde vem

- `GET /identity/me` → `{ userId, email, displayName, roles[], permissions[] }`
  (**Facto**, `CurrentUserResponse`). As **permissões** decidem o que aparece.
  O nome do perfil não decide nada, com uma excepção de mensagem: SuperAdmin.
- `GET /identity/roles` (`identity.roles.read`) só se usa nos ecrãs de
  administração de perfis (§5.1). O front não precisa dele para se orientar.
- `me` carrega-se depois do login e a cada arranque com token. Muda quando um
  perfil é retirado: o backend termina as sessões (ADR-070), e o `401` resolve.

### 3.2 Como vira interface

```ts
type Requisito = Perm | { anyOf: Perm[] } | { allOf: Perm[] } | "autenticado";
can(requisito): boolean
```

| Superfície | Regra |
|---|---|
| Rota | `meta.requires`. Sem permissão vê o ecrã «Não tem acesso a esta área», e nunca um ecrã vazio ou a rebentar |
| Menu | Gerado das rotas. Um item sem permissão **não aparece**. Um grupo sem itens visíveis desaparece |
| Botão de acção | **Escondido** sem permissão. **Desactivado com motivo** (tooltip e texto) quando a permissão existe mas o estado não deixa («Factura já anulada») |
| Dados mistos | Os KPIs de `/dashboard/kpis` vêm `null` por secção quando falta a permissão (ADR-069). O cartão não aparece, em vez de mostrar zero |
| Regras compostas | `GET /settings/overview` = `allOf[identity.roles.read, approval.policies.read]`. `GET /hr/announcements` = `anyOf[hr.employees.read, hr.announcements.write]` |

**O backend é sempre a autoridade.** Esconder um botão é uma questão de
ergonomia e não protege nada. Cada `403` continua tratado (§2.2), e os testes e2e
verificam que um ecrã sem permissão não chega a pedir os dados.

### 3.3 Os três shells

Depois do login, o shell decide-se assim:

1. `roles` inclui `Cliente` → **portal do cliente** (`/cliente`). Confirma com
   `GET /customer-portal/me`. Um `403`/`404` mostra «Esta conta não está
   associada a um cliente. Fale com a empresa.» e termina a sessão.
2. Senão, se tem pelo menos uma permissão de backoffice → **backoffice**. Se
   `GET /portal/me` responder 200, a barra superior mostra «O meu portal», que
   leva ao portal do colaborador.
3. Senão (perfil `Colaborador`, sem permissões) → **portal do colaborador**
   (`/eu`). Um `403` em `GET /portal/me` mostra «A sua conta ainda não está
   ligada a uma ficha de colaborador. Fale com os Recursos Humanos.»

Os portais **nunca enviam identificadores de pessoa**: as rotas `/portal/me/*`
e `/customer-portal/me/*` resolvem quem é pelo token (ADR-042/043/062), e o
cliente HTTP desses shells não expõe *hooks* com `employeeId` ou `customerId`.

### 3.4 Perfis → menu (resumo; a fonte é a tabela de permissões em `API-FRONTEND.md`)

| Perfil | Áreas visíveis por omissão |
|---|---|
| Admin (108) | Tudo, excepto a atribuição directa de cargo |
| SuperAdmin | Tudo + «Atribuir cargo directamente» (`hr.positions.assign_direct`). **Faixa fixa:** «Conta de operação. Use-a só para desbloquear configuração inicial.» (ADR-058/070) |
| Manager (24) | Dashboard executivo, aprovações, despesas (ler e aprovar), contas a pagar, pedidos de pagamento, planeamento, compras (requisições e encomendas), ESG, analytics, alertas, IA |
| Finance (32) | Facturação (ler e anular), recibos, tesouraria, pagamentos (executar), contabilidade, fiscal, despesas, activos, relatórios, cobranças, aprovações |
| HR (36) | RH completo, salários, documentos, alertas |
| Sales (16) | Clientes, facturação (emitir), recibos (ler), CRM, contratos, cobranças, mensagens, base de conhecimento, IA |
| AssetManager (11) | Activos, frota, inventário, recepções, fornecedores e encomendas em leitura |
| ProjectManager (2) | Projectos |
| Colaborador | Só o portal do colaborador |
| Cliente | Só o portal do cliente |

---

## 4. Implementação da identidade visual

### 4.1 Tema

- `src/index.css` importa `identidade/tokens.css` (copiado para `src/styles/`,
  com uma verificação no CI de que é **byte a byte** igual ao da `identidade/`).
  O `tailwind.config.ts` usa `presets: [rivo]`.
- **Nenhum hex nos componentes.** A verificação no CI é um `grep -E
  '#[0-9a-fA-F]{3,8}\b'` em `src/` (excepto `src/styles/tokens.css`) e regras
  de lint para `style={{ color: … }}` literal. As cores de gráfico passam por
  `hsl(var(--chart-1))`.
- Claro e escuro: `.dark` no `<html>`. Por omissão segue o sistema
  (`prefers-color-scheme`, com escuta de mudanças). Há uma alternância na barra
  superior (Sistema, Claro, Escuro) guardada em `prefs.ts`. `theme-init.js` corre
  antes do primeiro *paint* para não haver flash. O logótipo troca para
  `rivo-simbolo-escuro.svg`.
- Documentos fiscais pré-visualizados ficam sempre em fundo branco (IV §9). Mas
  ver §7.5: na Fase 3 não há pré-visualização embebida, só download.

### 4.2 Componentes base (`ui/`)

Button (`primary` um por zona, `secondary`, `ghost`, `destructive` só em
confirmação; 36 px, 32 px em tabelas, 40 px em `pointer: coarse`, alvo ≥ 44 px),
Field (rótulo por cima, ajuda e erro por baixo, `aria-describedby`; erro =
contorno `danger` + texto), StatusBadge (pílula `-soft` + ícone + texto, **um
mapa central estado → {tom, ícone, texto}** por domínio), Card (borda, 20 px,
16 px no telemóvel, sem sombra), Dialog/Menu (`popover` + `shadow-md`), Toast (4
s, em baixo à direita, em cima ao centro no telemóvel, `aria-live`), EmptyState
(símbolo mono a 10 %, uma frase, uma acção), Skeleton, PageHeader (título +
acção principal, fixa em baixo no telemóvel), Masked (§7.6), Money e DateText
(formatadores), `Can`.

### 4.3 Formatos (pt-AO), centralizados em `lib/format`

| Tipo | Implementação |
|---|---|
| Moeda | `Intl.NumberFormat("pt-AO", { style: "currency", currency })` → `1 234 567,89 Kz`. O sinal de menos passa a `−` (U+2212) via `formatToParts` |
| Outras moedas | Código ISO depois do valor (`12 500,00 USD`), com `currencyDisplay: "code"` e reordenação por `formatToParts` |
| Percentagem | `14 %`, `+3,2 %` (variação sempre com sinal; espaço fino antes de `%`, construído à mão porque o `Intl` não o garante) |
| Datas | A API manda `YYYY-MM-DD`, que **nunca** passa por `new Date("YYYY-MM-DD")` (UTC). Formata-se a partir dos componentes: `12/10/2026` em tabelas, `12 out 2026` em títulos (tabela própria de meses abreviados, porque o `Intl` dá «12 de out. de 2026») |
| Data-hora | `DateTimeOffset` mostrado em `Africa/Luanda` (decisão D15) |
| Tabular | `tabular-nums` já vem dos tokens. Valores alinhados à direita, com a moeda na mesma coluna |

Testes unitários fixam a saída exacta. O e2e corre-os em Chromium, Firefox e
WebKit, porque o ICU difere entre motores.

### 4.4 Layout responsivo

- Mobile first: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`.
- Menos de 768 px: barra lateral em **gaveta** (Radix Dialog, `☰`). Entre 768 e
  1023 px: **só ícones**, 64 px, com tooltip. 1024 px ou mais: **completa**, 240
  px, colapsável.
- Barra superior de 56 px: título, pesquisa (ver lacuna B10), tema, notificações
  e utilizador. O seletor de empresa não se aplica, porque a empresa é única
  (ADR-003).
- Conteúdo com máximo de 1440 px e padding de 16, 24 ou 32 px.
- **Nunca há scroll horizontal da página.** O e2e verifica
  `document.documentElement.scrollWidth <= innerWidth` em 360, 768 e 1280 px.
- No telemóvel, as tabelas viram lista de cartões quando têm até 4 colunas
  úteis, ou scroll horizontal **dentro** da tabela com a 1.ª coluna fixa
  (`position: sticky`).

### 4.5 Dashboards (IV §7)

`ChartCard` impõe as regras em vez de as deixar ao critério de quem escreve:

- O título é **obrigatório** e tem de ser uma conclusão. O texto é calculado
  dos dados por uma função testada («Receita acima da despesa desde Março»), e
  se não houver conclusão possível fica «Sem dados suficientes para comparar».
- `series` recebe um **slot** (`"receita" → chart-1`, `"despesa" → chart-2`…)
  de um mapa fixo por entidade. Não se escolhem cores livremente. Com mais de 5
  séries, o resto agrupa em «Outros» (`chart-neutral`).
- Linhas de 2 px, barras com raio de 4 px no topo, só grelha horizontal
  (`chart-grid`), sem eixo vertical, sem dois eixos Y, sem 3D e sem gradiente.
  Pizza só até 4 fatias, e acima disso o componente recusa e usa barras.
- Tooltip sempre, e o botão «Ver como tabela» alterna para `<table>` com os
  mesmos números, exportável em CSV (§7.5).
- Ordem fixa do ecrã: KPIs (no máximo 4 por linha, 8 no total) → tendência →
  detalhe → alertas/actividade.

### 4.6 Tabelas e formulários

- `DataTable`: cabeçalho `muted`, 13 px, linhas de 44 px (36 em modo compacto),
  sem zebra, 1.ª coluna fixa nos ecrãs estreitos, colunas secundárias escondidas
  em tablet, paginação do servidor (§2.3), filtros de acordo com cada rota,
  estado vazio real, *skeleton* enquanto carrega e erro com «Tentar de novo».
- Formulário: uma coluna até `md`, duas a partir de `lg`. Esquema zod partilhado
  (§7.3). Os erros do servidor entram por `setError` com o nome do campo
  convertido (`Lines[0].Quantity` → `lines.0.quantity`, sem distinguir
  maiúsculas). O foco vai para o primeiro erro.
- `409` de concorrência: os valores do formulário mantêm-se, o recurso relê-se e
  aparece um painel «Alguém alterou este registo entretanto» com as diferenças
  campo a campo e três opções: «Usar os meus valores» (reenvia), «Descartar os
  meus» e «Rever». **Limite real:** a API não recebe versão nem `If-Match`
  (lacuna B8). O `409` só aparece em colisões simultâneas; uma edição sobre dados
  velhos substitui sem aviso.

### 4.7 Acessibilidade (WCAG 2.2 AA)

Contraste já validado nos tokens. Foco visível (o token `ring`, sem
`outline: none`). Alvos ≥ 24 px (2.5.8) e ≥ 44 px em `coarse`. *Skip link*,
*landmarks* e `<h1>` por ecrã. Navegação por teclado em menus, diálogos e
tabelas (os padrões Radix). Erros anunciados (`aria-live`). Nada depende só da
cor. `prefers-reduced-motion` respeitado. Arrastar (kanban, Fases 11 e 12) tem
sempre uma alternativa por teclado ou menu (2.5.7). O `axe` corre em cada ecrã
no e2e, com zero violações *serious* ou *critical* como critério de aceitação.

### 4.8 Escrita

Botões com verbo («Emitir factura», «Aprovar pedido», «Convidar utilizador»).
Erros que dizem o que fazer. Sem pontos de exclamação nem emojis. Ortografia do
projecto (facturação, actividade, acção, projecto). Estados vazios com acção
(«Ainda não há facturas este mês», e o botão «Emitir factura» se `can`).

---

## 5. Mapa ecrã → endpoints → permissão

Todas as 577 rotas de `API-FRONTEND.md` estão aqui, cada uma num ecrã e numa
fase. **(F n)** = fase de entrega (§6). `JWT` = basta estar autenticado.
Nas rotas, `{id}` abrevia o nome do parâmetro no contrato.

### 5.1 Identidade, sessão e administração de acesso

| Ecrã | Endpoints | Permissão |
|---|---|---|
| Entrar `/entrar` (F0) | `POST /identity/login` · `POST /identity/login/google` | público |
| Aceitar convite `/convite?u&t` (F0) | `POST /identity/invitations/acceptance` | público |
| Recuperar password `/recuperar-password`, `/recuperar?u&t` (F0) | `POST /identity/password-recovery` · `POST /identity/password-recovery/completion` | público |
| Arranque e sessão (F0) | `GET /identity/me` · `POST /identity/logout` · `GET /health` (faixa «sem ligação») | JWT / público |
| A minha conta › Segurança (F0) | `POST /identity/me/password` · `GET /identity/me/sessions` · `POST /identity/me/sessions/{sessionId}/revocation` | JWT |
| Utilizadores (F1) | `GET /identity/users` · `POST /identity/invitations` · `POST /identity/users/{userId}/status` · `POST /identity/users/{userId}/password-reset` | `identity.users.read` / `.write` |
| Utilizador › Perfis (F1) | `GET /identity/roles` · `POST /identity/users/{userId}/roles` · `POST /identity/users/{userId}/roles/{profile}/removal` | `identity.roles.read` / `.assign` |
| Configurações › Governação (F1) | `GET /settings/overview` | `identity.roles.read` + `approval.policies.read` |
| Configurações › Dados da empresa (F1) | `GET /fiscal/tax-entity` · `PUT /fiscal/tax-entity` | `fiscal.tax_entity.read` / `.write` |
| Configurações › Correio (F1, **antecipado da F13**) | `POST /debug/email/test` | `identity.users.write` |

Notas: a reposição de password por um administrador (`password-reset`) põe a
password nas mãos de um terceiro, e o ADR-059/065 prefere a recuperação pelo
próprio. Fica atrás de uma confirmação explícita, e o caminho por omissão é
«Enviar ligação de recuperação», que o próprio usa em `/recuperar-password`.
O teste de correio passa para a F1 porque convidar depende de o SMTP funcionar
(ADR-059: sem SMTP, o convite fica na fila e não chega).

### 5.2 Núcleo organizacional (proposto para a F1; o resto do RH fica na F7)

| Ecrã | Endpoints | Permissão |
|---|---|---|
| Departamentos (F1) | `GET /hr/departments` · `POST /hr/departments` · `PUT /hr/departments/{departmentId}` | `hr.departments.read` / `.write` |
| Cargos (F1) | `GET /hr/positions` · `POST /hr/positions` · `PUT /hr/positions/{positionId}` · `GET /hr/positions/{positionId}/assignments` | `hr.positions.read` / `.write` |
| Colaboradores, lista e ficha (F1) | `GET /hr/employees` · `POST /hr/employees` · `GET /hr/employees/{employeeId}` · `PUT /hr/employees/{employeeId}` · `POST /hr/employees/{employeeId}/department` · `POST /hr/employees/{employeeId}/status` · `PUT /hr/employees/{employeeId}/contacts` | `hr.employees.read` / `.write` |
| Ficha › Conta de acesso (F1) | `POST /hr/employees/{employeeId}/account` · `DELETE /hr/employees/{employeeId}/account` · `GET /hr/employees/{employeeId}/account-history` | `hr.employees.link_account` |
| Ficha › Cargo (F1) | `POST /hr/employees/{employeeId}/positions` (201/202) · `POST /hr/employees/{employeeId}/positions/direct` · `POST /hr/position-assignments/{assignmentId}/approval-outcome` · `POST /hr/position-assignments/{assignmentId}/closure` | `hr.positions.assign` · `hr.positions.assign_direct` (só SuperAdmin) |

**Porque é que isto sobe para a F1 (dependência real):** decidir aprovações
exige que a conta esteja ligada a um colaborador (ADR-050, 403 sem vínculo) e
que esse colaborador ocupe um cargo com autoridade (BR-20). O primeiro cargo
aprovador só se atribui pela conta SuperAdmin (ADR-058). Sem isto, a F4 entrega
uma caixa de aprovações onde ninguém consegue decidir. Abrir uma folha salarial
também exige uma conta ligada a um colaborador (FEEDBACK2, Vaga F).

### 5.3 Dashboard, notificações e alertas (F2)

| Ecrã | Endpoints | Permissão |
|---|---|---|
| Dashboard executivo | `GET /dashboard/overview` (from, to, currency, topCustomers) | `dashboard.overview.read` |
| Painel pessoal (entrada de todos) | `GET /dashboard/me` · `GET /dashboard/kpis` | JWT (secções conforme permissões) |
| Notificações (sino + página) | `GET /notifications/me` · `POST /notifications/{notificationId}/read` · `POST /notifications/read-all` | JWT |
| A minha conta › Notificações | `GET /notifications/me/preferences` · `PUT /notifications/me/preferences` | JWT |
| Alertas › Eventos | `GET /alerts/events` · `POST /alerts/events/{alertId}/resolution` | `alerts.alerts.read` / `.write` |
| Alertas › Regras | `GET /alerts/rules` · `POST /alerts/rules` · `PUT /alerts/rules/{ruleId}` · `POST /alerts/evaluation` | `alerts.alerts.read` / `.write` |

Não há tempo real (lacuna B11): o sino actualiza-se por *polling* de 60 s, **só
com o documento visível e actividade do utilizador nos últimos 5 min**. Sem
esta condição, o *polling* manteria a sessão viva para sempre, porque cada pedido
autenticado desliza o prazo de inactividade (ADR-067) e anularia o requisito.

### 5.4 Clientes e facturação (F3)

| Ecrã | Endpoints | Permissão |
|---|---|---|
| Clientes, lista e ficha | `GET /commercial/customers` · `POST /commercial/customers` · `GET /commercial/customers/{customerId}` · `POST /commercial/customers/{customerId}/details` · `POST /commercial/customers/{customerId}/status` · `DELETE /commercial/customers/{customerId}` (409 se tiver história → oferece «Desactivar») · `POST /commercial/customers/{customerId}/owner` | `commercial.customers.read` / `.write` |
| Cliente › Contactos | `GET /commercial/customers/{customerId}/contacts` · `POST …/contacts` · `PUT /commercial/customers/{customerId}/contacts/{contactId}` · `DELETE /commercial/customers/{customerId}/contacts/{contactId}` | idem |
| Importar clientes (CSV) | `POST /settings/import/customers` | `commercial.customers.write` |
| Séries | `GET /finance/series` · `POST /finance/series` | `finance.invoices.read` / `finance.series.write` |
| Canais de pagamento | `GET /finance/payment-channels` · `POST /finance/payment-channels` · `PUT /finance/payment-channels/{channelId}` | `finance.invoices.read` / `finance.series.write` |
| Taxas fiscais (leitura) | `GET /fiscal/tax-rates` · `GET /fiscal/tax-rates/determination` | `fiscal.rates.read` |
| Rascunhos de factura | `GET /finance/invoice-drafts` · `POST /finance/invoice-drafts` · `GET /finance/invoice-drafts/{draftId}` · `PUT /finance/invoice-drafts/{draftId}` · `DELETE /finance/invoice-drafts/{draftId}` · `POST /finance/invoice-drafts/{draftId}/issue` | `finance.invoices.read` / `.write` |
| Facturas FT/FR/ND | `GET /finance/sales-invoices` · `POST /finance/sales-invoices` · `GET /finance/sales-invoices/{invoiceId}` · `GET …/{invoiceId}/balance` · `GET …/{invoiceId}/document` · `POST …/{invoiceId}/cancellation` · `POST …/{invoiceId}/delivery` | `.read` / `.write` / `finance.invoices.cancel` / `finance.documents.deliver` |
| Notas de crédito | `GET /finance/credit-notes` · `POST /finance/credit-notes` · `GET /finance/credit-notes/{creditNoteId}` · `GET …/{creditNoteId}/document` · `POST …/{creditNoteId}/cancellation` · `POST …/{creditNoteId}/delivery` | `finance.invoices.read` / `.cancel` / `finance.documents.deliver` |
| Pró-formas | `GET /finance/proformas` · `POST /finance/proformas` · `GET /finance/proformas/{proformaId}` · `POST …/{proformaId}/conversion` · `POST …/{proformaId}/cancellation` | `finance.invoices.read` / `.write` |
| Recibos | `GET /finance/receipts` · `POST /finance/receipts` · `GET /finance/receipts/{receiptId}` · `GET …/{receiptId}/document` · `POST …/{receiptId}/cancellation` · `POST …/{receiptId}/delivery` | `finance.receipts.read` / `.write` / `finance.invoices.cancel` / `finance.documents.deliver` |
| A receber (vencidas) | `GET /finance/receivables/overdue` | `finance.invoices.read` |

Regras próprias da F3: o código do IVA é **`NOR`** (nunca `IVA-GERAL`,
MENSAGEM-FRONT). Emitir e anular passam por um diálogo de confirmação que diz
«Este documento fica registado e não se apaga». A `delivery` **envia e-mail ao
cliente**: tem efeito externo e confirmação própria.

### 5.5 Aprovações (F4)

| Ecrã | Endpoints | Permissão |
|---|---|---|
| Caixa de aprovações | `GET /approval/requests` (processType, pendingFor, page, pageSize) · `GET /approval/requests/{requestId}` · `GET /approval/requests/{requestId}/history` | `approval.requests.read` |
| Decidir | `POST /approval/requests/{requestId}/decisions` `{ action, notes }`: o decisor vem do token (ADR-050) | `approval.requests.decide` |
| Cancelar pedido próprio | `POST /approval/requests/{requestId}/cancellation` | `approval.requests.read` |
| Políticas | `GET /approval/policies` · `POST /approval/policies` · `POST /approval/policies/{policyId}/deactivation` | `approval.policies.read` / `.write` |

Tipos de processo (**Facto**, `ApprovalContracts.cs`): `hr.position_assignment`,
`hr.leave_request`, `finance.payment_request`, `procurement.purchase_requisition`,
`payroll.payroll_run`. A ficha mostra o pedido de origem com uma ligação para o
ecrã do módulo. Um `403` de segregação mostra o `detail`. Um `409` ao decidir
recarrega e mostra «Outra pessoa decidiu primeiro: …».

### 5.6 Tesouraria, despesas e contas a pagar (F5)

| Ecrã | Endpoints | Permissão |
|---|---|---|
| Contas bancárias | `GET /finance/accounts` · `POST /finance/accounts` · `POST /finance/accounts/{accountId}/deposits` · `POST …/withdrawals` · `POST …/closure` · `POST …/reopening` · `GET /finance/accounts/{accountId}/statement` | `finance.payables.read` / `.write` |
| Reconciliação | `GET /finance/accounts/{accountId}/reconciliation` · `GET …/statement-lines` · `POST …/statement-imports` (`{ csv }`) · `POST …/reconciliation/auto` · `POST /finance/statement-lines/{lineId}/match` · `POST …/unmatch` · `POST …/ignore` | `finance.treasury.read` / `.write` |
| Câmbios | `GET /finance/exchange-rates` · `POST /finance/exchange-rates` · `GET /finance/exchange-rates/conversion` | `finance.treasury.read` / `.write` |
| Caixa pequena | `GET /finance/petty-cash` · `POST /finance/petty-cash` · `PUT /finance/petty-cash/{fundId}` · `GET /finance/petty-cash/{fundId}/movements` · `POST …/movements` | `finance.treasury.read` / `.write` |
| Letras e livranças | `GET /finance/bills` · `POST /finance/bills` · `GET /finance/bills/{billId}` · `POST /finance/bills/{billId}/{action}` | `finance.treasury.read` / `.write` |
| Fluxo de caixa | `GET /finance/cash-flow/actual` · `GET /finance/cash-flow/forecast` · `GET /finance/cash-flow/items` · `POST /finance/cash-flow/items` · `PUT /finance/cash-flow/items/{itemId}` · `DELETE /finance/cash-flow/items/{itemId}` | `finance.reports.read` / `finance.treasury.read`/`.write` |
| Fornecedores | `GET /procurement/suppliers` · `POST /procurement/suppliers` · `GET /procurement/suppliers/{supplierId}` · `POST …/{supplierId}/details` · `POST …/{supplierId}/status` · `POST /settings/import/suppliers` | `procurement.suppliers.read` / `.write` |
| Facturas de compra | `GET /finance/purchase-invoices` · `POST /finance/purchase-invoices` · `GET /finance/purchase-invoices/{purchaseInvoiceId}` · `GET …/match` · `POST …/cancellation` | `finance.payables.read` / `.write` / `finance.invoices.cancel` |
| Pedidos de pagamento | `GET /finance/payment-requests` · `POST /finance/payment-requests` (202) · `GET /finance/payment-requests/{paymentRequestId}` · `POST …/cancellation` · `POST …/execution` · `GET …/documents` · `POST …/documents` | `finance.payables.read` / `finance.payments.request` / `finance.payments.execute` |
| Despesas | `GET /finance/expenses` · `POST /finance/expenses` · `GET /finance/expenses/summary` · `GET /finance/expenses/{expenseId}` · `POST …/approval` · `POST …/rejection` · `POST …/reimbursement` | `finance.expenses.read` / `.write` / `.approve` |
| Componente de *upload* (partilhado, **antecipado da F10**) | `POST /documents` | `documents.write` |

O pedido e a execução de pagamento estão separados em ecrãs e permissões
diferentes. Nenhum perfil, além do Admin, tem as duas. **Lacuna B12:** o
perfil Finance e o Manager não têm `documents.write`, e o Colaborador não tem
nenhuma permissão. Ninguém além do Admin e do HR consegue carregar o
comprovativo de uma despesa ou o anexo de um pedido de pagamento. Tem de se
resolver no backend antes da F5.

### 5.7 Fiscal e contabilidade (F6)

| Ecrã | Endpoints | Permissão |
|---|---|---|
| Taxas de imposto (gestão) | `POST /fiscal/tax-rates` · `POST /fiscal/tax-rates/{scheduleId}/versions` · `POST /fiscal/tax-rates/{scheduleId}/versions/{versionId}/closure` | `fiscal.rates.write` |
| Tabela de IRT | `GET /fiscal/income-tax-schedule` (404 = «ainda não há tabela», estado vazio) · `POST /fiscal/income-tax-schedule/versions` · `POST …/versions/{versionId}/closure` · `GET /fiscal/income-tax-schedule/determination` | `fiscal.rates.read` / `.write` |
| Isenções de subsídio | `GET /fiscal/subsidy-exemptions` · `POST /fiscal/subsidy-exemptions/versions` · `POST …/versions/{versionId}/closure` · `GET /fiscal/subsidy-exemptions/determination` | `fiscal.rates.read` / `.write` |
| Plano de contas | `GET /finance/ledger/accounts` · `POST /finance/ledger/accounts` · `POST /finance/ledger/accounts/{accountId}/deactivation` · `GET /finance/ledger/chart-versions` · `POST /finance/ledger/chart-versions` | `finance.ledger.read` / `.write` / `.close` |
| Diários e lançamentos | `GET /finance/ledger/journals` · `POST /finance/ledger/journals` · `GET /finance/ledger/entries` · `POST /finance/ledger/entries` · `GET /finance/ledger/entries/{entryId}` · `POST …/{entryId}/void` | `finance.ledger.read` / `.write` |
| Períodos | `GET /finance/ledger/periods` · `POST /finance/ledger/periods` · `POST /finance/ledger/periods/{fiscalYear}/{number}/closure` · `POST …/reopening` | `finance.ledger.read` / `.write` / `.close` |
| Regras contabilísticas | `GET /finance/ledger/posting-rules` · `POST …` · `POST /finance/ledger/posting-rules/{ruleId}/deactivation` · `GET /finance/ledger/accounting-rules` · `POST …` · `POST /finance/ledger/accounting-rules/{ruleId}/deactivation` · `GET /finance/ledger/reporting-rules` · `POST …` · `PUT /finance/ledger/reporting-rules/{ruleId}` · `DELETE /finance/ledger/reporting-rules/{ruleId}` | `finance.ledger.read` / `.write` / `.close` |
| Relatórios | `GET /finance/ledger/trial-balance` · `GET /finance/reports/balance-sheet` (mostra `unmapped` e `difference`) · `GET /finance/reports/income-statement` · `GET /finance/receivables/aging` · `GET /finance/payables/aging` | `finance.ledger.read` / `finance.reports.read` |
| Resumos fiscais | `GET /finance/tax-summaries/vat` (com a nota «não é a declaração oficial») · `GET /finance/tax-summaries/withholdings` | `finance.reports.read` |
| Centros de custo e orçamentos | `GET /finance/planning/cost-centres` · `POST …` · `GET /finance/planning/budgets` · `POST …` · `POST /finance/planning/budgets/{budgetId}/revision` · `POST …/approval` · `GET /finance/planning/cost-forecasts` · `POST …` | `finance.planning.read` / `.write` / `finance.budgets.approve` |

**Lacuna B5 (bloqueia parte do âmbito decidido):** não há nenhuma rota de
**exportação SAF-T AO** nem de **declarações AGT** (**Verificado**: nenhuma em
`API-FRONTEND.md` e nenhum endpoint em `api/src`). A F6 entrega relatórios,
contabilidade e configuração fiscal. SAF-T e AGT ficam à espera do backend.

### 5.8 RH e portal do colaborador (F7)

| Ecrã | Endpoints | Permissão |
|---|---|---|
| Ficha › Dados pessoais (mascarados, §7.6) | `GET /hr/employees/{employeeId}/personal-data` · `PUT …/personal-data` | `hr.personal_data.read` / `.write` |
| Ficha › Imigração + lista de validades | `GET /hr/immigration` · `GET /hr/employees/{employeeId}/immigration` · `PUT …/immigration` | `hr.personal_data.read` / `.write` |
| Ficha › Documentos | `GET /hr/employees/{employeeId}/documents` · `POST …/documents` · `POST /hr/employees/{employeeId}/documents/{documentId}/removal` | `hr.employees.read` / `.write` |
| Organograma | `GET /hr/org-chart` | `hr.employees.read` |
| Contratos de trabalho | `GET /hr/contracts` · `POST /hr/contracts` · `POST /hr/contracts/{contractId}/termination` | `hr.contracts.read` / `.write` |
| Assiduidade | `GET /hr/attendance` · `POST /hr/attendance/clock` · `POST /hr/attendance/absences` | `hr.attendance.read` / `.write` |
| Férias e ausências | `GET /hr/leave` · `POST /hr/leave` (202) · `POST /hr/leave/{leaveId}/cancellation` · `POST /hr/leave/{leaveId}/approval-outcome` · `GET /hr/leave/balances` · `PUT /hr/employees/{employeeId}/leave-entitlements/{year}/{type}` | `hr.leave.read` / `.write` |
| Benefícios | `GET /hr/benefits` · `POST /hr/benefits` · `GET /hr/benefits/enrolments` · `POST /hr/benefits/enrolments` · `POST /hr/benefits/enrolments/{enrolmentId}/cancellation` | `hr.benefits.read` / `.write` |
| Recrutamento | `GET /hr/recruitment/openings` · `POST …` · `POST /hr/recruitment/openings/{openingId}/closure` · `GET /hr/recruitment/candidates` · `POST /hr/recruitment/openings/{openingId}/candidates` · `POST /hr/recruitment/candidates/{candidateId}/stage` · `POST …/hire` | `hr.recruitment.read` / `.write` · `hr.employees.write` (contratar) |
| Admissões e saídas | `GET /hr/lifecycle` · `POST /hr/lifecycle` · `POST /hr/lifecycle/{processId}/tasks/{taskId}/completion` · `POST /hr/lifecycle/{processId}/completion` | `hr.lifecycle.read` / `.write` |
| Anúncios | `GET /hr/announcements` · `POST /hr/announcements` · `GET /hr/announcements/manage` · `PUT /hr/announcements/{announcementId}` · `POST …/archive` | `hr.employees.read` ou `hr.announcements.write` |
| Pedidos internos | `GET /hr/tickets` · `POST /hr/tickets` · `GET /hr/tickets/{ticketId}` · `POST …/messages` · `POST …/assignment` · `POST …/status` · `GET /hr/tickets/sla-policies` · `PUT /hr/tickets/sla-policies/{category}` | `hr.tickets.read` / `.write` |
| Formação | `GET /hr/training/courses` · `POST …` · `PUT /hr/training/courses/{courseId}` · `POST …/cancellation` · `GET /hr/training/enrolments` · `POST /hr/training/courses/{courseId}/enrolments` · `POST /hr/training/enrolments/{enrolmentId}/completion` · `POST …/cancellation` | `hr.training.read` / `.write` |
| Turnos | `GET /hr/shifts/types` · `POST …` · `PUT /hr/shifts/types/{shiftTypeId}` · `GET /hr/shifts/roster` · `POST /hr/shifts/roster` (avisa das substituições pelo `days[]`) · `DELETE /hr/shifts/roster/{assignmentId}` · `GET /hr/shifts/change-requests` · `POST /hr/shifts/change-requests/{requestId}/decision` | `hr.shifts.read` / `.write` |
| Declarações | `GET /hr/declaration-templates` · `POST …` · `PUT /hr/declaration-templates/{templateId}` · `GET /hr/employees/{employeeId}/declarations/{templateId}` (**emite e regista**) · `GET /hr/declarations` · `GET /hr/declarations/verification/{code}` | `hr.declarations.write` · `hr.employees.read` |
| Desempenho | `GET /hr/performance/cycles` · `POST …` · `PUT /hr/performance/cycles/{cycleId}` · `POST …/activation` · `POST …/closure` · `GET /hr/performance/objectives` · `POST …` · `PUT /hr/performance/objectives/{objectiveId}` · `POST …/key-results` · `POST /hr/performance/key-results/{keyResultId}/progress` | `hr.performance.read` / `.write` |
| Conquistas | `GET /hr/achievements` · `POST …` · `PUT /hr/achievements/{achievementId}` · `GET /hr/achievements/leaderboard` · `GET /hr/employees/{employeeId}/achievements` · `POST …/achievements` | `hr.employees.read` / `hr.achievements.write` |
| Importar colaboradores | `POST /settings/import/employees` | `hr.employees.write` |
| **Portal do colaborador** `/eu` | `GET /portal/me` · `GET /portal/me/attendance` · `POST /portal/me/attendance/justification` · `GET /portal/me/leave` · `POST /portal/me/leave` (202) · `GET /portal/me/leave/balances` · `GET /portal/me/documents` · `GET /portal/me/payslips` · `GET /portal/me/announcements` · `GET /portal/me/tickets` · `POST /portal/me/tickets` · `POST /portal/me/tickets/{ticketId}/messages` · `GET /portal/me/training` · `GET /portal/me/shifts` · `POST /portal/me/shifts/{assignmentId}/change-requests` · `GET /portal/me/shift-change-requests` · `POST /portal/me/shift-change-requests/{requestId}/cancellation` · `GET /portal/me/declarations` · `GET /portal/me/declarations/{templateId}` (**emite e regista**) · `GET /portal/me/objectives` · `POST /portal/me/objectives/key-results/{keyResultId}/progress` · `GET /portal/me/achievements` · `GET /portal/me/expenses` · `POST /portal/me/expenses` · `POST /portal/me/expenses/{expenseId}/withdrawal` · `GET /portal/me/assets` | JWT (o próprio, pelo token) |

**Lacuna B13:** o colaborador vê a lista de recibos (`/portal/me/payslips`) e
de documentos (`/portal/me/documents`), mas não há rota de download que ele
possa usar. `GET /documents/{id}` exige `documents.read`, e `/documents/me` só
serve o que a própria conta carregou. Tem de se confirmar se a resposta traz o
conteúdo ou se falta uma rota `GET /portal/me/documents/{id}`.

### 5.9 Salários (F8)

| Ecrã | Endpoints | Permissão |
|---|---|---|
| Processamentos | `GET /payroll/runs` · `POST /payroll/runs` (conta tem de estar ligada a colaborador) · `GET /payroll/runs/{runId}` · `POST /payroll/runs/{runId}/items` · `POST /payroll/runs/{runId}/submission` · `POST /payroll/runs/{runId}/decision` | `payroll.runs.read` / `.write` |
| Recibo › Anexos | `GET /payroll/runs/{runId}/items/{itemId}/documents` · `POST …/documents` | `payroll.runs.read` / `.write` |

O IRT e o INSS calculam-se no servidor. O front não calcula impostos. **Antes de
publicar, confirmar o parecer fiscal do ADR-049.**

### 5.10 Compras, inventário e activos (F9)

| Ecrã | Endpoints | Permissão |
|---|---|---|
| Requisições | `GET /procurement/requisitions` · `POST …` · `GET /procurement/requisitions/{requisitionId}` · `POST …/submission` (202) · `POST …/approval-outcome` · `POST …/cancellation` | `procurement.requisitions.read` / `.write` |
| Encomendas | `GET /procurement/orders` · `GET /procurement/orders/{purchaseOrderId}` · `POST /procurement/requisitions/{requisitionId}/orders` · `POST /procurement/orders/{purchaseOrderId}/cancellation` | `procurement.orders.read` / `.write` |
| Recepções | `GET /procurement/receipts` · `GET /procurement/receipts/{goodsReceiptId}` · `POST /procurement/orders/{purchaseOrderId}/receipts` · `POST /procurement/receipts/{goodsReceiptId}/cancellation` | `procurement.receipts.read` / `.write` |
| Artigos e stock | `GET /inventory/items` · `POST …` · `GET /inventory/items/{itemId}` · `POST …/status` · `POST /inventory/items/{itemId}/movements/receipts` · `POST …/issues` · `POST …/adjustments` · `POST …/transfers` | `inventory.items.read` / `.write` |
| Armazéns | `GET /inventory/warehouses` · `POST …` · `GET /inventory/warehouses/{warehouseId}` · `POST …/status` | idem |
| Contagens | `GET /inventory/counts` · `POST …` · `GET /inventory/counts/{countId}` · `POST …/lines` · `POST …/close` · `POST …/decision` · `POST …/cancellation` | idem |
| Valorização | `GET /inventory/valuation` (exige from e to) | `inventory.items.read` |
| Activos fixos | `GET /finance/assets` · `POST /finance/assets` · `GET /finance/assets/{assetId}` · `PUT /finance/assets/{assetId}` · `POST /finance/assets/depreciation-runs` · `POST /finance/assets/{assetId}/disposal` | `finance.assets.read` / `.write` |
| Activos › Manutenção | `GET /finance/assets/maintenance` · `POST /finance/assets/{assetId}/maintenance` · `POST /finance/assets/maintenance/{maintenanceId}/completion` · `POST …/cancellation` | idem |
| Activos › Custódia | `GET /finance/assets/custody` · `POST /finance/assets/{assetId}/custody` · `POST /finance/assets/custody/{custodyId}/return` | idem |
| Activos › Seguros | `GET /finance/assets/insurance` · `POST /finance/assets/{assetId}/insurance` · `PUT /finance/assets/insurance/{policyId}` · `POST …/cancellation` | idem |

### 5.11 Portal do cliente, documentos e mensagens (F10)

| Ecrã | Endpoints | Permissão |
|---|---|---|
| Cliente › Conta do portal | `POST /commercial/customers/{customerId}/account` · `DELETE …/account` · `GET /commercial/customers/{customerId}/account-history` | `commercial.customers.write` / `.read` |
| Cliente › Documentos partilhados | `GET /commercial/customers/{customerId}/shared-documents` · `POST …` · `POST /commercial/customers/{customerId}/shared-documents/{shareId}/revocation` | `commercial.customers.read` / `.write` |
| Comprovativos de pagamento | `GET /finance/payment-claims` · `POST /finance/payment-claims/{claimId}/confirmation` · `POST …/rejection` | `finance.receipts.read` / `.write` |
| Gestão documental | `GET /documents` · `GET /documents/{documentId}` · `GET /documents/{documentId}/metadata` | `documents.read` |
| Conversas e tickets (equipa) | `GET /messaging/conversations` · `GET /messaging/conversations/{conversationId}` · `POST …/messages` · `POST …/closure` | `messaging.conversations.read` / `.write` |
| Base de conhecimento (gestão) | `GET /messaging/knowledge-base` · `POST …` · `GET /messaging/knowledge-base/{articleId}` · `PUT …` · `POST …/publication` · `POST …/archive` | `messaging.conversations.read` / `messaging.knowledge_base.write` |
| **Portal do cliente** `/cliente` | `GET /customer-portal/me` · `GET /customer-portal/me/statement` · `GET /customer-portal/me/payment-claims` · `POST /customer-portal/me/payment-claims` · `GET /customer-portal/me/messages` · `POST /customer-portal/me/messages` · `GET /customer-portal/me/tickets` · `POST /customer-portal/me/tickets` · `POST /customer-portal/me/tickets/{conversationId}/messages` · `POST /customer-portal/me/tickets/{conversationId}/rating` · `GET /customer-portal/me/documents` · `GET /customer-portal/me/documents/{shareId}/content` · `GET /customer-portal/me/knowledge-base` · `GET /customer-portal/me/knowledge-base/{idOrSlug}` · `POST /customer-portal/me/knowledge-base/{articleId}/feedback` · `GET /documents/me` · `GET /documents/me/{documentId}` · `POST /documents` (comprovativo; 10 MB, 20/24 h) | JWT (o cliente, pelo token) |

### 5.12 Comercial avançado (F11)

| Ecrã | Endpoints | Permissão |
|---|---|---|
| Leads | `GET /commercial/leads` · `POST …` · `GET /commercial/leads/{leadId}` · `PUT …` · `POST …/status` · `POST …/disqualification` · `POST …/conversion` | `commercial.crm.read` / `.write` |
| Oportunidades e pipeline | `GET /commercial/opportunities` · `POST …` · `GET /commercial/opportunities/board` · `GET /commercial/opportunities/{opportunityId}` · `PUT …` · `POST …/stage` · `POST …/won` · `POST …/lost` · `GET …/history` | idem |
| Actividades | `GET /commercial/activities` · `POST …` · `POST /commercial/activities/{activityId}/completion` | idem |
| Tipos de serviço | `GET /commercial/service-types` · `POST …` · `PUT /commercial/service-types/{serviceTypeId}` | idem |
| Propostas | `GET /commercial/proposal-templates` · `POST …` · `PUT /commercial/proposal-templates/{templateId}` · `GET /commercial/proposals` · `POST …` · `GET /commercial/proposals/{proposalId}` · `PUT …` · `GET …/document` · `POST …/lines` · `DELETE /commercial/proposals/{proposalId}/lines/{lineId}` · `POST …/sending` · `POST …/acceptance` · `POST …/rejection` · `GET …/versions` | idem |
| Contratos | `GET /commercial/contracts` · `POST …` · `GET /commercial/contracts/{contractId}` · `PUT …` · `POST …/activation` · `POST …/suspension` · `POST …/renewal` · `POST …/termination` · `GET …/documents` · `POST …/documents` · `GET …/amendments` · `POST …/amendments` | `commercial.contracts.read` / `.write` |
| Cobranças | `GET /commercial/collections/actions` · `POST /commercial/collections/actions` (com `GET /finance/receivables/overdue`, F3) | `commercial.collections.read` / `.write` |
| Relatório comercial | `GET /commercial/crm/report` | `commercial.crm.read` |

### 5.13 Projectos e frota (F12)

| Ecrã | Endpoints | Permissão |
|---|---|---|
| Projectos | `GET /projects` · `POST /projects` · `GET /projects/{projectId}` · `POST …/closure` · `POST …/budget` | `projects.projects.read` / `.write` |
| Marcos | `POST /projects/{projectId}/milestones` · `POST …/milestones/{milestoneId}/reached` · `GET /projects/{projectId}/milestones/comments` · `POST /projects/{projectId}/milestones/{milestoneId}/comments` | idem |
| Tarefas e quadro | `POST /projects/{projectId}/tasks` · `PUT /projects/{projectId}/tasks/{taskId}` · `POST …/assignment` · `POST …/completion` · `POST …/cancellation` · `GET /projects/{projectId}/board` · `POST /projects/{projectId}/tasks/{taskId}/move` | idem |
| Tarefa › Comentários e checklist | `GET /projects/{projectId}/comments` · `POST …/tasks/{taskId}/comments` · `GET /projects/{projectId}/tasks/{taskId}/checklist` · `POST …/checklist` · `POST /projects/{projectId}/checklist/{itemId}/toggle` · `DELETE /projects/{projectId}/checklist/{itemId}` | idem |
| Gantt e dependências | `GET /projects/{projectId}/gantt` · `GET /projects/{projectId}/dependencies` · `POST /projects/{projectId}/tasks/{taskId}/dependencies` · `DELETE /projects/{projectId}/dependencies/{dependencyId}` | idem |
| Recursos e tempo | `POST /projects/{projectId}/allocations` · `POST …/allocations/{allocationId}/end` · `GET /projects/time-entries` · `POST /projects/{projectId}/time-entries` · `DELETE /projects/{projectId}/time-entries/{entryId}` | idem |
| Orçamento do projecto | `GET /projects/{projectId}/budget/lines` · `POST …` · `PUT /projects/{projectId}/budget/lines/{lineId}` · `DELETE …/{lineId}` | idem |
| Ficheiros | `GET /projects/{projectId}/files` · `POST …/files` · `POST /projects/{projectId}/files/{fileId}/removal` | idem |
| Visibilidade ao cliente | `GET /projects/{projectId}/customer-visibility` · `PUT …` | idem |
| Portal do cliente › Projectos (**movido da F10 para a F12**) | `GET /customer-portal/me/projects` · `GET /customer-portal/me/projects/{projectId}` · `POST /customer-portal/me/projects/{projectId}/milestones/{milestoneId}/comments` | JWT (cliente) |
| Viaturas | `GET /fleet/vehicles` · `POST …` · `GET /fleet/vehicles/{vehicleId}` · `POST …/deactivation` | `fleet.vehicles.read` / `.write` |
| Viatura › Manutenção | `POST /fleet/vehicles/{vehicleId}/maintenance` · `POST …/maintenance/{maintenanceId}/closure` · `POST …/maintenance-plans` · `POST …/maintenance-plans/{planId}/cycles` · `POST …/maintenance-plans/{planId}/cancellation` · `GET /fleet/maintenance-plans/due` | idem |
| Viatura › Atribuições, viagens e custos | `POST /fleet/vehicles/{vehicleId}/assignments` · `POST …/assignments/{assignmentId}/closure` · `POST …/trips` · `POST …/expenses` | idem |
| Viatura › Documentos | `GET /fleet/vehicles/{vehicleId}/documents` · `POST …/documents` · `POST /fleet/vehicles/{vehicleId}/documents/{documentId}/removal` | idem |
| Seguros de frota | `GET /fleet/insurance` · `POST /fleet/vehicles/{vehicleId}/insurance` · `PUT /fleet/insurance/{policyId}` · `POST …/cancellation` · `GET …/claims` · `POST …/claims` · `POST /fleet/insurance/{policyId}/claims/{claimId}/settlement` · `POST …/rejection` | idem |

A visibilidade de projectos ao cliente só tem conteúdo depois de existir
`PUT /projects/{id}/customer-visibility`. Por isso a parte do portal do cliente
que lista projectos sai com a F12, e não com a F10.

### 5.14 Complementar (F13)

| Ecrã | Endpoints | Permissão |
|---|---|---|
| Analytics | `GET /analytics/overview` · `GET /analytics/hr` · `GET /analytics/sales` | `analytics.overview.read` |
| ESG | `GET /esg/indicators` · `POST …` · `PUT /esg/indicators/{indicatorId}` · `GET /esg/measurements` · `POST /esg/indicators/{indicatorId}/measurements` · `GET /esg/initiatives` · `POST …` · `PUT /esg/initiatives/{initiativeId}` · `POST …/completion` · `POST …/cancellation` · `GET /esg/report` | `esg.esg.read` / `.write` |
| IA (estado e fornecedor) | `GET /ai/status` · `GET /ai/provider` · `PUT /ai/provider` | JWT · `ai.provider.manage` |
| IA (funcionalidades, sempre por botão) | `POST /ai/insights` · `POST /ai/forecasts/revenue` · `POST /ai/drafts` · `POST /ai/invoice-extraction` (pré-preenche a factura de compra) · `POST /ai/customer-assistant` (portal do cliente) | `ai.assistant.use` · `finance.payables.write` · JWT |
| Auditoria (consulta) | `GET /audit/entries` (entityType, entityId, limit) | `audit.trail.read` |

### 5.15 Rotas `GET` com efeito (tratadas como escrita nos testes)

- `GET /hr/employees/{employeeId}/declarations/{templateId}` e
  `GET /portal/me/declarations/{templateId}`: **emitem** a declaração e registam-na
  com um código de verificação (ADR-071, `IssuedDeclaration`).
- Hipótese a confirmar: `GET …/document` dos documentos fiscais pode gerar e
  guardar o ficheiro na primeira leitura (ADR-066). Até haver confirmação, também
  só se chamam com autorização.

### 5.16 Lacunas do backend (dados de que um ecrã precisa e que nenhuma rota dá)

| # | Lacuna | Impacto | Pedido |
|---|---|---|---|
| B1 | `Retry-After` não está exposto no CORS (**Verificado**) | O `429` não pode ter contagem decrescente | Acrescentar `Retry-After` a `WithExposedHeaders` |
| B2 | `Content-Disposition` não está exposto (**Verificado**) | O nome do ficheiro tem de ser inventado no cliente | Acrescentar `Content-Disposition` |
| B3 | O `401` não diz o motivo (**Verificado**: só `error="invalid_token"`) | Sem «terminou por inactividade» vindo do servidor; o front infere-o pelo próprio relógio | Pôr o motivo em `error_description` ou num Problem Details |
| B4 | OpenAPI desligado em produção | Os tipos têm de vir de uma API local ou de um ficheiro exportado | Exportar o `v1.json` a cada release, ou aceitar a via local (§2.1) |
| B5 | Sem SAF-T AO nem declarações AGT (**Verificado**) | A F6 fica sem essa parte | Rotas de exportação e de declaração |
| B6 | Sem ordenação nem pesquisa por texto no servidor | Não se encontra um cliente por nome ou NIF numa lista paginada | `q` (nome, NIF, número) e `sort` nas listagens principais |
| B7 | Listagens sem paginação: `/identity/users`, `/hr/tickets`, `/hr/announcements*`, `/hr/training/*`, `/hr/shifts/*`, `/hr/performance/*`, `/commercial/opportunities`, `/commercial/activities`, `/commercial/proposals`, `/commercial/contracts`, `/finance/proformas`, `/finance/expenses`, `/finance/assets*`, `/finance/bills`, `/finance/petty-cash*`, `/alerts/*`, `/esg/*`, `/messaging/knowledge-base`, `/projects/time-entries` | Crescem sem tecto | ADR-068 nas que crescem |
| B8 | Sem versão nem `If-Match` nas edições | Uma edição sobre dados velhos substitui sem aviso | Aceitar `version` (ou `If-Match`) nos `PUT` e em `…/details` |
| B9 | Sem `GET /identity/users/{id}`, sem paginação nem filtro em `/identity/users` | A ficha de utilizador depende da lista inteira | Rota de detalhe + filtros |
| B10 | Sem pesquisa global | A pesquisa da barra superior (IV §8) não tem fonte | Decidir: tirar da barra ou criar `GET /search` |
| B11 | Sem tempo real | Notificações por *polling* | Opcional: SSE |
| B12 | `documents.write` só em Admin, HR e Cliente | O Colaborador e o Finance não carregam comprovativos de despesa; o Manager e o Finance não anexam a pedidos de pagamento | Rever as permissões, ou rotas de *upload* «do próprio» como em `/portal/me` |
| B13 | O colaborador não descarrega o recibo nem os documentos pessoais | O portal mostra a lista sem o conteúdo | `GET /portal/me/documents/{id}` (e recibo em PDF) |
| B14 | Semântica de `…/approval-outcome` e `…/decision` nos módulos de origem | Não se sabe se o front tem de os chamar depois de decidir | Confirmar quem os chama, e se são idempotentes |
| B15 | Configuração geral (moeda base, fuso, idioma) inexistente | IV e produto falam dela | Fica de fora; só `tax-entity` |
| B16 | Formato dos CSV de importação (`/settings/import/*`) não documentado | Não há modelo para dar ao utilizador | Especificação e ficheiro-modelo |
| B17 | MFA inexistente (requisito SGAP) | Contas decisoras só com password ou Google | Fora do front; fica como risco R3 |
| B18 | `GET /audit/entries`: não se sabe se `entityType` e `entityId` são obrigatórios; sem paginação | A consulta livre de auditoria pode não existir | Confirmar |

---

## 6. Fases de entrega

Regra: **cada fase só começa quando a anterior está em produção e verificada.**
As fases mantêm a ordem decidida, com os ajustes justificados abaixo.

### Ajustes propostos (todos por dependência real na API)

| Ajuste | Porquê |
|---|---|
| **Núcleo organizacional (departamentos, cargos, colaboradores, ligação de conta) sobe para a F1** | Decidir aprovações (F4) exige uma conta ligada a um colaborador com cargo aprovador (ADR-050, BR-20, ADR-058). Abrir salários também |
| **Teste de correio sobe para a F1** | Convidar (F1) depende de SMTP a funcionar |
| **Componente de *upload* sobe para a F5** | É a primeira fase que precisa dele (despesas, pedidos de pagamento). A gestão documental fica na F10 |
| **Projectos no portal do cliente descem para a F12** | Só têm conteúdo depois da visibilidade configurada nos projectos |
| SAF-T e AGT **fora da F6** até B5 | Não há rotas |

### Critérios de aceitação comuns a todas as fases

1. Todos os ecrãs da fase funcionam em 360, 768, 1024 e 1440 px, claro e
   escuro, sem scroll horizontal da página.
2. Zero violações `axe` *serious* ou *critical*. Teclado completo.
3. Estados vazio, carregamento e erro reais em cada ecrã. Zero dados fictícios
   no bundle (verificação de §8.4).
4. Cada acção escondida ou mostrada conforme as permissões, verificado com pelo
   menos dois perfis.
5. CI verde (lint, tipos, testes, auditoria, licenças, CSP sem violações).
6. Smoke de leitura em produção passou. As escritas verificaram-se na base
   local e, em produção, só as autorizadas uma a uma, com `[TESTE]`.
7. Publicado na Vercel e confirmado no domínio de produção.

### F0 — Fundação

**Ecrãs:** shell responsivo (três variantes), tema, entrar (e-mail e Google),
convite, recuperação de password, a minha conta (password e sessões activas),
logout, «sem acesso», 404, faixa «sem ligação».

**Entregáveis técnicos:** projecto, CI, `vercel.json` com CSP e cabeçalhos,
cliente HTTP completo (§2), sessão e inactividade (§7.1), modelo de permissões
(§3), `ui/` base, formatadores, primitivas zod, tipos gerados, fontes locais.

**Verificável só com leituras:** `GET /health`, `GET /identity/me`,
`GET /identity/me/sessions`, a CSP sem violações e a ausência de *open
redirect* (testes unitários e e2e).

**Escritas que precisam de autorização antes de testar em produção:**
`POST /identity/login` e `/identity/logout` (criam e terminam uma sessão, ficam
na trilha) · `POST /identity/me/sessions/{id}/revocation` · `POST
/identity/me/password` · `POST /identity/password-recovery` (envia e-mail) e a
`completion` (muda a password e **termina todas as sessões**) · aceitar um convite
(precisa de um convite real, logo de uma conta criada, que é escrita da F1) ·
`POST /identity/login/google` (precisa de uma conta Google com o mesmo e-mail).

**Aceitação específica:** o login e o logout funcionam no domínio da Vercel
**depois** do pedido de CORS (§9.2). Um `401` em qualquer pedido leva ao login
com o retorno validado. A inactividade avisa e termina a sessão de forma limpa.

### F1 — Administração de acesso e núcleo organizacional

**Ecrãs:** §5.1 (utilizadores, convites, perfis, estado da conta, governação,
dados da empresa, teste de correio) e §5.2 (departamentos, cargos,
colaboradores, ligação de conta, atribuição de cargo).

**Só leituras:** `GET /identity/users`, `/identity/roles`, `/settings/overview`,
`/fiscal/tax-entity`, `/hr/departments`, `/hr/positions`, `/hr/employees`,
`/hr/employees/{id}`, `/hr/positions/{id}/assignments`, `…/account-history`.

**Precisa de autorização:** convidar (cria uma conta **que não se apaga**, BR-14,
e envia e-mail) · mudar o estado da conta · atribuir ou retirar um perfil
(retirar termina as sessões) · repor a password · `PUT /fiscal/tax-entity`
(**dados que saem impressos nos documentos fiscais**) · `POST /debug/email/test`
· criar e editar departamentos, cargos e colaboradores · ligar e desligar
contas · atribuir cargo (com autoridade = 202, e a atribuição directa é só para
SuperAdmin).

**Aceitação específica:** uma pessoa convidada recebe o e-mail, abre
`/convite` no novo domínio (exige `FRONTEND_BASE_URL` actualizado, §9.2), define
a password e entra no shell certo. O Admin nunca vê a opção SuperAdmin. Gerir uma
conta SuperAdmin sem ser SuperAdmin mostra «Esta conta só pode ser gerida por um
SuperAdmin.»

### F2 — Dashboard executivo, notificações e alertas

**Ecrãs:** §5.3.

**Só leituras:** tudo, excepto o que está listado abaixo. É a fase que valida
de ponta a ponta a cadeia dados reais → permissões → IV. Com a base nova, a
maioria dos cartões mostra **estados vazios reais**, e isso é critério de
aceitação, não falha.

**Precisa de autorização:** marcar como lida ou ler todas · `PUT` de
preferências · criar e editar regras de alerta · resolver um alerta ·
`POST /alerts/evaluation`.

**Aceitação específica:** os números do dashboard batem com os das rotas de
origem (a mesma janela `from`/`to`). As secções sem permissão não aparecem. O
*polling* pára com a inactividade.

### F3 — Clientes e facturação

**Ecrãs:** §5.4.

**Só leituras:** listagens e fichas, saldo, vencidas, séries, canais, taxas
(`determination` com `NOR`).

**Precisa de autorização (e é a fase com mais cuidado):** criar, editar,
activar ou eliminar clientes · séries e canais · **toda a emissão** (FT, FR, ND,
NC, recibo, conversão de pró-forma, emissão de rascunho): **documentos fiscais
emitidos não se apagam**, por isso em produção só se emitem quando o utilizador
decidir emitir um documento real, nunca como teste · anulações · `delivery`
(envia e-mail ao cliente) · importação CSV.

**Aceitação específica:** o fluxo completo (rascunho → emitir → PDF → recibo →
NC → anular) **passa na base local** com e2e. Os totais mostrados batem ao
cêntimo com os do servidor. Não há duplo envio possível (teste e2e com clique
duplo e rede lenta).

### F4 — Aprovações

**Ecrãs:** §5.5.

**Só leituras:** caixa, ficha, histórico, políticas. **Nota:** até à F5 a caixa
estará vazia, porque nenhum processo das fases anteriores gera pedidos excepto
a atribuição de cargo com autoridade (F1).

**Precisa de autorização:** criar e desactivar políticas · decidir · cancelar ·
os `…/approval-outcome` (ver B14).

**Aceitação específica:** na base local, o ciclo completo com dois
colaboradores (quem submete e quem decide) prova a segregação (403 com
mensagem), o `409` por decisão simultânea e o `202` nos módulos de origem.

### F5 — Tesouraria, despesas e contas a pagar

**Ecrãs:** §5.6. **Depende de B12** (permissões de *upload*).

**Só leituras:** contas, extractos, reconciliação, câmbios, caixa pequena,
letras, fluxo de caixa, fornecedores, facturas de compra, *match*, pedidos,
despesas e resumo.

**Precisa de autorização:** todas as escritas, em particular **executar um
pagamento** (não se desfaz), importar extractos, conciliar, câmbios (afectam
conversões) e anular facturas de compra.

**Aceitação específica:** pedir e executar com contas diferentes. A segregação
de funções é visível na interface e confirmada pelo `403`.

### F6 — Fiscal e contabilidade

**Ecrãs:** §5.7, sem SAF-T e AGT (B5).

**Só leituras:** todos os relatórios e listagens. Balanço e DR mostram `unmapped`
e `difference` até o plano de contas ser carregado (está à espera do
contabilista).

**Precisa de autorização:** versões de taxas, IRT e isenções (**configuração
fiscal de produção**) · plano de contas e regras · lançamentos · fecho e
reabertura de períodos · orçamentos e aprovação.

### F7 — RH e portal do colaborador

**Ecrãs:** §5.8.

**Só leituras:** todas as listagens e fichas. Os dados pessoais só se pedem
quando a pessoa carrega em «Ver dados pessoais» (§7.6).

**Precisa de autorização:** todas as escritas, mais as duas `GET` de
declaração (§5.15).

### F8 — Salários

**Ecrãs:** §5.9. **Antes de publicar:** confirmar com o utilizador que o
parecer fiscal do ADR-049 está fechado.

**Precisa de autorização:** abrir folha, itens, submeter, decidir, anexos.

### F9 — Compras, inventário e activos

**Ecrãs:** §5.10.

**Precisa de autorização:** todas as escritas (movimentos de stock, contagens,
depreciação mensal, abates).

### F10 — Portal do cliente, documentos e mensagens

**Ecrãs:** §5.11. **A superfície de ataque é maior** (*uploads* de externos): a
revisão de segurança dedicada (checklist §7.9) é critério de entrada em
produção.

**Precisa de autorização:** ligar contas de cliente (pressupõe convite, F1),
partilhar e revogar documentos, confirmar e rejeitar comprovativos, responder e
fechar conversas, publicar artigos, e qualquer escrita feita com uma conta de
cliente.

### F11 — Comercial avançado · F12 — Projectos e frota · F13 — Complementar

**Ecrãs:** §5.12, §5.13 e §5.14. As leituras verificam-se em produção. Todas as
escritas precisam de autorização. Na F13 cada chamada `POST /ai/*` gasta saldo
pago e conta para o tecto de 20 por hora. A auditoria é só de consulta.

---

## 7. Segurança

### 7.1 Autenticação e sessão

| Requisito | Implementação |
|---|---|
| Bearer, sem cookies (ADR-013/033) | `Authorization` só para `VITE_API_URL` (§2). Sem cookies, logo sem CSRF |
| Onde fica o token | **Em memória** (variável de módulo, nunca no estado React nem no Query). **Recomendação (D3):** espelhar *só* o `accessToken`, `expiresAt` e `idleTimeoutSeconds` em `sessionStorage`, para sobreviver ao F5. **Nunca `localStorage`** (lint `no-restricted-globals`) |
| Justificação | O `sessionStorage` é por aba e apaga-se ao fechá-la. Perante XSS fica exposto como a memória, porque o atacante corre no mesmo contexto. A diferença real é que pode **levar** o token para usar fora (portador por até 12 h, ADR-067). A defesa primária é não ter XSS: CSP estrita, Trusted Types, lint e DOMPurify. A secundária é a revogação imediata e a inactividade. Só memória obriga a entrar de novo a cada F5, o que num ERP usado o dia inteiro empurra as pessoas para contornos piores. Se D3 escolher «só memória», o resto do desenho mantém-se |
| `expiresAt` (sem tolerância no backend) | Aviso 5 min antes: «A sessão termina às 18:40. Guarde o trabalho.» Não há renovação (ADR-067). No prazo menos 30 s, saída limpa |
| Inactividade 15 ou 30 min (ADR-067) | O `idleTimeoutSeconds` vem do login. O relógio é **monotónico** (`performance.now`) e reinicia-se a cada pedido autenticado bem-sucedido, que é o que o servidor conta. Aviso 2 min antes, num diálogo com contagem: «Continuar sessão», que faz `GET /identity/me`, ou «Sair». **Utilizador activo sem pedidos** (a escrever um formulário longo): a actividade real (teclado, rato, toque) gera um `GET /identity/me` no máximo de 5 em 5 min, para não ser expulso a meio do trabalho. O *polling* automático nunca conta como actividade (§5.3) |
| `401` | Limpa o token, `queryClient.clear()`, o estado e o `sessionStorage`, avisa as outras abas (`BroadcastChannel('rivo-sessao')`) e vai para `/entrar?voltar=…`. A mensagem vem do relógio local: «A sessão terminou por inactividade» se o prazo passou, senão «A sessão terminou. Entre de novo.» (B3) |
| Retorno sem *open redirect* | `voltar` só é aceite se começar por `/`, não por `//` nem `/\`, se `new URL(v, location.origin).origin === location.origin` e se casar com uma rota conhecida. Caso contrário vai para `/`. Testado com uma lista de vectores |
| Logout | `POST /identity/logout`. **O token é descartado localmente antes e independentemente da resposta.** Limpa tudo como no `401` e avisa as outras abas |
| Sessões activas | `GET /identity/me/sessions` mostra dispositivo, IP, início, última actividade e `effectiveExpiry` (o prazo que vale). «Terminar sessão» por linha. Terminar a actual equivale a logout |
| Google | Google Identity Services (botão oficial, sem One Tap automático). O ID token vai para `POST /identity/login/google`. `501` esconde o botão. O 401 mostra «Não há conta Rivo com este e-mail Google. Peça um convite.» CSP com os domínios da GIS e só esses (§7.4). O `VITE_GOOGLE_CLIENT_ID` é público, não é segredo |
| Sem registo público | Só convite (ADR-059) e recuperação (ADR-065). O ecrã de entrada diz «Não tem conta? O acesso é dado por convite de quem administra a Rivo na sua empresa.» |
| Convite e recuperação | Os ecrãs lêem `u` e `t` da *query*, guardam-nos em memória e **apagam-nos do URL de imediato** (`history.replaceState`), para não ficarem no histórico nem em capturas de ecrã. `Referrer-Policy: no-referrer`. A recuperação responde sempre igual: «Se existir uma conta com esse endereço, a mensagem já saiu.» (ADR-065) |
| Política de password | Só se valida no cliente o mínimo que o backend exige (confirmar no OpenAPI ou na configuração do Identity). Medidor de força sem bibliotecas de terceiros |

### 7.2 Autorização na interface

§3. Mais: mensagem própria para o alvo SuperAdmin (ADR-070), `403` de
segregação com o `detail`, `404` neutro, e os portais nunca enviam
identificadores de pessoa (§3.3). Testes e2e por perfil confirmam que um ecrã
sem permissão não dispara o pedido de dados.

### 7.3 Formulários e entrada de dados

- **Normalização antes de validar** (`lib/validation/text.ts`, aplicada por
  `z.preprocess` em todos os campos de texto): `normalize("NFC")` → remove os
  controlos C0/C1 (excepto `\n` em áreas de texto) → remove os invisíveis e bidi
  (U+200B–U+200F, U+202A–U+202E, U+2066–U+2069, U+FEFF, U+00AD) → `trim` →
  limite de comprimento (o `maxLength` do OpenAPI, com o atributo `maxLength` no
  `<input>`).
- **Primitivas espelhadas do backend:** `IsoDate` (`YYYY-MM-DD` válido),
  `Money` (decimal com as casas da moeda, sem expoente, sem `NaN`), `Nif`
  (**a regra exacta vem do backend**: «9 ou 10 dígitos» é o exemplo da IV; o
  validador real confirma-se no código ou no OpenAPI antes da F3), `Iban`
  (mod-97 e o comprimento de Angola, `AO` + 23, como em
  `procurement`/`finance`/`hr`, ADR-073), `Email`, `Pais` (ISO 3166-1 alpha-2, o
  FEEDBACK2 confirmou que o fornecedor o exige), `withholdingRate` 0–100, enums
  do OpenAPI (`z.enum` gerado), `recipients` com pelo menos 1.
- Os esquemas zod são **a fonte do tipo do formulário** (`z.infer`) e são
  verificados contra o tipo do pedido gerado (`satisfies`), para não divergirem
  do contrato.
- Erros do servidor (RFC 9457) → campos (§4.6). O `traceId` só aparece como
  «Código para o suporte».
- Duplo envio, `409`, `202` e `429`: §2.2 e §2.4.

### 7.4 XSS e conteúdo

- **Lint:** `react/no-danger` (proíbe `dangerouslySetInnerHTML`), `no-eval`,
  `no-implied-eval`, `no-new-func`, `no-restricted-properties` para `innerHTML`,
  `outerHTML`, `insertAdjacentHTML` e `document.write`, e `no-restricted-syntax`
  para `javascript:` em literais. Excepção única: o componente `SafeHtml`, que
  passa por DOMPurify com uma lista mínima (`p, br, strong, em, ul, ol, li, a,
  h3, h4, code, pre`; `a` só com `href` validado e
  `rel="noopener noreferrer" target="_blank"`) e é o único sítio com
  `eslint-disable` revisto.
- **Respostas de IA:** texto não confiável. Mostra-se como **texto simples**
  (`white-space: pre-wrap`). Se se quiser Markdown, faz-se um *parser* para
  elementos React, nunca HTML.
- **URLs vindos de dados** (site do cliente, ligações em artigos):
  `safeUrl()` aceita só `https:` e `mailto:` e recusa o resto (`javascript:`,
  `data:`, `http:`, `blob:`). Links externos com `rel="noopener noreferrer"`.
- **CSP** (servida pela Vercel, §9.3):

```
default-src 'self';
script-src 'self' [+ https://accounts.google.com/gsi/client];
style-src 'self' [+ https://accounts.google.com/gsi/style];
img-src 'self';
font-src 'self';
connect-src 'self' https://syyt.tech [+ https://accounts.google.com/gsi/];
frame-src [https://accounts.google.com/gsi/ | 'none'];
object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self';
manifest-src 'self'; worker-src 'self';
upgrade-insecure-requests;
require-trusted-types-for 'script'; trusted-types rivo-dompurify;
```

  - Sem `unsafe-inline` nem `unsafe-eval` em `script-src`. O Vite não gera
    scripts inline. `build.assetsInlineLimit: 0` evita `data:`.
  - `style-src 'self'` estrito é o objectivo. **Risco conhecido:** o
    `react-remove-scroll` (usado pelos diálogos Radix) injecta um `<style>`. Se o
    teste de CSP o confirmar, as opções são (a) `'unsafe-inline'` **só em
    `style-src`**, o que é aceitável porque não executa código, ou (b) evitá-lo.
    É a decisão D8.
  - **Trusted Types:** activo desde a F0 em `Report-Only` nos testes. Passa a
    obrigatório quando o e2e der zero violações. A GIS pode não ser compatível,
    o que se avalia na F0 e entra na decisão D4.
- Mais cabeçalhos: §9.3.

### 7.5 Ficheiros

- **Upload** (`ui/FileUpload`): lista branca do ADR-070 por extensão **e** tipo
  MIME (`.pdf .png .jpg .jpeg .gif .webp .docx .xlsx .pptx .odt .ods .doc .xls
  .txt .csv`), com a confirmação final no servidor pelos bytes. Tamanho e
  quantidade verificados antes de enviar. Contas de cliente: 10 MB por ficheiro e
  um aviso «até 20 ficheiros por dia». A quota real só a sabe o servidor, que
  responde `429`. Tratamento de `415`, `400` e `429` com o `detail`. Sem
  pré-visualização de ficheiros carregados (nem `blob:` em `<img>` para imagens
  de clientes).
- **Download:** §2.5. Sempre como anexo. **Sem pré-visualização embebida de PDF
  na F3.** Se se quiser mais tarde, faz-se com pdf.js a desenhar em `<canvas>`,
  sem `iframe` (a CSP mantém `frame-src` fechado).
- **Exportações:** CSV gerado no cliente com BOM UTF-8 e `;` como separador
  (Excel em pt). As células de **texto** que comecem por `=`, `+`, `-`, `@`,
  `\t` ou `\r` levam um `'` à frente. Os números saem como números, sem prefixo,
  para não partir os negativos. Nomes de ficheiro sanitizados. XLSX: decisão
  D11.

### 7.6 Dados pessoais e fugas

- **URLs só com ids.** A lint e o *code review* proíbem `?nif=`, `?email=`,
  `?nome=`. A pesquisa por texto fica em estado local.
- **`hr.personal_data`:** os dados não se pedem até à acção «Ver dados
  pessoais». Depois aparecem mascarados (`•••• 4821` para IBAN, NIF, BI e INSS),
  com «Mostrar» por campo, que volta a mascarar ao sair do ecrã ou ao fim de 60 s.
  A cache dessa query tem `gcTime: 0`.
- **Nada sensível em armazenamento persistente.** O Query vive em memória e
  limpa-se no logout, no `401` e na troca de conta.
- **Produção:** `esbuild.drop: ['console','debugger']`, `build.sourcemap: false`
  (e a verificação de que não há `.map` no `dist/`), sem analytics, sem Vercel
  Analytics, Speed Insights nem Toolbar, sem scripts de CDN em runtime (a única
  excepção é a GIS, se o login Google for aprovado, porque a Google não a
  permite auto-alojar).
- `autocomplete="off"` só onde faz sentido (NIF de terceiros). Nas passwords,
  `autocomplete="current-password"` e `"new-password"`, para os gestores de
  passwords funcionarem.

### 7.7 Cadeia de fornecimento

`save-exact=true`, `package-lock.json` versionado, sempre `npm ci`.
`npm audit --audit-level=high` bloqueia o CI. Revisão de licenças
(`license-checker-rseidelsohn` com lista branca: MIT, ISC, BSD-2/3, Apache-2.0,
0BSD; o resto exige decisão). Dependabot semanal, agrupado, sempre revisto à
mão. GitHub Actions fixadas por SHA (como no backend, ADR-070). Avaliar
`ignore-scripts=true` no `.npmrc` com a lista dos pacotes que precisam de
*postinstall*. Antes de entrar uma dependência nova, regista-se o porquê no PR.

### 7.8 Ameaças específicas consideradas

Ataques ao *open redirect* do retorno · *tabnabbing* (`noopener`) ·
*clickjacking* (`frame-ancestors 'none'`) · fuga do testemunho de convite (URL
limpo, `no-referrer`) · CSV injection · conteúdo de clientes (*upload* e
mensagens) mostrado à equipa (só texto) · respostas de IA com *prompt
injection* (só texto, sem acções automáticas) · token em extensões do browser
(fora do controlo, mitigado pela revogação) · enumeração de contas (a
recuperação responde sempre igual).

### 7.9 Checklist de segurança verificável (ASVS 4.0.3 nível 2, OWASP Top 10 2021)

| # | Verificação | Como testar | ASVS / Top 10 |
|---|---|---|---|
| S1 | O token nunca vai para `localStorage`, cookies ou IndexedDB | Lint `no-restricted-globals` + e2e: depois do login, `localStorage` só tem as chaves de `prefs` | V3.2, V8.2.2 / A07 |
| S2 | O token só é enviado para `VITE_API_URL` | Teste unitário do middleware com um URL alheio | V3.5 / A07 |
| S3 | Um `401` limpa a sessão, a cache e as outras abas | e2e: um token revogado leva a `/entrar`; o `queryClient` fica vazio; a segunda aba também sai | V3.3.1 / A07 |
| S4 | O logout invalida localmente mesmo com a rede a falhar | e2e com `route.abort()` no logout | V3.3.1 |
| S5 | Avisa e sai por inactividade (15 e 30 min) | Unitário com relógio falso + e2e com `idleTimeoutSeconds` curto na base local | V3.3.2 / A07 |
| S6 | O `voltar` não é *open redirect* | Unitário com vectores (`//evil`, `/\evil`, `https://evil`, `javascript:`, `%2F%2F`) | V5.1.5 / A01 |
| S7 | Testemunhos de convite e recuperação saem do URL | e2e: depois de carregar `/convite?u&t`, `location.search === ""` | V3.5, V8.3 |
| S8 | Menu, rotas e botões respeitam as permissões | e2e por perfil (pelo menos Admin, Sales, Colaborador e Cliente na base local) | V4.1 / A01 |
| S9 | Os portais não enviam ids de pessoa | Teste estático: nenhum *hook* dos portais aceita `employeeId`/`customerId` + revisão das chamadas no e2e | V4.2.1 / A01 |
| S10 | Sem `dangerouslySetInnerHTML`, `eval`, `innerHTML` fora de `SafeHtml` | Lint no CI + `grep` ao `dist/` | V5.3.3, V5.2.4 / A03 |
| S11 | O DOMPurify remove *payloads* | Unitário com a lista OWASP XSS | V5.2.1 / A03 |
| S12 | `safeUrl` recusa os esquemas perigosos | Unitário | V5.1.4 / A03 |
| S13 | A CSP está activa e sem violações | e2e: o cabeçalho existe no deploy + escuta de `securitypolicyviolation` em todos os ecrãs = 0 | V14.4.3 / A05 |
| S14 | HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors` e COOP presentes | `curl -I` do domínio de produção no CI depois do deploy | V14.4 / A05 |
| S15 | Sem source maps, sem `console` e sem MSW ou *fixtures* no bundle | Verificação do `dist/` (§8.4) | V14.3.2, V7.1 / A05 |
| S16 | Upload só da lista branca e do tamanho | Unitário + e2e com `.exe` renomeado (o servidor dá 415) na base local | V12.1, V12.2 / A04 |
| S17 | Download sempre em anexo, sem `blob:` navegável | Lint (`window.open`, `iframe src`) + e2e | V12.5 / A03 |
| S18 | Exportação CSV neutraliza fórmulas | Unitário com `=1+1`, `+cmd`, `-2+3`, `@SUM`, `\t=`, `\r=` | V5.3.10 / A03 |
| S19 | Nada de PII em URLs | Lint + e2e que recolhe todos os URLs navegados e pedidos e procura padrões de NIF, e-mail e IBAN | V8.3.1 / A02 |
| S20 | Dados pessoais mascarados por omissão | Teste de componente | V8.3.4 |
| S21 | Duplo envio impossível | e2e com duplo clique e rede lenta: 1 pedido | V11.1.4 / A04 |
| S22 | `202` nunca aparece como sucesso | Teste de componente | V11.1 |
| S23 | Normalização Unicode e de controlo | Unitário (zero-width, bidi, NFC/NFD) | V5.1.3 / A03 |
| S24 | Dependências sem vulnerabilidades altas e licenças aprovadas | `npm audit`, verificação de licenças no CI | V14.2.1 / A06 |
| S25 | Actions e dependências fixadas | `npm ci` + revisão das *workflows* (SHA) | V14.2.4 / A08 |
| S26 | Sem chamadas a terceiros em runtime (excepto GIS se aprovada) | e2e: todos os pedidos de rede vão para a própria origem, `syyt.tech` ou `accounts.google.com` | V14.2.5 / A08 |
| S27 | Erros sem detalhe interno, só `traceId` | Teste de componente ao `ErrorPanel` | V7.4.1 / A09 |
| S28 | `index.html` sem cache e assets imutáveis | `curl -I` no CI | V14.4 |
| S29 | Mensagem SuperAdmin e 403 de segregação legíveis | Teste de componente com respostas reais gravadas da base local | V4.1.5 |
| S30 | `429` tratado sem ciclos de novas tentativas | Unitário (sem retry em 4xx) | V11.1.4 |

---

## 8. Testes

### 8.1 Camadas

| Camada | Ferramenta | O quê |
|---|---|---|
| Unitários | Vitest | Formatadores, `Money`/`Big`, primitivas zod (NIF, IBAN, texto), `safeUrl`, `csvEscape`, `returnTo`, mapeamento de Problem Details, relógio de inactividade (relógio falso), `can()` |
| Componentes | Vitest + Testing Library + MSW | Formulários (erros 400/409/202), tabelas (paginação por cabeçalhos), `ChartCard` (título, cores por slot, vista em tabela), estados vazio, erro e carregamento |
| e2e de leitura | Playwright, **contra produção** | Smoke: login → navegar por todos os ecrãs da fase → logout. Ver §8.3 |
| e2e de escrita | Playwright, **só contra a base local** | Fluxos completos de cada fase |
| Acessibilidade | `@axe-core/playwright` em cada ecrã do e2e | |
| Responsivo | e2e em 360, 768, 1024 e 1440, claro e escuro | Verificação de `scrollWidth` |

### 8.2 Sem dados fictícios no produto

- MSW, *fixtures* e *factories* vivem **só** em `tests/` e são
  `devDependencies`. A lint (`import/no-restricted-paths`) proíbe importar
  `tests/**` ou `msw` a partir de `src/**`.
- As *fixtures* são **tipadas contra `schema.d.ts`**: quando o contrato muda, os
  testes deixam de compilar, o que detecta a deriva.
- Sem «modo demonstração», sem *seed* no front, sem gráficos de exemplo. O
  Storybook não entra (seria mais um sítio com dados inventados a manter).

### 8.3 Sem escrever em produção

- **Smoke de produção** (`tests/e2e/leitura`): um `page.route('**/*')` **aborta
  e falha o teste** em qualquer pedido à API que não seja `GET`, com duas
  excepções explicitamente autorizadas: `POST /identity/login` e
  `POST /identity/logout`. Também falha nas `GET` com efeito (§5.15). Corre
  com uma conta dada pelo utilizador, a partir de variáveis de ambiente do CI ou
  do `.env.local`, **nunca no repositório**.
- **Escritas:** sempre na base local:
  `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build`
  (SQL Server em contentor, ADR-021) →
  `scripts/configurar-referencia-fiscal.ps1` (configuração fiscal de
  referência) → `tools/Rivo.QaSeed` (dados de QA; **recusa ambientes não locais
  sem confirmação escrita**, `Program.cs:31-41`) → Playwright contra
  `http://localhost:5173` com `VITE_API_URL=http://localhost:5080` e
  `CORS_ALLOWED_ORIGINS=http://localhost:5173` **no `.env` local da API**. Não é
  preciso pedir `localhost` no CORS de produção.
- Se, ainda assim, for preciso confirmar uma escrita em produção: pedido
  concreto ao utilizador → autorização para *aquele* pedido → prefixo `[TESTE]`
  → nota no PR do que ficou criado. Nunca contas, perfis, documentos fiscais nem
  nada que toque na AGT.

### 8.4 Verificação do bundle (CI)

Depois de `vite build`: (1) nenhum `*.map` em `dist/` · (2) `grep` sem `msw`,
`faker`, `fixtures`, `console.`, `debugger` · (3) nenhum hex fora de
`tokens.css` no CSS gerado, excepto os que vêm dos próprios tokens (a
comparação é contra a lista de tokens) · (4) nenhum URL `http(s)://` que não
seja `VITE_API_URL` ou `accounts.google.com` · (5) tamanho por *chunk*
(orçamento).

---

## 9. Deploy na Vercel

### 9.1 Primeira publicação = só a fundação

1. Repositório Git do front (D5) com protecção de `main`: só *merge* com o CI
   verde.
2. Projecto Vercel ligado ao repositório. *Framework preset* Vite.
   `buildCommand: npm run build`, `outputDirectory: dist`, Node LTS fixado.
3. Variáveis de ambiente (Vercel → Settings → Environment Variables):

| Variável | Production | Preview | Development |
|---|---|---|---|
| `VITE_API_URL` | `https://syyt.tech` | *(vazio, D10)* | `http://localhost:5080` |
| `VITE_GOOGLE_CLIENT_ID` | id público (se D4) | vazio | vazio |
| `VITE_APP_VERSION` | `$VERCEL_GIT_COMMIT_SHA` (via `vite.config`) | idem | `dev` |

   Não há segredos: tudo o que entra no bundle é público.
4. **Desligar** Vercel Analytics, Speed Insights e Vercel Toolbar (este último
   injecta um script nos previews). Não instalar `@vercel/analytics` nem
   `@vercel/speed-insights`.
5. O primeiro deploy de `main` publica o F0 em `<projecto>.vercel.app`. O
   login **ainda não funciona**: é esperado, porque a origem ainda não está no
   CORS.

### 9.2 Pedido ao backend logo a seguir (texto exacto)

> **Pedido: autorizar o novo front de produção na API (`syyt.tech`)**
>
> 1. No `.env` da VPS, acrescentar a origem do novo front a
>    `CORS_ALLOWED_ORIGINS` (lista separada por vírgulas, **sem barra final**,
>    sem `*` (o arranque falha com `*`, ADR-070)):
>    `CORS_ALLOWED_ORIGINS=https://rivo.noirdataintelligence.com,https://<projecto>.vercel.app`
>    *(manter ou retirar `rivo.noirdataintelligence.com` conforme a decisão D6)*.
>    Reiniciar a API e confirmar com
>    `curl -s -i -H "Origin: https://<projecto>.vercel.app" https://syyt.tech/health`,
>    que deve trazer `Access-Control-Allow-Origin: https://<projecto>.vercel.app`.
> 2. **Só quando o novo front tiver `/convite` e `/recuperar` verificados**
>    (F1): mudar `FRONTEND_BASE_URL` para `https://<projecto>.vercel.app`. Os
>    convites e recuperações passam a apontar para lá (`/convite?u=&t=`,
>    `/recuperar?u=&t=`).
> 3. No código (`src/Rivo.Api/Cors/BrowserClientCors.cs`): acrescentar
>    `Retry-After` e `Content-Disposition` a `WithExposedHeaders` (B1, B2). E,
>    se possível, o motivo do fim de sessão no `401` (B3).
> 4. Não acrescentar `localhost` nem URLs de preview ao CORS de produção.

### 9.3 `vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "cleanUrls": true,
  "trailingSlash": false,
  "rewrites": [{ "source": "/((?!assets/).*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "<§7.4, numa linha>" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "no-referrer" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), browsing-topics=()" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin-allow-popups" },
        { "key": "Cross-Origin-Resource-Policy", "value": "same-origin" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
    {
      "source": "/((?!assets/).*)",
      "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
    }
  ]
}
```

- `same-origin-allow-popups` só se o Google (D4) usar janela. Sem Google:
  `same-origin`.
- O `preload` do HSTS só com domínio próprio, nunca em `vercel.app`.
- A CSP é uma só para todos os ambientes. Os previews não falam com a API (D10),
  por isso `connect-src` só precisa de `https://syyt.tech`.

### 9.4 Previews

**Recomendação: previews sem acesso à API.** O `VITE_API_URL` vem vazio, e o
shell mostra a faixa «Pré-visualização: sem ligação à API» e não tenta
autenticar.

Porquê: a única API é a de **produção**. Um preview com acesso seria código
ainda por rever a ler e escrever dados reais da empresa. Um domínio de preview
fixo autorizado à parte não resolve isso, só o torna permanente. Os previews
servem para rever layout, tema e responsividade. O comportamento verifica-se no
CI com a base local. Se um dia existir staging, aí sim: um domínio de preview
fixo (por exemplo um *custom domain* atribuído à branch `preview`) autorizado só
no staging.

### 9.5 CI antes de cada deploy

*Workflow* em PR e em `main`: `npm ci` → lint (incluindo as regras de
segurança) → `tsc --noEmit` → verificação de que `schema.d.ts` corresponde a
`openapi/v1.json` → Vitest (unitários e componentes, com cobertura mínima de
80 % em `lib/`) → `vite build` → verificação do bundle (§8.4) → `npm audit` →
licenças → Playwright de escrita contra a base local (exige o código da API no
CI, D12; senão corre localmente antes de cada release) → *merge*. Depois do
deploy de produção: `curl -I` aos cabeçalhos (S14, S28) e o smoke de leitura
(§8.3).

---

## 10. Riscos e decisões em aberto

### Decisões para o utilizador

> **Respostas (2026-10-12):** D1 base local · D2 conta SuperAdmin de arranque
> (credenciais só em `.env.local`) · D3 memória + `sessionStorage` · D4 sem
> Google por agora, «mas terá» · D5 `git@github.com:y-jr/rivoweb.git`, Vercel
> quando houver estrutura · D6 o front antigo continua até o novo estar 100 %
> (`FRONTEND_BASE_URL` não muda até lá) · D9 aprovado; o backend resolveu B8,
> B12, B13 e a exportação SAF-T de B5 (PRs #94 → #97, ADR-080/081); as
> declarações AGT ficam de fora por falta de formato oficial · D10, D14 e as
> menores (D7, D8, D11, D12, D13, D15): recomendação.

| # | Decisão | Opções | Recomendação |
|---|---|---|---|
| **D1** | Onde se testam escritas, com o ADR-074 rejeitado | (a) **base local em Docker** para todas as escritas, produção só leituras; (b) reabrir o staging (`feat/staging` existe no remoto); (c) produção com `[TESTE]`, pedido a pedido | **(a)**, com (c) só para o que for impossível localmente (e-mail real, Google) |
| **D2** | Conta para leituras em produção | Conta existente dada na conversa, ou uma conta dedicada de verificação (criá-la é uma escrita da F1). **Não há perfil só de leitura** (todos os perfis com permissões escrevem algo) | Conta dedicada, criada por convite com autorização, com o perfil da fase em teste |
| **D3** | Token só em memória ou memória + `sessionStorage` | §7.1 | Memória + `sessionStorage` (só o token e os prazos) |
| **D4** | Login Google na F0 | O Google está configurado em produção? (sem `Google:ClientId` dá 501.) Qual é o `client_id`? Aceita a excepção de CSP e de script de terceiros só para a GIS? | Incluir se o backend o tiver ligado, senão esconder (o 501 já o faz) |
| **D5** | Repositório e projecto Vercel | Nome do repositório (GitHub, que conta) e nome do projecto Vercel (define `<projecto>.vercel.app`) | — |
| **D6** | Front antigo em `rivo.noirdataintelligence.com` | Mantém-se em paralelo? Quando sai do CORS? | Manter até a F1 estar em produção, e retirar do CORS no mesmo pedido que muda `FRONTEND_BASE_URL` |
| **D7** | Tailwind v3 (preset tal como está) ou v4 | §1.1 | v3.4 |
| **D8** | `style-src 'unsafe-inline'` se os diálogos Radix o exigirem | §7.4 | Aceitar só em `style-src`, se o teste o provar |
| **D9** | Ajustes às fases (§6): núcleo de RH para a F1, *upload* para a F5, projectos do portal para a F12, SAF-T e AGT fora até B5 | — | Aprovar |
| **D10** | Previews sem API | §9.4 | Sem API |
| **D11** | Exportação XLSX além de CSV | XLSX acrescenta uma biblioteca pesada (`exceljs`) | Só CSV até haver pedido concreto |
| **D12** | O CI do front tem acesso ao código da API (para a base local no e2e)? Em que repositório? | Sem acesso, o e2e de escrita corre só localmente | Acesso de leitura ao repositório da API |
| **D13** | Cores de marca: o README da IV assinala divergência face ao manual antigo (`#934EE3`) | Medidas no símbolo (IV v1) ou manual antigo | Medidas no símbolo, porque são as que os tokens já usam |
| **D14** | Pedidos de backend B1–B18 (§5.16) | Quais se pedem já. **B12 bloqueia a F5, B5 bloqueia parte da F6, B13 limita a F7** | Pedir já B1, B2, B3, B12 e B14. Os outros antes da fase respectiva |
| **D15** | Fuso horário das datas-hora | `Africa/Luanda` fixo ou o do browser | `Africa/Luanda` (empresa única em Angola, coerente com os documentos) |

### Riscos

| # | Risco | Mitigação |
|---|---|---|
| R1 | Produção é o único ambiente: um erro de teste é dado real e permanente | D1(a), smoke só GET com bloqueio activo (§8.3), autorização pedido a pedido |
| R2 | Token portador por até 12 h (ADR-067) | CSP estrita, Trusted Types, sem `localStorage`, revogação nas sessões activas |
| R3 | Sem MFA (SGAP), e o Google não o resolve (ADR-032) | Fora do front. Assinalar ao backend |
| R4 | Edições perdidas por falta de `If-Match` (B8) | Mostrar «actualizado às …» na ficha e pedir B8 |
| R5 | Base vazia: os dashboards e relatórios parecem «partidos» | Estados vazios informativos com a acção seguinte. Explicar na entrega da F2 |
| R6 | Mudar `FRONTEND_BASE_URL` cedo de mais parte os convites | Só depois de `/convite` e `/recuperar` verificados (§9.2) |
| R7 | Deriva entre OpenAPI e comportamento real | Tipos do `v1.json` do mesmo commit do deploy, *fixtures* tipadas, divergências reportadas |
| R8 | ICU diferente entre browsers altera a formatação | Formatação própria sobre `formatToParts` + testes nos três motores |
| R9 | `GET` com efeito (§5.15) disparados por *prefetch* | Essas rotas nunca entram em `prefetch` nem em `useQuery`, só em acções explícitas |
| R10 | Notificações por *polling* mantêm a sessão viva | *Polling* só com actividade e documento visível (§5.3) |

---

## Resumo

- SPA React, TypeScript `strict` e Vite na Vercel, com a IV aplicada só por
  tokens. Um cliente HTTP único, tipos gerados do OpenAPI obtido localmente,
  permissões vindas de `/identity/me` e três shells.
- Segurança: CSP estrita sem `unsafe-inline` em scripts, token em memória (e
  `sessionStorage` se aprovado), inactividade com aviso, `401` com limpeza
  total, *uploads* e *downloads* blindados, 30 verificações testáveis.
- Testes sem dados fictícios no bundle: escritas só na base local em Docker,
  produção só com o smoke de leitura que bloqueia tudo o que não seja GET.
- 13 fases na ordem decidida, com quatro ajustes por dependência real e 18
  lacunas do backend identificadas, três delas a bloquear partes de fases (B5,
  B12, B13).

---

## 11. Registo de execução

### F0 — o que mudou face ao plano, e porquê

| Tema | Plano | Execução | Porquê |
|---|---|---|---|
| Versões | «estáveis do dia» | React 19.3, React Router 8.4, TanStack Query 5.104, Vite 8.3, Vitest 5, TypeScript **5.9** | O TypeScript 7 não é suportado pelo `typescript-eslint` nem pelo `openapi-typescript` |
| Lint | ESLint com `eslint-plugin-react` e `jsx-a11y` | ESLint **10**, sem esses dois plugins; `dangerouslySetInnerHTML`, `iframe`, `javascript:` e `window.open` proibidos por `no-restricted-syntax` | Os dois plugins não suportam o ESLint 10, e o 9 já não tem suporte. A acessibilidade verifica-se com `axe` no e2e |
| Validação | `zod` | **`zod/mini`** (o mesmo pacote, API funcional) | O `zod` clássico pesava ~31 KB gzip no chunk inicial; com o mini o chunk inicial ficou em 150 KB |
| Tabelas | TanStack Table v8 | Entra quando a primeira tabela entrar (F1); a versão actual é a v9 | A F0 não tem tabelas |
| Fontes | `@fontsource-variable/inter` | `@fontsource/inter` 400/500/600 | Os tokens nomeiam a família `"Inter"`; a variável regista-se como `"Inter Variable"` e obrigava a mexer nos tokens |
| `npm audit` | `--audit-level=high` bloqueia | Bloqueia em `high` nas dependências de produção; nas de build, em `critical` | O Tailwind v3 (D7) depende de `braces` ≤ 3.0.3 (DoS por padrões aninhados) sem correcção na linha v3. É código de build com padrões nossos; não chega ao bundle. Alternativa: Tailwind v4 |
| CSP `style-src` | `'self'`, D8 se o teste provar | `'self' 'unsafe-inline'` | **Provado no e2e:** o scroll-lock dos diálogos Radix (`react-remove-scroll`) injecta um `<style>`. `script-src` continua estrito |
| Trusted Types | Report-Only até o e2e dar zero | **Obrigatório** (`require-trusted-types-for 'script'; trusted-types 'none'`) | Zero violações em todos os ecrãs no Chromium |
| `401` | Fim de sessão em qualquer `401` fora do login | Fim de sessão só com `WWW-Authenticate` ou sem corpo JSON | **Facto** (`IdentityModuleEndpoints.cs`): a password actual errada em `POST /identity/me/password` devolve `401` com Problem Details |
| `401` e outras abas (S3) | O `401` avisa as outras abas | O **logout** propaga-se; o `401` é por aba | Cada aba tem a sua sessão no servidor (o `sessionStorage` é por aba). Quem recebe o aviso termina também a sua sessão no servidor |
| Verificação do bundle (§8.4) | `grep console.` no `dist/` | `no-console` na lint | O próprio `react-dom` de produção tem `console.error` |
| Retorno do login | `voltar` validado | Validado contra a tabela do router (`matchRoutes`), sem segunda lista | — |

### F0 — estado

- **Feito:** fundação técnica (§2, §3, §7.1), shells, tema, os ecrãs
  públicos, «A minha conta» (password e sessões), «sem acesso», 404, faixa sem
  ligação, `vercel.json`, CI e Dependabot.
- **Testes:** 78 unitários (cobertura de `lib/` ≈ 90 %, limiar 80 %) e 19
  cenários e2e × 3 motores, com CSP, axe, responsividade e sessão.
- **Smoke de leitura em produção:** feito a 2026-10-13 (`npm run smoke:leitura`,
  conta SuperAdmin dada na conversa): `/health`, `/identity/me`,
  `/identity/me/sessions` e `/portal/me` (403 esperado: a conta não tem ficha);
  login 200, logout 204.
- **Por fazer:**
  - primeiro deploy na Vercel e pedido de CORS (`PEDIDO-BACKEND.md`);
  - login Google (D4) quando o backend o tiver.

### F1 — o que mudou face ao plano, e porquê

| Tema | Plano | Execução | Porquê |
|---|---|---|---|
| Início da fase | Só depois da F0 em produção e verificada | Começou com a F0 publicada mas sem CORS para o novo domínio | Decisão do utilizador (2026-10-13: «pode seguir pra f1») |
| Tabelas | TanStack Table v8 | Componente próprio `ui/Tabela.tsx` (≈ 1,4 KB gzip) | As tabelas da F1 são simples: colunas escondidas por largura, ordenação local só em listas inteiras (§2.3), estados reais. Uma dependência a menos na cadeia de fornecimento. Revê-se se uma fase precisar de agrupamento, redimensionar colunas ou virtualização |
| Login e chunk inicial | `zod` no login | O login valida com um resolver próprio (`lib/validation/normalizar.ts`) com as mesmas regras e mensagens; o `zod` sai do chunk inicial | As funções de `zod` usadas pelas páginas novas ficavam no chunk inicial (o bundler junta-as onde o módulo já está). Com a F1, o chunk passou de 150 KB para 152 KB; sem `zod` no login ficou em **146 KB** com a F1 incluída |
| Concorrência (§4.6) | Painel com diferenças campo a campo | Na ficha do colaborador, `If-Match` com o `ETag` da leitura; o 409 de versão mostra «Alguém alterou este registo entretanto» e «Recarregar». O 409 de regra de negócio mostra o motivo do servidor, sem «recarregar» | O B8 foi resolvido (ADR-080), mas só tem `ETag` quem tem `GET` por id: na F1, só o colaborador. O `ETag` só passa a ser legível em produção quando o PR #96 for publicado; até lá a escrita segue sem pré-condição, como antes. As diferenças campo a campo ficam para os formulários longos (F3) |
| Separação entre features (§1.3) | Uma feature só importa os tipos públicos de outra, de `index.ts` | `features/<m>/index.ts` exporta tipos **e** hooks públicos (`useUtilizadores` para ligar contas na ficha) | A ficha do colaborador precisa da lista de contas, que é de `administracao`. A lint ainda não o impõe |
| Paginação no URL | — | `?pagina=&tamanho=` nas listas paginadas pelo servidor | O «voltar» do browser e uma ligação partilhada abrem a mesma página. Só números (S19) |
| Listas de apoio | — | Departamentos, cargos e colaboradores para nomes e escolhas pedem a 1.ª página com o tecto do servidor (200) e avisam se houver mais | Não há pesquisa no servidor (B6) |
| Nomes duplicados | — | Departamento e cargo avisam antes de enviar se o nome já existe na lista carregada | **Facto** (verificado na base local): o índice único devolve **500** em vez de 409 (B15, `PEDIDO-BACKEND.md`) |
| Repor password | Atrás de confirmação; omissão = ligação de recuperação | Igual. A ligação usa a rota pública `POST /identity/password-recovery` com o e-mail da conta | ADR-059/065 |
| Contas SuperAdmin | «Esta conta só pode ser gerida por um SuperAdmin.» | Igual; sem acções para quem não é SuperAdmin. O perfil SuperAdmin nunca se retira pela interface | ADR-058, ADR-070 |
| Contraste do menu | — | Os títulos dos grupos passam a `muted-foreground` | O axe apanhou contraste insuficiente com `muted-subtle`, que só apareceu quando o menu passou a ter grupos |

### F1 — estado

- **Ecrãs:** utilizadores (lista, pesquisa, filtro, convite), ficha da conta
  (perfis, estado com razão, ligação de recuperação, password por um
  administrador), configurações (dados da empresa, governação, teste de
  correio), departamentos, cargos (com ocupações), colaboradores (lista
  paginada, admissão) e ficha do colaborador (dados, contactos, departamento,
  estado, cargo com 201/202/directa, verificar decisão, encerrar, conta de
  acesso com histórico).
- **Leituras em produção:** feitas a 2026-10-13 com `npm run smoke:leitura`:
  todas as rotas `GET` da F1 deram 200.
- **Escritas:** verificadas **na base local** (Docker, `fix/motivo-do-401`,
  sem SMTP) com `npx playwright test --project=escritas-local`, num browser real:
  criar departamento e cargos (com e sem autoridade), admitir, corrigir o nome e
  os contactos com `If-Match`, atribuir cargo (201 e 202), encerrar, a recusa de
  arquivar com atribuição pendente (409 de negócio), convidar, juntar e retirar
  perfil, desactivar e reactivar a conta, ligar e desligar a conta, guardar os
  dados da empresa e o 501 do teste de correio sem SMTP. **Nenhuma escrita em
  produção.**
- **Testes:** 31 cenários e2e × 3 motores com a API simulada (CSP, axe, 360 a
  1440 px, tema escuro, dois perfis), mais o teste local de escritas.
- **Em produção (2026-10-13):** publicado em `https://rivoweb-coral.vercel.app`
  com o CORS do domínio; smoke de leitura no browser (F0 e F1) a passar.
  Corrigido no deploy: `cleanUrls` no `vercel.json` partia a reescrita do SPA
  (404 em todas as rotas menos `/`).
- **Aceitação do convite:** com `FRONTEND_BASE_URL` já na Vercel, **um** convite
  autorizado pelo utilizador (perfil Colaborador) chegou, abriu no domínio
  novo, a password foi definida e o login entrou no portal do colaborador.
  **F1 aceite.**


### F2 — o que mudou face ao plano, e porquê

| Tema | Plano | Execução | Porquê |
|---|---|---|---|
| Entrada do backoffice | — | `/` passa a ser o painel pessoal (notificações, aprovações à espera, anúncios) seguido dos KPIs das secções que o perfil lê; o dashboard executivo fica em `/dashboard` | `/dashboard/me` e `/dashboard/kpis` não exigem permissão (ADR-069): servem toda a gente. O portal do colaborador mostra também o resumo pessoal |
| Período por omissão | — | «Este ano», com «Este mês», «Últimos 3 meses» e «Ano anterior»; no URL (`?periodo=`) | O backend não tem omissão («decisão de produto»). O ano dá sentido às séries mensais |
| Sino | «sino + página» | O sino é uma ligação para `/notificacoes` com a contagem por ler; sem pré-visualização em popover | O Popover do Radix não estava instalado e as versões recentes têm dias. Fica acessível e sem dependência nova |
| Polling (§5.3) | Documento visível e actividade nos últimos 5 min | Documento visível **e interacção depois do último pedido autenticado** | **Provado no e2e:** com «actividade nos últimos 5 min», o polling de 60 s deslizava o prazo de inactividade (ADR-067) e a sessão nunca terminava (o teste de inactividade falhou nos três motores). Com a regra nova, o polling nunca prolonga a sessão para lá da última interacção |
| Gráficos | Recharts | Recharts 3.10.1, só no chunk dos dashboards; `accessibilityLayer` desligado e o SVG `aria-hidden`; a leitura acessível é «Ver como tabela» | O SVG do Recharts era focável dentro de `aria-hidden` (axe). A tabela tem os mesmos números e exporta CSV |
| Verificação do bundle | Sem hosts de terceiros | Permitidos `redux.js.org`, `redux-toolkit.js.org` e `bit.ly` | São ligações em mensagens de erro do Redux Toolkit e do Immer (dependências do Recharts), nunca pedidos |
| Chunk inicial | 150 KB | 147,5 KB | — |
| Logout | — | Depois de «Sair», o login seguinte não volta à página anterior | Encontrado na verificação local: o próximo login (talvez outra pessoa) caía na página de quem saiu. O retorno fica para quem perdeu a sessão a meio |
| Contraste | — | Datas pequenas em `muted-foreground` em vez de `muted-subtle` | axe |
| Shell do Colaborador (§3.3) | «Sem permissões» → portal do colaborador | As permissões que os portais também têm (`documents.write`) não contam como gestão | **Facto** (catálogo): Colaborador e Cliente têm `documents.write` (B12). Com a regra antiga, o Colaborador entrava na gestão com um painel vazio |
| Menu e guardas (§3.2) | `meta.requires` por rota | Uma só tabela (`src/app/requisitos.ts`) para o menu e para as guardas; requisitos combináveis («A, ou B e C»). Teste com o catálogo real de perfis: cada perfil vê só o que pode abrir | Pedido do utilizador (2026-10-13): nenhuma entrada fora das permissões. Configurações aparecia a quem tinha só `approval.policies.read` e abria vazia (a governação exige também `identity.roles.read`) |

### F2 — estado

- **Ecrãs:** painel pessoal (contadores, anúncios em texto simples, KPIs de
  finanças, pessoas e vendas com gráficos), dashboard executivo (cinco números,
  evolução mensal, clientes que mais facturaram), notificações (sino com
  contagem, página paginada, marcar uma ou todas, preferência de e-mail em «A
  minha conta») e alertas (eventos com resolução, regras com criar, rever,
  desactivar e «Avaliar agora»).
- **Leituras em produção:** feitas a 2026-10-13 com `npm run smoke:leitura`;
  todas as rotas `GET` da F2 deram 200 (o SuperAdmin recebe as três secções).
- **Escritas:** verificadas **na base local** (`f2-escritas.spec.ts`): criar,
  rever e desactivar uma regra, avaliar, marcar uma notificação e todas como
  lidas (com uma notificação gerada de propósito ao atribuir um perfil à conta
  admin local) e trocar e repor a preferência de e-mail. **Resolver um alerta
  não foi verificado localmente**: a base local não tem dados que abram
  alertas; está coberto no e2e com a API simulada. Nenhuma escrita em produção.
- **Testes:** 96 unitários; 40 cenários e2e × 3 motores.
- **Em produção (2026-10-13):** publicado em `https://rivoweb-coral.vercel.app`.
  Smoke no browser com o SuperAdmin (F0, F1 e F2) e **por perfil** com as 9
  contas de QA (`tests/e2e/leitura/perfis.spec.ts`): o menu de cada perfil é
  exactamente o esperado e cada página do menu abre sem erro. Só leituras,
  login e logout. **F2 aceite** do lado técnico.

### F3 — o que mudou face ao plano, e porquê

| Tema | Plano | Execução | Porquê |
|---|---|---|---|
| Emissão | Rascunho → emitir | Sempre por rascunho: «Guardar rascunho» e «Emitir…» (grava primeiro o que está no ecrã e emite exactamente isso). `POST /finance/sales-invoices` directo não se usa | O rascunho é a única via com rasto e revisão antes do número |
| Totais antes de emitir | Pré-visualização com `Big` | Quem lê as taxas vê a previsão local, ao escrever (regras do servidor: linha a linha, 2 casas, meio para cima; retenção sobre o líquido). Quem não as lê (Sales) vê a previsão do servidor depois de guardar o rascunho | B16 resolvido (PR #100): o rascunho devolve `taxTotal`, `grossTotal`, `withholdingAmount`, `amountPayable` |
| Códigos de imposto | `NOR` | Os códigos de IVA lidos da API, sem `ISE`/`NS` (exigem código de isenção, 501); quem não lê as taxas vê só `NOR` | ADR-011: os códigos são dados |
| Duplo envio | Botão bloqueado | **Trinco síncrono em todas as escritas** (`lib/api/escrita.ts`, `useEscrita`) | **Provado no e2e:** clique duplo em «Emitir documento» com a rede lenta fazia dois `POST …/issue` (seriam dois documentos fiscais). `isPending` só muda depois de o React voltar a desenhar |
| Erros 400 | `title` + `detail` | Quando o `title` é o genérico do ASP.NET, o painel mostra os motivos de `errors` | A emissão recusada mostrava só «One or more validation errors occurred.» |
| Recibos | Ecrã de recibos com criação | Registam-se a partir da factura, um recibo por factura, com o valor em aberto por omissão | A Finance não lê clientes; partir da factura dá o cliente e o saldo certos. Recibos de várias facturas ficam para quando houver pedido |
| Notas de crédito | — | A partir da factura, com as quantidades a creditar (até à quantidade original) e o motivo | — |
| Contas de cliente e documentos partilhados | — | Ficam para a F10 (portal do cliente) | Como no plano |
| Chunk inicial | 150 KB | 149,3 KB; os carregadores das páginas passam para um módulo diferido (`app/paginas.ts`) | Cada `import()` no router deixava no chunk inicial o caminho e a lista de dependências: as 16 rotas da F3 punham-no em 150,2 KB. Agora as rotas novas não pesam no chunk inicial |
| Tempo de espera do e2e | 5 s | 10 s | Três motores em paralelo numa só máquina davam esperas falhadas por carga |
| Retenção na fonte | — | O saldo mostra o recebido em dinheiro, o retido e a «retenção por comprovar»; o recibo tem «Retido na fonte» (sugerido) e aceita um recibo só com retenção | B17 resolvido (PR #101, ADR-083); verificado na base local: em aberto 2 850,29 − 1 000,00 − 162,52 = 1 687,77 |
| Importação CSV | — | `,` ou `;` | B18 resolvido (PR #100); verificado na base local com `;` |
| Contrato | OpenAPI de 2026-10-12 | OpenAPI de 2026-10-13 (`main` @ `01c7d6c`), tirado de uma API local construída num `git worktree` do `origin/main` | O repositório local do backend tinha alterações por gravar de outra sessão: não se mudou de ramo nele |

### F3 — estado

- **Ecrãs:** clientes (lista paginada, inactivos, registo, importação CSV,
  ficha com correcção, estado, eliminar com 409 → desactivar, contactos),
  facturas (emitidas com filtros por cliente e datas; rascunhos), editor de
  rascunho (FT, FR, ND; cliente ou consumidor final; série; moeda; vencimento;
  retenção; meio de pagamento; factura referenciada; linhas; totais previstos;
  emissão confirmada), ficha da factura (linhas e totais do servidor, saldo,
  PDF, envio ao cliente, nota de crédito, recibo, anulação), notas de crédito e
  recibos (listas e fichas com PDF, envio e anulação), pró-formas (lista por
  estado, criação, conversão em FT/FR, anulação), a receber (vencidas, totais
  por moeda) e configuração da facturação (séries, canais, taxas de IVA).
- **Leituras em produção:** todas as rotas `GET` da F3 deram 200 a 2026-10-13
  (incluindo a determinação de `NOR`).
- **Escritas:** verificadas **na base local** (`f3-escritas.spec.ts`), num
  browser real: cliente, rascunho, emissão (com clique duplo: um só
  documento), totais do servidor iguais aos previstos ao cêntimo, PDF, envio
  recusado sem SMTP (501), recibo parcial, nota de crédito e a sua anulação,
  pró-forma convertida em factura-recibo e importação CSV (importado e
  duplicado). Depois de B16–B18: retenção registada no recibo e saldo
  correcto, e importação com `;`. **Nenhum documento fiscal emitido em
  produção.**
- **Testes:** 103 unitários; 50 cenários e2e × 3 motores.

### F4 — o que mudou face ao plano, e porquê

| Tema | Plano | Execução | Porquê |
|---|---|---|---|
| Caixa | `pendingFor` | «À minha espera» (por omissão) usa o colaborador da conta, lido de `/dashboard/me`; «Todos» lista sem filtro; filtro por tipo | `/dashboard/me` não exige permissão. Sem ficha ligada, a caixa própria explica que só um colaborador decide |
| Decidir | `{ action, notes }` | Aprovar, Rejeitar ou Pedir esclarecimento; rejeitar e pedir esclarecimento exigem notas | Quem submeteu lê o motivo |
| Quem pediu | — | Não vê os botões de decisão, mesmo ocupando o cargo aprovador; vê «Cancelar o pedido» | **Encontrado na base local:** a aprovadora promovida a si própria via os botões, e o servidor recusaria sempre (BR-2) |
| 409 | Recarrega e mostra «Outra pessoa decidiu primeiro» | O aviso fica ao nível da página | **Encontrado na base local:** o 409 recarregava, o pedido fechado escondia o cartão e o aviso desaparecia com ele |
| Depois de decidir | B14 | Numa atribuição de cargo, quem pode atribuir cargos antecipa `…/approval-outcome` (melhor esforço; o processo de fundo aplica em 60 s). Os outros processos aplicam-se nos ecrãs das suas fases | B14 respondido: idempotentes |
| Nomes | — | Os nomes e o resumo vêm do próprio pedido; a caixa mostra o resumo por baixo do tipo | B19 resolvido (PR #102, em produção a 2026-10-15). Antes, só quem lia colaboradores via nomes |
| Acessibilidade no e2e | — | O auxiliar do axe afasta o rato e desliga transições antes de medir | O axe media o botão a meio de `transition-colors` depois de mudar o tema e acusava contraste que os estados finais não têm |

### F4 — estado

- **Ecrãs:** caixa de aprovações (à minha espera, todos, por tipo), ficha do
  pedido (estado, passos com modo e prazo, aprovadores, decisões com notas,
  decidir, cancelar o próprio), políticas de aprovação (lista, criar com
  processo, departamento, faixa de valores, verificação de orçamento e passos
  por cargo; desactivar). O contador «Aprovações à sua espera» do Início abre a
  caixa.
- **Leituras em produção:** 469 pedidos e 7 políticas lidos a 2026-10-13, com
  ficha e histórico (200).
- **Escritas:** verificadas **na base local** (`f4-escritas.spec.ts`), com dois
  colaboradores: a atribuição de um cargo com autoridade vai para aprovação
  (202); quem pediu não decide (403, BR-2, também sem botões) e cancela;
  decisão simultânea em duas abas (409, aviso visível); depois da aprovação, o
  cargo fica em vigor no RH. Nenhuma decisão em produção.
- **Testes:** 103 unitários; 57 cenários e2e × 3 motores.
- **Publicada** a 2026-10-15 (`0a08b1a`). Smoke na Vercel com as 9 contas de
  QA e o fluxo F0–F4: 10/10, só leituras. Numa primeira volta com 2 workers,
  o Admin e o Finance viram «Sem ligação ao servidor» numa recarga e passaram
  ao repetir; o teste por perfil passou a ter 120 s (o Admin percorre 17
  páginas).

### F5 — o que mudou face ao plano, e porquê

| Tema | Plano | Execução | Porquê |
|---|---|---|---|
| B12 | Bloqueava a F5 | Resolvido no backend (ADR-080): Finance, Manager e Colaborador carregam ficheiros | — |
| Abrir anexos | — | Só quem lê o arquivo (Admin, HR) abre comprovativos e anexos; os outros vêem a lista e o porquê | `GET /documents/{id}` exige `documents.read` (B20) |
| Contas bancárias | `finance.payables.*` | Lêem com `payables.read` (Finance e Manager) e escrevem com `payables.write`: o **Manager** abre, deposita e levanta; o **Finance** não | Facto do catálogo; está no relatório por perfil |
| Executar | Contas diferentes | Quem pediu **e quem aprovou** não vêem «Executar» e a ficha diz porquê; só contas abertas na moeda do pedido; o aviso de sucesso fica com a página | O servidor recusa os dois (BR-3, 403). **Encontrado na base local:** o aviso desaparecia com o botão quando o pedido ficava pago |
| Pedir | — | Valor até ao que falta pedir (total menos pedidos não cancelados); 202 abre o pedido | O servidor recusa acima do total (409) |
| Fornecedor | — | IBAN verificado pela ISO 13616 no cliente | **Encontrado na base local:** o servidor recusava com 400 só com `detail`, e o formulário não mostrava nada |
| 400 só com `detail` | — | `aplicarErrosDoServidor` devolve o `detail` quando não há mapa de campos: aparece em todos os formulários (F1 a F5) | Mesmo achado |
| Fechar conta | — | A descrição diz que só fecha com saldo zero e quanto tem | Regra do domínio, descoberta na base local |
| Despesas | — | Paginação local (a API devolve a lista inteira); o Finance regista só em seu nome | Não lê colaboradores |
| Portal | — | «Despesas» no menu do colaborador; sem ficha ligada (403) explica em vez de mostrar erro | O portal autoriza pelo vínculo |
| Gráficos | — | Tesouraria só com tabelas | Os números importam mais do que a forma; os gráficos ficam para quando houver uma conclusão a mostrar |
| Orçamento | 150 KB | Chunk inicial a **149,8 KB** | Só a tabela de rotas cresce no chunk inicial; a F6 tem de o aliviar antes de juntar rotas. **Resolvido no início da F6:** o login deixou o react-hook-form (validação própria, mesmo comportamento) e o chunk inicial desceu para **137,0 KB** |

### F5 — estado

- **Ecrãs:** fornecedores (lista, ficha, registo, importação, correcção,
  estado), facturas de compra (lista, ficha, registo, confronto, anular),
  pedidos de pagamento (lista, ficha, pedir, executar, cancelar, anexos),
  despesas (resumo, lista, ficha, registar, aprovar, rejeitar, reembolsar;
  portal: submeter, retirar), contas bancárias (lista, ficha, abrir, depositar,
  levantar, fechar, reabrir, extracto, reconciliação), caixa pequena (fundos,
  movimentos), letras e livranças (lista, ficha, acções por estado), câmbios
  (lista, registo, conversor) e fluxo de caixa (previsto, realizado,
  previsões manuais). Carregamento de ficheiros partilhado.
- **Leituras em produção:** 3 contas, 80 fornecedores, 289 facturas de
  compra, 235 pedidos de pagamento, 148 despesas, fundos de caixa, letras,
  câmbios, previsões e fluxo previsto (456 movimentos) lidos a 2026-10-15
  (200).
- **Escritas:** verificadas **na base local** (`f5-escritas.spec.ts`): o
  ciclo do pagamento com três pessoas (Manager pede e anexa, Admin aprova, o
  Admin e quem pediu recebem 403 ao executar, o Finance executa e o saldo desce
  o valor pago); a despesa submetida no portal com comprovativo, aprovada e
  reembolsada; e a tesouraria inteira (conta, extracto importado, conciliação
  automática e à mão, ignorar, fechar e reabrir, câmbio e conversão, caixa
  pequena com reposição, letra aceite e descontada, previsão criada, revista e
  apagada). **Nenhuma escrita em produção.**
- **Testes:** 108 unitários; 79 cenários e2e × 3 motores.
- **Publicação:** enviada a 2026-10-16 (`a9601b2..e5f6486`); a Vercel
  publicou (`index-Bok-OtO4.js`) e o smoke por perfil em produção passou
  (10/10, só leituras).

### F6 — o que mudou face ao plano, e porquê

- **Carregamento inicial aliviado primeiro:** o login deixou o
  react-hook-form (validação própria, mesmo comportamento). O chunk inicial
  desceu de 149,8 KB para 137,0 KB; com as rotas da F6 está em 137,5 KB.
- **SAF-T entra na F6:** o backend passou a ter `GET /finance/saft-ao`
  (facturação, TaxAccountingBasis F), por isso o B5 está meio resolvido. Em
  produção (e na base local) o servidor recusa por falta de
  `SAFT_PRODUCT_COMPANY_TAX_ID` (B24); o ecrã mostra o motivo. As declarações à
  AGT continuam sem rota.
- **Rotas e menu:** grupo «Contabilidade» (Relatórios financeiros, Impostos,
  Lançamentos, Plano de contas, Períodos, Regras contabilísticas), grupo
  «Planeamento» (Centros de custo, Orçamentos, Previsões de custos) e «Fiscal»
  em Administração. As classes de reporte ficam no plano de contas (é o que
  liga as contas ao balanço) e a antiguidade de saldos nos relatórios.
- **Permissões lidas em produção** (`/identity/me`, 2026-10-16): o Finance tem
  `ledger.read/write`, `reports.read`, `planning.read`, `budgets.approve` e
  `fiscal.*`, mas não `ledger.close` nem `planning.write`; o Manager só
  `planning.read/write`. Logo: o Finance lança mas não fecha períodos nem
  define regras, aprova orçamentos mas não os cria; o Manager cria orçamentos
  mas não os aprova.
- **Nomes de RH no planeamento:** as vistas só trazem ids e nem o Finance nem o
  Manager lêem RH. O front mostra os nomes a quem lê RH, diz «Departamento» e
  «Colaborador» aos outros (nunca o id) e desactiva «Abrir centro» e «Registar
  previsão» para quem não pode escolher (B22).
- **Previsão em rascunho presa:** não há rota para submeter nem rever depois
  (B23); «Submeter já» vem marcado.
- **Peças partilhadas novas:** `ui/Vistas` (separadores no URL, guardam os
  outros filtros), `Confirmar largo` para formulários com linhas.
- **Defeitos corrigidos de passagem:** os diálogos não tinham altura máxima (o
  botão de confirmar ficava fora do ecrã nos formulários grandes); uma tabela
  que transborda passa a receber foco para deslizar pelo teclado
  (`scrollable-region-focusable`); os 404 com detalhe do servidor mostram-no
  («Diário não encontrado.»).
- **Fora da F6:** regras de lançamento automático não se testam na base local
  (mudariam a emissão de facturas dos outros testes).

### F6 — estado

- **Ecrãs:** fiscal (taxas com versões, simulação; IRT com escalões,
  simulação e tabela nova; isenções dos subsídios), relatórios (balancete,
  balanço, resultados, antiguidade), impostos (IVA, retenções, SAF-T),
  lançamentos (lista, ficha, novo, estorno, diários), plano de contas (contas,
  versões, classes de reporte), períodos (abrir, fechar, reabrir), regras
  (lançamento automático, contabilísticas), centros de custo, orçamentos
  (criar, rever, aprovar) e previsões de custos.
- **Leituras em produção:** todas as rotas da F6 com o Admin e o Finance
  (200), o Manager só no planeamento (o resto 403) e a Sales em nenhuma (403),
  a 2026-10-16. Dados reais: 10 centros de custo, 10 orçamentos, 120
  previsões, IVA de Outubro, antiguidade de clientes (1 006 419 588,00 Kz) e de
  fornecedores; o razão ainda está vazio (sem plano de contas carregado).
- **Escritas:** verificadas **na base local** (`f6-escritas.spec.ts`, API em
  `33697a8`): diário, contas (com a recusa de conta debaixo de conta de
  movimento), lançamento em partida dobrada, balancete, estorno, período de
  regularização aberto, fechado e reaberto, classe de reporte criada e
  apagada, versão do plano, regra contabilística criada e desactivada; pauta
  nova com versão fechada e a recusa de uma tabela de IRT sobreposta (sem
  mudar nada); centro de custo, orçamento criado, revisto e aprovado, previsão
  submetida e a recusa da segunda para o mesmo mês. **Nenhuma escrita em
  produção.**
- **Incidente na base local:** uma primeira versão do teste fechou por engano a
  versão do INSS patronal (dois botões com o mesmo nome). Reposta com uma
  versão igual desde 2021-01-01; os botões passaram a ter nomes únicos.
- **Testes:** 124 unitários; interface 12 cenários F6 × 3 motores (36); a
  suite inteira 277 + 5 instáveis sob carga que passam ao repetir.
- **Publicada** a 2026-10-16 (`58c7892`, `5d06c6f`, `2ea42de`): CI verde e
  smoke de produção por perfil 10/10, só leituras, com os ecrãs e menus da F6.

### F7 — divisão em três blocos

A F7 tem perto de 110 rotas. Sai em três blocos, cada um com commit e
verificação próprios: **F7a** portal do colaborador; **F7b** RH do dia-a-dia na
gestão (ficha completa com dados pessoais e imigração, documentos, contratos,
assiduidade, férias e saldos, benefícios, organograma); **F7c** recrutamento,
admissões e saídas, anúncios, pedidos internos, formação, turnos, declarações,
desempenho, conquistas e importação.

### F7a — portal do colaborador (estado)

- **Ecrãs** (`/eu`, só autenticação; o servidor decide pela conta): início com
  resumo (férias por gozar, próximo turno, pedidos em aberto, anúncios),
  anúncios, assiduidade (justificar falta), férias (saldo, pedidos, pedir),
  turnos (janela até 93 dias, pedir e cancelar troca), recibos (PDF), documentos
  (descarregar) e declarações (emitir com confirmação), pedidos internos (abrir,
  conversa, responder), formação, objectivos (registar valor) e conquistas,
  bens à guarda. Menu agrupado: «O meu tempo», «Documentos», «Pedidos»,
  «Desenvolvimento».
- **B13 resolvido** no backend (ADR-080): `GET /portal/me/documents/{id}` e
  `GET /portal/me/payslips/{itemId}/document`. Lido em produção com a conta
  Colaborador (recibo e documento em PDF; id alheio dá 404).
- **Emitir uma declaração é escrita** (regista, com código de verificação):
  só depois de confirmar, e verificada só na base local.
- **B25 pedido:** o portal não retira um pedido de férias pendente.
- **Peças partilhadas novas:** `rh/estados.tsx` (nomes e estados do RH, para o
  portal e para a F7b/F7c), janela de datas no URL e barra de progresso.
- **Leituras em produção:** todas as rotas do portal com a conta Colaborador
  (200, com dados reais), a 2026-10-16. Só o Admin e o HR têm permissões de RH.
- **Escritas:** verificadas **na base local** (`f7-escritas.spec.ts`): falta
  justificada, pedido de férias (recusa sem política com o motivo do servidor;
  depois, com política e ocupante no cargo, fica por decidir), troca de turno
  pedida e cancelada, pedido interno aberto e respondido, progresso registado,
  declaração emitida (registada com código). **Nenhuma escrita em produção.**
- **Testes:** 132 unitários; interface 9 cenários F7 × 3 motores (27); suite
  inteira 302 + 7 instáveis sob carga que passam ao repetir.
- **Publicada** a 2026-10-16 (`5146bbb`, `e2cda82`): CI verde e smoke de
  produção por perfil 10/10, só leituras, com o menu novo do Colaborador.

### F7b — RH do dia-a-dia na gestão (estado)

- **Ecrãs** (grupo «Pessoas»): organograma, contratos, assiduidade, férias e
  ausências (pedidos e saldos), benefícios (adesões e catálogo), validades de
  imigração. A ficha do colaborador passa a ter separadores, cada um só para
  quem o lê: resumo, dados pessoais (com a imigração), documentos, contratos,
  férias, assiduidade, benefícios.
- **Dados pessoais (§7.6):** nada se pede até «Ver dados pessoais»; a query tem
  `gcTime: 0`; os números (NIF, BI, INSS, conta, IBAN, passaporte, visto,
  autorização) aparecem mascarados com «Mostrar» por campo, que volta a
  mascarar ao fim de 60 s. O `PUT` substitui tudo, por isso o formulário parte
  do gravado e envia todos os campos. Peça nova: `ui/Mascarado`.
- **Permissões lidas em produção** (2026-10-16): só o Admin e o HR têm RH; o
  Manager recebe 403 no organograma e nos contratos.
- **B26 pedido:** contratos de um colaborador com `page` dão 500; a ficha pede
  sem paginação.
- **Leituras em produção:** organograma (62 activos), contratos, assiduidade,
  férias, saldos, benefícios, adesões, imigração e documentos com a conta HR
  (200); dos dados pessoais só o código de resposta, sem ler os valores.
- **Escritas:** verificadas **na base local** (`f7b-escritas.spec.ts`, conta
  Admin local, ficha nova): contrato celebrado e cessado, entrada e saída
  marcadas, falta, direito 22 + 2,5 dias, pedido em nome (com política e
  ocupante só para a corrida), «ver decisão» que ainda espera, pedido
  retirado, benefício criado, adesão e cancelamento, dados pessoais com IBAN
  mascarado, imigração na lista de validades, documento anexado e retirado.
  **Nenhuma escrita em produção.**
- **Testes:** 138 unitários; interface 9 cenários F7b × 3 motores (27); suite
  inteira 336, sem instáveis.
- **Publicada** a 2026-10-16 (`d80afe6`, `458f484`, com o B25 em `0a96f3b`):
  CI verde, Vercel em produção com `0a96f3b`, smoke de produção por perfil
  10/10, só leituras, com os menus novos do Admin e do HR.

### B25 resolvido (portal, 2026-10-16)

- O backend publicou `POST /portal/me/leave/{leaveId}/cancellation` (PR #106).
  O portal mostra «Retirar» nos pedidos por decidir, com confirmação; o 409
  (pedido já decidido) aparece com o motivo do servidor. O saldo actualiza-se.
- `openapi/v1.json` actualizado de produção (`64e6a8b`). Traz também B20 a B23
  (PR #105, ADR-085), ainda por usar no front; as fixtures da F6 ganharam os
  campos novos a `null`.
- API local passou a `64e6a8b`. Escritas F7 e F7b verificadas na base local
  (o pedido fica `Cancelled` no servidor); interface F7 30 testes × 3 motores.

### F7c — resto do RH na gestão (estado)

Em quatro blocos, cada um com commit e verificação: (1) recrutamento e
entradas/saídas; (2) anúncios e pedidos internos; (3) formação e turnos;
(4) declarações, desempenho, conquistas e importação. Menu novo «Talento».

**Bloco 1 — recrutamento, entradas e saídas** (publicado a 2026-10-17,
`f98a251`: CI verde, Vercel, smoke de produção 10/10)
- **Ecrãs:** `/recrutamento` (vagas), `/recrutamento/:openingId` (vaga e
  funil; não há GET de uma vaga, lê-se da lista), `/entradas-saidas`
  (processos em cartões, com as tarefas). Permissões: `hr.recruitment.*`,
  `hr.lifecycle.*`; contratar exige `hr.employees.write`.
- **Regras do domínio** levadas para o front: o funil avança um passo de cada
  vez e contrata-se só da proposta; um processo recebe as tarefas ao começar
  (não há rota para juntar depois) e sem tarefas nunca se conclui — por isso o
  front exige pelo menos uma; uma saída exige o último dia.
- **Leituras em produção** (HR, 2026-10-17): 6 vagas, 33 candidatos, 5
  processos (200); Manager 403. Categorias de tarefa usadas: hr, it, assets,
  finance. Dos candidatos só as contagens, sem nomes nem contactos.
- **Escritas:** verificadas **na base local** (`f7c-escritas.spec.ts`, conta
  Admin): vaga aberta, dois candidatos, um rejeitado e outro levado à proposta
  e contratado (ficha criada no departamento da vaga), entrada iniciada a
  partir da contratação com duas tarefas, ambas feitas, processo concluído,
  vaga fechada; tudo conferido no servidor. **Nenhuma escrita em produção.**
- **Testes:** 143 unitários; interface 6 cenários × 3 motores; suite inteira
  360, sem instáveis.

**Bloco 2 — anúncios e pedidos internos** (publicado a 2026-10-17,
`8d60836`: CI verde, Vercel, smoke de produção 10/10)
- **Ecrãs:** `/anuncios` (gestão; `hr.announcements.write`), `/pedidos-internos`
  (fila e, em `?vista=prazos`, o SLA; `hr.tickets.read`) e
  `/pedidos-internos/:ticketId`. Menu novo «Serviços».
- **Factos:** a lista de pedidos não é paginada; a resposta da equipa é a
  primeira resposta do SLA; atribuir põe um pedido aberto em curso; fechado não
  aceita nada; SLA em minutos (o front mostra e pede horas, até 2 casas, em
  minutos inteiros); anúncios ao dia em Luanda (`inicioDoDiaEmLuanda`) e a
  correcção mantém a hora original se o dia não mudou.
- **Correcção partilhada:** os filtros no URL partem de `window.location.search`
  e não do último render — o React Router aplica as navegações em transição e
  duas escolhas seguidas apagavam a primeira (visto no webkit). Aplicado à fila
  de pedidos, ao filtro de colaborador (`escolhas.tsx`) e ao tipo das entradas
  e saídas.
- **Leituras em produção** (HR, 2026-10-17): 8 anúncios, 41 pedidos, 7
  políticas de SLA (200); Manager 403. Dos pedidos só contagens.
- **Escritas:** verificadas **na base local** (`f7c-servicos-escritas.spec.ts`,
  conta Admin): anúncio publicado, corrigido (fixado) e arquivado; pedido
  aberto em nome de um colaborador novo, respondido, atribuído, resolvido e
  fechado (conferido no servidor, com a primeira resposta); prazo de «Outro»
  mudado e reposto no fim. **Nenhuma escrita em produção.**
- **Testes:** 148 unitários; interface 5 cenários × 3 motores; suite inteira
  375, sem instáveis.

**Bloco 3 — formação e turnos** (publicado a 2026-10-17, `5135cf2`: CI
verde, Vercel, smoke de produção 10/10)
- **Ecrãs:** `/formacao` e `/formacao/:courseId` (não há GET de uma formação:
  lê-se da lista com as canceladas); `/turnos` com três vistas — escala
  (janela no URL, por omissão 7 dias, máximo 94), pedidos de troca (por
  decidir por omissão) e tipos de turno. «Formação» no grupo Talento, «Turnos»
  em Pessoas. Permissões `hr.training.*` e `hr.shifts.*`.
- **Factos:** escalar substitui o turno do dia (a resposta traz
  `replacedAssignmentId`, e o ecrã diz quantos foram substituídos); aprovar uma
  troca passa o turno ao colega ou liberta-o; horas `HH:mm:ss`; custo e horas
  em texto (`paraApi`, `decimalParaApi`).
- **Leituras em produção** (HR, 2026-10-17): 10 formações, 74 inscrições, 4
  tipos de turno (Manhã, Administrativo, Tarde, Noite), pelo menos 200 turnos
  nos próximos 30 dias, nenhum pedido de troca (200); Manager 403.
- **Escritas:** verificadas **na base local** (`f7c-tempo-escritas.spec.ts`):
  formação com lotação 1 (inscrição, lotada, concluída com avaliação 87,5 e
  certificado com validade), outra com inscrição e formação canceladas; tipo de
  turno criado e corrigido (desactivado no fim); escala de dois dias, um
  substituído e outro tirado; troca pedida pelo portal (conta Colaborador
  local, pela API) e aprovada pela interface — o turno passou ao colega.
  **Nenhuma escrita em produção.**
- **Testes:** 152 unitários; interface 6 cenários × 3 motores; suite inteira
  393 (uma corrida com um timeout de carga no webkit, que passou isolado 5× e
  na segunda corrida inteira do webkit).

**Bloco 4 — declarações, desempenho, conquistas e importação** (publicado a
2026-10-17, `f2cbd28`: CI verde, Vercel, smoke de produção 10/10). Fecha a
F7c e a F7 no front.
- **Ecrãs:** `/declaracoes` (emitidas, modelos, verificar; emitir),
  `/desempenho` (ciclo no URL, objectivos e resultados-chave), `/conquistas`
  (catálogo, classificação, atribuir), «Importar CSV» em `/colaboradores`, e
  na ficha os separadores Conquistas e Declarações. «Desempenho» e
  «Conquistas» no grupo Talento; «Declarações» em Serviços.
- **Factos:** emitir uma declaração é um GET que regista (PDF com código) —
  só depois de confirmar e verificado só na base local; o código ignora
  hífenes, espaços e maiúsculas; marcadores fechados
  (`ManageDeclarations.Placeholders`); ciclo fechado deixa os objectivos só de
  leitura; conquistas uma vez por pessoa (409).
- **Peças partilhadas** movidas para `src/ui`: `ResultadoImportacao` (de
  `pagar/comum`) e `BarraProgresso`/`percentagemBarra` (do portal, que as
  reexporta).
- **Leituras em produção** (HR, 2026-10-17): 3 modelos, nenhuma declaração
  emitida, 1 ciclo em curso com 39 objectivos, 8 conquistas e a classificação
  (200); Manager 403. Nada emitido em produção.
- **Escritas:** verificadas **na base local** (`f7c-talento-escritas.spec.ts`):
  modelo criado, declaração emitida pela ficha e o código verificado (com
  hífenes e minúsculas); ciclo planeado, corrigido, objectivo com peso 60,
  resultado-chave, valor 2,5, iniciado e fechado (só de leitura); conquista
  criada, atribuída pela ficha e a repetida recusada; CSV com uma linha
  importada e outra recusada. Modelo e conquista desactivados no fim.
  **Nenhuma escrita em produção.**
- **Testes:** 158 unitários; interface 4 cenários × 3 motores; suite inteira
  405, sem instáveis.

### F9 — Compras, inventário e activos (estado)

Em três blocos: (1) compras; (2) inventário; (3) activos fixos.

**Bloco 1 — compras** (2026-10-17, por publicar)
- **Ecrãs:** `/requisicoes` e `/requisicoes/:id` (abrir, submeter, ver
  decisão, cancelar; emitir ordens da aprovada), `/encomendas` e
  `/encomendas/:id` (linhas com o que falta, recepções, registar, anular,
  cancelar), `/recepcoes`. Menu novo «Compras», antes de Pagamentos.
- **Permissões lidas em produção** (2026-10-17): Admin tudo; Manager
  requisições e ordens (lê recepções); Finance lê ordens e recepções;
  AssetManager lê ordens e regista recepções. Os três sem RH (B29).
- **Regras:** requisitante e quem recebe vêm da conta (ADR-057; os campos
  `…ByEmployeeId` vão a `null`); ordem só de aprovada, até ao aprovado menos o
  já encomendado; recepção sem passar o que falta; cancelar a ordem só sem
  mercadoria. Quantidades até 4 casas, preços até 2, totais em Big.
- **B29 e B30 pedidos:** nomes nas vistas; ordem das linhas (o front ordena
  pelo id para ser estável).
- **Leituras em produção** (Admin, 2026-10-17): 120 requisições (90
  aprovadas), 75 ordens, 69 recepções, tudo em AOA (200).
- **Escritas:** verificadas **na base local** (`f9-compras-escritas.spec.ts`,
  3 corridas seguidas): conta Manager ligada a uma ficha abre e submete; o
  Admin, com cargo que aprova e política só da corrida, aprova; o Manager vê
  a decisão e emite a ordem (acima do aprovado recusado no front); o Admin
  regista uma recepção parcial, anula-a, regista o resto; a ordem com
  mercadoria não se cancela (409 com o motivo). **Nenhuma escrita em
  produção.**
- **CI:** duas corridas seguidas com dezenas de repetições por tempo (420
  testes, 2 vCPU). No CI, espera 20 s, teste 60 s e duas repetições
  (`23d366b`).
- **Testes:** 167 unitários; interface 6 cenários × 3 motores; suite inteira
  438, sem instáveis.

### F8 — Salários (estado)

**Publicada a 2026-10-17** (`5763d7d`: CI verde, Vercel, smoke de produção
10/10).
- **Trave do ADR-049:** aceite a 2026-09-04 (parecer fiscal profissional
  confirmou os valores implementados, sem alterações). O utilizador confirmou
  a 2026-10-17: «sim, pode dar a F8 por publicável».
- **CI:** a primeira corrida falhou por tempo (51 instáveis, 2 falhas em F3 e
  F6, que passaram 6/6 localmente); repetido o job, passou 420/420 em 11 min.
- **Ecrãs:** `/salarios` (folhas, abrir) e `/salarios/:runId` (totais, itens,
  juntar, submeter, ver decisão, recibos). Menu «Salários › Folhas de
  pagamento». Só o Admin e o HR têm `payroll.runs.*` (lido em produção).
- **Regras:** o front não calcula impostos — IRT, INSS e líquido vêm do
  servidor; os subsídios são parte do bruto (soma ≤ bruto); totais somados em
  Big; o bruto pode vir do contrato em vigor (em AOA).
- **B27 e B28 pedidos:** o servidor aceita duas folhas no mesmo mês e o mesmo
  colaborador duas vezes, e não deixa tirar um item; o front avisa.
- **Peças:** `rh/index` passa a exportar `SelectColaborador`,
  `useNomeColaborador` e `useContratos`.
- **Leituras em produção** (HR, 2026-10-17): 13 folhas (12 aprovadas, a de
  Outubro em rascunho) (200). Dos itens, só contagens.
- **Escritas:** verificadas **na base local** (`f8-escritas.spec.ts`): conta HR
  ligada a uma ficha abre a folha de um mês futuro, junta dois colaboradores
  (subsídios acima do bruto recusados; o líquido do servidor confere com bruto
  − IRT − INSS), submete; o Admin, com cargo que aprova e política só da
  corrida, aprova em Aprovações; o HR vê a decisão e anexa o recibo (conferido
  no servidor). **Nenhuma escrita em produção.**
- **Testes:** 162 unitários; interface 5 cenários × 3 motores; suite inteira
  420, sem instáveis.

### B20 a B23 resolvidos (finanças, 2026-10-16)

- **B20:** o comprovativo abre por `GET /finance/expenses/{id}/receipt` e os
  anexos do pedido por `…/payment-requests/{id}/documents/{linkId}/content`;
  quem abre a ficha já tem a leitura que a rota pede, por isso o botão
  aparece a todos. Deixou de se usar `/documents/{id}` nestes ecrãs.
- **B21:** IBAN repetido dá 409 com o motivo, mostrado no diálogo (base local).
- **B22:** listas com `departmentName`, `responsibleName` e `approvedByName`;
  um nome `null` com id mostra «Removido». Escolhas de quem escreve no
  planeamento por `GET /finance/planning/lookups` (Manager 200, Finance 403 em
  produção: o Finance só lê). O Manager passa a abrir centros e a registar
  previsões; o front deixou de pedir listas de RH no planeamento.
- **B23:** «Rever» e «Submeter» nas previsões em rascunho (só com
  `finance.planning.write`).
- **Verificação:** interface 342 × 3 motores, sem instáveis; escritas F5 e F6
  na base local (`64e6a8b`), com o rascunho revisto e submetido e o IBAN
  repetido recusado. Leituras em produção: só códigos.
