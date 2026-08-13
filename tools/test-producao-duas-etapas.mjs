import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const raiz = path.resolve(import.meta.dirname, "..");
const sql = fs.readFileSync(
  path.join(raiz, "11_PRODUCAO_EM_DUAS_ETAPAS.sql"),
  "utf8"
);
const sqlTanques = fs.readFileSync(
  path.join(raiz, "13_TANQUES_PRODUCAO.sql"),
  "utf8"
);
const operacoes = fs.readFileSync(
  path.join(raiz, "js", "operacoes.js"),
  "utf8"
);
const app = fs.readFileSync(path.join(raiz, "app.js"), "utf8");
const index = fs.readFileSync(path.join(raiz, "index.html"), "utf8");
const ordem = fs.readFileSync(path.join(raiz, "ORDEM_SQL.md"), "utf8");

function exigir(condicao, mensagem) {
  if (!condicao) {
    console.error(`FALHA: ${mensagem}`);
    process.exit(1);
  }
}

for (const rpc of [
  "erp_iniciar_producao",
  "erp_informar_volume_producao"
]) {
  exigir(
    new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${rpc}\\b`, "i").test(sql),
    `o SQL 11 não cria ${rpc}`
  );
  exigir(
    new RegExp(`revoke\\s+all\\s+on\\s+function\\s+public\\.${rpc}\\b[\\s\\S]*?from\\s+public`, "i").test(sql),
    `${rpc} não revoga o acesso público`
  );
  exigir(
    new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${rpc}\\b[\\s\\S]*?to\\s+authenticated`, "i").test(sql),
    `${rpc} não concede acesso autenticado`
  );
}

exigir(
  /producoes_litros_nao_negativos[\s\S]*coalesce\s*\(\s*litros_produzidos\s*,\s*0\s*\)\s*>=\s*0/i.test(sql),
  "o SQL 11 não permite volume pendente com segurança"
);
exigir(
  /status\s*=\s*'INSUMOS_REGISTRADOS'/i.test(sql),
  "o SQL 11 não registra o estado de volume pendente"
);
exigir(
  /for\s+update/i.test(sql),
  "a etapa de informar volume não bloqueia o lote contra concorrência"
);
exigir(
  /create\s+trigger\s+dry_hopping_exigir_volume/i.test(sql) &&
    /create\s+trigger\s+envases_exigir_volume/i.test(sql),
  "o banco não bloqueia dry hopping e envase antes do volume"
);
exigir(
  /producoes_volume_status_coerente[\s\S]*status\s*=\s*'INSUMOS_REGISTRADOS'/i.test(sql),
  "o banco não garante a coerência entre volume pendente e status"
);
exigir(
  /coalesce\s*\(\s*v_producao\.litros_produzidos\s*,\s*0\s*\)\s*>\s*0/i.test(sql),
  "o SQL 11 não impede informar o volume duas vezes"
);
exigir(
  /insumos_baixados_novamente'\s*,\s*false/i.test(sql),
  "o retorno da segunda etapa não confirma a ausência de nova baixa"
);
exigir(
  operacoes.includes('sb.rpc("erp_iniciar_producao_com_tanque"') &&
    operacoes.includes('sb.rpc("erp_informar_volume_producao"') &&
    /public\.erp_iniciar_producao\s*\(/.test(sqlTanques),
  "a interface não preserva as duas operações do SQL 11 por meio do controle de tanques"
);
exigir(
  operacoes.includes('"INSUMOS_REGISTRADOS"') &&
    operacoes.includes("volumeProducaoPendente"),
  "a interface não reconhece o estado de volume pendente"
);
exigir(
  index.includes('id="formVolumeProducao"') &&
    index.includes('onclick="salvarVolumeProducao()"'),
  "o formulário para informar os litros não está disponível"
);
exigir(
  /filter\s*\(\s*p\s*=>\s*!volumeProducaoPendente\(p\)\s*\)/.test(app),
  "lotes sem volume ainda aparecem nas etapas seguintes"
);
exigir(
  /11_PRODUCAO_EM_DUAS_ETAPAS\.sql/.test(ordem),
  "a ordem SQL não documenta a atualização 11"
);
exigir(
  (sql.match(/\$\$/g) || []).length % 2 === 0 &&
    /^\s*begin\s*;/im.test(sql) &&
    /^\s*commit\s*;/im.test(sql),
  "o SQL 11 não está completo dentro de uma transação"
);

console.log(
  "Produção em duas etapas validada: baixa única de insumos, volume pendente, " +
    "proteção contra repetição e bloqueio das etapas seguintes."
);
