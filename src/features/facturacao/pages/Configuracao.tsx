/** Configuração da facturação: séries, canais de pagamento e taxas de IVA (leitura). */
import { Pencil, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Can, useUtilizador } from "@/features/identity";
import { formatarData } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useAbrirSerie, useCanais, useGuardarCanal, usePautas, useSeries, type CanalPagamento, type Serie } from "../api";
import { MEIOS, NOME_TIPO } from "../comum";

const TIPOS_SERIE = ["FT", "FR", "ND", "NC", "RG", "PF"] as const;

function AbrirSerie() {
  const [aberto, setAberto] = useState(false);
  const abrir = useAbrirSerie();
  const [tipo, setTipo] = useState<(typeof TIPOS_SERIE)[number]>("FT");
  const [codigo, setCodigo] = useState("");
  const [tentou, setTentou] = useState(false);
  const id = useId();
  const cod = normalizarTexto(codigo).toUpperCase();
  const ok = /^[A-Z0-9][A-Z0-9-]{0,19}$/.test(cod);
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Abrir série
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) {
            abrir.reset();
            setTentou(false);
            setCodigo("");
          }
        }}
        titulo="Abrir série de numeração"
        descricao="A numeração de cada série é sequencial e sem falhas. Uma série aberta não se apaga."
        rotuloConfirmar="Abrir série"
        aCarregar={abrir.isPending}
        erro={abrir.error ? <ErrorPanel erro={abrir.error} /> : undefined}
        aoConfirmar={() => {
          setTentou(true);
          if (ok && !abrir.isPending) abrir.mutate({ code: cod, type: tipo }, { onSuccess: () => setAberto(false) });
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-t`} className="text-sm font-medium text-foreground">
              Tipo de documento
            </label>
            <Select id={`${id}-t`} value={tipo} onChange={(e) => setTipo(e.target.value as (typeof TIPOS_SERIE)[number])}>
              {TIPOS_SERIE.map((t) => (
                <option key={t} value={t}>
                  {t} · {NOME_TIPO[t]}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-c`} className="text-sm font-medium text-foreground">
              Código
            </label>
            <Input id={`${id}-c`} maxLength={20} value={codigo} onChange={(e) => setCodigo(e.target.value)} aria-invalid={tentou && !ok ? true : undefined} placeholder="S001" />
            {tentou && !ok ? <p className="text-xs text-danger" role="alert">Letras, algarismos e hífen, até 20.</p> : null}
          </div>
        </div>
      </Confirmar>
    </>
  );
}

function Series() {
  const series = useSeries();
  const colunas: Coluna<Serie>[] = [
    { id: "tipo", cabecalho: "Tipo", ordenar: (s) => s.type, celula: (s) => `${s.type} · ${NOME_TIPO[s.type] ?? s.type}` },
    { id: "codigo", cabecalho: "Código", ordenar: (s) => s.code, celula: (s) => <span className="font-mono">{s.code}</span> },
    { id: "prox", cabecalho: "Próximo n.º", alinhar: "direita", celula: (s) => String(s.nextSequence) },
    { id: "estado", cabecalho: "Estado", celula: (s) => (s.isActive ? <Badge tom="sucesso">Activa</Badge> : <Badge>Inactiva</Badge>) },
  ];
  return (
    <section aria-labelledby="t-series" className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="t-series" className="text-md font-semibold text-foreground">
          Séries de numeração
        </h2>
        <Can requer="finance.series.write">
          <AbrirSerie />
        </Can>
      </div>
      <Tabela
        rotulo="Séries de numeração"
        colunas={colunas}
        linhas={series.data}
        chave={(s) => s.seriesId}
        aCarregar={series.isPending}
        erro={series.error ? <ErrorPanel erro={series.error} tentarDeNovo={() => void series.refetch()} /> : undefined}
        vazio="Ainda não há séries."
        ordenavel
      />
    </section>
  );
}

function FormularioCanal({ canal, aberto, aoMudar }: { canal: CanalPagamento | null; aberto: boolean; aoMudar: (a: boolean) => void }) {
  const guardar = useGuardarCanal();
  const [nome, setNome] = useState(canal?.name ?? "");
  const [mecanismo, setMecanismo] = useState(canal?.mechanism ?? "");
  const [origem, setOrigem] = useState(canal?.source ?? "");
  const [codigo, setCodigo] = useState(canal?.code ?? "");
  const [activo, setActivo] = useState(canal?.isActive ?? true);
  const [tentou, setTentou] = useState(false);
  const id = useId();
  const ok = normalizarTexto(nome) !== "" && mecanismo !== "" && normalizarTexto(origem) !== "";
  return (
    <Confirmar
      aberto={aberto}
      aoMudar={(a) => {
        aoMudar(a);
        if (!a) guardar.reset();
      }}
      titulo={canal ? "Rever canal de pagamento" : "Novo canal de pagamento"}
      rotuloConfirmar="Guardar"
      aCarregar={guardar.isPending}
      erro={guardar.error ? <ErrorPanel erro={guardar.error} /> : undefined}
      aoConfirmar={() => {
        setTentou(true);
        if (!ok || guardar.isPending) return;
        guardar.mutate(
          {
            ...(canal ? { channelId: canal.channelId } : {}),
            code: normalizarTexto(codigo) || null,
            name: normalizarTexto(nome),
            mechanism: mecanismo as "NU",
            source: normalizarTexto(origem),
            active: canal ? activo : null,
          },
          { onSuccess: () => aoMudar(false) },
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor={`${id}-n`} className="text-sm font-medium text-foreground">
            Nome
          </label>
          <Input id={`${id}-n`} maxLength={200} value={nome} onChange={(e) => setNome(e.target.value)} aria-invalid={tentou && !normalizarTexto(nome) ? true : undefined} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-m`} className="text-sm font-medium text-foreground">
            Mecanismo
          </label>
          <Select id={`${id}-m`} value={mecanismo} onChange={(e) => setMecanismo(e.target.value)} aria-invalid={tentou && !mecanismo ? true : undefined}>
            <option value="">Escolha…</option>
            {Object.entries(MEIOS).map(([k, n]) => (
              <option key={k} value={k}>
                {n}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-o`} className="text-sm font-medium text-foreground">
            Origem
          </label>
          <Input id={`${id}-o`} maxLength={100} value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="Banco, terminal…" aria-invalid={tentou && !normalizarTexto(origem) ? true : undefined} />
        </div>
        {!canal ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-c`} className="text-sm font-medium text-foreground">
              Código (opcional)
            </label>
            <Input id={`${id}-c`} maxLength={20} value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>
        ) : (
          <Checkbox rotulo="Canal activo" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
        )}
        {tentou && !ok ? <p className="text-xs text-danger sm:col-span-2" role="alert">Preencha o nome, o mecanismo e a origem.</p> : null}
      </div>
    </Confirmar>
  );
}

function Canais() {
  const canais = useCanais();
  const { pode } = useUtilizador();
  const podeEscrever = pode("finance.series.write");
  const [aberto, setAberto] = useState(false);
  const [aEditar, setAEditar] = useState<CanalPagamento | null>(null);
  const colunas: Coluna<CanalPagamento>[] = [
    { id: "nome", cabecalho: "Canal", ordenar: (c) => c.name, celula: (c) => <span className="font-medium">{c.name}</span> },
    { id: "mec", cabecalho: "Mecanismo", esconderAte: "sm", celula: (c) => MEIOS[c.mechanism] ?? c.mechanism },
    { id: "origem", cabecalho: "Origem", esconderAte: "md", celula: (c) => c.source },
    { id: "estado", cabecalho: "Estado", celula: (c) => (c.isActive ? <Badge tom="sucesso">Activo</Badge> : <Badge>Inactivo</Badge>) },
    ...(podeEscrever
      ? [
          {
            id: "accao",
            cabecalho: "",
            alinhar: "direita" as const,
            celula: (c: CanalPagamento) => (
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
            ),
          },
        ]
      : []),
  ];
  return (
    <section aria-labelledby="t-canais" className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="t-canais" className="text-md font-semibold text-foreground">
          Canais de pagamento
        </h2>
        {podeEscrever ? (
          <Button
            variante="secondary"
            onClick={() => {
              setAEditar(null);
              setAberto(true);
            }}
          >
            <Plus strokeWidth={1.75} aria-hidden />
            Novo canal
          </Button>
        ) : null}
      </div>
      <Tabela
        rotulo="Canais de pagamento"
        colunas={colunas}
        linhas={canais.data}
        chave={(c) => c.channelId}
        aCarregar={canais.isPending}
        erro={canais.error ? <ErrorPanel erro={canais.error} tentarDeNovo={() => void canais.refetch()} /> : undefined}
        vazio="Ainda não há canais de pagamento."
        ordenavel
      />
      {podeEscrever && aberto ? <FormularioCanal key={aEditar?.channelId ?? "novo"} canal={aEditar} aberto={aberto} aoMudar={setAberto} /> : null}
    </section>
  );
}

function Taxas() {
  const pautas = usePautas();
  const iva = (pautas.data ?? []).filter((p) => p.kind === 0 || String(p.kind) === "ValueAdded");
  return (
    <Card>
      <CardTitle>Taxas de IVA</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">Só leitura. A taxa aplicada é a que está em vigor na data do facto gerador.</p>
      {pautas.isPending ? null : pautas.error ? (
        <ErrorPanel erro={pautas.error} tentarDeNovo={() => void pautas.refetch()} className="mt-3" />
      ) : iva.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Sem taxas de IVA definidas.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border text-sm">
          {iva.map((p) => (
            <li key={p.scheduleId} className="py-2">
              <p className="font-medium text-foreground">
                <span className="font-mono">{p.code}</span> · {p.description}
                {p.requiresExemptionCode ? <Badge className="ml-2">Exige código de isenção</Badge> : null}
              </p>
              <ul className="mt-1 text-muted-foreground">
                {p.versions.map((v) => (
                  <li key={v.versionId}>
                    {String(v.percentage).replace(".", ",")}&thinsp;% desde {formatarData(v.effectiveFrom)}
                    {v.effectiveTo ? ` até ${formatarData(v.effectiveTo)}` : ""} · {v.legalInstrument}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function ConfiguracaoFacturacao() {
  return (
    <>
      <PageHeader titulo="Configuração da facturação" descricao="Séries de numeração, canais de pagamento e taxas de IVA." />
      <div className="flex flex-col gap-8">
        <Can requer="finance.invoices.read">
          <Series />
          <Canais />
        </Can>
        <Can requer="fiscal.rates.read">
          <Taxas />
        </Can>
      </div>
    </>
  );
}
