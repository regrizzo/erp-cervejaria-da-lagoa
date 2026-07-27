import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const appPath = path.join(projectRoot, "app.js");
const source = fs.readFileSync(appPath, "utf8");

const operationsMarker = `/* ==========================================================
   ATUALIZAÇÃO OPERACIONAL COMPLETA`;
const administrationMarker = `/* ==========================================================
   CORREÇÕES SEGURAS E RESTAURAÇÃO DE BACKUP`;
const accessMarker = `/* ==========================================================
   CONTROLE DE ACESSO POR USUÁRIO`;

const operationsStart = source.indexOf(operationsMarker);
const administrationStart = source.indexOf(administrationMarker);
const accessStart = source.indexOf(accessMarker);

if ([operationsStart, administrationStart, accessStart].some((index) => index < 0)) {
  throw new Error("Os marcadores esperados não foram encontrados em app.js.");
}

if (!(operationsStart < administrationStart && administrationStart < accessStart)) {
  throw new Error("Os blocos do app estão fora da ordem esperada.");
}

const jsDirectory = path.join(projectRoot, "js");
fs.mkdirSync(jsDirectory, { recursive: true });

const parts = [
  [appPath, source.slice(0, operationsStart).trimEnd() + "\n"],
  [
    path.join(jsDirectory, "operacoes.js"),
    source.slice(operationsStart, administrationStart).trimEnd() + "\n",
  ],
  [
    path.join(jsDirectory, "administracao.js"),
    source.slice(administrationStart, accessStart).trimEnd() + "\n",
  ],
  [
    path.join(jsDirectory, "acesso.js"),
    source.slice(accessStart).trimEnd() + "\n",
  ],
];

for (const [file, content] of parts) {
  fs.writeFileSync(file, content, "utf8");
  console.log(`${path.relative(projectRoot, file)}: ${content.split("\n").length - 1} linhas`);
}
