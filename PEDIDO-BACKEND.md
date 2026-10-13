# Pedidos ao backend (D14)

> Actualizado a 2026-10-13 · Do front de produção (`y-jr/rivoweb`) para a API.
> O B12 e o B13 estão resolvidos no PR #96 (ADR-080). Os pontos 1 a 3 já estão
> resolvidos nos ramos `fix/bloqueios-do-front` e `fix/motivo-do-401`, mas
> ainda não foram publicados. O front já os usa quando existirem e funciona sem
> eles até lá.

## Estado

| # | Pedido | Estado (Verificado no código e na API local) |
|---|---|---|
| 1 | Expor `Retry-After` e `Content-Disposition` (B1, B2) e `ETag` (B8) | Resolvido no ramo; **por publicar** |
| 2 | Motivo do fim de sessão no `401` (B3) | Resolvido no ramo (ADR-082); **por publicar**. O front ainda não o lê (fica para a próxima fase) |
| 3 | Quem chama `…/approval-outcome` (B14) | Respondido em `API-FRONTEND.md`: idempotentes; nas atribuições de cargo, um processo de fundo aplica a cada 60 s e o front pode antecipar. A ficha do colaborador já tem «Verificar decisão» |
| 4 | CORS para o novo domínio | À espera do domínio da Vercel |
| 5 | **Nome duplicado devolve 500 (B15)** | **Novo**, ver abaixo |

## 5. Nome duplicado de departamento ou cargo devolve `500` (B15)

**Facto (base local, `fix/motivo-do-401` @ 059c5b1):** criar um departamento
com um nome que já existe responde **500** («Ocorreu um erro no servidor»). No
log:

```
DbUpdateException → SqlException: Cannot insert duplicate key row in object
'hr.department' with unique index 'ix_department_name'.
```

O cargo tem o mesmo índice (`HrDbContext.cs`: `position.HasIndex(p => p.Name).IsUnique()`)
e o caso também não é tratado. A correcção (`PUT`) de um ou de outro para um
nome já usado deve dar o mesmo resultado.

**Pedido:** responder `409` com Problem Details e um `detail` legível, por
exemplo «Já existe um departamento com este nome.», em `POST` e `PUT` de
`/hr/departments` e `/hr/positions`. Vale a pena rever os outros índices únicos
sem tratamento (por exemplo os benefícios, `benefit.HasIndex(b => b.Name)`).

**No front, até lá:** o formulário avisa antes de enviar se o nome já existe na
lista carregada (até 200). Isto não cobre corridas entre duas pessoas.

## 4. CORS para o novo domínio (§9.2 do plano)

Só quando o primeiro deploy na Vercel existir. O nome do projecto define o
domínio, e o pedido com o URL exacto segue nessa altura. Fica já registado:

- **Origem:** acrescentar a nova origem a `CORS_ALLOWED_ORIGINS` sem retirar
  `https://rivo.noirdataintelligence.com`, que continua em uso até o front novo
  estar completo (D6).
- **Convites e recuperação:** `FRONTEND_BASE_URL` **não muda** até lá. Por isso
  um convite enviado do front novo abre ainda no front antigo.
- **Sem curingas:** não acrescentar `localhost` nem URLs de preview.

## Referência: pedidos já resolvidos

### 1. `Retry-After`, `Content-Disposition` e `ETag` no CORS

`BrowserClientCors.cs`, `WithExposedHeaders`. Confirmar depois de publicado:

```sh
curl -s -i -H "Origin: https://rivo.noirdataintelligence.com" https://syyt.tech/health | grep -i access-control-expose
```

Hoje em produção: `WWW-Authenticate, X-Page, X-Page-Size, X-Total-Count`. Na API
local, com o ramo: mais `ETag, Retry-After, Content-Disposition`.

### 2. Motivo do fim de sessão (`error_description`)

`idle_timeout`, `expired`, `revoked`, `account_changed`. Os `401` de negócio
continuam sem `WWW-Authenticate` e não terminam a sessão; o front depende desta
distinção.
