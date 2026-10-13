# Pedidos ao backend

> 2026-10-13 · Do front de produção (`y-jr/rivoweb`) para a API.

## Nome duplicado de departamento ou cargo devolve `500`

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
