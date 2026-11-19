# Contrato da API

`v1.json` é o OpenAPI do backend (`Noir-Data-Intelligence/rivo-api`). `src/lib/api/schema.d.ts`
gera-se dele com `npm run api:types` e **nunca se edita à mão** (o CI corre
`npm run api:check`).

## Origem do ficheiro actual

| | |
|---|---|
| Data | 2026-11-19 |
| Commit do backend | `c0c4f99` (cabeça do PR #187, **ainda aberto**: a série do ano por omissão, as datas futuras recusadas e `GET /finance/accounts/lookups`, ADR-136; por cima do `main` em `a596151`, com o #178 a #185: `ClockRequest.at`, `FundRequest.openedOn`, `PaymentRequestView.approvalStatus`). Antes, `300c994` (`main`, merge do PR #177). Depois do merge do #187, gerar outra vez do `main` publicado. |
| Operações | 546 caminhos |
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
