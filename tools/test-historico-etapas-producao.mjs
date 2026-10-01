import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, "..");
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), "utf8");

const operacoes = ler("js/operacoes.js");
const sql15 = ler("15_ETAPAS_FERMENTACAO.sql");
const sql16 = ler("16_HISTORICO_ETAPAS_PRODUCAO.sql");
const app = ler("app.js");
const html = ler("index.html");

new Function(operacoes);

for (const status of [
  "FERMENTANDO",
  "RAMPA_DIACETIL",
  "MATURACAO",
  "DRY_HOPPING",
  "PRONTO_ENVASE",
  "PARCIALMENTE_ENVASADO",
  "ENVASADO",
  "FINALIZADO"
]) {
  assert.ok(operacoes.includes(status), `status ausente: ${status}`);
  assert.ok(sql15.includes(status), `status ausente no SQL 15: ${status}`);
  assert.ok(sql16.includes(status), `status ausente no SQL 16: ${status}`);
}

assert.ok(
  operacoes.includes('sb.rpc("erp_alterar_etapa_producao"'),
  "a alteração de etapa não usa a operação atômica"
);
assert.ok(
  operacoes.includes('sb.rpc("erp_editar_data_etapa_producao"'),
  "a edição da data da etapa não foi ligada à ficha"
);
assert.ok(
  operacoes.includes('sb.from("producao_etapas")'),
  "a ficha não carrega o histórico de etapas"
);
assert.ok(
  operacoes.includes("Editar data"),
  "a linha do tempo não oferece edição da data"
);

assert.match(sql16, /create table if not exists public\.producao_etapas/i);
assert.match(sql16, /create trigger trg_producoes_registrar_etapa/i);
assert.match(sql16, /erp_alterar_etapa_producao/i);
assert.match(sql16, /erp_editar_data_etapa_producao/i);
assert.match(sql16, /data_etapa <= current_date/i);
assert.doesNotMatch(
  sql16,
  /create trigger[\s\S]*?when\s*\(\s*tg_op/i,
  "TG_OP não pode ser usado na cláusula WHEN do CREATE TRIGGER"
);

assert.match(
  app,
  /APP_BUILD = "etapas-fermentacao-datas-20261001"/
);
assert.ok(
  html.includes("styles.css?v=etapas-fermentacao-datas-20261001"),
  "o cache do CSS não foi atualizado"
);
assert.ok(
  html.includes("js/operacoes.js?v=etapas-fermentacao-datas-20261001"),
  "o cache das operações não foi atualizado"
);

console.log("OK: etapas, datas efetivas e edição do histórico conferidas.");
