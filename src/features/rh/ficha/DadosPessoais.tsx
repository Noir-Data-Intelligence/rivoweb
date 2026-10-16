/**
 * Ficha › Dados pessoais e imigração (§7.6). Nada se pede até «Ver dados
 * pessoais»; depois, os números (NIF, BI, INSS, conta, IBAN, passaporte,
 * visto, autorização) aparecem mascarados, com «Mostrar» por campo. A query
 * não fica em cache. O `PUT` substitui tudo: o formulário parte do que está
 * gravado e envia todos os campos.
 */
import { Eye, Pencil } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useUtilizador } from "@/features/identity";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { Skeleton } from "@/ui/Layout";
import { Mascarado } from "@/ui/Mascarado";
import { errosDadosPessoais } from "../regras";
import { useDadosPessoais, useGravarDadosPessoais, useGravarImigracao, useImigracao, type DadosPessoais as TipoDados, type Imigracao } from "../gestao";

type Campo<K extends string> = { readonly chave: K; readonly rotulo: string; readonly max: number; readonly tipo?: "data" | "texto-longo"; readonly sensivel?: boolean; readonly ajuda?: string };

const CAMPOS_PESSOAIS = [
  { chave: "gender", rotulo: "Género", max: 30 },
  { chave: "birthDate", rotulo: "Data de nascimento", max: 10, tipo: "data" },
  { chave: "nationality", rotulo: "Nacionalidade", max: 100 },
  { chave: "maritalStatus", rotulo: "Estado civil", max: 30 },
  { chave: "taxId", rotulo: "NIF", max: 30, sensivel: true },
  { chave: "identityDocumentNumber", rotulo: "N.º do BI", max: 30, sensivel: true },
  { chave: "identityDocumentExpiresOn", rotulo: "Validade do BI", max: 10, tipo: "data" },
  { chave: "socialSecurityNumber", rotulo: "N.º de segurança social", max: 30, sensivel: true },
  { chave: "addressDetail", rotulo: "Morada", max: 300 },
  { chave: "city", rotulo: "Cidade", max: 100 },
  { chave: "country", rotulo: "País", max: 2, ajuda: "Código de duas letras (AO, PT…)." },
  { chave: "bankName", rotulo: "Banco", max: 100 },
  { chave: "bankAccountNumber", rotulo: "N.º de conta", max: 50, sensivel: true },
  { chave: "iban", rotulo: "IBAN", max: 34, sensivel: true },
  { chave: "emergencyContactName", rotulo: "Contacto de emergência", max: 200 },
  { chave: "emergencyContactRelationship", rotulo: "Relação", max: 50 },
  { chave: "emergencyContactPhone", rotulo: "Telefone de emergência", max: 50 },
] as const satisfies readonly Campo<keyof Omit<TipoDados, "employeeId" | "updatedAt">>[];

const CAMPOS_IMIGRACAO = [
  { chave: "nationality", rotulo: "Nacionalidade", max: 100 },
  { chave: "passportNumber", rotulo: "N.º do passaporte", max: 30, sensivel: true },
  { chave: "passportIssuingCountry", rotulo: "País emissor", max: 2, ajuda: "Código de duas letras." },
  { chave: "passportExpiresOn", rotulo: "Validade do passaporte", max: 10, tipo: "data" },
  { chave: "visaType", rotulo: "Tipo de visto", max: 60 },
  { chave: "visaNumber", rotulo: "N.º do visto", max: 40, sensivel: true },
  { chave: "visaExpiresOn", rotulo: "Validade do visto", max: 10, tipo: "data" },
  { chave: "workPermitNumber", rotulo: "N.º da autorização de trabalho", max: 40, sensivel: true },
  { chave: "workPermitAuthority", rotulo: "Entidade emissora", max: 150 },
  { chave: "workPermitExpiresOn", rotulo: "Validade da autorização", max: 10, tipo: "data" },
  { chave: "notes", rotulo: "Notas", max: 1000, tipo: "texto-longo" },
] as const satisfies readonly Campo<keyof Omit<Imigracao, "employeeId" | "employeeName" | "nextExpiry" | "daysToNextExpiry" | "updatedAt">>[];

type Valores = Record<string, string>;

function valoresDe(campos: readonly Campo<string>[], d: Record<string, unknown>): Valores {
  return Object.fromEntries(campos.map((c) => [c.chave, typeof d[c.chave] === "string" ? (d[c.chave] as string) : ""]));
}

function corpoDe(campos: readonly Campo<string>[], v: Valores): Record<string, string | null> {
  return Object.fromEntries(
    campos.map((c) => {
      const x = normalizarTexto(v[c.chave] ?? "", c.tipo === "texto-longo");
      return [c.chave, x === "" ? null : x];
    }),
  );
}

function Formulario({ id, campos, valores, mudar, erros }: { id: string; campos: readonly Campo<string>[]; valores: Valores; mudar: (k: string, v: string) => void; erros: Record<string, string> }) {
  return (
    <form id={id} noValidate className="grid gap-4 sm:grid-cols-2">
      {campos.map((c) => (
        <Field key={c.chave} rotulo={c.rotulo} erro={erros[c.chave]} ajuda={c.ajuda} className={c.tipo === "texto-longo" || c.chave === "addressDetail" ? "sm:col-span-2" : undefined}>
          {({ id: idCampo, descricao, invalido }) =>
            c.tipo === "texto-longo" ? (
              <Textarea id={idCampo} rows={3} maxLength={c.max} aria-describedby={descricao} invalido={invalido} value={valores[c.chave] ?? ""} onChange={(e) => mudar(c.chave, e.target.value)} />
            ) : (
              <Input
                id={idCampo}
                type={c.tipo === "data" ? "date" : "text"}
                maxLength={c.tipo === "data" ? undefined : c.max}
                autoComplete="off"
                aria-describedby={descricao}
                invalido={invalido}
                value={valores[c.chave] ?? ""}
                onChange={(e) => mudar(c.chave, e.target.value)}
              />
            )
          }
        </Field>
      ))}
    </form>
  );
}

function Editar({
  titulo,
  campos,
  dados,
  ibanAnterior,
  gravar,
}: {
  titulo: string;
  campos: readonly Campo<string>[];
  dados: Record<string, unknown>;
  ibanAnterior: string | null;
  gravar: ReturnType<typeof useGravarDadosPessoais> | ReturnType<typeof useGravarImigracao>;
}) {
  const [aberto, setAberto] = useState(false);
  const [valores, setValores] = useState<Valores>({});
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const erros = tentou ? errosDadosPessoais(valores, ibanAnterior) : {};
  const mudar = (a: boolean) => {
    setAberto(a);
    if (a) setValores(valoresDe(campos, dados));
    else {
      gravar.reset();
      setTentou(false);
    }
  };
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => mudar(true)}>
        <Pencil strokeWidth={1.75} aria-hidden />
        Corrigir
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo={titulo}
        descricao="Grava todos os campos: um campo vazio fica vazio. A trilha regista a alteração, não os valores."
        rotuloConfirmar="Gravar"
        largo
        aCarregar={gravar.isPending}
        erro={gravar.error ? <ErrorPanel erro={gravar.error} /> : undefined}
        aoConfirmar={() => {
          setTentou(true);
          if (Object.keys(errosDadosPessoais(valores, ibanAnterior)).length > 0 || gravar.isPending) return;
          gravar.mutate(corpoDe(campos, valores) as never, { onSuccess: () => mudar(false) });
        }}
      >
        <Formulario id={idForm} campos={campos} valores={valores} mudar={(k, v) => setValores((x) => ({ ...x, [k]: v }))} erros={erros} />
      </Confirmar>
    </>
  );
}

function Lista({ campos, dados }: { campos: readonly Campo<string>[]; dados: Record<string, unknown> }) {
  return (
    <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {campos.map((c) => {
        const v = typeof dados[c.chave] === "string" ? (dados[c.chave] as string) : null;
        let conteudo: ReactNode = v ?? "—";
        if (v && c.tipo === "data") conteudo = formatarData(v);
        else if (c.sensivel) conteudo = <Mascarado valor={v} rotulo={c.rotulo} />;
        return (
          <div key={c.chave} className={c.tipo === "texto-longo" || c.chave === "addressDetail" ? "min-w-0 sm:col-span-2" : "min-w-0"}>
            <dt className="text-sm text-muted-foreground">{c.rotulo}</dt>
            <dd className="whitespace-pre-line break-words text-base text-foreground">{conteudo}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function Mostrados({ employeeId }: { employeeId: string }) {
  const { pode } = useUtilizador();
  const dados = useDadosPessoais(employeeId, true);
  const imigracao = useImigracao(employeeId, true);
  const gravarDados = useGravarDadosPessoais(employeeId);
  const gravarImigracao = useGravarImigracao(employeeId);
  const escreve = pode("hr.personal_data.write");
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle>Dados pessoais</CardTitle>
          {escreve && dados.data ? <Editar titulo="Corrigir os dados pessoais" campos={CAMPOS_PESSOAIS} dados={dados.data} ibanAnterior={dados.data.iban} gravar={gravarDados} /> : null}
        </div>
        {dados.isPending ? (
          <Skeleton className="mt-3 h-40" />
        ) : dados.error ? (
          <ErrorPanel erro={dados.error} className="mt-3" tentarDeNovo={() => void dados.refetch()} />
        ) : (
          <>
            <Lista campos={CAMPOS_PESSOAIS} dados={dados.data} />
            <p className="mt-3 text-xs text-muted-foreground">{dados.data.updatedAt ? `Actualizado a ${formatarDataHora(dados.data.updatedAt)}.` : "Ainda sem dados pessoais registados."}</p>
          </>
        )}
      </Card>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle>Imigração</CardTitle>
          {escreve && imigracao.data ? <Editar titulo="Corrigir a documentação de imigração" campos={CAMPOS_IMIGRACAO} dados={imigracao.data} ibanAnterior={null} gravar={gravarImigracao} /> : null}
        </div>
        {imigracao.isPending ? (
          <Skeleton className="mt-3 h-32" />
        ) : imigracao.error ? (
          <ErrorPanel erro={imigracao.error} className="mt-3" tentarDeNovo={() => void imigracao.refetch()} />
        ) : (
          <>
            {imigracao.data.nextExpiry ? <ProximaValidade data={imigracao.data.nextExpiry} dias={imigracao.data.daysToNextExpiry} /> : null}
            <Lista campos={CAMPOS_IMIGRACAO} dados={imigracao.data} />
          </>
        )}
      </Card>
    </div>
  );
}

export function ProximaValidade({ data, dias }: { data: string; dias: number | string | null }) {
  const n = dias === null ? null : Number(dias);
  if (n !== null && n < 0) return <Alert tom="erro" className="mt-3" titulo={`Documento caducado a ${formatarData(data)}.`} />;
  if (n !== null && n <= 60) return <Alert tom="aviso" className="mt-3" titulo={`O próximo documento caduca a ${formatarData(data)} (${n} ${n === 1 ? "dia" : "dias"}).`} />;
  return <p className="mt-3 text-sm text-muted-foreground">Próxima validade: {formatarData(data)}.</p>;
}

export function DadosPessoais({ employeeId }: { employeeId: string }) {
  const [ver, setVer] = useState(false);
  if (!ver)
    return (
      <Card className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">Dados pessoais, bancários, de emergência e de imigração. Só se carregam quando pedir, e os números aparecem mascarados.</p>
        <Button variante="secondary" onClick={() => setVer(true)}>
          <Eye strokeWidth={1.75} aria-hidden />
          Ver dados pessoais
        </Button>
      </Card>
    );
  return <Mostrados employeeId={employeeId} />;
}
