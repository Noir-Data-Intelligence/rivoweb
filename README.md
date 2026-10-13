# Rivo — front de produção

SPA em React, TypeScript e Vite para a Rivo Suite. A API é `https://syyt.tech`.
O plano completo (arquitectura, segurança, fases) está em [`PLANO.md`](PLANO.md);
os pedidos pendentes ao backend estão em [`PEDIDO-BACKEND.md`](PEDIDO-BACKEND.md);
o que cada perfil pode fazer está em [`FUNCIONALIDADES.md`](FUNCIONALIDADES.md),
actualizado no fim de cada fase.

## Arranque local

```sh
npm ci
cp .env.example .env.local   # VITE_API_URL=http://localhost:5080
npm run dev                  # http://localhost:5173
```

A API local tem de ter `CORS_ALLOWED_ORIGINS=http://localhost:5173` (já é o
valor do compose de desenvolvimento do backend).

**Produção é o único ambiente com dados reais.** Escritas testam-se só contra a
API local em Docker (D1). Contra produção, só leituras.

## Comandos

| Comando | O quê |
|---|---|
| `npm run check` | Lint (com as regras de segurança), tipos, testes unitários, tokens da IV, tipos da API |
| `npm run build` | Build de produção + verificação do bundle (sem source maps, sem URLs de terceiros, orçamento do chunk inicial) |
| `npm run e2e` | Interface em Chromium, Firefox e WebKit: o build servido com os cabeçalhos do `vercel.json` e a API simulada (só em `tests/`). Antes: `VITE_API_URL=http://localhost:5080 npx vite build` |
| `npm run smoke:leitura` | Contra produção, sem browser: login, `GET` da F0 e da F1, logout. Lê `RIVO_PROD_*` do `.env.local`. Bloqueia qualquer outro método |
| `npx playwright test --project=escritas-local` | Escritas contra a **API local** em Docker, num browser real. Pressupõe o build com `VITE_API_URL=http://localhost:5080` servido em `:5173` (`PORT=5173 API_TESTE=http://localhost:5080 npm run serve:dist`), e `RIVO_ESCRITAS_LOCAL=1`, `RIVO_LOCAL_EMAIL` e `RIVO_LOCAL_PASSWORD` (a conta de bootstrap do `.env` da API local). Aborta qualquer pedido fora de `localhost` |
| `npm run e2e:producao` | O mesmo no browser, contra o front publicado (`RIVO_FRONT_URL`, `RIVO_SMOKE_PRODUCAO=1`). Com `RIVO_QA_CONTAS=<ficheiro de contas de QA>` corre também um smoke por perfil: menu exacto e páginas sem erro. O ficheiro fica fora do repositório |
| `npm run api:types` | Regenera `src/lib/api/schema.d.ts` a partir de `openapi/v1.json` (ver [`openapi/README.md`](openapi/README.md)) |

## Regras que o CI impõe

- O token nunca vai para `localStorage`, cookies nem IndexedDB. Fica em memória e,
  por decisão D3, em `sessionStorage`.
- Não há `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `iframe` nem `window.open`.
- Nos URLs só vão ids, nunca dados pessoais.
- Não há dados fictícios no produto: MSW e fixtures vivem só em `tests/`.
- Não há cores literais nos componentes: tudo vem dos tokens de `identidade/`, copiados byte a byte.
- Os tipos da API são gerados e nunca se editam à mão.
- O dinheiro nunca é `number`: usa-se `big.js` na fronteira e sobe para a API como texto decimal.

## Vercel

O `vercel.json` traz a CSP e os cabeçalhos. As variáveis de ambiente são estas:

| Variável | Production | Preview |
|---|---|---|
| `VITE_API_URL` | `https://syyt.tech` | *(não definir: sem API, D10)* |

A Vercel não aceita variáveis vazias: num Preview, a ausência de `VITE_API_URL`
vale como vazio. Em Production a ausência faz falhar o build.

Node: 24 em Settings → General (o aviso sobre `engines` é inofensivo). Desligar Vercel Analytics, Speed Insights e Toolbar. O primeiro deploy publica a
fundação; o login só funciona depois de a origem entrar no CORS da API
(`PEDIDO-BACKEND.md`, ponto 4).
