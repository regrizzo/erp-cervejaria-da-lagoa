import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const projectRoot = path.resolve(import.meta.dirname, "..");
const appSource = fs.readFileSync(path.join(projectRoot, "app.js"), "utf8");

const context = vm.createContext({
  alert:() => {},
  caches:{},
  confirm:() => true,
  console,
  crypto:{ randomUUID:() => "00000000-0000-4000-8000-000000000000" },
  document:{
    addEventListener:() => {},
    getElementById:() => null
  },
  navigator:{},
  setTimeout,
  supabase:{ createClient:() => ({}) },
  window:{ caches:null }
});

vm.runInContext(appSource, context, { filename:"app.js" });

const result = vm.runInContext(`
  state.debitosPhenomena = [
    { id:"1", cerveja_nome:"ALIENIPA", criado_em:"2026-07-06T21:24:00-03:00", valor_total:734.92, valor_pago:0 },
    { id:"2", cerveja_nome:"ALIENIPA", criado_em:"2026-07-07T17:39:00-03:00", valor_total:90, valor_pago:0 },
    { id:"3", cerveja_nome:"ALIENIPA", criado_em:"2026-07-14T19:18:00-03:00", valor_total:90, valor_pago:0 },
    { id:"4", cerveja_nome:"ALIENIPA", criado_em:"2026-07-18T16:04:00-03:00", valor_total:90, valor_pago:0 },
    { id:"5", cerveja_nome:"ALIENIPA", criado_em:"2026-07-18T16:07:00-03:00", valor_total:90, valor_pago:0 },
    { id:"6", cerveja_nome:"ANARCHY", criado_em:"2026-07-22T22:54:00-03:00", valor_total:270, valor_pago:0 },
    { id:"7", cerveja_nome:"ANARCHY", criado_em:"2026-07-24T21:15:00-03:00", valor_total:90, valor_pago:0 }
  ];
  simularPagamentoPhenomenaFifo(1200);
`, context);

assert.equal(result.valor, 1200);
assert.equal(result.quitados, 5);
assert.equal(result.parciais, 1);
assert.equal(result.aplicacoes.length, 6);
assert.equal(result.aplicacoes[5].aplicado, 105.08);
assert.equal(result.aplicacoes[5].saldoDepois, 164.92);
assert.equal(result.saldoDepois, 254.92);
assert.equal(result.excedente, 0);

const excess = vm.runInContext("simularPagamentoPhenomenaFifo(2000)", context);
assert.equal(excess.excedente, 545.08);

console.log("FIFO Phenomena válido: 5 débitos quitados e 1 parcial no cenário de R$ 1.200,00.");
