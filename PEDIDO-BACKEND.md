# Pedidos ao backend

> 2026-10-15 · Do front de produção (`y-jr/rivoweb`) para a API.
> Revisto contra `main` @ `4457f94`, já em produção. Em aberto: **B20** e
> **B21**.
> B15 a B19 estão resolvidos e o front já os usa:
>
> - B15 — nome duplicado dá 409 (PR #99);
> - B16 — o rascunho devolve o IVA previsto (PR #100): a Sales vê o total
>   antes de emitir;
> - B17 — a retenção na fonte regista-se no recibo (PR #101, ADR-083): o
>   recibo tem «Retido na fonte» e a factura fica liquidada;
> - B18 — a importação aceita `;` e `,` (PR #100);
> - B19 — os pedidos de aprovação trazem nomes e resumo (PR #102): o Finance
>   e o Manager vêem quem pediu e o que estão a aprovar.

## B20 — Quem aprova ou paga não abre o comprovativo nem os anexos

**Facto:** `GET /documents/{documentId}` exige `documents.read`, que só o
Admin e o HR têm. O ADR-080 deu `documents.write` ao Finance, ao Manager e
ao Colaborador, mas «só carrega»: cada um só descarrega o que carregou
(`/documents/me/{documentId}`).

**Consequência:**

- o **Manager** e o **Finance** aprovam despesas sem poder abrir o
  comprovativo que o colaborador anexou (`receiptDocumentId`);
- o **Finance** executa pagamentos sem poder abrir a factura ou a proposta
  anexada ao pedido (`GET /finance/payment-requests/{id}/documents` dá a lista,
  não o ficheiro);
- quem aprova o pedido de pagamento (Manager) também não a abre.

O front mostra a lista de anexos e diz que abrir exige ler o arquivo.

**Pedido:** descargas pelo contexto de origem, autorizadas pela permissão de
leitura desse contexto e só para o documento ligado:

- `GET /finance/expenses/{expenseId}/receipt` com `finance.expenses.read`;
- `GET /finance/payment-requests/{id}/documents/{linkId}/content` com
  `finance.payables.read`.

É o padrão de `GET /portal/me/documents/{documentId}` (ADR-080, B13): não dá
acesso ao arquivo, só ao ficheiro de que a pessoa precisa para decidir ou pagar.

## B21 — IBAN repetido numa conta bancária dá 500

**Facto:** `POST /finance/accounts` com um IBAN que outra conta já tem responde
**500** («Ocorreu um erro no servidor»). O registo da API mostra a violação do
índice único `ix_bank_account_iban` (SQL 2601) a sair como excepção não
tratada. Reproduzido na base local a 2026-10-15.

**Consequência:** quem abre a conta não sabe porquê falhou; o front só pode
mostrar o código para o suporte.

**Pedido:** responder **409** com o motivo («Já existe uma conta com este
IBAN: …»), como o B15 fez para os nomes duplicados.
