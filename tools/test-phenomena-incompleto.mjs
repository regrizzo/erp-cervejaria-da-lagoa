import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const projectRoot = path.resolve(import.meta.dirname, "..");
const appSource = fs.readFileSync(path.join(projectRoot, "app.js"), "utf8");
const sqlSource = fs.readFileSync(
  path.join(projectRoot, "08_RETIRADA_PHENOMENA_VOLUME_REAL.sql"),
  "utf8"
);

const context = vm.createContext({
  alert:() => {},
  caches:{},
  confirm:() => true,
  console,
  crypto:{ randomUUID:() => "00000000-0000-4000-8000-000000000000" },
  document:{
    addEventListener:() => {},
    createElement:() => ({ appendChild:() => {} }),
    getElementById:() => null
  },
  navigator:{},
  setTimeout,
  supabase:{ createClient:() => ({}) },
  window:{ caches:null }
});

vm.runInContext(appSource, context, { filename:"app.js" });

const incompleto = vm.runInContext(`
  calcularRetiradaPhenomena(
    0,
    0,
    0,
    0,
    { id:"barril-28", litros_atuais:28, capacidade_litros:30 },
    3
  );
`, context);

assert.equal(incompleto.litrosCompletos, 0);
assert.equal(incompleto.litrosIncompleto, 28);
assert.equal(incompleto.litros, 28);
assert.equal(incompleto.valor, 84);

const combinado = vm.runInContext(`
  calcularRetiradaPhenomena(
    1,
    0,
    1,
    0,
    { id:"barril-28", litros_atuais:28, capacidade_litros:30 },
    3
  );
`, context);

assert.equal(combinado.litrosCompletos, 40);
assert.equal(combinado.litrosIncompleto, 28);
assert.equal(combinado.litros, 68);
assert.equal(combinado.valor, 204);

assert.match(sqlSource, /erp_registrar_retirada_phenomena/);
assert.match(sqlSource, /litros = 28/);
assert.match(sqlSource, /valor_total = 84/);
assert.match(sqlSource, /quantidade = -28/);
assert.match(sqlSource, /quantidade = 84/);

console.log("Retirada Phenomena válida: barril incompleto de 28 L gera débito de R$ 84,00.");
