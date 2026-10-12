// Serve `dist/` com os cabeçalhos e rewrites de `vercel.json`, para o e2e testar a
// CSP tal como sai em produção (S13). Só para testes locais.
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const PORTO = Number(process.env.PORT ?? 4173);
const DIST = "dist";
const cfg = JSON.parse(readFileSync("vercel.json", "utf8"));

// A CSP de produção liga a https://syyt.tech; em teste local a API pode ser outra.
const API_TESTE = process.env.API_TESTE ?? "";

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

const regex = (fonte) => new RegExp(`^${fonte.replace(/\(\(\?!/g, "((?!")}$`);

createServer((req, res) => {
  const caminho = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
  for (const h of cfg.headers) {
    if (!regex(h.source).test(caminho)) continue;
    for (const { key, value } of h.headers) {
      if (key === "Strict-Transport-Security") continue;
      let v = value;
      if (key === "Content-Security-Policy") {
        // Servido em http://localhost: o WebKit aplicaria upgrade-insecure-requests
        // também aqui. Em produção (https) a directiva fica.
        v = v.replace(" upgrade-insecure-requests;", "");
        if (API_TESTE) v = v.replace("https://syyt.tech", `https://syyt.tech ${API_TESTE}`);
      }
      res.setHeader(key, v);
    }
  }
  let ficheiro = normalize(join(DIST, caminho));
  if (!ficheiro.startsWith(normalize(DIST)) || !existsSync(ficheiro) || statSync(ficheiro).isDirectory()) {
    const reescrita = cfg.rewrites.some((r) => regex(r.source).test(caminho));
    if (!reescrita) {
      res.writeHead(404).end();
      return;
    }
    ficheiro = join(DIST, "index.html");
  }
  res.setHeader("Content-Type", TIPOS[extname(ficheiro)] ?? "application/octet-stream");
  createReadStream(ficheiro).pipe(res);
}).listen(PORTO, () => console.log(`dist em http://localhost:${PORTO}`));
