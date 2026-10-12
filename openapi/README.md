# Contrato da API

`v1.json` é o OpenAPI do backend (`y-jr/rivo-api`). `src/lib/api/schema.d.ts`
gera-se dele com `npm run api:types` e **nunca se edita à mão** (o CI corre
`npm run api:check`).

## Origem do ficheiro actual

| | |
|---|---|
| Data | 2026-10-12 |
| Commit do backend | `223840f8913c23717eaf94e9073904f0382367ee` (`feat/saft-ao`, topo da cadeia de PRs #94 → #97) |
| Operações | 582 (471 caminhos) |
| Como | API corrida localmente (`dotnet run`, `OpenApi__Expose=true`) contra uma base descartável `RivoOpenApi` no SQL Server de desenvolvimento; `curl http://localhost:5181/openapi/v1.json` |

O OpenAPI está desligado em produção (`GET https://syyt.tech/openapi/v1.json` →
404), por isso o ficheiro vem sempre de uma API local no **mesmo commit** que o
deploy publicou.

**Atenção:** este ficheiro inclui as rotas dos PRs #94–#97 (ETag/If-Match,
descargas no portal, `GET /finance/saft-ao`). Até esses PRs estarem fundidos e
publicados, essas rotas existem no contrato mas não em produção.

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
