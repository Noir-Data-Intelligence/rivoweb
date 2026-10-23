/**
 * Shell comum aos três ambientes (§3.3, §4.4). Até 767 px a barra lateral é
 * uma gaveta; de 768 a 1023 px só ícones; a partir de 1024 px completa e
 * colapsável.
 */
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import * as D from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import { ArrowLeft, ChevronDown, LogOut, Menu, Monitor, Moon, PanelLeft, Sun, UserCog, X, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, matchPath, NavLink, Outlet, useLocation } from "react-router";
import { useTema } from "@/app/theme";
import { temGestao, type Shell } from "@/lib/auth/permissions";
import { gravarPrefs, lerPrefs, type Tema } from "@/lib/prefs";
import { sair, usePortalColaborador } from "@/features/identity/api";
import { RelogioSessao } from "@/features/identity/components/RelogioSessao";
import { useUtilizador } from "@/features/identity/utilizador";
import { Sino } from "@/features/notificacoes";
import { BarraSemLigacao } from "@/features/sistema/BarraSemLigacao";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { cn } from "@/ui/cn";
import { Logo } from "@/ui/Layout";
import { ProcurarPagina } from "./ProcurarPagina";
import { CONTA, MENU, NOTIFICACOES, type EntradaMenu } from "./rotas";

/** No portal do colaborador, quem também gere volta ao backoffice pela barra lateral (§3.3). */
const VOLTAR_GESTAO: EntradaMenu = { caminho: "/", titulo: "Voltar à gestão", icone: ArrowLeft, requer: "autenticado", exacto: true };

/** O logotipo leva ao início do ambiente; no portal, quem também gere vai para o backoffice. */
function inicioDoLogo(shell: Shell, gere: boolean): string {
  if (shell === "cliente") return "/cliente";
  if (shell === "colaborador" && !gere) return "/eu";
  return "/";
}

function LogoInicio({ shell, className, comNome }: { shell: Shell; className?: string; comNome?: boolean }) {
  const { utilizador } = useUtilizador();
  const gere = temGestao(utilizador.permissions);
  const destino = inicioDoLogo(shell, gere);
  return (
    <Link
      to={destino}
      aria-label={destino === "/" && shell === "colaborador" ? "Rivo, ir para a gestão" : "Rivo, página inicial"}
      className={cn("inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
    >
      <Logo comNome={comNome ?? true} />
    </Link>
  );
}

const NOME_SHELL: Readonly<Record<Shell, string | null>> = {
  backoffice: null,
  colaborador: "Portal do colaborador",
  cliente: "Portal do cliente",
};

function ItemMenu({ e, compacto, aoNavegar }: { e: EntradaMenu; compacto: boolean; aoNavegar?: () => void }) {
  const ligacao = (
    <NavLink
      to={e.caminho}
      end={e.exacto ?? false}
      onClick={aoNavegar}
      className={({ isActive }) =>
        cn(
          "flex h-8 items-center gap-3 rounded-lg border border-transparent px-3 text-[0.8125rem] text-sidebar-foreground hover:bg-secondary pointer-coarse:h-11",
          isActive && "border-[var(--marca-destaque)] bg-[var(--marca-destaque-suave)] font-medium text-[var(--marca-destaque)] hover:bg-[var(--marca-destaque-suave)]",
          compacto && "justify-center px-0",
        )
      }
    >
      <e.icone className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      <span className={compacto ? "sr-only" : "truncate"}>{e.titulo}</span>
    </NavLink>
  );
  if (!compacto) return ligacao;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{ligacao}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="right" sideOffset={8} className="z-50 rounded-md bg-foreground px-2 py-1 text-xs text-background">
          {e.titulo}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/** Grupos fechados guardados nas preferências; o grupo da página aberta mostra-se sempre. */
function useGruposFechados() {
  const [fechados, setFechados] = useState<readonly string[]>(() => lerPrefs().gruposFechados);
  const alternar = (g: string) => {
    const novos = fechados.includes(g) ? fechados.filter((x) => x !== g) : [...fechados, g];
    gravarPrefs({ gruposFechados: novos });
    setFechados(novos);
  };
  return { fechados, alternar };
}

function GrupoMenu({ g, aberto, alternar, children }: { g: string; aberto: boolean; alternar: () => void; children: ReactNode }) {
  const id = `grupo-${g.replace(/\W+/g, "-")}`;
  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={id}
        onClick={alternar}
        className="flex h-7 items-center justify-between rounded-md px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {g}
        <ChevronDown className={cn("size-3.5 transition-transform", !aberto && "-rotate-90")} strokeWidth={1.75} aria-hidden />
      </button>
      <div id={id} hidden={!aberto} className="flex flex-col gap-0.5">
        {children}
      </div>
    </div>
  );
}

function Navegacao({ shell, compacto, aoNavegar }: { shell: Shell; compacto: boolean; aoNavegar?: () => void }) {
  const { pode, utilizador } = useUtilizador();
  const { pathname } = useLocation();
  const { fechados, alternar } = useGruposFechados();
  const itens = MENU[shell].filter((e) => pode(e.requer));
  const voltar = shell === "colaborador" && temGestao(utilizador.permissions);
  const grupos = new Map<string, EntradaMenu[]>();
  for (const e of itens) {
    const g = e.grupo ?? "";
    grupos.set(g, [...(grupos.get(g) ?? []), e]);
  }
  return (
    <nav aria-label="Principal" className="flex flex-col gap-4">
      {[...grupos.entries()].map(([g, lista]) => {
        const ligacoes = lista.map((e) => <ItemMenu key={e.caminho} e={e} compacto={compacto} {...(aoNavegar ? { aoNavegar } : {})} />);
        if (!g || compacto) {
          return (
            <div key={g || "_"} className="flex flex-col gap-0.5">
              {ligacoes}
            </div>
          );
        }
        const temActiva = lista.some((e) => matchPath({ path: e.caminho, end: e.exacto ?? false }, pathname) !== null);
        return (
          <GrupoMenu key={g} g={g} aberto={temActiva || !fechados.includes(g)} alternar={() => alternar(g)}>
            {ligacoes}
          </GrupoMenu>
        );
      })}
      {voltar ? (
        <div className="flex flex-col gap-0.5 border-t border-sidebar-border pt-4">
          <ItemMenu e={VOLTAR_GESTAO} compacto={compacto} {...(aoNavegar ? { aoNavegar } : {})} />
        </div>
      ) : null}
    </nav>
  );
}

const OPCOES_TEMA: readonly { valor: Tema; texto: string; icone: LucideIcon }[] = [
  { valor: "sistema", texto: "Sistema", icone: Monitor },
  { valor: "claro", texto: "Claro", icone: Sun },
  { valor: "escuro", texto: "Escuro", icone: Moon },
];

function MenuTema() {
  const { tema, escuro, mudarTema } = useTema();
  const Icone = escuro ? Moon : Sun;
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <Button variante="ghost" tamanho="icone" aria-label="Tema">
          <Icone strokeWidth={1.75} aria-hidden />
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content align="end" sideOffset={6} className="z-50 min-w-40 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
          <Dropdown.Label className="px-2 py-1.5 text-xs text-muted-foreground">Tema</Dropdown.Label>
          <Dropdown.RadioGroup value={tema} onValueChange={(v) => mudarTema(v as Tema)}>
            {OPCOES_TEMA.map((o) => (
              <Dropdown.RadioItem
                key={o.valor}
                value={o.valor}
                className="flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-base outline-none data-[highlighted]:bg-secondary data-[state=checked]:font-medium"
              >
                <o.icone className="size-4" strokeWidth={1.75} aria-hidden />
                {o.texto}
              </Dropdown.RadioItem>
            ))}
          </Dropdown.RadioGroup>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}

function MenuUtilizador({ shell }: { shell: Shell }) {
  const { utilizador } = useUtilizador();
  // «O meu portal» só para quem está no backoffice e tem ficha de colaborador (§3.3).
  const portal = usePortalColaborador(shell === "backoffice");
  const nome = utilizador.displayName ?? utilizador.email;
  const iniciais = nome
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const item = "flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-base outline-none data-[highlighted]:bg-secondary";
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Conta de ${nome}`}
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-[image:var(--marca-gradiente-rivo)] text-xs font-semibold text-white pointer-coarse:size-11">{iniciais || "?"}</span>
          <span className="hidden max-w-[14rem] truncate pr-1 text-sm font-medium text-foreground xl:inline">{utilizador.email}</span>
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content align="end" sideOffset={6} className="z-50 w-64 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
          <div className="px-2 py-2">
            <p className="truncate text-base font-medium">{nome}</p>
            <p className="truncate text-sm text-muted-foreground">{utilizador.email}</p>
          </div>
          <Dropdown.Separator className="my-1 h-px bg-border" />
          <Dropdown.Item asChild className={item}>
            <Link to={CONTA[shell]}>
              <UserCog className="size-4" strokeWidth={1.75} aria-hidden />A minha conta
            </Link>
          </Dropdown.Item>
          {shell === "backoffice" && portal.isSuccess ? (
            <Dropdown.Item asChild className={item}>
              <Link to="/eu">
                <Monitor className="size-4" strokeWidth={1.75} aria-hidden />O meu portal
              </Link>
            </Dropdown.Item>
          ) : null}
          {shell === "colaborador" && temGestao(utilizador.permissions) ? (
            <Dropdown.Item asChild className={item}>
              <Link to="/">
                <Monitor className="size-4" strokeWidth={1.75} aria-hidden />
                Voltar à gestão
              </Link>
            </Dropdown.Item>
          ) : null}
          <Dropdown.Separator className="my-1 h-px bg-border" />
          <Dropdown.Item className={item} onSelect={() => sair()}>
            <LogOut className="size-4" strokeWidth={1.75} aria-hidden />
            Sair
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}

function Gaveta({ shell, aberta, setAberta }: { shell: Shell; aberta: boolean; setAberta: (v: boolean) => void }) {
  return (
    <D.Root open={aberta} onOpenChange={setAberta}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-foreground/40 md:hidden" />
        <D.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4 focus:outline-none md:hidden">
          <div className="flex items-center justify-between">
            <LogoInicio shell={shell} />
            <D.Close asChild>
              <Button variante="ghost" tamanho="icone" aria-label="Fechar menu">
                <X strokeWidth={1.75} aria-hidden />
              </Button>
            </D.Close>
          </div>
          <D.Title className="sr-only">Menu</D.Title>
          <D.Description className="sr-only">Navegação principal</D.Description>
          <Navegacao shell={shell} compacto={false} aoNavegar={() => setAberta(false)} />
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export function AppShell({ shell, children }: { shell: Shell; children?: ReactNode }) {
  const { superAdmin } = useUtilizador();
  const [gaveta, setGaveta] = useState(false);
  const [colapsada, setColapsada] = useState(() => lerPrefs().barraColapsada);
  const alternar = () => {
    gravarPrefs({ barraColapsada: !colapsada });
    setColapsada(!colapsada);
  };
  const nomeShell = NOME_SHELL[shell];

  return (
    <Tooltip.Provider delayDuration={300}>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-2 focus:top-2"
      >
        Saltar para o conteúdo
      </a>
      <div className="flex min-h-screen bg-background">
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar py-4 md:flex",
            "w-16 px-2",
            colapsada ? "lg:w-16 lg:px-2" : "lg:w-60 lg:px-3",
          )}
        >
          <div className={cn("flex items-center", colapsada ? "justify-center" : "justify-center lg:justify-start lg:px-2")}>
            <LogoInicio shell={shell} comNome={false} className={colapsada ? "" : "lg:hidden"} />
            <LogoInicio shell={shell} className={colapsada ? "hidden" : "hidden lg:inline-flex"} />
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className={colapsada ? "" : "lg:hidden"}>
              <Navegacao shell={shell} compacto />
            </div>
            <div className={colapsada ? "hidden" : "hidden lg:block"}>
              <Navegacao shell={shell} compacto={false} />
            </div>
          </div>
          <p className={cn("border-t border-sidebar-border px-2 pt-3 text-[0.6875rem] text-muted-foreground", colapsada ? "hidden" : "hidden lg:block")}>© {new Date().getFullYear()} Rivo</p>
        </aside>
        <Gaveta shell={shell} aberta={gaveta} setAberta={setGaveta} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
            <Button variante="ghost" tamanho="icone" className="md:hidden" onClick={() => setGaveta(true)} aria-label="Abrir menu">
              <Menu strokeWidth={1.75} aria-hidden />
            </Button>
            <Button
              variante="ghost"
              tamanho="icone"
              className="hidden lg:inline-flex"
              onClick={alternar}
              aria-label={colapsada ? "Expandir barra lateral" : "Colapsar barra lateral"}
              aria-pressed={!colapsada}
            >
              <PanelLeft strokeWidth={1.75} aria-hidden />
            </Button>
            <LogoInicio shell={shell} comNome={false} className="md:hidden" />
            {nomeShell ? <p className="min-w-0 max-w-[11rem] truncate text-sm font-medium text-muted-foreground">{nomeShell}</p> : null}
            <div className="flex min-w-0 flex-1 justify-center px-2">
              <ProcurarPagina shell={shell} />
            </div>
            <Sino caminhoPagina={NOTIFICACOES[shell]} />
            <MenuTema />
            <MenuUtilizador shell={shell} />
          </header>
          <BarraSemLigacao />
          <RelogioSessao />
          {superAdmin ? (
            <Alert tom="aviso" className="rounded-none" titulo="Conta de operação. Use-a só para desbloquear configuração inicial." />
          ) : null}
          <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-[1440px] flex-1 p-4 focus:outline-none md:p-6 lg:p-8">
            {children ?? <Outlet />}
          </main>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
