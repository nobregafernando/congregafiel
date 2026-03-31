const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function carregarScript(relPath, simboloGlobal) {
  const absPath = path.resolve(__dirname, "..", "..", relPath);
  const codigo = fs.readFileSync(absPath, "utf8");
  const sufixo = simboloGlobal
    ? `\n;globalThis.__testeExportado = typeof ${simboloGlobal} !== "undefined" ? ${simboloGlobal} : undefined;`
    : "";

  vm.runInThisContext(codigo + sufixo, { filename: absPath });
  return simboloGlobal ? globalThis.__testeExportado : undefined;
}

module.exports = { carregarScript };
