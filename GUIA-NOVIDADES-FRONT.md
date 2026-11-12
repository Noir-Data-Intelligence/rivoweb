# Guia: levar as novidades do backend para este front (`rivoweb`)

Data: 2026-10-26. É para este repositório (`rivo/front`, publicado em
`rivoweb-coral.vercel.app`), e não para o front de produção.

O `NOVIDADES-BACKEND.md` descreve o contrato, com os nomes das páginas do
outro front (`InternalAudit.tsx`, `AdminMetrics.tsx`). Este guia diz **onde
mexer aqui**, ficheiro a ficheiro, e por que ordem.

## Estado

| O quê | PR do backend | Neste front |
|---|---|---|
| Portal do colaborador (benefícios, contrato, dados pessoais) | #117 | Já feito (`a0dc420`) |
| Aprovações com checklist (K4) | #118 | Já feito (`a0dc420`) |
| B42: nomes dos esquemas de checklist | #121 | **Falta** (passo 2) |
| Auditoria interna | #119 | **Falta** (passo 3) |
| Trilha por período e contagem por dia | #122 | **Falta** (passo 4) |

Os três PRs que faltam estão **em produção** (`syyt.tech`), no commit
`e8d4a19` do `main` do backend.

Verificado a 26/10, só com leituras e a conta QA de admin:
- `GET /audit/entries/daily-count` responde 200 com um dia por linha;
- a paginação traz `X-Total-Count`;
- um período de mais de 366 dias dá 400.

**Ordem recomendada:** 1 → 2 → 3 → 4. O passo 1 parte o `typecheck` até se
fazer o passo 2, por isso os dois vão no mesmo commit.

---

## Passo 1. Actualizar o contrato (`openapi/v1.json`)

O `v1.json` actual é do `1dad7aa` (#118) e não tem nenhuma das rotas novas.

1. No repositório da API, criar uma worktree no commit publicado:
   ```sh
   git fetch origin
   git worktree add ../api-openapi e8d4a19
   ```
2. Arrancar a API como diz o `openapi/README.md` (secção «Actualizar»):
   - com `OpenApi__Expose=true`;
   - com uma base local vazia (`Database__MigrateOnStartup=true`).
3. Descarregar o contrato e regenerar os tipos:
   ```sh
   curl -s http://localhost:5181/openapi/v1.json -o openapi/v1.json
   npm run api:types
   npm run api:check
   ```
4. No `openapi/README.md`:
   - actualizar a tabela: data 2026-10-26, commit `e8d4a19` (merge do #122,
     que inclui o #119 e o #121), e o número de caminhos;
   - retirar o parágrafo **«Nome repetido (B42)»**, que deixa de ser verdade.

**Para confirmar que o ficheiro está certo,** procurar no `v1.json`:
- `/internal-audit/audits`;
- `/audit/entries/daily-count`;
- `TaskChecklistItemRequest`;
- **nenhum** `"ChecklistItemRequest"` sozinho.

---

## Passo 2. B42: tirar o remendo dos projectos

Depois do passo 1, `S["ChecklistItemRequest"]` deixa de existir e o
`npm run typecheck` falha em `src/features/projectos/api.ts:224`.

Em `src/features/projectos/api.ts`, no `case "passo"`:
- apagar o comentário `// B42: …`;
- tirar `as unknown as S["ChecklistItemRequest"]` e passar `body: a.corpo`
  directamente. O corpo já é `{ title }`, que é o novo
  `TaskChecklistItemRequest`;
- se o tipo do `corpo` na união das acções (perto da linha 181) for local,
  trocá-lo por `S["TaskChecklistItemRequest"]`.

As aprovações (K4) não mudam. Usam `ApprovalChecklistItemView` na leitura, e
o corpo das políticas passa a chamar-se `PolicyChecklistItemRequest`, com o
mesmo JSON.

`npm run check` tem de passar antes de seguir.

---

## Passo 3. Página nova «Auditoria interna»

**Rotas:** todas em `/internal-audit/...`. É um módulo próprio, que **não**
se mistura com a página `/auditoria` (a trilha técnica).

### 3.1 Ficheiros a criar ou alterar

| Ficheiro | O que fazer |
|---|---|
| `src/features/auditoria-interna/api.ts` | Novo: hooks de leitura e escrita (3.3) |
| `src/features/auditoria-interna/pages/AuditoriaInterna.tsx` | Novo: cartões, mais três vistas: Auditorias, Achados e Planos de acção |
| `src/features/auditoria-interna/pages/AuditoriaInternaDetalhe.tsx` | Novo: uma auditoria com os achados, os planos e o histórico |
| `src/app/paginas.ts` | `auditoriaInterna` e `auditoriaInternaDetalhe`, com `import()` diferido como as outras |
| `src/app/requisitos.ts` | `"/auditoria-interna": "internalaudit.audits.read"` |
| `src/app/router.tsx` | `auditoria-interna` e `auditoria-interna/:auditId`, as duas com `protegido(R["/auditoria-interna"], …)`, junto às de F13 |
| `src/shells/rotas.ts` | Entrada no menu, grupo «Administração», depois de «Auditoria». Ícone sugerido: `ClipboardCheck` ou `ShieldCheck` (lucide) |
| `tests/unit/f14-auditoria-interna.test.ts` | Novo, no padrão de `f13-esg.test.ts` (3.6) |

Rever também `tests/unit/menu.test.tsx` e `rotas.test.tsx`, se enumerarem
as rotas.

**Componentes a reaproveitar:**

| Componente | Para quê |
|---|---|
| `Kpi` e `GrelhaKpis` | Os cartões do topo |
| `Vistas` e `useVista` | As três abas |
| `Tabela` | As listas |
| `Dialog` e `Field` | Os formulários |
| `ConfirmarComMotivo` | Cancelar a auditoria e aceitar o risco |
| `Badge` | Estados e gravidade |
| `ErrorPanel` | Erros |

Para as escritas, usar `useEscrita` (`lib/api/escrita.ts`), que evita o
clique duplo.

### 3.2 Quem vê o quê

| Perfil | Acesso |
|---|---|
| Admin | Tudo (`internalaudit.{audits,findings,actions}.{read,write}`) |
| Manager | Só leitura (`.read`) |
| Outros | 403. A entrada do menu já fica escondida pelo `requer` |

**Na página:**
- usar `const { pode } = useUtilizador()`;
- esconder os botões de criar e editar quando falta o `.write`
  correspondente:
  - `internalaudit.audits.write` para auditorias;
  - `internalaudit.findings.write` para achados;
  - `internalaudit.actions.write` para planos;
- `GET /internal-audit/lookups` exige `internalaudit.audits.write`. Chamar
  **só** com o formulário aberto e com essa permissão; o Manager recebe 403.

### 3.3 Rotas e hooks

| Hook sugerido | Pedido | Notas |
|---|---|---|
| `useResumoAuditoriaInterna` | `GET /internal-audit/overview` | `{ activeAudits, openFindings, overdueActionPlans, compliancePercent }` |
| `useAuditoriasInternas(f)` | `GET /internal-audit/audits?status&departmentId` | Lista sem paginação |
| `useAuditoriaInterna(id)` | `GET /internal-audit/audits/{auditId}` | `{ audit, findings[], actionPlans[] }`; 404 se não existir |
| `useHistoricoAuditoria(id)` | `GET /internal-audit/audits/{auditId}/history` | `[{ action, entityType, entityId, actorUserId, actorName, occurredAt }]` |
| `useAchados(f)` | `GET /internal-audit/findings?auditId&status&severity` | |
| `usePlanosAccao(f)` | `GET /internal-audit/action-plans?findingId&status&overdue&ownerEmployeeId` | `overdue=true` para «Atrasados» |
| `useOpcoesAuditoria(activo)` | `GET /internal-audit/lookups` | `{ departments[{id,name}], employees[{id,name}] }` |
| escrita | `POST /internal-audit/audits` | 201 `{ id }` |
| escrita | `PUT /internal-audit/audits/{auditId}` | 204 |
| escrita | `POST /internal-audit/audits/{auditId}/findings` | 201 `{ id }` |
| escrita | `PUT /internal-audit/findings/{findingId}` | 204 |
| escrita | `POST /internal-audit/findings/{findingId}/action-plans` | 201 `{ id }` |
| escrita | `PUT /internal-audit/action-plans/{actionPlanId}` | 204 |

**Os `PUT` substituem o registo inteiro.** Enviar sempre todos os campos
(os actuais, mais os alterados), mesmo quando só se muda o `status`. Um
campo omitido não fica igual: é validado como vazio.

**Depois de cada escrita, invalidar:**
- `["internal-audit"]` (lista, detalhe e histórico);
- o resumo do topo.

### 3.4 Corpos e valores

**Auditoria** (`AuditRequest`):

```json
{
  "title": "Auditoria de compras 2026",
  "objectives": "texto ou null",
  "scope": "texto ou null",
  "departmentId": "guid",
  "ownerEmployeeId": "guid",
  "plannedStart": "2026-11-01",
  "plannedEnd": "2026-11-30",
  "riskRating": "High",
  "status": null,
  "cancellationReason": null
}
```

**Achado** (`FindingRequest`):

```json
{ "description": "…", "severity": "Medium", "controlRef": "C-12 ou null", "recommendation": "… ou null", "status": null, "resolutionNotes": null }
```

**Plano** (`ActionPlanRequest`):

```json
{ "action": "…", "ownerEmployeeId": "guid", "dueDate": "2026-12-15", "status": null }
```

**Textos sugeridos para os valores:**

| Campo | Valor da API → texto |
|---|---|
| `riskRating`, `severity` | `Low` Baixo · `Medium` Médio · `High` Alto · `Critical` Crítico |
| auditoria `status` | `Planned` Planeada · `InProgress` Em curso · `Reporting` Relatório · `Closed` Fechada · `Cancelled` Cancelada |
| achado `status` | `Open` Aberto · `InRemediation` Em correcção · `Closed` Fechado · `AcceptedRisk` Risco aceite |
| plano `status` | `Pending` Pendente · `InProgress` Em curso · `Done` Concluído |

Tons sugeridos para o `Badge`: Crítico e Alto a vermelho e laranja; atrasado
(`isOverdue`) a vermelho.

**Campos só de leitura que convém mostrar:**
- **auditoria:** `auditNumber` (`AUD-2026-001`), `departmentName`,
  `ownerName`, `findingsTotal` e `findingsOpen`, e `closedAt`;
- **achado:** `auditNumber` e `auditTitle` (nas listas transversais),
  `actionPlansTotal` e `actionPlansDone`, e `resolvedAt`;
- **plano:** `auditNumber`, `ownerName`, `isOverdue` e `completedAt`.

### 3.5 Regras de negócio (o servidor decide; o front só guia)

**Fases da auditoria** (uma de cada vez):

```
Planeada ──Iniciar──▶ Em curso ──Passar a relatório──▶ Relatório ──Fechar──▶ Fechada
                          ▲                                │
                          └────────Voltar a em curso───────┘
Qualquer fase aberta ──Cancelar (com motivo)──▶ Cancelada
```

- Mostrar só o botão da fase seguinte que faz sentido.
- **«Fechar»:** exige todos os achados `Closed` ou `AcceptedRisk`. Com
  `findingsOpen > 0`, desactivar o botão e explicar porquê.
- **«Cancelar»:** abrir `ConfirmarComMotivo` e enviar `cancellationReason`.

**Achados:**
- **Criar:** só com a auditoria Em curso ou em Relatório. Noutras fases,
  esconder «Novo achado».
- **Fechar** (`status: "Closed"`): exige todos os planos `Done`.
- **Aceitar o risco** (`"AcceptedRisk"`): exige `resolutionNotes`. Usar
  `ConfirmarComMotivo`.
- **Separação de funções:** quem é responsável por um plano desse achado não
  o pode fechar. O servidor responde 403; mostrar «Quem executa um plano não
  pode fechar o achado».
- **Primeiro plano:** ao criá-lo, o achado passa sozinho a «Em correcção».

**Planos:**
- Os estados são livres entre `Pending`, `InProgress` e `Done`.
- Com o achado fechado ou a auditoria encerrada, dá 409.

**Erros:**

| Código | Quando | O que mostrar |
|---|---|---|
| 400 | Validação | Mensagem em `errors.pedido[0]`, ou por campo |
| 403 | Separação de funções, ou falta de permissão | A mensagem, ou o aviso acima |
| 404 | Auditoria, achado ou plano inexistente | — |
| 409 | Fase errada | A mensagem do Problem Details |

Usar o mesmo tratamento de erros das outras páginas (`lib/api/problem.ts`).

**Conformidade:** `compliancePercent` vem `null` quando não há achados.
Mostrar «—», nunca «100%».

### 3.6 Histórico (detalhe da auditoria)

Linha do tempo com `occurredAt`, `actorName` (ou «Sistema» se for `null`) e
o texto da acção:

| `action` | Texto |
|---|---|
| `internalaudit.audit.planned` | Auditoria planeada |
| `internalaudit.audit.revised` | Auditoria revista |
| `internalaudit.audit.status_changed` | Fase da auditoria alterada |
| `internalaudit.finding.identified` | Achado registado |
| `internalaudit.finding.revised` | Achado revisto |
| `internalaudit.finding.status_changed` | Estado do achado alterado |
| `internalaudit.action_plan.created` | Plano de acção criado |
| `internalaudit.action_plan.revised` | Plano de acção revisto |
| `internalaudit.action_plan.status_changed` | Estado do plano alterado |

O histórico **não** traz os valores antes e depois. Para os mostrar, cruzar
com o estado actual que está no detalhe.

### 3.7 Testes

Seguir o padrão dos `tests/unit/fNN-*.test.ts`. No mínimo:
- tradução dos estados e da gravidade;
- botões por fase;
- «Fechar» desactivado com achados abertos;
- `compliancePercent: null` → «—»;
- Manager sem botões de escrita;
- 403 da separação de funções com a mensagem certa.

---

## Passo 4. Trilha por período e eventos por dia (`/auditoria`)

A página `src/features/auditoria/pages/Auditoria.tsx` usa hoje `limit` (50,
100 ou 200). Com o #122 pode ter período e paginação. O modo antigo continua
a funcionar, por isso esta alteração é opcional, mas recomendada.

### 4.1 Lista paginada por período

Em `src/features/auditoria/api.ts`, acrescentar um hook com `from`, `to`,
`page` e `pageSize`, lido com `lerPagina` (`lib/api/client.ts`), que já
interpreta `X-Page`, `X-Page-Size` e `X-Total-Count`:

```ts
export function useAuditoriaPeriodo(f: { tipo: string | null; id: string | null; de: string; ate: string; pagina: number; tamanho: number }) {
  return useQuery({
    queryKey: ["audit", "periodo", f],
    queryFn: ({ signal }) =>
      lerPagina(api.GET("/audit/entries", { params: { query: {
        ...(f.tipo ? { entityType: f.tipo } : {}), ...(f.id ? { entityId: f.id } : {}),
        from: f.de, to: f.ate, page: f.pagina, pageSize: f.tamanho } }, signal })),
    placeholderData: keepPreviousData,
  });
}
```

**Na página:**
- substituir o selector de limite por `FiltroJanela` e `useJanelaUrl`
  (`ui/JanelaDatas.tsx`), por exemplo com os últimos 7 dias por omissão;
- acrescentar `Paginacao` e `usePaginacaoUrl`;
- `from` e `to` são **dias UTC, inclusivos** (`AAAA-MM-DD`);
- `pageSize` vai até 200.

### 4.2 Gráfico «Eventos por dia»

```ts
export function useEventosPorDia(de: string, ate: string) {
  return useQuery({
    queryKey: ["audit", "por-dia", de, ate],
    queryFn: ({ signal }) => ler(api.GET("/audit/entries/daily-count", { params: { query: { from: de, to: ate } }, signal })),
  });
}
```

- **Resposta:** `[{ date: "2026-10-22", count: 159 }, …]`, um elemento por
  dia, com os dias sem eventos a 0. Não é preciso preencher buracos.
- **Desenho:** com `ChartCard` (uma série, `slot: 1`), por cima da tabela e
  com o mesmo período do filtro.
- **Limite:** no máximo 366 dias; acima disso, 400 em `errors.pedido`.
  Validar antes no `FiltroJanela`.
- **Permissão:** `audit.trail.read`, a mesma da página.

**Opcional:** um cartão «Eventos de auditoria (7 dias)» no painel do Admin
(`features/dashboard`), só com `pode("audit.trail.read")`.

---

## Antes de publicar

1. `npm run check`, que corre lint, typecheck, testes, tokens e `api:check`.
2. `npm run build`.
3. **Teste em produção, só leitura, com as contas QA:**
   - **admin:** a página abre com 0 auditorias e a conformidade «—»; a
     auditoria mostra o gráfico com contagens;
   - **gestor:** vê a auditoria interna, sem botões de escrita;
   - **colaborador:** não vê a entrada no menu, e o URL directo dá a página
     de acesso negado.
4. **Não criar auditorias em produção para testar:** os registos e a trilha
   não se apagam. Para testar as escritas, usar uma API local
   (`scripts/verify-internal-audit.ps1` no backend mostra o ciclo inteiro).
5. Actualizar `FUNCIONALIDADES.md`: tirar as duas linhas da secção 5 («Ainda
   não disponível no front») e pôr a auditoria interna e os eventos por dia
   no perfil Admin (e Manager, só leitura).
