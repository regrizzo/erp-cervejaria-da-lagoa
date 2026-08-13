import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const raiz = path.resolve(import.meta.dirname, "..");
const sql = fs.readFileSync(path.join(raiz, "12_CORRECOES_PRODUCAO_E_DRY_HOPPING.sql"), "utf8");
const operacoes = fs.readFileSync(path.join(raiz, "js", "operacoes.js"), "utf8");
const index = fs.readFileSync(path.join(raiz, "index.html"), "utf8");
const ordem = fs.readFileSync(path.join(raiz, "ORDEM_SQL.md"), "utf8");

function exigir(condicao, mensagem) {
  if (!condicao) {
    console.error(`FALHA: ${mensagem}`);
    process.exit(1);
  }
}

for (const rpc of ["erp_editar_data_producao", "erp_editar_insumo_consumido"]) {
  exigir(
    new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${rpc}\\b`, "i").test(sql),
    `o SQL 12 não cria ${rpc}`
  );
  exigir(
    new RegExp(`revoke\\s+all\\s+on\\s+function\\s+public\\.${rpc}\\b[\\s\\S]*?from\\s+public`, "i").test(sql),
    `${rpc} não revoga o acesso público`
  );
  exigir(
    new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${rpc}\\b[\\s\\S]*?to\\s+authenticated`, "i").test(sql),
    `${rpc} não concede acesso autenticado`
  );
  exigir(
    operacoes.includes(`sb.rpc("${rpc}"`),
    `a interface não chama ${rpc}`
  );
}

exigir(
  /for\s+update/gi.test(sql) && /pg_advisory_xact_lock/i.test(sql),
  "as correções não possuem bloqueio contra concorrência"
);
exigir(
  /quantidade\s*=\s*coalesce\(quantidade,0\)\s*\+\s*coalesce\(v_item\.quantidade,0\)\s*-\s*v_quantidade_nova/i.test(sql),
  "a correção da mesma matéria-prima não ajusta somente a diferença"
);
exigir(
  /update\s+public\.dry_hopping[\s\S]*lupulo_nome\s*=\s*v_nome_novo/i.test(sql),
  "o registro do dry hopping não acompanha a correção do insumo"
);
exigir(
  /CORRECAO INSUMO ESTORNO/i.test(sql) && /CORRECAO INSUMO BAIXA/i.test(sql),
  "a correção de estoque não registra as duas pontas no histórico"
);
exigir(
  /not\s+exists\s*\([\s\S]*from\s+public\.dry_hopping[\s\S]*status\s*=\s*'FERMENTANDO'/i.test(sql),
  "a remoção do último dry hopping não restaura o status de fermentação"
);
exigir(
  index.includes('id="formEditarProducao"') &&
    index.includes('id="editarProducaoData"') &&
    index.includes('id="editarInsumosDryHop"'),
  "o formulário de correção está incompleto"
);
exigir(
  operacoes.includes("removerInsumoConsumido") &&
    operacoes.includes("abrirEdicaoDaProducao"),
  "faltam ações de correção na interface"
);
exigir(
  operacoes.includes('"CORRECAO DATA PRODUCAO"') &&
    operacoes.includes('"CORRECAO INSUMO ESTORNO"'),
  "as correções não aparecem na linha do tempo do lote"
);
exigir(
  /12_CORRECOES_PRODUCAO_E_DRY_HOPPING\.sql/.test(ordem),
  "a ordem SQL não documenta a atualização 12"
);
exigir(
  (sql.match(/\$\$/g) || []).length % 2 === 0 &&
    /^\s*begin\s*;/im.test(sql) &&
    /^\s*commit\s*;/im.test(sql),
  "o SQL 12 não está completo dentro de uma transação"
);

console.log(
  "Correções de produção validadas: data, troca/quantidade/remoção de insumos, " +
  "ajuste diferencial do estoque, dry hopping vinculado e histórico."
);
