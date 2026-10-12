/**
 * Rotas conhecidas, para validar o `voltar` do login (S6). O router regista a
 * sua tabela no arranque; não há uma segunda lista de caminhos.
 */
import { matchRoutes, type RouteObject } from "react-router";

let tabela: RouteObject[] = [];

export function registarRotas(rotas: RouteObject[]): void {
  tabela = rotas;
}

export function rotaConhecida(caminho: string): boolean {
  const r = matchRoutes(tabela, caminho);
  if (!r || r.length === 0) return false;
  // A rota «*» (404) casa com tudo; não conta como conhecida.
  return r[r.length - 1]?.route.path !== "*";
}
