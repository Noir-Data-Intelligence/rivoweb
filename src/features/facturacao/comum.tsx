/** Peças partilhadas pelos ecrãs de facturação. */
import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Mail, XCircle } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/mini";
import { useUtilizador } from "@/features/identity";
import { formatarMoeda } from "@/lib/format/numero";
import { dinheiro } from "@/lib/money/money";
import { texto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field } from "@/ui/Field";
import { useDescarregarPdf, useEnviarDocumento, type TipoDocumento } from "./api";

export const AVISO_DEFINITIVO = "Este documento fica registado e não se apaga. Só se pode anular, e a anulação também fica registada.";

export const NOME_TIPO: Readonly<Record<string, string>> = {
  FT: "Factura",
  FR: "Factura-recibo",
  ND: "Nota de débito",
  NC: "Nota de crédito",
  RG: "Recibo",
  PF: "Pró-forma",
};

/** Meios de pagamento (Facto: `PaymentMethod`, códigos SAF-T). */
export const MEIOS: Readonly<Record<string, string>> = {
  NU: "Numerário",
  TB: "Transferência bancária",
  CH: "Cheque",
  CC: "Cartão de crédito",
  CD: "Cartão de débito",
  MB: "Multicaixa",
  PR: "Permuta",
  CS: "Compensação de saldos",
  DE: "Dinheiro electrónico",
  OU: "Outro",
};

export type Valor = number | string;
export const moeda = (v: Valor, m = "AOA") => formatarMoeda(dinheiro(v), m);

export function EstadoDocumento({ estado }: { estado: string }) {
  if (estado === "Normal") return <Badge tom="sucesso">Em vigor</Badge>;
  if (estado === "Cancelled") return <Badge tom="erro">Anulado</Badge>;
  if (estado === "Open") return <Badge tom="info">Em aberto</Badge>;
  if (estado === "Converted") return <Badge tom="sucesso">Convertida</Badge>;
  return <Badge>{estado}</Badge>;
}

export function DescarregarPdf({ tipo, id, numero }: { tipo: TipoDocumento; id: string; numero: string }) {
  const pdf = useDescarregarPdf();
  return (
    <>
      <Button variante="secondary" aCarregar={pdf.isPending} onClick={() => pdf.mutate({ tipo, id, numero })}>
        <Download strokeWidth={1.75} aria-hidden />
        PDF
      </Button>
      {pdf.error ? <ErrorPanel erro={pdf.error} className="mt-2 w-full" /> : null}
    </>
  );
}

/** Envia por e-mail ao cliente: efeito externo, com confirmação própria (§5.4). */
export function EnviarPorEmail({ tipo, id, numero }: { tipo: TipoDocumento; id: string; numero: string }) {
  const { pode } = useUtilizador();
  const [aberto, setAberto] = useState(false);
  const enviar = useEnviarDocumento();
  if (!pode("finance.documents.deliver")) return null;
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        <Mail strokeWidth={1.75} aria-hidden />
        Enviar ao cliente
      </Button>
      {enviar.isSuccess ? <Alert tom="sucesso" className="w-full" titulo={`${numero} enviado para ${enviar.data.enviadoPara}.`} /> : null}
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a && !enviar.isSuccess) enviar.reset();
        }}
        titulo={`Enviar ${numero} ao cliente?`}
        descricao="Sai um e-mail para o endereço do cliente com o documento em PDF. Não se pode desfazer."
        rotuloConfirmar="Enviar e-mail"
        aCarregar={enviar.isPending}
        erro={enviar.error ? <ErrorPanel erro={enviar.error} /> : undefined}
        aoConfirmar={() => (enviar.isPending ? undefined : enviar.mutate({ tipo, id }, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

const esquemaRazao = z.object({ razao: texto({ max: 200, obrigatorio: "Indique o motivo da anulação." }) });

/** Anular um documento emitido: pede o motivo e avisa que fica registado. */
export function Anular({
  numero,
  aCarregar,
  erro,
  aoAnular,
  aviso,
}: {
  numero: string;
  aCarregar: boolean;
  erro: unknown;
  aoAnular: (razao: string, fechar: () => void) => void;
  aviso?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const idForm = useId();
  const form = useForm<{ razao: string }>({ resolver: zodResolver(esquemaRazao), defaultValues: { razao: "" } });
  const fechar = () => {
    setAberto(false);
    form.reset();
  };
  return (
    <>
      <Button variante="ghost" onClick={() => setAberto(true)}>
        <XCircle strokeWidth={1.75} aria-hidden />
        Anular
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => (a ? setAberto(true) : fechar())}
        titulo={`Anular ${numero}?`}
        descricao={aviso ?? "O documento fica anulado, com o motivo, e continua no registo. Não se pode desfazer."}
        rotuloConfirmar="Anular documento"
        variante="destructive"
        aCarregar={aCarregar}
        erro={erro ? <ErrorPanel erro={erro} /> : undefined}
        formulario={idForm}
      >
        <form id={idForm} noValidate onSubmit={form.handleSubmit((d) => (aCarregar ? undefined : aoAnular(d.razao, fechar)))}>
          <Field rotulo="Motivo" erro={form.formState.errors.razao?.message} ajuda="Fica no documento e na trilha de auditoria.">
            {({ id, descricao, invalido }) => <Textarea id={id} maxLength={200} aria-describedby={descricao} invalido={invalido} {...form.register("razao")} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

/** Linhas de um documento emitido, com os valores do servidor. */
export function LinhasDocumento({
  linhas,
  moedaDoc,
}: {
  linhas: readonly { lineNumber: Valor; description: string; quantity: Valor; unitPrice: Valor; taxCode: string; taxPercentage: Valor; netAmount: Valor; taxAmount: Valor }[];
  moedaDoc: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" aria-label="Linhas">
        <thead>
          <tr className="border-b border-border bg-muted text-[13px] text-muted-foreground">
            <th scope="col" className="h-9 px-3 text-left font-medium">Descrição</th>
            <th scope="col" className="h-9 px-3 text-right font-medium">Qtd.</th>
            <th scope="col" className="hidden h-9 px-3 text-right font-medium sm:table-cell">Preço</th>
            <th scope="col" className="hidden h-9 px-3 text-right font-medium md:table-cell">IVA</th>
            <th scope="col" className="h-9 px-3 text-right font-medium">Líquido</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={String(l.lineNumber)} className="border-b border-border last:border-0">
              <td className="px-3 py-2 text-foreground">{l.description}</td>
              <td className="px-3 py-2 text-right tabular-nums">{String(l.quantity).replace(".", ",")}</td>
              <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">{moeda(l.unitPrice, moedaDoc)}</td>
              <td className="hidden px-3 py-2 text-right tabular-nums md:table-cell">
                {l.taxCode} {String(l.taxPercentage).replace(".", ",")}&thinsp;% · {moeda(l.taxAmount, moedaDoc)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{moeda(l.netAmount, moedaDoc)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Totais de um documento emitido. */
export function Totais({ linhas }: { linhas: readonly [string, string][] }) {
  return (
    <dl className="ml-auto mt-3 grid w-full max-w-xs grid-cols-2 gap-x-4 gap-y-1 text-sm">
      {linhas.map(([r, v], i) => (
        <div key={r} className="contents">
          <dt className={i === linhas.length - 1 ? "font-semibold text-foreground" : "text-muted-foreground"}>{r}</dt>
          <dd className={`text-right tabular-nums ${i === linhas.length - 1 ? "font-semibold text-foreground" : "text-foreground"}`}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
