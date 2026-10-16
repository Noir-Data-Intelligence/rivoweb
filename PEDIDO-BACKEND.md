# Pedidos ao backend

> 2026-10-16 · Do front de produção (`y-jr/rivoweb`) para a API.
> Revisto contra `main` @ `33697a8`. Em aberto: **B20**, **B21**, **B22**,
> **B23**, **B24** (configuração), **B25** e **B26**. O **B13** está resolvido (ADR-080):
> o portal já descarrega os documentos pessoais e os recibos, e o front usa-o. O **B5** está meio resolvido: já há
> SAF-T AO de facturação (`GET /finance/saft-ao`), continuam a faltar as
> declarações à AGT.
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

## B22 — O planeamento só traz ids de departamento e de colaborador

**Facto:** `CostCentreView` traz `departmentId` e `responsibleEmployeeId`,
`BudgetView` traz `approvedByEmployeeId` e `CostForecastView` traz
`departmentId`, sem nomes. Os nomes só se obtêm por `/hr/departments` e
`/hr/employees`, que pedem `hr.departments.read` e `hr.employees.read`.
O **Finance** e o **Manager**, que são quem lê e escreve o planeamento
(`finance.planning.*`, `finance.budgets.approve`), não têm nenhuma das duas
(lido em `/identity/me` de produção a 2026-10-16).

**Consequência:**

- nas listas de centros de custo e de previsões, o Finance e o Manager vêem
  «Departamento» e «Colaborador» em vez dos nomes (o front nunca mostra o id);
- o Manager tem `finance.planning.write` mas **não consegue abrir um centro de
  custo** nem **registar uma previsão**: o responsável e o departamento
  escolhem-se de listas de RH que ele não lê. O front desactiva os dois
  botões e explica porquê.

**Pedido:** como o B19 fez nas aprovações, trazer o nome ao lado do id:
`departmentName` e `responsibleName` em `CostCentreView`, `departmentName` em
`CostForecastView` e `approvedByName` em `BudgetView`. Para escolher, uma
lista curta de departamentos e de colaboradores activos (id e nome) com
`finance.planning.write`, por exemplo `GET /finance/planning/lookups`.

## B23 — Uma previsão de custos em rascunho fica presa

**Facto:** `POST /finance/planning/cost-forecasts` aceita `submit: false`
(rascunho), e o domínio tem `DepartmentCostForecast.Revise` e `Submit`. Mas
não há rota para rever nem para submeter depois, e um segundo `POST` para o
mesmo departamento e mês dá **409** («Já existe previsão…»).

**Consequência:** um rascunho nunca chega à tesouraria nem se corrige. O front
deixa marcado «Submeter já» por omissão e avisa que, em rascunho, não há forma
de a submeter mais tarde.

**Pedido:** `PUT /finance/planning/cost-forecasts/{forecastId}` (rever, só em
rascunho) e `POST /finance/planning/cost-forecasts/{forecastId}/submission`,
com `finance.planning.write`.

## B24 — O SAF-T recusa em produção por falta de configuração

**Facto:** `GET /finance/saft-ao` responde **400** em produção (e na base
local): «Falta o NIF do produtor do software (Finance:SaftProductCompanyTaxId,
SAFT_PRODUCT_COMPANY_TAX_ID no .env). O SAF-T exige-o no cabeçalho.»
Verificado com a conta Finance de QA a 2026-10-16, só leitura.

**Consequência:** o botão «Descarregar SAF-T» mostra a recusa com o motivo; o
ficheiro não sai.

**Pedido (operação, não código):** definir `SAFT_PRODUCT_COMPANY_TAX_ID` (o
NIF da produtora do software, a NOIR) no `.env` de produção e reiniciar a API.
É a única chave em falta: o `docker-compose.yml` já a passa como
`Finance__SaftProductCompanyTaxId`, e o `ProductID` tem valor por omissão.

## B25 — O colaborador não retira o próprio pedido de férias

**Facto:** o domínio deixa retirar um pedido pendente (`LeaveRequest.Cancel`,
«Só um pedido pendente pode ser retirado»), mas a única rota é
`POST /hr/leave/{leaveId}/cancellation`, com `hr.leave.write`. O portal tem
`POST /portal/me/leave` e não tem a cancelação. Nas trocas de turno e nas
despesas, o próprio já retira (`…/shift-change-requests/{id}/cancellation`,
`…/expenses/{id}/withdrawal`).

**Consequência:** quem se engana nas datas tem de pedir aos Recursos Humanos
que retirem o pedido; o ecrã de férias do portal diz isso.

**Pedido:** `POST /portal/me/leave/{leaveId}/cancellation` (204; 404 se não for
do próprio; 409 se já decidido), só autenticação, como as outras rotas do
portal.

## B26 — Contratos de um colaborador com paginação dão 500

**Facto:** `GET /hr/contracts?employeeId={id}&page=1&pageSize=25` responde
**500** (base local, `33697a8`). Sem `page`/`pageSize` responde 200. Causa:
`ListEmploymentContracts` não pagina o histórico de um colaborador e devolve
`TotalCount = null`; `EscreverCabecalhosDePagina` faz `total!.Value` sempre que
há página pedida. As outras listas por colaborador (férias, assiduidade,
adesões) paginam e não falham.

**Consequência:** nenhuma no front: na ficha, o pedido sai sem paginação.
Qualquer outro cliente que pagine sempre recebe 500.

**Pedido:** em `ListContractsAsync`, escrever os cabeçalhos só quando há total
(ou paginar também o histórico do colaborador).
