# Pedidos ao backend

> 2026-10-13 · Do front de produção (`y-jr/rivoweb`) para a API.
> Revisto contra `main` @ `01c7d6c`, já em produção. **Não há pedidos em
> aberto.** B15 a B18 estão resolvidos e o front já os usa:
>
> - B15 — nome duplicado dá 409 (PR #99);
> - B16 — o rascunho devolve o IVA previsto (PR #100): a Sales vê o total
>   antes de emitir;
> - B17 — a retenção na fonte regista-se no recibo (PR #101, ADR-083): o
>   recibo tem «Retido na fonte» e a factura fica liquidada;
> - B18 — a importação aceita `;` e `,` (PR #100).

## Nota operacional (não é defeito)

`GET /fiscal/tax-entity` em produção responde **404**: os dados fiscais da
empresa não estão declarados desde a recriação da base. Emitir documentos
fiscais em produção precisa deles. Declaram-se em Configurações › Dados da
empresa (Admin ou Finance).
