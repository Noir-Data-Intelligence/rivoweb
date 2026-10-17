# Pedidos ao backend

> 2026-10-17 · Do front de produção (`y-jr/rivoweb`) para a API.
> Revisto contra `main` @ `db34b07`. Em aberto: **B24** (configuração),
> **B29** e **B30** (compras). **B26** a **B28** estão resolvidos (PR #107,
> ADR-086) e o front já os usa: contratos de um colaborador paginados, uma
> folha por mês e o colaborador uma vez por folha, tirar um item e anular um
> rascunho. **B20** a **B23** estão resolvidos (PR #105, ADR-085) e o front já
> os usa: anexos e comprovativos pelo contexto, IBAN repetido com o motivo,
> nomes e escolhas no planeamento, previsão em rascunho revista e submetida. O **B25** está resolvido (PR #106) e o front já o
> usa: o colaborador retira no portal o próprio pedido de férias. O **B13** está resolvido (ADR-080):
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

> **Resolvido** (PR #105, ADR-085, em produção a 2026-10-16); o front usa-o e foi verificado na base local.

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

> **Resolvido** (PR #105, ADR-085, em produção a 2026-10-16); o front usa-o e foi verificado na base local.

**Facto:** `POST /finance/accounts` com um IBAN que outra conta já tem responde
**500** («Ocorreu um erro no servidor»). O registo da API mostra a violação do
índice único `ix_bank_account_iban` (SQL 2601) a sair como excepção não
tratada. Reproduzido na base local a 2026-10-15.

**Consequência:** quem abre a conta não sabe porquê falhou; o front só pode
mostrar o código para o suporte.

**Pedido:** responder **409** com o motivo («Já existe uma conta com este
IBAN: …»), como o B15 fez para os nomes duplicados.

## B22 — O planeamento só traz ids de departamento e de colaborador

> **Resolvido** (PR #105, ADR-085, em produção a 2026-10-16); o front usa-o e foi verificado na base local.

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

> **Resolvido** (PR #105, ADR-085, em produção a 2026-10-16); o front usa-o e foi verificado na base local.

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

> **Resolvido** (PR #106, em produção a 2026-10-16): `POST
> /portal/me/leave/{leaveId}/cancellation`. O portal mostra «Retirar» nos
> pedidos por decidir; verificado na base local.

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

> **Resolvido** (PR #107, ADR-086, em produção a 2026-10-17); o front usa-o e foi verificado na base local.

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

## B27 — Duas folhas do mesmo mês e o mesmo colaborador duas vezes na folha

> **Resolvido** (PR #107, ADR-086, em produção a 2026-10-17); o front usa-o e foi verificado na base local.

**Facto:** o índice `ix_payroll_run_year_month` não é único e `OpenRun` não
verifica se o mês já tem folha; `PayrollRun.AddItem` não verifica se o
colaborador já está na folha. Em produção há uma folha por mês (2025-11 a
2026-10), mas nada o garante.

**Consequência:** um engano paga duas vezes o mesmo mês ou o mesmo
colaborador. O front avisa nos dois casos, mas não bloqueia (a regra é do
domínio).

**Pedido:** recusar com 409 uma segunda folha para o mesmo ano e mês que não
esteja recusada, e um segundo item do mesmo colaborador na mesma folha (ou
dizer qual é a regra, se for intencional — por exemplo, folhas
complementares).

## B28 — Um item da folha em rascunho não se tira

> **Resolvido** (PR #107, ADR-086, em produção a 2026-10-17); o front usa-o e foi verificado na base local.

**Facto:** há `POST /payroll/runs/{runId}/items`, mas nenhuma rota para tirar
ou corrigir um item, nem para anular uma folha em rascunho.

**Consequência:** um valor errado obriga a submeter e recusar a folha, ou a
deixá-la parada em rascunho. O front avisa antes de juntar que o item não se
tira.

**Pedido:** `DELETE /payroll/runs/{runId}/items/{itemId}` (só em rascunho;
409 fora dele) e, se fizer sentido, anular uma folha em rascunho.

## B29 — Requisições e recepções só trazem ids de pessoas e departamentos

**Facto:** `RequisitionView` traz `requestedByEmployeeId` e `departmentId`, e
`GoodsReceiptView` traz `receivedByEmployeeId`, sem nomes. O Manager, o
Finance e o AssetManager, que trabalham com compras, não têm
`hr.employees.read` nem `hr.departments.read` (lido em `/identity/me` de
produção a 2026-10-17).

**Consequência:** esses perfis vêem «Colaborador» e «Departamento» em vez dos
nomes (o front nunca mostra o id), e o Manager não escolhe o departamento ao
abrir uma requisição.

**Pedido:** como o B22 fez no planeamento, `requestedByName`,
`departmentName` e `receivedByName` nas vistas, e uma lista curta de
departamentos para quem tem `procurement.requisitions.write` (por exemplo
`GET /procurement/lookups`).

## B30 — As linhas de requisições e ordens não têm ordem garantida

**Facto:** as linhas de `RequisitionView` e `PurchaseOrderView` vêm sem ordem
definida (a consulta não tem `ORDER BY` e não há coluna de posição). Na base
local, a mesma requisição devolveu as linhas em ordens diferentes entre
leituras; os ids das linhas do mesmo pedido são do mesmo milissegundo, por
isso ordenar por id não recupera a ordem em que foram escritas.

**Consequência:** a ordem das linhas muda de uma leitura para a outra (o front
ordena pelo id para ao menos ser estável) e não é a que o utilizador
escreveu.

**Pedido:** guardar a posição de cada linha (como `LifecycleTask.Order`) e
devolver as linhas por essa ordem.
