import { useId, useState, type ReactNode } from "react";
import { formatarData, hojeIso } from "@/lib/format/data";
import { erroDoCampo } from "@/lib/api/problem";
import { IsoDate } from "@/lib/validation/text";
import { Button, type ButtonProps } from "./Button";
import { Confirmar } from "./Confirmar";
import { Textarea } from "./Controlos";
import { ErrorPanel } from "./ErrorPanel";
import { Field, Input } from "./Field";

/**
 * Botão que abre uma confirmação com motivo (obrigatório) e um dia (hoje por
 * omissão, não futuro, não antes de `desde`): anular um reembolso ou um
 * adiantamento, com o dia em que o dinheiro voltou. Envia `{ reason,
 * returnedOn }`; os 400 em `errors.reason` e `errors.returnedOn` ficam junto
 * do campo, e o diálogo não fecha.
 */
export function ConfirmarComMotivoEData({
  rotuloBotao,
  icone,
  varianteBotao = "ghost",
  tamanhoBotao,
  rotuloAcessivel,
  titulo,
  descricao,
  rotuloConfirmar,
  rotuloData,
  desde,
  aCarregar,
  erro,
  aoConfirmar,
  aoFechar,
}: {
  rotuloBotao: string;
  icone?: ReactNode;
  varianteBotao?: ButtonProps["variante"];
  tamanhoBotao?: ButtonProps["tamanho"];
  /** O nome do botão para leitores de ecrã, quando há um por linha. */
  rotuloAcessivel?: string;
  titulo: string;
  descricao: ReactNode;
  rotuloConfirmar: string;
  rotuloData: string;
  /** O dia mais antigo aceite (AAAA-MM-DD), por exemplo o do reembolso. */
  desde?: string | null | undefined;
  aCarregar: boolean;
  /** O erro do pedido, cru: os 400 de campo vão para o campo. */
  erro: unknown;
  aoConfirmar: (corpo: { reason: string; returnedOn: string }, fechar: () => void) => void;
  /** Ao fechar (cancelar ou depois do sucesso): por exemplo, limpar o erro do pedido. */
  aoFechar?: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [dia, setDia] = useState(hojeIso());
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const hoje = hojeIso();
  const erroMotivo = motivo.trim() === "" ? "Indique o motivo." : undefined;
  const erroDia = !IsoDate.safeParse(dia).success
    ? "Indique o dia."
    : dia > hoje
      ? "Não pode ser depois de hoje."
      : desde && dia < desde
        ? `Não pode ser antes de ${formatarData(desde)}.`
        : undefined;
  const doServidorMotivo = erroDoCampo(erro, "reason");
  const doServidorDia = erroDoCampo(erro, "returnedOn");
  const fechar = () => {
    setAberto(false);
    setMotivo("");
    setDia(hojeIso());
    setTentou(false);
    aoFechar?.();
  };
  return (
    <>
      <Button variante={varianteBotao} {...(tamanhoBotao ? { tamanho: tamanhoBotao } : {})} {...(rotuloAcessivel ? { "aria-label": rotuloAcessivel } : {})} onClick={() => setAberto(true)}>
        {icone}
        {rotuloBotao}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => (a ? setAberto(true) : fechar())}
        titulo={titulo}
        descricao={descricao}
        rotuloConfirmar={rotuloConfirmar}
        variante="destructive"
        aCarregar={aCarregar}
        erro={erro && !doServidorMotivo && !doServidorDia ? <ErrorPanel erro={erro} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erroMotivo || erroDia || aCarregar) return;
            aoConfirmar({ reason: motivo.trim(), returnedOn: dia }, fechar);
          }}
        >
          <Field rotulo="Motivo" erro={(tentou ? erroMotivo : undefined) ?? doServidorMotivo} ajuda="Fica no registo e na trilha de auditoria.">
            {({ id, descricao: d, invalido }) => <Textarea id={id} rows={2} maxLength={500} aria-describedby={d} aria-invalid={invalido || undefined} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
          </Field>
          <Field rotulo={rotuloData} erro={(tentou ? erroDia : undefined) ?? doServidorDia}>
            {({ id, descricao: d, invalido }) => (
              <Input id={id} type="date" max={hoje} min={desde ?? undefined} aria-describedby={d} invalido={invalido} value={dia} onChange={(e) => setDia(e.target.value)} />
            )}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}
