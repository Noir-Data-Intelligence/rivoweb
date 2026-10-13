import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { z } from "zod/mini";
import { Can, useUtilizador } from "@/features/identity";
import { aplicarErrosDoServidor } from "@/lib/api/formulario";
import { eApiError, eConflitoDeVersao } from "@/lib/api/problem";
import { emailOpcional, texto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader, Skeleton } from "@/ui/Layout";
import { useCliente, useContactos, useCorrigirCliente, useEliminarCliente, useEstadoCliente, useGuardarContacto, useRemoverContacto, type Contacto, type FichaCliente } from "../api";
import { CAMPOS_CLIENTE, CamposCliente, esquemaCliente, TIPOS_CONTA, type DadosCliente } from "./Clientes";

type Ficha = { dados: FichaCliente; versao: string | null; recarregar: () => void };

function ErroComVersao({ erro, recarregar }: { erro: unknown; recarregar: () => void }) {
  if (!eConflitoDeVersao(erro)) return <ErrorPanel erro={erro} />;
  return (
    <Alert tom="erro" titulo="Alguém alterou este cliente entretanto." accao={<Button variante="secondary" tamanho="sm" onClick={recarregar}>Recarregar</Button>}>
      Nada foi gravado. Recarregue, reveja e repita.
    </Alert>
  );
}

const vazio = (v: string) => (v === "" ? null : v);

function Corrigir({ ficha }: { ficha: Ficha }) {
  const [aberto, setAberto] = useState(false);
  const corrigir = useCorrigirCliente(ficha.dados.customerId, ficha.versao);
  const idForm = useId();
  const [soltas, setSoltas] = useState<string[]>([]);
  const d = ficha.dados;
  const form = useForm<DadosCliente>({
    resolver: zodResolver(esquemaCliente),
    values: {
      name: d.name,
      taxId: d.taxId,
      addressDetail: d.billingAddress.detail,
      city: d.billingAddress.city,
      country: d.billingAddress.country,
      email: d.email ?? "",
      phone: d.phone ?? "",
      industry: d.industry ?? "",
      website: d.website ?? "",
      contactPerson: d.contactPerson ?? "",
      accountType: d.accountType,
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
        titulo="Corrigir dados do cliente"
        descricao="O NIF não se corrige. Os documentos já emitidos mantêm os dados da altura."
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
                addressDetail: v.addressDetail,
                city: v.city,
                country: v.country,
                email: vazio(v.email),
                phone: vazio(v.phone),
                industry: vazio(v.industry),
                website: vazio(v.website),
                contactPerson: vazio(v.contactPerson),
                accountType: v.accountType,
              },
              { onSuccess: () => fechar(false), onError: (e) => setSoltas(aplicarErrosDoServidor(e, form.setError, CAMPOS_CLIENTE)) },
            );
          })}
        >
          <CamposCliente form={form} comNif={false} />
        </form>
      </Confirmar>
    </>
  );
}

function EstadoEEliminar({ ficha }: { ficha: Ficha }) {
  const navegar = useNavigate();
  const [estadoAberto, setEstadoAberto] = useState(false);
  const [eliminarAberto, setEliminarAberto] = useState(false);
  const estado = useEstadoCliente(ficha.dados.customerId, ficha.versao);
  const eliminar = useEliminarCliente();
  const activo = ficha.dados.status === "Active";
  const temHistoria = eApiError(eliminar.error) && eliminar.error.status === 409;
  return (
    <>
      <Button variante="ghost" onClick={() => setEstadoAberto(true)}>
        {activo ? "Desactivar" : "Reactivar"}
      </Button>
      <Button variante="ghost" onClick={() => setEliminarAberto(true)}>
        <Trash2 strokeWidth={1.75} aria-hidden />
        Eliminar
      </Button>
      <Confirmar
        aberto={estadoAberto}
        aoMudar={(a) => {
          setEstadoAberto(a);
          if (!a) estado.reset();
        }}
        titulo={activo ? "Desactivar o cliente?" : "Reactivar o cliente?"}
        descricao={activo ? "Deixa de aparecer nas listas de facturação; não se pode facturar a um cliente inactivo. Os documentos ficam." : "Volta a poder ser facturado."}
        rotuloConfirmar={activo ? "Desactivar" : "Reactivar"}
        variante={activo ? "destructive" : "primary"}
        aCarregar={estado.isPending}
        erro={estado.error ? <ErroComVersao erro={estado.error} recarregar={ficha.recarregar} /> : undefined}
        aoConfirmar={() => (estado.isPending ? undefined : estado.mutate(!activo, { onSuccess: () => setEstadoAberto(false) }))}
      />
      <Confirmar
        aberto={eliminarAberto}
        aoMudar={(a) => {
          setEliminarAberto(a);
          if (!a) eliminar.reset();
        }}
        titulo="Eliminar o cliente?"
        descricao="Só é possível se o cliente não tiver documentos nem história. Com história, desactive-o."
        rotuloConfirmar={temHistoria && activo ? "Desactivar em vez disso" : "Eliminar"}
        variante="destructive"
        aCarregar={eliminar.isPending || estado.isPending}
        erro={eliminar.error ? <ErrorPanel erro={eliminar.error} /> : undefined}
        aoConfirmar={() => {
          if (temHistoria) {
            if (activo && !estado.isPending) estado.mutate(false, { onSuccess: () => setEliminarAberto(false) });
            return;
          }
          if (!eliminar.isPending) eliminar.mutate(ficha.dados.customerId, { onSuccess: () => void navegar("/clientes") });
        }}
      />
    </>
  );
}

const esquemaContacto = z.object({
  name: texto({ max: 200, obrigatorio: "Escreva o nome." }),
  role: texto({ max: 100 }),
  email: emailOpcional,
  phone: texto({ max: 50 }),
  decisionMaker: z.boolean(),
  billingContact: z.boolean(),
});
type DadosContacto = z.infer<typeof esquemaContacto>;

function FormularioContacto({ customerId, contacto, aberto, aoMudar }: { customerId: string; contacto: Contacto | null; aberto: boolean; aoMudar: (a: boolean) => void }) {
  const guardar = useGuardarContacto(customerId);
  const idForm = useId();
  const [soltas, setSoltas] = useState<string[]>([]);
  const form = useForm<DadosContacto>({
    resolver: zodResolver(esquemaContacto),
    values: {
      name: contacto?.name ?? "",
      role: contacto?.role ?? "",
      email: contacto?.email ?? "",
      phone: contacto?.phone ?? "",
      decisionMaker: contacto?.decisionMaker ?? false,
      billingContact: contacto?.billingContact ?? false,
    },
  });
  const fechar = (a: boolean) => {
    aoMudar(a);
    if (!a) {
      form.reset();
      guardar.reset();
      setSoltas([]);
    }
  };
  return (
    <Confirmar
      aberto={aberto}
      aoMudar={fechar}
      titulo={contacto ? "Rever contacto" : "Novo contacto"}
      rotuloConfirmar="Guardar"
      aCarregar={guardar.isPending}
      erro={
        soltas.length > 0 ? (
          <Alert tom="erro" titulo="Não foi possível guardar.">
            {soltas.join(" ")}
          </Alert>
        ) : guardar.error && !(eApiError(guardar.error) && guardar.error.status === 400) ? (
          <ErrorPanel erro={guardar.error} />
        ) : undefined
      }
      formulario={idForm}
    >
      <form
        id={idForm}
        noValidate
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={form.handleSubmit((v) => {
          if (guardar.isPending) return;
          setSoltas([]);
          guardar.mutate(
            { contactId: contacto?.contactId ?? null, corpo: { name: v.name, role: vazio(v.role), email: vazio(v.email), phone: vazio(v.phone), decisionMaker: v.decisionMaker, billingContact: v.billingContact } },
            { onSuccess: () => fechar(false), onError: (e) => setSoltas(aplicarErrosDoServidor(e, form.setError, ["name", "role", "email", "phone"])) },
          );
        })}
      >
        <Field rotulo="Nome" erro={form.formState.errors.name?.message}>
          {({ id, descricao, invalido }) => <Input id={id} maxLength={200} aria-describedby={descricao} invalido={invalido} {...form.register("name")} />}
        </Field>
        <Field rotulo="Função" erro={form.formState.errors.role?.message}>
          {({ id, descricao, invalido }) => <Input id={id} maxLength={100} aria-describedby={descricao} invalido={invalido} {...form.register("role")} />}
        </Field>
        <Field rotulo="E-mail" erro={form.formState.errors.email?.message}>
          {({ id, descricao, invalido }) => <Input id={id} type="email" maxLength={200} aria-describedby={descricao} invalido={invalido} {...form.register("email")} />}
        </Field>
        <Field rotulo="Telefone" erro={form.formState.errors.phone?.message}>
          {({ id, descricao, invalido }) => <Input id={id} type="tel" maxLength={50} aria-describedby={descricao} invalido={invalido} {...form.register("phone")} />}
        </Field>
        <Checkbox rotulo="Decide compras" {...form.register("decisionMaker")} />
        <Checkbox rotulo="Contacto de facturação" {...form.register("billingContact")} />
      </form>
    </Confirmar>
  );
}

function Contactos({ customerId }: { customerId: string }) {
  const contactos = useContactos(customerId);
  const remover = useRemoverContacto(customerId);
  const { pode } = useUtilizador();
  const podeEscrever = pode("commercial.customers.write");
  const [aberto, setAberto] = useState(false);
  const [aEditar, setAEditar] = useState<Contacto | null>(null);
  const [aRemover, setARemover] = useState<Contacto | null>(null);
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <CardTitle>Contactos</CardTitle>
        {podeEscrever ? (
          <Button
            variante="secondary"
            tamanho="sm"
            onClick={() => {
              setAEditar(null);
              setAberto(true);
            }}
          >
            <Plus strokeWidth={1.75} aria-hidden />
            Contacto
          </Button>
        ) : null}
      </div>
      {contactos.isPending ? (
        <Skeleton className="mt-3 h-12" />
      ) : contactos.error ? (
        <ErrorPanel erro={contactos.error} tentarDeNovo={() => void contactos.refetch()} className="mt-3" />
      ) : contactos.data.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Sem contactos.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border text-sm">
          {contactos.data.map((c) => (
            <li key={c.contactId} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium text-foreground">
                  {c.name}
                  {c.role ? <span className="font-normal text-muted-foreground"> · {c.role}</span> : null}
                </p>
                <p className="break-words text-muted-foreground">{[c.email, c.phone].filter(Boolean).join(" · ") || "—"}</p>
                <span className="mt-1 flex gap-1">
                  {c.decisionMaker ? <Badge tom="info">Decide</Badge> : null}
                  {c.billingContact ? <Badge>Facturação</Badge> : null}
                </span>
              </div>
              {podeEscrever ? (
                <span className="flex gap-1">
                  <Button
                    variante="ghost"
                    tamanho="sm"
                    aria-label={`Rever ${c.name}`}
                    onClick={() => {
                      setAEditar(c);
                      setAberto(true);
                    }}
                  >
                    <Pencil strokeWidth={1.75} aria-hidden />
                  </Button>
                  <Button variante="ghost" tamanho="sm" aria-label={`Remover ${c.name}`} onClick={() => setARemover(c)}>
                    <Trash2 strokeWidth={1.75} aria-hidden />
                  </Button>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {podeEscrever && aberto ? <FormularioContacto customerId={customerId} contacto={aEditar} aberto={aberto} aoMudar={setAberto} /> : null}
      <Confirmar
        aberto={aRemover !== null}
        aoMudar={(a) => {
          if (!a) {
            setARemover(null);
            remover.reset();
          }
        }}
        titulo={`Remover ${aRemover?.name ?? "o contacto"}?`}
        rotuloConfirmar="Remover"
        variante="destructive"
        aCarregar={remover.isPending}
        erro={remover.error ? <ErrorPanel erro={remover.error} /> : undefined}
        aoConfirmar={() => (aRemover && !remover.isPending ? remover.mutate(aRemover.contactId, { onSuccess: () => setARemover(null) }) : undefined)}
      />
    </Card>
  );
}

export default function Cliente() {
  const { customerId = "" } = useParams();
  const cliente = useCliente(customerId);
  const { pode } = useUtilizador();
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/clientes">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Clientes
      </Link>
    </Button>
  );
  if (cliente.isPending) return <CarregandoPagina />;
  if (cliente.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={cliente.error} tentarDeNovo={() => void cliente.refetch()} />
      </>
    );
  }
  const ficha: Ficha = { dados: cliente.data.dados, versao: cliente.data.versao, recarregar: () => void cliente.refetch() };
  const d = ficha.dados;
  const linha = (r: string, v: string | null) => (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{r}</dt>
      <dd className="break-words text-base text-foreground">{v || "—"}</dd>
    </div>
  );
  return (
    <>
      {voltar}
      <PageHeader
        titulo={d.name}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            {d.status === "Active" ? <Badge tom="sucesso">Activo</Badge> : <Badge tom="aviso">Inactivo</Badge>}
            <span>NIF {d.taxId}</span>
            <span>· {TIPOS_CONTA[d.accountType]}</span>
          </span>
        }
      />
      <Can requer="commercial.customers.write">
        <div className="mb-6 flex flex-wrap gap-2">
          <Corrigir ficha={ficha} />
          <EstadoEEliminar ficha={ficha} />
        </div>
      </Can>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Dados</CardTitle>
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {linha("Morada de facturação", `${d.billingAddress.detail}, ${d.billingAddress.city}, ${d.billingAddress.country}`)}
            {linha("E-mail", d.email)}
            {linha("Telefone", d.phone)}
            {linha("Pessoa de contacto", d.contactPerson)}
            {linha("Sector", d.industry)}
            {linha("Sítio na internet", d.website)}
          </dl>
          {pode("finance.invoices.read") ? (
            <Button asChild variante="link" className="mt-4">
              <Link to={`/facturas?cliente=${d.customerId}`}>Ver facturas deste cliente</Link>
            </Button>
          ) : null}
        </Card>
        <Contactos customerId={d.customerId} />
      </div>
    </>
  );
}
