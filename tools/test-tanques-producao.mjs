import assert from "node:assert/strict";
import fs from "node:fs";

const ler = arquivo => fs.readFileSync(new URL(`../${arquivo}`, import.meta.url), "utf8");

const html = ler("index.html");
const app = ler("app.js");
const operacoes = ler("js/operacoes.js");
const sql = ler("13_TANQUES_PRODUCAO.sql");
const ordem = ler("ORDEM_SQL.md");

assert.match(html, /<select id="prodTanque"/);
assert.match(html, /<select id="editarProducaoTanque"/);
assert.match(html, /salvarTanqueProducaoCorrigido\(\)/);
assert.match(app, /APP_BUILD = "tanques-producao-20260813"/);

assert.match(operacoes, /for \(let tanque=1; tanque<=5; tanque\+\+\)/);
assert.match(operacoes, /ocupado por \$\{ocupante\.cerveja_nome\}/);
assert.match(operacoes, /erp_iniciar_producao_com_tanque/);
assert.match(operacoes, /erp_editar_tanque_producao/);
assert.match(operacoes, /CORRECAO TANQUE PRODUCAO/);
assert.match(operacoes, /rotuloTanqueProducao/);
assert.match(operacoes, /p\.tanque/);

assert.match(sql, /add column if not exists tanque smallint/i);
assert.match(sql, /tanque between 1 and 5/i);
assert.match(sql, /create unique index if not exists producoes_tanque_ativo_unico/i);
assert.match(sql, /pg_advisory_xact_lock/);
assert.match(sql, /O tanque % ja esta ocupado por outra producao em andamento/);
assert.match(sql, /status in \(\s*'INSUMOS_REGISTRADOS','FERMENTANDO','DRY_HOPPING'/);
assert.match(sql, /CORRECAO TANQUE PRODUCAO/);
assert.match(sql, /grant execute on function public\.erp_editar_tanque_producao/);
assert.match(sql, /notify pgrst, 'reload schema'/);
assert.match(ordem, /13_TANQUES_PRODUCAO\.sql/);

console.log("Tanques validados: seleção de 1 a 5, ocupação exclusiva, cadastro, edição e histórico.");
