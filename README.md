# Rivo — front de produção

SPA em React, TypeScript e Vite para a Rivo Suite. A API é `https://syyt.tech`.
O plano completo (arquitectura, segurança, fases) está em [`PLANO.md`](PLANO.md);
os pedidos pendentes ao backend estão em [`PEDIDO-BACKEND.md`](PEDIDO-BACKEND.md).

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
| `npm run smoke:leitura` | Contra produção, sem browser: login, `GET` da F0, logout. Lê `RIVO_PROD_*` do `.env.local`. Bloqueia qualquer outro método |
| `npm run e2e:producao` | O mesmo no browser, contra o front publicado (`RIVO_FRONT_URL`, `RIVO_SMOKE_PRODUCAO=1`). Só depois do pedido de CORS |
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
| `VITE_API_URL` | `https://syyt.tech` | *(vazio: sem API, D10)* |

Desligar Vercel Analytics, Speed Insights e Toolbar. O primeiro deploy publica a
fundação; o login só funciona depois de a origem entrar no CORS da API
(`PEDIDO-BACKEND.md`, ponto 4).
