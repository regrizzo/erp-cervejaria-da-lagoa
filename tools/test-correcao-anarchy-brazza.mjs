import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sql = fs.readFileSync(
  path.join(projectRoot, "09_CORRIGIR_VINCULO_ANARCHY_BRAZZA.sql"),
  "utf8"
);

const litrosRetiradosAntes = 90 + 30;
const litrosRetiradosDepois = 88 + 30;
const litrosEntradaAntes = 570;
const litrosEntradaDepois = 18 * 30 + 28;
const valorAntes = 270 + 90;
const valorDepois = 264 + 90;

assert.equal(litrosRetiradosAntes - litrosRetiradosDepois, 2);
assert.equal(litrosEntradaAntes - litrosEntradaDepois, 2);
assert.equal(valorAntes - valorDepois, 6);

assert.match(sql, /Renan 30 L; Brazza 28 L; Layback 30 L/);
assert.match(sql, /litros = 88/);
assert.match(sql, /valor_total = 264/);
assert.match(sql, /q30 = 18/);
assert.match(sql, /litros_barris = 540/);
assert.match(sql, /litros_incompleto = 28/);
assert.match(sql, /litros = 568/);
assert.match(sql, /'CONSUMIDO'/);
assert.doesNotMatch(sql, /update public\.estoque_cerveja/i);

console.log(
  "Correção Anarchy/Brazza válida: entrada e saídas reduzidas em 2 L, mantendo o estoque atual inalterado."
);
