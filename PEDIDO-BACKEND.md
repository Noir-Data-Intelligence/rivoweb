# Pedidos ao backend

> 2026-10-13 · Do front de produção (`y-jr/rivoweb`) para a API.
> Revisto contra `main` @ `c725f40`. O B15 (nome duplicado devolve 500) está
> resolvido no `main` (PR #99); sai desta lista quando for publicado.

## B16 — O rascunho de factura não calcula o IVA

**Facto:** `GET /finance/invoice-drafts/{id}` devolve as linhas com
`taxPercentage: null` e `tax: 0`, e `netTotal` só com o líquido
(`ManageInvoiceDrafts.Apply` cria `DraftLine` sem taxa). O IVA só se determina
ao emitir.

**Consequência:** quem emite e não tem `fiscal.rates.read` (o perfil **Sales**)
não vê o IVA nem o total antes de emitir: o front mostra «IVA calculado na
emissão». O Admin vê a previsão porque o front lê as taxas.

**Pedido:** ao gravar o rascunho, determinar a taxa de cada linha (à data de
hoje, ou à data prevista) e devolver `taxPercentage`, `tax`, e também
`taxTotal` e `grossTotal` no `InvoiceDraftView`. O front passa a mostrar os
totais do servidor antes de emitir, para todos os perfis.

## B17 — O saldo da factura ignora a retenção na fonte

**Facto (base local):** factura de 2 500,25 Kz de líquido, IVA 350,04 Kz,
retenção 6,5 % = 162,52 Kz, **a pagar 2 687,77 Kz**. Depois de um recibo de
1 000,00 Kz, `GET /finance/sales-invoices/{id}/balance` devolve
`invoiced: 2850.29`, `outstanding: 1850.29`. `GetInvoiceBalance` usa
`GrossTotal`; a retenção nunca entra.

**Consequência:** uma factura com retenção **nunca fica liquidada** com
recibos: o cliente paga 2 687,77 e ficam 162,52 em aberto para sempre (e a
factura aparece em «A receber», nos alertas de vencidas e no dashboard). E o
recibo aceita receber mais do que o valor a pagar.

**Pedido:** decidir como se fecha a parte retida (por exemplo: o saldo usa
`AmountPayable`; ou um registo próprio do certificado de retenção que liquida a
diferença) e aplicar o mesmo em `/balance`, `/receivables/overdue` e no
dashboard. Até lá, o front avisa na ficha que o saldo inclui a retenção.

## B18 — Importação CSV só aceita vírgula

**Facto:** `CsvDocument` separa por vírgula. O Excel em português (Angola,
Portugal) grava CSV com **ponto e vírgula**, e o ficheiro é recusado com «O
cabeçalho tem de incluir as colunas…».

**Pedido:** detectar o separador pelo cabeçalho (`;` ou `,`). O front já diz
que o separador é a vírgula.

## Nota operacional (não é defeito)

`GET /fiscal/tax-entity` em produção responde **404**: os dados fiscais da
empresa não estão declarados desde a recriação da base. Emitir documentos
fiscais em produção precisa deles. Declaram-se em Configurações › Dados da
empresa (Admin ou Finance).
