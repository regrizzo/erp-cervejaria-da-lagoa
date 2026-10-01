import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..");
const operacoes = fs.readFileSync(path.join(raiz, "js", "operacoes.js"), "utf8");
const estilos = fs.readFileSync(path.join(raiz, "styles.css"), "utf8");
const sql = fs.readFileSync(path.join(raiz, "15_ETAPAS_FERMENTACAO.sql"), "utf8");
const app = fs.readFileSync(path.join(raiz, "app.js"), "utf8");
const html = fs.readFileSync(path.join(raiz, "index.html"), "utf8");

const posicoes = [
  "FERMENTANDO",
  "RAMPA_DIACETIL",
  "MATURACAO",
  "DRY_HOPPING",
  "PRONTO_ENVASE"
].map(status => operacoes.indexOf(`\"${status}\"`));

assert.ok(posicoes.every(posicao => posicao >= 0), "faltam etapas no fluxo operacional");
assert.deepEqual([...posicoes].sort((a,b) => a-b), posicoes, "as etapas estão fora da ordem esperada");
assert.match(operacoes, /RAMPA_DIACETIL:\"Rampa de diacetil\"/);
assert.match(operacoes, /MATURACAO:\"Maturação\"/);
assert.match(operacoes, /status-diacetil/);
assert.match(operacoes, /status-maturacao/);
assert.match(operacoes, /Iniciar rampa de diacetil/);
assert.match(operacoes, /Iniciar maturação/);
assert.match(estilos, /\.status-diacetil/);
assert.match(estilos, /\.status-maturacao/);
assert.match(sql, /'RAMPA_DIACETIL'[\s\S]*'MATURACAO'[\s\S]*'DRY_HOPPING'/);
assert.match(sql, /create unique index producoes_tanque_ativo_unico/i);
assert.match(sql, /indexdef like '%RAMPA_DIACETIL%'/);
assert.match(sql, /indexdef like '%MATURACAO%'/);
assert.match(app, /APP_BUILD = "etapas-fermentacao-datas-20261001"/);
assert.match(html, /styles\.css\?v=etapas-fermentacao-datas-20261001/);

console.log("Etapas validadas: fermentação, rampa de diacetil, maturação, dry hopping e envase.");
