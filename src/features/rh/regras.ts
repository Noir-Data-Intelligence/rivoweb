/**
 * Regras do RH que o front valida antes de enviar, iguais às do domínio
 * (`Workplace.cs`, `Talent.cs`, `EmploymentContract.cs`, `Benefit.cs`). O
 * servidor decide sempre; isto só evita um pedido que se sabe recusado.
 */
import { hojeIso } from "@/lib/format/data";
import { decimalParaApi, lerDecimalDigitado, lerDinheiroDigitado } from "@/lib/money/money";
import { normalizarTexto, pareceEmail } from "@/lib/validation/normalizar";
import { ibanValido } from "@/lib/validation/text";

/** País com duas letras, nascimento não futuro, IBAN válido se mudou. */
export function errosDadosPessoais(v: Readonly<Record<string, string>>, ibanAnterior: string | null, hoje = hojeIso()): Record<string, string> {
  const e: Record<string, string> = {};
  for (const k of ["country", "passportIssuingCountry"]) {
    const x = normalizarTexto(v[k] ?? "");
    if (x !== "" && !/^[A-Za-z]{2}$/.test(x)) e[k] = "Duas letras (código ISO do país).";
  }
  if (v.birthDate && v.birthDate > hoje) e.birthDate = "A data de nascimento não pode ser futura.";
  const iban = (v.iban ?? "").replace(/\s+/g, "").toUpperCase();
  if (iban !== "" && iban !== (ibanAnterior ?? "") && !ibanValido(iban)) e.iban = "IBAN inválido: confirme os dígitos de controlo.";
  return e;
}

export const TIPO_CONTRATO: Readonly<Record<string, string>> = {
  Permanent: "Sem termo",
  FixedTerm: "A termo certo",
  Freelance: "Prestação de serviços",
};

export type ErrosContrato = { colaborador?: string; inicio?: string; fim?: string; salario?: string };

/** O tipo manda na data de fim: sem termo não tem; a termo e prestação exigem-na, depois do início. */
export function errosContrato(p: { colaborador: string; tipo: string; inicio: string; fim: string; salario: string }): ErrosContrato {
  const e: ErrosContrato = {};
  if (!p.colaborador) e.colaborador = "Escolha o colaborador.";
  if (!p.inicio) e.inicio = "Indique o início.";
  if (p.tipo === "Permanent" && p.fim) e.fim = "Um contrato sem termo não tem data de fim.";
  if (p.tipo !== "Permanent" && !p.fim) e.fim = "Um contrato a termo ou de prestação de serviços exige data de fim.";
  else if (p.fim && p.inicio && p.fim <= p.inicio) e.fim = "A data de fim tem de ser posterior à de início.";
  const s = lerDinheiroDigitado(p.salario);
  if (p.salario.trim() === "") e.salario = "Indique o salário mensal.";
  else if (s === null) e.salario = "Valor inválido (até 2 casas decimais).";
  else if (s.lte(0)) e.salario = "O salário tem de ser maior que zero.";
  return e;
}

/** Dias de direito ou transitados: de 0 a 366, até 2 casas (`LeaveEntitlement.Set`). */
export function lerDias(texto: string): string | null {
  const v = lerDinheiroDigitado(normalizarTexto(texto), 2);
  if (v === null || v.lt(0) || v.gt(366)) return null;
  return v.toString();
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function dia(iso: string): number | null {
  if (!ISO.test(iso)) return null;
  const t = Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  const d = new Date(t);
  return d.toISOString().slice(0, 10) === iso ? t / 86_400_000 : null;
}

/** Dias de calendário de um intervalo, os dois extremos incluídos (como `calendarDays`). */
export function diasDeCalendario(de: string, ate: string): number | null {
  const a = dia(de);
  const b = dia(ate);
  if (a === null || b === null || b < a) return null;
  return b - a + 1;
}

export type ErrosFerias = { tipo?: string; de?: string; ate?: string };

export function validarFerias(p: { tipo: string; de: string; ate: string }): ErrosFerias {
  const e: ErrosFerias = {};
  if (!p.tipo) e.tipo = "Escolha o tipo.";
  if (dia(p.de) === null) e.de = "Indique o primeiro dia.";
  if (dia(p.ate) === null) e.ate = "Indique o último dia.";
  else if (!e.de && diasDeCalendario(p.de, p.ate) === null) e.ate = "O último dia não pode ser anterior ao primeiro.";
  return e;
}

// --- F7c: recrutamento, entradas e saídas (limites de `HrDbContext`)

const ORDEM_FUNIL = ["Applied", "Screening", "Interview", "Offer"] as const;

/** A etapa seguinte do funil, ou `null` na proposta (daí contrata-se) e nas finais. */
export function proximaEtapa(etapa: string): string | null {
  const i = ORDEM_FUNIL.indexOf(etapa as (typeof ORDEM_FUNIL)[number]);
  return i >= 0 && i < ORDEM_FUNIL.length - 1 ? (ORDEM_FUNIL[i + 1] ?? null) : null;
}

export type ErrosVaga = { titulo?: string; vagas?: string; descricao?: string; requisitos?: string };

export function errosVaga(p: { titulo: string; vagas: string; descricao: string; requisitos: string }): ErrosVaga {
  const e: ErrosVaga = {};
  const t = normalizarTexto(p.titulo);
  if (t === "") e.titulo = "Indique o título da vaga.";
  else if (t.length > 200) e.titulo = "No máximo 200 caracteres.";
  if (!/^\d{1,3}$/.test(p.vagas.trim()) || Number(p.vagas) < 1) e.vagas = "Pelo menos uma vaga (número inteiro).";
  if (normalizarTexto(p.descricao, true).length > 2000) e.descricao = "No máximo 2000 caracteres.";
  if (normalizarTexto(p.requisitos, true).length > 2000) e.requisitos = "No máximo 2000 caracteres.";
  return e;
}

export type ErrosCandidato = { nome?: string; email?: string; telefone?: string; data?: string };

export function errosCandidato(p: { nome: string; email: string; telefone: string; data: string }, hoje = hojeIso()): ErrosCandidato {
  const e: ErrosCandidato = {};
  const n = normalizarTexto(p.nome);
  if (n === "") e.nome = "Indique o nome.";
  else if (n.length > 200) e.nome = "No máximo 200 caracteres.";
  const m = p.email.trim();
  if (m !== "" && (!pareceEmail(m) || m.length > 320)) e.email = "E-mail inválido.";
  if (p.telefone.trim().length > 30) e.telefone = "No máximo 30 caracteres.";
  if (p.data !== "" && p.data > hoje) e.data = "A candidatura não pode ter data futura.";
  return e;
}

export type TarefaRascunho = { titulo: string; categoria: string; prazo: string };
export type ErrosProcesso = { colaborador?: string; ultimoDia?: string; motivo?: string; tarefas?: string; linhas: Record<number, string> };

/** Um processo sem tarefas nunca se conclui e não há como lhas juntar depois: exige-se pelo menos uma. */
export function errosProcesso(p: { colaborador: string; tipo: string; ultimoDia: string; motivo: string; tarefas: readonly TarefaRascunho[] }): ErrosProcesso {
  const e: ErrosProcesso = { linhas: {} };
  if (p.colaborador === "") e.colaborador = "Escolha o colaborador.";
  if (p.tipo === "Offboarding" && p.ultimoDia === "") e.ultimoDia = "Uma saída exige o último dia de trabalho.";
  if (normalizarTexto(p.motivo, true).length > 500) e.motivo = "No máximo 500 caracteres.";
  const preenchidas = p.tarefas.filter((t) => normalizarTexto(t.titulo) !== "");
  if (preenchidas.length === 0) e.tarefas = "Indique pelo menos uma tarefa: um processo sem tarefas não se conclui.";
  p.tarefas.forEach((t, i) => {
    if (normalizarTexto(t.titulo).length > 200) e.linhas[i] = "Título com mais de 200 caracteres.";
    else if (normalizarTexto(t.titulo) === "" && t.prazo !== "") e.linhas[i] = "Falta o título desta tarefa.";
  });
  return e;
}

export const temErrosProcesso = (e: ErrosProcesso) => Boolean(e.colaborador || e.ultimoDia || e.motivo || e.tarefas) || Object.keys(e.linhas).length > 0;

// --- F7c: anúncios e pedidos internos (limites de `HrDbContext`)

export type ErrosAnuncio = { titulo?: string; texto?: string; expira?: string };

/** Datas ao dia (Luanda); publicar vazio é «agora». Expira depois de publicado. */
export function errosAnuncio(p: { titulo: string; texto: string; publica: string; expira: string }, hoje = hojeIso()): ErrosAnuncio {
  const e: ErrosAnuncio = {};
  const t = normalizarTexto(p.titulo);
  if (t === "") e.titulo = "Indique o título.";
  else if (t.length > 200) e.titulo = "No máximo 200 caracteres.";
  const x = normalizarTexto(p.texto, true);
  if (x === "") e.texto = "Escreva o texto do anúncio.";
  else if (x.length > 8000) e.texto = "No máximo 8000 caracteres.";
  if (p.expira !== "" && p.expira <= (p.publica === "" ? hoje : p.publica)) e.expira = "Tem de expirar depois do dia de publicação.";
  return e;
}

export type FaseAnuncio = "arquivado" | "agendado" | "expirado" | "em-vigor";

export function faseAnuncio(a: { archived: boolean; publishedAt: string; expiresAt: string | null }, agora = new Date()): FaseAnuncio {
  if (a.archived) return "arquivado";
  if (new Date(a.publishedAt) > agora) return "agendado";
  if (a.expiresAt && new Date(a.expiresAt) <= agora) return "expirado";
  return "em-vigor";
}

/** Horas (até 2 casas) em minutos inteiros; `null` se inválido ou não positivo. */
export function horasParaMinutos(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(t)) return null;
  const m = Math.round(Number(t) * 60 * 100) / 100;
  return Number.isInteger(m) && m > 0 ? m : null;
}

export function minutosParaHoras(min: number | string): string {
  const h = Number(min) / 60;
  return (Number.isInteger(h) ? String(h) : h.toFixed(2).replace(/0+$/, "")).replace(".", ",");
}

export function errosSla(resposta: string, resolucao: string): { resposta?: string; resolucao?: string } {
  const r = horasParaMinutos(resposta);
  const s = horasParaMinutos(resolucao);
  const e: { resposta?: string; resolucao?: string } = {};
  if (r === null) e.resposta = "Horas positivas (até 2 casas; em minutos inteiros).";
  if (s === null) e.resolucao = "Horas positivas (até 2 casas; em minutos inteiros).";
  else if (r !== null && s < r) e.resolucao = "A resolução não pode ter prazo mais curto do que a resposta.";
  return e;
}

export const MAXIMO_MENSAGEM_PEDIDO = 4000;

export function erroMensagem(texto: string): string | undefined {
  const t = normalizarTexto(texto, true);
  return t === "" ? "Escreva a mensagem." : t.length > MAXIMO_MENSAGEM_PEDIDO ? `No máximo ${MAXIMO_MENSAGEM_PEDIDO} caracteres.` : undefined;
}

// --- F7c: formação e turnos (regras de `Workplace.cs` e `ManageWorkplace.cs`)

export type ErrosCurso = { titulo?: string; inicio?: string; fim?: string; horas?: string; custo?: string; lotacao?: string; validade?: string };

const inteiroPositivo = (t: string, max: number) => /^\d{1,6}$/.test(t.trim()) && Number(t) >= 1 && Number(t) <= max;

export function errosCurso(p: { titulo: string; inicio: string; fim: string; horas: string; custo: string; lotacao: string; validade: string }): ErrosCurso {
  const e: ErrosCurso = {};
  const t = normalizarTexto(p.titulo);
  if (t === "") e.titulo = "Indique o título.";
  else if (t.length > 200) e.titulo = "No máximo 200 caracteres.";
  if (p.inicio === "") e.inicio = "Indique o início.";
  if (p.fim !== "" && p.inicio !== "" && p.fim < p.inicio) e.fim = "A formação não pode acabar antes de começar.";
  if (p.horas.trim() !== "") {
    const h = lerDecimalDigitado(p.horas, 2);
    if (h === null || h.lte(0)) e.horas = "Horas positivas (até 2 casas decimais).";
  }
  if (p.custo.trim() !== "") {
    const c = lerDinheiroDigitado(p.custo);
    if (c === null || c.lt(0)) e.custo = "Valor inválido (até 2 casas decimais, não negativo).";
  }
  if (p.lotacao.trim() !== "" && !inteiroPositivo(p.lotacao, 100000)) e.lotacao = "Pelo menos uma vaga (número inteiro).";
  if (p.validade.trim() !== "" && !inteiroPositivo(p.validade, 240)) e.validade = "De 1 a 240 meses.";
  return e;
}

export function errosConclusao(p: { data: string; avaliacao: string; certificado: string }, hoje = hojeIso()): { data?: string; avaliacao?: string; certificado?: string } {
  const e: { data?: string; avaliacao?: string; certificado?: string } = {};
  if (p.data !== "" && p.data > hoje) e.data = "A conclusão não pode ser futura.";
  if (p.avaliacao.trim() !== "") {
    const a = lerDecimalDigitado(p.avaliacao, 2);
    if (a === null || a.lt(0) || a.gt(100)) e.avaliacao = "A avaliação é de 0 a 100.";
  }
  if (p.certificado.trim().length > 60) e.certificado = "No máximo 60 caracteres.";
  return e;
}

/** `HH:mm` (do campo) para `HH:mm:00` (TimeOnly da API); e o inverso. */
export const horaParaApi = (h: string) => (/^\d{2}:\d{2}$/.test(h) ? `${h}:00` : h);
export const horaDaApi = (h: string) => h.slice(0, 5);

export function errosTipoTurno(p: { codigo: string; nome: string; inicio: string; fim: string; novo: boolean }): { codigo?: string; nome?: string; fim?: string; inicio?: string } {
  const e: { codigo?: string; nome?: string; fim?: string; inicio?: string } = {};
  const c = normalizarTexto(p.codigo);
  if (p.novo && c === "") e.codigo = "Indique o código.";
  else if (c.length > 20) e.codigo = "No máximo 20 caracteres.";
  const n = normalizarTexto(p.nome);
  if (n === "") e.nome = "Indique o nome.";
  else if (n.length > 100) e.nome = "No máximo 100 caracteres.";
  if (!/^\d{2}:\d{2}$/.test(p.inicio)) e.inicio = "Indique a hora de início.";
  if (!/^\d{2}:\d{2}$/.test(p.fim)) e.fim = "Indique a hora de fim.";
  else if (p.inicio === p.fim) e.fim = "Início e fim do turno não podem coincidir.";
  return e;
}

/** Fim antes do início passa a meia-noite (turno da noite). */
export const passaMeiaNoite = (inicio: string, fim: string) => fim < inicio;

export const MAXIMO_DIAS_ESCALA = 94;

export function errosEscala(p: { colaborador: string; tipo: string; de: string; ate: string }): { colaborador?: string; tipo?: string; de?: string; ate?: string } {
  const e: { colaborador?: string; tipo?: string; de?: string; ate?: string } = {};
  if (p.colaborador === "") e.colaborador = "Escolha o colaborador.";
  if (p.tipo === "") e.tipo = "Escolha o turno.";
  if (p.de === "") e.de = "Indique o primeiro dia.";
  else if (p.ate !== "") {
    const d = diasDeCalendario(p.de, p.ate);
    if (d === null) e.ate = "O último dia não pode ser anterior ao primeiro.";
    else if (d > MAXIMO_DIAS_ESCALA) e.ate = `No máximo ${MAXIMO_DIAS_ESCALA} dias de cada vez.`;
  }
  return e;
}

// --- F7c: declarações, desempenho e conquistas (regras de `Talent.cs`, `ManageWorkplace.cs`)

/** Marcadores que o servidor substitui ao emitir (`ManageDeclarations.Placeholders`). */
export const MARCADORES_DECLARACAO = ["nome", "codigo", "cargo", "departamento", "admissao", "salario", "moeda", "nif", "bi", "data"] as const;

/** Marcadores `{{…}}` do texto que o servidor não conhece (ficariam impressos tal como estão). */
export function marcadoresDesconhecidos(texto: string): string[] {
  const vistos = new Set<string>();
  for (const m of texto.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)) {
    const n = m[1] ?? "";
    if (!(MARCADORES_DECLARACAO as readonly string[]).includes(n)) vistos.add(n);
  }
  return [...vistos];
}

export function errosModelo(p: { nome: string; titulo: string; texto: string }): { nome?: string; titulo?: string; texto?: string } {
  const e: { nome?: string; titulo?: string; texto?: string } = {};
  const n = normalizarTexto(p.nome);
  if (n === "") e.nome = "Indique o nome do modelo.";
  else if (n.length > 200) e.nome = "No máximo 200 caracteres.";
  const t = normalizarTexto(p.titulo);
  if (t === "") e.titulo = "Indique o título impresso.";
  else if (t.length > 200) e.titulo = "No máximo 200 caracteres.";
  const x = normalizarTexto(p.texto, true);
  if (x === "") e.texto = "Escreva o texto da declaração.";
  else if (x.length > 8000) e.texto = "No máximo 8000 caracteres.";
  else {
    const d = marcadoresDesconhecidos(x);
    if (d.length > 0) e.texto = `Marcador desconhecido: ${d.map((m) => `{{${m}}}`).join(", ")}.`;
  }
  return e;
}

/** Código de verificação: letras e dígitos, com ou sem hífenes. */
export const codigoVerificacaoValido = (c: string) => /^[A-Za-z0-9-]{4,64}$/.test(c.trim());

export function errosCiclo(p: { nome: string; inicio: string; fim: string }): { nome?: string; inicio?: string; fim?: string } {
  const e: { nome?: string; inicio?: string; fim?: string } = {};
  const n = normalizarTexto(p.nome);
  if (n === "") e.nome = "Indique o nome do ciclo.";
  else if (n.length > 150) e.nome = "No máximo 150 caracteres.";
  if (p.inicio === "") e.inicio = "Indique o início.";
  if (p.fim === "") e.fim = "Indique o fim.";
  else if (p.inicio !== "" && p.fim < p.inicio) e.fim = "O ciclo não pode acabar antes de começar.";
  return e;
}

export function errosObjectivo(p: { titulo: string; descricao: string; peso: string }): { titulo?: string; descricao?: string; peso?: string } {
  const e: { titulo?: string; descricao?: string; peso?: string } = {};
  const t = normalizarTexto(p.titulo);
  if (t === "") e.titulo = "Indique o título.";
  else if (t.length > 200) e.titulo = "No máximo 200 caracteres.";
  if (normalizarTexto(p.descricao, true).length > 2000) e.descricao = "No máximo 2000 caracteres.";
  if (p.peso.trim() !== "" && !(/^\d{1,3}$/.test(p.peso.trim()) && Number(p.peso) >= 1 && Number(p.peso) <= 100)) e.peso = "O peso é de 1 a 100.";
  return e;
}

/** Decimal até 4 casas (resultados-chave), como texto para a API; `null` se inválido. */
export function lerValorKr(texto: string): string | null {
  const t = texto.trim();
  if (t === "") return null;
  const negativo = t.startsWith("-");
  const v = lerDecimalDigitado(negativo ? t.slice(1) : t, 4);
  if (v === null) return null;
  const s = decimalParaApi(v);
  return negativo && s !== "0" ? `-${s}` : s;
}

export function errosResultadoChave(p: { titulo: string; unidade: string; partida: string; meta: string }): { titulo?: string; unidade?: string; partida?: string; meta?: string } {
  const e: { titulo?: string; unidade?: string; partida?: string; meta?: string } = {};
  const t = normalizarTexto(p.titulo);
  if (t === "") e.titulo = "Indique o título.";
  else if (t.length > 200) e.titulo = "No máximo 200 caracteres.";
  if (normalizarTexto(p.unidade).length > 30) e.unidade = "No máximo 30 caracteres.";
  const partida = p.partida.trim() === "" ? "0" : lerValorKr(p.partida);
  if (partida === null) e.partida = "Número inválido (até 4 casas decimais).";
  const meta = lerValorKr(p.meta);
  if (p.meta.trim() === "") e.meta = "Indique a meta.";
  else if (meta === null) e.meta = "Número inválido (até 4 casas decimais).";
  else if (partida !== null && Number(meta) === Number(partida)) e.meta = "A meta tem de ser diferente do ponto de partida.";
  return e;
}

export function errosConquista(p: { codigo: string; nome: string; descricao: string; icone: string; pontos: string; nova: boolean }): { codigo?: string; nome?: string; descricao?: string; icone?: string; pontos?: string } {
  const e: { codigo?: string; nome?: string; descricao?: string; icone?: string; pontos?: string } = {};
  const c = normalizarTexto(p.codigo);
  if (p.nova && c === "") e.codigo = "Indique o código.";
  else if (c.length > 30) e.codigo = "No máximo 30 caracteres.";
  const n = normalizarTexto(p.nome);
  if (n === "") e.nome = "Indique o nome.";
  else if (n.length > 150) e.nome = "No máximo 150 caracteres.";
  if (normalizarTexto(p.descricao, true).length > 1000) e.descricao = "No máximo 1000 caracteres.";
  if (normalizarTexto(p.icone).length > 50) e.icone = "No máximo 50 caracteres.";
  if (p.pontos.trim() !== "" && !(/^\d{1,5}$/.test(p.pontos.trim()) && Number(p.pontos) <= 10000)) e.pontos = "Os pontos são de 0 a 10 000.";
  return e;
}
