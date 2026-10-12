// A IV é vinculativa (§4.1): tokens e preset copiados byte a byte, nenhum hex nos componentes.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const falhas = [];
const IV = process.env.RIVO_IDENTIDADE ?? "../identidade";

if (existsSync(IV)) {
  for (const [copia, origem] of [
    ["src/styles/tokens.css", "tokens.css"],
    ["tailwind.preset.ts", "tailwind.preset.ts"],
  ]) {
    if (!readFileSync(copia).equals(readFileSync(join(IV, origem)))) falhas.push(`${copia} difere de ${IV}/${origem}`);
  }
} else {
  console.warn(`${IV} não encontrada: comparação byte a byte saltada.`);
}

function ficheiros(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? ficheiros(p) : [p];
  });
}

for (const f of ficheiros("src")) {
  if (!/\.(tsx?|css)$/.test(f) || f.endsWith("tokens.css") || f.endsWith("schema.d.ts")) continue;
  const linhas = readFileSync(f, "utf8").split("\n");
  linhas.forEach((l, i) => {
    if (/#[0-9a-fA-F]{3,8}\b/.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l)) falhas.push(`${f}:${i + 1}: cor literal`);
  });
}

if (falhas.length > 0) {
  console.error("Verificação dos tokens falhou:\n- " + falhas.join("\n- "));
  process.exit(1);
}
console.log("Verificação dos tokens: ok");
