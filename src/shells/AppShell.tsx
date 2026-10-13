/**
 * Shell comum aos três ambientes (§3.3, §4.4). Até 767 px a barra lateral é
 * uma gaveta; de 768 a 1023 px só ícones; a partir de 1024 px completa e
 * colapsável.
 */
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import * as D from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import { ChevronsLeft, ChevronsRight, LogOut, Menu, Monitor, Moon, Sun, UserCog, X, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, NavLink, Outlet } from "react-router";
import { useTema } from "@/app/theme";
import type { Shell } from "@/lib/auth/permissions";
import { gravarPrefs, lerPrefs, type Tema } from "@/lib/prefs";
import { sair, usePortalColaborador } from "@/features/identity/api";
import { RelogioSessao } from "@/features/identity/components/RelogioSessao";
import { useUtilizador } from "@/features/identity/utilizador";
import { BarraSemLigacao } from "@/features/sistema/BarraSemLigacao";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { cn } from "@/ui/cn";
import { Logo } from "@/ui/Layout";
import { CONTA, MENU, type EntradaMenu } from "./rotas";

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
          "flex h-9 items-center gap-3 rounded-md px-3 text-base text-sidebar-foreground hover:bg-secondary pointer-coarse:h-11",
          isActive && "bg-sidebar-active font-medium text-sidebar-active-foreground hover:bg-sidebar-active",
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

function Navegacao({ shell, compacto, aoNavegar }: { shell: Shell; compacto: boolean; aoNavegar?: () => void }) {
  const { pode } = useUtilizador();
  const itens = MENU[shell].filter((e) => pode(e.requer));
  const grupos = new Map<string, EntradaMenu[]>();
  for (const e of itens) {
    const g = e.grupo ?? "";
    grupos.set(g, [...(grupos.get(g) ?? []), e]);
  }
  return (
    <nav aria-label="Principal" className="flex flex-col gap-4">
      {[...grupos.entries()].map(([g, lista]) => (
        <div key={g || "_"} className="flex flex-col gap-0.5">
          {g && !compacto ? <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{g}</p> : null}
          {lista.map((e) => (
            <ItemMenu key={e.caminho} e={e} compacto={compacto} {...(aoNavegar ? { aoNavegar } : {})} />
          ))}
        </div>
      ))}
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
          className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-medium text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:size-11"
          aria-label={`Conta de ${nome}`}
        >
          {iniciais || "?"}
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
          {shell === "colaborador" && utilizador.permissions.length > 0 ? (
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
            <Logo />
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
            <Logo comNome={false} className={colapsada ? "" : "lg:hidden"} />
            <Logo className={colapsada ? "hidden" : "hidden lg:inline-flex"} />
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className={colapsada ? "" : "lg:hidden"}>
              <Navegacao shell={shell} compacto />
            </div>
            <div className={colapsada ? "hidden" : "hidden lg:block"}>
              <Navegacao shell={shell} compacto={false} />
            </div>
          </div>
          <Button
            variante="ghost"
            tamanho="icone"
            className="mx-auto hidden lg:inline-flex"
            onClick={alternar}
            aria-label={colapsada ? "Expandir barra lateral" : "Colapsar barra lateral"}
          >
            {colapsada ? <ChevronsRight strokeWidth={1.75} aria-hidden /> : <ChevronsLeft strokeWidth={1.75} aria-hidden />}
          </Button>
        </aside>
        <Gaveta shell={shell} aberta={gaveta} setAberta={setGaveta} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
            <Button variante="ghost" tamanho="icone" className="md:hidden" onClick={() => setGaveta(true)} aria-label="Abrir menu">
              <Menu strokeWidth={1.75} aria-hidden />
            </Button>
            <Logo comNome={false} className="md:hidden" />
            <div className="min-w-0 flex-1">{nomeShell ? <p className="truncate text-sm font-medium text-muted-foreground">{nomeShell}</p> : null}</div>
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
