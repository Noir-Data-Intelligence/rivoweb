# Contrato da API

`v1.json` é o OpenAPI do backend (`Noir-Data-Intelligence/rivo-api`). `src/lib/api/schema.d.ts`
gera-se dele com `npm run api:types` e **nunca se edita à mão** (o CI corre
`npm run api:check`).

## Origem do ficheiro actual

| | |
|---|---|
| Data | 2026-11-13 |
| Commit do backend | `8e9e904` (`main`, merge do PR #165: o pró-rata do IVA; inclui o #149 a #164 — órgãos sociais, IVA não dedutível, reembolso e adiantamentos de salário, actualização cambial das despesas, nota de crédito ao câmbio da factura, regularização de existências, imposto industrial, conta do custo na despesa, BR-3 no IRT e no INSS, quebras e sobras —, o #148, o seed com o IVA em duas prestações, o #147, os salários e as entregas ao Estado em partes, o #146, quem aprova a folha não paga os salários, o #145, a compra de imobilizado nas contas próprias, o #144, a factura que vende um activo, o #141, actualização cambial dos clientes e fornecedores, o #142, mercado nacional e estrangeiro, e o #143, a FR em moeda estrangeira ao cêntimo; antes, o #134 a #140) |
| Operações | 529 caminhos |
| Como | API local em Docker construída a partir de um `git worktree` do `origin/main` (`EXPOSE_OPENAPI=true`); `curl http://localhost:5080/openapi/v1.json` |

O OpenAPI está desligado em produção (`GET https://syyt.tech/openapi/v1.json` →
404), por isso o ficheiro vem sempre de uma API local no **mesmo commit** que o
deploy publicou.

O deploy de produção é publicado a partir do `main` do backend.

## Actualizar

```sh
# no repositório da API, no commit publicado
export OpenApi__Expose=true ASPNETCORE_URLS=http://localhost:5181 \
  ConnectionStrings__Rivo='Server=localhost,14330;Database=RivoOpenApi;User Id=sa;Password=…;TrustServerCertificate=True' \
  Database__MigrateOnStartup=true Bootstrap__SeedOnStartup=false Jwt__SigningKey=<aleatória> \
  Jwt__Issuer=rivo-api Jwt__Audience=rivo-client
dotnet run --project src/Rivo.Api -c Release --no-launch-profile

# no front
curl -s http://localhost:5181/openapi/v1.json -o openapi/v1.json
npm run api:types
```

Actualize a tabela acima (data e commit). Um diff no `v1.json` revê-se como
mudança de contrato. Onde o OpenAPI divergir do comportamento real, a
divergência vai ao backend; não se remenda no front.

## Notas do contrato

- Os `decimal` saem como `number | string` (`format: double`): a API aceita
  texto, por isso o dinheiro sobe como `"1234.50"` (§2.6 do plano).
- Os inteiros também aceitam texto (`integer | string`).
