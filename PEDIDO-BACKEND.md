# Pedidos ao backend

> 2026-10-18 · Do front de produção (`y-jr/rivoweb`) para a API.
> Revisto contra `main` @ `42eabd0`. Em aberto: **B24** (configuração) e
> **B40** (nomes, escolhas e documentos da frota, F12).
> **B39** está resolvido (PR #114) e o front já o usa: os ficheiros do
> projecto trazem o nome e descarregam-se pelo projecto; o ProjectManager
> junta os seus (um documento alheio dá 404, verificado na base local).
> **B38** está resolvido (PR #113) e o front já o usa: nomes de quem tem a
> tarefa, de quem registou o tempo, do recurso alocado e de quem comentou;
> o ProjectManager escolhe colaboradores, viaturas e clientes em
> `/projects/lookups` (verificado na base local). Os ficheiros do pedido
> (ponto 3) não vieram e passaram ao **B39**.
> **B35** a **B37** estão resolvidos (PR #111 e #112) e o front já os usa:
> nomes de clientes, leads, responsáveis e facturas nas vistas do comercial;
> responsável e cliente escolhidos em `/commercial/lookups`; listas
> ordenadas e paginadas; posição das linhas das propostas sem repetir;
> anexos dos contratos com nome, descarregados pelo contrato, e só os
> próprios se anexam (404 verificado na base local).
> **B34** está resolvido (PR #110) e o front já o usa: a fila de comprovativos
> e o portal mostram a moeda da factura; ligar uma conta sem o perfil Cliente
> dá 409 (verificado na base local).
> **B31** a **B33** estão resolvidos (PR #109, ADR-087) e o front já os usa:
> o Finance e o AssetManager entregam activos pela lista dos activos; a fila
> de comprovativos traz o cliente, a factura, a nota e o ficheiro, que se
> descarrega pelo pedido; o Sales liga contas pela lista de contas Cliente por
> ligar e partilha ficheiros que carrega (e não os alheios: 404, verificado na
> base local).
> **B29** e **B30** estão resolvidos (PR #108) e o front já os usa: nomes nas
> requisições e recepções, departamentos em `/procurement/lookups`, linhas pela
> ordem em que foram escritas. **B26** a **B28** estão resolvidos (PR #107,
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

> **Resolvido** (PR #108, 2026-10-17); o front usa-o e foi verificado na base local (`727666d`).

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

> **Resolvido** (PR #108, 2026-10-17); o front usa-o e foi verificado na base local (`727666d`).

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

## B31 — Quem gere os activos não escolhe a quem os entrega

> **Resolvido** (PR #109, 2026-10-18); o front usa-o e foi verificado na base local (`87807cc`).

**Facto:** `POST /finance/assets/{assetId}/custody` pede `employeeId`, mas o
Finance e o AssetManager, que têm `finance.assets.write`, não têm
`hr.employees.read` (lido em `/identity/me` de produção a 2026-10-17). A
lista de custódia já traz `employeeName`.

**Consequência:** esses perfis vêem e devolvem as custódias, mas não entregam
um activo a ninguém: o front explica porquê e só mostra «Entregar» a quem lê
os Recursos Humanos.

**Pedido:** como o B22 e o B29, uma lista curta de colaboradores activos
(id e nome) para quem tem `finance.assets.write`, por exemplo
`GET /finance/assets/lookups`.

## B32 — Quem confirma um comprovativo não o vê

> **Resolvido** (PR #109, 2026-10-18); o front usa-o e foi verificado na base local (`87807cc`).

**Facto:** `GET /finance/payment-claims` (`finance.receipts.read`) devolve
`PaymentClaimView` com `id`, `salesInvoiceId`, `amount`, `paidOn`, `status`,
`rejectionReason` e `submittedAt`. Não traz o cliente, o número da factura, as
notas do cliente nem o `documentId`. O ficheiro só se lê por
`GET /documents/{documentId}` (`documents.read`), que o Finance não tem (lido
em `/identity/me` de produção a 2026-10-17); o Sales também não. (Do lado do
cliente não falta nada: `/customer-portal/me` traz todas as facturas, e o
front tira daí o número.)

**Consequência:** o Finance confirma (e com isso regista um recibo) ou rejeita
um pagamento sem ver o comprovativo, sem saber de que cliente é e sem o número
da factura. O front não deve oferecer «Confirmar» às cegas.

**Pedido:** como o B20 e o B21 (comprovativos e anexos pelo contexto):
1. Em `GET /finance/payment-claims`, `customerId`, `customerName`,
   `invoiceNumber`, `notes` e o nome do ficheiro (`fileName`).
2. `GET /finance/payment-claims/{claimId}/document` com `finance.receipts.read`,
   sempre em anexo (`Content-Disposition: attachment`).

## B33 — O Sales gere o portal do cliente, mas não liga contas nem partilha

> **Resolvido** (PR #109, ADR-087, 2026-10-18); o front usa-o e foi verificado na base local (`87807cc`).

**Facto:** ligar uma conta (`POST /commercial/customers/{id}/account`) e
partilhar um documento (`POST …/shared-documents`) pedem
`commercial.customers.write`, que o Sales tem. Mas escolher a conta pede a
lista de utilizadores (`identity.users.read`) e escolher o documento pede o
arquivo (`documents.read`) ou carregar um novo (`documents.write`): o Sales
não tem nenhuma das três (produção, 2026-10-17). Só o Admin faz as duas coisas.

**Consequência:** o Sales vê a conta ligada, o histórico e os documentos
partilhados, desliga e revoga, mas não liga nem partilha: o front explica
porquê.

**Pedido:**
1. Uma lista curta das contas com o papel Cliente ainda sem cliente (id e
   e-mail) para quem tem `commercial.customers.write`, por exemplo
   `GET /commercial/customers/account-candidates`.
2. Partilhar carregando o ficheiro no mesmo pedido (multipart em
   `POST …/shared-documents`), ou `documents.write` para o Sales.

**Nota de segurança:** hoje `ShareDocumentAsync` aceita qualquer `documentId`
do arquivo (só confirma que existe). Quem tem `commercial.customers.write` e
saiba um id pode partilhar com um cliente um ficheiro de outra área (um
recibo de vencimento, o comprovativo de outro cliente). Sugere-se limitar aos
documentos carregados para partilha (por exemplo, uma categoria própria) ou
pedir também `documents.read`.

## B34 — A fila de comprovativos não diz a moeda; ligar aceita qualquer conta

> **Resolvido** (PR #110, 2026-10-18); o front usa-o e foi verificado na base local (`2b84331`).

**Facto 1:** `PaymentClaimReviewView` (e `PaymentClaimView`, no portal) traz
`amount` sem a moeda. A factura pode estar em AOA, USD ou EUR, e confirmar
regista o recibo nessa moeda.

**Consequência:** a fila mostra o valor sem moeda («500 000,00», com a nota
«na moeda da factura»); quem confirma não vê se são kwanzas ou dólares sem
abrir a factura.

**Facto 2:** `LinkCustomerAccount` confirma que a conta existe, que não é a
de quem liga e que não está ligada a outro cliente, mas não que tem o perfil
Cliente. A lista `account-candidates` já filtra; a escrita não.

**Consequência:** quem tem `commercial.customers.write` pode, pela API, ligar
a conta de um colega (Sales, Finance) a um cliente; esse colega passa a
entrar no portal como o cliente e a enviar comprovativos em seu nome. O front
só oferece as contas da lista, mas esconder não protege.

**Pedido:**
1. `currency` em `PaymentClaimReviewView` e em `PaymentClaimView`.
2. Em `POST /commercial/customers/{customerId}/account`, recusar (400 ou
   409) uma conta sem o perfil Cliente, como a lista já faz.

## B35 — O comercial só traz ids de pessoas, clientes e facturas, e as listas não têm ordem

> **Resolvido** (PR #111, 2026-10-18); o front usa-o e foi verificado na base local (`a281377`).

**Facto 1 (nomes):** as vistas do comercial trazem só ids:
- `ownerEmployeeId` em `LeadView`, `OpportunityView`, `CrmActivityView`,
  `CollectionActionView` e `OwnerPerformance` (relatório);
- `customerId` em `OpportunityView`, `CrmActivityView`, `ProposalView`,
  `CustomerContractView` e `CollectionActionView`;
- `leadId` em `OpportunityView`, `CrmActivityView` e `ProposalView`;
- `salesInvoiceId` em `CollectionActionView`.

Nenhum perfil comercial lê colaboradores (`hr.employees.read`: só Admin e
HR, catálogo de produção a 2026-10-18). O Manager (`commercial.crm.read`,
`commercial.contracts.read`) e o Finance (`commercial.contracts.read`,
`commercial.collections.*`) também não lêem clientes.

**Consequência:** o Sales vê os clientes (tem `commercial.customers.read`),
mas nunca o responsável; o Manager e o Finance não vêem de que cliente é uma
oportunidade, um contrato ou uma cobrança. O front nunca mostra um id: mostra
«—».

**Facto 2 (escolhas):** criar ou corrigir um lead, uma oportunidade, uma
actividade ou uma acção de cobrança aceita `ownerEmployeeId`, e o servidor
confirma que a ficha existe; mas quem escreve (Sales, Finance) não tem como
listar colaboradores.

**Consequência:** o front não oferece «Responsável» a esses perfis (o campo
fica vazio).

**Facto 3 (ordem e tamanho):** `GET /commercial/opportunities`, `…/activities`,
`…/proposals`, `…/contracts` e `/commercial/collections/actions` não têm
`ORDER BY` nem paginação (`CrmStore.cs`); em produção as actividades já são
200 de uma vez.

**Consequência:** a ordem muda entre leituras (o front ordena do seu lado, por
data) e as listas crescem sem tecto.

**Pedido** (como o B22, o B29 e o B31):
1. Nas vistas, `ownerName`, `customerName`, `leadName` e `invoiceNumber` ao
   lado dos ids.
2. `GET /commercial/lookups` para quem escreve no comercial
   (`commercial.crm.write`, `commercial.collections.write`,
   `commercial.contracts.write`): colaboradores activos e clientes activos
   (id e nome).
3. Ordem definida (oportunidades e propostas pela criação, mais recentes
   primeiro; actividades pela data marcada; contratos pelo fim; cobranças
   pela data) e paginação com `X-Total-Count`, como nos leads.

## B36 — Tirar uma linha de uma proposta repete a posição da linha seguinte

> **Resolvido** (PR #112, 2026-10-18); o front usa-o e foi verificado na base local (`a281377`).

**Facto:** `Proposal.AddLine` dá a posição `_lines.Count + 1` e `RemoveLine`
não renumera. Na base local (`2b84331`, 2026-10-18): linhas A, B, C; tirar
B; acrescentar D → `1:A 3:D 3:C` em `GET /commercial/proposals/{id}`, com D
antes de C (a ordem entre posições iguais não é estável).

**Consequência:** duas linhas com a mesma posição, a ordem muda entre
leituras e o PDF e as versões (que ordenam pela posição) podem sair noutra
ordem. O front numera as linhas pela ordem em que chegam, para não mostrar
números repetidos.

**Pedido:** dar à linha nova a maior posição + 1 (ou renumerar ao tirar),
como o B30 fez nas requisições.

## B37 — Os anexos de um contrato não se descarregam e aceitam qualquer documento

> **Resolvido** (PR #112, 2026-10-18); o front usa-o e foi verificado na base local (`a281377`).

**Facto 1:** `GET /commercial/contracts/{id}/documents` devolve `linkId`,
`documentId`, `category` e `attachedAt`, sem o nome do ficheiro, e não há
rota para descarregar o anexo pelo contrato. O ficheiro só se lê em
`GET /documents/{documentId}` (`documents.read`), que só o Admin e o HR têm;
o Sales, o Finance e o Manager lêem contratos (`commercial.contracts.read`).

**Consequência:** quem gere contratos anexa a cópia assinada mas não a volta a
abrir; o front lista os anexos pela categoria e data, e só oferece
descarregar a quem lê o arquivo.

**Facto 2:** `AttachContractDocumentAsync` só confirma que o documento existe
(`IDocumentCatalogue.FindAsync`), como a partilha com o cliente antes do B33.
Quem tem `commercial.contracts.write` e saiba um id anexa a um contrato um
ficheiro de outra área.

**Pedido** (como o B20, o B32 e o B33):
1. `fileName` em `ContractDocumentView` e
   `GET /commercial/contracts/{contractId}/documents/{linkId}/content` com
   `commercial.contracts.read`, sempre em anexo.
2. Anexar só documentos carregados por quem anexa (salvo `documents.read`),
   com a mesma resposta de «não existe».

## B38 — Os projectos só trazem ids de pessoas, recursos e autores, e o ProjectManager não os escolhe

> **Resolvido** (PR #113, 2026-10-22) nos pontos 1 e 2; o front usa-o e foi verificado na base local (`cdd7b10`). O ponto 3 (ficheiros) passou ao **B39**.

**Facto 1 (nomes):** `ProjectTaskView`, `BoardCard` e `TaskPlanView` trazem
`assignedEmployeeId`; `TimeEntryView` e `TimeByEmployee`, `employeeId`;
`ResourceAllocationView`, `resourceId` (colaborador ou viatura); `CommentView`,
`authorUserId`. O ProjectManager só tem `projects.projects.read/.write`
(catálogo de produção, 2026-10-18): não lê colaboradores, clientes nem
viaturas.

**Consequência:** o ProjectManager não vê a quem está atribuída uma tarefa,
quem registou as horas, que recurso está alocado nem quem comentou. O front
mostra «—», nunca o id.

**Facto 2 (escolhas):** atribuir uma tarefa, registar tempo e alocar um
recurso pedem o id e o servidor confirma que existe (`IEmployeeDirectory`,
`IVehicleDirectory`); ligar o projecto a um cliente (visibilidade no portal)
pede o `customerId` (`ICustomerDirectory`). O ProjectManager não tem como
listar nenhum deles.

**Consequência:** o ProjectManager não atribui tarefas, não regista tempo de
ninguém, não aloca recursos nem mostra o projecto a um cliente; o front
explica porquê.

**Pedido** (como o B22, o B29, o B31 e o B35):
1. `assignedEmployeeName`, `employeeName`, `resourceName` e `authorName` ao
   lado dos ids.
2. `GET /projects/lookups` para quem tem `projects.projects.write`:
   colaboradores activos, viaturas activas e clientes activos (id e nome).

**Facto 3 (ficheiros):** ver o **B39**.

## B39 — Os ficheiros de um projecto não se abrem pelo projecto e aceitam qualquer documento

> **Resolvido** (PR #114, 2026-10-22); o front usa-o e foi verificado na base local (`42eabd0`). Pedido a 2026-10-18 como ponto 3 do B38.

**Facto:** `GET /projects/{id}/files` traz `documentId`,
`category` e `attachedAt`, sem o nome do ficheiro, e não há rota para o
descarregar pelo projecto (só `GET /documents/{id}`, com `documents.read`).
`AttachFileAsync` só confirma que o documento existe, como os contratos antes
do B37. O ProjectManager também não tem `documents.write`, por isso nem
carrega ficheiros.

**Consequência:** o ProjectManager não junta nem abre ficheiros do projecto;
o Admin junta e abre pelo arquivo.

**Pedido** (como o B33 e o B37):
1. `fileName` em `ProjectFileView`,
   `GET /projects/{projectId}/files/{linkId}/content` com
   `projects.projects.read` (em anexo), anexar só documentos carregados por
   quem anexa (salvo `documents.read`) e `documents.write` para o
   ProjectManager — como o B33 e o B37.

## B40 — A frota só traz ids de pessoas e os documentos não se abrem pela viatura

**Facto 1 (nomes e escolhas):** `VehicleAssignmentView` traz `employeeId` e
`VehicleTripView` traz `driverId`, sem nomes; atribuir e indicar o motorista
pedem o id e o servidor confirma-o contra os RH. O AssetManager tem
`fleet.vehicles.*` mas não `hr.employees.read` (catálogo de produção; 403 em
`/hr/employees`, 2026-10-22).

**Consequência:** o front tira os nomes e a escolha de
`/finance/assets/lookups` (B31), o que só funciona porque o Admin e o
AssetManager também gerem activos fixos; quem só tiver a frota não atribui
nem vê nomes, e quem saiu da empresa aparece como «—».

**Facto 2 (documentos):** `GET /fleet/vehicles/{id}/documents` traz
`fileName`, mas não há rota para descarregar pela viatura (só
`GET /documents/{id}`, com `documents.read`); `AttachVehicleDocumentAsync`
só confirma que o documento existe, como os contratos antes do B37; e o
AssetManager não tem `documents.write`, por isso nem carrega o livrete.

**Consequência:** o AssetManager vê os documentos da viatura e retira-os,
mas não os junta nem abre; o Admin junta e abre pelo arquivo.

**Pedido** (como o B31, o B37 e o B38):
1. `employeeName` em `VehicleAssignmentView` e `driverName` em
   `VehicleTripView`.
2. `GET /fleet/lookups` para quem tem `fleet.vehicles.write`: colaboradores
   activos (id e nome).
3. `GET /fleet/vehicles/{vehicleId}/documents/{documentId}/content` com
   `fleet.vehicles.read` (em anexo), anexar só documentos carregados por quem
   anexa (salvo `documents.read`) e `documents.write` para o AssetManager.
