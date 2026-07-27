import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const appPath = path.join(projectRoot, "app.js");
const source = fs.readFileSync(appPath, "utf8");

function findFunctionEnd(text, openingBrace) {
  let depth = 0;
  let mode = "code";
  const returnModes = [];
  const interpolationDepths = [];

  for (let i = openingBrace; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (mode === "single" || mode === "double") {
      if (char === "\\") {
        i += 1;
      } else if (
        (mode === "single" && char === "'") ||
        (mode === "double" && char === '"')
      ) {
        mode = returnModes.pop() || "code";
      }
      continue;
    }

    if (mode === "line-comment") {
      if (char === "\n") mode = returnModes.pop() || "code";
      continue;
    }

    if (mode === "block-comment") {
      if (char === "*" && next === "/") {
        i += 1;
        mode = returnModes.pop() || "code";
      }
      continue;
    }

    if (mode === "template") {
      if (char === "\\") {
        i += 1;
      } else if (char === "`") {
        mode = returnModes.pop() || "code";
      } else if (char === "$" && next === "{") {
        depth += 1;
        interpolationDepths.push(depth);
        returnModes.push("template");
        mode = "code";
        i += 1;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      returnModes.push(mode);
      mode = char === "'" ? "single" : "double";
      continue;
    }

    if (char === "`") {
      returnModes.push(mode);
      mode = "template";
      continue;
    }

    if (char === "/" && next === "/") {
      returnModes.push(mode);
      mode = "line-comment";
      i += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      returnModes.push(mode);
      mode = "block-comment";
      i += 1;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;

      if (
        interpolationDepths.length &&
        depth === interpolationDepths[interpolationDepths.length - 1] - 1
      ) {
        interpolationDepths.pop();
        mode = returnModes.pop() || "template";
        continue;
      }

      if (depth === 0) {
        let end = i + 1;
        if (text[end] === "\r") end += 1;
        if (text[end] === "\n") end += 1;
        return end;
      }
    }
  }

  throw new Error(`Não foi possível localizar o fim da função iniciada em ${openingBrace}.`);
}

const declarationPattern = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
const declarations = [];

for (const match of source.matchAll(declarationPattern)) {
  const openingBrace = source.indexOf("{", match.index);
  if (openingBrace === -1) {
    throw new Error(`Função ${match[1]} sem corpo.`);
  }

  declarations.push({
    name: match[1],
    start: match.index,
    end: findFunctionEnd(source, openingBrace),
  });
}

const occurrences = new Map();
for (const declaration of declarations) {
  const group = occurrences.get(declaration.name) || [];
  group.push(declaration);
  occurrences.set(declaration.name, group);
}

const removals = [];
const report = [];

for (const [name, group] of occurrences) {
  if (group.length < 2) continue;

  removals.push(...group.slice(0, -1));
  report.push({
    name,
    removed: group.length - 1,
    keptAtLine: source.slice(0, group.at(-1).start).split("\n").length,
  });
}

let cleaned = source;
for (const removal of removals.sort((a, b) => b.start - a.start)) {
  cleaned = cleaned.slice(0, removal.start) + cleaned.slice(removal.end);
}

cleaned = cleaned.replace(/(?:\r?\n){4,}/g, "\n\n\n");
fs.writeFileSync(appPath, cleaned, "utf8");

console.log(`Removidas ${removals.length} definições ocultas de ${report.length} funções.`);
for (const item of report.sort((a, b) => a.name.localeCompare(b.name))) {
  console.log(`- ${item.name}: ${item.removed} removida(s), versão mantida na linha original ${item.keptAtLine}`);
}
