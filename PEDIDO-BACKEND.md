# Pedidos ao backend

> 2026-10-13 · Do front de produção (`y-jr/rivoweb`) para a API.
> Revisto contra `main` @ `4f48955` (PRs #94 a #98 fundidos). O resto do que
> foi pedido já está atendido e publicado.

## B15 — Nome duplicado de departamento ou cargo devolve `500`

**Estado:** em aberto (nada em `main` trata o caso).

Criar um departamento com um nome que já existe responde **500** («Ocorreu um
erro no servidor»). No log da API local:

```
SqlException: Cannot insert duplicate key row in object 'hr.department'
with unique index 'ix_department_name'.
```

O cargo tem o mesmo índice único (`position.HasIndex(p => p.Name).IsUnique()`
em `HrDbContext.cs`), também sem tratamento. Corrigir (`PUT`) um ou outro para
um nome já usado cai no mesmo erro.

**Pedido:** responder `409` com Problem Details e um `detail` legível (por
exemplo «Já existe um departamento com este nome.») em `POST` e `PUT` de
`/hr/departments` e `/hr/positions`. Vale a pena rever outros índices únicos
sem tratamento, como o dos benefícios (`benefit.HasIndex(b => b.Name)`).

**No front, até lá:** o formulário avisa antes de enviar se o nome já existe na
lista carregada (até 200 registos). Não cobre duas pessoas a criar o mesmo nome
ao mesmo tempo.
