import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const projectRoot = path.resolve(import.meta.dirname, "..");
const htmlPath = path.join(projectRoot, "index.html");

const scriptFiles = [
  "app.js",
  "js/operacoes.js",
  "js/administracao.js",
  "js/acesso.js",
];

const scriptSources = scriptFiles.map((file) => ({
  file,
  content: fs.readFileSync(path.join(projectRoot, file), "utf8"),
}));

const app = scriptSources.map(({ content }) => content).join("\n");
const html = fs.readFileSync(htmlPath, "utf8");

for (const { file, content } of scriptSources) {
  new vm.Script(content, { filename: file });
}

const declarations = [
  ...app.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm),
].map((match) => match[1]);

const duplicateNames = [...new Set(
  declarations.filter((name, index) => declarations.indexOf(name) !== index),
)];

if (duplicateNames.length) {
  throw new Error(`Funções duplicadas: ${duplicateNames.join(", ")}`);
}

const handlerNames = [
  ...html.matchAll(/\bon(?:click|change|input|keydown|submit)="([^"]+)"/g),
].flatMap((match) =>
  [...match[1].matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map((call) => call[1]),
);

const browserBuiltIns = new Set(["if"]);
const missingHandlers = [...new Set(handlerNames)]
  .filter((name) => !browserBuiltIns.has(name))
  .filter((name) => !declarations.includes(name))
  .sort();

if (missingHandlers.length) {
  throw new Error(`Ações do HTML sem função correspondente: ${missingHandlers.join(", ")}`);
}

const requiredFiles = [
  "index.html",
  "styles.css",
  ...scriptFiles,
  "manifest.json",
  "logo-cervejaria-da-lagoa.png",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
];

const missingFiles = requiredFiles.filter(
  (file) => !fs.existsSync(path.join(projectRoot, file)),
);

if (missingFiles.length) {
  throw new Error(`Arquivos obrigatórios ausentes: ${missingFiles.join(", ")}`);
}

console.log(`JavaScript válido: ${app.split(/\r?\n/).length} linhas em ${scriptFiles.length} arquivos.`);
console.log(`Funções declaradas: ${declarations.length}, sem duplicações.`);
console.log(`Ações verificadas no HTML: ${handlerNames.length}.`);
console.log("Arquivos essenciais presentes.");
