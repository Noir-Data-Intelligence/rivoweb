// `schema.d.ts` é gerado e nunca se edita à mão (§1.3): regenera e compara.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "rivo-api-"));
const gerado = join(dir, "schema.d.ts");
try {
  execFileSync(process.execPath, ["node_modules/openapi-typescript/bin/cli.js", "openapi/v1.json", "-o", gerado], { stdio: "ignore" });
  const norm = (s) => s.replace(/\r\n/g, "\n");
  if (norm(readFileSync(gerado, "utf8")) !== norm(readFileSync("src/lib/api/schema.d.ts", "utf8"))) {
    console.error("src/lib/api/schema.d.ts não corresponde a openapi/v1.json. Corra npm run api:types.");
    process.exit(1);
  }
  console.log("Tipos da API: ok");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
