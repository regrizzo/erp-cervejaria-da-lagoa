import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const operacoes = fs.readFileSync(new URL("../js/operacoes.js", import.meta.url), "utf8");

assert.match(app, /\.from\("estoque_insumos"\)[\s\S]*\.filter\(item => Number\(item\.quantidade \|\| 0\) > 0\)/);
assert.match(app, /state\.cervejas\.filter\(c => state\.cervejasSaidaComSaldo\.has\(c\.nome\)\)/);
assert.match(app, /\.eq\("origem","PHENOMENA"\)[\s\S]*\.eq\("status","DISPONIVEL"\)/);
assert.match(operacoes, /i\.nome === selecionado \|\| insumoComSaldo\(i\.tipo, i\.nome\)/);
assert.match(operacoes, /prepararSelectCervejas\("prodCerveja"\)/);

const elementos = new Map();
const criarSelect = () => ({
  disabled: false,
  options: [],
  set innerHTML(valor) {
    this._innerHTML = valor;
    this.options = [{ value:"", textContent:"" }];
  },
  get innerHTML() { return this._innerHTML; },
  appendChild(opcao) { this.options.push(opcao); }
});

const contexto = {
  console,
  navigator: {},
  window: { caches:null },
  document: {
    addEventListener() {},
    getElementById(id) { return elementos.get(id); },
    createElement() { return { dataset:{} }; }
  },
  supabase: { createClient: () => ({}) },
  setTimeout,
  clearTimeout,
  __elementos: elementos
};

elementos.set("malte", criarSelect());
elementos.set("phenRetiradaCerveja", criarSelect());

vm.createContext(contexto);
vm.runInContext(`${app}\n
  state.insumos = [
    { tipo:"MALTE", nome:"Pilsen", unidade:"KG" },
    { tipo:"MALTE", nome:"Munich", unidade:"KG" },
    { tipo:"LUPULO", nome:"Citra", unidade:"G" }
  ];
  state.insumosComSaldo = new Set([chaveInsumoEstoque("MALTE", "Pilsen")]);
  prepararSelectInsumos("malte", "MALTE", "Selecionar malte");
  globalThis.__resultadoMaltes = globalThis.__elementos.get("malte").options.slice(1).map(o => o.value);

  state.cervejas = [{ nome:"ANARCHY" }, { nome:"ALIEN IPA" }];
  state.cervejasPhenomenaComSaldo = new Set(["ANARCHY"]);
  prepararSelectCervejas("phenRetiradaCerveja");
  globalThis.__resultadoPhen = globalThis.__elementos.get("phenRetiradaCerveja").options.slice(1).map(o => o.value);
`, contexto);

assert.deepEqual(Array.from(contexto.__resultadoMaltes), ["Pilsen"]);
assert.deepEqual(Array.from(contexto.__resultadoPhen), ["ANARCHY"]);

console.log("OK: seletores de consumo ocultam itens sem saldo e preservam os cadastros necessarios.");
