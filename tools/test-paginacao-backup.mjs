import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const projectRoot = path.resolve(import.meta.dirname, "..");
const appSource = fs.readFileSync(
  path.join(projectRoot, "app.js"),
  "utf8"
);
const administracaoSource = fs.readFileSync(
  path.join(projectRoot, "js", "administracao.js"),
  "utf8"
);

const registros = Array.from(
  { length:1205 },
  (_,i) => ({ id:String(i + 1).padStart(4,"0") })
);
const intervalos = [];

function criarConsulta() {
  return {
    select() {
      return this;
    },
    order() {
      return this;
    },
    async range(inicio, fim) {
      intervalos.push([inicio, fim]);
      return {
        data:registros.slice(inicio, fim + 1),
        error:null,
        count:registros.length
      };
    }
  };
}

const context = vm.createContext({
  alert:() => {},
  caches:{},
  confirm:() => true,
  console,
  crypto:{
    randomUUID:() => "00000000-0000-4000-8000-000000000000"
  },
  document:{
    addEventListener:() => {},
    getElementById:() => null
  },
  navigator:{},
  setTimeout,
  supabase:{
    createClient:() => ({
      from:() => criarConsulta()
    })
  },
  window:{ caches:null }
});

vm.runInContext(appSource, context, { filename:"app.js" });

const resultado = await vm.runInContext(
  "buscarTodasLinhas('movimentacoes',{verificarContagem:true})",
  context
);

assert.equal(resultado.length, 1205);
assert.deepEqual(intervalos, [
  [0,499],
  [500,999],
  [1000,1499]
]);

assert.match(administracaoSource, /versao:3/);
assert.match(administracaoSource, /verificarContagem:true/);
assert.match(administracaoSource, /Backup cancelado/);
assert.match(administracaoSource, /Backup incompleto ou alterado/);

console.log(
  "Paginação e backup válidos: 1.205 registros lidos em 3 páginas, com contagem e bloqueio de cópia incompleta."
);
