# Rivo — funcionalidades do front por perfil

> **Estado:** fases **F0 a F8** publicadas em
> `https://rivoweb-coral.vercel.app` (F6: fiscal, contabilidade e
> planeamento; F7: recursos humanos completos — portal do colaborador, RH do
> dia-a-dia, recrutamento, entradas e saídas, anúncios, pedidos internos,
> formação, turnos, declarações, desempenho, conquistas e importação de
> colaboradores; F8: salários — folhas de pagamento); **F9** em curso — 1.º
> bloco (compras: requisições, ordens de compra, recepções) concluído e
> verificado na base local, por publicar · actualizado a 2026-10-17.
>
> Este documento cresce com o front: no fim de cada fase entram as
> funcionalidades novas. Só está aqui o que o front **já faz** (em produção, ou
pronto a publicar quando o estado acima o diz). O
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
| **SuperAdmin** | Gestão (`/`) | Início, Dashboard executivo, Aprovações, Alertas, Clientes, Facturas, Pró-formas, Notas de crédito, Recibos, A receber, Requisições, Ordens de compra, Recepções, Fornecedores, Facturas de compra, Pedidos de pagamento, Despesas, Contas bancárias, Caixa pequena, Letras e livranças, Câmbios, Fluxo de caixa, Relatórios financeiros, Impostos, Lançamentos, Plano de contas, Períodos, Regras contabilísticas, Centros de custo, Orçamentos, Previsões de custos, Colaboradores, Departamentos, Cargos, Organograma, Contratos, Assiduidade, Turnos, Férias e ausências, Benefícios, Validades de imigração, Recrutamento, Entradas e saídas, Formação, Desempenho, Conquistas, Anúncios, Pedidos internos, Declarações, Folhas de pagamento, Utilizadores, Configurações, Facturação, Fiscal, Políticas de aprovação |
| **Admin** | Gestão (`/`) | Início, Dashboard executivo, Aprovações, Alertas, Clientes, Facturas, Pró-formas, Notas de crédito, Recibos, A receber, Requisições, Ordens de compra, Recepções, Fornecedores, Facturas de compra, Pedidos de pagamento, Despesas, Contas bancárias, Caixa pequena, Letras e livranças, Câmbios, Fluxo de caixa, Relatórios financeiros, Impostos, Lançamentos, Plano de contas, Períodos, Regras contabilísticas, Centros de custo, Orçamentos, Previsões de custos, Colaboradores, Departamentos, Cargos, Organograma, Contratos, Assiduidade, Turnos, Férias e ausências, Benefícios, Validades de imigração, Recrutamento, Entradas e saídas, Formação, Desempenho, Conquistas, Anúncios, Pedidos internos, Declarações, Folhas de pagamento, Utilizadores, Configurações, Facturação, Fiscal, Políticas de aprovação |
| **HR** (Recursos Humanos) | Gestão (`/`) | Início, Alertas, Colaboradores, Departamentos, Cargos, Organograma, Contratos, Assiduidade, Turnos, Férias e ausências, Benefícios, Validades de imigração, Recrutamento, Entradas e saídas, Formação, Desempenho, Conquistas, Anúncios, Pedidos internos, Declarações, Folhas de pagamento |
| **Finance** (Finanças) | Gestão (`/`) | Início, Aprovações, Alertas, Facturas, Pró-formas, Notas de crédito, Recibos, A receber, Ordens de compra, Recepções, Fornecedores, Facturas de compra, Pedidos de pagamento, Despesas, Contas bancárias, Caixa pequena, Letras e livranças, Câmbios, Fluxo de caixa, Relatórios financeiros, Impostos, Lançamentos, Plano de contas, Períodos, Regras contabilísticas, Centros de custo, Orçamentos, Previsões de custos, Configurações, Facturação, Fiscal |
| **Manager** (Gestão) | Gestão (`/`) | Início, Dashboard executivo, Aprovações, Alertas, Requisições, Ordens de compra, Recepções, Fornecedores, Facturas de compra, Pedidos de pagamento, Despesas, Contas bancárias, Centros de custo, Orçamentos, Previsões de custos |
| **AssetManager** (Gestão de activos) | Gestão (`/`) | Início, Alertas, Ordens de compra, Recepções, Fornecedores |
| **Sales** (Vendas) | Gestão (`/`) | Início, Clientes, Facturas, Pró-formas, Notas de crédito, Recibos, A receber, Facturação |
| **ProjectManager** (Gestão de projectos) | Gestão (`/`) | Início |
| **Colaborador** | Portal do colaborador (`/eu`) | Início, Anúncios, Assiduidade, Férias e ausências, Turnos, Recibos, Documentos e declarações, Pedidos internos, Despesas, Formação, Objectivos e conquistas, Bens à minha guarda |
| **Cliente** | Portal do cliente (`/cliente`) | Início |

Uma conta pode ter vários perfis; vê a soma do que cada um permite. Quem tem
perfil de gestão e ficha de colaborador vê também «O meu portal» no menu da
conta; no portal, «Voltar à gestão» fica no fundo da barra lateral (e no menu
da conta), e o logotipo leva de volta ao ecrã principal com os menus
completos. Em qualquer ambiente, o logotipo leva ao início desse ambiente.

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
| Ver o resumo do pedido e os nomes de quem pediu, aprova e decidiu | ✓ | ✓ | — | ✓ | ✓ | — | — | — | — | — |
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
| **Fornecedores** | | | | | | | | | | |
| Ver a lista (com inactivos) e a ficha | ✓ | ✓ | — | ✓ | ✓ | ✓ | — | — | — | — |
| Registar, importar CSV, corrigir (IBAN verificado), desactivar e reactivar | ✓ | ✓ | — | — | — | — | — | — | — | — |
| **Facturas de compra** | | | | | | | | | | |
| Ver a lista (vencem até) e a ficha, com o confronto com a encomenda | ✓ | ✓ | — | ✓ | ✓ | — | — | — | — | — |
| Registar | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| Anular | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| **Compras** | | | | | | | | | | |
| Ver as requisições (linhas, total estimado, estado) ¹⁴ | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| Abrir requisição, submeter para aprovação, ver a decisão, cancelar com motivo ¹³ | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| Emitir ordem de compra a partir da requisição aprovada | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| Ver as ordens de compra (encomendado, recebido, o que falta) | ✓ | ✓ | — | ✓ | ✓ | ✓ | — | — | — | — |
| Cancelar ordem de compra (com motivo, sem mercadoria recebida) | ✓ | ✓ | — | — | ✓ | — | — | — | — | — |
| Ver as recepções ¹⁴ | ✓ | ✓ | — | ✓ | ✓ | ✓ | — | — | — | — |
| Registar recepção (sem passar o que falta) e anular com motivo ¹³ | ✓ | ✓ | — | — | — | ✓ | — | — | — | — |
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
| Juntar colaboradores à folha em rascunho (bruto e subsídios; o servidor calcula o IRT, o INSS e o líquido) | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
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
¹⁴ Quem não lê os Recursos Humanos vê «Colaborador» e «Departamento» em vez dos nomes (B29).

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
  descrição), com o total à vista.
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
  (rascunho, por aprovar, aprovada, recusada) e quando fechou.
- **Abrir** a folha de um mês (a conta tem de estar ligada a uma ficha; avisa
  se o mês já tem folha, porque duas folhas pagam duas vezes).
- **Folha:** totais (bruto, IRT retido, INSS do trabalhador, líquido a pagar)
  e, por colaborador, o bruto, os subsídios incluídos, o IRT, o INSS e o
  líquido — **calculados pelo servidor** com a configuração fiscal em vigor no
  fim do mês (o front não calcula impostos).
- Em rascunho: **juntar** um colaborador (bruto e subsídios de alimentação,
  transporte, férias e Natal, que fazem parte do bruto e não o podem passar;
  sugere o salário do contrato em vigor; avisa se o colaborador já está na
  folha; um item juntado não se tira) e **submeter** para aprovação.
- Por aprovar: **ver a decisão** tomada em Aprovações (ou que ainda espera),
  com a ligação ao pedido.
- Aprovada: por colaborador, os **recibos** anexados (descarregar) e
  **anexar** o PDF do recibo; sem anexo, o portal gera-o da folha.
- Recusada: não se paga nem se altera.

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

**Departamentos**
- Ver, **criar** e **corrigir**.

**Cargos**
- Ver, com ocupações. **Não** cria nem corrige cargos.

### Finance (Finanças)
**Início**
- Resumo pessoal e indicadores de **Finanças**.

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

**Facturação**
- Ver séries, canais de pagamento e taxas de IVA.

**Ordens de compra** e **Recepções**
- Ver as ordens e as recepções (com «Colaborador» em vez de quem recebeu, B29).
  Não vê requisições, não emite nem cancela ordens e não regista recepções.

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

**Dashboard executivo**
- Como no Admin.

**Aprovações**
- Caixa, ficha, **decidir** e **cancelar** os próprios pedidos, como o Admin,
  com o resumo do pedido e os nomes.

**Alertas**
- Ver, **resolver**; regras: **criar**, **rever**, **desactivar** e
  **avaliar agora**.

**Requisições** e **Ordens de compra**
- Tudo o que o Admin faz nas requisições e nas ordens (vê «Colaborador» e
  «Departamento» em vez dos nomes, e não escolhe o departamento, B29).

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
- Ver as ordens e as recepções; **registar** recepções e **anulá-las** com
  motivo (vê «Colaborador» em vez de quem recebeu, B29). Não vê requisições,
  não emite nem cancela ordens.

**Fornecedores**
- Ver a lista e a ficha.

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
| — | Declarações à AGT (o backend ainda não as tem, B5) |
| F9 | Compras, inventário e activos |
| F10 | Portal do cliente, gestão documental e mensagens |
| F11 | Comercial avançado (CRM, contratos) |
| F12 | Projectos e frota |
| F13 | Complementar (ESG, IA, base de conhecimento) |

O login com Google (D4) entra quando o backend o tiver.
