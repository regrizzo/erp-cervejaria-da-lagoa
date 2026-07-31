import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const raiz = path.resolve(import.meta.dirname, "..");
const app = fs.readFileSync(path.join(raiz, "app.js"), "utf8");
const index = fs.readFileSync(path.join(raiz, "index.html"), "utf8");

function exigir(condicao, mensagem) {
  if (!condicao) {
    console.error(`FALHA: ${mensagem}`);
    process.exit(1);
  }
}

exigir(
  /graficoEstoqueCerveja"[\s\S]{0,120}limite\s*:\s*20/.test(app),
  "o painel de cervejas em estoque não exibe até 20 itens"
);
exigir(
  /graficoSaidasCerveja"[\s\S]{0,120}limite\s*:\s*20/.test(app),
  "o painel de saídas não exibe até 20 cervejas"
);
exigir(
  /from\("movimentacoes"\)[^\n]+limit\(20\)/.test(app),
  "o histórico do painel não carrega 20 movimentações"
);
exigir(
  /\.slice\(0,16\)/.test(app),
  "as listas operacionais do painel não foram ampliadas"
);
exigir(
  index.includes("Até 20 cervejas"),
  "o painel não informa o novo limite de saídas"
);

console.log(
  "Dashboard ampliado validado: estoque e saídas até 20 itens, listas até 16 e histórico com 20 movimentações."
);
