import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { queryClient } from "@/app/queryClient";
import { router } from "@/app/router";
import { ProvedorTema } from "@/app/theme";
import { restaurarSessao } from "@/lib/auth/session";
import "@/styles/index.css";

// Antes do primeiro render: a sessão desta aba sobrevive ao F5 (D3).
restaurarSessao();

const raiz = document.getElementById("root");
if (!raiz) throw new Error("Elemento #root em falta.");

createRoot(raiz).render(
  <StrictMode>
    <ProvedorTema>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ProvedorTema>
  </StrictMode>,
);
