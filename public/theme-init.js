// Aplica o tema antes do primeiro paint, para não haver flash de tema claro.
// Lê a mesma chave que src/lib/prefs.ts escreve. Ficheiro externo de propósito:
// a CSP não aceita scripts inline.
(function () {
  var escolha = "sistema";
  try {
    var guardado = JSON.parse(window.localStorage.getItem("rivo.prefs") || "{}");
    if (guardado && (guardado.tema === "claro" || guardado.tema === "escuro")) escolha = guardado.tema;
  } catch (e) {
    // Armazenamento bloqueado ou valor inválido: segue o sistema.
  }
  var escuro =
    escolha === "escuro" ||
    (escolha === "sistema" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", escuro);
})();
