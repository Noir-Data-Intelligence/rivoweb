/**
 * Portal › Dados pessoais: o que os RH têm registado, só para ler. Não há
 * edição de propósito: mudar o IBAN sem passar pelos RH é uma via conhecida de
 * desvio de salário. Para corrigir, abre-se um pedido aos RH. O IBAN e o BI
 * são do próprio e aparecem por extenso.
 */
import { Link } from "react-router";
import { formatarData, formatarDataHora, hojeIso } from "@/lib/format/data";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { useMeusDados, type MeusDados } from "../api";

type Linha = { rotulo: string; valor: string | null; largo?: boolean; aviso?: string };

const t = (v: string | null) => (v === null || v.trim() === "" ? null : v);
const d = (v: string | null) => (v ? formatarData(v) : null);

function seccoes(x: MeusDados, hoje: string): { titulo: string; linhas: Linha[] }[] {
  const biCaducado = x.identityDocumentExpiresOn !== null && x.identityDocumentExpiresOn < hoje;
  return [
    { titulo: "Contactos", linhas: [{ rotulo: "E-mail", valor: t(x.email) }, { rotulo: "Telefone", valor: t(x.phone) }] },
    {
      titulo: "Pessoais",
      linhas: [
        { rotulo: "Género", valor: t(x.gender) },
        { rotulo: "Data de nascimento", valor: d(x.birthDate) },
        { rotulo: "Nacionalidade", valor: t(x.nationality) },
        { rotulo: "Estado civil", valor: t(x.maritalStatus) },
      ],
    },
    {
      titulo: "Identificação",
      linhas: [
        { rotulo: "NIF", valor: t(x.taxId) },
        { rotulo: "N.º do BI", valor: t(x.identityDocumentNumber) },
        { rotulo: "Validade do BI", valor: d(x.identityDocumentExpiresOn), ...(biCaducado ? { aviso: "Caducado" } : {}) },
        { rotulo: "N.º de segurança social", valor: t(x.socialSecurityNumber) },
      ],
    },
    {
      titulo: "Morada",
      linhas: [
        { rotulo: "Morada", valor: t(x.addressDetail), largo: true },
        { rotulo: "Cidade", valor: t(x.city) },
        { rotulo: "País", valor: t(x.country) },
      ],
    },
    {
      titulo: "Dados bancários",
      linhas: [
        { rotulo: "Banco", valor: t(x.bankName) },
        { rotulo: "N.º de conta", valor: t(x.bankAccountNumber) },
        { rotulo: "IBAN", valor: t(x.iban), largo: true },
      ],
    },
    {
      titulo: "Contacto de emergência",
      linhas: [
        { rotulo: "Nome", valor: t(x.emergencyContactName) },
        { rotulo: "Relação", valor: t(x.emergencyContactRelationship) },
        { rotulo: "Telefone", valor: t(x.emergencyContactPhone) },
      ],
    },
  ];
}

export default function DadosPessoais() {
  const dados = useMeusDados();
  const hoje = hojeIso();
  return (
    <>
      <PageHeader
        titulo="Dados pessoais"
        descricao={dados.data?.updatedAt ? `Actualizado a ${formatarDataHora(dados.data.updatedAt)}.` : "Os dados que os Recursos Humanos têm registados."}
      />
      <Alert
        className="mb-4"
        accao={
          <Button asChild tamanho="sm" variante="secondary">
            <Link to="/eu/pedidos?novo=HumanResources">Pedir correcção</Link>
          </Button>
        }
      >
        Para corrigir estes dados, abra um pedido aos Recursos Humanos.
      </Alert>
      {dados.isPending ? (
        <Skeleton className="h-64" />
      ) : dados.error ? (
        <ErrorPanel erro={dados.error} tentarDeNovo={() => void dados.refetch()} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {seccoes(dados.data, hoje).map((s) => (
            <Card key={s.titulo} aria-label={s.titulo} role="region">
              <CardTitle className="mb-3">{s.titulo}</CardTitle>
              <dl className="grid gap-3 sm:grid-cols-2">
                {s.linhas.map((l) => (
                  <div key={l.rotulo} className={l.largo ? "sm:col-span-2" : undefined}>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{l.rotulo}</dt>
                    <dd className="mt-0.5 flex flex-wrap items-center gap-2 break-words font-medium text-foreground">
                      <span className={l.aviso ? "text-danger" : undefined}>{l.valor ?? "—"}</span>
                      {l.aviso ? <Badge tom="erro">{l.aviso}</Badge> : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
