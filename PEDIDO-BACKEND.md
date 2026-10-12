# Pedidos ao backend (D14)

> 2026-10-13 · Do front de produção (`y-jr/rivoweb`) para a API (`y-jr/rivo-api`).
> O B12 e o B13 já estão resolvidos nos PRs #96 e #97 (ADR-080). Ficam estes
> quatro, por ordem de impacto.

## 1. Expor `Retry-After` e `Content-Disposition` no CORS (B1, B2)

**Onde:** `src/Rivo.Api/Cors/BrowserClientCors.cs`, em `WithExposedHeaders`.
Hoje (Verificado): `WWW-Authenticate, X-Page, X-Page-Size, X-Total-Count`.

**Pedido:** acrescentar `Retry-After` e `Content-Disposition`.

**Porquê:**
- Sem `Retry-After`, o browser não lê quanto tempo falta num `429`. O front
  mostra «Tente dentro de alguns minutos», sem contagem.
- Sem `Content-Disposition`, o front inventa o nome dos ficheiros descarregados
  (facturas, recibos, SAF-T). Com ele usa o nome do servidor, depois de o
  sanitizar.

**Como confirmar:**

```sh
curl -s -i -H "Origin: https://rivo.noirdataintelligence.com" https://syyt.tech/health | grep -i access-control-expose
```

## 2. Motivo do fim de sessão no `401` (B3)

**Hoje (Verificado):** corpo vazio, `WWW-Authenticate: Bearer error="invalid_token"`.

**Pedido:** distinguir o motivo, de preferência em `error_description` do
`WWW-Authenticate`, que já está exposto. Valores sugeridos:

| Motivo | `error_description` |
|---|---|
| Inactividade (ADR-067) | `idle_timeout` |
| Prazo absoluto | `expired` |
| Revogada pelo próprio, por logout noutro sítio ou mudança de password | `revoked` |
| Perfil retirado ou conta desactivada (ADR-070) | `account_changed` |

**Porquê:** o front mostra hoje «A sessão terminou. Entre de novo.» e só sabe
dizer «por inactividade» quando foi o seu próprio relógio a detectá-la.

**Restrição já respeitada pelo front:** os `401` de negócio (por exemplo «A
password actual não confere» em `POST /identity/me/password`) vêm como Problem
Details **sem** `WWW-Authenticate` e não terminam a sessão. Peço que esta
distinção se mantenha.

## 3. Quem chama `…/approval-outcome` e `…/decision` (B14)

Rotas nos módulos de origem, por exemplo
`POST /hr/position-assignments/{assignmentId}/approval-outcome`.

**Perguntas:**
1. O front alguma vez as chama depois de decidir em
   `/approval/requests/{id}/decision`, ou são internas (reconciliação, ADR-058)?
2. Se o front as pode chamar, são idempotentes? O que devolvem se a decisão já
   estiver aplicada?

**Porquê:** define se a caixa de aprovações (F4) faz uma chamada ou duas, e
como se recupera de uma falha a meio.

## 4. CORS para o novo domínio (§9.2 do plano)

Só quando o primeiro deploy na Vercel existir. O nome do projecto define o
domínio, e o pedido com o URL exacto segue nessa altura. Fica já registado:

- **Origem:** acrescentar a nova origem a `CORS_ALLOWED_ORIGINS` sem retirar
  `https://rivo.noirdataintelligence.com`, que continua em uso até o front novo
  estar completo (D6).
- **Convites e recuperação:** `FRONTEND_BASE_URL` **não muda** até lá.
- **Sem curingas:** não acrescentar `localhost` nem URLs de preview.
