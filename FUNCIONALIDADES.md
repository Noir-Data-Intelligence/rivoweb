# Rivo — funcionalidades do front por perfil

> **Estado:** fases **F0 a F4** concluídas e publicadas em
> `https://rivoweb-coral.vercel.app` · actualizado a 2026-10-15.
>
> Este documento cresce com o front: no fim de cada fase entram as
> funcionalidades novas. Só está aqui o que o front **já faz em produção**. O
> que o backend tem e o front ainda não mostra está na última secção.
>
> **Fonte:** o catálogo real de perfis (`GET /settings/overview`, guardado em
> `tests/fixtures/catalogo-perfis.json`) cruzado com as permissões que cada ecrã
> e cada botão exigem no código (`src/app/requisitos.ts` e as guardas `Can`).
> O teste `tests/unit/menu.test.tsx` e o smoke por perfil em produção
> (`tests/e2e/leitura/perfis.spec.ts`) confirmam os menus aqui descritos.
>
> **Regra de fundo:** esconder não protege. O front só mostra o que a conta
> pode usar, mas quem decide é sempre o backend.

---

## 1. Perfis e entrada

| Perfil | Entra em | Menu lateral |
|---|---|---|
| **SuperAdmin** | Gestão (`/`) | Início, Dashboard executivo, Aprovações, Alertas, Clientes, Facturas, Pró-formas, Notas de crédito, Recibos, A receber, Colaboradores, Departamentos, Cargos, Utilizadores, Configurações, Facturação, Políticas de aprovação |
| **Admin** | Gestão (`/`) | Início, Dashboard executivo, Aprovações, Alertas, Clientes, Facturas, Pró-formas, Notas de crédito, Recibos, A receber, Colaboradores, Departamentos, Cargos, Utilizadores, Configurações, Facturação, Políticas de aprovação |
| **HR** (Recursos Humanos) | Gestão (`/`) | Início, Alertas, Colaboradores, Departamentos, Cargos |
| **Finance** (Finanças) | Gestão (`/`) | Início, Aprovações, Alertas, Facturas, Pró-formas, Notas de crédito, Recibos, A receber, Configurações, Facturação |
| **Manager** (Gestão) | Gestão (`/`) | Início, Dashboard executivo, Aprovações, Alertas |
| **AssetManager** (Gestão de activos) | Gestão (`/`) | Início, Alertas |
| **Sales** (Vendas) | Gestão (`/`) | Início, Clientes, Facturas, Pró-formas, Notas de crédito, Recibos, A receber, Facturação |
| **ProjectManager** (Gestão de projectos) | Gestão (`/`) | Início |
| **Colaborador** | Portal do colaborador (`/eu`) | Início |
| **Cliente** | Portal do cliente (`/cliente`) | Início |

Uma conta pode ter vários perfis; vê a soma do que cada um permite. Quem tem
perfil de gestão e ficha de colaborador vê também «O meu portal» no menu da
conta, e no portal tem «Voltar à gestão».

---

## 2. Matriz de funcionalidades

✓ = disponível · — = não disponível. SA = SuperAdmin, PM = ProjectManager,
AM = AssetManager.

| Funcionalidade | SA | Admin | HR | Finance | Manager | AM | Sales | PM | Colaborador | Cliente |
|---|---|---|---|---|---|---|---|---|---|---|
| **Comum** | | | | | | | | | | |
| Entrar, sair, aceitar convite, recuperar password | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| A minha conta: mudar password, sessões activas, preferência de e-mail | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Notificações: sino, lista, marcar como lidas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tema claro, escuro ou do sistema | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Início** | | | | | | | | | | |
| Resumo pessoal: notificações por ler, aprovações à espera, anúncios | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ ¹ | — |
| Indicadores de finanças (com gráfico mensal) | ✓ | ✓ | — | ✓ | ✓ | — | ✓ | — | — | — |
| Indicadores de pessoas (com gráficos) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| Indicadores de vendas (com gráficos) | ✓ | ✓ | — | — | ✓ | — | ✓ | — | — | — |
| Nome do cliente associado à conta | — | — | — | — | — | — | — | — | — | ✓ ² |
| Cargo actual (da ficha ligada) | — | — | — | — | — | — | — | — | ✓ ¹ | — |
| **Dashboard executivo** | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| **Aprovações** | | | | | | | | | | |
| Ver a caixa (à minha espera, todos, por tipo) e a ficha com passos e decisões | ✓ | ✓ | — | ✓ | ✓ | — | — | — | — | — |
| Decidir: aprovar, rejeitar, pedir esclarecimento ⁵ | ✓ ⁶ | ✓ | — | ✓ | ✓ | — | — | — | — | — |
| Cancelar o próprio pedido | ✓ ⁶ | ✓ | — | ✓ | ✓ | — | — | — | — | — |
| Ver os nomes de quem pediu e de quem decide | ✓ | ✓ | — | — ⁷ | — ⁷ | — | — | — | — | — |
| Políticas de aprovação: ver, criar e desactivar | ✓ | ✓ | — | — | — | — | — | — | — | — |
| **Alertas** | | | | | | | | | | |
| Ver alertas e regras | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| Resolver alertas; criar, rever e desactivar regras; avaliar agora | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| **Clientes** | | | | | | | | | | |
| Ver a lista (com inactivos) e a ficha, com contactos | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| Registar, importar CSV, corrigir, desactivar e reactivar, eliminar sem história; gerir contactos | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| **Facturas** | | | | | | | | | | |
| Ver as emitidas (filtros por cliente e datas), a ficha, o saldo e o PDF | ✓ | ✓ | — | ✓ | — | — | ✓ | — | — | — |
| Nova factura: rascunhos FT, FR e ND, e emitir | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| Ver o IVA e o total previstos antes de emitir | ✓ | ✓ | — | — | — | — | ✓ ⁴ | — | — | — |
| Enviar facturas, notas de crédito e recibos ao cliente por e-mail | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| Anular facturas, notas de crédito e recibos | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Emitir notas de crédito a partir da factura | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Registar recebimentos (recibos) a partir da factura, com o retido na fonte | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| **Notas de crédito e recibos:** ver listas, fichas e PDF | ✓ | ✓ | — | ✓ | — | — | ✓ | — | — | — |
| **Pró-formas:** ver | ✓ | ✓ | — | ✓ | — | — | ✓ | — | — | — |
| **Pró-formas:** criar, converter em factura e anular | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| **A receber:** facturas vencidas em aberto | ✓ | ✓ | — | ✓ | — | — | ✓ | — | — | — |
| **Facturação:** ver séries e canais de pagamento | ✓ | ✓ | — | ✓ | — | — | ✓ | — | — | — |
| **Facturação:** abrir séries; criar e rever canais | ✓ | ✓ | — | — | — | — | — | — | — | — |
| **Facturação:** ver as taxas de IVA | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| **Colaboradores** | | | | | | | | | | |
| Ver a lista e a ficha | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| Admitir; corrigir nome; mudar contactos, departamento e estado | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| Atribuir cargo (com aprovação se tiver autoridade); encerrar cargo | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| Atribuir cargo directamente, sem aprovação | ✓ | — | — | — | — | — | — | — | — | — |
| Ligar e desligar a conta de acesso; ver o histórico | ✓ | ✓ | — | — | — | — | — | — | — | — |
| **Departamentos:** ver | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| **Departamentos:** criar e corrigir | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| **Cargos:** ver, com ocupações | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| **Cargos:** criar e corrigir | ✓ | ✓ | — | — | — | — | — | — | — | — |
| **Utilizadores** | | | | | | | | | | |
| Ver contas, perfis e estado | ✓ | ✓ | — | — | — | — | — | — | — | — |
| Convidar | ✓ | ✓ | — | — | — | — | — | — | — | — |
| Juntar e retirar perfis | ✓ | ✓ ³ | — | — | — | — | — | — | — | — |
| Desactivar e reactivar contas; ligação de recuperação; definir password | ✓ | ✓ ³ | — | — | — | — | — | — | — | — |
| **Configurações** | | | | | | | | | | |
| Dados da empresa: ver | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Dados da empresa: declarar e corrigir | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Governação: perfis e regras de aprovação | ✓ | ✓ | — | — | — | — | — | — | — | — |
| Teste de correio | ✓ | ✓ | — | — | — | — | — | — | — | — |

¹ Só se a conta estiver ligada a uma ficha de colaborador; sem ficha, o portal
diz «A sua conta ainda não está ligada a uma ficha de colaborador. Fale com os
Recursos Humanos.»
² Só se a conta estiver associada a um cliente; sem associação, o portal diz
«Esta conta não está associada a um cliente. Fale com a empresa.»
³ Excepto em contas SuperAdmin, que só um SuperAdmin gere.
⁴ A Sales não lê as taxas de IVA: vê o IVA e o total previstos pelo servidor depois de guardar o rascunho; o Admin vê-os ao escrever.
⁵ Só quem tem ficha de colaborador ligada à conta e ocupa o cargo do passo em curso; quem pediu nunca decide (BR-2) e quem já interveio não decide outra vez (BR-4).
⁶ O SuperAdmin só decide se a conta estiver ligada a uma ficha de colaborador.
⁷ Vêem «Colaborador» (ou «Você»): os pedidos só trazem ids e estes perfis não lêem colaboradores (B19).

---

## 3. Funcionalidades comuns a todas as contas

### Acesso
- **Entrar** com e-mail e password. Credenciais erradas mostram «E-mail ou
  password incorrectos.», sem dizer qual dos dois falhou.
- **Aceitar convite** pela ligação do e-mail (`/convite`): define a password e
  entra. A ligação é lida e retirada do endereço logo ao abrir.
- **Recuperar password** (`/recuperar-password`): a resposta é sempre a mesma,
  exista ou não a conta. A ligação do e-mail (`/recuperar`) define a password
  nova.
- **Política de password:** pelo menos 12 caracteres, uma minúscula, uma
  maiúscula, um algarismo e um símbolo. As regras aparecem e confirmam-se à
  medida que se escreve.
- **Sair:** termina a sessão no servidor e apaga-a no browser, mesmo sem rede.
  Sair numa aba sai em todas. O login seguinte não volta à página onde estava
  (computador partilhado).
- **Inactividade:** aviso antes do fim e sessão terminada sozinha no prazo do
  servidor. Quem perde a sessão a meio do trabalho volta à mesma página depois
  de entrar.
- **Prazo absoluto da sessão:** aviso antes do fim.
- **Sem ligação ao servidor:** faixa no topo, com nova tentativa.

### A minha conta
- **Mudar password** (com a actual). As sessões nos outros dispositivos
  terminam.
- **Sessões activas:** dispositivo, IP, início, última actividade e prazo de
  cada uma. Terminar uma sessão noutro dispositivo, ou a actual.
- **Notificações por e-mail:** ligar ou desligar. Convites e recuperação de
  password vão sempre por e-mail.

### Notificações
- **Sino** no topo com a contagem por ler, actualizada a cada minuto enquanto
  a pessoa está a usar a Rivo (nunca mantém viva uma sessão parada).
- **Página de notificações:** lista paginada, filtro «Só as por ler», marcar
  uma como lida, marcar todas como lidas.

### Aparência e acessibilidade
- Tema claro, escuro ou o do sistema, lembrado no browser.
- Funciona em telemóvel, tablet e computador (360 a 1440 px). Teclado completo;
  verificado com axe em cada ecrã.

---

## 4. Por perfil

### SuperAdmin
Conta de operação para desbloquear a configuração inicial. Mostra sempre a
faixa «Conta de operação. Use-a só para desbloquear configuração inicial.»
Tem tudo o que o **Admin** tem (abaixo) e ainda:
- **Atribuir cargo directamente**, sem aprovação — para o primeiro cargo
  aprovador, quando ainda ninguém pode decidir.
- **Gerir contas SuperAdmin** (perfis, estado, password), que o Admin vê só em
  leitura.

### Admin
**Início**
- Resumo pessoal: notificações por ler, aprovações à espera, anúncios em vigor.
- Indicadores do período (este mês, últimos 3 meses, este ano, ano anterior):
  - **Finanças:** receita, despesa, resultado, a receber e a pagar; gráfico de
    receita e despesa por mês.
  - **Pessoas:** colaboradores activos e inactivos, admissões, ausências
    (injustificadas), pedidos de férias por decidir, pedidos de RH em aberto;
    gráficos de admissões por mês e de colaboradores por departamento.
  - **Vendas:** oportunidades em aberto, valor em pipeline (e ponderado), taxa
    de sucesso, valor ganho, contratos a terminar em 30 dias; gráficos do valor
    por etapa e das oportunidades ganhas por mês.
- Cada gráfico tem como título uma conclusão calculada dos dados e «Ver como
  tabela» com os mesmos números, exportável em CSV.

**Dashboard executivo**
- Receita, despesa, resultado, a receber e a pagar do período; evolução mensal;
  os clientes que mais facturaram.

**Aprovações**
- Caixa: **à minha espera** (os pedidos em que é aprovador do passo em curso),
  **todos**, e filtro por tipo (atribuição de cargo, férias, pedido de
  pagamento, requisição de compra, folha de salários, contagem de inventário).
- Ficha: estado, quem pediu, passos com o modo (basta um ou todos os ocupantes
  do cargo) e o prazo, aprovadores e decisões com notas.
- **Aprovar**, **rejeitar** ou **pedir esclarecimento** (as duas últimas com
  motivo), com confirmação; se outra pessoa decidiu primeiro, a ficha avisa e
  mostra o estado actual. Numa atribuição de cargo aprovada, o cargo fica em
  vigor de imediato.
- **Cancelar** os próprios pedidos enquanto estão abertos.
- O contador «Aprovações à sua espera» do Início abre a caixa.

**Políticas de aprovação**
- Ver as políticas (processo, departamento, faixa de valores, verificação de
  orçamento, passos por cargo).
- **Criar** (passos por ordem, cada um com cargo com autoridade, modo e prazo
  em horas) e **desactivar**.

**Alertas**
- Ver alertas (abertos ou todos) e **resolvê-los**.
- Regras: ver, **criar** (o que vigiar, antecedência de 0 a 365 dias, contas a
  avisar, também por e-mail), **rever**, **desactivar** e **avaliar agora**.
  Tipos: facturas vencidas, facturas de compra a vencer, letras e livranças a
  vencer, seguros de viatura a caducar, manutenções de frota, contratos de
  cliente a terminar, contratos de trabalho a terminar, documentos de
  identificação a caducar, férias por decidir perto do início.

**Clientes**
- Lista paginada (nome, NIF, cidade, tipo, estado), com ou sem inactivos.
- **Registar** (nome, NIF, morada de facturação, cidade, país, e-mail, telefone,
  sector, sítio, pessoa de contacto, tipo) e **importar de um CSV** separado por
  vírgulas ou ponto e vírgula, como o Excel grava (Nome, NIF, Morada, Cidade,
  Pais), com o resultado linha a linha.
- Ficha: **corrigir os dados** (o NIF não se corrige), **desactivar e
  reactivar**, **eliminar** (só sem história; com história oferece desactivar),
  **contactos** (criar, rever, remover; decide compras; contacto de facturação)
  e ligação às facturas do cliente.

**Facturas**
- Emitidas: lista paginada com filtros por cliente e por datas.
- **Nova factura** (rascunho): cliente ou consumidor final; tipo FT, FR
  (factura-recibo, com meio de pagamento) ou ND (nota de débito, sobre uma
  factura em vigor do mesmo cliente); série; moeda (AOA, USD, EUR);
  vencimento; condições; retenção na fonte; linhas (descrição, quantidade,
  preço, imposto); notas internas. Totais previstos com a taxa em vigor.
  **Guardar rascunho**, **eliminar rascunho**, **emitir** com confirmação («fica
  registado e não se apaga») e escolha da data.
- Ficha: linhas e totais do servidor, saldo (facturado, creditado, recebido em
  dinheiro, retido na fonte, em aberto, retenção por comprovar), **PDF**,
  **enviar ao cliente** por e-mail, **nota de crédito** (com as quantidades a
  creditar e o motivo), **registar recebimento** (valor recebido, retido na
  fonte quando a factura tem retenção, meio, data, notas; também só a
  retenção, quando chega o certificado) e **anular** com motivo.
- Um clique duplo nunca emite dois documentos.

**Notas de crédito** e **Recibos**
- Listas (recibos com filtro por datas) e fichas com **PDF**, **enviar ao
  cliente** e **anular**.

**Pró-formas**
- Lista por estado (em aberto, convertidas, anuladas) e detalhe.
- **Criar** (cliente registado ou destinatário sem registo, validade, moeda,
  linhas, notas), **converter** em factura ou factura-recibo e **anular**.

**A receber**
- Facturas vencidas com saldo em aberto, dias de atraso e totais por moeda.

**Colaboradores**
- Lista paginada (nome, n.º, departamento, admissão, conta ligada, estado).
- **Admitir** (nome, departamento, data, e-mail, telefone, n.º mecanográfico).
- Ficha: **corrigir o nome**, **mudar contactos**, **mudar de departamento**,
  **desactivar e reactivar**.
- **Atribuir cargo**: em vigor de imediato, ou **enviado para aprovação** se o
  cargo der autoridade; «Verificar decisão»; **encerrar o cargo actual**.
- **Conta de acesso:** ligar uma conta activa e livre, desligar, ver o
  histórico de ligações.
- Se alguém alterou a ficha entretanto, a gravação é recusada e oferece
  «Recarregar» (nada se perde sem aviso).

**Departamentos**
- Lista paginada com o responsável; **criar** e **corrigir** (nome e
  responsável).

**Cargos**
- Lista paginada com o nível e a autoridade para aprovar; **criar** (a
  autoridade fixa-se ao criar) e **corrigir** (nome e nível); ver as
  **ocupações** de cada cargo.

**Utilizadores**
- Lista com pesquisa por e-mail e filtro por estado.
- **Convidar** (e-mail e perfil).
- Ficha da conta: **juntar e retirar perfis**; **desactivar e reactivar** com
  razão (fica na trilha); **enviar ligação de recuperação**; **definir uma
  password** por outra pessoa, atrás de confirmação. Não pode desactivar a
  própria conta.

**Facturação** (configuração)
- **Séries de numeração**: ver e **abrir** (tipo e código).
- **Canais de pagamento**: ver, **criar** e **rever** (nome, mecanismo, origem,
  activo).
- **Taxas de IVA**: só leitura, com as versões em vigor.

**Configurações**
- **Dados da empresa** (razão social, NIF, endereço, cidade, país, nome
  comercial, código postal, e-mail, telefone, n.º de validação AGT): ver,
  **declarar** e **corrigir**, com confirmação.
- **Governação:** perfis com as respectivas permissões e regras de aprovação
  por módulo (só leitura).
- **Teste de correio:** envia um e-mail de teste para o remetente configurado.

### HR (Recursos Humanos)
**Início**
- Resumo pessoal e indicadores de **Pessoas** (como no Admin).

**Alertas**
- Ver alertas e regras (sem resolver nem criar).

**Colaboradores**
- Lista e ficha; **admitir**, **corrigir o nome**, **mudar contactos**,
  **mudar de departamento**, **desactivar e reactivar**.
- **Atribuir cargo** (com aprovação se der autoridade), «Verificar decisão» e
  **encerrar o cargo actual**.
- **Não** vê nem gere a conta de acesso dos colaboradores.

**Departamentos**
- Ver, **criar** e **corrigir**.

**Cargos**
- Ver, com ocupações. **Não** cria nem corrige cargos.

### Finance (Finanças)
**Início**
- Resumo pessoal e indicadores de **Finanças**.

**Aprovações**
- Caixa, ficha, **decidir** e **cancelar** os próprios pedidos, como o Admin.
  Vê «Colaborador» em vez dos nomes (B19).

**Alertas**
- Ver alertas e regras.

**Facturas**
- Ver as emitidas, a ficha, o saldo e o **PDF**.
- **Anular**, emitir **notas de crédito** e **registar recebimentos** a partir
  da factura. Não cria facturas, não envia ao cliente e não abre a ficha do
  cliente.

**Notas de crédito**, **Recibos**, **Pró-formas** e **A receber**
- Ver (listas, fichas e PDF); **anular** notas de crédito e recibos.

**Facturação**
- Ver séries, canais de pagamento e taxas de IVA.

**Configurações**
- Só **Dados da empresa**: ver, **declarar** e **corrigir**.

### Manager (Gestão)
**Início**
- Resumo pessoal e indicadores de **Finanças** e de **Vendas**.

**Dashboard executivo**
- Como no Admin.

**Aprovações**
- Caixa, ficha, **decidir** e **cancelar** os próprios pedidos, como o Admin.
  Vê «Colaborador» em vez dos nomes (B19).

**Alertas**
- Ver, **resolver**; regras: **criar**, **rever**, **desactivar** e
  **avaliar agora**.

### AssetManager (Gestão de activos)
**Início**
- Resumo pessoal (sem indicadores de gestão nesta fase).

**Alertas**
- Ver alertas e regras.

### Sales (Vendas)
**Início**
- Resumo pessoal e indicadores de **Finanças** e de **Vendas**.

**Clientes**
- Tudo o que o Admin faz em Clientes (ver, registar, importar, corrigir,
  desactivar, eliminar sem história, contactos).

**Facturas**
- Ver; **nova factura** (rascunhos FT, FR, ND) e **emitir**. Vê o IVA e o
  total previstos pelo servidor depois de guardar o rascunho.
- **PDF** e **enviar ao cliente**. Não anula, não emite notas de crédito nem
  regista recebimentos.

**Notas de crédito** e **Recibos**
- Ver, **PDF** e **enviar ao cliente**.

**Pró-formas**
- Ver, **criar**, **converter** em factura e **anular**.

**A receber**
- Ver as vencidas.

**Facturação**
- Ver séries e canais de pagamento.

### ProjectManager (Gestão de projectos)
**Início**
- Resumo pessoal. Os projectos chegam na F12.

### Colaborador
Entra no **portal do colaborador** (`/eu`).
- **Início:** saudação com o nome da ficha, cargo actual, notificações por
  ler, aprovações à espera e anúncios em vigor.
- Funcionalidades comuns (conta, sessões, notificações).
- Sem ficha ligada, o portal explica que a conta ainda não está ligada e pede
  para falar com os Recursos Humanos.

### Cliente
Entra no **portal do cliente** (`/cliente`).
- **Início:** nome do cliente associado.
- Funcionalidades comuns (conta, sessões, notificações).
- Sem associação a um cliente, o portal explica-o e pede para falar com a
  empresa.

---

## 5. Ainda não disponível no front

O backend já tem estas áreas; o front mostra-as nas fases seguintes, e cada uma
entra neste documento quando estiver publicada.

| Fase | Área |
|---|---|
| F5 | Tesouraria, despesas, contas a pagar, pedidos de pagamento, carregamento de ficheiros |
| F6 | Fiscal e contabilidade |
| F7 | RH completo e portal do colaborador (férias, recibos, documentos) |
| F8 | Salários |
| F9 | Compras, inventário e activos |
| F10 | Portal do cliente, gestão documental e mensagens |
| F11 | Comercial avançado (CRM, contratos) |
| F12 | Projectos e frota |
| F13 | Complementar (ESG, IA, base de conhecimento) |

O login com Google (D4) entra quando o backend o tiver.
