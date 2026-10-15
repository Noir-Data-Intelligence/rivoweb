# Pedidos ao backend

> 2026-10-15 · Do front de produção (`y-jr/rivoweb`) para a API.
> Revisto contra `main` @ `4457f94`, já em produção. **Não há pedidos em
> aberto.** B15 a B19 estão resolvidos e o front já os usa:
>
> - B15 — nome duplicado dá 409 (PR #99);
> - B16 — o rascunho devolve o IVA previsto (PR #100): a Sales vê o total
>   antes de emitir;
> - B17 — a retenção na fonte regista-se no recibo (PR #101, ADR-083): o
>   recibo tem «Retido na fonte» e a factura fica liquidada;
> - B18 — a importação aceita `;` e `,` (PR #100);
> - B19 — os pedidos de aprovação trazem nomes e resumo (PR #102): o Finance
>   e o Manager vêem quem pediu e o que estão a aprovar.
