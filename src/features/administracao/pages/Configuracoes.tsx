import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/mini";
import { CARTOES_CONFIGURACOES } from "@/app/requisitos";
import { Can, useUtilizador } from "@/features/identity";
import { aplicarErrosDoServidor } from "@/lib/api/formulario";
import { eApiError } from "@/lib/api/problem";
import { emailOpcional, normalizarTexto, texto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { useDadosEmpresa, useGovernacao, useGuardarDadosEmpresa, useTestarCorreio, type DadosEmpresa, type PedidoDadosEmpresa } from "../api";
import { nomePerfil } from "../perfis";

function Governacao() {
  const g = useGovernacao();
  return (
    <Card>
      <CardTitle>Governação</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">Quem pode fazer o quê, e que decisões passam por aprovação. Só leitura.</p>
      {g.isPending ? (
        <div className="mt-4 flex flex-col gap-2" aria-label="A carregar governação">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : g.error ? (
        <ErrorPanel erro={g.error} tentarDeNovo={() => void g.refetch()} className="mt-4" />
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="gov-perfis">
            <h3 id="gov-perfis" className="text-sm font-medium text-foreground">
              Perfis de acesso
            </h3>
            <ul className="mt-2 divide-y divide-border rounded-md border border-border">
              {g.data.accessProfiles.map((p) => (
                <li key={p.name}>
                  <details className="group">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-base text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                      <span>{nomePerfil(p.name)}</span>
                      <span className="text-sm text-muted-foreground">
                        {p.permissions.length} {p.permissions.length === 1 ? "permissão" : "permissões"}
                      </span>
                    </summary>
                    <ul className="flex flex-wrap gap-1 border-t border-border bg-muted/50 px-3 py-2">
                      {p.permissions.length === 0 ? <li className="text-sm text-muted-foreground">Sem permissões de gestão.</li> : null}
                      {p.permissions.map((perm) => (
                        <li key={perm}>
                          <code className="rounded bg-card px-1.5 py-0.5 font-mono text-xs text-foreground">{perm}</code>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="gov-regras">
            <h3 id="gov-regras" className="text-sm font-medium text-foreground">
              Regras de aprovação
            </h3>
            {g.data.approvalRulesByModule.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Ainda não há regras de aprovação.</p>
            ) : (
              <div className="mt-2 flex flex-col gap-3">
                {g.data.approvalRulesByModule.map((m) => (
                  <div key={m.module} className="rounded-md border border-border">
                    <p className="border-b border-border bg-muted px-3 py-1.5 text-[13px] font-medium text-muted-foreground">{m.module}</p>
                    <ul className="divide-y divide-border">
                      {m.rules.map((r) => (
                        <li key={r.policyId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                          <span className="font-mono text-xs text-foreground">{r.processType}</span>
                          <span className="flex flex-wrap items-center gap-1.5">
                            <Badge tom={r.isActive ? "sucesso" : "neutro"}>{r.isActive ? "Activa" : "Inactiva"}</Badge>
                            <Badge>
                              {String(r.stepCount)} {Number(r.stepCount) === 1 ? "passo" : "passos"}
                            </Badge>
                            {r.requiresBudgetCheck ? <Badge tom="info">Verifica orçamento</Badge> : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Card>
  );
}

const opcional = (max: number) => texto({ max });
const esquemaEmpresa = z.object({
  companyName: texto({ max: 200, obrigatorio: "Escreva a razão social." }),
  businessName: opcional(200),
  taxRegistrationNumber: z.string().check(
    z.overwrite((v) => normalizarTexto(v).replace(/\s+/g, "")),
    z.minLength(1, "Escreva o NIF."),
    z.maxLength(30, "No máximo 30 caracteres."),
  ),
  addressDetail: texto({ max: 200, obrigatorio: "Escreva o endereço." }),
  city: texto({ max: 100, obrigatorio: "Escreva a cidade." }),
  postalCode: opcional(20),
  country: texto({ max: 100, obrigatorio: "Escreva o país." }),
  email: emailOpcional,
  phone: opcional(40),
  softwareValidationNumber: opcional(50),
});
type DadosForm = z.infer<typeof esquemaEmpresa>;
const CAMPOS = Object.keys(esquemaEmpresa.shape) as (keyof DadosForm)[];

function paraForm(d: DadosEmpresa | null): DadosForm {
  return {
    companyName: d?.companyName ?? "",
    businessName: d?.businessName ?? "",
    taxRegistrationNumber: d?.taxRegistrationNumber ?? "",
    addressDetail: d?.addressDetail ?? "",
    city: d?.city ?? "",
    postalCode: d?.postalCode ?? "",
    country: d?.country ?? "",
    email: d?.email ?? "",
    phone: d?.phone ?? "",
    softwareValidationNumber: d?.softwareValidationNumber ?? "",
  };
}

const vazioParaNull = (v: string) => (v === "" ? null : v);

function paraPedido(d: DadosForm): PedidoDadosEmpresa {
  return {
    companyName: d.companyName,
    taxRegistrationNumber: d.taxRegistrationNumber,
    addressDetail: d.addressDetail,
    city: d.city,
    country: d.country,
    businessName: vazioParaNull(d.businessName),
    postalCode: vazioParaNull(d.postalCode),
    email: vazioParaNull(d.email),
    phone: vazioParaNull(d.phone),
    softwareValidationNumber: vazioParaNull(d.softwareValidationNumber),
  };
}

const ROTULOS: Readonly<Record<keyof DadosForm, string>> = {
  companyName: "Razão social",
  businessName: "Nome comercial",
  taxRegistrationNumber: "NIF",
  addressDetail: "Endereço",
  city: "Cidade",
  postalCode: "Código postal",
  country: "País",
  email: "E-mail",
  phone: "Telefone",
  softwareValidationNumber: "N.º de validação do software (AGT)",
};

function DadosDaEmpresa() {
  const { pode } = useUtilizador();
  const podeEditar = pode("fiscal.tax_entity.write");
  const dados = useDadosEmpresa();
  const guardar = useGuardarDadosEmpresa();
  const [editar, setEditar] = useState(false);
  const [confirmar, setConfirmar] = useState<DadosForm | null>(null);
  const [soltas, setSoltas] = useState<string[]>([]);
  const form = useForm<DadosForm>({ resolver: zodResolver(esquemaEmpresa), defaultValues: paraForm(null) });

  useEffect(() => {
    if (dados.data !== undefined && !editar) form.reset(paraForm(dados.data));
  }, [dados.data, editar, form]);

  const enviarAgora = (d: DadosForm) => {
    setSoltas([]);
    guardar.mutate(paraPedido(d), {
      onSuccess: () => {
        setConfirmar(null);
        setEditar(false);
      },
      onError: (e) => {
        setConfirmar(null);
        setSoltas(aplicarErrosDoServidor(e, form.setError, CAMPOS));
      },
    });
  };

  if (dados.isPending) {
    return (
      <Card>
        <CardTitle>Dados da empresa</CardTitle>
        <Skeleton className="mt-4 h-24" />
      </Card>
    );
  }
  if (dados.error) {
    return (
      <Card>
        <CardTitle>Dados da empresa</CardTitle>
        <ErrorPanel erro={dados.error} tentarDeNovo={() => void dados.refetch()} className="mt-4" />
      </Card>
    );
  }

  const declarados = dados.data !== null;

  if (!editar) {
    return (
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Dados da empresa</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Identificação fiscal que sai impressa nas facturas e nos outros documentos.</p>
          </div>
          {podeEditar ? (
            <Button variante="secondary" onClick={() => setEditar(true)}>
              {declarados ? "Corrigir" : "Declarar"}
            </Button>
          ) : null}
        </div>
        {guardar.isSuccess ? <Alert tom="sucesso" className="mt-4" titulo="Dados da empresa guardados." /> : null}
        {!declarados ? (
          <Alert tom="aviso" className="mt-4" titulo="A empresa ainda não declarou os dados fiscais.">
            Sem eles não se emitem documentos fiscais.
          </Alert>
        ) : (
          <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {CAMPOS.map((c) => (
              <div key={c} className="min-w-0">
                <dt className="text-muted-foreground">{ROTULOS[c]}</dt>
                <dd className="break-words text-foreground">{(dados.data?.[c] as string | null | undefined) || "—"}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>{declarados ? "Corrigir dados da empresa" : "Declarar dados da empresa"}</CardTitle>
      <Alert tom="aviso" className="mt-3" titulo="Estes dados saem impressos nos documentos fiscais.">
        Confirme-os com a contabilidade antes de guardar. Os documentos já emitidos não mudam.
      </Alert>
      <form
        noValidate
        className="mt-4 grid gap-4 lg:grid-cols-2"
        onSubmit={form.handleSubmit((d) => {
          if (!guardar.isPending) setConfirmar(d);
        })}
      >
        {soltas.length > 0 ? (
          <Alert tom="erro" className="lg:col-span-2" titulo="Não foi possível guardar.">
            {soltas.join(" ")}
          </Alert>
        ) : null}
        {guardar.error && !(eApiError(guardar.error) && guardar.error.status === 400) ? <ErrorPanel erro={guardar.error} className="lg:col-span-2" /> : null}
        {CAMPOS.map((c) => (
          <Field key={c} rotulo={ROTULOS[c]} erro={form.formState.errors[c]?.message}>
            {({ id, descricao, invalido }) => (
              <Input
                id={id}
                type={c === "email" ? "email" : "text"}
                autoComplete="off"
                aria-describedby={descricao}
                invalido={invalido}
                {...form.register(c)}
              />
            )}
          </Field>
        ))}
        <div className="flex flex-col-reverse gap-2 sm:flex-row lg:col-span-2">
          <Button
            variante="secondary"
            onClick={() => {
              setEditar(false);
              setSoltas([]);
              guardar.reset();
            }}
            disabled={guardar.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" aCarregar={guardar.isPending}>
            Guardar
          </Button>
        </div>
      </form>
      <Confirmar
        aberto={confirmar !== null}
        aoMudar={(a) => (a ? undefined : setConfirmar(null))}
        titulo="Guardar os dados da empresa?"
        descricao="Os documentos fiscais emitidos a partir de agora saem com estes dados."
        rotuloConfirmar="Guardar"
        aCarregar={guardar.isPending}
        aoConfirmar={() => (confirmar ? enviarAgora(confirmar) : undefined)}
      />
    </Card>
  );
}

function Correio() {
  const [aberto, setAberto] = useState(false);
  const testar = useTestarCorreio();
  return (
    <Card>
      <CardTitle>Correio</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">
        Os convites e as ligações de recuperação saem por e-mail. Confirme aqui que o envio está a funcionar.
      </p>
      {testar.isSuccess ? <Alert tom="sucesso" className="mt-4" titulo={`E-mail de teste enviado para ${testar.data.enviadoPara}.`} /> : null}
      {testar.error && !aberto ? <ErrorPanel erro={testar.error} className="mt-4" /> : null}
      <Button variante="secondary" className="mt-4" onClick={() => setAberto(true)}>
        Enviar e-mail de teste
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={setAberto}
        titulo="Enviar um e-mail de teste?"
        descricao="O e-mail vai para o próprio endereço remetente configurado no servidor, com o aspecto de um convite."
        rotuloConfirmar="Enviar"
        aCarregar={testar.isPending}
        erro={testar.error ? <ErrorPanel erro={testar.error} /> : undefined}
        aoConfirmar={() => testar.mutate(undefined, { onSuccess: () => setAberto(false) })}
      />
    </Card>
  );
}

export default function Configuracoes() {
  return (
    <>
      <PageHeader titulo="Configurações" descricao="Governação, dados da empresa e correio." />
      <div className="flex flex-col gap-6">
        <Can requer={CARTOES_CONFIGURACOES.dadosEmpresa}>
          <DadosDaEmpresa />
        </Can>
        <Can requer={CARTOES_CONFIGURACOES.governacao}>
          <Governacao />
        </Can>
        <Can requer={CARTOES_CONFIGURACOES.correio}>
          <Correio />
        </Can>
      </div>
    </>
  );
}
