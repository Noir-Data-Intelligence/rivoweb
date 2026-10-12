/**
 * Raiz das rotas: reage ao fim da sessão (401, inactividade, outra aba). A
 * cache do Query limpa-se sempre que a sessão acaba, venha o fim de onde vier.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Outlet } from "react-router";
import { obterSessao, subscreverSessao } from "@/lib/auth/session";
import { sair } from "../api";
import { ouvirOutrasAbas } from "../broadcast";

export function RaizSessao() {
  const qc = useQueryClient();

  useEffect(
    () =>
      subscreverSessao(() => {
        if (obterSessao() === null) qc.clear();
      }),
    [qc],
  );

  useEffect(() => ouvirOutrasAbas(() => sair("outra-aba")), []);

  return <Outlet />;
}
