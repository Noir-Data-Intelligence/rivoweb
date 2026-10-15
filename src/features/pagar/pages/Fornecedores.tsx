/** Fornecedores (§5.6): lista, registo e importação CSV. Só quem qualifica fornecedores escreve. */
import { zodResolver } from "@hookform/resolvers/zod";
import { FileUp, Plus } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { z } from "zod/mini";
import { Can } from "@/features/identity";
import { aplicarErrosDoServidor } from "@/lib/api/formulario";
import { eApiError } from "@/lib/api/problem";
import { emailOpcional, ibanValido, texto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useFornecedores, useImportarFornecedores, useRegistarFornecedor, type Fornecedor } from "../api";
import { ResultadoImportacao } from "../comum";

/** IBAN com a verificação da norma ISO 13616 (a mesma do servidor). Vazio é permitido. */
const iban = z.string().check(
  z.overwrite((v) => v.replace(/\s+/g, "").toUpperCase()),
  z.refine((v) => v === "" || ibanValido(v), "Este IBAN não passa a verificação. Confirme os dígitos: um IBAN errado paga a outra pessoa."),
);

export const esquemaFornecedor = z.object({
  name: texto({ max: 200, obrigatorio: "Escreva o nome." }),
  taxId: texto({ max: 30, obrigatorio: "Escreva o NIF." }),
  iban,
  email: emailOpcional,
  phone: texto({ max: 50 }),
  contactPerson: texto({ max: 200 }),
  addressDetail: texto({ max: 300 }),
  city: texto({ max: 100 }),
  country: z.string().check(
    z.overwrite((v) => v.trim().toUpperCase()),
    z.refine((v) => v === "" || /^[A-Z]{2}$/.test(v), "Código do país com duas letras (AO, PT…)."),
  ),
});
export type DadosFornecedor = z.infer<typeof esquemaFornecedor>;
export const CAMPOS_FORNECEDOR = Object.keys(esquemaFornecedor.shape) as (keyof DadosFornecedor)[];

const ROTULOS: Readonly<Record<keyof DadosFornecedor, string>> = {
  name: "Nome",
  taxId: "NIF",
  iban: "IBAN",
  email: "E-mail",
  phone: "Telefone",
  contactPerson: "Pessoa de contacto",
  addressDetail: "Morada",
  city: "Cidade",
  country: "País",
};

export function CamposFornecedor({ form, comNif }: { form: ReturnType<typeof useForm<DadosFornecedor>>; comNif: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {CAMPOS_FORNECEDOR.filter((c) => comNif || c !== "taxId").map((c) => (
        <Field
          key={c}
          rotulo={ROTULOS[c]}
          erro={form.formState.errors[c]?.message}
          ajuda={c === "iban" ? "Para onde se paga. Só quem qualifica fornecedores o altera." : undefined}
          className={c === "addressDetail" || c === "iban" ? "sm:col-span-2" : undefined}
        >
          {({ id, descricao, invalido }) => (
            <Input
              id={id}
              type={c === "email" ? "email" : "text"}
              maxLength={c === "country" ? 2 : c === "iban" ? 42 : 300}
              autoComplete="off"
              spellCheck={false}
              aria-describedby={descricao}
              invalido={invalido}
              {...form.register(c)}
            />
          )}
        </Field>
      ))}
    </div>
  );
}

export const vazio = (v: string) => (v === "" ? null : v);

function NovoFornecedor() {
  const navegar = useNavigate();
  const [aberto, setAberto] = useState(false);
  const registar = useRegistarFornecedor();
  const idForm = useId();
  const [soltas, setSoltas] = useState<string[]>([]);
  const inicial: DadosFornecedor = { name: "", taxId: "", iban: "", email: "", phone: "", contactPerson: "", addressDetail: "", city: "", country: "AO" };
  const form = useForm<DadosFornecedor>({ resolver: zodResolver(esquemaFornecedor), defaultValues: inicial });
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
        Novo fornecedor
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo="Novo fornecedor"
        rotuloConfirmar="Registar fornecedor"
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
                iban: vazio(d.iban),
                email: vazio(d.email),
                phone: vazio(d.phone),
                contactPerson: vazio(d.contactPerson),
                addressDetail: vazio(d.addressDetail),
                city: vazio(d.city),
                country: vazio(d.country),
              },
              { onSuccess: (r) => void navegar(`/fornecedores/${r.supplierId}`), onError: (e) => setSoltas(aplicarErrosDoServidor(e, form.setError, CAMPOS_FORNECEDOR)) },
            );
          })}
        >
          <CamposFornecedor form={form} comNif />
        </form>
      </Confirmar>
    </>
  );
}

function Importar() {
  const [aberto, setAberto] = useState(false);
  const importar = useImportarFornecedores();
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
        titulo="Importar fornecedores de um CSV"
        descricao="Com cabeçalho na primeira linha. Obrigatórias as colunas Nome e NIF; opcionais IBAN, Email e Telefone. Até 5 MB. Fornecedores com um NIF já registado ficam de fora."
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
          <ResultadoImportacao r={r} />
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

export function EstadoFornecedor({ estado }: { estado: string }) {
  return estado === "Active" ? <Badge tom="sucesso">Activo</Badge> : <Badge tom="aviso">Inactivo</Badge>;
}

export default function Fornecedores() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const [params, setParams] = useSearchParams();
  const inactivos = params.get("inactivos") === "1";
  const fornecedores = useFornecedores({ pagina, tamanho, inactivos });
  const colunas: Coluna<Fornecedor>[] = [
    {
      id: "nome",
      cabecalho: "Nome",
      celula: (f) => (
        <Link to={`/fornecedores/${f.supplierId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {f.name}
        </Link>
      ),
      className: "max-w-[16rem] truncate",
    },
    { id: "nif", cabecalho: "NIF", esconderAte: "sm", celula: (f) => <span className="tabular-nums">{f.taxId}</span> },
    { id: "cidade", cabecalho: "Cidade", esconderAte: "md", celula: (f) => [f.city, f.country].filter(Boolean).join(", ") || "—" },
    { id: "contacto", cabecalho: "Contacto", esconderAte: "lg", celula: (f) => f.contactPerson ?? f.email ?? "—" },
    { id: "estado", cabecalho: "Estado", celula: (f) => <EstadoFornecedor estado={f.status} /> },
  ];
  return (
    <>
      <PageHeader
        titulo="Fornecedores"
        accao={
          <Can requer="procurement.suppliers.write">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Importar />
              <NovoFornecedor />
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
        rotulo="Fornecedores"
        colunas={colunas}
        linhas={fornecedores.data?.items}
        chave={(f) => f.supplierId}
        aCarregar={fornecedores.isPending}
        erro={fornecedores.error ? <ErrorPanel erro={fornecedores.error} tentarDeNovo={() => void fornecedores.refetch()} /> : undefined}
        vazio="Ainda não há fornecedores."
        rodape={fornecedores.data && fornecedores.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={fornecedores.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
