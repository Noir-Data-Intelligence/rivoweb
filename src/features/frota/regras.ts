/** Regras de entrada da frota, as mesmas do servidor (`Vehicle.cs`, `Insurance.cs`, `FleetDbContext.cs`). Valores e quilómetros até 2 casas. */
import { decimalParaApi, lerDecimalDigitado, lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";

type Erros<K extends string> = Partial<Record<K, string>>;
export const temErros = (e: object) => Object.keys(e).length > 0;
const opc = (v: string, multi = false) => {
  const n = normalizarTexto(v, multi);
  return n === "" ? null : n;
};
const texto = (e: Record<string, string>, k: string, v: string, n: number, falta?: string, multi = false) => {
  const t = normalizarTexto(v, multi);
  if (t === "" && falta) e[k] = falta;
  else if (t.length > n) e[k] = `No máximo ${n} caracteres.`;
};

export type CamposViatura = { matricula: string; modelo: string };
export function errosViatura(p: CamposViatura): Erros<keyof CamposViatura> {
  const e: Record<string, string> = {};
  texto(e, "matricula", p.matricula, 20, "Indique a matrícula.");
  texto(e, "modelo", p.modelo, 100, "Indique o modelo.");
  return e;
}
export const viaturaParaApi = (p: CamposViatura) => ({ plateNumber: normalizarTexto(p.matricula).toUpperCase(), model: normalizarTexto(p.modelo) });

export type CamposManutencao = { tipo: "Preventive" | "Corrective"; descricao: string; inicio: string };
export function errosManutencao(p: CamposManutencao): Erros<keyof CamposManutencao> {
  const e: Record<string, string> = {};
  texto(e, "descricao", p.descricao, 500, "Descreva a manutenção.", true);
  if (p.inicio === "") e.inicio = "Indique o início.";
  return e;
}

export type CamposFecho = { fim: string; custo: string };
export function errosFecho(p: CamposFecho, inicio: string): Erros<keyof CamposFecho> {
  const e: Erros<keyof CamposFecho> = {};
  if (p.fim === "") e.fim = "Indique o fim.";
  else if (p.fim < inicio) e.fim = "O fim não pode ser anterior ao início da manutenção.";
  if (p.custo.trim() !== "") {
    const c = lerDinheiroDigitado(p.custo);
    if (c === null || c.lt(0)) e.custo = "O custo não pode ser negativo (até 2 casas).";
  }
  return e;
}
/** Já validado: vazio é `null`. */
export const dinheiroOuNulo = (t: string) => {
  const v = t.trim() === "" ? null : lerDinheiroDigitado(t);
  return v ? paraApi(v) : null;
};

export function errosAtribuicao(p: { pessoa: string; inicio: string }): Erros<"pessoa" | "inicio"> {
  const e: Erros<"pessoa" | "inicio"> = {};
  if (p.pessoa === "") e.pessoa = "Escolha o colaborador.";
  if (p.inicio === "") e.inicio = "Indique o início.";
  return e;
}
export const erroFimAtribuicao = (fim: string, inicio: string) => (fim === "" ? "Indique o fim." : fim < inicio ? "O fim não pode ser anterior ao início da atribuição." : undefined);

export type CamposPlano = { descricao: string; intervalo: string; primeira: string };
export function errosPlano(p: CamposPlano): Erros<keyof CamposPlano> {
  const e: Record<string, string> = {};
  texto(e, "descricao", p.descricao, 500, "Descreva o plano.", true);
  if (!/^\d{1,4}$/.test(p.intervalo.trim()) || Number(p.intervalo) < 1) e.intervalo = "Dias inteiros, de 1 a 9999.";
  if (p.primeira === "") e.primeira = "Indique a primeira data.";
  return e;
}
export const planoParaApi = (p: CamposPlano) => ({ description: normalizarTexto(p.descricao, true), intervalDays: Number(p.intervalo.trim()), firstDueOn: p.primeira });

export type CamposViagem = { motorista: string; inicio: string; fim: string; kmInicio: string; kmFim: string; motivo: string };
export function errosViagem(p: CamposViagem): Erros<keyof CamposViagem> {
  const e: Record<string, string> = {};
  if (p.inicio === "") e.inicio = "Indique o início.";
  if (p.fim === "") e.fim = "Indique o fim.";
  else if (p.inicio !== "" && p.fim < p.inicio) e.fim = "O fim não pode ser anterior ao início da viagem.";
  const a = lerDecimalDigitado(p.kmInicio, 2);
  const b = lerDecimalDigitado(p.kmFim, 2);
  if (a === null || a.lt(0)) e.kmInicio = "Quilómetros não negativos (até 2 casas).";
  if (b === null || b.lt(0)) e.kmFim = "Quilómetros não negativos (até 2 casas).";
  else if (a !== null && b.lt(a)) e.kmFim = "O odómetro final não pode ser inferior ao inicial.";
  texto(e, "motivo", p.motivo, 500, undefined, true);
  return e;
}
/** Já validado. */
export function viagemParaApi(p: CamposViagem) {
  const a = lerDecimalDigitado(p.kmInicio, 2);
  const b = lerDecimalDigitado(p.kmFim, 2);
  return { driverId: p.motorista === "" ? null : p.motorista, startedOn: p.inicio, endedOn: p.fim, startOdometer: a ? decimalParaApi(a) : "0", endOdometer: b ? decimalParaApi(b) : "0", purpose: opc(p.motivo, true) };
}

export type CategoriaDespesa = "Fuel" | "Toll" | "Parking";
export type CamposDespesa = { categoria: CategoriaDespesa; valor: string; data: string; descricao: string };
export function errosDespesa(p: CamposDespesa): Erros<keyof CamposDespesa> {
  const e: Record<string, string> = {};
  const v = lerDinheiroDigitado(p.valor);
  if (v === null || v.lte(0)) e.valor = "Valor positivo (até 2 casas).";
  if (p.data === "") e.data = "Indique a data.";
  texto(e, "descricao", p.descricao, 500, undefined, true);
  return e;
}
/** Já validado. */
export function despesaParaApi(p: CamposDespesa) {
  const v = lerDinheiroDigitado(p.valor);
  return { category: p.categoria, amount: v ? paraApi(v) : "0", occurredOn: p.data, description: opc(p.descricao, true) };
}

export function errosDocumento(p: { doc: boolean; categoria: string }): Erros<"doc" | "categoria"> {
  const e: Record<string, string> = {};
  if (!p.doc) e.doc = "Carregue o ficheiro.";
  texto(e, "categoria", p.categoria, 100, "Indique a categoria (por exemplo, livrete ou inspecção).");
  return e;
}
export function erroMotivo(motivo: string): string | undefined {
  const t = normalizarTexto(motivo, true);
  if (t === "") return "Diga porque retira o documento da viatura.";
  return t.length > 500 ? "No máximo 500 caracteres." : undefined;
}

export type CamposApolice = { seguradora: string; numero: string; cobertura: string; inicio: string; fim: string; premio: string; moeda: string; capital: string; notas: string };
export function errosApolice(p: CamposApolice): Erros<keyof CamposApolice> {
  const e: Record<string, string> = {};
  texto(e, "seguradora", p.seguradora, 200, "Indique a seguradora.");
  texto(e, "numero", p.numero, 60, "Indique o número da apólice.");
  texto(e, "cobertura", p.cobertura, 200);
  if (p.inicio === "") e.inicio = "Indique o início.";
  if (p.fim === "") e.fim = "Indique o fim.";
  else if (p.inicio !== "" && p.fim < p.inicio) e.fim = "A apólice não pode acabar antes de começar.";
  const pr = lerDinheiroDigitado(p.premio);
  if (pr === null || pr.lt(0)) e.premio = "Prémio não negativo (até 2 casas).";
  if (!/^[A-Za-z]{3}$/.test(p.moeda.trim())) e.moeda = "Código de 3 letras (por exemplo, AOA).";
  if (p.capital.trim() !== "") {
    const c = lerDinheiroDigitado(p.capital);
    if (c === null || c.lt(0)) e.capital = "Capital seguro não negativo (até 2 casas).";
  }
  texto(e, "notas", p.notas, 1000, undefined, true);
  return e;
}
/** Já validado. */
export function apoliceParaApi(p: CamposApolice) {
  const pr = lerDinheiroDigitado(p.premio);
  return {
    insurer: normalizarTexto(p.seguradora),
    policyNumber: normalizarTexto(p.numero),
    coverage: opc(p.cobertura),
    startsOn: p.inicio,
    endsOn: p.fim,
    premium: pr ? paraApi(pr) : "0",
    currency: p.moeda.trim().toUpperCase(),
    insuredValue: dinheiroOuNulo(p.capital),
    notes: opc(p.notas, true),
  };
}

export type CamposSinistro = { data: string; descricao: string; valor: string; referencia: string };
export function errosSinistro(p: CamposSinistro, vigencia: { inicio: string; fim: string }): Erros<keyof CamposSinistro> {
  const e: Record<string, string> = {};
  if (p.data === "") e.data = "Indique a data do sinistro.";
  else if (p.data < vigencia.inicio || p.data > vigencia.fim) e.data = "O sinistro tem de ocorrer dentro da vigência da apólice.";
  texto(e, "descricao", p.descricao, 1000, "Descreva o sinistro.", true);
  if (p.valor.trim() !== "") {
    const v = lerDinheiroDigitado(p.valor);
    if (v === null || v.lt(0)) e.valor = "Valor reclamado não negativo (até 2 casas).";
  }
  texto(e, "referencia", p.referencia, 60);
  return e;
}
export const sinistroParaApi = (p: CamposSinistro) => ({ occurredOn: p.data, description: normalizarTexto(p.descricao, true), claimedAmount: dinheiroOuNulo(p.valor), reference: opc(p.referencia) });

export function erroPagamento(valor: string): string | undefined {
  const v = lerDinheiroDigitado(valor);
  return v === null || v.lt(0) ? "Valor pago não negativo (até 2 casas)." : undefined;
}
