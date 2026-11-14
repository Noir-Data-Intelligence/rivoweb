# Novidades do backend para implementar no front

Data: 2026-10-23, actualizado a 2026-11-09. Repositório: `Noir-Data-Intelligence/rivo-api`.
A referência completa de cada rota está em `rivo-api/API-FRONTEND.md`.

| # | Funcionalidade | PR | Estado |
|---|---|---|---|
| 1 | Portal do Colaborador: benefícios, contrato e dados pessoais | #117 | **Em produção** desde 23/10 e verificado |
| 2 | Aprovações: validação de conformidade com checklist (K4) | #118 | Fundido em `main` (`1dad7aa`) |
| 3 | Respostas ao `PENDENCIAS-PARA-BACKEND.txt` sem código novo | — | Só ajustes de front |
| 4 | Auditoria interna (`InternalAudit.tsx`) | #119 | **Em produção** desde 25/10 e verificado (permissões e rotas) |
| 5 | Eventos de auditoria por dia (`AdminMetrics.tsx`) | #122 (era o #120) | **Em produção** desde 26/10 e verificado |
| 6 | B42: nomes dos esquemas de checklist no OpenAPI | #121 | **Em produção** desde 25/10 (OpenAPI verificado) |
| 7 | Contabilidade conforme o PGC: plano, IVA, fecho do exercício e demonstrações | #125 | **Em produção** desde 30/10 e verificado (752 contas, 7 regras) |
| 8 | Lançar o histórico: os documentos emitidos antes das regras | #126 | **Em produção** desde 30/10 e verificado: Out/2025 a Out/2026 já lançados (3 098), 2025 apurado e 2026 aberto |
| 9 | Abate e venda de activos no razão; seed de QA com a contabilidade completa | #127 | **Em produção** desde 30/10; base recriada e seed corrido a 31/10, verificado (Balanço e DR equilibrados, activos classificados) |
| 10 | A folha de salários aprovada lança no razão | #128 | **Em produção** desde 31/10; base recriada e seed corrido, verificado (12 folhas no razão, DR com custos com o pessoal) |
| 11 | Pagar os salários, entregar ao Estado e depositar valores, pelo banco | #129 | **Em produção** desde 31/10; base recriada e seed corrido, verificado (salários, IRT, INSS, IVA e 45.2 saldados) |
| 12 | O recebimento por banco entra na conta bancária | #130 | **Em produção** desde 31/10; base recriada e seed corrido, verificado (as contas em kwanzas batem com a 43.1, tirando os recebimentos em dólares). A confirmação de comprovativos sem corpo vinda do PowerShell dava 415; o #131 não chegou, e o #133, em revisão, corrige-a. O front não é afectado |
| 13 | A data-valor das operações de banco: pagar e depositar com a data em que aconteceu | #132 | **Em produção** desde 31/10, com a migração verificada (os movimentos que já existiam ficaram com a data do registo). Falta recriar a base e correr o seed para as datas se espalharem pelo histórico |
| 14 | O banco em moeda estrangeira: os recebimentos e pagamentos noutra moeda lançam na 43.2 | #134 | **Em produção** desde 05/11; base recriada e seed corrido, verificado (a 43.2 com os dólares; a 43.1 bate com as contas em kwanzas) |
| 15 | Rascunhos e pró-formas: bens ou serviço em cada linha (B43) e a conta da FR (B45) | #135 | **Em produção** desde 05/11 |
| 16 | Uma versão do plano registada à mão nasce inactiva e activa-se à parte (B44) | #136 | **Em produção** desde 05/11 |
| 17 | As despesas de colaborador lançam no razão, e o reembolso sai do banco | #137 | **Em produção** desde 05/11; base recriada e seed corrido, verificado (116 aprovações e 90 reembolsos no razão; a 36.9 bate com o que falta reembolsar) |
| 18 | A actualização cambial dos depósitos em moeda estrangeira no fim do mês | #138 | **Em produção** desde 05/11; base recriada e seed corrido, verificado (ACT-2025-12 põe a 43.2 no saldo do BIC ao câmbio de 27/12/2025; a perda vai para a 76.2.2) |
| 19 | As diferenças de câmbio realizadas no recibo e no pagamento em moeda estrangeira | #139, #140 | **Em produção** desde 06/11; base recriada e seed corrido, verificado (14 recibos e 3 pagamentos em dólares com a diferença no razão; o cliente e o fornecedor ficam a zero) |
| 20 | A actualização cambial dos clientes e fornecedores em aberto no fim do mês | #141 | **Em produção** desde 06/11; base recriada e seed corrido, verificado (ACD-2025-12 actualiza 3 facturas em dólares ao câmbio de 27/12/2025, estornada a 01/01/2026) |
| 21 | O mercado nacional e o estrangeiro: clientes e fornecedores de fora lançam nas suas contas | #142 | **Em produção** desde 06/11; base recriada e verificada |
| 22 | A factura-recibo em moeda estrangeira deixa o cliente a zero ao cêntimo (só razão; o front não muda) | #143 | **Em produção** desde 07/11; base recriada e verificada |
| 23 | A factura que vende um bem do activo: abate-o e lança na 37.2 e na 68.3/78.3 | #144 | **Em produção** desde 07/11; base recriada e verificada |
| 24 | A compra de um bem do activo deve-se na 37.1, com o IVA na 34.5.2.2; o pagamento salda a 37.1 (o pedido não muda) | #145 | **Em produção** desde 09/11; base recriada e verificada (8 compras de imobilizado na 37.1.1 e na 34.5.2.2, nenhuma na 32) |
| 25 | Quem aprova a folha não paga os salários: 403 para quem a decidiu ou para uma conta sem colaborador | #146 | **Em produção** desde 09/11; base recriada e verificada (as 11 folhas pagas pela conta `admin`, sem recusas) |
| 26 | Os salários e as entregas ao Estado pagam-se em partes: `amount` opcional e `outstanding` na resposta | #147, #148 | **Em produção** desde 10/11; base recriada e verificada (o IVA de 06/2026 entregue em duas prestações, `PAG-IVA-2026-06` e `-2`) |
| 27 | Os órgãos sociais na folha: o cargo diz se é de um órgão social (`governingBody`), e a folha lança-o na 72.1 e na 36.1.1 | #149 | **Em produção** desde 10/11; base recriada e verificada (o Administrador na 72.1, na 72.5.1 e na 36.1.1 em cada `SAL-AAAA-MM`, e os `PAG-SAL` a saldarem a 36.1.1 e a 36.1.2) |
| 28 | O IVA não dedutível da factura de compra: `nonDeductibleTax`, que lança com o líquido na conta da aquisição (no imobilizado, no valor do bem) | #150 | **Em produção** desde 11/11; base recriada e verificada (a factura da viatura lança 27 930 000 na 11.4 contra a 37.1.1, sem linha na 34.5.2.2; o activo AF-0009 custa o mesmo; o resumo do IVA conta só o dedutível) |
| 29 | O reembolso de despesas em moeda estrangeira: sai da 43.2, e a diferença de câmbio para o dia da despesa lança na 66.2.1 ou na 76.2.1 | #151 | **Em produção** desde 11/11; base recriada e verificada (as duas despesas em USD reembolsadas pela 43.2, uma com ganho na 66.2.1 e outra com perda na 76.2.1, e a 36.9 delas a zero) |
| 30 | Os adiantamentos de salário: a tesouraria paga-os (36.3 contra 43.1), a folha do mês desconta-os e o pagamento dos salários paga o resto | #152 | **Em produção** desde 11/11; base recriada e verificada (os seis adiantamentos de Fevereiro, Junho e Outubro lançados na 36.3 contra 43.1 e descontados pelos `ADT-SAL` das folhas, os `PAG-SAL` a pagar só o resto e a 36.3 a zero) |
| 31 | A actualização cambial do fim do mês passa a levar as despesas de colaborador em moeda estrangeira por reembolsar (36.9) | #153 | **Em produção** desde 11/11, com o #154 (seed); base recriada e verificada (a despesa «Hotel em Joanesburgo», gasta a 23/12/2025 e reembolsada a 11/01/2026, entra no `ACD-2025-12` com 8,94 na 36.9 contra a 76.2.2; o `EST-ACD-2025-12` repõe-na a 01/01; o reembolso mede a diferença de 552,39 a partir da aprovação e a 36.9 dela fica a zero) |
| 32 | A nota de crédito em moeda estrangeira lança ao câmbio da factura que corrige, e o cliente fica a zero | #155 | **Em produção** desde 12/11; base recriada e verificada (o seed não tem notas em dólares: Balanços equilibrados, 43.1 igual às contas em kwanzas, e o ACD-2025-12 e a despesa de Joanesburgo continuam a fechar a zero) |
| 33 | Regularização de existências no fim do ano (inventário intermitente) e tipo de existência nos artigos | #156 | **Em produção** desde 12/11; base recriada e verificada (REX-2025: a 21.1 de 14 477 327,22 vai para a 71.1 e a 71.3, e a 22.1 e a 22.3 ficam com o stock do inventário a 31/12, 6 977 697,28; custo de 7 499 629,94 na DR de 2025; o ABE-2026 leva a 22) |
| 34 | O SAF-T AO sai em produção: o NIF do produtor configurado no servidor, e o seed declara a empresa (fictícia, «Rivo Demonstração, Lda») (B24) | #157 | **Em produção** desde 12/11; base recriada e verificada (o SAF-T de 10/2026 sai com a empresa e os dois NIF no cabeçalho: 15 facturas, 3 documentos de conferência e 6 recibos) |
| 35 | Estimativa do imposto industrial indicada pelo contabilista (D 87.1 / C 34.1, sem taxas), corrigida por ajuste; o apuramento avisa se faltar | #158 | **Em produção** desde 12/11; base recriada e verificada (2025 dá prejuízo de 172 052 221,28: o seed indicou zero, com a nota e quem indicou, sem lançamento IMP; o APU-2025 sem 87; 2026 ainda por indicar; 1999 dá 400; Balanços equilibrados e 43.1 igual às contas em kwanzas) |
| 36 | Quem aprova a despesa de colaborador indica a conta da natureza (por exemplo a formação de um administrador na 72.7.1); as 72.3 a 72.8 separam órgãos sociais e pessoal pelo cargo | #159 | **Em produção** desde 13/11; base recriada e verificada (a formação do Administrador de 10/12/2025 na 72.7.1, 185 000, e a de um técnico de 29/09/2026 na 72.7.2, 48 000, ambas contra a 36.9 e reembolsadas pela 43.1; as outras 29 despesas aprovadas na 75.2.39; a regra activa com o custo pelo líquido; Balanços equilibrados e 43.1 igual às contas em kwanzas) |
| 37 | Quem decidiu a folha também não entrega o IRT e o INSS dela, e uma conta sem colaborador também não (BR-3) | #160 | **Em produção** desde 13/11; base recriada e verificada (11 entregas de IRT e 11 de INSS, `PAG-IRT-…` e `PAG-INSS-…`, feitas pelo seed com a conta `admin`, que não decide a folha) |
| 38 | O apuramento do ano lembra a actualização cambial de 31/12 se ainda deixaria diferenças (a actualização continua a pedido, sem cadência imposta) | #161 | **Em produção** desde 13/11; base recriada e verificada (o seed actualiza Dezembro antes de apurar, com `ACT-2025-12` e `ACD-2025-12`, por isso o apuramento de 2025 não tem diferenças a lembrar) |
| 39 | Quebras e sobras da contagem física: o contabilista escolhe, em cada regularização, se ficam no custo (71) ou vão para a 78.4.1 / 68.4.1 | #162 | **Em produção** desde 13/11; base recriada e verificada (`REX-2025` com «Quebras da 22.3 (inventário físico)»: 201 631,27 na 78.4.1 contra a 71.3; a DR de 2025 mostra-os no resultado não operacional; Balanços equilibrados e 43.1 igual às contas em kwanzas) |
| 40 | O adiantamento de salário pede-se (portal ou finanças), aprova-se no motor (`finance.salary_advance`) e só depois se paga, por quem não o decidiu | #163, #164 | **Em produção** desde 13/11; base recriada e verificada (6 pedidos, de Fevereiro, Junho e Outubro, todos aprovados pelo Director Financeiro e pagos, cada um com o seu `ADT-…`; as folhas de Fevereiro e Junho descontaram-nos; os 204 000 de Outubro estão na 36.3 à espera da folha de Outubro, ainda por aprovar; Balanços equilibrados e 43.1 igual às contas em kwanzas) |
| 41 | Regularização anual do IVA pelo pró-rata, indicada pelo contabilista (34.5.4.3 contra a 75.3.1.2, a 63.5 ou o imobilizado), corrigida por ajuste | #165 | **Em produção** desde 13/11; base recriada e verificada (2025 com a regularização indicada pelo seed: `PRT-2025` a 31/12, DIV, 238 403,27 na 75.3.1.2 contra a 34.5.4.3; o `IVA-2025-12` levou-a e a 34.5.4.3 ficou a zero; Balanços equilibrados e 43.1 igual às contas em kwanzas) |
| 42 | Corrigir o IVA não dedutível de uma factura de compra já registada, sem a anular (na 34.5.2 antes do apuramento do mês, na 34.5.4 depois) | #166 | **Em produção** desde 13/11; base recriada e verificada (duas compras com metade do IVA corrigida: a FT 2026/46248 de 21/09, antes do apuramento, com o `ND1-…` nessa data, 75.2.39 contra a 34.5.2.3; a FT 2026/92629 de 30/08, já apurada, com o `ND1-…` de hoje, 21.1 contra a 34.5.4.2; `nonDeductibleTaxCorrections` 1 em ambas; Balanços equilibrados e 43.1 igual às contas em kwanzas) |
| 45 | Segundo factor (MFA) com a app autenticadora: login em dois passos, inscrição com QR e códigos de recuperação, reposição pelo admin; a obrigatoriedade para quem decide ou movimenta fundos fica desligada até o front ter o ecrã | #170 | Em revisão |
| 44 | Anti-fraccionamento: a alçada de um pedido de pagamento escolhe-se pelo acumulado de 30 dias do mesmo fornecedor e da mesma rubrica (BR-7) | #169 | Em revisão |
| 43 | O Finance escolhe em nome de quem pede o adiantamento de salário, sem ler os RH (B46); o seed volta a ser completo por omissão | #167 | **Em produção** desde 13/11; base recriada com o seed completo e verificada (a conta QA Finance recebe os 63 colaboradores activos na lista nova e continua com 403 em `/hr/employees`; 1453 facturas de venda, 319 de compra, 153 despesas, 25 viaturas, 4 sinistros todos dentro da vigência; Balanços equilibrados e 43.1 igual às contas em kwanzas) |

**Antes de começar:** actualizar `openapi/v1.json` a partir do commit
publicado (procedimento em `openapi/README.md`) e correr `npm run api:types`.
O ficheiro actual é de 13/10 (`01c7d6c`) e não tem nenhuma destas rotas. Para
o ponto 2, usar o commit do merge do #118, depois do deploy.

---

## 1. Portal do Colaborador: benefícios, contrato e dados pessoais (PR #117)

O documento de produto (§11) pede «Consulta de benefícios activos»,
«Visualização do contrato de trabalho» e acesso à «informação pessoal». São
três leituras novas, do mesmo tipo das outras rotas `/portal/me/*`.

**Regras comuns às três rotas:**
- Basta ter a sessão iniciada; não há permissão própria.
- O colaborador sai do token, nunca do pedido.
- **Erros:**
  - `401`: sem sessão;
  - `403`: conta sem colaborador associado. Usar o mesmo aviso das outras
    páginas do portal.
- Só leitura; não há escrita em nenhuma delas.

### 1.1 `GET /portal/me/benefits`

**Resposta:** lista com as adesões activas primeiro e, em cada grupo, as mais
recentes primeiro.

```json
[
  {
    "enrolmentId": "guid",
    "benefitId": "guid",
    "name": "Seguro de saúde",
    "kind": "Health",
    "monthlyValue": 15000.00,
    "currency": "AOA",
    "description": "texto ou null",
    "startsOn": "2026-01-01",
    "cancelledOn": null,
    "status": "Active"
  }
]
```

**Sugestão de ecrã** (nova página «Benefícios» no portal, ao lado de Recibos):
- **Lista:**
  - mostrar `name` e `kind`;
  - o valor mensal com a moeda;
  - «desde `startsOn`»;
  - se `cancelledOn` estiver preenchido, «terminado a …».
- **Separação:** activos em cima, os outros num bloco «Anteriores».
  `status` vale `Active` (activo) ou `Cancelled` (terminado).
- **Lista vazia:** «Ainda não tem benefícios atribuídos. Fale com os Recursos
  Humanos.»

### 1.2 `GET /portal/me/contracts`

**Resposta:** lista ordenada do contrato mais recente para o mais antigo.

```json
[
  {
    "contractId": "guid",
    "type": "Permanent",
    "startsOn": "2025-01-01",
    "endsOn": null,
    "monthlySalary": 350000.00,
    "currency": "AOA",
    "status": "Active"
  }
]
```

**O que traz e o que não traz:**
- **Traz o salário.** É o contrato do próprio, que já vê o salário bruto nos
  recibos.
- **Não traz as notas internas de RH:** o campo `notes` não existe nesta
  vista. Não o procurar.

**Tradução de `type`:**

| Valor | Texto |
|---|---|
| `Permanent` | Sem termo |
| `FixedTerm` | A termo certo |
| `Freelance` | Prestação de serviços |

**Estado (`status`):** `Active` (em vigor) ou `Terminated` (terminado).

Os mesmos valores aparecem em `/hr/contracts`. Se o front já tiver a tradução
na página de RH, reaproveitá-la.

**Sugestão de ecrã** (página «O meu contrato»):
- em destaque, o contrato mais recente (o primeiro da lista), com o tipo, as
  datas («sem data de fim» quando `endsOn` é `null`), o salário e o estado;
- os contratos anteriores numa lista curta por baixo;
- lista vazia: «Não há contrato registado. Fale com os Recursos Humanos.»

### 1.3 `GET /portal/me/personal-data`

**Resposta:** um objecto. Todos os campos podem vir `null` enquanto RH não os
preencher.

```json
{
  "email": "string|null", "phone": "string|null",
  "gender": "string|null", "birthDate": "date|null",
  "nationality": "string|null", "maritalStatus": "string|null",
  "taxId": "string|null",
  "identityDocumentNumber": "string|null", "identityDocumentExpiresOn": "date|null",
  "socialSecurityNumber": "string|null",
  "addressDetail": "string|null", "city": "string|null", "country": "string|null",
  "bankName": "string|null", "bankAccountNumber": "string|null", "iban": "string|null",
  "emergencyContactName": "string|null", "emergencyContactRelationship": "string|null",
  "emergencyContactPhone": "string|null",
  "updatedAt": "datetime|null"
}
```

**Sugestão de ecrã** (completar a página de perfil do portal):
- **Secções:**
  - Contactos: `email` e `phone`;
  - Identificação: `taxId`, BI e validade, segurança social;
  - Morada;
  - Dados bancários;
  - Contacto de emergência.
- **Campos `null`:** mostrar «—».
- **Data de actualização:** «Actualizado a …» a partir de `updatedAt`, ou
  nada se for `null`.
- **Sem edição.** Mostrar o aviso: «Para corrigir estes dados, abra um pedido
  aos Recursos Humanos», com uma ligação para criar um ticket já com
  `category: "HumanResources"` (`POST /portal/me/tickets`).

  O colaborador não altera os próprios dados de propósito: mudar o IBAN sem
  passar por RH é uma via conhecida de desvio de salário. **Não** criar um
  formulário de edição.
- **BI caducado:** se `identityDocumentExpiresOn` já passou, assinalar a data
  (por exemplo a vermelho, «caducado»).
- **Visibilidade:** o IBAN e o BI só aparecem ao próprio. Mostrá-los por
  extenso nesta página é correcto.

**Verificado em produção** com a conta QA de colaborador: as três rotas dão
200 com os dados do próprio. Com a conta QA de cliente, que não é
colaborador, dão 403.

---

## 2. Aprovações: validação de conformidade com checklist (K4, PR #118)

> **Só depois do deploy do #118.** Até lá, as rotas aceitam os campos novos
> mas ignoram-nos, porque o backend em produção ainda não os conhece. Usar o
> OpenAPI do commit do merge.

**O que é:** no SGAP, a DAF confirma um checklist de conformidade antes de a
Direcção aprovar um pagamento. Agora qualquer política de aprovação pode ter
**passos de validação**:
- quem valida responde a um checklist, item a item;
- só com tudo conforme o processo segue para quem aprova;
- **quem valida não aprova:** a mesma pessoa não decide duas vezes no mesmo
  pedido. Isto já era assim e não é preciso tratar no front.

**Os itens são escritos pelo Admin.** O sistema não traz nenhum.

**Compatibilidade:**
- Nada muda nas políticas e nos pedidos que já existem: todos os passos
  continuam a ser de aprovação.
- Todos os campos novos são opcionais, por isso o front actual continua a
  funcionar sem alterações.

### 2.1 Criar política (`Politicas.tsx`): `POST /approval/policies`

Cada passo aceita dois campos novos, `kind` e `checklist`:

```json
{
  "processType": "finance.payment_request",
  "steps": [
    {
      "approverPositionId": "<cargo DAF>",
      "kind": "Validation",
      "checklist": [
        { "text": "Factura original anexada" },
        { "text": "NIF do fornecedor confere com a factura" },
        { "text": "Três cotações comparativas", "mandatory": false }
      ]
    },
    { "approverPositionId": "<cargo que aprova>" }
  ]
}
```

**Regras** (o servidor responde `400` com a mensagem em `errors.politica`):
- **`kind`:** `"Approval"` (por omissão, se omitido) ou `"Validation"`.
- **Passo `Validation`:** exige `checklist` com 1 a 30 itens.
- **Passo `Approval`:** recusa `checklist`.
- **Item:**
  - `text` é obrigatório, até 500 caracteres;
  - `mandatory` vale `true` por omissão;
  - um item obrigatório não aceita «não aplicável».

**Sugestão de formulário:**
- em cada passo, um selector «Tipo: Aprovação / Validação (checklist)»;
- com «Validação», aparece um editor de lista: cada linha tem um texto e uma
  caixa «obrigatório» (marcada por omissão), com botões para acrescentar e
  remover linhas.

**Na listagem (`GET /approval/policies`):** cada passo traz agora `kind` e
`checklist: [{ order, text, mandatory }]`. Mostrar «Validação · N itens» nos
passos de validação.

**Configurar uma alçada sem a apagar:** as políticas não se editam. Para
acrescentar a validação, o Admin cria uma política nova e desactiva a antiga
(`POST /approval/policies/{id}/deactivation`). Convém explicar isto no ecrã.

### 2.2 Ver um pedido (`Pedido.tsx` e `Caixa.tsx`): `GET /approval/requests/{requestId}`

Campo novo: **`currentChecklist`**.
- Vem preenchido **só** quando o pedido está aberto (`InProgress` ou
  `ClarificationRequested`) **e** o passo em curso é de validação. Nos outros
  casos vem `null`.

```json
"currentChecklist": [
  { "itemId": "guid", "step": 1, "order": 1, "text": "Factura original anexada", "mandatory": true },
  { "itemId": "guid", "step": 1, "order": 3, "text": "Três cotações comparativas", "mandatory": false }
]
```

Na caixa de entrada (`GET /approval/requests?pendingFor=…`), cada pedido traz
o mesmo campo. Pode servir para mostrar uma etiqueta «Validação» na lista.

### 2.3 Decidir (`Pedido.tsx`): `POST /approval/requests/{requestId}/decisions`

O corpo ganha `checklist`:

```json
{
  "action": "Approved",
  "notes": "Conferido",
  "checklist": [
    { "itemId": "guid", "response": "Compliant" },
    { "itemId": "guid", "response": "NotApplicable" }
  ]
}
```

**Respostas possíveis:** `Compliant` (conforme), `NonCompliant` (não
conforme) e `NotApplicable` (não aplicável, só em itens não obrigatórios).

**Regras do servidor** (todas dão `400` com a mensagem em `errors.checklist`):

| Acção | Regra |
|---|---|
| `Approved` | Todos os itens de `currentChecklist` respondidos, nenhum `NonCompliant` |
| `Rejected`, `ClarificationRequested` | Respostas parciais aceites, mas coerentes. Serve para indicar o item que falhou |
| Qualquer acção | `NotApplicable` num item obrigatório dá 400; um `itemId` que não é do passo dá 400; o mesmo item duas vezes dá 400 |
| Passo de aprovação (`currentChecklist` a `null`) | **Não enviar** `checklist`, ou o servidor responde 400 |

Os erros que já existiam mantêm-se: 403 (quem pediu ou quem já decidiu), 409
(processo fechado, ou pessoa não atribuída a este passo) e 404.

**Sugestão de ecrã de decisão, quando `currentChecklist` não é `null`:**
- **Itens:** cada item numa linha, com três opções (Conforme / Não conforme /
  N/A); N/A fica desactivado nos itens obrigatórios. Marcar os obrigatórios
  com «*».
- **Botão «Validar»:** é a acção `Approved`. Fica activo só quando todos os
  itens estão respondidos e nenhum está «Não conforme». O servidor confirma
  na mesma.
- **Algum item «Não conforme»:**
  - desactivar «Validar»;
  - sugerir «Rejeitar» ou «Pedir esclarecimento»;
  - pedir uma nota com a justificação. Não há campo de justificação por
    item: vai em `notes`.
- **Textos dos botões:** «Validar» em vez de «Aprovar», para ficar claro que
  é a conformidade e não a decisão final.

### 2.4 Histórico (`GET /approval/requests/{requestId}/history`)

**Campos novos:**
- `checklist`: todos os itens de todos os passos de validação, no mesmo
  formato de `currentChecklist`;
- `decisions[].checklist`: `[{ itemId, response }]`, só nas decisões de
  passos de validação; nas outras vem `null`.

**Sugestão:** na linha do tempo, por baixo da decisão de validação, mostrar a
lista dos itens com a resposta de cada um (✓ conforme, ✗ não conforme, — não
aplicável), cruzando `itemId` com `checklist`.

---

## 3. Respostas ao `PENDENCIAS-PARA-BACKEND.txt` (sem código novo no backend)

A explicação completa está em `rivo/RESPOSTA-PENDENCIAS-BACKEND.txt`. Para o
front, fica isto:

| Página | O que fazer no front |
|---|---|
| Declarações à AGT | O IVA e as retenções já existem e estão ligados em `contabilidade` (`/finance/tax-summaries/vat` e `/withholdings`). O **Modelo 1** não existe: esconder ou marcar «em breve»; depende do formato oficial (contabilista/AGT) |
| Filas de RH genéricas | Não há fila genérica, e não vai haver. Usar os tickets do portal com `category: "Other"` para pedidos sem tipo. Descontinuar a página |
| Erros da aplicação (Admin) | Fora do produto. Os erros da API já trazem `traceId` (RFC 9457); para os erros do browser, integrar uma ferramenta de telemetria (ex.: Sentry) no front. Descontinuar a página |
| Métricas diárias (Admin) | **Substituído pela secção 5:** passou a obrigatório. Facturas e recebimentos pelas rotas existentes; eventos de auditoria por dia em `/audit/entries/daily-count` (#120) |
| Auditoria interna (GRC) | **Substituído pela secção 4:** passou a obrigatória e o backend implementou-a (#119) |

**Rotas de trocas de turno** (correcção ao levantamento):
- pedir: `POST /portal/me/shifts/{assignmentId}/change-requests`;
- listar: `GET /portal/me/shift-change-requests`;
- cancelar: `POST /portal/me/shift-change-requests/{requestId}/cancellation`.

Não existe `GET /portal/me/shifts/{id}/change-requests`.

---

## 4. Auditoria interna (`InternalAudit.tsx`, PR #119)

A página deixa a camada `mock:` (localStorage) e passa a ler e gravar no
servidor. As rotas estão em `/internal-audit/...`, e **não** em `/audit/...`:
`/audit/entries` continua a ser só a trilha técnica.

### 4.1 O que muda face ao mock

| No mock | Na API |
|---|---|
| `tenant_id` | Não existe: o Rivo é de uma só empresa. Tirar o filtro por tenant |
| `audit_number` calculado no browser | `auditNumber` gerado no servidor (`AUD-2026-001`), único |
| `area` (`finance`, `hr`, …) | `departmentId` (departamento real) e `departmentName` |
| sem responsável | `ownerEmployeeId` **obrigatório** na auditoria e em cada plano; `ownerName` nas respostas |
| `risk_rating` low/medium/high/critical | `riskRating`: `Low`, `Medium`, `High`, `Critical` |
| `severity` observation/minor/major/critical | `severity`: `Low`, `Medium`, `High`, `Critical` (a mesma escala do risco) |
| estados em snake_case | PascalCase: auditoria `Planned`, `InProgress`, `Reporting`, `Closed`, `Cancelled`; achado `Open`, `InRemediation`, `Closed`, `AcceptedRisk`; plano `Pending`, `InProgress`, `Done` |
| `overdue` como estado do plano | `isOverdue` (booleano calculado: prazo passado e não `Done`) |
| «Conformidade 100%» sem achados | `compliancePercent` vem `null` sem achados: mostrar «—» |

Textos sugeridos: Baixo, Médio, Alto, Crítico · Planeada, Em curso,
Relatório, Fechada, Cancelada · Aberto, Em correcção, Fechado, Risco aceite ·
Pendente, Em curso, Concluído.

### 4.2 Rotas por ecrã

- **Cartões do topo:** `GET /internal-audit/overview` devolve
  `{ activeAudits, openFindings, overdueActionPlans, compliancePercent }`.
- **Aba Auditorias:**
  - listar: `GET /internal-audit/audits` (filtros `status`, `departmentId`);
  - criar: `POST /internal-audit/audits` com
    `{ title, objectives, scope, departmentId, ownerEmployeeId, plannedStart, plannedEnd, riskRating }`;
  - os selects de departamento e de responsável vêm de
    `GET /internal-audit/lookups` (`{ departments[], employees[] }`).
- **Detalhe de uma auditoria:**
  - `GET /internal-audit/audits/{id}` devolve `{ audit, findings[], actionPlans[] }`;
  - histórico: `GET /internal-audit/audits/{id}/history`, com
    `{ action, entityType, entityId, actorName, occurredAt }`.
- **Mudar de fase:** `PUT /internal-audit/audits/{id}` com os campos todos e
  `status`.
  - Uma fase de cada vez: Planeada → Em curso → Relatório → Fechada. Do
    Relatório pode voltar a Em curso.
  - Fechar exige os achados todos fechados ou com risco aceite (senão 409).
  - Cancelar exige `cancellationReason` (senão 400).
  - Botões sugeridos, pela fase: «Iniciar», «Passar a relatório», «Fechar»,
    «Cancelar».
- **Aba Achados:**
  - listar: `GET /internal-audit/findings` (filtros `auditId`, `status`,
    `severity`);
  - criar: `POST /internal-audit/audits/{auditId}/findings` com
    `{ description, severity, controlRef, recommendation }`. Só funciona com
    a auditoria Em curso ou em Relatório (senão 409); o botão «Novo Achado»
    pede a auditoria;
  - fechar ou aceitar o risco: `PUT /internal-audit/findings/{id}` com
    `status`. Fechar exige os planos todos `Done`. Aceitar o risco exige
    `resolutionNotes`;
  - **403** quando quem fecha é responsável por um plano desse achado.
    Mostrar «Quem executa o plano não pode fechar o achado».
- **Aba Planos de Acção:**
  - listar: `GET /internal-audit/action-plans` (filtros `status`,
    `overdue=true`, `ownerEmployeeId`);
  - criar: `POST /internal-audit/findings/{findingId}/action-plans` com
    `{ action, ownerEmployeeId, dueDate }`. O achado passa sozinho a «Em
    correcção»;
  - actualizar: `PUT /internal-audit/action-plans/{id}` com
    `{ action, ownerEmployeeId, dueDate, status }`.

### 4.3 Quem vê

- **Admin:** tudo.
- **Manager:** só leitura. Esconder os botões de criar e editar a quem não
  tem `internalaudit.*.write`.
- **Outros perfis:** não vêem (403). Retirar a entrada do menu.

## 5. Eventos de auditoria por dia (`AdminMetrics.tsx`, PR #122)

- **Contagem para o gráfico:** `GET /audit/entries/daily-count?from=2026-10-01&to=2026-10-25`
  devolve `[{ date: "2026-10-01", count: 12 }, …]`, um elemento por dia, com
  os dias sem eventos a 0.
  - `from` e `to` são obrigatórios e são dias UTC, inclusivos.
  - O período tem no máximo 366 dias; acima disso dá 400.
  - Permissão `audit.trail.read` (Admin).
- **Lista do período:** `GET /audit/entries?from=…&to=…&page=1&pageSize=50`
  traz os cabeçalhos `X-Page`, `X-Page-Size` e `X-Total-Count`.
  - Sem `page` nem `pageSize` responde como antes (as `limit` mais
    recentes), por isso nada do que já existe muda.
- Com isto, o cartão «Eventos de auditoria» já pode entrar no painel, com
  contagens exactas.

## 6. B42: nomes dos esquemas de checklist (PR #121)

Depois de regenerar os tipos (`npm run api:types`):
- o passo de uma tarefa usa `TaskChecklistItemRequest` (`{ title }`). Pode
  sair o tipo local de `features/projectos/api.ts`;
- os itens de checklist das políticas (K4) usam
  `PolicyChecklistItemRequest` (`{ text, mandatory }`);
- `ChecklistItemRequest` deixa de existir. O JSON enviado não muda.

---

## 7. Contabilidade conforme o PGC (PR #125)

O backend passou a seguir o **Plano Geral de Contabilidade** angolano
(Decreto n.º 82/01, com o IVA). O resumo está aqui; o detalhe de cada rota,
em `API-FRONTEND.md`.

**O que muda sem o front fazer nada:**
- Em produção, o arranque carrega as 752 contas do PGC, os diários e as
  regras de lançamento.
- A partir daí, facturas, notas de crédito, recibos, compras e pagamentos
  lançam sozinhos nas contas do decreto. O balancete, o extracto e os
  relatórios genéricos passam a ter valores.
- Um documento noutra moeda sem câmbio do dia (ou anterior) deixa de se
  emitir: **409**, com a razão no `detail`. Mostrar a mensagem como nas outras
  recusas de emissão.

### 7.1 Ecrãs novos sugeridos (todos do Admin ou do Finance)

| Ecrã | Rota | Permissão | Notas |
|---|---|---|---|
| Carregar o PGC | `POST /finance/ledger/pgc` | `finance.ledger.close` (Admin) | Botão em Contabilidade → Plano de contas. Mostrar `accountsCreated`, `postingRulesCreated` e `notes`. Repetir não faz mal. |
| Balanço oficial | `GET /finance/reports/statutory/balance-sheet?fiscalYear=&uptoPeriod=&unit=` | `finance.reports.read` | Tabela com `lines`: `kind` Heading (título, sem valores), Item (com `note`) e Total; colunas `current` e `previous`. Cabeçalho: `entityName`, «Balanço em» `reportingDate`, «Valores expressos em» `unitLabel`. Mostrar `notes` como avisos e `outsideThePlan`, se houver. |
| DR oficial | `GET /finance/reports/statutory/income-statement?...` | `finance.reports.read` | Mesmo formato, 19 linhas. Os custos vêm negativos. |
| Apuramento do IVA | `POST /finance/ledger/vat-settlements` `{ fiscalYear, month, carryForwardCredit }` | `finance.ledger.write` | Mostrar `outputTax`, `deductibleTax`, `adjustments`, `creditBroughtForward`, `payable`, `recoverable`. `outcome` `NothingToSettle` quer dizer que o mês já estava apurado. |
| Fecho do exercício | `POST /finance/ledger/fiscal-years/{ano}/closing` | `finance.ledger.close` (Admin) | Pedir confirmação. Mostrar `netResult` e `entries`. `NothingToDo` quer dizer já apurado. |
| Abertura do exercício | `POST /finance/ledger/fiscal-years/{ano}/opening` | `finance.ledger.close` (Admin) | 409 se o ano anterior não estiver apurado ou se `{ano}` já tiver sido aberto. Mostrar o `detail`. |

### 7.2 Alterações a ecrãs existentes

- **Facturas e notas de crédito:** cada linha aceita `kind`, `"Goods"` (bens)
  ou `"Service"` (serviços, a omissão). Propor um selector por linha. Os bens
  lançam em 61 Vendas e os serviços em 62 Prestações de serviços; o SAF-T
  passa a declarar `P` ou `S`. Outro valor dá 400. Na leitura da factura,
  cada linha traz `kind`.
- **Facturas de compra:** campo opcional `expenseAccountCode`, a conta do PGC
  onde a despesa lança (por exemplo 75.2.12 Electricidade, 75.2.20
  Comunicação). Sem ele, lança em 75.2.39 Outros serviços. Uma conta que não
  existe, está inactiva ou tem subcontas dá 400. A leitura devolve-o.
- **Apuramento do IVA:** `outcome` vem como texto (`"Settled"` ou
  `"NothingToSettle"`).
- **Activos fixos:** campo opcional `ledgerAccountCode` (conta do PGC do bem).
  Propor uma lista com 11.2 Edifícios, 11.3 Equipamento básico, 11.4
  Equipamento de carga e transporte, 11.5 Equipamento administrativo, 11.6
  Taras e vasilhame, 11.9 Outras corpóreas e 12.x incorpóreas. Os terrenos
  (11.1) dão 400.
- **Processar amortizações:** a resposta traz `journalEntryId` e
  `ledgerNote` (porque não lançou). Com o período fechado: 409.
- **Plano de contas:** abrir uma subconta debaixo de uma conta de movimento
  sem lançamentos transforma-a em agregadora (por exemplo «43.1.1 Banco BAI»
  debaixo de «43.1»). Com lançamentos, dá 409.
- **Regras de lançamento:** há um acontecimento novo,
  `CashReceiptRegistered` (recibos em numerário ou cheque, conta 45.2).

## 8. Lançar o histórico (PR #126)

Os documentos emitidos antes de 30/10 (desde Outubro de 2025) não têm
lançamento, porque nessa altura não havia regras. Esta rota lança-os, como a
emissão os teria lançado: cada um na sua data e ao câmbio desse dia.

| Ecrã | Rota | Permissão | Notas |
|---|---|---|---|
| Lançar o histórico | `POST /finance/ledger/document-postings` `{ from, to, dryRun }` | `finance.ledger.close` (Admin) | Em Contabilidade → Fecho. Escolher um mês; primeiro `dryRun: true` (mostra o que lançaria), depois confirmar sem `dryRun`. |

**A resposta:**
- `posted`: lançamentos feitos (ou que se fariam, com `dryRun`);
- `alreadyPosted`: já existiam;
- `cancelled`: documentos anulados, que não lançam;
- `withoutRule`: de acontecimentos sem regra activa;
- `postedByKind`: por tipo (`SalesInvoice`, `CreditNote`, `Receipt`,
  `PurchaseInvoice`, `Payment`);
- `problems`: `{ document, date, error }`, cada documento que não lançou e
  porquê. Mostrar como lista.

**Regras para o ecrã:**
- No máximo 31 dias por pedido; mais dá **400**. Para um ano, o ecrã pode
  percorrer os meses um a um e somar os totais.
- Repetir não duplica: o que já lançou conta em `alreadyPosted`.
- Em produção, Out/2025 a Out/2026 já estão lançados: nesses meses o ecrã
  mostra `posted: 0` e tudo em `alreadyPosted`.

## 9. Abate e venda de activos no razão (PR #127)

Quando o PGC está carregado e o activo tem conta (`ledgerAccountCode`),
abater ou vender um activo passa a lançar no razão, como já acontece com a
amortização (ADR-096).

| Ecrã | Rota | Permissão | Notas |
|---|---|---|---|
| Activo → Abater | `POST /finance/assets/{id}/disposal` `{ on, value, reason }` | `finance.assets.write` | **Responde 200** (antes 204) com `{ assetId, journalEntryId, ledgerNote }` |

**O que mostrar depois de abater:**
- `journalEntryId`: o lançamento no razão. Pôr uma ligação, como na
  amortização.
- `ledgerNote`: porque não lançou (o activo não tem conta do PGC, ou tem uma
  conta agregadora como 11.2 ou 11.3). Mostrar como aviso, porque o abate
  ficou gravado.
- **409:** período fechado ou câmbio em falta, e nada se gravou. Mostrar o
  `detail`.

**O lançamento**, para o texto de ajuda:
- a 18.x (amortizações) e a 11.x/12.x (custo) saldam-se pela conta do
  resultado: 68.3.1 (ganho na venda), 78.3.1 (perda na venda) ou 78.3.3
  (abate sem valor);
- o valor da venda fica na 37.2.1 (Vendas de imobilizado) até se receber.

**Lista de contas do activo** (`CONTAS_PGC_ACTIVO` em
`features/activos/regras.ts`): o abate credita a conta do próprio bem, por
isso ela tem de ser de movimento. A 11.2 e a 11.3 são agregadoras. Proposta:
- trocar a 11.2 por:
  - 11.2.1.1 a 11.2.1.4 (edifícios);
  - 11.2.2 (outras construções);
  - 11.2.3 (instalações);
- trocar a 11.3 por 11.3.1 a 11.3.3.

A amortização funciona com qualquer delas.

**Venda que se factura:** se a venda se facturar no Rivo, abater sem valor. A
factura leva o produto e o IVA, e o abate leva o custo e as amortizações.

**Dados de QA:** depois de recriar a base e correr o seed, os activos já têm
conta do PGC, e o razão traz o ano completo: compras dos bens, saldos iniciais
do imobilizado, amortizações, um abate, IVA apurado mês a mês, fecho do ano
anterior e abertura do corrente. O seed não declara os dados da empresa:
declará-los em Configurações → Dados da empresa.

## 10. A folha de salários no razão (PR #128)

Quando uma folha fica aprovada, passa a lançar no razão (ADR-097), no último
dia do mês. Os salários e o INSS da empresa vão para custo, e o líquido, o IRT
e o INSS ficam a pagar.

| Ecrã | Rota | Permissão | Notas |
|---|---|---|---|
| Folha → Ver a decisão | `POST /payroll/runs/{id}/decision` | `payroll.runs.read` | A resposta ganha `ledgerOutcome`, `journalEntryId` e `ledgerNote`, preenchidos quando a folha fica aprovada |
| Folha aprovada → Lançar no razão | `POST /payroll/runs/{id}/ledger-posting` | `payroll.runs.write` | **Nova.** Serve para quando não lançou da primeira vez. Responde 200 com `{ outcome, journalEntryId, note }`; 409 se a folha não está aprovada ou se ainda não pode lançar |

**O que mostrar, conforme o `ledgerOutcome`:**
- `Posted` ou `AlreadyPosted`: uma ligação para o lançamento
  (`journalEntryId`).
- `NotPosted` (o PGC não está carregado): um aviso com o `ledgerNote`.
- `Blocked` (período fechado ou sem taxa de INSS patronal): um aviso com o
  `ledgerNote` e o botão «Lançar no razão».

O botão «Lançar no razão» pode estar sempre na folha aprovada, porque repetir
não duplica.

**O lançamento**, para o texto de ajuda:
- a débito: 72.2 (salários, pelo bruto) e 72.5.2 (INSS da empresa, 8%);
- a crédito: 36.1.2 (líquido a pagar), 34.3 (IRT retido) e 34.7 «Segurança
  social» (INSS do trabalhador e da empresa);
- as linhas de custo levam o centro de custo do departamento do colaborador.

**Dados de QA:** as folhas que já estão aprovadas na base não lançaram. Há
duas formas de as ver no razão:
- recriar a base e correr o seed outra vez;
- usar «Lançar no razão» em cada folha e, a seguir, refazer o fecho de 2025 e
  a abertura de 2026.

## 11. Pagar os salários, entregar ao Estado e depositar valores (PR #129)

Três operações de tesouraria novas (ADR-098). Cada uma tira ou põe dinheiro
na conta bancária, que fica com a linha no extracto, e lança no razão na mesma
gravação. Ficam todas com a data do dia, como o pagamento a fornecedores.

| Ecrã | Rota | Permissão | Notas |
|---|---|---|---|
| Folha aprovada → Pagar salários | `POST /finance/treasury/payroll-payments` `{ year, month, bankAccountId }` | `finance.payments.execute` | Paga o líquido que a folha lançou (36.1.2) |
| Impostos → Entregar ao Estado | `POST /finance/treasury/tax-payments` `{ tax, year, month, bankAccountId }` | `finance.payments.execute` | `tax` é `IRT`, `INSS` ou `IVA` |
| Contas bancárias → Depositar valores | `POST /finance/treasury/cash-deposits` `{ bankAccountId, amount, reference }` | `finance.payables.write` | Numerário e cheques recebidos (sai da 45.2) |

**A resposta (200):** `{ journalEntryId, amount, bankBalance }`. Mostrar o
valor pago e o saldo que ficou na conta, com uma ligação para o lançamento.

**O valor dos pagamentos não se pede.** É o que a folha ou o apuramento do IVA
deixaram, e o servidor calcula-o. O ecrã escolhe só o mês e a conta. No
depósito, o valor é o do talão.

**Recusas — mostrar o `detail`:**
- **409:**
  - a folha não está lançada no razão, ou o IVA não está apurado (a mensagem
    diz o que fazer);
  - o mês já está pago;
  - saldo insuficiente;
  - período fechado.
- **400:** conta que não é em kwanzas, ou `tax` desconhecido.

**Extracto:** os movimentos novos trazem `sourceType` `payroll_payment`,
`tax_payment` ou `cash_deposit`.

## 12. O recebimento por banco entra na conta bancária (PR #130)

O recibo e a factura-recibo pagos por banco já lançavam na 43.1, mas não
mexiam no saldo da conta bancária. Agora, com a conta indicada, o dinheiro
entra nela (ADR-099), e a tesouraria passa a bater com o razão.

| Ecrã | Rota | Campo novo | Notas |
|---|---|---|---|
| Registar recibo | `POST /finance/receipts` | `bankAccountId` | Pedir a conta quando o meio é por banco (transferência, Multicaixa, cartão). Em numerário ou cheque, não mostrar: esse dinheiro fica para depositar |
| Nova factura → FR | `POST /finance/sales-invoices` | `bankAccountId` | Só na FR, com o mesmo critério do meio |
| Comprovativos → Confirmar | `POST /finance/payment-claims/{id}/confirmation` | corpo `{ bankAccountId }` | É uma transferência: pedir a conta. Sem corpo continua a funcionar |

**A lista de contas:** `GET /finance/accounts`, filtrada pela moeda do
documento e só as activas.

**Recusas — mostrar o `detail`:**
- **400:** conta em numerário ou cheque, conta noutra moeda, ou conta numa
  FT ou ND;
- **409 ao anular:** a conta já não tem o dinheiro que o recibo pôs lá.

**Extracto da conta:** as entradas novas trazem `sourceType` `receipt` (com o
id do recibo) ou `invoice_receipt` (com o id da factura). A anulação aparece
como `receipt_reversal`.

## 13. A data-valor das operações de banco (PR #132)

Até aqui, tudo o que mexia numa conta bancária ficava com a data do dia em que
se registava. Agora cada movimento tem a sua **data-valor** (`on`): o dia em
que o dinheiro entrou ou saiu do banco (ADR-100).

**Campo novo `on`, opcional, nas rotas que movem dinheiro:**

| Ecrã | Rota | Regra |
|---|---|---|
| Pagamentos → Executar | `POST /finance/payment-requests/{id}/execution` | Não antes da data do pedido. O pedido fica executado nesse dia |
| Tesouraria → Pagar salários | `POST /finance/treasury/payroll-payments` | Não antes do mês que se paga |
| Tesouraria → Entregar ao Estado | `POST /finance/treasury/tax-payments` | Igual |
| Tesouraria → Depositar valores | `POST /finance/treasury/cash-deposits` | O dia do talão |
| Contas → Depositar / Levantar | `POST /finance/accounts/{id}/deposits` · `/withdrawals` | Nenhuma |

- **O campo:** é uma data (`AAAA-MM-DD`). Mostrar um campo «Data», com hoje
  por omissão; omitido no pedido, é hoje.
- **Recusas — mostrar o `detail`:**
  - data futura: 400 (409 no levantamento, como as outras recusas dele);
  - período fechado: 409.
- **O razão:** o lançamento sai nessa data.

**Extracto (`GET /finance/accounts/{id}/statement`):**
- Cada movimento traz `on` (a data-valor) além de `occurredAt` (quando se
  registou). Mostrar `on` como a data da linha.
- A ordem é a da data-valor, e `balanceAfter` é o saldo da linha nessa ordem.
- A janela `from`/`to` filtra pela data-valor.

**Recebimentos:** o recibo e a factura-recibo por banco entram no extracto
com a data do documento. Não há campo novo.

**Reconciliação:** os movimentos por conciliar também trazem `on`.

## 14. O banco em moeda estrangeira (PR #134)

Os recebimentos por banco e os pagamentos de documentos noutra moeda lançavam
na 43.1 «Depósitos à ordem – moeda nacional». Agora lançam na 43.2 «Moeda
estrangeira» (ADR-101), em kwanzas ao câmbio do dia, como já faziam.

**No front:**
- **Regras contabilísticas:** há dois acontecimentos novos. Acrescentar à
  lista de `src/features/contabilidade/comum.tsx`:

  ```ts
  { valor: "ForeignCurrencyReceiptRegistered", texto: "Recibo por banco em moeda estrangeira" },
  { valor: "ForeignCurrencyPaymentExecuted", texto: "Pagamento em moeda estrangeira" },
  ```

  Sem regra própria, lançam pelas de «Recibo registado» e «Pagamento
  executado».
- **Nada mais muda nas rotas.** Os lançamentos, o balancete e o Balanço passam
  a mostrar a 43.2.

## 15. Rascunhos e pró-formas: a natureza da linha e a conta da FR (PR #135)

Resposta ao B43 e ao B45.

| Ecrã | Rota | Campo novo | Notas |
|---|---|---|---|
| Rascunho → linhas | `POST`/`PUT /finance/invoice-drafts` | `lines[].kind` | `Goods` ou `Service` (omissão). Selector «Bens / Serviço» em cada linha. A vista do rascunho devolve-o |
| Pró-forma → linhas | `POST /finance/proformas` | `lines[].kind` | O mesmo; passa para a factura na conversão |
| Rascunho → Emitir | `POST /finance/invoice-drafts/{id}/issue` | `bankAccountId` | Só num rascunho de FR com meio por banco: «Conta onde entrou» |
| Pró-forma → Converter | `POST /finance/proformas/{id}/conversion` | `bankAccountId` | O mesmo, quando se converte em FR por banco |

- **A conta:** a lista é a de `GET /finance/accounts`, filtrada pela moeda do
  documento e só as activas. As recusas são as da FR directa: numa FT ou ND,
  em numerário ou cheque, ou com uma conta noutra moeda, dá 400 e o rascunho
  fica por emitir. Mostrar o `detail`.
- **A natureza:** um valor desconhecido dá 400. Os rascunhos gravados antes
  leem-se como serviço.

## 16. As versões do plano de contas (PR #136)

Resposta ao B44. Uma versão registada em «Versões do plano» fica sempre vazia,
porque não há como lhe pôr contas. Em vigor, a emissão parava a partir da
data dela. Agora:

- **Nasce inactiva.** Para a ver na lista, `GET /finance/ledger/chart-versions?includeInactive=true`.
- **Botão «Activar»:** `POST /finance/ledger/chart-versions/{id}/activation`,
  sem corpo. 204 se a versão tiver as contas das regras de lançamento activas;
  senão **409**, e o `detail` diz quais faltam. Mostrá-lo.
- **Botão «Desactivar»:** `POST /finance/ledger/chart-versions/{id}/deactivation`,
  sem corpo, 204. Serve também para tirar de vigor uma versão vazia que já
  esteja activa.
- **O aviso no formulário** pode passar a dizer que a versão fica inactiva até
  ser activada.

## 17. As despesas de colaborador no razão e no banco (PR #137)

O reembolso de uma despesa registava a conta, mas não tirava o dinheiro dela
nem lançava. Agora (ADR-102):

- **Aprovar** lança o custo (75.2.39) contra o que se deve ao colaborador
  (36.9), na data da despesa. Num período fechado dá **409**: mostrar o `detail`.
- **Marcar reembolsada com conta** (`fromAccountId`) tira o valor da conta, com
  a data `on` como data-valor, e lança. Recusas a mostrar:
  - **400:** conta noutra moeda, ou data futura;
  - **409:** sem saldo, conta fechada ou período fechado.
- **No ecrã «Marcar reembolsada»:** pedir a conta (as activas na moeda da
  despesa) e a data, hoje por omissão. Sem conta continua a funcionar, mas o
  dinheiro não sai de conta nenhuma.
- **Extracto:** a saída aparece com `sourceType` `expense_reimbursement` e o
  id da despesa.
- **Regras contabilísticas:** dois acontecimentos novos para a lista de
  `src/features/contabilidade/comum.tsx`:

  ```ts
  { valor: "ExpenseClaimApproved", texto: "Despesa de colaborador aprovada" },
  { valor: "ExpenseReimbursed", texto: "Despesa de colaborador reembolsada" },
  ```

## 18. A actualização cambial no fim do mês (PR #138)

O dinheiro nas contas em dólares entra na 43.2 ao câmbio de cada dia. No fim
do mês, o PGC manda valorizá-lo ao câmbio desse dia (ADR-103).

- **Rota:** `POST /finance/ledger/exchange-revaluations` com
  `{ fiscalYear, month, dryRun }`. Exige `finance.ledger.close`, como o
  apuramento de resultados.
- **Onde pôr:** na Contabilidade, junto do apuramento e da abertura do
  exercício. Um ano e um mês (Dezembro por omissão), um botão «Simular»
  (`dryRun: true`) e um «Lançar».
- **A resposta a mostrar:**
  - `accounts[]`: uma linha por conta, com `name`, `currency`, `balance`,
    `rate` e `rateOn`, e `kwanzas`;
  - `ledgerBalance`, a 43.2 antes, e `revaluedBalance`, o que fica a valer;
  - `difference`: positivo é ganho (66.2.2), negativo é perda (76.2.2);
  - `notes[]`, como avisos. Por exemplo: o câmbio é de um dia anterior ao fim
    do mês, ou o ano seguinte já está aberto e é preciso refazer a abertura.
- **`outcome`:**
  - `Preview`: só simulou;
  - `Revalued`: lançou, com `entryId` e `transactionId`;
  - `NothingToDo`: a 43.2 já vale o câmbio do fim do mês, por isso não é erro.
- **409, mostrar o `detail`:**
  - falta o câmbio;
  - o período está fechado;
  - o exercício não está aberto;
  - a 43.2 tem saldo e nenhuma conta em moeda estrangeira tem.
- **400:** mês fora de 1 a 12.
- **A ordem no fecho do ano:** actualizar Dezembro antes de apurar os
  resultados.

## 19. As diferenças de câmbio realizadas (PR #139)

A factura em dólares lança ao câmbio do dia dela, e o recibo ao câmbio do dia
dele. Agora a diferença lança-se sozinha, no dia do recibo ou do pagamento
(ADR-104). Ganho vai para a 66.2.1, perda para a 76.2.1, contra o cliente ou o
fornecedor. O cliente e o fornecedor ficam a zero. Não há rota nova.

- **No razão:** o lançamento tem o número de arquivo do recibo com `-CAM`
  (`RG-S001-12-CAM`), ou `DC-` mais a cauda do pedido de pagamento, no diário
  TES. Na ficha do recibo pode mostrar-se a ligação a ele.
- **Anular um recibo** estorna agora o recibo, a retenção (que antes ficava) e
  a diferença. A rota e a resposta não mudam.
- **Regras contabilísticas:** quatro acontecimentos novos para a lista de
  `src/features/contabilidade/comum.tsx`:

  ```ts
  { valor: "ReceiptExchangeGain", texto: "Diferença de câmbio favorável no recebimento" },
  { valor: "ReceiptExchangeLoss", texto: "Diferença de câmbio desfavorável no recebimento" },
  { valor: "PaymentExchangeGain", texto: "Diferença de câmbio favorável no pagamento" },
  { valor: "PaymentExchangeLoss", texto: "Diferença de câmbio desfavorável no pagamento" },
  ```
- **Na DR**, os resultados financeiros passam a ter estas diferenças.


## 20. A actualização cambial dos clientes e fornecedores (PR #141)

A mesma acção de «Actualização cambial» em Períodos (#138) passa a actualizar
também as facturas de venda e de compra em dólares que estão por receber ou
por pagar no último dia do mês (ADR-105). A rota e o pedido não mudam.

- **No razão:** dois lançamentos novos no diário DIV:
  - `ACD-AAAA-MM`, no último dia do mês, com o ganho na 66.2.2 ou a perda na
    76.2.2;
  - o estorno `EST-ACD-AAAA-MM`, no primeiro dia do mês seguinte.

  O Balanço do mês mostra os clientes e os fornecedores ao câmbio de fecho.
- **Na resposta**, junta-se uma tabela para mostrar na simulação, antes de
  lançar:

  ```ts
  documents: {
    kind: "Receivable" | "Payable"; // factura de venda ou de compra
    documentId: string; number: string; party: string; currency: string;
    open: number;       // em aberto, na moeda
    rate: number; rateOn: string;
    accountCode: string;
    registered: number; // em kwanzas, como a factura lançou
    revalued: number;   // em kwanzas, ao câmbio do fim do mês
    difference: number; // positivo é ganho
  }[];
  debtsDifference: number;
  debtsEntryId: string | null;
  debtsReversalEntryId: string | null;
  ```

  `entryId` passa a ser só o da 43.2, e vem nulo quando só os clientes e
  fornecedores mudam. O resultado `Revalued` pode ter `entryId` nulo.
- **Novo 409:** a actualização desse mês já foi lançada com outros valores,
  por exemplo porque entrou depois um recibo do mês. O erro diz para anular
  os dois lançamentos e repetir. Mostrar a mensagem tal como vem.


## 21. O mercado nacional e o estrangeiro (PR #142)

Um cliente ou fornecedor com país diferente de `AO` passa a lançar nas contas
do mercado estrangeiro (ADR-106):
- clientes em 31.1.2.2 e fornecedores em 32.1.2.2;
- vendas e serviços em 61.x.2 e 62.x.2.

O país vem da ficha do cliente e da do fornecedor, que já têm o campo. A
moeda não conta: um cliente angolano que paga em dólares continua nacional.

- **Regras contabilísticas** (`src/features/contabilidade`):
  - cada regra traz `market`: `"Domestic"`, `"Foreign"` ou `null` (serve os
    dois). Mostrar uma coluna «Mercado» com «Nacional», «Estrangeiro» ou «Os
    dois»;
  - o formulário de nova regra ganha um campo opcional `market`. Sem ele, a
    regra serve os dois;
  - pode haver uma regra activa por acontecimento e mercado. O PGC traz treze
    do mercado estrangeiro.
- **Factura de compra:** a leitura traz `supplierCountry` (ex. `"ZA"`) e
  `market`. Pode mostrar-se o país ao lado do fornecedor.
- **Ficha do cliente e do fornecedor:** convém lembrar, perto do país, que é
  ele que decide as contas da contabilidade.

## 23. A factura que vende um bem do activo (PR #144)

Vender um activo fixo passa a fazer-se pela própria factura (ADR-107). O
`POST /finance/sales-invoices` aceita `fixedAssetId`. Nessa emissão:
- o bem fica abatido na data da factura;
- a dívida do cliente vai para a 37.2 «Vendas de imobilizado»;
- o líquido vai para a 68.3 (ganho) ou 78.3 (perda), e não para as vendas.

O abate directo (`POST /finance/assets/{id}/disposal`) continua para os abates
e as vendas que não se facturam no Rivo.

- **Nova factura** (`src/features/facturacao`):
  - um campo opcional «Activo vendido», com os activos em uso (`GET
    /finance/assets`, `status` `Active`) na moeda da factura;
  - com activo, a factura é FT ou FR e só tem uma linha. Convém sugerir a
    descrição com o nome do activo e a natureza `Goods`;
  - 400 explica o motivo: activo sem conta do PGC, outra moeda, mais de uma
    linha, activo já abatido.
- **Ficha da factura:** a leitura traz `fixedAssetId`. Com ele:
  - mostrar «Venda do activo …», com ligação para o activo;
  - esconder «Nota de crédito» e «Nota de débito», que dão 400;
  - avisar que anular a factura repõe o bem no activo.
- **Recibos:** um recibo que junte a factura do activo a outras facturas dá
  400. Ao escolher as facturas, separar a do activo.
- **Ficha do activo:** depois da venda fica `Disposed`, com a data e o valor
  da factura. A razão diz «Venda pela FT …».

## 24. A compra de um bem do activo vai para as contas próprias (PR #145)

A factura de compra classificada numa conta do imobilizado
(`expenseAccountCode` na classe 1: 11, 12, 13 ou 14) lança como pede o PGC
(ADR-108):
- a dívida vai para a 37.1 «Compras de imobilizado» (37.1.1 corpóreo, 37.1.2
  incorpóreo, 37.1.3 financeiro), e não para a 32 «Fornecedores»;
- o IVA vai para a 34.5.2.2 «Meios fixos e investimentos», e não para a
  34.5.2.3;
- o pagamento e a diferença de câmbio saldam a 37.1.

O pedido e a resposta não mudam. No front, é opcional:
- **Nova factura de compra:** com uma conta da classe 1 escolhida, uma nota
  «Compra de imobilizado: a dívida fica na 37.1 e o IVA na 34.5.2.2».
- **Saldos de fornecedores:** o razão da 32 deixa de ter estas facturas. A
  antiguidade de saldos lê as facturas de compra e não muda.

## 25. Quem aprova a folha não paga os salários (PR #146)

`POST /finance/treasury/payroll-payments` passa a verificar a separação de
funções, como o pagamento a fornecedores (BR-3, ADR-109). O pedido e a
resposta de sucesso não mudam. Respostas novas:
- **403** se quem paga decidiu a folha em Aprovações, ou se a conta não está
  ligada a um colaborador (a conta SuperAdmin, por exemplo);
- **409** se o lançamento da folha não guarda a decisão, ou se a decisão não
  está aprovada.

No front:
- **Pagar salários** (Contas bancárias e folha aprovada): mostrar o `detail`
  do 403 como recusa, sem repetir o pedido. É a mesma mensagem que o
  pagamento a fornecedores já dá.
- **Opcional:** esconder ou desactivar o botão para quem aparece nas decisões
  da folha (`GET /approval/requests/{id}`). O servidor recusa na mesma.
- **Contas QA:** a folha é aprovada pelo Director Financeiro (conta
  `financeiro`). Os salários paga-os a conta `admin`.

## 26. Os salários e as entregas ao Estado pagam-se em partes (PR #147)

`POST /finance/treasury/payroll-payments` e `POST /finance/treasury/tax-payments`
aceitam um campo novo, opcional (ADR-110):
- **`amount`:** a parte a pagar. Sem ele, paga o que falta, como até aqui.
- **Na resposta, `outstanding`:** o que ainda falta pagar do mês depois deste
  pagamento. É `0` quando fica tudo pago.

Cada parte é um lançamento no razão: `PAG-SAL-2026-09`, depois
`PAG-SAL-2026-09-2`, e assim por diante. A descrição diz a parte. Anular uma
parte devolve-a ao que falta.

Respostas novas:
- **400** se `amount` não for positivo;
- **409** se `amount` passar do que falta. O `detail` diz quanto falta.

O 409 de «já foi feito» mantém-se, para quando já não falta nada.

No front:
- **Pagar salários e Entregar ao Estado:** um campo opcional «Valor desta
  parte», vazio por omissão (vazio paga o que falta). Depois de pagar, mostrar
  `outstanding` («Faltam X Kz») quando não for zero.
- **Opcional:** mostrar o que já se pagou do mês, somando os lançamentos
  `PAG-…-AAAA-MM*` não anulados do diário TES.
- **Contas QA:** no seed, a primeira entrega de IVA faz-se em duas
  prestações, a dia 20 e a dia 25.

## 27. Os órgãos sociais na folha (PR #149)

O PGC separa as remunerações dos órgãos sociais (administração, gerência,
conselho fiscal) das do pessoal. O cargo passa a dizer de que lado está
(ADR-111).

**API**
- **`POST /hr/positions`:** aceita `governingBody` (opcional, falso por
  omissão).
- **`PUT /hr/positions/{id}`:** aceita `governingBody`. Omitido, mantém-se.
  Ao contrário da autoridade de aprovação, esta marca corrige-se. Muda só as
  folhas que lançarem depois.
- **`GET /hr/positions`:** cada cargo traz `governingBody`.

**Razão**

Quem ocupa um cargo de órgão social no fim do mês lança assim:

| | Órgão social | Pessoal (como antes) |
|---|---|---|
| Bruto | 72.1 | 72.2 |
| INSS da empresa | 72.5.1 | 72.5.2 |
| Líquido a pagar | 36.1.1 | 36.1.2 |

O pagamento dos salários salda as duas contas da 36.1. Uma parte reparte-se
em proporção do que falta em cada uma. As rotas de pagamento não mudam.

**No front**
- **Cargos:**
  - **Criar e corrigir:** uma caixa «Órgão social (administração, gerência,
    conselho fiscal)», desligada por omissão. Na correcção, enviar sempre o
    valor actual.
  - **Lista:** uma etiqueta «Órgão social» nos cargos que o são.
- **Lançamentos e relatórios:** nada a fazer. As contas 72.1, 72.5.1 e 36.1.1
  já estão no plano de contas, e a DR já as soma em «Custos com o pessoal».
- **Contas QA:** no seed, o cargo «Administrador» é de órgão social, e há uma
  pessoa na Direcção Geral que o ocupa.

## 28. O IVA não dedutível da factura de compra (PR #150)

Nem todo o IVA de uma compra se deduz. O PGC manda que a parte que não se
deduz entre no valor do bem, numa compra de imobilizado, e na conta da compra,
nas outras (ADR-112). Quem regista decide quanto é, pelo Código do IVA: o Rivo
não tem essa regra.

**API**
- **`POST /finance/purchase-invoices`:** aceita `nonDeductibleTax`, opcional e
  zero por omissão. Vai de zero a `taxTotal`; fora disso, 400.
- **`GET /finance/purchase-invoices` e `/{id}`:** cada factura traz
  `nonDeductibleTax`.
- **`GET /finance/tax-summaries/vat`:** `inputTax` deixa de contar a parte
  não dedutível.

**Razão**

| | Débito | Crédito |
|---|---|---|
| Compra de imobilizado (11 a 14) | conta do bem: líquido + não dedutível; 34.5.2.2: o resto do IVA | 37.1.x: bruto |
| Outra compra | conta da compra: líquido + não dedutível; 34.5.2.x: o resto do IVA | 32.x: bruto |

Sem IVA não dedutível, nada muda. A dívida ao fornecedor e o pagamento também
não mudam.

**No front**
- **Registar factura de compra:**
  - um campo «IVA não dedutível», a zero por omissão, com o máximo no IVA da
    factura. Ajuda: «A parte do IVA que não se deduz (Código do IVA). Entra
    no custo da compra ou no valor do bem».
  - com o campo preenchido, mostrar o que vai para cada conta: «Conta do bem
    (ou da compra): líquido + não dedutível. IVA dedutível: o resto».
- **Ficha da factura de compra:** mostrar «IVA não dedutível» quando não for
  zero, e o IVA dedutível ao lado.
- **Registar activo a partir de uma factura de compra:** propor como custo de
  aquisição o líquido mais o IVA não dedutível, porque é isso que está na
  conta do bem. O backend não o copia nem o confirma.
- **Resumo do IVA:** nada a fazer; o valor dedutível já vem certo.
- **Contas QA:** no seed há uma «Viatura ligeira Toyota Corolla» (11.4) com
  todo o IVA declarado não dedutível. O activo está registado pelo líquido
  mais o IVA.

---

## 29. O reembolso de despesas em moeda estrangeira (PR #151)

Uma despesa em dólares reembolsada da conta em dólares lançava na 43.1, a
conta dos depósitos em kwanzas. E se o câmbio mudasse entre o dia da despesa e
o do reembolso, a 36.9 (o que se deve ao colaborador) nunca chegava a zero
(ADR-113).

**API**
- **`POST /finance/expenses/{expenseId}/reimbursement`:** o pedido e a
  resposta não mudam. Muda o que lança quando a despesa é noutra moeda.
- **`POST /finance/ledger/posting-rules`:** três acontecimentos novos:
  - `ForeignCurrencyExpenseReimbursed`: o reembolso noutra moeda. Sem regra
    própria, lança pela de `ExpenseReimbursed`.
  - `ExpenseReimbursementExchangeGain` e `ExpenseReimbursementExchangeLoss`:
    a diferença de câmbio do reembolso.

**Razão**

| Lançamento | Quando | Débito | Crédito |
|---|---|---|---|
| `RMB-…` | Reembolso noutra moeda, ao câmbio do dia dele | 36.9 | 43.2 |
| `DCR-…` | Saíram menos kwanzas do que a aprovação lançou | 36.9 | 66.2.1 |
| `DCR-…` | Saíram mais kwanzas | 76.2.1 | 36.9 |

Em kwanzas, nada muda. Ao mesmo câmbio, não há `DCR`.

**No front**
- **Editor de regras de lançamento** (`src/features/contabilidade/comum.tsx`):
  nomear os três acontecimentos novos, por exemplo «Despesa de colaborador
  reembolsada em moeda estrangeira», «Diferença de câmbio favorável no
  reembolso de despesa» e «Diferença de câmbio desfavorável no reembolso de
  despesa».
- **Reembolso de despesa:** nada a fazer. O ecrã já pede uma conta na moeda
  da despesa.
- **Contas QA:** no seed há duas despesas de alojamento no estrangeiro em USD
  («Hotel em Lisboa», «Hotel em Joanesburgo»), reembolsadas da conta BIC
  (USD).

---

## 30. Os adiantamentos de salário (PR #152)

A tesouraria paga a um colaborador uma parte do salário antes do fim do mês, e
a folha desse mês desconta-a. É o que o PGC manda para a conta 36.3 «Pessoal –
adiantamentos» (ADR-114). Não há aprovação própria: quem regista não pode ser
quem recebe.

**API**
- **`POST /finance/treasury/salary-advances`** (`finance.payments.execute`):
  - corpo `{ employeeId, amount, bankAccountId, on, reference, payrollYear,
    payrollMonth }`; responde 201 com `{ id }`.
  - `on` é o dia em que o dinheiro sai (omitido, hoje).
  - `payrollYear` e `payrollMonth` dizem a folha que o desconta (omitidos, a
    do mês do pagamento).
  - 400: conta noutra moeda que não kwanzas, data futura, folha anterior ao
    mês do pagamento.
  - 409: a folha desse mês já está lançada, o adiantamento é a quem regista,
    sem saldo, conta fechada ou período fechado. O motivo vem no `detail`.
- **`GET /finance/treasury/salary-advances`** (`finance.payables.read`):
  filtros `employeeId`, `payrollYear`, `payrollMonth` e `outstandingOnly`.
  Cada linha traz `advanceId, employeeId, employeeName, amount, paidOn,
  bankAccountId, reference, payrollYear, payrollMonth, settledAmount,
  outstanding`.
- **`POST /finance/treasury/payroll-payments`:** o pedido não muda. O valor
  pago é o líquido menos o que os adiantamentos já descontaram. Se
  descontaram tudo, 409 com o motivo.

**Razão**

| Momento | Lançamento | Débito | Crédito |
|---|---|---|---|
| Pagar o adiantamento | `ADT-…` | 36.3 | 43.1 |
| Lançar a folha do mês | `ADT-SAL-AAAA-MM` (além do `SAL-…`) | 36.1.2 (36.1.1 num órgão social) | 36.3 |
| Pagar os salários | `PAG-SAL-…` | 36.1.x: só o resto | 43.1 |

Cada colaborador desconta até ao seu líquido do mês; o que não cabe passa à
folha seguinte.

**No front**
- **Tesouraria, junto ao pagamento dos salários:** um ecrã «Adiantamentos de
  salário», com:
  - a lista (`GET`), com o filtro «Por descontar» (`outstandingOnly`);
  - um formulário «Pagar adiantamento»: colaborador, valor, conta (só as em
    kwanzas), data, referência, e «Desconta na folha de» (mês e ano,
    pré-preenchido com o mês da data).
- **Pagar os salários:** mostrar, antes de confirmar, que os adiantamentos já
  descontados não saem do banco; o valor que a API devolve já vem certo.
- **Editor de regras de lançamento** (`src/features/contabilidade/comum.tsx`):
  nomear `SalaryAdvancePaid` («Adiantamento de salário pago»).
- **Pedido interno do portal** (`SalaryAdvance`): nada muda. A ligação ao
  adiantamento é a decisão em aberto.
- **Contas QA:** no seed há dois adiantamentos em Fevereiro, Junho e Outubro,
  pagos a 15 da conta BAI. Os das folhas aprovadas já estão descontados.

---

## 31. A actualização cambial leva as despesas por reembolsar (PR #153)

Uma despesa em dólares aprovada e ainda por reembolsar no fim do mês é uma
dívida ao colaborador em dólares. A actualização desse mês passa a levá-la ao
câmbio de fecho, como as facturas em aberto (ADR-115).

**API**
- **`POST /finance/ledger/exchange-revaluations`:** o pedido não muda. Em
  `documents[]` pode vir `kind = "EmployeeExpense"`:
  - `number` é a descrição da despesa;
  - `party` é o colaborador;
  - `accountCode` é a 36.9;
  - `documentId` é o `expenseId`.
- Os campos `open`, `rate`, `registered`, `revalued` e `difference` são os
  mesmos das facturas.

**Razão**

| Momento | Lançamento | Débito | Crédito |
|---|---|---|---|
| Fim do mês, o dólar subiu | `ACD-AAAA-MM` | 76.2.2 | 36.9 |
| Fim do mês, o dólar desceu | `ACD-AAAA-MM` | 36.9 | 66.2.2 |
| Dia 1 do mês seguinte | `EST-ACD-AAAA-MM` | os lados trocados | |

O reembolso seguinte mede a diferença realizada a partir do valor de registo
(secção 29).

**No front**
- **Períodos → Actualização cambial** (`src/features/contabilidade/Fecho.tsx`,
  a tabela «Facturas em moeda estrangeira em aberto»):
  - hoje tudo o que não é `Payable` aparece como «Venda» e liga a
    `/facturas/{id}`. Uma linha `EmployeeExpense` ficaria errada;
  - para `EmployeeExpense`: o tipo «Despesa de colaborador» e a ligação a
    `/despesas/{documentId}`;
  - o título e a mensagem de vazio passam a falar de documentos, não só de
    facturas («Documentos em moeda estrangeira em aberto»).
- **Contas QA:** a simulação de 12/2025 mostra a despesa «Hotel em
  Joanesburgo», por reembolsar a 31/12 (o seed fixa-a desde o #154).

---

## 32. A nota de crédito em moeda estrangeira vai ao câmbio da factura (PR #155)

Até agora, uma nota de crédito em dólares lançava ao câmbio do dia em que se
emitia, e a factura ao do dia dela. Com câmbios diferentes, ficava um resto no
cliente que nem o recibo nem a actualização do fecho tiravam. A nota passa a
lançar ao câmbio com que a factura lançou: corrige a factura, não é uma
operação nova (ADR-116).

**API**
- **`POST /finance/credit-notes`:** o pedido e a resposta não mudam.
- **Razão:** a nota tira ao cliente, às devoluções (61.7 ou 62.8) e ao IVA a
  parte proporcional do que a factura lá pôs. Uma nota do valor todo deixa o
  cliente e o IVA a zero. Não há diferença de câmbio (não há `… CAM`).
- **Descrição do lançamento:** «Correcção de FT … (NC …) [USD 114,00 ao câmbio
  de FT S001/7 (900)]».
- **SAF-T AO:** a nota vai ao câmbio do dia da factura que corrige.

**No front**
- **Períodos → Lançar o histórico** (`src/features/contabilidade/Fecho.tsx`):
  o texto diz que cada documento lança «ao câmbio desse dia». Acrescentar
  «(as notas de crédito em moeda estrangeira, ao câmbio da factura que
  corrigem)».
- **Notas de crédito:** nada muda no formulário. Se alguma vez mostrar o valor
  em kwanzas, deve ser ao câmbio da factura, e não ao de hoje.
- **Contas QA:** o seed não tem notas de crédito em dólares. Para ver o efeito,
  emita uma nota sobre uma factura em USD de outro dia e abra o lançamento
  dela em Lançamentos: a descrição diz «ao câmbio de FT …», e o saldo do
  cliente dessa factura fica a zero quando a nota é do valor todo.

---

## 33. Regularização de existências e tipo de existência dos artigos (PR #156)

O inventário passa a chegar ao razão no fim do ano, pelo inventário
intermitente do PGC (ADR-117):
- durante o ano, as compras de existências lançam na 21;
- no fecho, a 71 recebe as existências iniciais e as compras;
- as existências finais (o stock do inventário a 31/12) voltam à 22 e à 26.

A DR passa a ter o custo das mercadorias vendidas e das matérias consumidas.

**API**
- **`POST /finance/ledger/fiscal-years/{ano}/inventory-regularisation`**
  (`finance.ledger.close`):
  - **Pedido:** `{ closingStock?: [{ accountCode, amount }], dryRun? }`.
  - **Lançamento:** a 31/12, no período 12, no diário DIV, com o n.º de
    arquivo «REX-AAAA».
  - **Resposta:**
    - `outcome`: `Regularised`, `Preview` (com `dryRun`) ou `NothingToDo`;
    - `entryId`;
    - `purchases[]` (`accountCode`, `amount`): as subcontas da 21 que passam
      para a 71;
    - `stock[]`, uma linha por conta de existências: `stockAccountCode`,
      `costAccountCode`, `opening` (o saldo antes), `proposed` (o que o
      inventário dá a 31/12) e `closing` (o que fica);
    - `costOfSales[]` (`accountCode`, `amount`): o custo do ano em cada conta
      da 71;
    - `notes[]`.
  - **`closingStock`:** dá o valor final de uma conta (a contagem física), e
    esse valor prevalece sobre o do inventário. Uma conta fora da 22 e da 26,
    ou um valor negativo, dá 400.
  - **Repetir** não duplica. Se o ano já estava apurado, ou o seguinte já
    aberto, `notes` diz o que refazer.
- **`POST /inventory/items`** aceita `kind`:
  - `RawMaterials` (22.1), `SubsidiaryMaterials` (22.2), `SundryMaterials`
    (22.3, a omissão), `Packaging` (22.4), `OtherMaterials` (22.5) ou `Goods`
    (26);
  - outro valor dá 400;
  - `GET /inventory/items` e `GET /inventory/items/{id}` devolvem `kind`.
- **`POST /inventory/items/{id}/kind`** `{ kind }`: muda o tipo (204). Não
  mexe nos movimentos.
- **Compras:** a factura de compra classificada na 21, 22 ou 26 deduz o IVA na
  34.5.2.1 «Existências», e não na 34.5.2.3.

**No front**
- **Períodos → Fecho do exercício** (`src/features/contabilidade/Fecho.tsx`):
  - novo cartão **«Regularização de existências»**, entre «Actualização
    cambial» e «Fecho do exercício», com o mesmo padrão da actualização:
    **Simular** (`dryRun: true`) e **Lançar**, com confirmação;
  - **tabela** por conta de existências: conta, inicial, proposto pelo
    inventário e final;
  - o **final** é editável: se o utilizador o mudar, vai em `closingStock`;
  - abaixo da tabela, as compras (21) e o custo (71);
  - `notes` em aviso;
  - **texto do cartão:** «No fim do ano, antes de apurar os resultados: as
    compras (21) e as existências iniciais passam para o custo (71), e o stock
    a 31/12 volta às existências (22 e 26).»
  - no texto da actualização cambial, «No fecho do ano, actualize Dezembro e
    regularize as existências antes de apurar os resultados».
- **Artigos** (`src/features/inventario/pages/Artigos.tsx`):
  - no formulário **Registar**, um campo **Tipo**: Matérias-primas, Matérias
    subsidiárias, Materiais diversos (por omissão), Embalagens, Outros
    materiais, Mercadorias;
  - na lista, uma coluna **Tipo**.
- **Artigo** (`Artigo.tsx`): mostrar o tipo e uma acção **Mudar o tipo**
  (`POST /inventory/items/{id}/kind`), para quem tem `inventory.items.write`.
- **Facturas de compra:** nada muda no formulário. Para uma compra de
  existências, escolhe-se a 21.1 (matérias) ou a 21.2 (mercadorias) na conta
  da natureza.
- **Contas QA**, depois do reseed:
  - a simulação de 2025 dá `NothingToDo`, porque o seed já regularizou;
  - o lançamento «REX-2025» está em Lançamentos;
  - a DR de 2025 tem o custo das matérias consumidas na rubrica 27;
  - o Balanço de 2026 tem nas existências (22.x) o stock de 31/12/2025.

---

## 45. Segundo factor: a app autenticadora (PR #170, ADR-127)

O MFA que o SGAP exige a quem decide ou movimenta fundos. O segundo factor é
um código de 6 dígitos de uma app autenticadora (Google Authenticator,
Microsoft Authenticator…), com 10 códigos de recuperação para quando o
telemóvel não está à mão.

**A obrigatoriedade está desligada** (`MFA_ENFORCED=false` no servidor).
Enquanto estiver, quem liga o segundo factor passa a precisar dele, e mais
ninguém muda. Liga-se no VPS quando estes ecrãs existirem.

**API** (detalhe em `API-FRONTEND.md`, secção Identity)
- **Login:** `POST /identity/login` e `/login/google` respondem **`202`** com
  `{ mfaChallenge, expiresInSeconds }` quando a conta tem o segundo factor.
  Não trazem token. `POST /identity/login/mfa` `{ challenge, code }` devolve o
  `LoginResponse` de sempre; um código errado ou um desafio expirado dá `401`.
- **A minha conta:**
  - `GET /identity/me/mfa`: `{ enabled, required, enforced, recoveryCodesLeft }`;
  - `POST /identity/me/mfa/authenticator`: `{ sharedKey, authenticatorUri }`;
  - `POST …/authenticator/confirmation` `{ code }`: devolve
    `{ recoveryCodes }`, uma só vez;
  - `POST …/recovery-codes` `{ code }` e `POST …/deactivation` `{ code }`.
- **Administração:** `POST /identity/users/{userId}/mfa/reset` `{ reason }`
  (`identity.users.write`).
- **Obrigatoriedade ligada:**
  - quem é obrigado e não se inscreveu recebe `mfaEnrolmentRequired: true` no
    `LoginResponse`;
  - o resto da API dá-lhe `401` com `error_description=mfa_enrolment_required`;
  - `/identity/me`, `/identity/me/mfa…` e o logout continuam a responder.

**Front (por fazer)**
- **Entrar:**
  - no `202`, um passo «Código da app» com 6 dígitos, e a opção «Usar um
    código de recuperação»;
  - o desafio dura 5 minutos: se expirar, voltar ao primeiro passo;
  - o mesmo serve para o Google.
- **A minha conta → «Segundo factor»:**
  - **ligar:** mostrar o `authenticatorUri` em QR e a `sharedKey` por baixo,
    para escrever à mão; pedir um código; mostrar os 10 códigos de recuperação
    com «Copiar» e «Descarregar», avisando que não voltam a aparecer;
  - **gerar códigos novos e desligar,** ambos com um código;
  - `required` e `enforced` dizem se o perfil é obrigado. Esconder «Desligar»
    a quem é obrigado com a obrigatoriedade ligada (o servidor dá `409`).
- **Utilizadores (admin):** «Repor segundo factor», com o motivo obrigatório.
- **Sessão restrita:** com `mfaEnrolmentRequired: true` no login, ou um `401`
  com `mfa_enrolment_required`, levar a pessoa ao ecrã de ligar, sem mais
  nada.

**Como ver**
- **Numa base local, ou com uma conta QA em produção:**
  1. ligar o segundo factor pela API, com uma app no telemóvel;
  2. sair e voltar a entrar: o login responde `202`.
- **A suite `verify-authorization.ps1` (caso 30)** faz isto, calculando os
  códigos em PowerShell.
- **Cuidado em produção:** uma conta QA com o segundo factor ligado deixa de
  servir aos scripts e ao seed, que só sabem a password. Repor pelo admin no
  fim.

---

## 44. Anti-fraccionamento (PR #169, BR-7)

Partir uma despesa em vários pedidos de pagamento, cada um abaixo da alçada,
deixa de a contornar (ADR-126). Ao submeter um pedido de pagamento, a alçada
escolhe-se pelo valor dele **somado** aos pedidos do mesmo fornecedor (NIF) e
da mesma rubrica (centro de custo) dos últimos 30 dias, na mesma moeda, que não
foram rejeitados nem cancelados. O pedido não é recusado: vai para quem tem
alçada sobre o total.

**API**
- **`cumulativeAmount`** (número ou `null`) em `GET /approval/requests`,
  `GET /approval/requests/{id}`, no histórico e na resposta de decidir. Nos
  pedidos de pagamento, é o valor que escolheu a alçada (na moeda do pedido);
  nos outros processos, `null`.
- Se não houver política para o acumulado, o pedido de pagamento é recusado
  como hoje (409), e a mensagem diz que a alçada se procurou pelo acumulado.

**Front (por fazer)** — Aprovações, na ficha e na caixa:
- quando `cumulativeAmount` for maior do que `amount`, mostrar «Acumulado em 30
  dias (mesmo fornecedor e rubrica): …» junto ao valor, para quem decide
  perceber porque lhe chegou um pedido pequeno.

**Como ver**
- **Em produção nada muda:** o seed tem uma só política de pagamento, sem
  faixas. A regra só tem efeito com políticas com faixas de valor.
- **Numa base local:** duas políticas `finance.payment_request` com o mesmo
  departamento (até 1 000 000 e de 1 000 000 para cima), um centro de custo
  desse departamento, e dois pedidos de 600 000 da mesma factura com esse
  centro. O segundo segue a política de cima, com `cumulativeAmount` de
  1 200 000. A suite `verify-payables.ps1` (caso 31) faz isto.

---

## 43. Em nome de quem pedir o adiantamento (PR #167, B46)

O Finance pede adiantamentos em nome de um colaborador
(`finance.treasury.write`), mas não lia os colaboradores
(`GET /hr/employees` dá-lhe 403). Agora tem a sua lista (adenda ao ADR-123).

**API**
- **`GET /finance/treasury/salary-advance-applications/lookups`**
  (`finance.treasury.write`, a do pedido): `{ employees: [{ id, name }] }`, os
  colaboradores activos. Só o id e o nome, como `/finance/assets/lookups`.

**Front (por fazer)** — Tesouraria → «Adiantamentos de salário»:
- **«Pedir em nome de…»** passa a aparecer a quem tem `finance.treasury.write`
  (e não só a quem lê os colaboradores), e o selector lê esta lista.

**Seed:** volta a correr a massa de dados toda por omissão (cerca de 30
minutos em `syyt.tech`); `--minimo` dá o modo rápido de 05/11 a 13/11.

**Como ver**
- **Conta QA Finance, depois do deploy:** «Pedir em nome de…» lista os
  colaboradores.

---

## 42. Corrigir o IVA não dedutível (PR #166)

Até aqui, o IVA não dedutível declarado no registo da compra (secção do
ADR-112) só se corrigia anulando a factura e registando-a de novo. Agora
corrige-se na própria factura, com o motivo (ADR-125). O Rivo lança a
diferença entre a conta da compra e o IVA, e a dívida ao fornecedor não muda:
- **o IVA do mês da factura ainda não foi apurado:** lança na data da factura
  e acerta o IVA dedutível (34.5.2), como se tivesse vindo certo;
- **já foi apurado:** é uma regularização com a data de hoje, na 34.5.4.2
  quando se deduz menos (a favor do Estado) ou na 34.5.4.1 quando se deduz
  mais. Entra no apuramento deste mês.

Anular a factura depois estorna também as correcções.

**API**
- **`POST /finance/purchase-invoices/{id}/non-deductible-tax-corrections`**
  (`finance.payables.write`, a mesma do registo):
  - pedido `{ nonDeductibleTax, reason }`, com o novo valor, de zero ao IVA da
    factura, e o motivo, obrigatório;
  - resposta 200 com `{ purchaseInvoice, archivalNumber, postedAs, notes }`.
    `postedAs` é `Deduction` ou `Regularisation`, e o lançamento é «ND1-…»,
    «ND2-…»;
  - 400 sem motivo, com o mesmo valor ou fora do intervalo, com o motivo em
    `errors.nonDeductibleTax`; 404; 409 se a factura estiver anulada.
- **A factura** (`GET /finance/purchase-invoices/{id}` e a lista) traz
  `nonDeductibleTaxCorrections`, o número de correcções.
- **`notes`** avisa:
  - o mês da factura já estava apurado, e a correcção foi uma regularização;
  - o IVA deste mês já foi apurado, e é preciso voltar a apurá-lo;
  - o ano já foi apurado, ou o seguinte já foi aberto;
  - numa compra de imobilizado, a ficha do activo não muda.

**Front (por fazer)** — no detalhe da factura de compra, para quem a regista:
- **o botão «Corrigir IVA não dedutível»**, numa factura em vigor:
  - o valor actual e o IVA da factura como máximo;
  - o novo valor e o motivo;
  - antes de confirmar, dizer se vai para o mês da factura ou para este
    (o front sabe-o pelos apuramentos do IVA, `IVA-AAAA-MM`; ou mostra só o
    `postedAs` da resposta);
- **mostrar `notes`** depois de corrigir;
- **o número de correcções** junto do IVA não dedutível, se for maior que
  zero.

**Como ver**
- **Contas QA, depois do reseed:**
  - uma compra de há dois meses, com metade do IVA não dedutível, tem o
    «ND1-…» na data da factura, contra a 34.5.2;
  - uma de há três meses tem o «ND1-…» com a data do seed, na 34.5.4.2.

---

## 41. O pró-rata do IVA (PR #165)

No fim do ano, o contabilista calcula o pró-rata definitivo e indica a
regularização do IVA deduzido (ADR-124). O Rivo lança-a e não calcula nada:
- **a favor do Estado** (positivo): o IVA deduzido a mais passa a custo, na
  75.3.1.2, contra a 34.5.4.3;
- **a favor da empresa** (negativo): o IVA deduzido a menos passa a proveito,
  na 63.5;
- **zero:** «sem regularização».

Uma parte pode ir para contas do imobilizado. O apuramento do IVA de
Dezembro leva a 34.5.4.3. Corrigir é um ajuste, com o novo valor e o motivo,
e nada se edita.

**API**
- **`GET /finance/ledger/fiscal-years/{ano}/vat-pro-rata`** devolve
  `indicated`, `amount` e `records[]`. Cada registo traz `kind`, `amount`,
  `difference`, `fixedAssets[]`, `costAccountCode`, `archivalNumber`,
  `entryVoided`, `notes`, `recordedBy` e `recordedAt`.
- **`POST …/vat-pro-rata`** (`finance.ledger.close`):
  - pedido `{ amount, fixedAssets?: [{ accountCode, amount }], notes? }`;
  - resposta 201 com `{ proRata, notes }`; 409 se já houver uma indicação;
    400 se for inválido, com o motivo em `errors.proRata`.
- **`POST …/vat-pro-rata/adjustments`**, com
  `{ amount, fixedAssets?, reason }`. O `reason` é obrigatório.
- **`notes`** avisa quando é preciso refazer alguma coisa: o IVA de Dezembro
  já apurado, o ano já apurado, ou o seguinte já aberto.

**Front (por fazer)** — em Períodos → Fecho do exercício, ao lado do cartão
da estimativa do imposto (secção 35):
- **o cartão «Pró-rata do IVA»:**
  - o valor em vigor, a favor de quem;
  - os registos, com quem e quando;
  - «Indicar», com o valor, a escolha «a favor do Estado / da empresa», as
    partes do imobilizado (opcional: a conta, com sugestões da 11, 12 e 14,
    e o valor) e uma nota;
  - «Corrigir», com o novo valor, as partes e o motivo.
- **Mostrar `notes`**, sobretudo o de voltar a apurar o IVA de Dezembro.
- **Ordem no fecho:**
  1. pró-rata;
  2. apuramento do IVA de Dezembro;
  3. regularização de existências;
  4. estimativa do imposto;
  5. apuramento de resultados.

**Como ver**
- **Contas QA, depois do reseed:** 2025 tem a regularização indicada pelo
  seed, a favor do Estado e com valor fictício. O `PRT-2025` tem a 75.3.1.2 a
  débito contra a 34.5.4.3, e o `IVA-2025-12` leva-a.

---

## 40. O adiantamento de salário com aprovação própria (PR #163)

Até aqui, a tesouraria registava e pagava o adiantamento de uma vez (secção
dos adiantamentos, ADR-114). Agora há um pedido, que vai ao motor de
aprovação, como o SGAP prevê (ADR-123):
1. o colaborador pede pelo portal, ou as finanças pedem em nome dele;
2. o pedido vai a Aprovações como «finance.salary_advance», com o colaborador
   como requisitante;
3. aprovado, a tesouraria paga-o. Quem o decidiu não o paga (BR-3).

**É preciso uma política de aprovação** para `finance.salary_advance`
(Configurações → Políticas de aprovação). Sem ela, o pedido dá 409 com o
motivo. No seed, aprova o Director Financeiro.

**API**
- **Portal:**
  - `POST /portal/me/salary-advance-applications`, com
    `{ amount, payrollYear?, payrollMonth?, reason? }`, responde 201 com
    `{ applicationId }`;
  - `GET /portal/me/salary-advance-applications` devolve os pedidos do
    próprio, com `status`: `PendingApproval`, `Approved` (por pagar),
    `Refused` ou `Paid`.
- **Finanças:**
  - `POST /finance/treasury/salary-advance-applications` (`finance.treasury.write`),
    com `{ employeeId, amount, payrollYear?, payrollMonth?, reason? }`;
  - `GET /finance/treasury/salary-advance-applications?employeeId=` devolve
    os pedidos, com `status`, `approvalRequestId` e `advanceId`.
- **Pagar (muda):** `POST /finance/treasury/salary-advances` passa a receber
  `{ applicationId, bankAccountId, on?, reference? }`, e já não recebe
  `employeeId`, `amount` nem a folha, que vêm do pedido.
  - **403:** conta sem colaborador, ou quem decidiu o pedido;
  - **409:** pedido por aprovar, recusado ou já pago, ou o próprio a pagar-se.
- `GET /finance/treasury/salary-advances` traz `applicationId`.

**Front (por fazer)**
- **Portal → Pedidos (ou um cartão «Adiantamento de salário»):**
  - formulário com o valor, o mês da folha que o desconta (por omissão, o
    corrente) e o motivo;
  - lista dos pedidos com o estado.
- **A categoria «Adiantamento» dos pedidos internos** pode encaminhar para
  este formulário. Continua a existir, mas só como conversa com o RH.
- **Tesouraria → Adiantamentos:**
  - a lista de pedidos com o estado, e «Pedir em nome de…»;
  - **Pagar** só nos `Approved`: a conta, o dia e a referência.
  - Esconder ou desactivar «Pagar» a quem decidiu o pedido (ver as decisões
    em Aprovações, como na folha) e a quem não tem ficha de colaborador.
  - Mostrar o 403 e o 409 do servidor.
- **O diálogo antigo de pagar o adiantamento** (colaborador, valor, folha)
  deixa de funcionar.

**Como ver**
- **Contas QA, depois do reseed:**
  - os adiantamentos de Fevereiro, Junho e Outubro têm pedido aprovado pelo
    Director Financeiro e foram pagos pelo Director Geral;
  - em Aprovações aparecem os processos `finance.salary_advance` decididos.

---

## 39. Quebras e sobras na regularização de existências (PR #162)

Quando a contagem física de 31/12 difere do inventário, a diferença ficava
sempre na 71, o custo das existências. Agora o contabilista escolhe em cada
regularização (ADR-122):
- **fica na 71**, por omissão, como até aqui;
- **sai da 71:** as quebras para a 78.4.1 «Quebras» e as sobras para a
  68.4.1 «Sobras».

O PGC manda para a 78.4 as perdas do inventário físico «que não devam afectar
o custo», e decidir isso é um juízo do contabilista.

**API** (`POST /finance/ledger/fiscal-years/{ano}/inventory-regularisation`)
- **Pedido:** ganha `countDifferencesToOtherResults` (opcional, `false` por
  omissão). Só conta nas contas que vêm em `closingStock`.
- **Resposta:** cada linha de `stock[]` passa a trazer:
  - `countDifference`: a contagem menos o inventário. Negativo é quebra, e é
    zero sem contagem;
  - `differenceAccountCode`: `78.4.1`, `68.4.1`, ou `null` se a diferença
    ficou na 71.
- `costOfSales[]` já desconta as quebras e soma as sobras tiradas da 71.
- **Repetir não duplica.** Repetir sem a escolha devolve-as à 71, e `notes`
  avisa.

**Front (por fazer, no ecrã da secção 33)**
- **Quando há contagem:**
  - uma caixa «A diferença da contagem não afecta o custo (quebras na
    78.4.1, sobras na 68.4.1)», desligada por omissão;
  - na pré-visualização (`dryRun`), mostrar por conta a diferença
    (`countDifference`, a vermelho se for quebra) e para onde vai
    (`differenceAccountCode`, ou «fica na 71»).
- Mostrar `notes`.

**Como ver**
- **Contas QA, depois do reseed:**
  - o `REX-2025` tem as linhas «Quebras da 22.x (inventário físico)», com a
    78.4.1 a débito e a 71.x a crédito, por 2% do stock da conta com mais
    stock;
  - a DR de 2025 mostra a quebra nos outros custos e perdas.

---

## 38. O fecho do ano lembra a actualização cambial (PR #161)

A actualização cambial continua a correr-se a pedido, em qualquer fim de mês,
e o Rivo não obriga a uma cadência (ADR-121). Ao apurar o ano, o Rivo simula,
sem gravar, a actualização de 31/12. Se ela ainda deixaria diferenças, avisa.

**API**
- **`POST /finance/ledger/fiscal-years/{ano}/closing`:** `notes` pode trazer,
  além dos avisos do imposto (secção 35):
  - «A actualização cambial de 31/12/AAAA não está lançada: deixaria X Kz na
    43.2 e Y Kz nos clientes, fornecedores e despesas em moeda estrangeira.
    Lance-a (…) e volte a apurar.»;
  - «Não foi possível confirmar a actualização cambial de 31/12/AAAA: …»,
    com o motivo (falta o câmbio, o período está fechado, o ano não foi
    aberto).
- **Não recusa:** o apuramento faz-se na mesma.

**Front (por fazer)**
- No cartão do apuramento (Períodos → Fecho do exercício), os `notes` já se
  mostram desde a secção 35, por isso não há mais nada a fazer.
- Opcional: junto ao aviso cambial, uma ligação para a actualização cambial
  com o ano e o mês 12 já escolhidos.

**Como ver**
- **Contas QA:** o seed actualiza Dezembro antes de apurar, por isso o
  apuramento de 2025 não traz este aviso.
- **Numa base local:** registar uma despesa em dólares num ano antigo,
  aprová-la sem a reembolsar e apurar esse ano. O aviso aparece.

---

## 37. A BR-3 nas entregas do IRT e do INSS (PR #160)

Quem decidiu a folha em Aprovações já não podia pagar os salários dela
(ADR-109). Agora também não entrega o IRT nem o INSS dessa folha (ADR-120).
Também não os entrega uma conta sem ficha de colaborador, como a SuperAdmin.
O IVA não muda.

**API**
- **`POST /finance/treasury/tax-payments`** com `tax` `IRT` ou `INSS` responde
  como `payroll-payments`:
  - 403 se a conta não tem colaborador ou se decidiu a folha, com o motivo em
    `detail`;
  - 409 se o lançamento da folha não guarda a decisão ou se a decisão não
    está aprovada.

**Front (por fazer)**
- No diálogo **Entregar ao Estado**, com IRT ou INSS, aplicar a regra que
  «Pagar salários» já aplica:
  - esconder ou desactivar o botão a quem decidiu a folha do mês e a quem não
    tem ficha de colaborador, e dizer porquê;
  - mostrar o 403 do servidor sem repetir o pedido.
- Com IVA, nada muda.

**Como ver**
- **Contas QA:** quem aprovou a folha em Aprovações recebe 403 ao entregar o
  IRT ou o INSS. O Director Geral (`admin`) entrega-os.
- No seed, os `PAG-IRT-…` e `PAG-INSS-…` passam a ser da conta `admin`.

---

## 36. A conta da natureza na aprovação da despesa (PR #159)

Quem aprova uma despesa de colaborador pode dizer em que conta do PGC fica o
custo (ADR-119). Sem conta, fica na 75.2.39 «Outros serviços», como até
aqui. Serve sobretudo as outras despesas com o pessoal, que o PGC separa em
«.1 Órgãos sociais» e «.2 Pessoal»: pensões (72.3), prémios para pensões
(72.4), encargos (72.5), seguros de acidentes de trabalho (72.6), formação
(72.7) e outras (72.8, onde também vão as ajudas de custo). Serve também
para a 75.2.23 «Deslocações e estadas».

**API**
- **`POST /finance/expenses/{expenseId}/approval`** aceita
  `{ notes?, expenseAccountCode? }`:
  - a conta tem de ser de movimento, da classe 7;
  - não pode ser a 71, a 73, uma de transferência (x.9), a 72.1 ou a 72.2.
    As remunerações vão pela folha;
  - nas 72.3 a 72.8, a `.1` é para quem ocupava um cargo de órgão social no
    dia da despesa, e a `.2` para os outros;
  - fora disto dá 400, com o motivo em `errors.pedido`, e a despesa continua
    por decidir. Se a subconta estiver trocada, o motivo diz qual é a certa.
- **`GET /finance/expenses/{expenseId}`** e a lista devolvem
  `expenseAccountCode`, nulo se a despesa lançou na 75.2.39 ou ainda não foi
  aprovada.
- A rejeição não muda: não leva conta.

**Front (por fazer)**
- **Aprovar** (Despesas, `src/features/despesas`): juntar ao diálogo um campo
  opcional «Conta do custo (PGC)», com as mesmas sugestões de contas da
  factura de compra (quem lê o plano de contas).
  - Vazio, o pedido vai como até aqui.
  - Com um 400, mostrar `errors.pedido` junto ao campo e não fechar o
    diálogo.
- **Ficha da despesa:** mostrar a conta do custo quando houver.
- **Ajuda ao lado do campo, opcional:**
  - «Formação, seguros e outras despesas com o pessoal: 72.x.1 para órgãos
    sociais, 72.x.2 para o pessoal.»
  - «Alojamento e alimentação em deslocação: 75.2.23.»

**Como ver**
- **Contas QA**, depois do reseed: nas despesas há duas de formação já
  reembolsadas.
  - A do Administrador, em Dezembro de 2025, está na 72.7.1.
  - A de um técnico, de há 45 dias, está na 72.7.2.
  - Os lançamentos `DSP-…` mostram a conta contra a 36.9.

---

## 35. Estimativa do imposto industrial (PR #158)

O contabilista indica a estimativa do imposto industrial do ano. O Rivo lança
D 87.1 / C 34.1 a 31/12, antes do apuramento, e não tem taxas nem calcula nada
(ADR-118). Há uma indicação por exercício. Corrigir é um ajuste, com o novo
valor e o motivo, e nada se edita. «Sem imposto» indica-se com zero.

**API**
- **`GET /finance/ledger/fiscal-years/{ano}/income-tax-estimate`**
  (`finance.ledger.read`):
  - `indicated`;
  - `amount`: o valor em vigor;
  - `records[]`, cada um com `kind` (`Initial` ou `Adjustment`), `amount`,
    `difference` (negativo é estorno), `archivalNumber`, `entryVoided`,
    `notes`, `recordedBy` (o id da conta) e `recordedAt`.
- **`POST …/income-tax-estimate`** (`finance.ledger.close`):
  - pedido `{ amount, notes? }`, resposta 201 com `{ estimate, notes }`;
  - lança «IMP-AAAA»;
  - zero regista sem lançar;
  - a segunda indicação dá 409.
- **`POST …/income-tax-estimate/adjustments`** (`finance.ledger.close`):
  - pedido `{ amount, reason }`: `amount` é o novo total, e `reason` é
    obrigatório;
  - lança só a diferença («IMP-AAAA-2»…);
  - sem indicação prévia dá 409; igual ao valor em vigor, ou sem motivo, dá
    400.
- **`POST …/closing`:** a resposta ganha `notes[]`. Avisa, sem recusar, se falta
  a estimativa ou se a 87.1 não bate com ela.

**No front**
- **Períodos → Fecho do exercício** (`src/features/contabilidade/Fecho.tsx`):
  - novo cartão **«Imposto industrial»**, entre a regularização de
    existências e o apuramento;
  - **sem estimativa:** o aviso «Falta a estimativa do imposto industrial de
    AAAA» e o botão **Indicar estimativa**. O formulário tem o valor em
    kwanzas e uma nota opcional, e uma caixa «Sem imposto (zero)» que põe 0;
  - **com estimativa:** o valor em vigor e uma tabela com os registos (data e
    hora, quem, tipo, valor, diferença, lançamento com ligação a Lançamentos,
    nota ou motivo);
  - o botão **Corrigir** abre o formulário com o novo valor e o motivo
    (obrigatório). Não há editar nem apagar;
  - o `recordedBy` é um id de conta: mostrar o nome com a lista de
    utilizadores que o ecrã de Auditoria já usa.
- **Apurar os resultados** (o mesmo ecrã): mostrar os `notes` da resposta em
  aviso, com uma ligação ao cartão do imposto.
- O texto do cartão de fecho passa a ter a ordem: actualização cambial,
  regularização de existências, imposto industrial, apuramento, abertura.
- **Contas QA**, depois do reseed:
  - 2025 tem a estimativa zero, «Prejuízo de … Kz: sem imposto industrial a
    estimar», indicada pelo seed;
  - o apuramento de 2025 não avisa.

  Para testar o lançamento, numa base local: indicar um valor num ano sem
  estimativa, corrigir para menos e ver o «IMP-AAAA-2» com D 34.1.

---

## Como testar

- **Produção (`syyt.tech`), só leitura:** as contas QA de colaborador e de
  cliente servem para o ponto 1.
- **Ponto 2, numa base local:**
  1. criar uma política com um passo `Validation` para um processo fácil de
     disparar, por exemplo `hr.leave_request` com um pedido de férias pelo
     portal;
  2. desactivar antes a política activa desse processo, ou a submissão recusa
     por haver duas políticas igualmente específicas;
  3. decidir com uma conta ligada a um colaborador que ocupe o cargo do passo.

  A suite `scripts/verify-approval.ps1` (casos 11 a 15) faz exactamente isto
  com a folha de salários.
- **Em produção, não criar políticas de teste:** os pedidos reais passariam a
  cair nelas.
- **Ponto 4:** a suite `scripts/verify-internal-audit.ps1` percorre o ciclo
  inteiro (criar, fases, achado, plano atrasado, fecho, cancelamento,
  histórico). Em produção, as auditorias criadas não se apagam: testar numa
  base local ou usar títulos claramente de teste.
