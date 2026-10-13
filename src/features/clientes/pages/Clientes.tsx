import { zodResolver } from "@hookform/resolvers/zod";
import { FileUp, Plus } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { z } from "zod/mini";
import { Can } from "@/features/identity";
import { aplicarErrosDoServidor } from "@/lib/api/formulario";
import { eApiError } from "@/lib/api/problem";
import { emailOpcional, texto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useClientes, useImportarClientes, useRegistarCliente, type ResumoCliente } from "../api";

export const TIPOS_CONTA = { Customer: "Cliente", Prospect: "Potencial cliente", Partner: "Parceiro" } as const;

export const esquemaCliente = z.object({
  name: texto({ max: 200, obrigatorio: "Escreva o nome." }),
  taxId: texto({ max: 30, obrigatorio: "Escreva o NIF." }),
  addressDetail: texto({ max: 300, obrigatorio: "Escreva a morada de facturação." }),
  city: texto({ max: 100, obrigatorio: "Escreva a cidade." }),
  country: z.string().check(
    z.overwrite((v) => v.trim().toUpperCase()),
    z.regex(/^[A-Z]{2}$/, "Código do país com duas letras (AO, PT…)."),
  ),
  email: emailOpcional,
  phone: texto({ max: 50 }),
  industry: texto({ max: 120 }),
  website: texto({ max: 300 }),
  contactPerson: texto({ max: 200 }),
  accountType: z.enum(["Customer", "Prospect", "Partner"]),
});
export type DadosCliente = z.infer<typeof esquemaCliente>;
export const CAMPOS_CLIENTE = Object.keys(esquemaCliente.shape) as (keyof DadosCliente)[];

const ROTULOS: Readonly<Record<keyof DadosCliente, string>> = {
  name: "Nome",
  taxId: "NIF",
  addressDetail: "Morada de facturação",
  city: "Cidade",
  country: "País",
  email: "E-mail",
  phone: "Telefone",
  industry: "Sector",
  website: "Sítio na internet",
  contactPerson: "Pessoa de contacto",
  accountType: "Tipo",
};

/** Campos do cliente, partilhados pelo registo e pela correcção (o NIF não se corrige). */
export function CamposCliente({ form, comNif }: { form: ReturnType<typeof useForm<DadosCliente>>; comNif: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {CAMPOS_CLIENTE.filter((c) => comNif || c !== "taxId").map((c) =>
        c === "accountType" ? (
          <Field key={c} rotulo={ROTULOS[c]} erro={form.formState.errors[c]?.message}>
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} {...form.register(c)}>
                {Object.entries(TIPOS_CONTA).map(([k, n]) => (
                  <option key={k} value={k}>
                    {n}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ) : (
          <Field key={c} rotulo={ROTULOS[c]} erro={form.formState.errors[c]?.message} className={c === "addressDetail" ? "sm:col-span-2" : undefined}>
            {({ id, descricao, invalido }) => (
              <Input
                id={id}
                type={c === "email" ? "email" : c === "website" ? "url" : "text"}
                maxLength={c === "country" ? 2 : 300}
                autoComplete="off"
                aria-describedby={descricao}
                invalido={invalido}
                {...form.register(c)}
              />
            )}
          </Field>
        ),
      )}
    </div>
  );
}

const vazio = (v: string) => (v === "" ? null : v);

function NovoCliente() {
  const navegar = useNavigate();
  const [aberto, setAberto] = useState(false);
  const registar = useRegistarCliente();
  const idForm = useId();
  const [soltas, setSoltas] = useState<string[]>([]);
  const inicial: DadosCliente = { name: "", taxId: "", addressDetail: "", city: "", country: "AO", email: "", phone: "", industry: "", website: "", contactPerson: "", accountType: "Customer" };
  const form = useForm<DadosCliente>({ resolver: zodResolver(esquemaCliente), defaultValues: inicial });
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      form.reset(inicial);
      registar.reset();
      setSoltas([]);
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Novo cliente
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo="Novo cliente"
        rotuloConfirmar="Registar cliente"
        aCarregar={registar.isPending}
        erro={
          soltas.length > 0 ? (
            <Alert tom="erro" titulo="Não foi possível registar.">
              {soltas.join(" ")}
            </Alert>
          ) : registar.error && !(eApiError(registar.error) && registar.error.status === 400) ? (
            <ErrorPanel erro={registar.error} />
          ) : undefined
        }
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="max-h-[60vh] overflow-y-auto px-0.5"
          onSubmit={form.handleSubmit((d) => {
            if (registar.isPending) return;
            setSoltas([]);
            registar.mutate(
              {
                name: d.name,
                taxId: d.taxId,
                addressDetail: d.addressDetail,
                city: d.city,
                country: d.country,
                email: vazio(d.email),
                phone: vazio(d.phone),
                industry: vazio(d.industry),
                website: vazio(d.website),
                contactPerson: vazio(d.contactPerson),
                accountType: d.accountType,
              },
              { onSuccess: (r) => void navegar(`/clientes/${r.customerId}`), onError: (e) => setSoltas(aplicarErrosDoServidor(e, form.setError, CAMPOS_CLIENTE)) },
            );
          })}
        >
          <CamposCliente form={form} comNif />
        </form>
      </Confirmar>
    </>
  );
}

const DESFECHO = ["Importado", "Duplicado", "Recusado"] as const;

function Importar() {
  const [aberto, setAberto] = useState(false);
  const importar = useImportarClientes();
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [erroFicheiro, setErroFicheiro] = useState<string | null>(null);
  const id = useId();
  const r = importar.data;
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        <FileUp strokeWidth={1.75} aria-hidden />
        Importar CSV
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) {
            importar.reset();
            setFicheiro(null);
            setErroFicheiro(null);
          }
        }}
        titulo="Importar clientes de um CSV"
        descricao="Separado por vírgulas, com as colunas Nome, NIF, Morada, Cidade e Pais na primeira linha. Até 5 MB. Clientes com um NIF já registado ficam de fora."
        rotuloConfirmar={r ? "Importar outro" : "Importar"}
        aCarregar={importar.isPending}
        erro={importar.error ? <ErrorPanel erro={importar.error} /> : undefined}
        aoConfirmar={() => {
          if (r) {
            importar.reset();
            setFicheiro(null);
            return;
          }
          if (!ficheiro) return setErroFicheiro("Escolha um ficheiro .csv.");
          if (ficheiro.size > 5 * 1024 * 1024) return setErroFicheiro("O ficheiro passa de 5 MB.");
          if (!/\.csv$/i.test(ficheiro.name)) return setErroFicheiro("O ficheiro tem de ser .csv.");
          if (!importar.isPending) importar.mutate(ficheiro);
        }}
      >
        {r ? (
          <div className="flex flex-col gap-3">
            <Alert tom={Number(r.rejected) > 0 ? "aviso" : "sucesso"} titulo={`${String(r.imported)} importados, ${String(r.duplicates)} duplicados, ${String(r.rejected)} recusados (de ${String(r.totalRows)}).`} />
            {r.rows.filter((x) => Number(x.outcome) !== 0).length > 0 ? (
              <ul className="max-h-48 divide-y divide-border overflow-y-auto text-sm">
                {r.rows
                  .filter((x) => Number(x.outcome) !== 0)
                  .map((x) => (
                    <li key={String(x.line)} className="py-1.5">
                      Linha {String(x.line)}: {DESFECHO[Number(x.outcome)] ?? "—"}
                      {x.detail ? ` · ${x.detail}` : ""}
                    </li>
                  ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-medium text-foreground">
              Ficheiro
            </label>
            <input
              id={id}
              type="file"
              accept=".csv,text/csv"
              className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-foreground"
              onChange={(e) => {
                setFicheiro(e.target.files?.[0] ?? null);
                setErroFicheiro(null);
              }}
            />
            {erroFicheiro ? (
              <p className="text-xs text-danger" role="alert">
                {erroFicheiro}
              </p>
            ) : null}
          </div>
        )}
      </Confirmar>
    </>
  );
}

export default function Clientes() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const [params, setParams] = useSearchParams();
  const inactivos = params.get("inactivos") === "1";
  const clientes = useClientes({ pagina, tamanho, inactivos });
  const colunas: Coluna<ResumoCliente>[] = [
    {
      id: "nome",
      cabecalho: "Nome",
      celula: (c) => (
        <Link to={`/clientes/${c.customerId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {c.name}
        </Link>
      ),
      className: "max-w-[16rem] truncate",
    },
    { id: "nif", cabecalho: "NIF", esconderAte: "sm", celula: (c) => <span className="tabular-nums">{c.taxId}</span> },
    { id: "cidade", cabecalho: "Cidade", esconderAte: "md", celula: (c) => `${c.city}, ${c.country}` },
    { id: "tipo", cabecalho: "Tipo", esconderAte: "lg", celula: (c) => TIPOS_CONTA[c.accountType as keyof typeof TIPOS_CONTA] ?? c.accountType },
    { id: "estado", cabecalho: "Estado", celula: (c) => (c.status === "Active" ? <Badge tom="sucesso">Activo</Badge> : <Badge tom="aviso">Inactivo</Badge>) },
  ];
  return (
    <>
      <PageHeader
        titulo="Clientes"
        accao={
          <Can requer="commercial.customers.write">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Importar />
              <NovoCliente />
            </div>
          </Can>
        }
      />
      <Checkbox
        className="mb-4"
        rotulo="Mostrar inactivos"
        checked={inactivos}
        onChange={(e) =>
          setParams((a) => {
            const n = new URLSearchParams(a);
            if (e.target.checked) n.set("inactivos", "1");
            else n.delete("inactivos");
            n.delete("pagina");
            return n;
          })
        }
      />
      <Tabela
        rotulo="Clientes"
        colunas={colunas}
        linhas={clientes.data?.items}
        chave={(c) => c.customerId}
        aCarregar={clientes.isPending}
        erro={clientes.error ? <ErrorPanel erro={clientes.error} tentarDeNovo={() => void clientes.refetch()} /> : undefined}
        vazio="Ainda não há clientes."
        rodape={clientes.data && clientes.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={clientes.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
