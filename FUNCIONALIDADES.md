# Rivo — funcionalidades do front por perfil

> **Estado:** fases **F0 a F13** publicadas em
> `https://rivoweb-coral.vercel.app` (F6: fiscal, contabilidade e
> planeamento; F7: recursos humanos completos — portal do colaborador, RH do
> dia-a-dia, recrutamento, entradas e saídas, anúncios, pedidos internos,
> formação, turnos, declarações, desempenho, conquistas e importação de
> colaboradores; F8: salários — folhas de pagamento; F9: compras —
> requisições, ordens de compra, recepções —, inventário e activos fixos;
> F10: portal do cliente e o lado da equipa — comprovativos, conversas, base
> de conhecimento, portal na ficha do cliente e arquivo de documentos; F11:
> comercial avançado — CRM, propostas, contratos de clientes e cobranças;
> F12: projectos e frota; F13: analytics, auditoria, ESG e IA). Smoke de
> leitura em produção 10/10 a 2026-10-22 · actualizado a 2026-10-22.

---

## 1. Perfis e entrada

| Perfil | Entra em | Menu lateral |
|---|---|---|
| **SuperAdmin** | Gestão (`/`) | Início, Dashboard executivo, Analytics, ESG, Assistente de IA, Aprovações, Alertas, Clientes, Facturas, Pró-formas, Notas de crédito, Recibos, Comprovativos, A receber, Contratos de clientes, Cobranças, Leads, Oportunidades, Propostas, Actividades, Relatório comercial, Tipos de serviço, Modelos de proposta, Conversas, Base de conhecimento, Projectos, Registo de tempo, Requisições, Ordens de compra, Recepções, Artigos, Armazéns, Contagens, Valorização do stock, Activos fixos, Viaturas, Manutenção prevista, Seguros de frota, Fornecedores, Facturas de compra, Pedidos de pagamento, Despesas, Contas bancárias, Caixa pequena, Letras e livranças, Câmbios, Fluxo de caixa, Relatórios financeiros, Impostos, Lançamentos, Plano de contas, Períodos, Regras contabilísticas, Centros de custo, Orçamentos, Previsões de custos, Colaboradores, Departamentos, Cargos, Organograma, Contratos, Assiduidade, Turnos, Férias e ausências, Benefícios, Validades de imigração, Recrutamento, Entradas e saídas, Formação, Desempenho, Conquistas, Anúncios, Pedidos internos, Declarações, Folhas de pagamento, Arquivo de documentos, Utilizadores, Configurações, Facturação, Fiscal, Políticas de aprovação, Auditoria, Inteligência artificial |
| **Admin** | Gestão (`/`) | Início, Dashboard executivo, Analytics, ESG, Assistente de IA, Aprovações, Alertas, Clientes, Facturas, Pró-formas, Notas de crédito, Recibos, Comprovativos, A receber, Contratos de clientes, Cobranças, Leads, Oportunidades, Propostas, Actividades, Relatório comercial, Tipos de serviço, Modelos de proposta, Conversas, Base de conhecimento, Projectos, Registo de tempo, Requisições, Ordens de compra, Recepções, Artigos, Armazéns, Contagens, Valorização do stock, Activos fixos, Viaturas, Manutenção prevista, Seguros de frota, Fornecedores, Facturas de compra, Pedidos de pagamento, Despesas, Contas bancárias, Caixa pequena, Letras e livranças, Câmbios, Fluxo de caixa, Relatórios financeiros, Impostos, Lançamentos, Plano de contas, Períodos, Regras contabilísticas, Centros de custo, Orçamentos, Previsões de custos, Colaboradores, Departamentos, Cargos, Organograma, Contratos, Assiduidade, Turnos, Férias e ausências, Benefícios, Validades de imigração, Recrutamento, Entradas e saídas, Formação, Desempenho, Conquistas, Anúncios, Pedidos internos, Declarações, Folhas de pagamento, Arquivo de documentos, Utilizadores, Configurações, Facturação, Fiscal, Políticas de aprovação, Auditoria, Inteligência artificial |
| **HR** (Recursos Humanos) | Gestão (`/`) | Início, Alertas, Colaboradores, Departamentos, Cargos, Organograma, Contratos, Assiduidade, Turnos, Férias e ausências, Benefícios, Validades de imigração, Recrutamento, Entradas e saídas, Formação, Desempenho, Conquistas, Anúncios, Pedidos internos, Declarações, Folhas de pagamento, Arquivo de documentos |
| **Finance** (Finanças) | Gestão (`/`) | Início, Assistente de IA, Aprovações, Alertas, Facturas, Pró-formas, Notas de crédito, Recibos, Comprovativos, A receber, Contratos de clientes, Cobranças, Ordens de compra, Recepções, Activos fixos, Fornecedores, Facturas de compra, Pedidos de pagamento, Despesas, Contas bancárias, Caixa pequena, Letras e livranças, Câmbios, Fluxo de caixa, Relatórios financeiros, Impostos, Lançamentos, Plano de contas, Períodos, Regras contabilísticas, Centros de custo, Orçamentos, Previsões de custos, Configurações, Facturação, Fiscal |
| **Manager** (Gestão) | Gestão (`/`) | Início, Dashboard executivo, Analytics, ESG, Assistente de IA, Aprovações, Alertas, Contratos de clientes, Leads, Oportunidades, Propostas, Actividades, Relatório comercial, Tipos de serviço, Modelos de proposta, Requisições, Ordens de compra, Recepções, Fornecedores, Facturas de compra, Pedidos de pagamento, Despesas, Contas bancárias, Centros de custo, Orçamentos, Previsões de custos |
| **AssetManager** (Gestão de activos) | Gestão (`/`) | Início, Alertas, Ordens de compra, Recepções, Artigos, Armazéns, Contagens, Valorização do stock, Activos fixos, Viaturas, Manutenção prevista, Seguros de frota, Fornecedores |
| **Sales** (Vendas) | Gestão (`/`) | Início, Assistente de IA, Clientes, Facturas, Pró-formas, Notas de crédito, Recibos, Comprovativos, A receber, Contratos de clientes, Cobranças, Leads, Oportunidades, Propostas, Actividades, Relatório comercial, Tipos de serviço, Modelos de proposta, Conversas, Base de conhecimento, Facturação |
| **ProjectManager** (Gestão de projectos) | Gestão (`/`) | Início, Projectos, Registo de tempo |
| **Colaborador** | Portal do colaborador (`/eu`) | Início, Anúncios, Assiduidade, Férias e ausências, Turnos, Recibos, Documentos e declarações, Pedidos internos, Despesas, Formação, Objectivos e conquistas, Bens à minha guarda |
| **Cliente** | Portal do cliente (`/cliente`) | Início, Extracto, Pagamentos, Documentos, Projectos, Mensagens, Suporte, Ajuda, Assistente |

Uma conta pode ter vários perfis; vê a soma do que cada um permite. Quem tem
perfil de gestão e ficha de colaborador vê também «O meu portal» no menu da
conta; no portal, «Voltar à gestão» fica no fundo da barra lateral (e no menu
da conta), e o logotipo leva de volta ao ecrã principal com os menus
completos. Em qualquer ambiente, o logotipo leva ao início desse ambiente.

Navegação comum: os grupos do menu lateral abrem e fecham (lembrado no
browser; o grupo da página aberta mostra-se sempre); o botão no topo colapsa a
barra; **«Ir para…»** (Ctrl/⌘ K) procura entre as páginas do menu que a conta
pode abrir (não procura dados).

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
| **Portal do cliente** (o próprio, pela conta) ² | | | | | | | | | | |
| Em dívida hoje, facturado no mês e as facturas | — | — | — | — | — | — | — | — | — | ✓ |
| Extracto de um período (facturas, notas de crédito, recibos, saldos) | — | — | — | — | — | — | — | — | — | ✓ |
| Enviar o comprovativo de uma transferência (ficheiro carregado) e ver o estado de cada um | — | — | — | — | — | — | — | — | — | ✓ |
| Descarregar os documentos partilhados e os ficheiros que carregou | — | — | — | — | — | — | — | — | — | ✓ |
| Mensagens à equipa comercial (uma conversa de cada vez) | — | — | — | — | — | — | — | — | — | ✓ |
| Pedidos de suporte: abrir, responder; avaliar um fechado | — | — | — | — | — | — | — | — | — | ✓ |
| Ajuda: pesquisar e ler artigos; dizer se foi útil | — | — | — | — | — | — | — | — | — | ✓ |
| Cargo actual (da ficha ligada) | — | — | — | — | — | — | — | — | ✓ ¹ | — |
| **Dashboard executivo** | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| **Analytics**: tendências (receita e despesa por mês, frota, inventário), recursos humanos e vendas de um período, numa moeda | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| **ESG** | | | | | | | | | | |
| Relatório do ano por pilar: pontuação, cada indicador contra a meta e o ano anterior, iniciativas activas | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| Indicadores: ver, definir, corrigir e desactivar (meta, factor de conversão com a fonte) | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| Medições: ver as do ano (valor e convertido) e registar ou corrigir o valor de um mês | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| Iniciativas: ver, planear, corrigir (progresso), concluir e cancelar | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| Iniciativas: ver e escolher o responsável ²⁰ | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| **Inteligência artificial** (sempre por botão; cada pedido é pago) | | | | | | | | | | |
| Assistente: leitura dos indicadores do período, previsão de receita e despesa, rascunhos de texto ²¹ | ✓ | ✓ | — | ✓ | ✓ | — | ✓ | — | — | — |
| Ler uma factura de fornecedor (PDF ou imagem) para pré-preencher o registo | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| Configuração: ver o estado e os fornecedores; trocar o activo e o recurso ao outro | ✓ | ✓ | — | — | — | — | — | — | — | — |
| Portal: perguntar ao assistente sobre as próprias facturas e saldo | — | — | — | — | — | — | — | — | — | ✓ |
| **Aprovações** | | | | | | | | | | |
| Ver a caixa (à minha espera, todos, por tipo) e a ficha com passos e decisões | ✓ | ✓ | — | ✓ | ✓ | — | — | — | — | — |
| Decidir: aprovar, rejeitar, pedir esclarecimento ⁵ | ✓ ⁶ | ✓ | — | ✓ | ✓ | — | — | — | — | — |
| Cancelar o próprio pedido | ✓ ⁶ | ✓ | — | ✓ | ✓ | — | — | — | — | — |
| Ver o resumo do pedido e os nomes de quem pediu, aprova e decidiu | ✓ | ✓ | — | ✓ | ✓ | — | — | — | — | — |
| Políticas de aprovação: ver, criar e desactivar | ✓ | ✓ | — | — | — | — | — | — | — | — |
| **Auditoria**: consultar a trilha (quem, o quê, quando), por entidade | ✓ | ✓ | — | — | — | — | — | — | — | — |
| **Alertas** | | | | | | | | | | |
| Ver alertas e regras | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| Resolver alertas; criar, rever e desactivar regras; avaliar agora | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| **Clientes** | | | | | | | | | | |
| Ver a lista (com inactivos) e a ficha, com contactos | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| Portal do cliente na ficha: a conta ligada e o histórico, os documentos partilhados e os comprovativos ¹⁴ | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| Ligar a conta do portal (só contas Cliente por ligar) e desligá-la | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| Partilhar com o cliente um ficheiro carregado na hora; revogar a partilha | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| Ver o e-mail da conta ligada | ✓ | ✓ | — | — | — | — | — | — | — | — |
| **CRM** | | | | | | | | | | |
| Leads: ver (por estado) e a ficha, com as actividades | ✓ | ✓ | — | — | ✓ | — | ✓ | — | — | — |
| Leads: registar, corrigir, marcar contactado e qualificado, desqualificar com o motivo | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| Converter um lead em cliente (novo ou já registado) e, se quiser, numa oportunidade | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| Oportunidades: quadro por etapa (com totais) e lista (todas as etapas), ficha com o histórico das etapas | ✓ | ✓ | — | — | ✓ | — | ✓ | — | — | — |
| Oportunidades: registar, corrigir, mudar de etapa, ganhar (só com cliente) e perder com o motivo | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| Actividades (reuniões, chamadas, e-mails, tarefas, notas): ver | ✓ | ✓ | — | — | ✓ | — | ✓ | — | — | — |
| Actividades: registar (no lead ou na oportunidade) e marcar feitas | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| Propostas: ver (por estado), a ficha com linhas, texto, versões, e o PDF | ✓ | ✓ | — | — | ✓ | — | ✓ | — | — | — |
| Propostas: criar (com ou sem modelo), corrigir o rascunho, acrescentar e tirar linhas, marcar como enviada, registar a decisão do cliente | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| Modelos de proposta: ver | ✓ | ✓ | — | — | ✓ | — | ✓ | — | — | — |
| Modelos de proposta: registar, corrigir, desactivar e reactivar | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| Tipos de serviço: ver | ✓ | ✓ | — | — | ✓ | — | ✓ | — | — | — |
| Tipos de serviço: registar, corrigir, desactivar e reactivar | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| Relatório comercial: funil por etapa, previsão por mês, ganhas e perdidas, taxa de ganho, leads por estado, por responsável | ✓ | ✓ | — | — | ✓ | — | ✓ | — | — | — |
| Ver o cliente e o responsável (nomes) de cada lead, oportunidade, actividade e proposta | ✓ | ✓ | — | — | ✓ | — | ✓ | — | — | — |
| Escolher o responsável de um lead, oportunidade ou actividade | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| **Contratos de clientes** | | | | | | | | | | |
| Ver (por estado, tipo e fim próximo), a ficha, os aditamentos e a lista de anexos | ✓ | ✓ | — | ✓ | ✓ | — | ✓ | — | — | — |
| Registar, corrigir, activar, suspender, renovar, aditar (valor e/ou fim) e terminar com o motivo | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| Anexar um ficheiro carregado na hora | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| Abrir os anexos (descarregados pelo contrato) | ✓ | ✓ | — | ✓ | ✓ | — | ✓ | — | — | — |
| **Cobranças** | | | | | | | | | | |
| Ver as facturas vencidas (por atraso) e o histórico das acções de cobrança | ✓ | ✓ | — | ✓ | — | — | ✓ | — | — | — |
| Registar uma acção (chamada, e-mail, carta, visita, promessa de pagamento, escalamento), sobre o cliente ou uma factura vencida | ✓ | ✓ | — | ✓ | — | — | ✓ | — | — | — |
| **Ficha do cliente › Comercial**: oportunidades, propostas, contratos e acções de cobrança do cliente ¹⁵ | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| **Projectos** | | | | | | | | | | |
| Ver os projectos (activos e fechados), o progresso, o orçamento, os marcos com os comentários, as tarefas, o quadro, o Gantt e as dependências | ✓ | ✓ | — | — | — | — | — | ✓ | — | — |
| Abrir e fechar projectos; definir e rever o orçamento | ✓ | ✓ | — | — | — | — | — | ✓ | — | — |
| Marcos: criar, marcar alcançado, comentar (o cliente vê, se o projecto lhe for visível) | ✓ | ✓ | — | — | — | — | — | ✓ | — | — |
| Tarefas: criar, planear (datas, horas, prioridade, progresso), mover no quadro, concluir, cancelar, dependências | ✓ | ✓ | — | — | — | — | — | ✓ | — | — |
| Atribuir tarefas e ver a quem estão atribuídas ¹⁶ | ✓ | ✓ | — | — | — | — | — | ✓ | — | — |
| Tarefas: comentários e checklist (juntar, marcar, tirar passos) | ✓ | ✓ | — | — | — | — | — | ✓ | — | — |
| Tempo: ver os registos e os totais (por projecto e no registo de tempo global) | ✓ | ✓ | — | — | — | — | — | ✓ | — | — |
| Tempo: registar e apagar; ver por colaborador ¹⁶ | ✓ | ✓ | — | — | — | — | — | ✓ | — | — |
| Orçamento por linhas: ver, juntar, corrigir e apagar linhas (previsto, gasto, desvio) | ✓ | ✓ | — | — | — | — | — | ✓ | — | — |
| Ficheiros do projecto: ver, juntar, abrir e retirar ¹⁷ | ✓ | ✓ | — | — | — | — | — | ✓ | — | — |
| Recursos (colaboradores e viaturas): ver; alocar e terminar ¹⁶ | ✓ | ✓ | — | — | — | — | — | ✓ | — | — |
| Ligar o projecto a um cliente ¹⁶ e mostrá-lo ou escondê-lo no portal | ✓ | ✓ | — | — | — | — | — | ✓ | — | — |
| Portal: ver os projectos que a empresa mostra, o progresso e os marcos; comentar um marco | — | — | — | — | — | — | — | — | — | ✓ |
| **Comprovativos de pagamento** (enviados no portal) | | | | | | | | | | |
| Ver a fila (cliente, factura, valor, datas, nota do cliente, estado) e descarregar o ficheiro | ✓ | ✓ | — | ✓ | — | — | ✓ | — | — | — |
| Confirmar (regista o recibo) e rejeitar com o motivo | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| **Apoio ao cliente** | | | | | | | | | | |
| Conversas e pedidos de suporte: ver (abertas, fechadas, por tipo) | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| Responder ao cliente e fechar | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| Base de conhecimento: ver todos os artigos (rascunhos, publicados, arquivados), com visualizações e votos | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| Escrever, corrigir, publicar e arquivar artigos | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| **Arquivo de documentos** | | | | | | | | | | |
| Ver todos os ficheiros carregados (por categoria e período) e descarregar | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| Ver quem carregou cada ficheiro | ✓ | ✓ | — | — | — | — | — | — | — | — |
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
| **Fornecedores** | | | | | | | | | | |
| Ver a lista (com inactivos) e a ficha | ✓ | ✓ | — | ✓ | ✓ | ✓ | — | — | — | — |
| Registar, importar CSV, corrigir (IBAN verificado), desactivar e reactivar | ✓ | ✓ | — | — | — | — | — | — | — | — |
| **Facturas de compra** | | | | | | | | | | |
| Ver a lista (vencem até) e a ficha, com o confronto com a encomenda | ✓ | ✓ | — | ✓ | ✓ | — | — | — | — | — |
| Registar | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| Anular | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| **Compras** | | | | | | | | | | |
| Ver as requisições (quem pediu, departamento, linhas, total estimado, estado) | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| Abrir requisição, submeter para aprovação, ver a decisão, cancelar com motivo ¹³ | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| Emitir ordem de compra a partir da requisição aprovada | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| Ver as ordens de compra (encomendado, recebido, o que falta) | ✓ | ✓ | — | ✓ | ✓ | ✓ | — | — | — | — |
| Cancelar ordem de compra (com motivo, sem mercadoria recebida) | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| Ver as recepções (quem recebeu) | ✓ | ✓ | — | ✓ | ✓ | ✓ | — | — | — | — |
| Registar recepção (sem passar o que falta) e anular com motivo ¹³ | ✓ | ✓ | — | — | — | ✓ | — | — | — | — |
| **Inventário** | | | | | | | | | | |
| Artigos: em mão, custo médio e valor; por armazém e movimentos | ✓ | ✓ | — | — | — | ✓ | — | — | — | — |
| Registar artigo; activar e desactivar | ✓ | ✓ | — | — | — | ✓ | — | — | — | — |
| Movimentar: entrada com custo, saída, ajuste com motivo, transferência (sem deixar um armazém negativo) | ✓ | ✓ | — | — | — | ✓ | — | — | — | — |
| Armazéns: ver, registar, activar e desactivar | ✓ | ✓ | — | — | — | ✓ | — | — | — | — |
| Contagens: abrir, contar artigos, fechar (com divergências pode ir a aprovação), ver a decisão, cancelar | ✓ | ✓ | — | — | — | ✓ | — | — | — | — |
| Valorização do stock por período | ✓ | ✓ | — | — | — | ✓ | — | — | — | — |
| **Activos fixos** | | | | | | | | | | |
| Ver os activos (custo, amortizado, valor líquido), o plano de amortização, a manutenção, a custódia e os seguros | ✓ | ✓ | — | ✓ | — | ✓ | — | — | — | — |
| Registar e corrigir (antes da primeira amortização); abater | ✓ | ✓ | — | ✓ | — | ✓ | — | — | — | — |
| Correr a amortização de um mês | ✓ | ✓ | — | ✓ | — | ✓ | — | — | — | — |
| Manutenção: agendar, concluir, cancelar | ✓ | ✓ | — | ✓ | — | ✓ | — | — | — | — |
| Custódia: entregar a um colaborador e registar a devolução | ✓ | ✓ | — | ✓ | — | ✓ | — | — | — | — |
| Seguros: registar, corrigir, cancelar; a caducar em 30, 60 ou 90 dias | ✓ | ✓ | — | ✓ | — | ✓ | — | — | — | — |
| **Frota** | | | | | | | | | | |
| Ver as viaturas (activas e inactivas), o estado, quem tem cada uma e a próxima manutenção; a ficha com quilómetros e custos | ✓ | ✓ | — | — | — | ✓ | — | — | — | — |
| Registar e desactivar viaturas | ✓ | ✓ | — | — | — | ✓ | — | — | — | — |
| Manutenção: abrir e fechar (com custo); planos preventivos — agendar, concluir um ciclo, cancelar; manutenção prevista em toda a frota | ✓ | ✓ | — | — | — | ✓ | — | — | — | — |
| Atribuições: atribuir a um colaborador e terminar; ver quem teve a viatura ¹⁸ | ✓ | ✓ | — | — | — | ✓ | — | — | — | — |
| Viagens (motorista ¹⁸, odómetro, motivo) e despesas (combustível, portagens, estacionamento): registar e ver os totais | ✓ | ✓ | — | — | — | ✓ | — | — | — | — |
| Documentos da viatura: ver, juntar, abrir e retirar ¹⁹ | ✓ | ✓ | — | — | — | ✓ | — | — | — | — |
| Seguros de frota: contratar, corrigir, anular; a caducar em 30, 60 ou 90 dias; sinistros — abrir, pagar, recusar | ✓ | ✓ | — | — | — | ✓ | — | — | — | — |
| **Pedidos de pagamento** | | | | | | | | | | |
| Ver a lista e a ficha, com o estado da aprovação e a lista de anexos | ✓ | ✓ | — | ✓ | ✓ | — | — | — | — | — |
| Pedir pagamento a partir da factura (vai para aprovação) e cancelar ⁷ | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| Anexar documentos ao pedido (carregar ficheiro) | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| Executar o pagamento ⁷ ⁸ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Abrir os anexos (pelo pedido) | ✓ | ✓ | — | ✓ | ✓ | — | — | — | — | — |
| **Despesas** | | | | | | | | | | |
| Ver a lista, o resumo por moeda e a ficha | ✓ | ✓ | — | ✓ | ✓ | — | — | — | — | — |
| Registar em nome de um colaborador, com comprovativo | ✓ | ✓ | — | ✓ ⁷ | — | — | — | — | — | — |
| Aprovar e rejeitar (com motivo) ⁹ | ✓ | ✓ | — | ✓ | ✓ | — | — | — | — | — |
| Marcar reembolsada | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Abrir o comprovativo (pela despesa) | ✓ | ✓ | — | ✓ | ✓ | — | — | — | — | — |
| Portal: submeter com comprovativo, acompanhar e retirar | — | — | — | — | — | — | — | — | ✓ ¹ | — |
| **Portal do colaborador** (o próprio, pela conta) ¹¹ | | | | | | | | | | |
| Início: férias por gozar, próximo turno, pedidos em aberto e anúncios recentes | — | — | — | — | — | — | — | — | ✓ ¹ | — |
| Anúncios em vigor, os fixados primeiro | — | — | — | — | — | — | — | — | ✓ ¹ | — |
| Assiduidade: marcações por período; justificar uma falta | — | — | — | — | — | — | — | — | ✓ ¹ | — |
| Férias e ausências: saldo por ano; pedidos e o estado; pedir (vai a aprovação); retirar um pedido por decidir | — | — | — | — | — | — | — | — | ✓ ¹ | — |
| Turnos: escala por período (até 93 dias); pedir para sair de um turno; cancelar o pedido | — | — | — | — | — | — | — | — | ✓ ¹ | — |
| Recibos de vencimento: ver os meses e descarregar o PDF | — | — | — | — | — | — | — | — | ✓ ¹ | — |
| Documentos da ficha: ver e descarregar | — | — | — | — | — | — | — | — | ✓ ¹ | — |
| Declarações: emitir em PDF (fica registada, com código de verificação) | — | — | — | — | — | — | — | — | ✓ ¹ | — |
| Pedidos internos: abrir, acompanhar a conversa e responder | — | — | — | — | — | — | — | — | ✓ ¹ | — |
| Formação: acções, horas, nota e certificado | — | — | — | — | — | — | — | — | ✓ ¹ | — |
| Objectivos: progresso e resultados-chave; registar o valor actual (ciclo aberto) | — | — | — | — | — | — | — | — | ✓ ¹ | — |
| Conquistas recebidas e pontos | — | — | — | — | — | — | — | — | ✓ ¹ | — |
| Bens da empresa à guarda | — | — | — | — | — | — | — | — | ✓ ¹ | — |
| **Tesouraria** | | | | | | | | | | |
| Contas bancárias: ver saldos e extracto por período | ✓ | ✓ | — | ✓ | ✓ | — | — | — | — | — |
| Contas bancárias: abrir, depositar, levantar, fechar (com saldo zero) e reabrir | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| Reconciliação: ver; importar o extracto CSV, conciliar automático e à mão, desfazer, ignorar | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Câmbios: ver, converter e registar taxas | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Caixa pequena: ver fundos e movimentos; abrir e rever fundos; despesa, reposição e ajuste | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Letras e livranças: ver; registar; aceite, desconto, endosso, pagamento, protesto, anulação | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Fluxo de caixa: previsto e realizado; previsões manuais (criar, rever, apagar) | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| **Relatórios financeiros** | | | | | | | | | | |
| Balancete por ano e período, com o equilíbrio | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Balanço e demonstração de resultados, com as contas sem classe e a diferença à vista | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Antiguidade dos saldos de clientes e de fornecedores, numa data | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| **Impostos** | | | | | | | | | | |
| Resumo do IVA (liquidado, regularizado, dedutível, a entregar) e retenções na fonte | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Descarregar o SAF-T AO de facturação do mês ou do ano ¹⁰ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| **Contabilidade** | | | | | | | | | | |
| Ver lançamentos, diários, plano de contas, versões do plano, períodos e regras | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Abrir diários e contas; lançar em partida dobrada; estornar com motivo | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Abrir períodos; criar, rever e apagar classes de reporte | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Fechar e reabrir períodos; versões do plano; regras de lançamento e contabilísticas | ✓ | ✓ | — | — | — | — | — | — | — | — |
| **Planeamento** | | | | | | | | | | |
| Ver centros de custo, orçamentos (com os meses, quem aprovou) e previsões de custos, com os nomes | ✓ | ✓ | — | ✓ | ✓ | — | — | — | — | — |
| Abrir centros de custo e registar previsões de custos | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| Rever e submeter previsões guardadas em rascunho | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| Criar e rever orçamentos (rascunho) | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| Aprovar orçamentos | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
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
| **Ficha do colaborador** (separadores conforme as permissões) | | | | | | | | | | |
| Dados pessoais e imigração: só a pedido, números mascarados com «Mostrar» | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| Corrigir dados pessoais (IBAN validado) e imigração | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| Documentos da ficha: ver, anexar e retirar com motivo; descarregar | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| **Organograma:** departamentos, responsável e pessoas com o cargo | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| **Contratos:** ver; celebrar (o tipo manda na data de fim) e cessar | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| **Assiduidade:** marcações por período e colaborador, só anomalias; marcar ponto e registar falta | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| **Férias e ausências:** pedidos; pedir em nome, retirar, ver a decisão; saldos e direito por ano | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| **Benefícios:** catálogo (criar), adesões (aderir, cancelar) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| **Validades de imigração:** documentos a caducar em 30 ou 90 dias, ou todos | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| **Recrutamento:** vagas (abrir, fechar) e candidatos de cada vaga | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| Registar candidatos; avançar no funil um passo de cada vez; rejeitar | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| Contratar da proposta (cria a ficha, sem conta) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| **Entradas e saídas:** processos com tarefas; iniciar (com as tarefas); marcar tarefas feitas; concluir | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| **Anúncios:** todos (agendados, em vigor, expirados, arquivados); publicar, corrigir e arquivar | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| **Pedidos internos:** fila com filtros e prazos fora; abrir em nome de um colaborador | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| Pedido: conversa, responder, atribuir, mudar o estado (fechar com confirmação) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| Prazos de resposta e resolução por categoria (SLA): ver e definir | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| **Formação:** formações (planear, corrigir, cancelar); inscrever; concluir com avaliação e certificado; cancelar inscrição | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| **Turnos:** escala por período (escalar, tirar); decidir pedidos de troca; tipos de turno (criar, corrigir, desactivar) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| **Declarações:** emitir em nome de um colaborador (regista e descarrega o PDF); emitidas; verificar um código | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| Modelos de declaração (criar, corrigir, desactivar; marcadores validados) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| **Desempenho:** ciclos (planear, corrigir, iniciar, fechar); objectivos, resultados-chave e valor actual | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| **Conquistas:** catálogo (criar, corrigir, desactivar); classificação; atribuir a um colaborador | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| Ficha: separadores Conquistas e Declarações | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| **Importar colaboradores** de um CSV (resumo por linha) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| **Salários** | | | | | | | | | | |
| Folhas de pagamento: lista com os totais; ver uma folha (bruto, IRT, INSS e líquido por colaborador) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| Abrir a folha de um mês ¹² | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| Juntar colaboradores à folha em rascunho (bruto e subsídios; o servidor calcula o IRT, o INSS e o líquido); tirar um colaborador; anular o rascunho | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| Submeter para aprovação; ver a decisão | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| Recibos de uma folha aprovada: ver, descarregar e anexar | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
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
| **Fiscal** | | | | | | | | | | |
| Ver taxas (IVA, INSS), tabela de IRT e isenções dos subsídios; simular taxa e IRT | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Abrir pautas; registar e fechar versões de taxas, de IRT e de isenções | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |

¹ Só se a conta estiver ligada a uma ficha de colaborador; sem ficha, o portal
diz «A sua conta ainda não está ligada a uma ficha de colaborador. Fale com os
Recursos Humanos.»
² Só se a conta estiver associada a um cliente; sem associação, o portal diz
«Esta conta não está associada a um cliente. Fale com a empresa.»
³ Excepto em contas SuperAdmin, que só um SuperAdmin gere.
⁴ A Sales não lê as taxas de IVA: vê o IVA e o total previstos pelo servidor depois de guardar o rascunho; o Admin vê-os ao escrever.
⁵ Só quem tem ficha de colaborador ligada à conta e ocupa o cargo do passo em curso; quem pediu nunca decide (BR-2) e quem já interveio não decide outra vez (BR-4).
⁶ O SuperAdmin só decide se a conta estiver ligada a uma ficha de colaborador.
⁷ Só com ficha de colaborador ligada à conta: o registo fica em nome de quem o faz. O Finance não lê colaboradores, por isso regista despesas só em seu nome.
⁸ Só depois de aprovado (BR-5), e nunca por quem pediu nem por quem aprovou (BR-3); o servidor confirma com 403. O dinheiro sai de uma conta aberta na moeda do pedido.
⁹ A própria despesa não se decide.
¹⁰ Hoje o servidor recusa com o motivo: falta configurar o NIF do produtor do software em produção (B24).
¹¹ Qualquer conta ligada a uma ficha de colaborador usa o portal (os perfis de gestão entram por «O meu portal»); sem ficha, o portal explica-o.
¹² Só com a conta ligada a uma ficha de colaborador: quem abre a folha fica registado.
¹³ Só com a conta ligada a uma ficha de colaborador: quem requisita ou recebe fica registado.
¹⁴ Os comprovativos só para quem lê os recibos (Admin, Finance, Sales); decidir só para quem os regista (Admin, Finance).
¹⁵ Cada bloco para quem o lê; o Finance e o Manager não abrem fichas de clientes.
¹⁶ Os nomes (de quem tem a tarefa, de quem registou o tempo, do recurso alocado e de quem comentou) vêm nas vistas dos projectos; colaboradores, viaturas e clientes activos escolhem-se pela lista dos projectos, sem ler os Recursos Humanos, a frota ou os clientes (B38).
¹⁷ Os ficheiros trazem o nome e abrem-se pelo projecto, sem acesso ao arquivo; junta-se um ficheiro carregado na hora por quem o junta (B39).
¹⁸ Os nomes de quem tem a viatura e de quem conduziu vêm na ficha; os colaboradores activos escolhem-se pela lista da frota, sem ler os Recursos Humanos (B40).
¹⁹ Os documentos abrem-se pela viatura, sem acesso ao arquivo; junta-se um ficheiro carregado na hora por quem o junta (B40).
²⁰ O nome do responsável vem na iniciativa; os colaboradores activos escolhem-se pela lista do ESG, sem ler os Recursos Humanos (B41).
²¹ A leitura usa só as áreas que a conta lê (finanças, RH, vendas); a previsão exige ler receita e despesa (o Sales não a obtém: 403).

---

## 3. Funcionalidades comuns a todas as contas

### Acesso
- **Entrar** com e-mail e password. Credenciais erradas mostram «E-mail ou
  password incorrectos.», sem dizer qual dos dois falhou.
  A password pode mostrar-se e esconder-se. Não há registo nem conta de
  demonstração: o acesso é dado por convite. Os ecrãs públicos (entrar,
  convite, recuperação) têm o tema da marca: painel escuro com «Your
  Business. Under Control.» em ecrãs largos e o formulário ao lado.
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
- Uma tabela mais larga que o ecrã recebe foco e desliza pelo teclado; um
  formulário mais alto que o ecrã desliza dentro da janela, com o botão de
  confirmar sempre alcançável.
- Os separadores de uma página (por exemplo Balancete, Balanço, Resultados)
  ficam no endereço e guardam o ano e o período ao mudar de separador.

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
- Atalhos para as páginas que o perfil abre: nova factura, recibos, despesas,
  colaboradores, salários.
- Resumo pessoal: notificações por ler, aprovações à espera, anúncios em vigor.
- **O seu ecossistema Rivo:** os sete módulos (Finanças, RH, Comercial,
  Projectos, Inventário, Frota, ESG), com ligação nos que o perfil abre e
  cadeado nos outros.
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
- **Actividade recente** (as 5 facturas mais recentes, para quem lê a
  facturação), **Insights IA** (leva ao assistente; nenhum pedido pago sai do
  painel) e **Top 5 clientes** do período (para quem lê as finanças).
- Os outros perfis de gestão vêem o mesmo painel, só com os atalhos, módulos,
  secções e cartões que as suas permissões abrem.

**Dashboard executivo**
- Receita, despesa, resultado, a receber e a pagar do período; evolução mensal;
  os clientes que mais facturaram.

**Analytics**
- Período (por omissão, do início do ano a hoje) e moeda, no URL; o fim não
  pode ser antes do início. Três separadores (no URL), cada um pedido só
  quando se abre:
  - **Tendências:** receita e despesa mês a mês (os meses sem movimento a
    zero), com a conclusão no título e a tabela exportável; frota no período
    (despesas, quilómetros, custo de manutenção); inventário (valor do stock
    hoje e valorização no período).
  - **Recursos humanos:** colaboradores activos e inactivos, admissões,
    ausências (injustificadas), pedidos de férias por decidir e pedidos de RH
    em aberto; admissões por mês e colaboradores por departamento; atrasos,
    dias de férias aprovados, horas de formação e contratos em vigor.
  - **Vendas:** oportunidades em aberto, valor em pipeline (e ponderado),
    taxa de sucesso, valor ganho e contratos a terminar em 30 dias; pipeline
    por etapa e ganhas por mês; conversão de leads, actividades em atraso e
    leads por estado.

**ESG**
- Três vistas (no URL):
  - **Relatório:** o ano (este e os quatro anteriores, no URL); pontuação
    global (a % dos indicadores com meta que a cumprem) e por pilar
    (ambiental, social, governação), com as metas cumpridas e as iniciativas
    activas; em cada pilar, cada indicador com o valor do ano (agregado e
    convertido), o do ano anterior, a meta e se a cumpre.
  - **Indicadores:** o catálogo (código, nome, categoria, pilar, unidade e a
    convertida, meta e direcção, activo ou desactivado); **definir** (código
    único em maiúsculas, nome, pilar, categoria, unidade, como conta no ano —
    soma, média ou último mês —, se menos ou mais é melhor, meta anual,
    factor de conversão com a unidade convertida e a fonte) e **corrigir**
    (o código não muda; **desactivar** ou reactivar). **Medições** de cada
    indicador num ano (mês, valor, convertido, fonte, notas) e **registar** o
    valor de um mês (repetir o mês corrige-o); desactivado não recebe.
  - **Iniciativas:** título e descrição, pilar, indicador, responsável ²⁰,
    período, orçamento, progresso e estado (planeada, em curso, concluída,
    cancelada); **planear** e **corrigir** (com progresso acima de 0 passa a
    em curso), **concluir** (100 %) e **cancelar**; encerrada não se altera.

**Assistente de IA**
- Com a IA ligada (o fornecedor e o modelo à vista); desligada, um aviso e
  nenhum botão. Nada se pede ao abrir nem ao mudar um campo: só ao carregar
  no botão, com o aviso de que cada pedido é pago e conta para o limite de 20
  por hora (acima, «Limite de pedidos atingido»). Três vistas:
  - **Leitura do período:** datas e moeda; resumo e observações (área e
    gravidade — informação, atenção, crítico), com as áreas lidas.
  - **Previsão de receita:** 1 a 12 meses e moeda; os meses reais e os
    previstos (receita e despesa), o método, os pressupostos e a confiança.
    É uma estimativa: não entra em cálculos.
  - **Rascunhos:** tipo (proposta, modelo de proposta, modelo de
    declaração, anúncio, e-mail, mensagem de cobrança), o que se pretende e
    o contexto; o texto para rever e **copiar**.

**Aprovações**
- Caixa: **à minha espera** (os pedidos em que é aprovador do passo em curso),
  **todos**, e filtro por tipo (atribuição de cargo, férias, pedido de
  pagamento, requisição de compra, folha de salários, contagem de inventário).
- Ficha: estado, o resumo do pedido (o que se aprova), quem pediu, passos com o modo (basta um ou todos os ocupantes
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

**Inteligência artificial** (configuração)
- O estado (ligadas ou não, quem responde), os fornecedores com o modelo e se
  têm chave no servidor; **trocar o fornecedor activo** (só os com chave) e
  **ligar ou desligar o recurso ao outro** quando o activo falha. Não gasta
  saldo.

**Auditoria**
- Os registos mais recentes da trilha (50, 100 ou 200), primeiro os novos:
  quando, acção, entidade (tipo e id), quem (o e-mail da conta, ou «Sistema»),
  IP e correlação. Só consulta.
- Filtrar por tipo de entidade (com sugestões) e id, no URL; um clique no id
  mostra só os registos dessa entidade; limpar os filtros.

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
- Separador **Comercial** da ficha: as oportunidades, propostas, contratos e
  acções de cobrança do cliente, com ligação a cada um.
- Separador **Portal do cliente** da ficha:
  - **Conta do portal:** o e-mail da conta ligada e desde quando; **ligar**
    uma conta (só as que têm o perfil Cliente e ainda não estão ligadas a
    nenhum cliente; a conta cria-se em Utilizadores) e **desligar** (a conta
    continua activa); histórico das ligações.
  - **Documentos partilhados** (em vigor e revogados): **partilhar** um
    ficheiro carregado na hora (PDF, imagem, documento de escritório ou
    texto), com o título que o cliente vê e a categoria; **revogar** (o cliente
    deixa de o ver; fica no histórico).
  - **Comprovativos** que o cliente enviou, com as mesmas acções da fila.

**Leads**
- Lista paginada, filtro por estado (novo, contactado, qualificado,
  desqualificado, convertido) no URL; nome, empresa, contacto, origem,
  responsável, data.
- **Novo lead:** nome de quem contactar, empresa, e-mail, telefone, origem,
  responsável (da lista de colaboradores activos do comercial), notas.
- Ficha: dados, notas (como texto), responsável (com o nome), actividades;
  **corrigir**, **marcar contactado**, **qualificar**, **desqualificar** com o
  motivo (fica fechado), **converter em cliente**: um cliente novo (NIF,
  morada, cidade, país; fica com o nome da empresa ou do lead, o e-mail, o
  telefone e o lead como pessoa de contacto; um NIF já registado é recusado
  com a indicação de converter para esse cliente) ou um já registado, e, se
  quiser, uma oportunidade (título, valor estimado, moeda).

**Oportunidades**
- **Quadro:** uma coluna por etapa aberta (prospecção, qualificação,
  proposta, negociação), com o número e os totais por moeda (valor e
  ponderado); em cada cartão o cliente ou o lead, o valor, a probabilidade,
  o fecho previsto e **mover para** outra etapa.
- **Lista:** todas as etapas, ganhas e perdidas incluídas, filtro por etapa
  no URL, paginada pelo servidor (pela ordem do quadro), com os totais da
  página.
- **Nova oportunidade:** de um cliente activo ou de um lead em aberto;
  título, valor, moeda, probabilidade (vazia fica 10%), fecho previsto,
  responsável, notas.
- Ficha: dados, histórico das etapas (com os dias em cada uma), actividades;
  **mudar de etapa**, **corrigir** (a probabilidade é obrigatória),
  **marcar como ganha** (só com cliente; de um lead, diz para converter
  primeiro), **marcar como perdida** com o motivo.

**Propostas**
- Lista (mais recentes primeiro), filtro por estado (rascunho, enviada,
  aceite, recusada) no URL: título, número, para quem (cliente ou lead),
  data, validade, total, estado.
- **Nova proposta** (rascunho): título, para um cliente ou um lead,
  oportunidade aberta desse cliente ou lead (opcional), moeda (não muda
  depois), validade, modelo (o texto vem do modelo com o cliente, o título,
  a validade e a data preenchidos), texto, notas (saem no PDF).
- Ficha: linhas (descrição, quantidade, preço, desconto, total) e o total,
  texto (como texto), para quem, oportunidade, validade, notas, **PDF**
  (composto na hora) e as **versões** guardadas em cada correcção e em cada
  envio (com as linhas de cada uma).
- No rascunho: **corrigir** (título, validade, texto, notas), **acrescentar
  linha** (um serviço do catálogo na moeda da proposta — vazios a descrição
  e o preço, ficam os do serviço — ou uma linha livre; o total da linha
  aparece antes de gravar), **tirar linha**, **marcar como enviada** (exige
  linhas). Enviada: **cliente aceitou** ou **cliente recusou**, com notas.
- Na ficha da oportunidade, as propostas ligadas a ela.

**Modelos de proposta**
- Lista (activos e inactivos); **novo** e **corrigir** (nome, texto com os
  marcadores {{cliente}}, {{titulo}}, {{validade}} e {{data}}; desactivar e
  reactivar).

**Actividades**
- Todas as actividades do CRM, por fazer (por omissão), feitas ou todas, no
  URL, paginadas (as mais recentes primeiro); tipo, assunto, responsável,
  notas, a que se referem (lead, oportunidade ou cliente, com ligação),
  quando, estado (por fazer, atrasada, feita); **marcar feita**. Registam-se
  no lead ou na oportunidade: tipo, quando (hora de Luanda), assunto,
  responsável, notas, já feita.

**Relatório comercial**
- Período (do início do ano a hoje, por omissão) e moeda no URL: ganhas e
  perdidas no período (e o valor ganho), taxa de ganho, conversão de leads,
  actividades por fazer e atrasadas; funil aberto por etapa (número, valor,
  ponderado), previsão por mês de fecho, leads do período por estado e
  desempenho por responsável.

**Tipos de serviço**
- Catálogo (código, nome, descrição, preço, estado); **registar** (código
  único) e **corrigir** (o código não muda; desactivar e reactivar).

**Contratos de clientes**
- Lista pelo fim (os que acabam primeiro à frente), com estado, tipo e «acabam
  em 30, 60 ou 90 dias» no URL: título, referência, tipo, cliente, início,
  fim (com os dias que faltam quando acaba em 30 dias, ou há quanto acabou),
  valor, estado.
- **Novo contrato** (rascunho): referência única, cliente, título, tipo
  (comercial ou jurídico), início, fim, aviso de renovação (dias), valor e
  moeda, SLA de resposta e de resolução (horas), renovação automática,
  notas.
- Ficha: dados (notas como texto), **activar** (rascunho ou suspenso),
  **suspender**, **renovar** (o novo fim tem de estender o actual),
  **corrigir**, **terminar** com a data e o motivo (não volta atrás);
  **aditamentos** numerados (descrição, data de efeito, variação do valor —
  negativa para reduzir, sem deixar o valor negativo — e/ou novo fim; o
  contrato fica com os valores novos); **anexos** (categoria e data; anexar
  um ficheiro carregado na hora; abrir, com o nome do ficheiro).

**Cobranças**
- **Facturas vencidas**, das mais atrasadas para as menos: factura, cliente,
  vencimento, dias de atraso, em aberto; **registar acção** em cada uma.
- **Acções**: paginadas, as mais recentes primeiro; tipo, o que foi feito
  (como texto), responsável, cliente e factura, quando, promessa (valor na
  moeda da factura e data), próximo contacto.
- **Registar acção**: cliente (qualquer cliente activo) e factura vencida
  (opcional), tipo, quando (hora de Luanda), o que foi feito ou combinado,
  valor e data prometidos (obrigatórios numa promessa de pagamento), próximo
  contacto, responsável.

**Projectos**
- Lista por nome, paginada, com ou sem os fechados (no URL): período,
  barra de progresso (tarefas feitas sobre as não canceladas), tarefas
  feitas, orçamento, estado.
- **Novo projecto:** nome e início.
- Ficha com quatro vistas (no URL):
  - **Resumo:** progresso, tarefas feitas, marcos alcançados, orçamento
    aprovado, visível ao cliente; **definir ou rever o orçamento** (a moeda
    não muda numa revisão), **fechar** com a data (não volta atrás); marcos
    (data alvo, alcançado, comentários da equipa e do cliente, sempre como
    texto) — **novo marco** (não antes do início do projecto), **marcar
    alcançado** com a data, **comentar** assinando com o nome (por omissão,
    o da conta; vazio, «Equipa»).
  - **Tarefas:** título, descrição, etapa ou estado, prioridade, a quem está
    atribuída, prazo, progresso e horas; **nova tarefa** (título, prazo,
    atribuição), **planear** (título, descrição, início, prazo, horas
    estimadas, prioridade, progresso; datas não antes do início do projecto,
    prazo não antes do início da tarefa), **atribuir**, **concluir**,
    **cancelar**, **depende de** (juntar e tirar; informativo, sem ciclos).
  - **Quadro:** colunas por planear, a fazer, em curso, em revisão e feita;
    cada cartão com a prioridade, o prazo, o progresso, as horas registadas,
    os comentários e a quem está atribuído; **mover para** outra coluna
    (feita conclui).
  - **Gantt:** cada tarefa com as datas, o progresso, as horas registadas e
    estimadas e as dependências (em texto, com a barra como reforço), e os
    marcos no tempo.
  - **Tempo:** horas registadas, facturáveis e por colaborador; os registos
    (dia, colaborador, tarefa, descrição, horas, facturável); **registar**
    (colaborador, tarefa, dia não futuro, horas até 24 por dia, descrição,
    facturável) e **apagar**.
  - **Orçamento:** aprovado, previsto nas linhas, gasto e desvio, com aviso
    quando o previsto passa o aprovado; **linhas** (categoria, descrição,
    previsto, gasto) — juntar, corrigir, apagar.
  - **Ficheiros:** os ficheiros juntos (categoria, nome, tarefa, data);
    **juntar** um ficheiro carregado na hora (categoria, tarefa), **abrir**
    pelo projecto (sempre em anexo) e **retirar** com o motivo (fica no
    registo).
  - **Recursos:** colaboradores e viaturas alocados (desde, até); **alocar**
    (não antes do início do projecto; o mesmo recurso uma vez em aberto) e
    **terminar** com a data.
  - **Cliente:** o cliente ligado e se o projecto aparece no portal;
    **ligar a um cliente** e **mostrar ou esconder no portal do cliente**.
- Na lista de tarefas, cada tarefa tem **comentários** (lista e novo, com o
  autor para quem lê as contas) e **checklist** (passos, feitos, juntar,
  marcar e tirar).
- **Registo de tempo:** as horas de todos os projectos num período (por
  omissão, o mês corrente; no URL): totais, por projecto, por colaborador e
  os registos, com ligação ao projecto.

**Comprovativos**
- Fila dos comprovativos enviados no portal do cliente, por omissão os **por
  confirmar** (também confirmados, rejeitados ou todos; o estado fica no
  URL): cliente (ligação à ficha), factura (ligação), data do pagamento, data
  do envio, valor pago (com a moeda da factura), estado, motivo da rejeição e a
  nota do cliente (sempre como texto).
- **Descarregar** o ficheiro do comprovativo (sempre em anexo).
- **Confirmar**: regista um recibo por transferência bancária na data do
  pagamento e mostra a ligação para ele; o servidor recusa um pedido que já
  não está por confirmar e diz porque o recibo falhou (por exemplo, série em
  falta), deixando-o por confirmar.
- **Rejeitar** com o motivo (até 500 caracteres), que o cliente vê no portal.

**Conversas**
- Mensagens e pedidos de suporte abertos pelos clientes: por omissão as
  abertas (também fechadas ou todas), por tipo; cliente, assunto, data,
  número de mensagens, estado; paginadas, com os filtros no URL.
- Conversa: as mensagens (as do cliente sempre como texto), **responder**
  (até 4000 caracteres; o cliente vê «Equipa») e **fechar** (num pedido, o
  cliente passa a poder avaliar; numa conversa, se voltar a escrever, abre-se
  outra).

**Base de conhecimento**
- Todos os artigos (rascunhos, publicados, arquivados), com pesquisa, estado e
  categoria no URL; categoria, quem vê (clientes, clientes e equipa, só a
  equipa), visualizações, votos «foi útil» e data de publicação.
- **Novo artigo** (fica em rascunho): título (até 200), categoria, quem vê,
  endereço no portal (gera-se do título se ficar vazio; único) e texto simples
  (até 20 000, com as quebras de linha).
- Artigo: o texto como o cliente o vê, o endereço no portal, visualizações e
  votos; **corrigir** (publicado, a alteração aparece logo no portal),
  **publicar** e **arquivar** (arquivado não se corrige nem volta a
  publicar). Abrir um artigo aqui não conta visualização.

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

**Requisições**
- Lista por estado (rascunho, por aprovar, aprovada, recusada, cancelada), com
  quem pediu, as linhas e o total estimado.
- **Abrir** uma requisição em seu nome (justificação, departamento, moeda e
  linhas com descrição, quantidade até 4 casas e preço estimado — zero é «por
  cotar»; total estimado ao escrever); **submeter** para aprovação; **ver a
  decisão** tomada em Aprovações; **cancelar** com motivo (só em rascunho ou
  por aprovar).
- Aprovada: as ordens de compra já emitidas e **emitir uma ordem**
  (fornecedor activo, datas de emissão e de entrega esperada, linhas vindas da
  requisição com os preços a acordar), sem passar o valor aprovado descontado
  o já encomendado.

**Ordens de compra**
- Lista com o fornecedor, as linhas, as datas, o total e o estado (emitida,
  recebida, cancelada).
- **Ordem:** por linha, o encomendado, o recebido, o que falta, o preço e o
  total; as recepções; **registar uma recepção** (data, guia de remessa e a
  quantidade que chegou por linha, sem passar o que falta); **anular** uma
  recepção com motivo; **cancelar** a ordem com motivo (só sem mercadoria
  recebida).

**Recepções**
- Lista de tudo o que chegou: data, quem recebeu, guia, linhas e estado; leva
  à ordem.

**Artigos**
- Lista com a referência, a quantidade em mão, o custo médio, o valor e o
  estado (os inactivos a pedido); **registar** (referência, nome, unidade).
- **Artigo:** em mão, custo médio e valor; por armazém; os movimentos (data,
  tipo, armazém — e o outro, nas transferências —, quantidade, custo, valor,
  motivo); **movimentar**: entrada (quantidade e custo unitário, até 4 casas;
  recalcula o custo médio), saída, ajuste (variação positiva ou negativa, com
  motivo) e transferência entre armazéns diferentes — nenhum deixa um armazém
  negativo; **activar** e **desactivar** (inactivo não se movimenta nem conta).

**Armazéns**
- Código, nome e estado; **registar**, **activar** e **desactivar**
  (inactivo não recebe movimentos nem contagens).

**Contagens**
- Por armazém, com os artigos contados, as divergências e o estado.
- **Abrir** uma contagem num armazém activo; **contar** um artigo (uma vez
  por contagem; o servidor regista o esperado e a diferença, com o valor);
  **fechar**: sem divergências fecha; com divergências e política que as cubra
  fica por aprovar e o stock só muda depois da decisão; sem política, fecha e
  aplica os ajustes; **ver a decisão**; **cancelar** com motivo.

**Valorização do stock**
- Valor dos movimentos de cada artigo num período (por omissão, o mês
  corrente), com o total.

**Activos fixos**
- **Activos:** por estado (em uso, abatidos) e categoria, com o custo, o
  amortizado e o valor líquido; **registar** (nome, código — vazio gera um —,
  categoria, localização, n.º de série, centro de custo, fornecedor, data de
  aquisição e de início da amortização — vazio é o mês seguinte —, custo,
  residual, moeda, método linear, decrescente com taxa anual ou por unidades
  de produção com o total, vida útil de 1 a 1200 meses); **correr a
  amortização** de um mês (as unidades usadas, nos activos por unidades;
  correr de novo não duplica), com o resultado (registados, já registados,
  total e saltados).
- **Activo:** valores, plano de amortização com cada mês registado ou
  previsto; **corrigir** (só antes da primeira amortização registada);
  **abater** (data depois da aquisição, valor de venda, motivo).
- **Manutenção:** de cada activo e de todos (agendadas, concluídas,
  canceladas); **agendar** (tipo — preventiva, correctiva, inspecção —,
  descrição, data, prestador, custo estimado), **concluir** (data, custo,
  notas), **cancelar**.
- **Custódia:** quem tem o activo e o histórico; **entregar** a um
  colaborador activo (escolhido de uma lista própria dos activos, sem precisar
  dos Recursos Humanos; data, estado, notas; ele vê-o no portal) e **registar
  a devolução** (não antes da entrega, estado, notas).
- **Seguros:** apólices de cada activo e as que caducam em 30, 60 ou 90 dias;
  **registar** e **corrigir** (seguradora, número, cobertura, vigência,
  prémio, capital seguro), **cancelar**.

**Viaturas**
- Lista paginada por matrícula, com ou sem as inactivas (no URL): modelo,
  estado (activa, em manutenção, inactiva), a quem está atribuída e a
  próxima manutenção prevista (com aviso de atraso); **registar** (matrícula,
  em maiúsculas e única, e modelo).
- **Ficha:** estado, a quem está atribuída, quilómetros e viagens, custos
  (despesas e manutenções) e a próxima manutenção; **desactivar** (não se
  desfaz; deixa de receber manutenção, atribuições, planos, viagens e
  despesas, os registos ficam). Vistas no URL:
  - **Manutenção:** registos (tipo, descrição, período, custo); **enviar
    para manutenção** (preventiva ou correctiva, início, descrição; uma de
    cada vez, a viatura fica «em manutenção») e **fechar** (fim não antes do
    início, custo opcional; volta a activa). Planos preventivos (descrição,
    intervalo, próxima data, em atraso, cancelados): **agendar** (descrição,
    intervalo em dias, primeira data), **concluir um ciclo** (reagenda para a
    data mais o intervalo) e **cancelar**.
  - **Atribuições:** quem teve a viatura e quando; **atribuir** a um
    colaborador activo (da lista própria da frota, sem precisar dos Recursos
    Humanos; uma de cada vez) e **terminar** (não antes do início).
  - **Viagens:** total de viagens e de quilómetros; cada viagem (período,
    motorista, odómetro, distância, motivo); **registar** uma viagem feita
    (motorista opcional, datas, odómetro à partida — proposto a partir da
    última chegada — e à chegada, motivo).
  - **Custos:** totais de combustível, portagens, estacionamento e
    manutenções; as despesas (data, categoria, descrição, valor);
    **registar** uma despesa (categoria, valor em AOA, data, descrição).
  - **Documentos:** paginados (categoria, ficheiro, tamanho, data);
    **juntar** um ficheiro carregado na hora com a categoria, **descarregar**
    pela viatura (sempre em anexo) e **retirar** com o motivo (fica no registo).
  - **Seguros:** as apólices da viatura (seguradora, número, cobertura,
    vigência, prémio, capital, estado — por começar, em vigor com os dias que
    faltam, caducada, anulada); **contratar** e **corrigir** (seguradora,
    número, cobertura — vazia, responsabilidade civil —, vigência, prémio,
    moeda, capital seguro, notas), **anular** com a data; **sinistros** de
    cada apólice (data, referência, descrição, reclamado, pago, estado):
    **abrir** (dentro da vigência; descrição, valor reclamado, referência),
    **pagar** (valor pago, proposto o reclamado) e **recusar**.
- **Manutenção prevista:** os planos activos de toda a frota a vencer em 7,
  30, 60 ou 90 dias (no URL), os em atraso incluídos, com ligação à viatura.
- **Seguros de frota:** as apólices de todas as viaturas, ou só as em vigor a
  caducar em 30, 60 ou 90 dias (no URL), com ligação à viatura; corrigir,
  anular e gerir os sinistros como na ficha.

**Fornecedores**
- Lista paginada (nome, NIF, cidade, contacto, estado), com ou sem inactivos.
- **Registar** (nome, NIF, IBAN, e-mail, telefone, pessoa de contacto, morada,
  cidade, país) e **importar de um CSV** (Nome e NIF obrigatórios; IBAN, Email,
  Telefone opcionais), com o resultado linha a linha.
- O IBAN é verificado (ISO 13616) antes de gravar, como no servidor: um IBAN
  errado paga a outra pessoa.
- Ficha: **corrigir os dados** (o NIF não se corrige) e **desactivar e
  reactivar**; se alguém alterou o fornecedor entretanto, oferece «Recarregar».

**Facturas de compra**
- Lista paginada (número, fornecedor, emitida, vence, total, estado), com
  filtro «vencem até».
- **Registar** (fornecedor da lista ou não registado com nome e NIF, número da
  factura do fornecedor, moeda, emissão, vencimento, valor sem IVA, IVA,
  descrição), com o total à vista. Com a IA ligada, **ler a factura com IA**
  (PDF ou imagem até 10 MB, por botão): preenche os campos — e escolhe o
  fornecedor registado com o mesmo NIF —, mostra os avisos e as linhas
  lidas; nada se grava até carregar em registar.
- Ficha: dados e totais, confronto com a encomenda quando a tem, os pedidos de
  pagamento da factura e quanto **falta pedir**; **pedir pagamento** e
  **anular** com motivo.

**Pedidos de pagamento**
- Lista paginada (factura, beneficiário, data, valor, estado).
- **Pedir** a partir da factura (valor até ao que falta pedir, notas): vai
  para aprovação.
- Ficha: beneficiário, valor, quem pediu, o estado da aprovação com ligação ao
  pedido de aprovação, notas e, depois de pago, data, meio e referência.
- **Executar**: só depois de aprovado; escolhe-se uma conta aberta na moeda do
  pedido (com o saldo à vista), o meio de pagamento e a referência; aviso com o
  saldo da conta depois do pagamento. Quem pediu e quem aprovou não vêem o
  botão e a ficha explica porquê (BR-3).
- **Cancelar** com motivo; **anexar** documentos (factura, proposta, contrato)
  e **descarregá-los**.

**Despesas**
- Resumo por moeda (por decidir, aprovadas por reembolsar, reembolsadas,
  rejeitadas) e lista com filtros por estado e datas.
- **Registar** em nome de um colaborador (data, categoria com sugestões,
  descrição, valor, moeda, comprovativo).
- Ficha: **aprovar** (notas opcionais), **rejeitar** (com motivo, que o
  colaborador lê), **marcar reembolsada** (data, conta, referência) e
  **descarregar o comprovativo**. A própria despesa não se decide.

**Contas bancárias**
- Lista com saldos (com ou sem fechadas); **abrir** (nome, banco, moeda, IBAN
  verificado).
- Ficha: saldo, **depositar**, **levantar**, **fechar** (só com saldo zero) e
  **reabrir**; **extracto** por período (saldo inicial, entradas, saídas,
  saldo final, movimentos), com aviso se não bater com o saldo.
- **Reconciliação:** resumo (saldo contabilístico, linhas conciliadas,
  ignoradas e por conciliar, movimentos sem par); **importar o extracto** do
  banco em CSV (ficheiro ou colado) com conciliação automática; **conciliar
  automaticamente**; **conciliar à mão** (os movimentos do mesmo valor primeiro),
  **desfazer** e **ignorar** linhas.

**Caixa pequena**
- Fundos com fundo fixo, saldo e o que falta repor; **abrir** e **rever**
  fundos (responsável, fundo fixo, activo).
- Ficha do fundo: movimentos por período e **registar** despesa, reposição
  (vazia repõe o que falta) ou ajuste de contagem.

**Letras e livranças**
- Lista com filtros por sentido (a receber, a pagar) e estado; as vencidas
  ficam marcadas.
- **Registar** (letra ou livrança, sentido, número, sacado ou tomador, emissão,
  vencimento, valor, moeda, banco, notas).
- Ficha: só as acções que o estado permite: **aceite**, **desconto** (com
  encargos e banco), **endosso**, **pagamento**, **protesto** e **anulação**;
  endossos registados.

**Câmbios**
- Taxas registadas (filtro por moeda), **registar** uma taxa (até 6 casas
  decimais, com a fonte) e **converter** um valor entre moedas numa data.

**Fluxo de caixa**
- **Previsto** até uma data: saldo de hoje, saldo previsto, previsão por mês e
  de onde vem cada movimento (a receber, a pagar, letras, previsões manuais).
- **Realizado** por mês, por período e por conta.
- **Previsões manuais:** criar, rever e apagar (entrada ou saída, data, valor,
  moeda, descrição, categoria, repetição mensal).

**Relatórios financeiros**
- **Balancete** por ano e período (ou ano inteiro): abertura, movimentos e
  saldos devedor e credor por conta, totais e se está equilibrado.
- **Balanço** no fecho do período: activo, passivo e capital próprio por
  rubrica e conta, resultado do exercício; as contas movimentadas **sem classe
  de reporte** e a **diferença** aparecem à parte, com ligação para as
  configurar.
- **Demonstração de resultados**: proveitos e custos por rubrica, resultado
  líquido; num mês, acumulado desde Janeiro ou só o mês.
- **Antiguidade de saldos** de clientes (a receber) ou de fornecedores (a
  pagar) numa data: por vencer, 1–30, 31–60, 61–90 e mais de 90 dias.

**Impostos**
- **IVA** do mês ou do ano: liquidado por taxa, regularizado nas notas de
  crédito, dedutível nas facturas de compra e o valor a entregar ou a
  recuperar, com a nota de que não é a declaração oficial.
- **Retenções na fonte** feitas pelos clientes, por cliente.
- **SAF-T AO** de facturação do mês ou do ano, descarregado em XML, com o aviso
  de que a Rivo não é software certificado. Hoje o servidor recusa por falta de
  configuração (B24) e o ecrã mostra o motivo.

**Lançamentos**
- Lista por diário, ano e período (incluindo os de regularização), com estado.
- **Diários**: ver e **abrir** (código e nome).
- **Novo lançamento**: diário, n.º de arquivo, data, período, tipo (SAF-T) e
  linhas a débito e a crédito com conta, valor, descrição e centro de custo;
  totais e diferença enquanto se escreve; só envia equilibrado e com contas de
  movimento.
- **Ficha**: cabeçalho, transacção SAF-T, linhas e totais; **estornar** com
  motivo (fica marcado, não se apaga).

**Plano de contas**
- **Contas** (categorias do SAF-T AO: 1.º grau, agregadoras e de movimento,
  geral e analítica): procurar, ver as inactivas, **abrir** (com a conta-mãe
  validada como no servidor) e **desactivar**.
- **Versões do plano**: ver e **registar** (nome, versão, fonte, vigência).
- **Classes de reporte** (prefixo → activo, passivo, capital, proveitos ou
  custos, rubrica e ordem): ver, **criar**, **rever** e **apagar**.

**Períodos**
- Por ano: meses 1–12 e regularizações 13–16, com estado, fecho e última
  reabertura; **abrir**, **fechar** (fica registado quem fechou) e **reabrir**
  com motivo.

**Regras contabilísticas**
- **Lançamento automático**: por acontecimento (factura emitida, nota de
  crédito, recibo, retenção, factura de compra, pagamento), as linhas que gera;
  os acontecimentos sem regra dizem que não geram lançamento. **Definir** (só
  regras equilibradas em líquido e imposto) e **desactivar**.
- **Contabilísticas**: registo versionado com tipo de origem e fonte;
  **criar** e **desactivar**.

**Centros de custo**
- Lista com departamento e responsável pelos nomes; **abrir** (código, nome,
  departamento opcional, responsável).

**Orçamentos**
- Por centro de custo e ano, com os tectos mês a mês e o total anual;
  **criar** e **rever** em rascunho; **aprovar** (passa a travar a despesa
  acima do tecto e deixa de se alterar); mostra quem aprovou.

**Previsões de custos**
- Por departamento e ano: custos operacionais, fixos e total por mês;
  **registar** e submeter já, ou guardar em rascunho (uma por departamento e
  mês); em rascunho, **rever** os custos e **submeter** depois.

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
- **Ficha com separadores** (cada um só aparece a quem o pode ler):
  - **Dados pessoais:** nada se pede até «Ver dados pessoais»; NIF, BI,
    segurança social, conta, IBAN, passaporte, visto e autorização aparecem
    mascarados («•••• 4821»), com «Mostrar» por campo, que volta a mascarar ao
    fim de 60 s. **Corrigir** os dados pessoais (género, nascimento,
    nacionalidade, estado civil, NIF, BI e validade, segurança social, morada,
    cidade, país, banco, conta, IBAN validado, contacto de emergência) e a
    **imigração** (nacionalidade, passaporte, país emissor, visto, autorização
    de trabalho, validades, notas), com aviso do documento que caduca primeiro.
  - **Documentos:** ver, **anexar** (carregar o ficheiro com a categoria),
    **descarregar** e **retirar** com motivo; o colaborador vê-os no portal.
  - **Contratos**, **Férias** (saldo e pedidos), **Assiduidade** e
    **Benefícios** do colaborador, com as mesmas acções das páginas próprias.

**Organograma**
- Departamentos com o responsável e as pessoas activas, com o cargo actual.

**Contratos**
- Lista de todos ou de um colaborador (tipo, vigência, salário, estado);
  **celebrar** (sem termo, a termo ou prestação de serviços; os dois últimos
  exigem data de fim; salário mensal e moeda) e **cessar** numa data.

**Assiduidade**
- Marcações de um período (por omissão, os últimos 30 dias), de todos ou de um
  colaborador, só as anomalias (faltas e atrasos); **marcar o ponto**
  (entrada na primeira vez, saída na segunda, à hora do servidor; atraso
  opcional) e **registar uma falta** (com justificação opcional).

**Férias e ausências**
- **Pedidos:** de todos ou de um colaborador; **pedir em nome** do colaborador
  (vai a aprovação); **retirar** um pedido por decidir; **ver a decisão**
  tomada em Aprovações (ou que ainda espera).
- **Saldos** de um ano: direito, transitados, gozados, por decidir e por
  gozar; **definir o direito** de cada pessoa (dias e transitados, de 0 a 366).

**Benefícios**
- **Catálogo:** nome, tipo, valor mensal e estado; **criar** benefício.
- **Adesões:** de todos ou de um colaborador; **aderir** (só a benefícios
  activos) e **cancelar** numa data.

**Validades de imigração**
- Passaportes, vistos e autorizações de trabalho a caducar nos próximos 30 ou
  90 dias (ou todos), com o prazo; os números só na ficha, mascarados.

**Recrutamento**
- Vagas com o departamento, o número de vagas e o estado; **abrir** (título,
  departamento opcional, n.º de vagas, descrição e requisitos) e **fechar**
  (deixa de aceitar candidaturas; quem está no funil continua).
- Em cada vaga, os candidatos com o contacto, a data e a etapa; **registar**
  candidato (nome, e-mail e telefone opcionais, data não futura; só com a vaga
  aberta); **avançar** um passo de cada vez (Candidatura → Triagem →
  Entrevista → Proposta); **rejeitar** em qualquer etapa; **contratar** da
  proposta, com o departamento da vaga por omissão (cria a ficha de
  colaborador, sem conta). O contratado leva à ficha e a **iniciar a entrada**.

**Entradas e saídas**
- Processos de entrada e de saída, filtrados por tipo e por colaborador, com o
  último dia e o motivo (saídas), as tarefas por área (Recursos Humanos,
  Informática, Bens e equipamento, Finanças), o prazo e quantas estão feitas.
- **Iniciar** um processo com as tarefas (pelo menos uma: depois não se juntam
  mais; uma saída exige o último dia); **marcar feita** cada tarefa (a
  primeira põe-no em curso); **concluir** quando todas estiverem feitas.

**Anúncios**
- Todos os anúncios, com a fase (em vigor, agendado, expirado, arquivado), o
  público (todos ou um departamento), fixados primeiro; os arquivados só a
  pedido.
- **Publicar** (título, texto, departamento opcional, fixar no topo, dia de
  publicação — vazio publica já, futuro fica agendado — e dia em que deixa de
  aparecer, depois da publicação); **corrigir** (mantém a hora de publicação
  original se o dia não mudar); **arquivar** (deixa de aparecer no portal; não
  se desfaz).

**Pedidos internos**
- **Fila:** assunto, colaborador, categoria, prioridade, responsável, data e
  estado, com aviso de resposta ou resolução fora do prazo; filtros por estado,
  categoria, colaborador e responsável (no endereço da página).
- **Abrir** um pedido em nome de um colaborador (assunto, categoria,
  prioridade, mensagem); ele acompanha-o no portal.
- **Pedido:** a conversa (colaborador e equipa), os prazos (responder até,
  primeira resposta, resolver até); **responder** (a primeira resposta da
  equipa cumpre o prazo de resposta); **atribuir** a um responsável (põe um
  pedido aberto em curso) ou a ninguém; **mudar o estado** (aberto, em curso,
  resolvido; **fechar** pede confirmação e não se reabre). Fechado, fica só de
  leitura.
- **Prazos (SLA):** por categoria, em horas, para responder e para resolver;
  **definir** (positivos; a resolução não mais curta do que a resposta).

**Formação**
- Formações com a entidade, as datas, as horas, o custo, os inscritos (e a
  lotação), as concluídas e o estado; as canceladas só a pedido.
- **Planear** e **corrigir** (título, entidade, início e fim, horas, custo e
  moeda, lotação, validade do certificado em meses, descrição); **cancelar**
  (deixa de aceitar inscrições; não se desfaz).
- Em cada formação, as inscrições com o estado, a data de conclusão, a
  avaliação e o certificado (n.º e validade); **inscrever** um colaborador
  (recusado se lotada, cancelada ou já inscrito); **concluir** (data, avaliação
  de 0 a 100, n.º do certificado, notas — a validade conta desde a conclusão);
  **cancelar** a inscrição.

**Turnos**
- **Escala** de um período (por omissão os próximos 7 dias; no máximo 94), por
  departamento ou colaborador: dia, pessoa, turno, horário (o da noite acaba no
  dia seguinte) e notas; **escalar** um colaborador num turno de um dia até 94
  (nos dias em que já tinha turno, o novo substitui o anterior, e o ecrã diz
  quantos); **tirar** da escala.
- **Pedidos de troca** (por decidir por omissão, ou por estado): quem pede, o
  motivo e quem fica com o turno; **aprovar** (o turno passa ao colega
  proposto, ou fica livre se não houver) ou **recusar**, com notas.
- **Tipos de turno:** código, nome, horário e estado; **criar** (código único,
  em maiúsculas) e **corrigir** (nome, horas, activo; o código não muda).

**Declarações**
- **Emitir** uma declaração em nome de um colaborador: escolher o modelo e
  confirmar — fica registada com um código de verificação impresso e o PDF
  descarrega-se (não se desfaz).
- **Emitidas:** de todos ou de um colaborador, com a data, quem a pediu (o
  próprio no portal ou os Recursos Humanos) e o código.
- **Modelos:** nome, título impresso, texto com marcadores ({{nome}},
  {{codigo}}, {{cargo}}, {{departamento}}, {{admissao}}, {{salario}},
  {{moeda}}, {{nif}}, {{bi}}, {{data}}; um marcador desconhecido não passa),
  se o próprio a pode pedir no portal e se está activo; **criar** e
  **corrigir**.
- **Verificar um código** impresso (com ou sem hífenes): mostra a declaração,
  o colaborador, a data e quem a pediu.

**Desempenho**
- **Ciclos:** escolher o ciclo (por omissão o que está em curso), com o
  período, o estado, os objectivos e o progresso médio; **planear**,
  **corrigir**, **iniciar** (os colaboradores passam a vê-lo no portal) e
  **fechar** (fica só de leitura; não se reabre).
- **Objectivos** do ciclo, filtrados por colaborador ou departamento: dono,
  peso, progresso e resultados-chave; **definir** (título, dono — colaborador
  ou departamento —, peso de 1 a 100, descrição), **corrigir** e
  **abandonar** (sai da média).
- **Resultados-chave:** **juntar** (título, ponto de partida, meta diferente,
  unidade) e **registar o valor actual** (decimal até 4 casas).

**Conquistas**
- **Catálogo:** nome, descrição, pontos, quantas vezes atribuída e estado;
  **criar** (código único, pontos de 0 a 10 000, ícone) e **corrigir**
  (desactivar deixa de a atribuir).
- **Classificação** por pontos (os 10 primeiros).
- **Atribuir** uma conquista activa a um colaborador, com nota (uma vez por
  pessoa; o servidor recusa repetidas com o motivo).

**Colaboradores**
- **Importar CSV** com cabeçalho (Nome e DataAdmissao obrigatórias,
  Departamento opcional pelo nome exacto; até 5 MB): resumo de importados,
  duplicados e recusados, com o motivo de cada linha.
- Na ficha, os separadores **Conquistas** (as do colaborador, com os pontos;
  atribuir) e **Declarações** (as emitidas; emitir).

**Folhas de pagamento** (salários)
- Folhas por mês, com o número de colaboradores, o bruto, o líquido, o estado
  (rascunho, por aprovar, aprovada, recusada, anulada) e quando fechou.
- **Abrir** a folha de um mês (a conta tem de estar ligada a uma ficha). Uma
  folha por mês: outra só se a anterior foi recusada ou anulada (o ecrã avisa
  e o servidor recusa).
- **Folha:** totais (bruto, IRT retido, INSS do trabalhador, líquido a pagar)
  e, por colaborador, o bruto, os subsídios incluídos, o IRT, o INSS e o
  líquido — **calculados pelo servidor** com a configuração fiscal em vigor no
  fim do mês (o front não calcula impostos).
- Em rascunho: **juntar** um colaborador (bruto e subsídios de alimentação,
  transporte, férias e Natal, que fazem parte do bruto e não o podem passar;
  sugere o salário do contrato em vigor; o mesmo colaborador não entra duas
  vezes), **tirar** um colaborador (para o juntar de novo com outros valores),
  **anular** a folha (o mês fica livre) e **submeter** para aprovação.
- Por aprovar: **ver a decisão** tomada em Aprovações (ou que ainda espera),
  com a ligação ao pedido.
- Aprovada: por colaborador, os **recibos** anexados (descarregar) e
  **anexar** o PDF do recibo; sem anexo, o portal gera-o da folha.
- Recusada ou anulada: não se paga nem se altera; o mês fica livre.

**Departamentos**
- Lista paginada com o responsável; **criar** e **corrigir** (nome e
  responsável).

**Cargos**
- Lista paginada com o nível e a autoridade para aprovar; **criar** (a
  autoridade fixa-se ao criar) e **corrigir** (nome e nível); ver as
  **ocupações** de cada cargo.

**Arquivo de documentos**
- Todos os ficheiros carregados na Rivo (comprovativos, anexos, documentos
  pessoais e partilhados), com a categoria e o período do carregamento no URL;
  nome, tamanho, categoria, data e quem carregou; **descarregar** (sempre em
  anexo). Não se apagam documentos.

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

**Fiscal**
- **Taxas** (IVA e INSS) por pauta, com as versões, a vigência, o estado e o
  instrumento legal; **abrir pauta**, **registar versão** (aviso se se cruza com
  a em vigor) e **fechar** uma versão com a data de fim; ver que taxa se aplica
  a um código numa data.
- **IRT**: escalões de cada tabela, **simular** o imposto de uma matéria
  colectável; **registar** uma tabela nova (parte da em vigor, escalões
  validados como no servidor) e **fechar** a em vigor.
- **Subsídios** de alimentação e de transporte: limiar isento por mês em vigor
  e versões; **registar** e **fechar** versões.
- Avisa que é configuração fiscal de produção.

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
- **Ficha com separadores** como no Admin: dados pessoais e imigração
  (mascarados, corrigir), documentos, contratos, férias, assiduidade e
  benefícios.

**Organograma**, **Contratos**, **Assiduidade**, **Férias e ausências**,
**Benefícios** e **Validades de imigração**
- Tudo o que o Admin faz.

**Recrutamento**, **Entradas e saídas**, **Formação**, **Turnos**,
**Desempenho**, **Conquistas**, **Anúncios**, **Pedidos internos**,
**Declarações** e importação de colaboradores
- Tudo o que o Admin faz.

**Folhas de pagamento**
- Tudo o que o Admin faz (abrir exige a conta ligada a uma ficha).

**Arquivo de documentos**
- Ver, filtrar e descarregar todos os ficheiros, como o Admin, sem a coluna de
  quem carregou (não lê as contas).

**Departamentos**
- Ver, **criar** e **corrigir**.

**Cargos**
- Ver, com ocupações. **Não** cria nem corrige cargos.

### Finance (Finanças)
**Início**
- Resumo pessoal e indicadores de **Finanças**.

**Assistente de IA**
- Como no Admin; a leitura usa só as finanças.

**Aprovações**
- Caixa, ficha, **decidir** e **cancelar** os próprios pedidos, como o Admin,
  com o resumo do pedido e os nomes.

**Alertas**
- Ver alertas e regras.

**Facturas**
- Ver as emitidas, a ficha, o saldo e o **PDF**.
- **Anular**, emitir **notas de crédito** e **registar recebimentos** a partir
  da factura. Não cria facturas, não envia ao cliente e não abre a ficha do
  cliente.

**Notas de crédito**, **Recibos**, **Pró-formas** e **A receber**
- Ver (listas, fichas e PDF); **anular** notas de crédito e recibos.

**Contratos de clientes**
- Ver a lista (com o cliente), a ficha, os aditamentos e **abrir os
  anexos**. Não regista nem muda contratos.

**Cobranças**
- Tudo o que o Admin faz: as vencidas, o histórico e **registar acções**.

**Comprovativos**
- Tudo o que o Admin faz: a fila, **descarregar**, **confirmar** (regista o
  recibo) e **rejeitar** com o motivo. O cliente aparece sem ligação à ficha
  (o Finance não lê clientes).

**Facturação**
- Ver séries, canais de pagamento e taxas de IVA.

**Ordens de compra** e **Recepções**
- Ver as ordens e as recepções, com quem recebeu. Não vê requisições, não
  emite nem cancela ordens e não regista recepções.

**Activos fixos**
- Tudo o que o Admin faz, incluindo entregar um activo a um colaborador.

**Fornecedores**
- Ver a lista e a ficha (não regista nem corrige).

**Facturas de compra**
- Ver a lista e a ficha; **anular**. Não regista facturas nem pede pagamentos.

**Pedidos de pagamento**
- Ver e **executar** os aprovados (BR-3: não executa o que pediu nem o que
  aprovou). **Abre os anexos** pelo pedido, sem ler o arquivo de documentos.

**Despesas**
- Resumo, lista e ficha; **aprovar**, **rejeitar**, **marcar reembolsada** e
  **registar** em seu nome; **abre o comprovativo** pela despesa.

**Contas bancárias**
- Ver saldos e extracto; **reconciliação** completa. Não abre contas nem
  deposita ou levanta.

**Caixa pequena**, **Letras e livranças**, **Câmbios** e **Fluxo de caixa**
- Tudo o que o Admin faz.

**Relatórios financeiros** e **Impostos**
- Tudo o que o Admin faz.

**Lançamentos**, **Plano de contas**, **Períodos** e **Regras contabilísticas**
- Ver tudo; **abrir** diários e contas, **lançar**, **estornar**, **abrir
  períodos** e mexer nas **classes de reporte**. Não fecha nem reabre
  períodos, não regista versões do plano nem define regras.

**Centros de custo**, **Orçamentos** e **Previsões de custos**
- Ver tudo, com os nomes dos departamentos, dos responsáveis e de quem
  aprovou. **Aprova** orçamentos; não os cria nem revê, não abre centros nem
  regista previsões.

**Configurações**
- Só **Dados da empresa**: ver, **declarar** e **corrigir**.

**Fiscal**
- Tudo o que o Admin faz.

### Manager (Gestão)
**Início**
- Resumo pessoal e indicadores de **Finanças** e de **Vendas**.

**Dashboard executivo** e **Analytics**
- Como no Admin.

**ESG**
- Tudo o que o Admin faz, incluindo ver e escolher o responsável das
  iniciativas (sem ler os Recursos Humanos, B41).

**Assistente de IA**
- Como no Admin: leitura do período, previsão e rascunhos. Lê a factura de
  compra com IA ao registá-la.

**Aprovações**
- Caixa, ficha, **decidir** e **cancelar** os próprios pedidos, como o Admin,
  com o resumo do pedido e os nomes.

**Alertas**
- Ver, **resolver**; regras: **criar**, **rever**, **desactivar** e
  **avaliar agora**.

**Leads**, **Oportunidades**, **Propostas**, **Actividades**, **Relatório comercial**, **Tipos de serviço** e **Modelos de proposta**
- Ver tudo como o Admin (quadro, lista, fichas, histórico, relatório, PDF
  das propostas), com os nomes dos clientes e dos responsáveis, sem
  escrever.

**Contratos de clientes**
- Ver a lista (com o cliente), a ficha, os aditamentos e **abrir os
  anexos**.

**Requisições** e **Ordens de compra**
- Tudo o que o Admin faz nas requisições e nas ordens (os nomes e a escolha do
  departamento vêm das compras, sem precisar dos Recursos Humanos).

**Recepções**
- Ver as recepções. Não as regista nem anula.

**Fornecedores**
- Ver a lista e a ficha.

**Facturas de compra**
- Ver, **registar** e **pedir pagamento**; **anexar** documentos ao pedido e
  **cancelá-lo**. Não anula facturas nem executa pagamentos.

**Pedidos de pagamento**
- Ver a lista e a ficha; **abre os anexos** pelo pedido.

**Despesas**
- Resumo, lista e ficha; **aprovar** e **rejeitar** (não as da própria). Não
  regista nem reembolsa; **abre o comprovativo** pela despesa.

**Contas bancárias**
- Ver saldos e extracto; **abrir**, **depositar**, **levantar**, **fechar** e
  **reabrir**. Sem reconciliação.

**Centros de custo**, **Orçamentos** e **Previsões de custos**
- Ver tudo, com os nomes. **Cria** e **revê** orçamentos em rascunho; não os
  aprova. **Abre centros de custo** e **regista previsões**, escolhendo o
  departamento e o responsável das listas do planeamento (sem ler os Recursos
  Humanos); **revê** e **submete** as previsões em rascunho.

### AssetManager (Gestão de activos)
**Início**
- Resumo pessoal (sem indicadores de gestão nesta fase).

**Alertas**
- Ver alertas e regras.

**Ordens de compra** e **Recepções**
- Ver as ordens e as recepções (com quem recebeu); **registar** recepções e
  **anulá-las** com motivo. Não vê requisições, não emite nem cancela ordens.

**Artigos**, **Armazéns**, **Contagens** e **Valorização do stock**
- Tudo o que o Admin faz no inventário.

**Activos fixos**
- Tudo o que o Admin faz, incluindo entregar um activo a um colaborador.

**Viaturas**, **Manutenção prevista** e **Seguros de frota**
- Tudo o que o Admin faz na frota, incluindo atribuir viaturas, indicar o
  motorista (pela lista da frota) e juntar, abrir e retirar documentos (B40).

**Fornecedores**
- Ver a lista e a ficha.

### Sales (Vendas)
**Início**
- Resumo pessoal e indicadores de **Finanças** e de **Vendas**.

**Assistente de IA**
- Leitura do período (as áreas que lê) e rascunhos; a previsão de receita e
  despesa pede ler a despesa, que não tem (403).

**Clientes**
- Tudo o que o Admin faz em Clientes (ver, registar, importar, corrigir,
  desactivar, eliminar sem história, contactos).
- **Portal do cliente** na ficha: ligar e desligar a conta, o histórico,
  partilhar um ficheiro carregado na hora e revogar, os comprovativos do
  cliente (sem os decidir). Não vê o e-mail da conta ligada (não lê as
  contas).

**Facturas**
- Ver; **nova factura** (rascunhos FT, FR, ND) e **emitir**. Vê o IVA e o
  total previstos pelo servidor depois de guardar o rascunho.
- **PDF** e **enviar ao cliente**. Não anula, não emite notas de crédito nem
  regista recebimentos.

**Notas de crédito** e **Recibos**
- Ver, **PDF** e **enviar ao cliente**.

**Comprovativos**
- Ver a fila e **descarregar** o ficheiro. Não confirma nem rejeita.

**Contratos de clientes** e **Cobranças**
- Tudo o que o Admin faz; o separador **Comercial** na ficha do cliente.

**Pró-formas**
- Ver, **criar**, **converter** em factura e **anular**.

**A receber**
- Ver as vencidas.

**Leads**, **Oportunidades**, **Propostas**, **Actividades**, **Relatório comercial**, **Tipos de serviço** e **Modelos de proposta**
- Tudo o que o Admin faz no CRM e nas propostas, incluindo escolher o
  responsável (da lista do comercial, sem os RH).

**Conversas** e **Base de conhecimento**
- Tudo o que o Admin faz: responder e fechar conversas e pedidos de suporte;
  escrever, corrigir, publicar e arquivar artigos.

**Facturação**
- Ver séries e canais de pagamento.

### ProjectManager (Gestão de projectos)
**Início**
- Resumo pessoal.

**Projectos**
- Tudo o que o Admin faz nos projectos — incluindo atribuir tarefas,
  registar tempo, alocar colaboradores e viaturas e ligar o cliente, pela
  lista dos projectos, sem ler os Recursos Humanos, a frota ou os clientes
  (B38) — e juntar, abrir e retirar ficheiros pelo projecto (B39).

### Colaborador
Entra no **portal do colaborador** (`/eu`). Tudo é do próprio: o servidor
decide pela conta, nunca por um id escolhido no ecrã.
- **Início:** saudação com o nome da ficha, cargo actual, dias de férias por
  gozar, próximo turno, pedidos internos em aberto, os dois anúncios mais
  recentes (fixados primeiro), notificações por ler e aprovações à espera.
- **Anúncios:** os comunicados em vigor, fixados primeiro, com a data de
  publicação e o fim.
- **Assiduidade:** marcações de um período (por omissão, do início do mês a
  hoje): entrada, saída, horas e estado (presente, atraso, falta, falta
  justificada); **justificar uma falta** de um dia até hoje (numa falta
  existente ou num dia sem marcação, que fica registado como falta
  justificada); aviso dos dias com entrada e sem saída.
- **Férias e ausências:** saldo de um ano (direito, transitados, gozados, por
  decidir e por gozar); os pedidos com o período, os dias e o estado; **pedir**
  férias, baixa médica, licença parental ou ausência sem retribuição, com os
  dias de calendário calculados enquanto se escreve. O pedido vai a aprovação;
  se não houver política de aprovação, o ecrã mostra o motivo do servidor.
  **Retirar** um pedido ainda por decidir, depois de confirmar; um pedido já
  decidido não se retira, e o ecrã mostra o motivo do servidor.
- **Turnos:** escala de um período (por omissão, os próximos 30 dias; no
  máximo 93); **pedir para sair** de um turno de hoje em diante, com motivo
  (quem lê os colaboradores pode propor o colega que fica com o turno); os
  pedidos de troca com o estado e a decisão; **cancelar** os que estão por
  decidir.
- **Recibos:** os meses processados com o bruto (e os subsídios que inclui),
  IRT, segurança social e líquido; **descarregar o PDF** (o anexado pelos
  Recursos Humanos ou, sem anexo, o da folha aprovada).
- **Documentos e declarações:** os documentos da ficha (nome, categoria, data,
  tamanho) e **descarregar**; **emitir** uma declaração dos modelos
  disponíveis, depois de confirmar (fica registada, com código de verificação).
- **Pedidos internos:** abrir um pedido a Recursos Humanos, informática,
  instalações, finanças, adiantamento salarial, pedido de documento ou outro,
  com prioridade; a conversa com a equipa; **responder** (num pedido resolvido,
  responder reabre-o; um fechado já não recebe mensagens).
- **Formação:** acções em que está inscrito ou que concluiu, com datas, horas,
  nota e certificado (número e validade).
- **Objectivos e conquistas:** objectivos de cada ciclo com o peso e o
  progresso; resultados-chave com partida, valor actual e alvo; **registar o
  valor actual** enquanto o ciclo está aberto; conquistas com os pontos e a
  nota.
- **Bens à minha guarda:** equipamento da empresa entregue e não devolvido.
- **Despesas:** submeter (data, categoria com sugestões, descrição, valor,
  moeda, comprovativo até 10 MB), acompanhar o estado, ler o motivo de uma
  rejeição, ver a data do reembolso e **retirar** as que ainda não foram
  decididas.
- Funcionalidades comuns (conta, sessões, notificações).
- Sem ficha ligada, o portal explica que a conta ainda não está ligada e pede
  para falar com os Recursos Humanos.

### Cliente
Entra no **portal do cliente** (`/cliente`). Tudo é do próprio cliente, pela
conta; nenhum pedido diz de que cliente é.
- **Início:** nome do cliente, o que está **em dívida hoje** (já descontados
  recibos e notas de crédito), o **facturado este mês** (sem impostos) e todas
  as facturas (número, data, estado, total), com «Enviar comprovativo» nas que
  estão em vigor.
- **Extracto:** facturas, notas de crédito e recibos de um período (por
  omissão, do início do ano a hoje; o período fica no URL), com débito,
  crédito e o saldo depois de cada movimento; saldo inicial e final.
- **Pagamentos:** os comprovativos enviados (factura, data do pagamento, data
  do envio, valor, estado — por confirmar, confirmado, rejeitado com o
  motivo); **enviar um comprovativo**: factura em vigor, valor pago (até ao
  que falta pagar, o servidor confere), data do pagamento (não futura),
  ficheiro (PDF, imagem, documento de escritório ou texto, até 10 MB, até 20
  por dia; o servidor confirma o tipo pelo conteúdo) e notas.
- **Documentos:** os que a empresa partilhou (título, categoria, data,
  tamanho) e os ficheiros que carregou; descarregar, sempre em anexo.
- **Projectos:** os projectos que a empresa lhe mostra, com o período, o
  progresso e o próximo marco; em cada projecto, os marcos (data, alcançado)
  com os comentários da equipa e os seus (como texto), e **comentar** um
  marco enquanto o projecto está em curso.
- **Mensagens:** a conversa aberta com a equipa comercial e as anteriores;
  escrever (se a equipa fechou a conversa, a mensagem abre outra).
- **Suporte:** pedidos com assunto, vários abertos ao mesmo tempo; **abrir**
  (assunto e descrição), **responder** enquanto está aberto; fechado pela
  equipa, **avaliar** uma vez (1 a 5, se recomendaria de 0 a 10, comentário).
- **Ajuda:** artigos publicados para clientes, com pesquisa e categoria;
  ler um artigo (texto simples) e dizer se foi útil (um voto por conta, que
  se pode mudar).
- **Assistente:** com a IA ligada, perguntar (até 2000 caracteres) sobre as
  próprias facturas e o saldo; a resposta usa só os dados do cliente, em
  texto; as perguntas e respostas da visita ficam no ecrã. Cada resposta diz
  que é automática e sem valor contratual (descontos, prazos ou condições só
  valem confirmados por escrito pela empresa).
- Funcionalidades comuns (conta, sessões, notificações).
- Sem associação a um cliente, o portal explica-o e pede para falar com a
  empresa.

---

## 5. Ainda não disponível no front

O backend já tem estas áreas; o front mostra-as nas fases seguintes, e cada uma
entra neste documento quando estiver publicada.

| Fase | Área |
|---|---|
| — | Declarações à AGT (o backend ainda não as tem, B5) |

O login com Google (D4) entra quando o backend o tiver.
