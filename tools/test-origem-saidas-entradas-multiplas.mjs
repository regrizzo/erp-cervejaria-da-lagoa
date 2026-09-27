import fs from "node:fs";

const ler = arquivo => fs.readFileSync(new URL(`../${arquivo}`, import.meta.url), "utf8");
const app = ler("app.js");
const admin = ler("js/administracao.js");
const html = ler("index.html");
const sql = ler("14_ORIGEM_SAIDAS_E_ENTRADAS_MULTIPLAS.sql");

const testes = [
  ["saída oferece origem por item", html.includes('class="saidaItemOrigem"') || app.includes('class="saidaItemOrigem"')],
  ["saída comum consulta apenas Produção e Itapema", app.includes('.in("origem", ["PRODUCAO","ITAPEMA"])')],
  ["simulação recebe uma origem explícita", app.includes("simularBaixaCervejaVirtual(cerveja_nome, origem")],
  ["RPC recebe a origem escolhida", admin.includes("origem:item.origem")],
  ["entrada de cerveja aceita várias linhas", html.includes('id="entradaCervejaItens"') && app.includes("adicionarEntradaCervejaItem")],
  ["entrada de insumo aceita várias linhas", html.includes('id="entradaInsumoItens"') && app.includes("adicionarEntradaInsumoItem")],
  ["cerveja manual fica fixa em Itapema", html.includes('id="entradaOrigem" type="hidden" value="ITAPEMA"')],
  ["banco exclui Phenomena da saída comum", sql.includes("origem in ('PRODUCAO','ITAPEMA')") && !sql.includes("origem in ('PRODUCAO','ITAPEMA','PHENOMENA')")],
  ["banco cria entrada múltipla de cerveja", sql.includes("erp_registrar_entrada_cerveja_multipla")],
  ["banco cria entrada múltipla de insumos", sql.includes("erp_registrar_entrada_insumos_multipla")],
  ["operações em lote são transacionais", sql.includes("begin;") && sql.includes("commit;")]
];

const falhas = testes.filter(([, passou]) => !passou);
testes.forEach(([nome, passou]) => console.log(`${passou ? "OK" : "FALHA"} - ${nome}`));

if (falhas.length) process.exit(1);
console.log("\nOrigem das saídas e entradas múltiplas: testes estáticos aprovados.");
