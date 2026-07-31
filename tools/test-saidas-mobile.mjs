import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const raiz = path.resolve(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(raiz, "styles.css"), "utf8");
const html = fs.readFileSync(path.join(raiz, "index.html"), "utf8");
const app = fs.readFileSync(path.join(raiz, "app.js"), "utf8");

function exigir(condicao, mensagem) {
  if (!condicao) {
    console.error(`FALHA: ${mensagem}`);
    process.exit(1);
  }
}

exigir(
  /#telaSaidas\s+\.linha2[\s\S]*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(css),
  "as colunas do formulário de saídas ainda podem forçar largura extra"
);
exigir(
  /#telaSaidas\s+\.item\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/.test(css),
  "as fichas de saída não possuem coluna de conteúdo flexível"
);
exigir(
  /#telaSaidas\s+\.codigoTag\s*\{[\s\S]*max-width:\s*100%[\s\S]*white-space:\s*normal/.test(css),
  "códigos longos ainda podem ultrapassar a tela"
);
exigir(
  /overflow-wrap:\s*anywhere/.test(css),
  "textos longos da saída não estão autorizados a quebrar linha"
);
exigir(
  html.includes("styles.css?v=producao-duas-etapas-dashboard-20260730") &&
    app.includes('APP_BUILD = "producao-duas-etapas-dashboard-20260730"'),
  "a versão de cache do conserto móvel não foi atualizada"
);

console.log(
  "Saídas móveis válidas: colunas flexíveis, textos e códigos longos contidos na tela."
);
