# Pedidos ao backend

> 2026-10-13 · Do front de produção (`y-jr/rivoweb`) para a API.
> Revisto contra `main` @ `01c7d6c`, já em produção. B15 a B18 estão
> resolvidos e o front já os usa:
>
> - B15 — nome duplicado dá 409 (PR #99);
> - B16 — o rascunho devolve o IVA previsto (PR #100): a Sales vê o total
>   antes de emitir;
> - B17 — a retenção na fonte regista-se no recibo (PR #101, ADR-083): o
>   recibo tem «Retido na fonte» e a factura fica liquidada;
> - B18 — a importação aceita `;` e `,` (PR #100).

## B19 — Os pedidos de aprovação só trazem ids de colaboradores

**Facto:** `ApprovalStatusView` e `ApprovalHistoryView` trazem
`requestedByEmployeeId`, `pendingApprovers`, `assignments[].approverEmployeeId`
e `decisions[].decidedByEmployeeId`, sem nomes, e sem o resumo do pedido (o
texto que o módulo de origem envia ao submeter, por exemplo «Atribuição do
cargo X, que confere autoridade de aprovação.»).

**Consequência:** quem decide e não lê colaboradores (**Finance** e
**Manager**, que têm `approval.requests.decide` mas não `hr.employees.read`)
vê «Colaborador» em vez de quem pediu e de quem decidiu, e não vê o que está a
aprovar além do tipo de processo. Só o Admin vê nomes.

**Pedido:** acrescentar às duas vistas os nomes (`requestedByName`, e o nome em
cada aprovador e em cada decisão) e o resumo (`summary`) do pedido. São dados
de que o próprio aprovador precisa para decidir, por isso não alargam o acesso.
