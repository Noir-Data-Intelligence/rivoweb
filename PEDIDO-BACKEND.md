# Pedidos ao backend

> 2026-10-13 · Do front de produção (`y-jr/rivoweb`) para a API.

## 1. CORS para o front novo

**Origem a acrescentar:** `https://rivoweb-coral.vercel.app`

- Acrescentar a `CORS_ALLOWED_ORIGINS` **sem retirar**
  `https://rivo.noirdataintelligence.com`, que continua em uso até o front novo
  estar completo.
- `FRONTEND_BASE_URL` **não muda** por agora (os convites e a recuperação
  continuam a abrir no front antigo).
- Sem curingas: nada de `localhost` nem URLs de preview da Vercel.

**Como confirmar:**

```sh
curl -s -i -H "Origin: https://rivoweb-coral.vercel.app" https://syyt.tech/health | grep -i access-control-allow-origin
```

## 2. Nome duplicado de departamento ou cargo devolve `500`

Criar um departamento com um nome que já existe responde **500**. No log:

```
SqlException: Cannot insert duplicate key row in object 'hr.department'
with unique index 'ix_department_name'.
```

O cargo tem o mesmo índice único (`position.HasIndex(p => p.Name).IsUnique()`)
sem tratamento, e o `PUT` de um ou de outro para um nome já usado também deve
falhar da mesma forma.

**Pedido:** responder `409` com Problem Details e um `detail` legível (por
exemplo «Já existe um departamento com este nome.») em `POST` e `PUT` de
`/hr/departments` e `/hr/positions`. Vale a pena rever outros índices únicos
sem tratamento, como o dos benefícios (`benefit.HasIndex(b => b.Name)`).
