import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const raiz = path.resolve(import.meta.dirname, "..");
const sql = fs.readFileSync(
  path.join(raiz, "10_INTEGRIDADE_E_OPERACOES_ATOMICAS.sql"),
  "utf8"
);
const administracao = fs.readFileSync(
  path.join(raiz, "js", "administracao.js"),
  "utf8"
);
const operacoes = fs.readFileSync(
  path.join(raiz, "js", "operacoes.js"),
  "utf8"
);
const ordemSql = fs.readFileSync(path.join(raiz, "ORDEM_SQL.md"), "utf8");
const index = fs.readFileSync(path.join(raiz, "index.html"), "utf8");

function exigir(condicao, mensagem) {
  if (!condicao) {
    console.error(`FALHA: ${mensagem}`);
    process.exit(1);
  }
}

const rpcs = [
  "erp_registrar_entrada_cerveja",
  "erp_registrar_saida_multipla",
  "erp_registrar_producao",
  "erp_registrar_envase",
  "erp_registrar_dry_hopping"
];

for (const rpc of rpcs) {
  exigir(
    new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${rpc}\\b`, "i").test(sql),
    `a função ${rpc} não foi criada no SQL 10`
  );
  exigir(
    new RegExp(`revoke\\s+all\\s+on\\s+function\\s+public\\.${rpc}\\b[\\s\\S]*?from\\s+public`, "i").test(sql),
    `a função ${rpc} não revoga o acesso público`
  );
  exigir(
    new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${rpc}\\b[\\s\\S]*?to\\s+authenticated`, "i").test(sql),
    `a função ${rpc} não concede acesso autenticado`
  );
}

for (const rpc of [
  "erp_registrar_entrada_cerveja",
  "erp_registrar_saida_multipla",
  "erp_registrar_envase"
]) {
  exigir(
    administracao.includes(`sb.rpc("${rpc}"`),
    `a interface administrativa não chama ${rpc}`
  );
}

for (const rpc of [
  "erp_registrar_dry_hopping"
]) {
  exigir(
    operacoes.includes(`sb.rpc("${rpc}"`),
    `a interface operacional não chama ${rpc}`
  );
}

exigir(
  operacoes.includes('sb.rpc("erp_iniciar_producao_com_tanque"'),
  "a interface operacional não chama a produção em duas etapas"
);

exigir(
  (sql.match(/\bfor\s+update\b/gi) || []).length >= 5,
  "faltam bloqueios de concorrência nas leituras de estoque"
);
exigir(
  /pg_advisory_xact_lock/i.test(sql),
  "a criação de lotes não possui bloqueio contra duplicidade simultânea"
);
exigir(
  /check\s*\(\s*coalesce\s*\(\s*quantidade\s*,\s*0\s*\)\s*>=\s*0\s*\)/i.test(sql),
  "o estoque de insumos não está protegido contra valores negativos"
);
exigir(
  /coalesce\s*\(\s*q30\s*,\s*0\s*\)\s*>=\s*0[\s\S]*coalesce\s*\(\s*q50\s*,\s*0\s*\)\s*>=\s*0[\s\S]*coalesce\s*\(\s*q30\s*,\s*0\s*\)\s*\*\s*30[\s\S]*coalesce\s*\(\s*q50\s*,\s*0\s*\)\s*\*\s*50/i.test(sql),
  "o estoque de cerveja não possui validação de quantidade e litros"
);
exigir(
  /create\s+or\s+replace\s+function\s+public\.app_registrar_autor/i.test(sql) &&
    /app_eh_admin\s*\(\s*\)/i.test(sql),
  "a proteção de autoria da auditoria não foi reforçada"
);
exigir(
  /10_INTEGRIDADE_E_OPERACOES_ATOMICAS\.sql/.test(ordemSql),
  "a ordem de instalação não documenta o SQL 10"
);
exigir(
  !/user-scalable\s*=\s*no/i.test(index) && !/maximum-scale\s*=\s*1/i.test(index),
  "o zoom continua bloqueado no celular"
);
exigir(
  (sql.match(/\$\$/g) || []).length % 2 === 0,
  "há um delimitador $$ sem par no SQL"
);
exigir(
  /^\s*begin\s*;/im.test(sql) && /^\s*commit\s*;/im.test(sql),
  "o SQL 10 não está envolvido em transação"
);

console.log(
  "Integridade validada: 5 operações atômicas, bloqueios de concorrência, " +
    "permissões, restrições de estoque, documentação e acessibilidade."
);
