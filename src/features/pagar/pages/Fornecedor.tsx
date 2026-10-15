/** Ficha de um fornecedor (§5.6): dados, correcção e estado. */
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Pencil } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router";
import { Can } from "@/features/identity";
import { aplicarErrosDoServidor } from "@/lib/api/formulario";
import { eApiError, eConflitoDeVersao } from "@/lib/api/problem";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import { useCorrigirFornecedor, useEstadoFornecedor, useFornecedor, type Fornecedor as TipoFornecedor } from "../api";
import { CAMPOS_FORNECEDOR, CamposFornecedor, EstadoFornecedor, esquemaFornecedor, vazio, type DadosFornecedor } from "./Fornecedores";

type Ficha = { dados: TipoFornecedor; versao: string | null; recarregar: () => void };

function ErroComVersao({ erro, recarregar }: { erro: unknown; recarregar: () => void }) {
  if (!eConflitoDeVersao(erro)) return <ErrorPanel erro={erro} />;
  return (
    <Alert tom="erro" titulo="Alguém alterou este fornecedor entretanto." accao={<Button variante="secondary" tamanho="sm" onClick={recarregar}>Recarregar</Button>}>
      Nada foi gravado. Recarregue, reveja e repita.
    </Alert>
  );
}

function Corrigir({ ficha }: { ficha: Ficha }) {
  const [aberto, setAberto] = useState(false);
  const corrigir = useCorrigirFornecedor(ficha.dados.supplierId, ficha.versao);
  const idForm = useId();
  const [soltas, setSoltas] = useState<string[]>([]);
  const d = ficha.dados;
  const form = useForm<DadosFornecedor>({
    resolver: zodResolver(esquemaFornecedor),
    values: {
      name: d.name,
      taxId: d.taxId,
      iban: d.iban ?? "",
      email: d.email ?? "",
      phone: d.phone ?? "",
      contactPerson: d.contactPerson ?? "",
      addressDetail: d.addressDetail ?? "",
      city: d.city ?? "",
      country: d.country ?? "",
    },
  });
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      form.reset();
      corrigir.reset();
      setSoltas([]);
    }
  };
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        <Pencil strokeWidth={1.75} aria-hidden />
        Corrigir dados
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo="Corrigir dados do fornecedor"
        descricao="O NIF não se corrige. As facturas já registadas mantêm os dados da altura."
        rotuloConfirmar="Guardar"
        aCarregar={corrigir.isPending}
        erro={
          soltas.length > 0 ? (
            <Alert tom="erro" titulo="Não foi possível guardar.">
              {soltas.join(" ")}
            </Alert>
          ) : corrigir.error && !(eApiError(corrigir.error) && corrigir.error.status === 400) ? (
            <ErroComVersao erro={corrigir.error} recarregar={ficha.recarregar} />
          ) : undefined
        }
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="max-h-[60vh] overflow-y-auto px-0.5"
          onSubmit={form.handleSubmit((v) => {
            if (corrigir.isPending) return;
            setSoltas([]);
            corrigir.mutate(
              {
                name: v.name,
                iban: vazio(v.iban),
                email: vazio(v.email),
                phone: vazio(v.phone),
                contactPerson: vazio(v.contactPerson),
                addressDetail: vazio(v.addressDetail),
                city: vazio(v.city),
                country: vazio(v.country),
              },
              { onSuccess: () => fechar(false), onError: (e) => setSoltas(aplicarErrosDoServidor(e, form.setError, CAMPOS_FORNECEDOR)) },
            );
          })}
        >
          <CamposFornecedor form={form} comNif={false} />
        </form>
      </Confirmar>
    </>
  );
}

function Estado({ ficha }: { ficha: Ficha }) {
  const [aberto, setAberto] = useState(false);
  const estado = useEstadoFornecedor(ficha.dados.supplierId, ficha.versao);
  const activo = ficha.dados.status === "Active";
  return (
    <>
      <Button variante="ghost" onClick={() => setAberto(true)}>
        {activo ? "Desactivar" : "Reactivar"}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) estado.reset();
        }}
        titulo={activo ? "Desactivar o fornecedor?" : "Reactivar o fornecedor?"}
        descricao={activo ? "Deixa de aparecer ao registar facturas de compra. O que já está registado fica." : "Volta a aparecer ao registar facturas de compra."}
        rotuloConfirmar={activo ? "Desactivar" : "Reactivar"}
        variante={activo ? "destructive" : "primary"}
        aCarregar={estado.isPending}
        erro={estado.error ? <ErroComVersao erro={estado.error} recarregar={ficha.recarregar} /> : undefined}
        aoConfirmar={() => (estado.isPending ? undefined : estado.mutate(!activo, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="text-sm text-muted-foreground sm:w-40 sm:shrink-0">{rotulo}</dt>
      <dd className="break-words text-sm text-foreground">{valor || "—"}</dd>
    </div>
  );
}

export default function Fornecedor() {
  const { supplierId = "" } = useParams();
  const q = useFornecedor(supplierId);
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/fornecedores">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Fornecedores
      </Link>
    </Button>
  );
  if (q.isPending) return <CarregandoPagina />;
  if (q.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={q.error} tentarDeNovo={() => void q.refetch()} />
      </>
    );
  }
  const ficha: Ficha = { dados: q.data.dados, versao: q.data.versao, recarregar: () => void q.refetch() };
  const f = ficha.dados;
  return (
    <>
      {voltar}
      <PageHeader
        titulo={f.name}
        descricao={<EstadoFornecedor estado={f.status} />}
        accao={
          <Can requer="procurement.suppliers.write">
            <div className="flex flex-wrap gap-2">
              <Corrigir ficha={ficha} />
              <Estado ficha={ficha} />
            </div>
          </Can>
        }
      />
      <Card>
        <CardTitle>Dados</CardTitle>
        <dl className="mt-3 flex flex-col gap-2">
          <Linha rotulo="NIF" valor={f.taxId} />
          <Linha rotulo="IBAN" valor={f.iban} />
          <Linha rotulo="E-mail" valor={f.email} />
          <Linha rotulo="Telefone" valor={f.phone} />
          <Linha rotulo="Pessoa de contacto" valor={f.contactPerson} />
          <Linha rotulo="Morada" valor={[f.addressDetail, f.city, f.country].filter(Boolean).join(", ")} />
        </dl>
      </Card>
    </>
  );
}
