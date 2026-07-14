
const APP_BUILD = "codigos-barris-baixa-obrigatoria-20260714";

// Evita o celular/PWA segurar arquivos antigos do app.
(function limparCacheAntigo() {
  try {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then(regs => regs.forEach(reg => reg.unregister()))
        .catch(() => {});
    }
    if (window.caches) {
      caches.keys()
        .then(keys => keys.forEach(k => caches.delete(k)))
        .catch(() => {});
    }
  } catch (e) {}
})();


const SUPABASE_URL = "https://bwmkdalsupuzrsxdlrcm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtkYWxzdXB1enJzeGRscmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5ODY2MDYsImV4cCI6MjA5OTU2MjYwNn0.OJuCLFtIr5K9noT-w2jp0mW_SctmIMmv5mtfbSEc6ZE";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const state = {
  loaded: {},
  cervejas: [],
  insumos: [],
  clientes: [],
  producoesFermentando: [],
  fermentosReuso: [],
  debitosPhenomena: [],
  configuracoes: {},
  retornos: [],
  lotes: [],
  filtroLotes: "todos",
  ultimoRelatorioMensal: null
};

document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await sb.auth.getSession();
  if (data.session) iniciarApp();
  else mostrarLogin();
});

function mostrarLogin() {
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("app").style.display = "none";
}

function iniciarApp() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("app").style.display = "block";
  carregarInicio();
}

async function login() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginSenha").value;
  const erro = document.getElementById("loginErro");
  erro.style.display = "none";

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    erro.innerText = error.message;
    erro.style.display = "block";
    return;
  }
  iniciarApp();
}

async function logout() {
  await sb.auth.signOut();
  mostrarLogin();
}

function mostrarTela(nome) {
  document.querySelectorAll(".tela").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".bottomNav button").forEach(b => b.classList.remove("active"));

  const mapa = {
    inicio: "telaInicio",
    producao: "telaProducao",
    estoque: "telaEstoque",
    saidas: "telaSaidas",
    mais: "telaMais",
    fermentos: "telaFermentos",
    phenomena: "telaPhenomena",
    retornos: "telaRetornos",
    painelDia: "telaPainelDia",
    relatorio: "telaRelatorio",
    auditoria: "telaAuditoria",
    configuracoes: "telaConfiguracoes",
    backup: "telaBackup",
    lotes: "telaLotes",
    clientes: "telaClientes",
    cadastros: "telaCadastros"
  };

  document.getElementById(mapa[nome]).classList.add("active");

  const btns = document.querySelectorAll(".bottomNav button");
  if (nome === "inicio") btns[0].classList.add("active");
  if (nome === "producao") btns[1].classList.add("active");
  if (nome === "estoque") btns[2].classList.add("active");
  if (nome === "saidas") btns[3].classList.add("active");
  if (nome === "fermentos") btns[1].classList.add("active");
  if (["mais","clientes","cadastros","lotes","phenomena","retornos","painelDia","relatorio","auditoria","configuracoes","backup"].includes(nome)) btns[4].classList.add("active");

  if (nome === "inicio") carregarInicio();
  if (nome === "producao") carregarProducao();
  if (nome === "estoque") carregarEstoque();
  if (nome === "saidas") carregarSaidas();
  if (nome === "clientes") carregarClientes();
  if (nome === "cadastros") carregarCadastros();
  if (nome === "lotes") carregarLotes();
  if (nome === "fermentos") carregarFermentos();
  if (nome === "phenomena") carregarPhenomena();
  if (nome === "retornos") carregarRetornos();
  if (nome === "painelDia") carregarPainelDia();
  if (nome === "relatorio") prepararRelatorio();
  if (nome === "auditoria") carregarAuditoria();
  if (nome === "configuracoes") carregarConfiguracoes();
}

function toggleForm(id) {
  const el = document.getElementById(id);
  const aberto = el.style.display === "block";
  document.querySelectorAll(".formBox").forEach(f => f.style.display = "none");
  el.style.display = aberto ? "none" : "block";

  if (!aberto) {
    if (id === "formProducao") prepararFormProducao();
    if (id === "formDryHop") prepararFormDryHop();
    if (id === "formEnvase") prepararFormEnvase();
    if (id === "formEntradaCerveja") prepararFormEntradaCerveja();
    if (id === "formEntradaInsumo") prepararFormEntradaInsumo();
    if (id === "formAjusteCerveja") prepararFormAjusteCerveja();
    if (id === "formAjusteInsumo") prepararFormAjusteInsumo();
    if (id === "formSaida") prepararFormSaida();
    if (id === "formColetaFermento") prepararFormColetaFermento();
    if (id === "formDescarteFermento") prepararFormDescarteFermento();
    if (id === "formRetiradaPhenomena") prepararFormRetiradaPhenomena();
    if (id === "formPagamentoPhenomena") prepararFormPagamentoPhenomena();
    if (id === "formRetorno") prepararFormRetorno();
    if (id === "formExtratoCliente") prepararFormExtratoCliente();
  }
}

function mostrarErro(id, msg) {
  const el = document.getElementById(id);
  if (!msg) {
    el.style.display = "none";
    el.innerText = "";
  } else {
    el.innerText = msg;
    el.style.display = "block";
  }
}

function fmt(n, casas=0) {
  return Number(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: casas });
}

function fmtMoeda(n) {
  return Number(n || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}

async function carregarConfiguracoesBase(force=false) {
  if (state.loaded.configuracoesBase && !force) return;

  const { data, error } = await sb.from("configuracoes").select("*");
  state.configuracoes = {};

  if (!error) {
    (data || []).forEach(r => state.configuracoes[r.chave] = r.valor);
  }

  if (!state.configuracoes.responsavel_padrao) state.configuracoes.responsavel_padrao = "";
  if (!state.configuracoes.minimo_cerveja_padrao_litros) state.configuracoes.minimo_cerveja_padrao_litros = "0";
  if (!state.configuracoes.minimo_pilsen_litros) state.configuracoes.minimo_pilsen_litros = "0";
  if (!state.configuracoes.dias_alerta_barril_cliente) state.configuracoes.dias_alerta_barril_cliente = "21";
  if (!state.configuracoes.dias_alerta_lote_fermentando) state.configuracoes.dias_alerta_lote_fermentando = "10";
  if (!state.configuracoes.dias_alerta_validade_insumos) state.configuracoes.dias_alerta_validade_insumos = "30";
  if (!state.configuracoes.minimo_padrao_malte) state.configuracoes.minimo_padrao_malte = "0";
  if (!state.configuracoes.minimo_padrao_lupulo) state.configuracoes.minimo_padrao_lupulo = "0";
  if (!state.configuracoes.minimo_padrao_fermento) state.configuracoes.minimo_padrao_fermento = "0";

  state.loaded.configuracoesBase = true;
}

function getConfigNumero(chave, padrao) {
  const v = Number(state.configuracoes[chave]);
  return Number.isFinite(v) ? v : padrao;
}

function litrosBarris(q10,q20,q30,q50) {
  return (Number(q10)||0)*10 + (Number(q20)||0)*20 + (Number(q30)||0)*30 + (Number(q50)||0)*50;
}

function somaBarris(q10,q20,q30,q50) {
  return (Number(q10)||0) + (Number(q20)||0) + (Number(q30)||0) + (Number(q50)||0);
}


function agruparSoma(rows, keyFn, valueFn) {
  const mapa = new Map();
  (rows || []).forEach(r => {
    const k = keyFn(r) || "-";
    mapa.set(k, (mapa.get(k) || 0) + Number(valueFn(r) || 0));
  });
  return [...mapa.entries()].map(([nome, valor]) => ({ nome, valor }));
}

function renderBarChart(id, dados, opts={}) {
  const box = document.getElementById(id);
  if (!box) return;

  try {
    const suffix = opts.suffix || "";
    const casas = opts.casas === undefined ? 0 : opts.casas;
    const limite = opts.limite || 8;
    const rows = Array.from(dados || [])
      .filter(d => Number(d.valor || 0) > 0)
      .sort((a,b) => Number(b.valor || 0) - Number(a.valor || 0))
      .slice(0, limite);

    if (!rows.length) {
      box.innerHTML = '<div class="emptyChart">Sem dados para exibir.</div>';
      return;
    }

    const max = Math.max.apply(null, rows.map(r => Number(r.valor || 0)).concat([1]));
    box.innerHTML = "";
    rows.forEach(r => {
      const pct = Math.max(2, Math.round((Number(r.valor || 0) / max) * 100));
      box.insertAdjacentHTML("beforeend", `
        <div class="barRow">
          <div class="barLabel" title="${escapeHtml(r.nome)}">${escapeHtml(r.nome)}</div>
          <div class="barTrack"><div class="barFill" style="width:${pct}%"></div></div>
          <div class="barValue">${fmt(r.valor, casas)}${suffix}</div>
        </div>
      `);
    });
  } catch (e) {
    box.innerHTML = '<div class="emptyChart">Erro ao montar gráfico. Atualize a página.</div>';
    console.error("Erro em renderBarChart", id, e);
  }
}

function renderDonutOrigem(id, dados) {
  const box = document.getElementById(id);
  if (!box) return;

  try {
    const cores = ["#0ea5e9","#22c55e","#f59e0b","#8b5cf6","#ef4444"];
    const rows = Array.from(dados || []).filter(d => Number(d.valor || 0) > 0);
    const total = rows.reduce((s,r) => s + Number(r.valor || 0), 0);

    if (!rows.length || total <= 0) {
      box.innerHTML = '<div class="emptyChart">Sem estoque por origem.</div>';
      return;
    }

    let grauAtual = 0;
    const partes = rows.map((r, idx) => {
      const graus = (Number(r.valor || 0) / total) * 360;
      const ini = grauAtual;
      const fim = grauAtual + graus;
      grauAtual = fim;
      return `${cores[idx % cores.length]} ${ini}deg ${fim}deg`;
    }).join(",");

    box.innerHTML = `
      <div class="donut" style="background:conic-gradient(${partes})">
        <div class="donutCenter">${fmt(total)} L</div>
      </div>
      <div class="legendList">
        ${rows.map((r,idx) => `
          <div class="legendItem">
            <span><span class="legendDot" style="background:${cores[idx % cores.length]}"></span>${escapeHtml(r.nome)}</span>
            <strong>${fmt(r.valor)} L</strong>
          </div>
        `).join("")}
      </div>
    `;
  } catch (e) {
    box.innerHTML = '<div class="emptyChart">Erro ao montar gráfico. Atualize a página.</div>';
    console.error("Erro em renderDonutOrigem", id, e);
  }
}

function mesesRecentes(qtd=6) {
  const out = [];
  const hoje = new Date();
  for (let i=qtd-1; i>=0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const chave = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const rotulo = `${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getFullYear()).slice(-2)}`;
    out.push({ chave, rotulo, valor:0 });
  }
  return out;
}

function agruparPorMes(rows, campoData, campoValor, qtd=6) {
  const meses = mesesRecentes(qtd);
  const mapa = new Map(meses.map(m => [m.chave, m]));
  (rows || []).forEach(r => {
    const data = String(r[campoData] || "").slice(0,7);
    if (mapa.has(data)) mapa.get(data).valor += Number(r[campoValor] || 0);
  });
  return meses.map(m => ({ nome:m.rotulo, valor:m.valor }));
}


function novoUUID() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function ordenarComZeradosFinal(arr, getNome, getQtd) {
  return [...arr].sort((a,b) => {
    const za = Number(getQtd(a) || 0) <= 0 ? 1 : 0;
    const zb = Number(getQtd(b) || 0) <= 0 ? 1 : 0;
    if (za !== zb) return za - zb;
    return String(getNome(a)).localeCompare(String(getNome(b)), "pt-BR");
  });
}

function invalidar(...nomes) {
  nomes.forEach(n => state.loaded[n] = false);
}

async function carregarInicio(force=false) {
  if (state.loaded.inicio && !force) return;
  await carregarBaseCadastros(true);
  await carregarProducoesFermentando(true);
  await carregarConfiguracoesBase(true);

  const [estoque, producoes, envases, clientes, insumosEstoque, saidas, retornos, movs, entradasInsumos] = await Promise.all([
    sb.from("estoque_cerveja").select("*"),
    sb.from("producoes").select("*").order("data_producao", { ascending:false }),
    sb.from("envases").select("*").order("data_envase", { ascending:false }),
    sb.from("clientes").select("id", { count:"exact", head:true }),
    sb.from("estoque_insumos").select("*"),
    sb.from("saidas").select("*").order("data_saida", { ascending:false }).limit(250),
    sb.from("retornos").select("*").order("data_retorno", { ascending:false }).limit(250),
    sb.from("movimentacoes").select("*").order("criado_em", { ascending:false }).limit(8),
    sb.from("entradas_insumos").select("*").not("validade","is",null).order("validade", { ascending:true }).limit(100)
  ]);

  const estoqueRows = estoque.data || [];
  const producoesRows = producoes.data || [];
  const envaseRows = envases.data || [];
  const insumosRows = insumosEstoque.data || [];
  const saidaRows = saidas.data || [];
  const retornoRows = retornos.data || [];

  const litrosEstoque = estoqueRows.reduce((s,r) => s + Number(r.litros || 0), 0);
  const barrisDisponiveis = estoqueRows.reduce((s,r) => s + somaBarris(r.q10,r.q20,r.q30,r.q50), 0);
  const barrisSaidas = saidaRows.reduce((s,r) => s + somaBarris(r.q10,r.q20,r.q30,r.q50), 0);
  const barrisRetornos = retornoRows.reduce((s,r) => s + somaBarris(r.q10,r.q20,r.q30,r.q50), 0);
  const barrisEmClientes = Math.max(0, barrisSaidas - barrisRetornos);

  const litrosProduzidos = producoesRows.reduce((s,r) => s + Number(r.litros_produzidos || 0), 0);
  const litrosEnvasados = envaseRows.reduce((s,r) => s + Number(r.litros_total || 0), 0);
  const perdas = envaseRows.reduce((s,r) => s + Number(r.perda || 0), 0);

  const malte = insumosRows.filter(i => i.tipo === "MALTE").reduce((s,r) => s + Number(r.quantidade || 0), 0);
  const lupulo = insumosRows.filter(i => i.tipo === "LUPULO").reduce((s,r) => s + Number(r.quantidade || 0), 0);
  const fermento = insumosRows.filter(i => i.tipo === "FERMENTO").reduce((s,r) => s + Number(r.quantidade || 0), 0);

  document.getElementById("cardEstoqueCerveja").innerText = fmt(litrosEstoque) + " L";
  document.getElementById("cardBarrisDisponiveis").innerText = barrisDisponiveis;
  document.getElementById("cardBarrisClientes").innerText = barrisEmClientes;
  document.getElementById("cardClientes").innerText = clientes.count || 0;
  document.getElementById("cardFermentando").innerText = state.producoesFermentando.length;
  document.getElementById("cardLitrosProduzidos").innerText = fmt(litrosProduzidos) + " L";
  document.getElementById("cardLitrosEnvasados").innerText = fmt(litrosEnvasados) + " L";
  document.getElementById("cardPerdas").innerText = fmt(perdas) + " L";
  document.getElementById("cardMalte").innerText = fmt(malte, 1) + " KG";
  document.getElementById("cardLupulo").innerText = fmt(lupulo, 1) + " G";
  document.getElementById("cardFermento").innerText = fmt(fermento, 1) + " UN";

  const estoquePorCerveja = agruparSoma(estoqueRows, r => r.cerveja_nome, r => r.litros);
  const estoquePorOrigem = agruparSoma(estoqueRows, r => r.origem, r => r.litros);
  const producaoMes = agruparPorMes(producoesRows, "data_producao", "litros_produzidos", 6);
  const envaseMes = agruparPorMes(envaseRows, "data_envase", "litros_total", 6);
  const saidasPorCerveja = agruparSoma(saidaRows, r => r.cerveja_nome, r => r.litros);

  document.getElementById("dashTotalCervejas").innerText = `${estoquePorCerveja.filter(x => x.valor > 0).length} itens`;
  renderBarChart("graficoEstoqueCerveja", estoquePorCerveja, { suffix:" L", limite:10 });
  renderDonutOrigem("graficoEstoqueOrigem", estoquePorOrigem);
  renderBarChart("graficoProducaoMes", producaoMes, { suffix:" L", limite:6 });
  renderBarChart("graficoEnvaseMes", envaseMes, { suffix:" L", limite:6 });
  renderBarChart("graficoSaidasCerveja", saidasPorCerveja, { suffix:" L", limite:8 });

  const insumosGraf = [
    { nome:"Malte KG", valor:malte },
    { nome:"Lúpulo G", valor:lupulo },
    { nome:"Fermento UN", valor:fermento }
  ];
  renderBarChart("graficoInsumos", insumosGraf, { casas:1, limite:3 });

  const alertas = [];
  const minCervejaPadrao = getConfigNumero("minimo_cerveja_padrao_litros", 0);
  const minPilsen = getConfigNumero("minimo_pilsen_litros", 0);

  const estoqueCervejaMap = new Map();
  state.cervejas.forEach(c => estoqueCervejaMap.set(c.nome, 0));
  estoqueRows.forEach(r => estoqueCervejaMap.set(r.cerveja_nome, (estoqueCervejaMap.get(r.cerveja_nome) || 0) + Number(r.litros || 0)));

  [...estoqueCervejaMap.entries()].forEach(([nome,qtd]) => {
    if (qtd <= 0) alertas.push(`Cerveja zerada: ${nome}`);
    const min = String(nome).toUpperCase().includes("PILSEN") && minPilsen > 0 ? minPilsen : minCervejaPadrao;
    if (min > 0 && qtd > 0 && qtd <= min) alertas.push(`Cerveja abaixo do mínimo: ${nome} (${fmt(qtd)} L)`);
  });

  const estoqueInsumoMap = new Map();
  state.insumos.forEach(i => estoqueInsumoMap.set(i.tipo+"|"+i.nome, { ...i, quantidade:0 }));
  insumosRows.forEach(r => {
    const base = estoqueInsumoMap.get(r.tipo+"|"+r.nome) || r;
    estoqueInsumoMap.set(r.tipo+"|"+r.nome, { ...base, quantidade:Number(r.quantidade || 0), unidade:r.unidade });
  });

  [...estoqueInsumoMap.values()].forEach(i => {
    const min = Number(i.estoque_minimo || 0);
    if (Number(i.quantidade || 0) <= 0) alertas.push(`Insumo zerado: ${i.tipo} — ${i.nome}`);
    if (min > 0 && Number(i.quantidade || 0) > 0 && Number(i.quantidade || 0) <= min) {
      alertas.push(`Insumo baixo: ${i.tipo} — ${i.nome} (${fmt(i.quantidade,2)} ${i.unidade})`);
    }
  });

  const diasLote = getConfigNumero("dias_alerta_lote_fermentando", 10);
  state.producoesFermentando.forEach(p => {
    const dias = Math.max(0, Math.floor((new Date() - new Date(p.data_producao + "T00:00:00")) / 86400000));
    if (dias >= diasLote) alertas.push(`Lote há ${dias}+ dias: ${p.lote} — ${p.cerveja_nome}`);
  });

  document.getElementById("cardAlertas").innerText = alertas.length;
  document.getElementById("dashQtdAlertas").innerText = alertas.length;
  document.getElementById("dashInsumosBaixos").innerText = `${[...estoqueInsumoMap.values()].filter(i => Number(i.estoque_minimo || 0) > 0 && Number(i.quantidade || 0) <= Number(i.estoque_minimo || 0)).length} baixo(s)`;

  const alertBox = document.getElementById("dashboardAlertas");
  alertBox.innerHTML = alertas.length ? "" : '<div class="item"><div class="alertLine"><span class="alertIcon ok">✓</span><span class="sub">Nenhum alerta crítico agora.</span></div></div>';
  alertas.slice(0,12).forEach(a => {
    alertBox.insertAdjacentHTML("beforeend", `<div class="item"><div class="alertLine"><span class="alertIcon">!</span><span>${escapeHtml(a)}</span></div></div>`);
  });

  const barrisPorCliente = new Map();
  saidaRows.forEach(s => {
    const atual = barrisPorCliente.get(s.cliente_nome) || { cliente:s.cliente_nome, saidas:0, retornos:0 };
    atual.saidas += somaBarris(s.q10,s.q20,s.q30,s.q50);
    barrisPorCliente.set(s.cliente_nome, atual);
  });
  retornoRows.forEach(r => {
    const atual = barrisPorCliente.get(r.cliente_nome) || { cliente:r.cliente_nome, saidas:0, retornos:0 };
    atual.retornos += somaBarris(r.q10,r.q20,r.q30,r.q50);
    barrisPorCliente.set(r.cliente_nome, atual);
  });

  const barrisClientes = [...barrisPorCliente.values()]
    .map(c => ({...c, aberto: Math.max(0, c.saidas - c.retornos)}))
    .filter(c => c.aberto > 0)
    .sort((a,b) => b.aberto - a.aberto)
    .slice(0,8);

  const barrisBox = document.getElementById("dashboardBarrisClientes");
  barrisBox.innerHTML = barrisClientes.length ? "" : '<div class="item"><span class="sub">Nenhum barril em cliente.</span></div>';
  barrisClientes.forEach(c => {
    barrisBox.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div><strong>${escapeHtml(c.cliente)}</strong><div class="sub">Saíram ${c.saidas} • retornaram ${c.retornos}</div></div>
        <span class="badge">${c.aberto}</span>
      </div>
    `);
  });

  const lotesBox = document.getElementById("dashboardLotesFermentando");
  lotesBox.innerHTML = state.producoesFermentando.length ? "" : '<div class="item"><span class="sub">Nenhum lote fermentando.</span></div>';
  state.producoesFermentando.slice(0,8).forEach(p => {
    const dias = Math.max(0, Math.floor((new Date() - new Date(p.data_producao + "T00:00:00")) / 86400000));
    lotesBox.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div><strong>${escapeHtml(p.lote)} — ${escapeHtml(p.cerveja_nome)}</strong><div class="sub">${fmt(p.litros_produzidos)} L • ${dias} dia(s)</div></div>
        <span class="badge">${escapeHtml(p.status)}</span>
      </div>
    `);
  });

  const movBox = document.getElementById("inicioMovimentacoes");
  movBox.innerHTML = (movs.data || []).length ? "" : '<div class="item"><span class="sub">Nenhuma movimentação ainda.</span></div>';
  (movs.data || []).forEach(m => {
    movBox.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div>
          <strong>${escapeHtml(m.tipo)} — ${escapeHtml(m.item_nome || "")}</strong>
          <div class="sub">${dataHoraBR(m.criado_em)} • ${escapeHtml(m.categoria || "")}</div>
        </div>
        <span class="badge">${fmt(m.quantidade,2)} ${escapeHtml(m.unidade || "")}</span>
      </div>
    `);
  });

  state.loaded.inicio = true;
}


async function carregarBaseCadastros(force=false) {
  if (state.loaded.baseCadastros && !force) return;

  const [cervejas, insumos, clientes] = await Promise.all([
    sb.from("cervejas").select("*").eq("ativo", true).order("nome"),
    sb.from("insumos").select("*").eq("ativo", true).order("tipo").order("nome"),
    sb.from("clientes").select("*").eq("ativo", true).order("nome")
  ]);

  state.cervejas = cervejas.data || [];
  state.insumos = insumos.data || [];
  state.clientes = clientes.data || [];
  state.loaded.baseCadastros = true;
}

async function carregarProducoesFermentando(force=false) {
  if (state.loaded.producoesFermentando && !force) return;
  const { data } = await sb.from("producoes")
    .select("*")
    .eq("status","FERMENTANDO")
    .order("data_producao", { ascending:false });
  state.producoesFermentando = data || [];
  state.loaded.producoesFermentando = true;
}

async function carregarProducao(force=false) {
  if (state.loaded.producao && !force) return;
  await carregarBaseCadastros(force);
  await carregarProducoesFermentando(force);
  renderProducoes();
  state.loaded.producao = true;
}

function renderProducoes() {
  const box = document.getElementById("listaProducoes");
  box.innerHTML = state.producoesFermentando.length ? "" : '<div class="item"><span class="sub">Nenhuma cerveja em produção.</span></div>';

  state.producoesFermentando.forEach(p => {
    const dias = Math.max(0, Math.floor((new Date() - new Date(p.data_producao + "T00:00:00")) / 86400000));
    box.insertAdjacentHTML("beforeend", `
      <div class="item searchable">
        <div>
          <strong>${escapeHtml(p.cerveja_nome)}</strong>
          <div class="sub">Lote ${escapeHtml(p.lote)} • ${fmt(p.litros_produzidos)} L</div>
          <div class="sub">Produzida em ${dataBR(p.data_producao)} • ${dias} dia(s) em produção</div>
        </div>
        <span class="badge">${escapeHtml(p.status)}</span>
      </div>
    `);
  });
}

function prepararSelectCervejas(id) {
  const sel = document.getElementById(id);
  sel.innerHTML = '<option value="">Selecionar cerveja...</option>';
  state.cervejas.forEach(c => {
    const op = document.createElement("option");
    op.value = c.nome;
    op.textContent = c.nome;
    sel.appendChild(op);
  });
}

function prepararSelectLotes(id) {
  const sel = document.getElementById(id);
  sel.innerHTML = '<option value="">Selecionar lote...</option>';
  state.producoesFermentando.forEach(p => {
    const op = document.createElement("option");
    op.value = p.id;
    op.dataset.lote = p.lote;
    op.dataset.cerveja = p.cerveja_nome;
    op.textContent = `${p.cerveja_nome} — lote ${p.lote} (${fmt(p.litros_produzidos)}L)`;
    sel.appendChild(op);
  });
}

function getProducaoSelecionada(selectId) {
  const id = document.getElementById(selectId)?.value;
  if (!id) return null;
  return state.producoesFermentando.find(p => p.id === id) || null;
}

async function prepararFormProducao() {
  prepararSelectCervejas("prodCerveja");
  prepararSelectInsumos("prodFermento","FERMENTO","Sem fermento");
  await carregarFermentosReusoBase(true);
  prepararSelectFermentosReuso("prodFermentoReuso", "Selecionar fermento reutilizável...");
  alternarTipoFermentoProducao();
  document.getElementById("prodMaltes").innerHTML = "";
  document.getElementById("prodLupulos").innerHTML = "";
  adicionarLinhaInsumo("prodMaltes","MALTE");
  adicionarLinhaInsumo("prodLupulos","LUPULO");
}

function prepararFormDryHop() {
  prepararSelectLotes("dryLote");
  document.getElementById("dryLupulos").innerHTML = "";
  adicionarLinhaInsumo("dryLupulos","LUPULO");
}

function prepararFormEnvase() {
  prepararSelectLotes("envaseLote");
  atualizarResumoEnvase();
}

function prepararFormEntradaCerveja() {
  prepararSelectCervejas("entradaCerveja");
}

function prepararFormEntradaInsumo() {
  popularEntradaInsumos();
}

function prepararSelectInsumos(id, tipo, placeholder) {
  const sel = document.getElementById(id);
  sel.innerHTML = `<option value="">${placeholder}</option>`;
  state.insumos.filter(i => i.tipo === tipo).forEach(i => {
    const op = document.createElement("option");
    op.value = i.nome;
    op.textContent = `${i.nome} (${i.unidade})`;
    op.dataset.unidade = i.unidade;
    sel.appendChild(op);
  });
}

function adicionarLinhaInsumo(containerId, tipo) {
  const container = document.getElementById(containerId);
  const linha = document.createElement("div");
  linha.className = "linhaInsumo";
  linha.dataset.tipo = tipo;

  const sel = document.createElement("select");
  sel.className = "insumoNome";
  sel.innerHTML = '<option value="">Selecionar...</option>';
  state.insumos.filter(i => i.tipo === tipo).forEach(i => {
    const op = document.createElement("option");
    op.value = i.nome;
    op.textContent = `${i.nome} (${i.unidade})`;
    op.dataset.unidade = i.unidade;
    sel.appendChild(op);
  });

  const qtd = document.createElement("input");
  qtd.className = "insumoQtd";
  qtd.type = "number";
  qtd.min = "0";
  qtd.step = "0.001";
  qtd.placeholder = tipo === "MALTE" ? "KG" : tipo === "LUPULO" ? "G" : "UN";

  const btn = document.createElement("button");
  btn.className = "btnRemove";
  btn.type = "button";
  btn.innerText = "×";
  btn.onclick = () => linha.remove();

  linha.appendChild(sel);
  linha.appendChild(qtd);
  linha.appendChild(btn);
  container.appendChild(linha);
}

function coletarLinhasInsumos(containerId, tipo) {
  const itens = [];
  document.querySelectorAll(`#${containerId} .linhaInsumo`).forEach(linha => {
    const nome = linha.querySelector(".insumoNome").value;
    const quantidade = Number(linha.querySelector(".insumoQtd").value || 0);
    if (nome && quantidade > 0) {
      const insumo = state.insumos.find(i => i.tipo === tipo && i.nome === nome);
      itens.push({ tipo, nome, quantidade, unidade: insumo ? insumo.unidade : unidadePadrao(tipo), insumo_id: insumo ? insumo.id : null });
    }
  });
  return itens;
}

function unidadePadrao(tipo) {
  if (tipo === "MALTE") return "KG";
  if (tipo === "LUPULO") return "G";
  return "UN";
}


async function validarEstoqueInsumosSuficiente(itens) {
  const agregados = new Map();

  itens.forEach(item => {
    if (!item.nome || Number(item.quantidade || 0) <= 0) return;
    const chave = item.tipo + "|" + item.nome;
    const atual = agregados.get(chave) || {
      tipo: item.tipo,
      nome: item.nome,
      unidade: item.unidade,
      quantidade: 0
    };
    atual.quantidade += Number(item.quantidade || 0);
    agregados.set(chave, atual);
  });

  const faltas = [];

  for (const item of agregados.values()) {
    const { data, error } = await sb.from("estoque_insumos")
      .select("quantidade,unidade")
      .eq("tipo", item.tipo)
      .eq("nome", item.nome)
      .limit(1);

    if (error) throw error;

    const disponivel = data && data[0] ? Number(data[0].quantidade || 0) : 0;
    const unidade = data && data[0] ? data[0].unidade : item.unidade;

    if (disponivel < item.quantidade) {
      faltas.push({
        nome: item.nome,
        tipo: item.tipo,
        unidade: unidade,
        disponivel: disponivel,
        necessario: item.quantidade,
        falta: item.quantidade - disponivel
      });
    }
  }

  if (faltas.length) {
    const detalhes = faltas.map(f =>
      `${f.nome}: necessário ${fmt(f.necessario, 3)} ${f.unidade}, disponível ${fmt(f.disponivel, 3)} ${f.unidade}, falta ${fmt(f.falta, 3)} ${f.unidade}`
    ).join("\n");

    throw new Error("Estoque insuficiente de insumos:\n" + detalhes);
  }

  return true;
}


async function baixarInsumo(tipo, nome, quantidade, unidade, observacao, lote="", etapa="PRODUCAO") {
  if (!nome || quantidade <= 0) return;

  const { data: atualRows, error: erroBusca } = await sb.from("estoque_insumos")
    .select("*")
    .eq("tipo", tipo)
    .eq("nome", nome)
    .limit(1);

  if (erroBusca) throw erroBusca;

  const atual = atualRows && atualRows[0] ? atualRows[0] : null;
  const qtdAtual = Number(atual ? atual.quantidade : 0);

  if (qtdAtual < Number(quantidade)) {
    throw new Error(`${nome}: estoque insuficiente. Disponível ${fmt(qtdAtual, 3)} ${unidade}, necessário ${fmt(Number(quantidade), 3)} ${unidade}.`);
  }

  const novaQtd = qtdAtual - Number(quantidade);

  const insumo = state.insumos.find(i => i.tipo === tipo && i.nome === nome);
  const payload = {
    insumo_id: insumo ? insumo.id : null,
    tipo,
    nome,
    unidade,
    quantidade: novaQtd,
    atualizado_em: new Date().toISOString()
  };

  const { error } = await sb.from("estoque_insumos").upsert(payload, { onConflict:"tipo,nome" });
  if (error) throw error;

  await sb.from("movimentacoes").insert({
    tipo: etapa === "DRY_HOPPING" ? "BAIXA DRY HOPPING" : "BAIXA PRODUCAO",
    categoria: "INSUMO",
    item_nome: nome,
    quantidade: -Math.abs(Number(quantidade)),
    unidade,
    lote,
    observacao
  });
}

async function salvarProducao() {
  mostrarErro("prodErro", "");
  const lote = document.getElementById("prodLote").value.trim();
  const cerveja_nome = document.getElementById("prodCerveja").value;
  const litros_produzidos = Number(document.getElementById("prodLitros").value || 0);
  const observacao = document.getElementById("prodObs").value.trim();

  if (!lote || !cerveja_nome || litros_produzidos <= 0) {
    mostrarErro("prodErro", "Informe lote, cerveja e litros produzidos.");
    return;
  }

  const maltes = coletarLinhasInsumos("prodMaltes","MALTE");
  const lupulos = coletarLinhasInsumos("prodLupulos","LUPULO");
  const tipoFermentoProducao = document.getElementById("prodFermentoTipo").value;
  const fermentoNome = document.getElementById("prodFermento").value;
  const fermentoQtd = Number(document.getElementById("prodFermentoQtd").value || 0);
  const fermento = fermentoNome && fermentoQtd > 0 ? state.insumos.find(i => i.tipo === "FERMENTO" && i.nome === fermentoNome) : null;

  const fermentoReusoId = document.getElementById("prodFermentoReuso").value;
  const fermentoReusoQtd = Number(document.getElementById("prodFermentoReusoQtd").value || 0);
  const fermentoReuso = state.fermentosReuso.find(f => f.id === fermentoReusoId);

  const cerveja = state.cervejas.find(c => c.nome === cerveja_nome);

  const insumosParaValidar = [...maltes, ...lupulos];

  if (tipoFermentoProducao === "ESTOQUE" && fermentoNome && fermentoQtd > 0) {
    insumosParaValidar.push({
      tipo:"FERMENTO",
      nome:fermentoNome,
      quantidade:fermentoQtd,
      unidade:fermento ? fermento.unidade : "UN",
      insumo_id: fermento ? fermento.id : null
    });
  }

  try {
    await validarEstoqueInsumosSuficiente(insumosParaValidar);

    if (tipoFermentoProducao === "REUSO") {
      if (!fermentoReusoId || fermentoReusoQtd <= 0) {
        throw new Error("Selecione o fermento reutilizável e informe a quantidade usada.");
      }
      await validarFermentoReusoSuficiente(fermentoReusoId, fermentoReusoQtd);
    }
  } catch(e) {
    mostrarErro("prodErro", e.message);
    return;
  }

  const fermentoTipoSalvar = tipoFermentoProducao === "REUSO" ? "REUSO" : (fermentoNome ? "ESTOQUE" : null);
  const fermentoNomeSalvar = tipoFermentoProducao === "REUSO" ? (fermentoReuso ? fermentoReuso.codigo : "FERMENTO REUSO") : (fermentoNome || null);

  const { data: loteExistente, error: loteExistenteErro } = await sb.from("producoes")
    .select("id,lote,cerveja_nome")
    .eq("cerveja_nome", cerveja_nome)
    .eq("lote", lote)
    .limit(1);

  if (loteExistenteErro) {
    mostrarErro("prodErro", loteExistenteErro.message);
    return;
  }

  if (loteExistente && loteExistente.length) {
    mostrarErro("prodErro", `A cerveja ${cerveja_nome} já possui o lote ${lote}. Use outro número/nome de lote para essa mesma cerveja.`);
    return;
  }

  const { data: prod, error } = await sb.from("producoes").insert({
    lote,
    cerveja_nome,
    cerveja_id: cerveja ? cerveja.id : null,
    litros_produzidos,
    observacao,
    status: "FERMENTANDO",
    fermento_tipo: fermentoTipoSalvar,
    fermento_nome: fermentoNomeSalvar,
    fermento_reuso_id: tipoFermentoProducao === "REUSO" ? fermentoReusoId : null
  }).select().single();

  if (error) {
    mostrarErro("prodErro", error.message);
    return;
  }

  try {
    const insumos = insumosParaValidar;

    for (const item of insumos) {
      await sb.from("producao_insumos").insert({
        producao_id: prod.id,
        lote,
        tipo: item.tipo,
        insumo_nome: item.nome,
        quantidade: item.quantidade,
        unidade: item.unidade,
        etapa: "PRODUCAO"
      });
      await baixarInsumo(item.tipo, item.nome, item.quantidade, item.unidade, `Produção ${cerveja_nome}`, lote, "PRODUCAO");
    }

    if (tipoFermentoProducao === "REUSO") {
      await usarFermentoReusoNaProducao(fermentoReusoId, fermentoReusoQtd, lote, cerveja_nome, prod.id);
    }

    await sb.from("movimentacoes").insert({
      tipo:"PRODUCAO",
      categoria:"CERVEJA",
      item_nome: cerveja_nome,
      quantidade: litros_produzidos,
      unidade:"L",
      lote,
      observacao
    });

  } catch(e) {
    mostrarErro("prodErro", "Produção criada, mas houve erro ao baixar insumos: " + e.message);
    return;
  }

  ["prodLote","prodLitros","prodObs","prodFermentoQtd","prodFermentoReusoQtd"].forEach(id => document.getElementById(id).value = "");
  invalidar("producao","producoesFermentando","estoque","inicio");
  alert("Produção salva e insumos baixados.");
  carregarProducao(true);
  carregarInicio(true);
}

async function salvarDryHop() {
  mostrarErro("dryErro", "");
  const prod = getProducaoSelecionada("dryLote");
  const lote = prod ? prod.lote : "";
  const obs = document.getElementById("dryObs").value.trim();
  const itens = coletarLinhasInsumos("dryLupulos","LUPULO");

  if (!prod || !itens.length) {
    mostrarErro("dryErro", "Selecione o lote e pelo menos um lúpulo.");
    return;
  }

  try {
    await validarEstoqueInsumosSuficiente(itens);
  } catch(e) {
    mostrarErro("dryErro", e.message);
    return;
  }

  try {
    for (const item of itens) {
      await sb.from("dry_hopping").insert({
        producao_id: prod.id,
        lote,
        lupulo_nome: item.nome,
        quantidade: item.quantidade,
        unidade: item.unidade,
        observacao: obs
      });

      await sb.from("producao_insumos").insert({
        producao_id: prod.id,
        lote,
        tipo: "LUPULO",
        insumo_nome: item.nome,
        quantidade: item.quantidade,
        unidade: item.unidade,
        etapa: "DRY_HOPPING"
      });

      await baixarInsumo("LUPULO", item.nome, item.quantidade, item.unidade, obs || "Dry hopping", lote, "DRY_HOPPING");
    }
  } catch(e) {
    mostrarErro("dryErro", e.message);
    return;
  }

  document.getElementById("dryObs").value = "";
  invalidar("estoque","inicio");
  alert("Dry hopping registrado.");
  carregarEstoque(true);
}

function atualizarResumoEnvase() {
  const prod = getProducaoSelecionada("envaseLote");
  const lote = prod ? prod.lote : "";
  const litrosFull = litrosBarris(
    document.getElementById("envaseQ10")?.value,
    document.getElementById("envaseQ20")?.value,
    document.getElementById("envaseQ30")?.value,
    document.getElementById("envaseQ50")?.value
  );
  const incompleto = Number(document.getElementById("envaseIncompleto")?.value || 0);
  const total = litrosFull + incompleto;
  const produzido = prod ? Number(prod.litros_produzidos || 0) : 0;
  const perda = produzido ? Math.max(0, produzido - total) : 0;
  const excesso = produzido ? Math.max(0, total - produzido) : 0;
  const el = document.getElementById("envaseResumo");

  if (el) {
    if (excesso > 0) {
      el.classList.add("alertaErro");
      el.innerText = `ATENÇÃO: envase maior que a produção. Produzido: ${fmt(produzido,2)} L | Tentando envasar: ${fmt(total,2)} L | Excesso: ${fmt(excesso,2)} L`;
    } else {
      el.classList.remove("alertaErro");
      el.innerText = `Total envasado: ${fmt(total,2)} L | Barris completos: ${fmt(litrosFull,2)} L | Perda estimada: ${fmt(perda,2)} L`;
    }
  }
}

async function salvarEnvase() {
  mostrarErro("envaseErro", "");
  const prod = getProducaoSelecionada("envaseLote");
  const lote = prod ? prod.lote : "";
  const origem = document.getElementById("envaseOrigem").value;
  const q10 = Number(document.getElementById("envaseQ10").value || 0);
  const q20 = Number(document.getElementById("envaseQ20").value || 0);
  const q30 = Number(document.getElementById("envaseQ30").value || 0);
  const q50 = Number(document.getElementById("envaseQ50").value || 0);
  const incompleto = Number(document.getElementById("envaseIncompleto").value || 0);
  const obs = document.getElementById("envaseObs").value.trim();

  if (!prod || (somaBarris(q10,q20,q30,q50) <= 0 && incompleto <= 0)) {
    mostrarErro("envaseErro", "Selecione o lote e informe o envase.");
    return;
  }

  const litrosFull = litrosBarris(q10,q20,q30,q50);
  const total = litrosFull + incompleto;
  const produzido = Number(prod.litros_produzidos || 0);

  const { data: envasesAnteriores, error: envasesAnterioresErro } = await sb.from("envases")
    .select("litros_total")
    .eq("producao_id", prod.id);

  if (envasesAnterioresErro) {
    mostrarErro("envaseErro", envasesAnterioresErro.message);
    return;
  }

  const jaEnvasado = (envasesAnteriores || []).reduce((s,e) => s + Number(e.litros_total || 0), 0);
  const disponivelParaEnvase = Math.max(0, produzido - jaEnvasado);

  if (total > disponivelParaEnvase) {
    const excesso = total - disponivelParaEnvase;
    mostrarErro(
      "envaseErro",
      `Envase bloqueado: o lote tem ${fmt(produzido,2)} L produzidos, ${fmt(jaEnvasado,2)} L já envasados e só restam ${fmt(disponivelParaEnvase,2)} L disponíveis. Você tentou envasar ${fmt(total,2)} L. Excesso: ${fmt(excesso,2)} L.`
    );
    atualizarResumoEnvase();
    return;
  }

  const perda = Math.max(0, disponivelParaEnvase - total);

  const { error: envErr } = await sb.from("envases").insert({
    producao_id: prod.id,
    lote,
    cerveja_nome: prod.cerveja_nome,
    origem,
    q10, q20, q30, q50,
    litros_barris: litrosFull,
    litros_incompleto_bar: incompleto,
    litros_total: total,
    perda,
    observacao: obs
  });

  if (envErr) {
    mostrarErro("envaseErro", envErr.message);
    return;
  }

  if (litrosFull > 0) {
    const erroEstoque = await somarEstoqueCerveja(prod.cerveja_nome, origem, q10,q20,q30,q50, obs || "Envase");
    if (erroEstoque) {
      mostrarErro("envaseErro", erroEstoque.message);
      return;
    }

    if (origem === "PHENOMENA") {
      await sb.from("phenomena_entradas").insert({
        cerveja_nome: prod.cerveja_nome,
        q10,q20,q30,q50,
        litros: litrosFull,
        observacao: "Envase Phenomena: " + obs
      });
    }
  }

  await sb.from("producoes").update({ status:"ENVASADO" }).eq("id", prod.id);

  await sb.from("movimentacoes").insert({
    tipo:"ENVASE",
    categoria:"CERVEJA",
    item_nome: prod.cerveja_nome,
    quantidade: total,
    unidade:"L",
    origem,
    lote,
    observacao: obs
  });

  ["envaseQ10","envaseQ20","envaseQ30","envaseQ50","envaseIncompleto","envaseObs"].forEach(id => document.getElementById(id).value = id === "envaseIncompleto" ? "0" : "0");
  invalidar("producao","producoesFermentando","estoque","inicio");
  alert("Envase registrado.");
  carregarProducao(true);
  carregarInicio(true);
}

async function carregarEstoque(force=false) {
  if (state.loaded.estoque && !force) return;
  await carregarBaseCadastros(force);

  const [ec, ei] = await Promise.all([
    sb.from("estoque_cerveja").select("*").order("cerveja_nome"),
    sb.from("estoque_insumos").select("*").order("tipo").order("nome")
  ]);

  renderResumoEstoqueOrigem(ec.data || []);
  renderEstoqueCervejas(ec.data || []);
  renderEstoqueInsumos(ei.data || []);
  state.loaded.estoque = true;
}


function renderResumoEstoqueOrigem(rows) {
  const box = document.getElementById("resumoEstoqueOrigem");
  if (!box) return;

  const origens = ["PRODUCAO","ITAPEMA","PHENOMENA"];
  const dados = origens.map(origem => {
    const itens = rows.filter(r => r.origem === origem);
    return {
      origem,
      litros: itens.reduce((s,r) => s + Number(r.litros || 0), 0),
      barris: itens.reduce((s,r) => s + somaBarris(r.q10,r.q20,r.q30,r.q50), 0)
    };
  });

  box.innerHTML = "";
  dados.forEach(d => {
    box.insertAdjacentHTML("beforeend", `
      <div class="card">
        <span>${escapeHtml(d.origem)}</span>
        <strong>${fmt(d.litros)} L</strong>
        <div class="sub">${d.barris} barril(is)</div>
      </div>
    `);
  });
}

function renderEstoqueCervejas(rows) {
  const map = new Map();

  state.cervejas.forEach(c => map.set(c.nome, { cerveja_nome:c.nome, litros:0, origens:[] }));
  rows.forEach(r => {
    const atual = map.get(r.cerveja_nome) || { cerveja_nome:r.cerveja_nome, litros:0, origens:[] };
    atual.litros += Number(r.litros || 0);
    atual.origens.push(`${r.origem}: ${fmt(r.litros)}L`);
    map.set(r.cerveja_nome, atual);
  });

  const lista = ordenarComZeradosFinal([...map.values()], r => r.cerveja_nome, r => r.litros);
  const box = document.getElementById("estoqueCervejas");
  box.innerHTML = lista.length ? "" : '<div class="item"><span class="sub">Nenhuma cerveja cadastrada.</span></div>';

  lista.forEach(r => {
    box.insertAdjacentHTML("beforeend", `
      <div class="item searchable">
        <div>
          <strong>${escapeHtml(r.cerveja_nome)}</strong>
          <div class="sub">${r.origens.length ? escapeHtml(r.origens.join(" • ")) : "Sem estoque"}</div>
        </div>
        <span class="badge ${r.litros <= 0 ? "zero" : ""}">${fmt(r.litros)} L</span>
      </div>
    `);
  });
}

function renderEstoqueInsumos(rows) {
  const byKey = new Map();
  state.insumos.forEach(i => byKey.set(i.tipo + "|" + i.nome, { tipo:i.tipo, nome:i.nome, unidade:i.unidade, quantidade:0 }));
  rows.forEach(r => byKey.set(r.tipo + "|" + r.nome, r));

  const grupos = [
    ["MALTE", "🌾 Maltes"],
    ["LUPULO", "🌿 Lúpulos"],
    ["FERMENTO", "🧫 Fermentos"]
  ];

  const box = document.getElementById("estoqueInsumos");
  box.innerHTML = "";

  grupos.forEach(([tipo, titulo]) => {
    const lista = ordenarComZeradosFinal([...byKey.values()].filter(r => r.tipo === tipo), r => r.nome, r => r.quantidade);
    box.insertAdjacentHTML("beforeend", `<h3>${titulo}</h3>`);
    if (!lista.length) {
      box.insertAdjacentHTML("beforeend", '<div class="item"><span class="sub">Nenhum item cadastrado.</span></div>');
    }
    lista.forEach(r => {
      box.insertAdjacentHTML("beforeend", `
        <div class="item searchable">
          <div>
            <strong>${escapeHtml(r.nome)}</strong>
            <div class="sub">${escapeHtml(r.tipo)} • ${escapeHtml(r.unidade)}</div>
          </div>
          <span class="badge ${Number(r.quantidade || 0) <= 0 ? "zero" : ""}">${fmt(r.quantidade, 2)} ${escapeHtml(r.unidade)}</span>
        </div>
      `);
    });
  });
}

async function somarEstoqueCerveja(cerveja_nome, origem, q10,q20,q30,q50, observacao="") {
  const { data: rows, error } = await sb.from("estoque_cerveja")
    .select("*")
    .eq("cerveja_nome", cerveja_nome)
    .eq("origem", origem)
    .limit(1);

  if (error) return error;

  const atual = rows && rows[0] ? rows[0] : null;
  const nq10 = Number(atual?.q10 || 0) + Number(q10 || 0);
  const nq20 = Number(atual?.q20 || 0) + Number(q20 || 0);
  const nq30 = Number(atual?.q30 || 0) + Number(q30 || 0);
  const nq50 = Number(atual?.q50 || 0) + Number(q50 || 0);
  const litros = litrosBarris(nq10,nq20,nq30,nq50);
  const cerveja = state.cervejas.find(c => c.nome === cerveja_nome);

  const payload = {
    cerveja_id: cerveja ? cerveja.id : null,
    cerveja_nome,
    origem,
    q10:nq10,
    q20:nq20,
    q30:nq30,
    q50:nq50,
    litros,
    atualizado_em: new Date().toISOString()
  };

  const up = await sb.from("estoque_cerveja").upsert(payload, { onConflict:"cerveja_nome,origem" });
  if (up.error) return up.error;

  await sb.from("movimentacoes").insert({
    tipo:"ENTRADA ESTOQUE",
    categoria:"CERVEJA",
    item_nome: cerveja_nome,
    quantidade: litrosBarris(q10,q20,q30,q50),
    unidade:"L",
    origem,
    observacao
  });

  return null;
}

async function salvarEntradaCerveja() {
  mostrarErro("entradaCervejaErro", "");
  const cerveja = document.getElementById("entradaCerveja").value;
  const origem = document.getElementById("entradaOrigem").value;
  const q10 = Number(document.getElementById("entradaQ10").value || 0);
  const q20 = Number(document.getElementById("entradaQ20").value || 0);
  const q30 = Number(document.getElementById("entradaQ30").value || 0);
  const q50 = Number(document.getElementById("entradaQ50").value || 0);
  const obs = document.getElementById("entradaObs").value.trim();

  if (!cerveja || somaBarris(q10,q20,q30,q50) <= 0) {
    mostrarErro("entradaCervejaErro", "Selecione a cerveja e informe os barris.");
    return;
  }

  const erro = await somarEstoqueCerveja(cerveja, origem, q10,q20,q30,q50, obs);
  if (erro) {
    mostrarErro("entradaCervejaErro", erro.message);
    return;
  }

  if (origem === "PHENOMENA") {
    await sb.from("phenomena_entradas").insert({
      cerveja_nome: cerveja,
      q10,q20,q30,q50,
      litros: litrosBarris(q10,q20,q30,q50),
      observacao: obs
    });
  }

  ["entradaQ10","entradaQ20","entradaQ30","entradaQ50","entradaObs"].forEach(id => document.getElementById(id).value = id === "entradaObs" ? "" : "0");
  invalidar("estoque","inicio");
  alert("Entrada de cerveja registrada.");
  carregarEstoque(true);
  carregarInicio(true);
}

function popularEntradaInsumos() {
  const tipo = document.getElementById("entradaInsumoTipo").value;
  const sel = document.getElementById("entradaInsumoNome");
  sel.innerHTML = '<option value="">Selecionar insumo...</option>';
  state.insumos.filter(i => i.tipo === tipo).forEach(i => {
    const op = document.createElement("option");
    op.value = i.nome;
    op.textContent = `${i.nome} (${i.unidade})`;
    op.dataset.unidade = i.unidade;
    op.dataset.fornecedor = i.fornecedor_padrao || "";
    sel.appendChild(op);
  });
  sel.onchange = () => {
    const op = sel.options[sel.selectedIndex];
    if (op) document.getElementById("entradaInsumoFornecedor").value = op.dataset.fornecedor || "";
  };
}

async function salvarEntradaInsumo() {
  mostrarErro("entradaInsumoErro", "");
  const tipo = document.getElementById("entradaInsumoTipo").value;
  const nome = document.getElementById("entradaInsumoNome").value;
  const quantidade = Number(document.getElementById("entradaInsumoQtd").value || 0);
  const fornecedor = document.getElementById("entradaInsumoFornecedor").value.trim();
  const valor_total = Number(document.getElementById("entradaInsumoValor").value || 0);
  const validade = document.getElementById("entradaInsumoValidade").value || null;
  const lote_fornecedor = document.getElementById("entradaInsumoLote").value.trim();
  const observacao = document.getElementById("entradaInsumoObs").value.trim();

  if (!nome || quantidade <= 0) {
    mostrarErro("entradaInsumoErro", "Selecione o insumo e informe a quantidade.");
    return;
  }

  const insumo = state.insumos.find(i => i.tipo === tipo && i.nome === nome);
  const unidade = insumo ? insumo.unidade : unidadePadrao(tipo);

  const { data: rows } = await sb.from("estoque_insumos")
    .select("*")
    .eq("tipo", tipo)
    .eq("nome", nome)
    .limit(1);

  const atual = rows && rows[0] ? rows[0] : null;
  const novaQtd = Number(atual?.quantidade || 0) + quantidade;

  const up = await sb.from("estoque_insumos").upsert({
    insumo_id: insumo ? insumo.id : null,
    tipo,
    nome,
    unidade,
    quantidade: novaQtd,
    atualizado_em: new Date().toISOString()
  }, { onConflict:"tipo,nome" });

  if (up.error) {
    mostrarErro("entradaInsumoErro", up.error.message);
    return;
  }

  await sb.from("entradas_insumos").insert({
    insumo_id: insumo ? insumo.id : null,
    tipo,
    nome,
    unidade,
    quantidade,
    fornecedor,
    valor_total,
    validade,
    lote_fornecedor,
    observacao
  });

  await sb.from("movimentacoes").insert({
    tipo:"ENTRADA INSUMO",
    categoria:"INSUMO",
    item_nome:nome,
    quantidade,
    unidade,
    origem:"COMPRA",
    observacao
  });

  ["entradaInsumoQtd","entradaInsumoValor","entradaInsumoValidade","entradaInsumoLote","entradaInsumoObs"].forEach(id => document.getElementById(id).value = "");
  invalidar("estoque","inicio");
  alert("Compra de insumo registrada.");
  carregarEstoque(true);
  carregarInicio(true);
}

function mostrarSubEstoque(tipo) {
  document.getElementById("subEstoqueCervejas").style.display = tipo === "cervejas" ? "block" : "none";
  document.getElementById("subEstoqueInsumos").style.display = tipo === "insumos" ? "block" : "none";
  document.querySelectorAll("#telaEstoque .tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll("#telaEstoque .tab")[tipo === "cervejas" ? 0 : 1].classList.add("active");
}

async function carregarSaidas(force=false) {
  if (state.loaded.saidas && !force) return;

  const { data, error } = await sb.from("saidas")
    .select("*")
    .order("criado_em", { ascending:false })
    .limit(10);

  const box = document.getElementById("listaSaidas");
  if (error) {
    box.innerHTML = '<div class="item">Erro ao carregar saídas.</div>';
    return;
  }

  box.innerHTML = (data || []).length ? "" : '<div class="item"><span class="sub">Nenhuma saída registrada.</span></div>';
  (data || []).forEach(s => {
    box.insertAdjacentHTML("beforeend", `
      <div class="item searchable">
        <div>
          <strong>${escapeHtml(s.cliente_nome)}</strong>
          <div class="sub">${escapeHtml(s.cerveja_nome)} • ${fmt(s.litros)} L</div>
          <div class="sub">${dataBR(s.data_saida)} • ${escapeHtml(s.codigos_barris || "")}</div>
        </div>
        <span class="badge">${fmt((s.q10||0)+(s.q20||0)+(s.q30||0)+(s.q50||0))} barris</span>
      </div>
    `);
  });
  state.loaded.saidas = true;
}

async function carregarClientes(force=false) {
  if (state.loaded.clientes && !force) return;
  await carregarBaseCadastros(force);

  const box = document.getElementById("listaClientes");
  box.innerHTML = state.clientes.length ? "" : '<div class="item"><span class="sub">Nenhum cliente cadastrado.</span></div>';

  state.clientes.forEach(c => {
    box.insertAdjacentHTML("beforeend", `
      <div class="item searchable">
        <div>
          <strong>${escapeHtml(c.nome)}</strong>
          <div class="sub">${escapeHtml(c.estabelecimento || "-")} • ${escapeHtml(c.cidade || "-")}</div>
          <div class="sub">${escapeHtml(c.contato || "")}</div>
          <div class="rowActions">
            <button class="btnTiny btnEdit" onclick="editarCliente('${c.id}')">Editar</button>
            <button class="btnTiny btnNeutral" onclick="abrirExtratoCliente('${c.id}')">Extrato</button>
            <button class="btnTiny btnDangerTiny" onclick="inativarCliente('${c.id}')">Inativar</button>
          </div>
        </div>
      </div>
    `);
  });
  state.loaded.clientes = true;
}



function novoCliente() {
  ["cliId","cliNome","cliEstabelecimento","cliCidade","cliContato","cliObs"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  toggleForm("formCliente");
}

function editarCliente(id) {
  const c = state.clientes.find(x => x.id === id);
  if (!c) return;

  document.getElementById("cliId").value = c.id;
  document.getElementById("cliNome").value = c.nome || "";
  document.getElementById("cliEstabelecimento").value = c.estabelecimento || "";
  document.getElementById("cliCidade").value = c.cidade || "";
  document.getElementById("cliContato").value = c.contato || "";
  document.getElementById("cliObs").value = c.observacao || "";

  document.querySelectorAll(".formBox").forEach(f => f.style.display = "none");
  document.getElementById("formCliente").style.display = "block";
  window.scrollTo({ top:0, behavior:"smooth" });
}

async function inativarCliente(id) {
  const c = state.clientes.find(x => x.id === id);
  if (!c) return;
  if (!confirm(`Inativar cliente ${c.nome}? Ele não aparecerá mais nas listas.`)) return;

  const { error } = await sb.from("clientes").update({ ativo:false }).eq("id", id);
  if (error) {
    alert(error.message);
    return;
  }

  invalidar("baseCadastros","clientes","inicio","saidas","retornos");
  alert("Cliente inativado.");
  carregarClientes(true);
}

function prepararFormExtratoCliente() {
  prepararSelectClientes("extratoCliente");
}

function abrirExtratoCliente(id) {
  document.querySelectorAll(".formBox").forEach(f => f.style.display = "none");
  document.getElementById("formExtratoCliente").style.display = "block";
  prepararFormExtratoCliente();
  document.getElementById("extratoCliente").value = id;
  carregarExtratoCliente();
  window.scrollTo({ top:0, behavior:"smooth" });
}

async function carregarExtratoCliente() {
  const clienteId = document.getElementById("extratoCliente").value;
  const op = document.getElementById("extratoCliente").options[document.getElementById("extratoCliente").selectedIndex];
  const clienteNome = op ? (op.dataset.nome || op.textContent) : "";

  const box = document.getElementById("extratoClienteConteudo");
  if (!clienteId || !clienteNome) {
    box.innerHTML = '<div class="item"><span class="sub">Selecione um cliente.</span></div>';
    return;
  }

  const [saidas, retornos] = await Promise.all([
    sb.from("saidas").select("*").eq("cliente_id", clienteId).order("data_saida", { ascending:false }),
    sb.from("retornos").select("*").eq("cliente_id", clienteId).order("data_retorno", { ascending:false })
  ]);

  const saidaRows = saidas.data || [];
  const retornoRows = retornos.data || [];

  const litrosSaidos = saidaRows.reduce((s,r)=>s+Number(r.litros||0),0);
  const barrisSaidos = saidaRows.reduce((s,r)=>s+somaBarris(r.q10,r.q20,r.q30,r.q50),0);
  const barrisRetornados = retornoRows.reduce((s,r)=>s+somaBarris(r.q10,r.q20,r.q30,r.q50),0);
  const barrisAbertos = Math.max(0, barrisSaidos - barrisRetornados);

  const eventos = [
    ...saidaRows.map(s => ({
      tipo:"SAÍDA",
      data:s.data_saida,
      titulo:s.cerveja_nome,
      detalhe:`${fmt(s.litros)} L • 10L=${s.q10||0} • 20L=${s.q20||0} • 30L=${s.q30||0} • 50L=${s.q50||0}`,
      extra:s.codigos_barris || "",
      peso: new Date((s.data_saida || "") + "T00:00:00").getTime()
    })),
    ...retornoRows.map(r => ({
      tipo:"RETORNO",
      data:r.data_retorno,
      titulo:r.cerveja_nome || "Barris",
      detalhe:`${somaBarris(r.q10,r.q20,r.q30,r.q50)} barril(is) • 10L=${r.q10||0} • 20L=${r.q20||0} • 30L=${r.q30||0} • 50L=${r.q50||0}`,
      extra:r.codigos_barris || "",
      peso: new Date((r.data_retorno || "") + "T00:00:00").getTime()
    }))
  ].sort((a,b)=>b.peso-a.peso);

  box.innerHTML = `
    <div class="gridCards">
      <div class="card"><span>Litros enviados</span><strong>${fmt(litrosSaidos)} L</strong></div>
      <div class="card"><span>Barris enviados</span><strong>${barrisSaidos}</strong></div>
      <div class="card"><span>Barris retornados</span><strong>${barrisRetornados}</strong></div>
      <div class="card"><span>Barris em aberto</span><strong>${barrisAbertos}</strong></div>
    </div>
  `;

  if (!eventos.length) {
    box.insertAdjacentHTML("beforeend", '<div class="item"><span class="sub">Nenhum movimento para este cliente.</span></div>');
    return;
  }

  eventos.forEach(e => {
    box.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div>
          <strong>${escapeHtml(e.tipo)} — ${escapeHtml(e.titulo)}</strong>
          <div class="sub">${dataBR(e.data)} • ${escapeHtml(e.detalhe)}</div>
          <div class="sub">${escapeHtml(e.extra)}</div>
        </div>
        <span class="badge">${escapeHtml(e.tipo)}</span>
      </div>
    `);
  });
}


async function salvarCliente() {
  mostrarErro("cliErro", "");
  const clienteId = document.getElementById("cliId").value;
  const nome = document.getElementById("cliNome").value.trim();
  if (!nome) {
    mostrarErro("cliErro", "Informe o nome do cliente.");
    return;
  }

  const payload = {
    nome,
    estabelecimento: document.getElementById("cliEstabelecimento").value.trim(),
    cidade: document.getElementById("cliCidade").value.trim(),
    contato: document.getElementById("cliContato").value.trim(),
    observacao: document.getElementById("cliObs").value.trim()
  };

  const result = clienteId
    ? await sb.from("clientes").update(payload).eq("id", clienteId)
    : await sb.from("clientes").insert(payload);

  if (result.error) {
    mostrarErro("cliErro", result.error.message);
    return;
  }

  ["cliId","cliNome","cliEstabelecimento","cliCidade","cliContato","cliObs"].forEach(id => document.getElementById(id).value = "");
  invalidar("baseCadastros","clientes","inicio","saidas","retornos");
  alert(clienteId ? "Cliente atualizado." : "Cliente salvo.");
  carregarClientes(true);
}


async function carregarCadastros(force=false) {
  if (state.loaded.cadastros && !force) return;
  await carregarBaseCadastros(force);

  const cervejasBox = document.getElementById("listaCervejas");
  cervejasBox.innerHTML = state.cervejas.length ? "" : '<div class="item"><span class="sub">Nenhuma cerveja cadastrada.</span></div>';
  state.cervejas.forEach(c => {
    cervejasBox.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div>
          <strong>${escapeHtml(c.nome)}</strong>
          <div class="sub">${escapeHtml(c.estilo || "-")} • ${escapeHtml(c.marca || "-")}</div>
          <div class="rowActions">
            <button class="btnTiny btnEdit" onclick="editarCerveja('${c.id}')">Editar</button>
            <button class="btnTiny btnDangerTiny" onclick="inativarCerveja('${c.id}')">Inativar</button>
          </div>
        </div>
      </div>
    `);
  });

  const insumosBox = document.getElementById("listaInsumos");
  insumosBox.innerHTML = state.insumos.length ? "" : '<div class="item"><span class="sub">Nenhum insumo cadastrado.</span></div>';
  state.insumos.forEach(i => {
    insumosBox.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div>
          <strong>${escapeHtml(i.nome)}</strong>
          <div class="sub">${escapeHtml(i.tipo)} • ${escapeHtml(i.unidade)} • mínimo ${fmt(i.estoque_minimo,2)}</div>
          <div class="rowActions">
            <button class="btnTiny btnEdit" onclick="editarInsumo('${i.id}')">Editar</button>
            <button class="btnTiny btnDangerTiny" onclick="inativarInsumo('${i.id}')">Inativar</button>
          </div>
        </div>
      </div>
    `);
  });

  state.loaded.cadastros = true;
}



function novaCerveja() {
  ["cadCervejaId","cadCervejaNome","cadCervejaEstilo","cadCervejaMarca"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  toggleForm("formCerveja");
}

function novoInsumo() {
  ["cadInsumoId","cadInsumoNome","cadInsumoFornecedor","cadInsumoMinimo"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("cadInsumoTipo").value = "MALTE";
  ajustarUnidade();
  toggleForm("formInsumo");
}

function editarCerveja(id) {
  const c = state.cervejas.find(x => x.id === id);
  if (!c) return;
  document.getElementById("cadCervejaId").value = c.id;
  document.getElementById("cadCervejaNome").value = c.nome || "";
  document.getElementById("cadCervejaEstilo").value = c.estilo || "";
  document.getElementById("cadCervejaMarca").value = c.marca || "";

  document.querySelectorAll(".formBox").forEach(f => f.style.display = "none");
  document.getElementById("formCerveja").style.display = "block";
  window.scrollTo({ top:0, behavior:"smooth" });
}

async function inativarCerveja(id) {
  const c = state.cervejas.find(x => x.id === id);
  if (!c) return;
  if (!confirm(`Inativar cerveja ${c.nome}? Ela não aparecerá mais nas listas.`)) return;

  const { error } = await sb.from("cervejas").update({ ativo:false }).eq("id", id);
  if (error) {
    alert(error.message);
    return;
  }

  invalidar("baseCadastros","cadastros","estoque","producao","saidas","inicio");
  alert("Cerveja inativada.");
  await carregarBaseCadastros(true);
  carregarCadastros(true);
}

function editarInsumo(id) {
  const i = state.insumos.find(x => x.id === id);
  if (!i) return;
  document.getElementById("cadInsumoId").value = i.id;
  document.getElementById("cadInsumoTipo").value = i.tipo || "MALTE";
  document.getElementById("cadInsumoNome").value = i.nome || "";
  document.getElementById("cadInsumoUnidade").value = i.unidade || unidadePadrao(i.tipo || "MALTE");
  document.getElementById("cadInsumoFornecedor").value = i.fornecedor_padrao || "";
  document.getElementById("cadInsumoMinimo").value = i.estoque_minimo || 0;

  document.querySelectorAll(".formBox").forEach(f => f.style.display = "none");
  document.getElementById("formInsumo").style.display = "block";
  window.scrollTo({ top:0, behavior:"smooth" });
}

async function inativarInsumo(id) {
  const i = state.insumos.find(x => x.id === id);
  if (!i) return;
  if (!confirm(`Inativar insumo ${i.nome}? Ele não aparecerá mais nas listas.`)) return;

  const { error } = await sb.from("insumos").update({ ativo:false }).eq("id", id);
  if (error) {
    alert(error.message);
    return;
  }

  invalidar("baseCadastros","cadastros","estoque","producao","inicio");
  alert("Insumo inativado.");
  await carregarBaseCadastros(true);
  carregarCadastros(true);
}


async function salvarCerveja() {
  mostrarErro("cadCervejaErro", "");
  const cervejaId = document.getElementById("cadCervejaId").value;
  const nome = document.getElementById("cadCervejaNome").value.trim().toUpperCase();
  if (!nome) {
    mostrarErro("cadCervejaErro", "Informe o nome da cerveja.");
    return;
  }

  const payload = {
    nome,
    estilo: document.getElementById("cadCervejaEstilo").value.trim(),
    marca: document.getElementById("cadCervejaMarca").value.trim()
  };

  const result = cervejaId
    ? await sb.from("cervejas").update(payload).eq("id", cervejaId)
    : await sb.from("cervejas").insert(payload);

  if (result.error) {
    mostrarErro("cadCervejaErro", result.error.message);
    return;
  }

  ["cadCervejaId","cadCervejaNome","cadCervejaEstilo","cadCervejaMarca"].forEach(id => document.getElementById(id).value = "");
  invalidar("baseCadastros","cadastros","estoque","producao","saidas","inicio");
  alert(cervejaId ? "Cerveja atualizada." : "Cerveja salva.");
  await carregarBaseCadastros(true);
  carregarCadastros(true);
}


function ajustarUnidade() {
  const tipo = document.getElementById("cadInsumoTipo").value;
  document.getElementById("cadInsumoUnidade").value = unidadePadrao(tipo);
}

async function salvarInsumo() {
  mostrarErro("cadInsumoErro", "");
  const insumoId = document.getElementById("cadInsumoId").value;
  const tipo = document.getElementById("cadInsumoTipo").value;
  const nome = document.getElementById("cadInsumoNome").value.trim();
  const unidade = document.getElementById("cadInsumoUnidade").value;
  if (!nome) {
    mostrarErro("cadInsumoErro", "Informe o nome do insumo.");
    return;
  }

  const payload = {
    tipo,
    nome,
    unidade,
    fornecedor_padrao: document.getElementById("cadInsumoFornecedor").value.trim(),
    estoque_minimo: Number(document.getElementById("cadInsumoMinimo").value || 0)
  };

  const result = insumoId
    ? await sb.from("insumos").update(payload).eq("id", insumoId)
    : await sb.from("insumos").insert(payload);

  if (result.error) {
    mostrarErro("cadInsumoErro", result.error.message);
    return;
  }

  ["cadInsumoId","cadInsumoNome","cadInsumoFornecedor","cadInsumoMinimo"].forEach(id => document.getElementById(id).value = "");
  invalidar("baseCadastros","cadastros","estoque","producao","inicio");
  alert(insumoId ? "Insumo atualizado." : "Insumo salvo.");
  await carregarBaseCadastros(true);
  carregarCadastros(true);
}


function alternarTipoFermentoProducao() {
  const tipo = document.getElementById("prodFermentoTipo")?.value || "ESTOQUE";
  const boxEstoque = document.getElementById("boxFermentoEstoque");
  const boxReuso = document.getElementById("boxFermentoReuso");
  if (boxEstoque) boxEstoque.style.display = tipo === "ESTOQUE" ? "block" : "none";
  if (boxReuso) boxReuso.style.display = tipo === "REUSO" ? "block" : "none";
}


async function carregarLotes(force=false) {
  if (state.loaded.lotes && !force) return;

  const { data, error } = await sb.from("producoes")
    .select("*")
    .order("criado_em", { ascending:false });

  const box = document.getElementById("listaLotes");
  if (error) {
    box.innerHTML = `<div class="item"><span class="sub">Erro ao carregar lotes: ${escapeHtml(error.message)}</span></div>`;
    return;
  }

  state.lotes = data || [];
  renderResumoLotes();
  renderListaLotes();

  state.loaded.lotes = true;
}

function mostrarSubLotes(tipo) {
  state.filtroLotes = tipo;
  document.querySelectorAll("#telaLotes .tab").forEach(t => t.classList.remove("active"));
  const idx = tipo === "todos" ? 0 : tipo === "fermentando" ? 1 : 2;
  document.querySelectorAll("#telaLotes .tab")[idx].classList.add("active");
  renderListaLotes();
}

function renderResumoLotes() {
  const total = state.lotes.length;
  const fermentando = state.lotes.filter(l => l.status === "FERMENTANDO").length;
  const envasados = state.lotes.filter(l => l.status === "ENVASADO").length;
  const litros = state.lotes.reduce((s,l) => s + Number(l.litros_produzidos || 0), 0);

  const box = document.getElementById("resumoLotes");
  if (!box) return;

  box.innerHTML = `
    <div class="card"><span>Total de lotes</span><strong>${total}</strong></div>
    <div class="card"><span>Fermentando</span><strong>${fermentando}</strong></div>
    <div class="card"><span>Envasados</span><strong>${envasados}</strong></div>
    <div class="card"><span>Litros produzidos</span><strong>${fmt(litros)} L</strong></div>
  `;
}

function renderListaLotes() {
  const box = document.getElementById("listaLotes");
  if (!box) return;

  let lista = [...state.lotes];
  if (state.filtroLotes === "fermentando") lista = lista.filter(l => l.status === "FERMENTANDO");
  if (state.filtroLotes === "envasados") lista = lista.filter(l => l.status === "ENVASADO");

  box.innerHTML = lista.length ? "" : '<div class="item"><span class="sub">Nenhum lote encontrado.</span></div>';

  lista.forEach(l => {
    const dias = l.data_producao ? Math.max(0, Math.floor((new Date() - new Date(l.data_producao + "T00:00:00")) / 86400000)) : 0;
    box.insertAdjacentHTML("beforeend", `
      <div class="item searchable">
        <div>
          <strong>${escapeHtml(l.lote)} — ${escapeHtml(l.cerveja_nome)}</strong>
          <div class="sub">${fmt(l.litros_produzidos)} L • ${escapeHtml(l.status || "-")} • ${dataBR(l.data_producao)}</div>
          <div class="sub">${dias} dia(s) desde a produção • Fermento: ${escapeHtml(l.fermento_nome || "-")}</div>
          <div class="rowActions">
            <button class="btnTiny btnEdit" onclick="abrirFichaLote('${l.id}')">Ver ficha</button>
          </div>
        </div>
        <span class="badge">${escapeHtml(l.status || "-")}</span>
      </div>
    `);
  });
}

function fecharFichaLote() {
  document.getElementById("fichaLoteBox").style.display = "none";
}

async function abrirFichaLote(id) {
  const lote = state.lotes.find(l => l.id === id);
  if (!lote) return;

  const box = document.getElementById("fichaLoteBox");
  const conteudo = document.getElementById("fichaLoteConteudo");
  box.style.display = "block";
  conteudo.innerHTML = '<div class="muted">Carregando ficha...</div>';

  const [insumos, dry, envases, fermentoHist] = await Promise.all([
    sb.from("producao_insumos").select("*").eq("producao_id", id).order("criado_em", { ascending:true }),
    sb.from("dry_hopping").select("*").eq("producao_id", id).order("criado_em", { ascending:true }),
    sb.from("envases").select("*").eq("producao_id", id).order("criado_em", { ascending:true }),
    sb.from("fermento_historico").select("*").eq("lote", lote.lote).eq("cerveja_nome", lote.cerveja_nome).order("criado_em", { ascending:true })
  ]);

  const insumosRows = insumos.data || [];
  const dryRows = dry.data || [];
  const envaseRows = envases.data || [];
  const fermentoRows = fermentoHist.data || [];

  const totalEnvase = envaseRows.reduce((s,e) => s + Number(e.litros_total || 0), 0);
  const totalBarris = envaseRows.reduce((s,e) => s + Number(e.litros_barris || 0), 0);
  const totalIncompleto = envaseRows.reduce((s,e) => s + Number(e.litros_incompleto_bar || 0), 0);
  const perda = Math.max(0, Number(lote.litros_produzidos || 0) - totalEnvase);
  const rendimento = Number(lote.litros_produzidos || 0) > 0 ? (totalEnvase / Number(lote.litros_produzidos || 0)) * 100 : 0;

  const agrupaInsumos = {};
  insumosRows.forEach(i => {
    const k = `${i.etapa || "PRODUCAO"}|${i.tipo}|${i.insumo_nome}|${i.unidade}`;
    agrupaInsumos[k] = (agrupaInsumos[k] || 0) + Number(i.quantidade || 0);
  });

  const linhasInsumos = Object.entries(agrupaInsumos).map(([k,v]) => {
    const [etapa,tipo,nome,unidade] = k.split("|");
    return `${etapa} • ${tipo} — ${nome}: ${fmt(v,2)} ${unidade}`;
  });

  conteudo.innerHTML = `
    <div class="loteFichaTitulo">${escapeHtml(lote.lote)} — ${escapeHtml(lote.cerveja_nome)}</div>
    <div class="muted">${escapeHtml(lote.status || "-")} • Produzido em ${dataBR(lote.data_producao)} • ${fmt(lote.litros_produzidos)} L</div>

    <div class="gridCards" style="margin-top:12px;">
      <div class="card"><span>Produzido</span><strong>${fmt(lote.litros_produzidos)} L</strong></div>
      <div class="card"><span>Envasado total</span><strong>${fmt(totalEnvase)} L</strong></div>
      <div class="card"><span>Perda estimada</span><strong>${fmt(perda)} L</strong></div>
      <div class="card"><span>Rendimento</span><strong>${fmt(rendimento,1)}%</strong></div>
    </div>

    <div class="fichaGrid">
      <div class="fichaSecao"><h4>Insumos usados</h4><div class="sub">${linhasInsumos.length ? linhasInsumos.map(escapeHtml).join("<br>") : "Nenhum insumo registrado."}</div></div>
      <div class="fichaSecao"><h4>Dry hopping</h4><div class="sub">${dryRows.length ? dryRows.map(d => `${escapeHtml(d.lupulo_nome)}: ${fmt(d.quantidade,2)} ${escapeHtml(d.unidade || "G")} • ${dataBR(d.data_dry_hopping)}`).join("<br>") : "Nenhum dry hopping registrado."}</div></div>
      <div class="fichaSecao"><h4>Envases</h4><div class="sub">${envaseRows.length ? envaseRows.map(e => `${dataBR(e.data_envase)} • ${escapeHtml(e.origem)} • total ${fmt(e.litros_total)} L • barris ${fmt(e.litros_barris)} L • bar ${fmt(e.litros_incompleto_bar)} L • perda ${fmt(e.perda)} L`).join("<br>") : "Nenhum envase registrado."}</div></div>
      <div class="fichaSecao"><h4>Fermento</h4><div class="sub">Tipo: ${escapeHtml(lote.fermento_tipo || "-")}<br>Nome/código: ${escapeHtml(lote.fermento_nome || "-")}<br>${fermentoRows.length ? fermentoRows.map(f => `${escapeHtml(f.acao)} • ${fmt(f.quantidade,2)} • ${dataHoraBR(f.criado_em)}`).join("<br>") : ""}</div></div>
      <div class="fichaSecao"><h4>Observação</h4><div class="sub">${escapeHtml(lote.observacao || "-")}</div></div>
      <div class="fichaSecao"><h4>Resumo de envase</h4><div class="sub">Barris completos: ${fmt(totalBarris)} L<br>Direto no bar/incompleto: ${fmt(totalIncompleto)} L<br>Total envasado: ${fmt(totalEnvase)} L</div></div>
    </div>
  `;

  box.scrollIntoView({ behavior:"smooth", block:"start" });
}


async function carregarFermentosReusoBase(force=false) {
  if (state.loaded.fermentosReusoBase && !force) return;

  const { data, error } = await sb.from("fermento_reuso")
    .select("*")
    .in("status", ["DISPONIVEL","EM_USO"])
    .gt("quantidade", 0)
    .order("criado_em", { ascending:false });

  if (error) {
    state.fermentosReuso = [];
  } else {
    state.fermentosReuso = data || [];
  }

  state.loaded.fermentosReusoBase = true;
}

function prepararSelectFermentosReuso(id, placeholder="Selecionar fermento...") {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = `<option value="">${placeholder}</option>`;
  state.fermentosReuso.forEach(f => {
    const op = document.createElement("option");
    op.value = f.id;
    op.textContent = `${f.codigo} — G${f.geracao} — ${fmt(f.quantidade, 2)} ${f.unidade}`;
    sel.appendChild(op);
  });
}

async function validarFermentoReusoSuficiente(id, quantidade) {
  const { data, error } = await sb.from("fermento_reuso").select("*").eq("id", id).single();
  if (error) throw error;
  if (!data || data.status === "DESCARTADO") throw new Error("Fermento reutilizável não disponível.");
  if (Number(data.quantidade || 0) < Number(quantidade || 0)) {
    throw new Error(`${data.codigo}: estoque insuficiente. Disponível ${fmt(data.quantidade, 3)} ${data.unidade}, necessário ${fmt(quantidade, 3)} ${data.unidade}.`);
  }
  return data;
}

async function usarFermentoReusoNaProducao(id, quantidade, lote, cerveja_nome, producao_id) {
  const f = await validarFermentoReusoSuficiente(id, quantidade);
  const novaQtd = Number(f.quantidade || 0) - Number(quantidade || 0);

  const historicoAtual = String(f.historico_cervejas || "").trim();
  const historicoNovo = historicoAtual
    ? (historicoAtual.includes(cerveja_nome) ? historicoAtual : historicoAtual + " → " + cerveja_nome)
    : cerveja_nome;

  await sb.from("fermento_reuso").update({
    quantidade: novaQtd,
    status: novaQtd > 0 ? "DISPONIVEL" : "USADO",
    historico_cervejas: historicoNovo
  }).eq("id", id);

  await sb.from("fermento_historico").insert({
    fermento_reuso_id: id,
    acao: "USO",
    lote,
    cerveja_nome,
    quantidade,
    observacao: "Usado na produção"
  });

  await sb.from("movimentacoes").insert({
    tipo:"USO FERMENTO REUSO",
    categoria:"FERMENTO",
    item_nome:f.codigo,
    quantidade:-Math.abs(Number(quantidade)),
    unidade:f.unidade || "UN",
    lote,
    observacao:`Usado na produção ${cerveja_nome}`
  });
}

function prepararFormColetaFermento() {
  prepararSelectLotes("coletaLote");
  const lote = document.getElementById("coletaLote");
  if (lote) {
    lote.onchange = function() {
      const prod = getProducaoSelecionada("coletaLote");
      if (prod && prod.fermento_nome) document.getElementById("coletaBase").value = prod.fermento_nome;
    };
  }
}

async function prepararFormDescarteFermento() {
  await carregarFermentosReusoBase(true);
  prepararSelectFermentosReuso("descarteFermento", "Selecionar fermento para descarte...");
}

async function carregarFermentos(force=false) {
  if (state.loaded.fermentos && !force) return;
  await carregarFermentosReusoBase(true);

  const { data: hist } = await sb.from("fermento_historico")
    .select("*")
    .order("criado_em", { ascending:false })
    .limit(20);

  const lista = document.getElementById("listaFermentos");
  lista.innerHTML = state.fermentosReuso.length ? "" : '<div class="item"><span class="sub">Nenhum fermento reutilizável disponível.</span></div>';

  state.fermentosReuso.forEach(f => {
    lista.insertAdjacentHTML("beforeend", `
      <div class="item searchable">
        <div>
          <strong>${escapeHtml(f.codigo)}</strong>
          <div class="sub">Base: ${escapeHtml(f.fermento_base)} • Geração G${escapeHtml(f.geracao)}</div>
          <div class="sub">Histórico: ${escapeHtml(f.historico_cervejas || "-")}</div>
          <div class="sub">Origem: ${escapeHtml(f.lote_origem || "-")}</div>
        </div>
        <span class="badge">${fmt(f.quantidade, 2)} ${escapeHtml(f.unidade || "UN")}</span>
      </div>
    `);
  });

  const hbox = document.getElementById("historicoFermentos");
  hbox.innerHTML = (hist || []).length ? "" : '<div class="item"><span class="sub">Nenhum histórico.</span></div>';
  (hist || []).forEach(h => {
    hbox.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div>
          <strong>${escapeHtml(h.acao)}</strong>
          <div class="sub">${dataHoraBR(h.criado_em)} • Lote ${escapeHtml(h.lote || "-")} • ${escapeHtml(h.cerveja_nome || "-")}</div>
          <div class="sub">${escapeHtml(h.observacao || "")}</div>
        </div>
        <span class="badge">${fmt(h.quantidade, 2)}</span>
      </div>
    `);
  });

  state.loaded.fermentos = true;
}

async function salvarColetaFermento() {
  mostrarErro("coletaErro", "");
  const prod = getProducaoSelecionada("coletaLote");
  const lote = prod ? prod.lote : "";
  const base = document.getElementById("coletaBase").value.trim();
  const quantidade = Number(document.getElementById("coletaQtd").value || 0);
  const observacao = document.getElementById("coletaObs").value.trim();

  if (!prod || !base || quantidade <= 0) {
    mostrarErro("coletaErro", "Informe lote, fermento base e quantidade coletada.");
    return;
  }

  let geracao = 2;
  let historico = prod.cerveja_nome;

  if (prod.fermento_reuso_id) {
    const { data: fOrigem } = await sb.from("fermento_reuso").select("*").eq("id", prod.fermento_reuso_id).single();
    if (fOrigem) {
      geracao = Number(fOrigem.geracao || 1) + 1;
      historico = fOrigem.historico_cervejas
        ? (fOrigem.historico_cervejas.includes(prod.cerveja_nome) ? fOrigem.historico_cervejas : fOrigem.historico_cervejas + " → " + prod.cerveja_nome)
        : prod.cerveja_nome;
    }
  }

  const codigoBase = `${prod.cerveja_nome}-${lote}`.replace(/[^a-zA-Z0-9]/g, "").slice(0, 22) || lote;
  const codigo = `F-${codigoBase}-G${geracao}-${Date.now().toString().slice(-4)}`;

  const { data: novo, error } = await sb.from("fermento_reuso").insert({
    codigo,
    fermento_base: base,
    geracao,
    quantidade,
    unidade:"UN",
    status:"DISPONIVEL",
    historico_cervejas: historico,
    lote_origem:lote,
    observacao
  }).select().single();

  if (error) {
    mostrarErro("coletaErro", error.message);
    return;
  }

  await sb.from("fermento_historico").insert({
    fermento_reuso_id: novo.id,
    acao:"COLETA",
    lote,
    cerveja_nome: prod.cerveja_nome,
    quantidade,
    observacao
  });

  await sb.from("movimentacoes").insert({
    tipo:"COLETA FERMENTO",
    categoria:"FERMENTO",
    item_nome: codigo,
    quantidade,
    unidade:"UN",
    lote,
    observacao
  });

  ["coletaBase","coletaQtd","coletaObs"].forEach(id => document.getElementById(id).value = "");
  invalidar("fermentos","fermentosReusoBase","producao");
  alert("Fermento coletado para reutilização.");
  carregarFermentos(true);
}

async function salvarDescarteFermento() {
  mostrarErro("descarteErro", "");
  const id = document.getElementById("descarteFermento").value;
  const quantidade = Number(document.getElementById("descarteQtd").value || 0);
  const motivo = document.getElementById("descarteMotivo").value.trim();

  if (!id || quantidade <= 0) {
    mostrarErro("descarteErro", "Selecione o fermento e informe a quantidade.");
    return;
  }

  const f = await validarFermentoReusoSuficiente(id, quantidade);
  const novaQtd = Number(f.quantidade || 0) - quantidade;

  const { error } = await sb.from("fermento_reuso").update({
    quantidade: novaQtd,
    status: novaQtd > 0 ? "DISPONIVEL" : "DESCARTADO"
  }).eq("id", id);

  if (error) {
    mostrarErro("descarteErro", error.message);
    return;
  }

  await sb.from("fermento_historico").insert({
    fermento_reuso_id:id,
    acao:"DESCARTE",
    lote:f.lote_origem,
    cerveja_nome:"",
    quantidade,
    observacao:motivo
  });

  await sb.from("movimentacoes").insert({
    tipo:"DESCARTE FERMENTO",
    categoria:"FERMENTO",
    item_nome:f.codigo,
    quantidade:-Math.abs(quantidade),
    unidade:f.unidade || "UN",
    lote:f.lote_origem,
    observacao:motivo
  });

  ["descarteQtd","descarteMotivo"].forEach(id => document.getElementById(id).value = "");
  invalidar("fermentos","fermentosReusoBase");
  alert("Descarte registrado.");
  carregarFermentos(true);
}

function prepararFormRetiradaPhenomena() {
  prepararSelectCervejas("phenRetiradaCerveja");
}

async function carregarPhenomena(force=false) {
  if (state.loaded.phenomena && !force) return;
  await carregarBaseCadastros();

  const [estoque, entradas, retiradas, debitos, pagamentos] = await Promise.all([
    sb.from("estoque_cerveja").select("*").eq("origem","PHENOMENA").order("cerveja_nome"),
    sb.from("phenomena_entradas").select("*").order("criado_em", { ascending:false }).limit(20),
    sb.from("movimentacoes").select("*").eq("tipo","RETIRADA PHENOMENA").order("criado_em", { ascending:false }).limit(20),
    sb.from("phenomena_debitos").select("*").order("criado_em", { ascending:false }).limit(100),
    sb.from("phenomena_pagamentos").select("*").order("criado_em", { ascending:false }).limit(20)
  ]);

  state.debitosPhenomena = debitos.data || [];

  const debitosAbertos = state.debitosPhenomena.filter(d => d.status !== "PAGO");
  const saldoAberto = debitosAbertos.reduce((s,d) => s + (Number(d.valor_total || 0) - Number(d.valor_pago || 0)), 0);
  document.getElementById("phenSaldoAberto").innerText = fmtMoeda(saldoAberto);
  document.getElementById("phenQtdDebitos").innerText = debitosAbertos.length;

  const ebox = document.getElementById("estoquePhenomena");
  const rows = estoque.data || [];
  ebox.innerHTML = rows.length ? "" : '<div class="item"><span class="sub">Nenhum estoque Phenomena.</span></div>';
  ordenarComZeradosFinal(rows, r => r.cerveja_nome, r => r.litros).forEach(r => {
    ebox.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div>
          <strong>${escapeHtml(r.cerveja_nome)}</strong>
          <div class="sub">10L=${r.q10 || 0} • 20L=${r.q20 || 0} • 30L=${r.q30 || 0} • 50L=${r.q50 || 0}</div>
        </div>
        <span class="badge ${Number(r.litros || 0) <= 0 ? "zero" : ""}">${fmt(r.litros)} L</span>
      </div>
    `);
  });

  const dbox = document.getElementById("debitosPhenomena");
  dbox.innerHTML = state.debitosPhenomena.length ? "" : '<div class="item"><span class="sub">Nenhum débito Phenomena.</span></div>';
  state.debitosPhenomena.forEach(d => {
    const aberto = Number(d.valor_total || 0) - Number(d.valor_pago || 0);
    dbox.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div>
          <strong>${escapeHtml(d.cerveja_nome)}</strong>
          <div class="sub">${dataHoraBR(d.criado_em)} • ${fmt(d.litros)} L • ${escapeHtml(d.status || "ABERTO")}</div>
          <div class="sub">Total ${fmtMoeda(d.valor_total)} • Pago ${fmtMoeda(d.valor_pago)} • Aberto ${fmtMoeda(aberto)}</div>
          <div class="sub">${escapeHtml(d.observacao || "")}</div>
        </div>
        <span class="badge ${d.status === "PAGO" ? "" : "zero"}">${fmtMoeda(aberto)}</span>
      </div>
    `);
  });

  const pbox = document.getElementById("pagamentosPhenomena");
  pbox.innerHTML = (pagamentos.data || []).length ? "" : '<div class="item"><span class="sub">Nenhum pagamento registrado.</span></div>';
  (pagamentos.data || []).forEach(p => {
    pbox.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div>
          <strong>Pagamento Phenomena</strong>
          <div class="sub">${dataHoraBR(p.criado_em)} • ${escapeHtml(p.responsavel || "")}</div>
          <div class="sub">${escapeHtml(p.observacao || "")}</div>
        </div>
        <span class="badge">${fmtMoeda(p.valor)}</span>
      </div>
    `);
  });

  const inbox = document.getElementById("entradasPhenomena");
  inbox.innerHTML = (entradas.data || []).length ? "" : '<div class="item"><span class="sub">Nenhuma entrada Phenomena.</span></div>';
  (entradas.data || []).forEach(r => {
    inbox.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div>
          <strong>${escapeHtml(r.cerveja_nome)}</strong>
          <div class="sub">${dataHoraBR(r.criado_em)} • ${escapeHtml(r.observacao || "")}</div>
        </div>
        <span class="badge">${fmt(r.litros)} L</span>
      </div>
    `);
  });

  const rout = document.getElementById("retiradasPhenomena");
  rout.innerHTML = (retiradas.data || []).length ? "" : '<div class="item"><span class="sub">Nenhuma retirada registrada.</span></div>';
  (retiradas.data || []).forEach(r => {
    rout.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div>
          <strong>${escapeHtml(r.item_nome)}</strong>
          <div class="sub">${dataHoraBR(r.criado_em)} • ${escapeHtml(r.responsavel || "")}</div>
          <div class="sub">${escapeHtml(r.observacao || "")}</div>
        </div>
        <span class="badge">${fmt(Math.abs(Number(r.quantidade || 0)))} L</span>
      </div>
    `);
  });

  state.loaded.phenomena = true;
}

function atualizarResumoRetiradaPhenomena() {
  const q10 = Number(document.getElementById("phenRetQ10")?.value || 0);
  const q20 = Number(document.getElementById("phenRetQ20")?.value || 0);
  const q30 = Number(document.getElementById("phenRetQ30")?.value || 0);
  const q50 = Number(document.getElementById("phenRetQ50")?.value || 0);
  const litros = litrosBarris(q10,q20,q30,q50);
  const valorLitro = 3;
  const valor = litros * valorLitro;
  const el = document.getElementById("phenRetResumo");
  if (el) el.innerText = `Total: ${fmt(litros)} L • Débito: ${fmtMoeda(valor)} • Regra fixa: R$ 3,00/L`;
}

async function prepararFormPagamentoPhenomena() {
  await carregarPhenomena(true);
  const sel = document.getElementById("phenPagDebito");
  sel.innerHTML = '<option value="">Selecionar débito...</option>';

  state.debitosPhenomena
    .filter(d => d.status !== "PAGO")
    .sort((a,b) => new Date(a.criado_em) - new Date(b.criado_em))
    .forEach(d => {
      const aberto = Number(d.valor_total || 0) - Number(d.valor_pago || 0);
      const op = document.createElement("option");
      op.value = d.id;
      op.dataset.aberto = aberto;
      op.dataset.total = d.valor_total || 0;
      op.dataset.pago = d.valor_pago || 0;
      op.textContent = `${d.cerveja_nome} — ${dataHoraBR(d.criado_em)} — aberto ${fmtMoeda(aberto)}`;
      sel.appendChild(op);
    });

  atualizarResumoPagamentoPhenomena();
}

function atualizarResumoPagamentoPhenomena() {
  const sel = document.getElementById("phenPagDebito");
  const op = sel ? sel.options[sel.selectedIndex] : null;
  const el = document.getElementById("phenPagResumo");

  if (!op || !op.value) {
    if (el) el.innerText = "Selecione um débito.";
    return;
  }

  if (el) {
    el.innerText = `Aberto: ${fmtMoeda(op.dataset.aberto)} • Total: ${fmtMoeda(op.dataset.total)} • Já pago: ${fmtMoeda(op.dataset.pago)}`;
  }

  const valorInput = document.getElementById("phenPagValor");
  if (valorInput && !valorInput.value) valorInput.value = Number(op.dataset.aberto || 0).toFixed(2);
}

async function salvarPagamentoPhenomena() {
  mostrarErro("phenPagErro", "");
  const debitoId = document.getElementById("phenPagDebito").value;
  const valor = Number(document.getElementById("phenPagValor").value || 0);
  const responsavel = document.getElementById("phenPagResp").value.trim();
  const observacao = document.getElementById("phenPagObs").value.trim();

  if (!debitoId || valor <= 0) {
    mostrarErro("phenPagErro", "Selecione o débito e informe o valor pago.");
    return;
  }

  const { data: debito, error: buscaErro } = await sb.from("phenomena_debitos")
    .select("*")
    .eq("id", debitoId)
    .single();

  if (buscaErro || !debito) {
    mostrarErro("phenPagErro", buscaErro ? buscaErro.message : "Débito não encontrado.");
    return;
  }

  const aberto = Number(debito.valor_total || 0) - Number(debito.valor_pago || 0);
  if (valor > aberto) {
    mostrarErro("phenPagErro", `Valor maior que o saldo aberto. Aberto: ${fmtMoeda(aberto)}.`);
    return;
  }

  const novoPago = Number(debito.valor_pago || 0) + valor;
  const novoStatus = novoPago >= Number(debito.valor_total || 0) ? "PAGO" : "PARCIAL";

  const { error: pagErro } = await sb.from("phenomena_pagamentos").insert({
    debito_id: debitoId,
    valor,
    responsavel,
    observacao
  });

  if (pagErro) {
    mostrarErro("phenPagErro", pagErro.message);
    return;
  }

  const { error: updErro } = await sb.from("phenomena_debitos").update({
    valor_pago: novoPago,
    status: novoStatus,
    pago_em: novoStatus === "PAGO" ? new Date().toISOString() : null
  }).eq("id", debitoId);

  if (updErro) {
    mostrarErro("phenPagErro", updErro.message);
    return;
  }

  await sb.from("movimentacoes").insert({
    tipo:"PAGAMENTO PHENOMENA",
    categoria:"FINANCEIRO",
    item_nome:debito.cerveja_nome,
    quantidade:valor,
    unidade:"R$",
    observacao,
    responsavel
  });

  ["phenPagValor","phenPagResp","phenPagObs"].forEach(id => document.getElementById(id).value = "");
  invalidar("phenomena","auditoria");
  alert("Pagamento Phenomena registrado.");
  carregarPhenomena(true);
}

async function salvarRetiradaPhenomena() {
  mostrarErro("phenRetErro", "");
  const cerveja_nome = document.getElementById("phenRetiradaCerveja").value;
  const q10 = Number(document.getElementById("phenRetQ10").value || 0);
  const q20 = Number(document.getElementById("phenRetQ20").value || 0);
  const q30 = Number(document.getElementById("phenRetQ30").value || 0);
  const q50 = Number(document.getElementById("phenRetQ50").value || 0);
  const responsavel = document.getElementById("phenRetResp").value.trim();
  const obs = document.getElementById("phenRetObs").value.trim();

  if (!cerveja_nome || somaBarris(q10,q20,q30,q50) <= 0) {
    mostrarErro("phenRetErro", "Selecione a cerveja e informe os barris.");
    return;
  }

  const { data: rows, error: buscaErro } = await sb.from("estoque_cerveja")
    .select("*")
    .eq("cerveja_nome", cerveja_nome)
    .eq("origem","PHENOMENA")
    .limit(1);

  if (buscaErro) {
    mostrarErro("phenRetErro", buscaErro.message);
    return;
  }

  const atual = rows && rows[0] ? rows[0] : { q10:0,q20:0,q30:0,q50:0 };
  const faltas = [];
  if (Number(atual.q10 || 0) < q10) faltas.push(`10L: solicitado ${q10}, disponível ${atual.q10 || 0}`);
  if (Number(atual.q20 || 0) < q20) faltas.push(`20L: solicitado ${q20}, disponível ${atual.q20 || 0}`);
  if (Number(atual.q30 || 0) < q30) faltas.push(`30L: solicitado ${q30}, disponível ${atual.q30 || 0}`);
  if (Number(atual.q50 || 0) < q50) faltas.push(`50L: solicitado ${q50}, disponível ${atual.q50 || 0}`);

  if (faltas.length) {
    mostrarErro("phenRetErro", "Estoque Phenomena insuficiente:\n" + faltas.join("\n"));
    return;
  }

  const nq10 = Number(atual.q10 || 0) - q10;
  const nq20 = Number(atual.q20 || 0) - q20;
  const nq30 = Number(atual.q30 || 0) - q30;
  const nq50 = Number(atual.q50 || 0) - q50;
  const litros = litrosBarris(q10,q20,q30,q50);
  const valorLitro = 3;
  const valorTotal = litros * valorLitro;
  const cerveja = state.cervejas.find(c => c.nome === cerveja_nome);

  const resumo = `Retirada Phenomena\n\nCerveja: ${cerveja_nome}\nLitros: ${fmt(litros)} L\nValor: ${fmtMoeda(valorTotal)}\n\nConfirmar retirada e gerar débito?`;
  if (!confirm(resumo)) return;

  const { error: estErro } = await sb.from("estoque_cerveja").upsert({
    cerveja_id: cerveja ? cerveja.id : null,
    cerveja_nome,
    origem:"PHENOMENA",
    q10:nq10,q20:nq20,q30:nq30,q50:nq50,
    litros:litrosBarris(nq10,nq20,nq30,nq50),
    atualizado_em:new Date().toISOString()
  }, { onConflict:"cerveja_nome,origem" });

  if (estErro) {
    mostrarErro("phenRetErro", estErro.message);
    return;
  }

  const { error: debErro } = await sb.from("phenomena_debitos").insert({
    cerveja_nome,
    q10,q20,q30,q50,
    litros,
    valor_litro: valorLitro,
    valor_total: valorTotal,
    valor_pago: 0,
    status:"ABERTO",
    responsavel,
    observacao: obs
  });

  if (debErro) {
    mostrarErro("phenRetErro", "A retirada baixou o estoque, mas houve erro ao gerar débito: " + debErro.message);
    return;
  }

  await sb.from("movimentacoes").insert({
    tipo:"RETIRADA PHENOMENA",
    categoria:"CERVEJA",
    item_nome:cerveja_nome,
    quantidade:-Math.abs(litros),
    unidade:"L",
    origem:"PHENOMENA",
    observacao:`Débito gerado: ${fmtMoeda(valorTotal)}${obs ? " — " + obs : ""}`,
    responsavel
  });

  await sb.from("movimentacoes").insert({
    tipo:"DÉBITO PHENOMENA",
    categoria:"FINANCEIRO",
    item_nome:cerveja_nome,
    quantidade:valorTotal,
    unidade:"R$",
    origem:"PHENOMENA",
    observacao:obs,
    responsavel
  });

  ["phenRetQ10","phenRetQ20","phenRetQ30","phenRetQ50"].forEach(id => document.getElementById(id).value = "0");
  ["phenRetResp","phenRetObs"].forEach(id => document.getElementById(id).value = "");
  atualizarResumoRetiradaPhenomena();
  invalidar("phenomena","estoque","inicio","auditoria");
  alert("Retirada Phenomena registrada e débito gerado.");
  carregarPhenomena(true);
  carregarInicio(true);
}

async function simularBaixaCervejaVirtual(cerveja_nome, q10, q20, q30, q50, estoqueVirtual) {
  let rows = estoqueVirtual.get(cerveja_nome);

  if (!rows) {
    const { data, error } = await sb.from("estoque_cerveja")
      .select("*")
      .eq("cerveja_nome", cerveja_nome)
      .in("origem", ["PRODUCAO","ITAPEMA","PHENOMENA"]);

    if (error) throw error;

    const ordem = ["PRODUCAO","ITAPEMA","PHENOMENA"];
    rows = ordem.map(origem => (data || []).find(r => r.origem === origem) || {
      cerveja_nome,
      origem,
      q10:0, q20:0, q30:0, q50:0,
      litros:0
    });
    estoqueVirtual.set(cerveja_nome, rows);
  }

  const ordem = ["PRODUCAO","ITAPEMA","PHENOMENA"];
  const pedidos = [
    ["q10", q10, 10, "10L"],
    ["q20", q20, 20, "20L"],
    ["q30", q30, 30, "30L"],
    ["q50", q50, 50, "50L"]
  ];

  const baixas = [];
  const faltas = [];

  for (const [campo, qtdPedida, litrosPorBarril, label] of pedidos) {
    let restante = Number(qtdPedida || 0);
    if (restante <= 0) continue;

    for (const origem of ordem) {
      if (restante <= 0) break;
      const u = rows.find(r => r.origem === origem);
      const disponivel = Number(u[campo] || 0);
      const usar = Math.min(disponivel, restante);
      if (usar > 0) {
        u[campo] = disponivel - usar;
        restante -= usar;
        baixas.push({ origem, campo, label, quantidade: usar, litros: usar * litrosPorBarril });
      }
    }

    if (restante > 0) {
      const disponivelTotal = rows.reduce((s,r) => s + Number(r[campo] || 0), 0) + (Number(qtdPedida || 0) - restante);
      faltas.push(`${cerveja_nome} ${label}: solicitado ${qtdPedida}, disponível ${disponivelTotal}, falta ${restante}`);
    }
  }

  if (faltas.length) throw new Error("Estoque insuficiente:\n" + faltas.join("\n"));

  rows.forEach(u => u.litros = litrosBarris(u.q10,u.q20,u.q30,u.q50));
  const resumoPorOrigem = {};
  baixas.forEach(b => resumoPorOrigem[b.origem] = (resumoPorOrigem[b.origem] || 0) + b.litros);

  return { updates: rows, baixas, resumoPorOrigem };
}


async function carregarConfiguracoes(force=false) {
  if (state.loaded.configuracoes && !force) return;
  await carregarConfiguracoesBase(true);

  document.getElementById("configResponsavelPadrao").value = state.configuracoes.responsavel_padrao || "";
  document.getElementById("configMinCervejaPadrao").value = getConfigNumero("minimo_cerveja_padrao_litros", 0);
  document.getElementById("configMinPilsen").value = getConfigNumero("minimo_pilsen_litros", 0);
  document.getElementById("configDiasBarrilCliente").value = getConfigNumero("dias_alerta_barril_cliente", 21);
  document.getElementById("configDiasLoteFermentando").value = getConfigNumero("dias_alerta_lote_fermentando", 10);
  document.getElementById("configDiasValidadeInsumos").value = getConfigNumero("dias_alerta_validade_insumos", 30);
  document.getElementById("configMinMalte").value = getConfigNumero("minimo_padrao_malte", 0);
  document.getElementById("configMinLupulo").value = getConfigNumero("minimo_padrao_lupulo", 0);
  document.getElementById("configMinFermento").value = getConfigNumero("minimo_padrao_fermento", 0);

  state.loaded.configuracoes = true;
}


async function salvarConfiguracoes() {
  mostrarErro("configErro", "");

  const payload = [
    { chave:"responsavel_padrao", valor:document.getElementById("configResponsavelPadrao").value.trim(), atualizado_em:new Date().toISOString() },
    { chave:"minimo_cerveja_padrao_litros", valor:String(Number(document.getElementById("configMinCervejaPadrao").value || 0)), atualizado_em:new Date().toISOString() },
    { chave:"minimo_pilsen_litros", valor:String(Number(document.getElementById("configMinPilsen").value || 0)), atualizado_em:new Date().toISOString() },
    { chave:"dias_alerta_barril_cliente", valor:String(Number(document.getElementById("configDiasBarrilCliente").value || 21)), atualizado_em:new Date().toISOString() },
    { chave:"dias_alerta_lote_fermentando", valor:String(Number(document.getElementById("configDiasLoteFermentando").value || 10)), atualizado_em:new Date().toISOString() },
    { chave:"dias_alerta_validade_insumos", valor:String(Number(document.getElementById("configDiasValidadeInsumos").value || 30)), atualizado_em:new Date().toISOString() },
    { chave:"minimo_padrao_malte", valor:String(Number(document.getElementById("configMinMalte").value || 0)), atualizado_em:new Date().toISOString() },
    { chave:"minimo_padrao_lupulo", valor:String(Number(document.getElementById("configMinLupulo").value || 0)), atualizado_em:new Date().toISOString() },
    { chave:"minimo_padrao_fermento", valor:String(Number(document.getElementById("configMinFermento").value || 0)), atualizado_em:new Date().toISOString() }
  ];

  const { error } = await sb.from("configuracoes").upsert(payload, { onConflict:"chave" });
  if (error) {
    mostrarErro("configErro", error.message);
    return;
  }

  invalidar("configuracoes","configuracoesBase","phenomena","painelDia","saidas");
  await carregarConfiguracoesBase(true);
  alert("Configurações salvas.");
  carregarConfiguracoes(true);
}


function prepararFormRetorno() {
  prepararSelectClientes("retornoCliente");
  prepararSelectCervejas("retornoCerveja");
}

async function salvarRetorno() {
  mostrarErro("retornoErro", "");
  await carregarBaseCadastros();

  const clienteId = document.getElementById("retornoCliente").value;
  const clienteOp = document.getElementById("retornoCliente").options[document.getElementById("retornoCliente").selectedIndex];
  const cliente_nome = clienteOp ? (clienteOp.dataset.nome || clienteOp.textContent) : "";
  const cerveja_nome = document.getElementById("retornoCerveja").value || "";
  const q10 = Number(document.getElementById("retornoQ10").value || 0);
  const q20 = Number(document.getElementById("retornoQ20").value || 0);
  const q30 = Number(document.getElementById("retornoQ30").value || 0);
  const q50 = Number(document.getElementById("retornoQ50").value || 0);
  const codigos_barris = document.getElementById("retornoCodigos").value.trim();
  const responsavel = document.getElementById("retornoResp").value.trim();
  const observacao = document.getElementById("retornoObs").value.trim();

  if (!clienteId || !cliente_nome) {
    mostrarErro("retornoErro", "Selecione o cliente.");
    return;
  }

  if (somaBarris(q10,q20,q30,q50) <= 0) {
    mostrarErro("retornoErro", "Informe pelo menos um barril retornado.");
    return;
  }

  const { error } = await sb.from("retornos").insert({
    cliente_id: clienteId,
    cliente_nome,
    cerveja_nome,
    q10,q20,q30,q50,
    codigos_barris,
    responsavel,
    observacao
  });

  if (error) {
    mostrarErro("retornoErro", error.message);
    return;
  }

  await sb.from("movimentacoes").insert({
    tipo:"RETORNO BARRIL",
    categoria:"BARRIL",
    item_nome: cerveja_nome || "BARRIS",
    quantidade: somaBarris(q10,q20,q30,q50),
    unidade:"UN",
    destino:"FÁBRICA",
    cliente_nome,
    observacao,
    responsavel
  });

  ["retornoQ10","retornoQ20","retornoQ30","retornoQ50"].forEach(id => document.getElementById(id).value = "0");
  ["retornoCodigos","retornoResp","retornoObs"].forEach(id => document.getElementById(id).value = "");
  invalidar("retornos","inicio","painelDia","auditoria");
  alert("Retorno registrado.");
  carregarRetornos(true);
  carregarInicio(true);
}

async function carregarRetornos(force=false) {
  if (state.loaded.retornos && !force) return;

  const [saidas, retornos] = await Promise.all([
    sb.from("saidas").select("*").order("data_saida", { ascending:false }),
    sb.from("retornos").select("*").order("criado_em", { ascending:false })
  ]);

  const saidasRows = saidas.data || [];
  const retornosRows = retornos.data || [];
  state.retornos = retornosRows;

  const totalSaidaBarris = saidasRows.reduce((s,r) => s + somaBarris(r.q10,r.q20,r.q30,r.q50), 0);
  const totalRetornoBarris = retornosRows.reduce((s,r) => s + somaBarris(r.q10,r.q20,r.q30,r.q50), 0);
  const abertos = Math.max(0, totalSaidaBarris - totalRetornoBarris);

  document.getElementById("retornosBarrisAbertos").innerText = abertos;
  document.getElementById("retornosTotalRegistrados").innerText = totalRetornoBarris;

  const porCliente = new Map();

  saidasRows.forEach(s => {
    const atual = porCliente.get(s.cliente_nome) || { cliente:s.cliente_nome, saidas:0, retornos:0 };
    atual.saidas += somaBarris(s.q10,s.q20,s.q30,s.q50);
    porCliente.set(s.cliente_nome, atual);
  });

  retornosRows.forEach(r => {
    const atual = porCliente.get(r.cliente_nome) || { cliente:r.cliente_nome, saidas:0, retornos:0 };
    atual.retornos += somaBarris(r.q10,r.q20,r.q30,r.q50);
    porCliente.set(r.cliente_nome, atual);
  });

  const clientesAbertos = [...porCliente.values()]
    .map(c => ({...c, aberto: Math.max(0, c.saidas - c.retornos)}))
    .filter(c => c.aberto > 0)
    .sort((a,b) => b.aberto - a.aberto || a.cliente.localeCompare(b.cliente,"pt-BR"));

  const boxCli = document.getElementById("barrisPorCliente");
  boxCli.innerHTML = clientesAbertos.length ? "" : '<div class="item"><span class="sub">Nenhum barril em aberto.</span></div>';
  clientesAbertos.forEach(c => {
    boxCli.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div>
          <strong>${escapeHtml(c.cliente)}</strong>
          <div class="sub">Saíram ${c.saidas} • retornaram ${c.retornos}</div>
        </div>
        <span class="badge">${c.aberto} aberto(s)</span>
      </div>
    `);
  });

  const box = document.getElementById("listaRetornos");
  box.innerHTML = retornosRows.length ? "" : '<div class="item"><span class="sub">Nenhum retorno registrado.</span></div>';
  retornosRows.slice(0,30).forEach(r => {
    box.insertAdjacentHTML("beforeend", `
      <div class="item searchable">
        <div>
          <strong>${escapeHtml(r.cliente_nome)}</strong>
          <div class="sub">${escapeHtml(r.cerveja_nome || "Barris")} • ${dataHoraBR(r.criado_em)}</div>
          <div class="sub">10L=${r.q10 || 0} • 20L=${r.q20 || 0} • 30L=${r.q30 || 0} • 50L=${r.q50 || 0}</div>
          <div class="sub">${escapeHtml(r.codigos_barris || "")}</div>
        </div>
        <span class="badge">${somaBarris(r.q10,r.q20,r.q30,r.q50)}</span>
      </div>
    `);
  });

  state.loaded.retornos = true;
}


async function carregarPainelDia(force=false) {
  if (state.loaded.painelDia && !force) return;
  await carregarBaseCadastros(true);
  await carregarProducoesFermentando(true);
  await carregarConfiguracoesBase(true);

  const diasBarrilCliente = getConfigNumero("dias_alerta_barril_cliente", 21);
  const diasLoteFermentando = getConfigNumero("dias_alerta_lote_fermentando", 10);
  const minCervejaPadrao = getConfigNumero("minimo_cerveja_padrao_litros", 0);
  const minPilsen = getConfigNumero("minimo_pilsen_litros", 0);

  const [ec, ei, saidasPainel, retornosPainel, entradasValidade] = await Promise.all([
    sb.from("estoque_cerveja").select("*"),
    sb.from("estoque_insumos").select("*"),
    sb.from("saidas").select("*").order("data_saida", { ascending:true }),
    sb.from("retornos").select("*"),
    sb.from("entradas_insumos").select("*").not("validade","is",null).order("validade", { ascending:true })
  ]);

  const estoquePorCerveja = new Map();
  state.cervejas.forEach(c => estoquePorCerveja.set(c.nome, 0));
  (ec.data || []).forEach(r => estoquePorCerveja.set(r.cerveja_nome, (estoquePorCerveja.get(r.cerveja_nome) || 0) + Number(r.litros || 0)));

  const estoqueInsumo = new Map();
  state.insumos.forEach(i => estoqueInsumo.set(i.tipo+"|"+i.nome, { ...i, quantidade:0 }));
  (ei.data || []).forEach(r => {
    const base = estoqueInsumo.get(r.tipo+"|"+r.nome) || r;
    estoqueInsumo.set(r.tipo+"|"+r.nome, { ...base, quantidade:Number(r.quantidade || 0), unidade:r.unidade });
  });

  function minimoInsumo(i) {
    const proprio = Number(i.estoque_minimo || 0);
    if (proprio > 0) return proprio;
    if (i.tipo === "MALTE") return getConfigNumero("minimo_padrao_malte", 0);
    if (i.tipo === "LUPULO") return getConfigNumero("minimo_padrao_lupulo", 0);
    if (i.tipo === "FERMENTO") return getConfigNumero("minimo_padrao_fermento", 0);
    return 0;
  }

  const itens = [];

  const cervejasZeradas = [...estoquePorCerveja.entries()].filter(([n,q]) => q <= 0).sort((a,b)=>a[0].localeCompare(b[0],"pt-BR"));
  itens.push({ titulo:"🍺 Cervejas zeradas", linhas: cervejasZeradas.map(([n]) => n) });

  const cervejasBaixas = [...estoquePorCerveja.entries()].filter(([n,q]) => {
    const min = String(n).toUpperCase().includes("PILSEN") && minPilsen > 0 ? minPilsen : minCervejaPadrao;
    return min > 0 && Number(q || 0) > 0 && Number(q || 0) <= min;
  }).sort((a,b)=>a[0].localeCompare(b[0],"pt-BR"));

  itens.push({
    titulo:"⚠️ Cervejas abaixo do mínimo",
    linhas: cervejasBaixas.map(([n,q]) => {
      const min = String(n).toUpperCase().includes("PILSEN") && minPilsen > 0 ? minPilsen : minCervejaPadrao;
      return `${n}: ${fmt(q,2)} L / mínimo ${fmt(min,2)} L`;
    })
  });

  const insumosZerados = [...estoqueInsumo.values()].filter(i => Number(i.quantidade || 0) <= 0).sort((a,b)=>a.tipo.localeCompare(b.tipo) || a.nome.localeCompare(b.nome,"pt-BR"));
  itens.push({ titulo:"🌾 Insumos zerados", linhas: insumosZerados.map(i => `${i.tipo} — ${i.nome}`) });

  const insumosBaixos = [...estoqueInsumo.values()].filter(i => {
    const min = minimoInsumo(i);
    return Number(i.quantidade || 0) > 0 && min > 0 && Number(i.quantidade || 0) <= min;
  }).sort((a,b)=>a.tipo.localeCompare(b.tipo) || a.nome.localeCompare(b.nome,"pt-BR"));

  itens.push({
    titulo:"⚠️ Insumos abaixo do mínimo",
    linhas: insumosBaixos.map(i => `${i.tipo} — ${i.nome}: ${fmt(i.quantidade,2)} ${i.unidade} / mínimo ${fmt(minimoInsumo(i),2)}`)
  });

  const lotesAntigos = state.producoesFermentando.filter(p => {
    const dias = Math.max(0, Math.floor((new Date() - new Date(p.data_producao + "T00:00:00")) / 86400000));
    return dias >= diasLoteFermentando;
  });

  itens.push({ titulo:`🧪 Lotes há ${diasLoteFermentando}+ dias em produção`, linhas: lotesAntigos.map(p => {
    const dias = Math.max(0, Math.floor((new Date() - new Date(p.data_producao + "T00:00:00")) / 86400000));
    return `${p.lote} — ${p.cerveja_nome}: ${dias} dia(s)`;
  }) });

  const limiteData = new Date();
  limiteData.setDate(limiteData.getDate() - diasBarrilCliente);
  const retornosPorCliente = new Map();
  (retornosPainel.data || []).forEach(r => {
    retornosPorCliente.set(r.cliente_nome, (retornosPorCliente.get(r.cliente_nome) || 0) + somaBarris(r.q10,r.q20,r.q30,r.q50));
  });

  const antigosPorCliente = new Map();
  (saidasPainel.data || []).forEach(s => {
    const dataSaida = new Date((s.data_saida || "").slice(0,10) + "T00:00:00");
    if (dataSaida <= limiteData) {
      const atual = antigosPorCliente.get(s.cliente_nome) || { cliente:s.cliente_nome, barris:0, dataMaisAntiga:s.data_saida };
      atual.barris += somaBarris(s.q10,s.q20,s.q30,s.q50);
      if (s.data_saida < atual.dataMaisAntiga) atual.dataMaisAntiga = s.data_saida;
      antigosPorCliente.set(s.cliente_nome, atual);
    }
  });

  const alertasBarris = [...antigosPorCliente.values()].map(c => {
    const retornados = retornosPorCliente.get(c.cliente) || 0;
    return { ...c, abertoAproximado: Math.max(0, c.barris - retornados) };
  }).filter(c => c.abertoAproximado > 0);

  itens.push({
    titulo:`🛢️ Barris há ${diasBarrilCliente}+ dias em clientes`,
    linhas: alertasBarris.map(c => `${c.cliente}: ${c.abertoAproximado} barril(is) em aberto aprox. • saída mais antiga ${dataBR(c.dataMaisAntiga)}`)
  });

  const diasValidade = getConfigNumero("dias_alerta_validade_insumos", 30);
  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  const limiteValidade = new Date(hoje);
  limiteValidade.setDate(limiteValidade.getDate() + diasValidade);

  const validadesProximas = (entradasValidade.data || []).filter(e => {
    const d = new Date(String(e.validade) + "T00:00:00");
    return d <= limiteValidade;
  }).slice(0, 20);

  itens.push({
    titulo:`📅 Insumos vencendo em até ${diasValidade} dias`,
    linhas: validadesProximas.map(e => {
      const d = new Date(String(e.validade) + "T00:00:00");
      const dias = Math.ceil((d - hoje) / 86400000);
      const status = dias < 0 ? `vencido há ${Math.abs(dias)} dia(s)` : `vence em ${dias} dia(s)`;
      return `${e.tipo} — ${e.nome}: ${fmt(e.quantidade,2)} ${e.unidade} • validade ${dataBR(e.validade)} • ${status}`;
    })
  });

  const estoquesNegativosCerveja = (ec.data || []).filter(r => Number(r.litros || 0) < 0);
  const estoquesNegativosInsumos = (ei.data || []).filter(r => Number(r.quantidade || 0) < 0);

  itens.push({
    titulo:"🚨 Estoques negativos",
    linhas: [
      ...estoquesNegativosCerveja.map(r => `${r.cerveja_nome} / ${r.origem}: ${fmt(r.litros,2)} L`),
      ...estoquesNegativosInsumos.map(r => `${r.tipo} — ${r.nome}: ${fmt(r.quantidade,2)} ${r.unidade}`)
    ]
  });

  const box = document.getElementById("painelDiaConteudo");
  box.innerHTML = "";
  itens.forEach(sec => {
    box.insertAdjacentHTML("beforeend", `
      <div class="item blocoVertical">
        <strong>${escapeHtml(sec.titulo)}</strong>
        <div class="sub">${sec.linhas.length ? sec.linhas.map(escapeHtml).join("<br>") : "Nada pendente."}</div>
      </div>
    `);
  });

  state.loaded.painelDia = true;
}


function prepararRelatorio() {
  const input = document.getElementById("relatorioMes");
  if (!input.value) {
    const d = new Date();
    input.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }
}

async function carregarRelatorioMensal(force=false) {
  const mes = document.getElementById("relatorioMes").value;
  if (!mes) return;
  const inicio = mes + "-01";
  const dFim = new Date(inicio + "T00:00:00");
  dFim.setMonth(dFim.getMonth() + 1);
  const fim = dFim.toISOString().slice(0,10);

  const [producoes, envases, saidas, insumos, retornos, debitosPhen, pagamentosPhen] = await Promise.all([
    sb.from("producoes").select("*").gte("data_producao", inicio).lt("data_producao", fim),
    sb.from("envases").select("*").gte("data_envase", inicio).lt("data_envase", fim),
    sb.from("saidas").select("*").gte("data_saida", inicio).lt("data_saida", fim),
    sb.from("producao_insumos").select("*").gte("criado_em", inicio).lt("criado_em", fim),
    sb.from("retornos").select("*").gte("data_retorno", inicio).lt("data_retorno", fim),
    sb.from("phenomena_debitos").select("*").gte("criado_em", inicio).lt("criado_em", fim),
    sb.from("phenomena_pagamentos").select("*").gte("criado_em", inicio).lt("criado_em", fim)
  ]);

  const litrosProduzidos = (producoes.data || []).reduce((s,r)=>s+Number(r.litros_produzidos||0),0);
  const litrosEnvasados = (envases.data || []).reduce((s,r)=>s+Number(r.litros_total||0),0);
  const perdas = (envases.data || []).reduce((s,r)=>s+Number(r.perda||0),0);
  const litrosSaidas = (saidas.data || []).reduce((s,r)=>s+Number(r.litros||0),0);
  const barrisRetornados = (retornos.data || []).reduce((s,r)=>s+somaBarris(r.q10,r.q20,r.q30,r.q50),0);
  const valorDebitosPhen = (debitosPhen.data || []).reduce((s,r)=>s+Number(r.valor_total||0),0);
  const valorPagamentosPhen = (pagamentosPhen.data || []).reduce((s,r)=>s+Number(r.valor||0),0);

  const porCerveja = {};
  (saidas.data || []).forEach(s => porCerveja[s.cerveja_nome] = (porCerveja[s.cerveja_nome] || 0) + Number(s.litros || 0));

  const porCliente = {};
  (saidas.data || []).forEach(s => porCliente[s.cliente_nome] = (porCliente[s.cliente_nome] || 0) + Number(s.litros || 0));

  const lotesProduzidos = (producoes.data || [])
    .sort((a,b) => String(a.data_producao).localeCompare(String(b.data_producao)))
    .map(p => `${p.lote} — ${p.cerveja_nome}: ${fmt(p.litros_produzidos)} L (${dataBR(p.data_producao)})`);

  const consumo = {};
  (insumos.data || []).forEach(i => {
    const k = `${i.tipo} — ${i.insumo_nome}`;
    consumo[k] = (consumo[k] || 0) + Number(i.quantidade || 0);
  });

  const box = document.getElementById("relatorioConteudo");
  box.innerHTML = `
    <div class="gridCards">
      <div class="card"><span>Produzido</span><strong>${fmt(litrosProduzidos)} L</strong></div>
      <div class="card"><span>Envasado</span><strong>${fmt(litrosEnvasados)} L</strong></div>
      <div class="card"><span>Perdas</span><strong>${fmt(perdas)} L</strong></div>
      <div class="card"><span>Saídas</span><strong>${fmt(litrosSaidas)} L</strong></div>
      <div class="card"><span>Barris retornados</span><strong>${fmt(barrisRetornados)}</strong></div>
      <div class="card"><span>Débito Phenomena</span><strong>${fmtMoeda(valorDebitosPhen)}</strong></div>
      <div class="card"><span>Pago Phenomena</span><strong>${fmtMoeda(valorPagamentosPhen)}</strong></div>
    </div>
    <div class="item blocoVertical"><strong>Lotes produzidos</strong><div class="sub">${lotesProduzidos.length ? lotesProduzidos.map(escapeHtml).join("<br>") : "Nenhum lote produzido."}</div></div>
    <div class="item blocoVertical"><strong>Saídas por cerveja</strong><div class="sub">${Object.entries(porCerveja).length ? Object.entries(porCerveja).sort((a,b)=>a[0].localeCompare(b[0],"pt-BR")).map(([k,v])=>`${escapeHtml(k)}: ${fmt(v)} L`).join("<br>") : "Sem saídas."}</div></div>
    <div class="item blocoVertical"><strong>Saídas por cliente</strong><div class="sub">${Object.entries(porCliente).length ? Object.entries(porCliente).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${escapeHtml(k)}: ${fmt(v)} L`).join("<br>") : "Sem saídas."}</div></div>
    <div class="item blocoVertical"><strong>Insumos consumidos</strong><div class="sub">${Object.entries(consumo).length ? Object.entries(consumo).sort((a,b)=>a[0].localeCompare(b[0],"pt-BR")).map(([k,v])=>`${escapeHtml(k)}: ${fmt(v,2)}`).join("<br>") : "Sem consumo."}</div></div>
  `;

  state.ultimoRelatorioMensal = {
    mes,
    produzido: litrosProduzidos,
    envasado: litrosEnvasados,
    perdas,
    saidas: litrosSaidas,
    barrisRetornados,
    debitoPhenomena: valorDebitosPhen,
    pagoPhenomena: valorPagamentosPhen,
    porCerveja,
    porCliente,
    consumo,
    lotesProduzidos
  };
}

function exportarRelatorioMensalCsv() {
  if (!state.ultimoRelatorioMensal) {
    alert("Gere o relatório antes de exportar.");
    return;
  }

  const r = state.ultimoRelatorioMensal;
  const linhas = [];
  linhas.push(["ERP Cervejaria - Relatório mensal"]);
  linhas.push(["Mês", r.mes]);
  linhas.push([]);
  linhas.push(["Indicador","Valor"]);
  linhas.push(["Litros produzidos", r.produzido]);
  linhas.push(["Litros envasados", r.envasado]);
  linhas.push(["Perdas", r.perdas]);
  linhas.push(["Saídas", r.saidas]);
  linhas.push(["Barris retornados", r.barrisRetornados]);
  linhas.push(["Débito Phenomena", r.debitoPhenomena]);
  linhas.push(["Pago Phenomena", r.pagoPhenomena]);

  linhas.push([]);
  linhas.push(["Saídas por cerveja"]);
  Object.entries(r.porCerveja).forEach(([k,v]) => linhas.push([k,v]));

  linhas.push([]);
  linhas.push(["Saídas por cliente"]);
  Object.entries(r.porCliente).forEach(([k,v]) => linhas.push([k,v]));

  linhas.push([]);
  linhas.push(["Insumos consumidos"]);
  Object.entries(r.consumo).forEach(([k,v]) => linhas.push([k,v]));

  linhas.push([]);
  linhas.push(["Lotes produzidos"]);
  r.lotesProduzidos.forEach(l => linhas.push([l]));

  const csv = linhas.map(row => row.map(v => `"${String(v ?? "").replaceAll('"','""')}"`).join(";")).join("\n");
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `relatorio-mensal-erp-${r.mes}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function carregarAuditoria(force=false) {
  if (state.loaded.auditoria && !force) return;

  const [movs, ajustes] = await Promise.all([
    sb.from("movimentacoes").select("*").order("criado_em", { ascending:false }).limit(30),
    sb.from("ajustes_estoque").select("*").order("criado_em", { ascending:false }).limit(20)
  ]);

  const mbox = document.getElementById("auditoriaMovimentacoes");
  mbox.innerHTML = (movs.data || []).length ? "" : '<div class="item"><span class="sub">Nenhuma movimentação.</span></div>';
  (movs.data || []).forEach(m => {
    mbox.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div>
          <strong>${escapeHtml(m.tipo)} — ${escapeHtml(m.item_nome || "")}</strong>
          <div class="sub">${dataHoraBR(m.criado_em)} • ${escapeHtml(m.categoria || "")} • ${escapeHtml(m.responsavel || "")}</div>
          <div class="sub">${escapeHtml(m.observacao || "")}</div>
        </div>
        <span class="badge">${fmt(m.quantidade,2)} ${escapeHtml(m.unidade || "")}</span>
      </div>
    `);
  });

  const abox = document.getElementById("auditoriaAjustes");
  abox.innerHTML = (ajustes.data || []).length ? "" : '<div class="item"><span class="sub">Nenhum ajuste.</span></div>';
  (ajustes.data || []).forEach(a => {
    abox.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div>
          <strong>${escapeHtml(a.categoria)} — ${escapeHtml(a.item_nome)}</strong>
          <div class="sub">${dataHoraBR(a.criado_em)} • ${escapeHtml(a.tipo_ou_origem || "")} • ${escapeHtml(a.responsavel || "")}</div>
          <div class="sub">${escapeHtml(a.motivo || "")}</div>
        </div>
        <span class="badge">${fmt(a.diferenca,2)}</span>
      </div>
    `);
  });

  state.loaded.auditoria = true;
}

async function gerarBackupJson() {
  const status = document.getElementById("backupStatus");
  status.innerText = "Gerando backup...";

  const tabelas = [
    "cervejas","insumos","clientes","estoque_cerveja","estoque_insumos",
    "producoes","producao_insumos","dry_hopping","envases","saidas","retornos",
    "entradas_insumos","ajustes_estoque","fermento_reuso","fermento_historico",
    "phenomena_entradas","phenomena_debitos","phenomena_pagamentos","movimentacoes","configuracoes","backups"
  ];

  const backup = {
    gerado_em: new Date().toISOString(),
    projeto: "ERP Cervejaria sistema",
    tabelas: {}
  };

  for (const tabela of tabelas) {
    const { data, error } = await sb.from(tabela).select("*");
    if (error) {
      backup.tabelas[tabela] = { erro: error.message };
    } else {
      backup.tabelas[tabela] = data || [];
    }
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const nome = "backup-erp-cervejaria-" + new Date().toISOString().slice(0,10) + ".json";
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);

  await sb.from("backups").insert({ descricao: "Backup JSON local gerado: " + nome });

  status.innerText = "Backup gerado: " + nome;
}


function prepararFormAjusteCerveja() {
  prepararSelectCervejas("ajusteCerveja");
}

function prepararFormAjusteInsumo() {
  popularAjusteInsumos();
}

function popularAjusteInsumos() {
  const tipo = document.getElementById("ajusteInsumoTipo").value;
  const sel = document.getElementById("ajusteInsumoNome");
  sel.innerHTML = '<option value="">Selecionar insumo...</option>';
  state.insumos.filter(i => i.tipo === tipo).forEach(i => {
    const op = document.createElement("option");
    op.value = i.nome;
    op.textContent = `${i.nome} (${i.unidade})`;
    op.dataset.unidade = i.unidade;
    sel.appendChild(op);
  });
}

async function salvarAjusteCerveja() {
  mostrarErro("ajusteCervejaErro", "");
  const cerveja_nome = document.getElementById("ajusteCerveja").value;
  const origem = document.getElementById("ajusteCervejaOrigem").value;
  const q10 = Number(document.getElementById("ajusteCervQ10").value || 0);
  const q20 = Number(document.getElementById("ajusteCervQ20").value || 0);
  const q30 = Number(document.getElementById("ajusteCervQ30").value || 0);
  const q50 = Number(document.getElementById("ajusteCervQ50").value || 0);
  const motivo = document.getElementById("ajusteCervejaMotivo").value.trim();
  const responsavel = document.getElementById("ajusteCervejaResp").value.trim();

  if (!cerveja_nome) {
    mostrarErro("ajusteCervejaErro", "Selecione a cerveja.");
    return;
  }

  const { data: rows, error: buscaErro } = await sb.from("estoque_cerveja")
    .select("*")
    .eq("cerveja_nome", cerveja_nome)
    .eq("origem", origem)
    .limit(1);

  if (buscaErro) {
    mostrarErro("ajusteCervejaErro", buscaErro.message);
    return;
  }

  const atual = rows && rows[0] ? rows[0] : null;
  const litrosAnterior = Number(atual?.litros || 0);
  const litrosNovo = litrosBarris(q10,q20,q30,q50);
  const cerveja = state.cervejas.find(c => c.nome === cerveja_nome);

  const { error } = await sb.from("estoque_cerveja").upsert({
    cerveja_id: cerveja ? cerveja.id : null,
    cerveja_nome,
    origem,
    q10, q20, q30, q50,
    litros: litrosNovo,
    atualizado_em: new Date().toISOString()
  }, { onConflict:"cerveja_nome,origem" });

  if (error) {
    mostrarErro("ajusteCervejaErro", error.message);
    return;
  }

  await sb.from("ajustes_estoque").insert({
    categoria:"CERVEJA",
    item_nome: cerveja_nome,
    tipo_ou_origem: origem,
    quantidade_anterior: litrosAnterior,
    quantidade_nova: litrosNovo,
    diferenca: litrosNovo - litrosAnterior,
    motivo,
    responsavel
  });

  await sb.from("movimentacoes").insert({
    tipo:"AJUSTE ESTOQUE",
    categoria:"CERVEJA",
    item_nome: cerveja_nome,
    quantidade: litrosNovo - litrosAnterior,
    unidade:"L",
    origem,
    observacao: motivo,
    responsavel
  });

  ["ajusteCervQ10","ajusteCervQ20","ajusteCervQ30","ajusteCervQ50"].forEach(id => document.getElementById(id).value = "0");
  ["ajusteCervejaMotivo","ajusteCervejaResp"].forEach(id => document.getElementById(id).value = "");
  invalidar("estoque","inicio");
  alert("Ajuste de cerveja salvo.");
  carregarEstoque(true);
  carregarInicio(true);
}

async function salvarAjusteInsumo() {
  mostrarErro("ajusteInsumoErro", "");
  const tipo = document.getElementById("ajusteInsumoTipo").value;
  const nome = document.getElementById("ajusteInsumoNome").value;
  const quantidadeNova = Number(document.getElementById("ajusteInsumoQtd").value || 0);
  const motivo = document.getElementById("ajusteInsumoMotivo").value.trim();
  const responsavel = document.getElementById("ajusteInsumoResp").value.trim();

  if (!nome) {
    mostrarErro("ajusteInsumoErro", "Selecione o insumo.");
    return;
  }

  const insumo = state.insumos.find(i => i.tipo === tipo && i.nome === nome);
  const unidade = insumo ? insumo.unidade : unidadePadrao(tipo);

  const { data: rows, error: buscaErro } = await sb.from("estoque_insumos")
    .select("*")
    .eq("tipo", tipo)
    .eq("nome", nome)
    .limit(1);

  if (buscaErro) {
    mostrarErro("ajusteInsumoErro", buscaErro.message);
    return;
  }

  const atual = rows && rows[0] ? rows[0] : null;
  const quantidadeAnterior = Number(atual?.quantidade || 0);

  const { error } = await sb.from("estoque_insumos").upsert({
    insumo_id: insumo ? insumo.id : null,
    tipo,
    nome,
    unidade,
    quantidade: quantidadeNova,
    atualizado_em: new Date().toISOString()
  }, { onConflict:"tipo,nome" });

  if (error) {
    mostrarErro("ajusteInsumoErro", error.message);
    return;
  }

  await sb.from("ajustes_estoque").insert({
    categoria:"INSUMO",
    item_nome: nome,
    tipo_ou_origem: tipo,
    quantidade_anterior: quantidadeAnterior,
    quantidade_nova: quantidadeNova,
    diferenca: quantidadeNova - quantidadeAnterior,
    motivo,
    responsavel
  });

  await sb.from("movimentacoes").insert({
    tipo:"AJUSTE ESTOQUE",
    categoria:"INSUMO",
    item_nome: nome,
    quantidade: quantidadeNova - quantidadeAnterior,
    unidade,
    observacao: motivo,
    responsavel
  });

  ["ajusteInsumoQtd","ajusteInsumoMotivo","ajusteInsumoResp"].forEach(id => document.getElementById(id).value = "");
  invalidar("estoque","inicio");
  alert("Ajuste de insumo salvo.");
  carregarEstoque(true);
  carregarInicio(true);
}

async function prepararFormSaida() {
  await carregarBaseCadastros();
  await carregarConfiguracoesBase();
  prepararSelectClientes("saidaCliente");
  document.getElementById("saidaItens").innerHTML = "";
  adicionarItemSaida();

  const resp = document.getElementById("saidaResponsavel");
  if (resp && !resp.value && state.configuracoes.responsavel_padrao) {
    resp.value = state.configuracoes.responsavel_padrao;
  }
}


function prepararSelectClientes(id) {
  const sel = document.getElementById(id);
  sel.innerHTML = '<option value="">Selecionar cliente...</option>';
  state.clientes.forEach(c => {
    const op = document.createElement("option");
    op.value = c.id;
    op.textContent = c.estabelecimento ? `${c.nome} — ${c.estabelecimento}` : c.nome;
    op.dataset.nome = c.nome;
    sel.appendChild(op);
  });
}

function adicionarItemSaida() {
  const container = document.getElementById("saidaItens");
  const idx = container.querySelectorAll(".saidaItem").length + 1;

  const div = document.createElement("div");
  div.className = "saidaItem";
  div.innerHTML = `
    <div class="saidaItemHeader">
      <strong>Item ${idx}</strong>
      <button type="button" class="smallDanger" onclick="this.closest('.saidaItem').remove()">Remover</button>
    </div>

    <label>Cerveja</label>
    <select class="saidaItemCerveja"></select>

    <div class="linha2">
      <div><label>Barris 10L</label><input class="saidaItemQ10" type="number" min="0" value="0"></div>
      <div><label>Barris 20L</label><input class="saidaItemQ20" type="number" min="0" value="0"></div>
    </div>
    <div class="linha2">
      <div><label>Barris 30L</label><input class="saidaItemQ30" type="number" min="0" value="0"></div>
      <div><label>Barris 50L</label><input class="saidaItemQ50" type="number" min="0" value="0"></div>
    </div>

    <label>Códigos dos barris</label>
    <input class="saidaItemCodigos" placeholder="Ex: BR30-01, BR50-03 ou SEM ETIQUETA">
  `;

  container.appendChild(div);

  const sel = div.querySelector(".saidaItemCerveja");
  sel.innerHTML = '<option value="">Selecionar cerveja...</option>';
  state.cervejas.forEach(c => {
    const op = document.createElement("option");
    op.value = c.nome;
    op.textContent = c.nome;
    sel.appendChild(op);
  });
}

function coletarItensSaida() {
  const itens = [];
  document.querySelectorAll("#saidaItens .saidaItem").forEach(div => {
    const cerveja_nome = div.querySelector(".saidaItemCerveja").value;
    const q10 = Number(div.querySelector(".saidaItemQ10").value || 0);
    const q20 = Number(div.querySelector(".saidaItemQ20").value || 0);
    const q30 = Number(div.querySelector(".saidaItemQ30").value || 0);
    const q50 = Number(div.querySelector(".saidaItemQ50").value || 0);
    const codigos = div.querySelector(".saidaItemCodigos").value.trim();

    if (cerveja_nome && somaBarris(q10,q20,q30,q50) > 0) {
      itens.push({ cerveja_nome, q10, q20, q30, q50, codigos_barris: codigos });
    }
  });
  return itens;
}

async function simularBaixaCerveja(cerveja_nome, q10, q20, q30, q50) {
  const { data, error } = await sb.from("estoque_cerveja")
    .select("*")
    .eq("cerveja_nome", cerveja_nome)
    .in("origem", ["PRODUCAO","ITAPEMA","PHENOMENA"]);

  if (error) throw error;

  const ordem = ["PRODUCAO","ITAPEMA","PHENOMENA"];
  const rows = ordem.map(origem => (data || []).find(r => r.origem === origem) || {
    cerveja_nome,
    origem,
    q10:0, q20:0, q30:0, q50:0,
    litros:0
  });

  const pedidos = [
    ["q10", q10, 10, "10L"],
    ["q20", q20, 20, "20L"],
    ["q30", q30, 30, "30L"],
    ["q50", q50, 50, "50L"]
  ];

  const updates = new Map();
  const baixas = [];
  const faltas = [];

  rows.forEach(r => updates.set(r.origem, { ...r }));

  for (const [campo, qtdPedida, litrosPorBarril, label] of pedidos) {
    let restante = Number(qtdPedida || 0);
    if (restante <= 0) continue;

    for (const origem of ordem) {
      if (restante <= 0) break;
      const u = updates.get(origem);
      const disponivel = Number(u[campo] || 0);
      const usar = Math.min(disponivel, restante);
      if (usar > 0) {
        u[campo] = disponivel - usar;
        restante -= usar;

        baixas.push({
          origem,
          campo,
          label,
          quantidade: usar,
          litros: usar * litrosPorBarril
        });
      }
    }

    if (restante > 0) {
      const disponivelTotal = rows.reduce((s,r) => s + Number(r[campo] || 0), 0);
      faltas.push(`${cerveja_nome} ${label}: solicitado ${qtdPedida}, disponível ${disponivelTotal}, falta ${restante}`);
    }
  }

  if (faltas.length) {
    throw new Error("Estoque insuficiente:\n" + faltas.join("\n"));
  }

  const updatesArr = [...updates.values()].map(u => ({
    ...u,
    litros: litrosBarris(u.q10,u.q20,u.q30,u.q50),
    atualizado_em: new Date().toISOString()
  }));

  const resumoPorOrigem = {};
  baixas.forEach(b => resumoPorOrigem[b.origem] = (resumoPorOrigem[b.origem] || 0) + b.litros);

  return { updates: updatesArr, baixas, resumoPorOrigem };
}

async function salvarSaidaMultipla() {
  mostrarErro("saidaErro", "");
  await carregarBaseCadastros();

  const clienteId = document.getElementById("saidaCliente").value;
  const clienteOp = document.getElementById("saidaCliente").options[document.getElementById("saidaCliente").selectedIndex];
  const cliente_nome = clienteOp ? (clienteOp.dataset.nome || clienteOp.textContent) : "";
  const responsavel = document.getElementById("saidaResponsavel").value.trim();
  const observacao = document.getElementById("saidaObs").value.trim();
  const itens = coletarItensSaida();

  if (!clienteId || !cliente_nome) {
    mostrarErro("saidaErro", "Selecione o cliente.");
    return;
  }

  if (!itens.length) {
    mostrarErro("saidaErro", "Adicione pelo menos uma cerveja com quantidade.");
    return;
  }

  const simulacoes = [];
  const estoqueVirtual = new Map();
  try {
    for (const item of itens) {
      const sim = await simularBaixaCervejaVirtual(item.cerveja_nome, item.q10, item.q20, item.q30, item.q50, estoqueVirtual);
      simulacoes.push({ item, sim });
    }
  } catch(e) {
    mostrarErro("saidaErro", e.message);
    return;
  }

  let resumo = `Cliente: ${cliente_nome}\n\n`;
  simulacoes.forEach(({ item, sim }) => {
    resumo += `${item.cerveja_nome} — ${fmt(litrosBarris(item.q10,item.q20,item.q30,item.q50))} L\n`;
    resumo += `Barris: 10L=${item.q10}, 20L=${item.q20}, 30L=${item.q30}, 50L=${item.q50}\n`;
    resumo += `Baixa automática: ${Object.entries(sim.resumoPorOrigem).map(([o,l]) => `${o}: ${fmt(l)}L`).join(" • ")}\n`;
    if (item.codigos_barris) resumo += `Códigos: ${item.codigos_barris}\n`;
    resumo += "\n";
  });
  resumo += "Confirmar saída?";

  if (!confirm(resumo)) return;

  const grupo_saida = novoUUID();

  try {
    for (const { item, sim } of simulacoes) {
      for (const u of sim.updates) {
        const cerveja = state.cervejas.find(c => c.nome === item.cerveja_nome);
        await sb.from("estoque_cerveja").upsert({
          cerveja_id: cerveja ? cerveja.id : null,
          cerveja_nome: item.cerveja_nome,
          origem: u.origem,
          q10: Number(u.q10 || 0),
          q20: Number(u.q20 || 0),
          q30: Number(u.q30 || 0),
          q50: Number(u.q50 || 0),
          litros: Number(u.litros || 0),
          atualizado_em: new Date().toISOString()
        }, { onConflict:"cerveja_nome,origem" });
      }

      const litros = litrosBarris(item.q10,item.q20,item.q30,item.q50);
      const origem_baixada = Object.entries(sim.resumoPorOrigem).map(([o,l]) => `${o}: ${fmt(l)}L`).join(" | ");
      const cerveja = state.cervejas.find(c => c.nome === item.cerveja_nome);

      const { error: saidaErro } = await sb.from("saidas").insert({
        grupo_saida,
        cliente_id: clienteId,
        cliente_nome,
        cerveja_id: cerveja ? cerveja.id : null,
        cerveja_nome: item.cerveja_nome,
        q10:item.q10,
        q20:item.q20,
        q30:item.q30,
        q50:item.q50,
        litros,
        codigos_barris: item.codigos_barris,
        origem_baixada,
        responsavel,
        observacao
      });

      if (saidaErro) throw saidaErro;

      await sb.from("movimentacoes").insert({
        tipo:"SAIDA ESTOQUE",
        categoria:"CERVEJA",
        item_nome: item.cerveja_nome,
        quantidade: -Math.abs(litros),
        unidade:"L",
        destino: cliente_nome,
        cliente_nome,
        observacao: `${origem_baixada}${observacao ? " — " + observacao : ""}`,
        responsavel
      });
    }
  } catch(e) {
    mostrarErro("saidaErro", "Erro ao salvar saída: " + e.message);
    return;
  }

  document.getElementById("saidaResponsavel").value = "";
  document.getElementById("saidaObs").value = "";
  document.getElementById("saidaItens").innerHTML = "";
  adicionarItemSaida();
  invalidar("saidas","estoque","inicio");
  alert("Saída registrada com baixa automática do estoque.");
  carregarSaidas(true);
  carregarInicio(true);
}


function filtrarLista(containerId, texto) {
  const q = String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  document.querySelectorAll(`#${containerId} .searchable`).forEach(el => {
    const hay = el.innerText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    el.setAttribute("hidden-by-filter", q && !hay.includes(q) ? "true" : "false");
  });
}

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function dataHoraBR(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" });
}

function dataBR(v) {
  if (!v) return "-";
  const [a,m,d] = String(v).split("-");
  return `${d}/${m}/${a}`;
}



/* ==========================================================
   UPDATES: SAÍDAS, RETORNOS, CLIENTES E PHENOMENA
   ========================================================== */

function csvEscape(v) {
  return `"${String(v ?? "").replaceAll('"','""')}"`;
}

function baixarCsvErp(nome, linhas) {
  const csv = linhas.map(row => row.map(csvEscape).join(";")).join("\n");
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

function dataParaOrdenacao(v) {
  if (!v) return 0;
  const d = new Date(String(v).includes("T") ? v : String(v) + "T00:00:00");
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function dataInputFimParaIso(data) {
  if (!data) return null;
  const d = new Date(data + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

function getPeriodoInputs(prefixo) {
  const de = document.getElementById(prefixo + "De")?.value || "";
  const ate = document.getElementById(prefixo + "Ate")?.value || "";
  return { de, ate, ateIso: dataInputFimParaIso(ate) };
}

function agruparSaidas(rows) {
  const mapa = new Map();
  (rows || []).forEach(s => {
    const key = s.grupo_saida || s.id;
    if (!mapa.has(key)) {
      mapa.set(key, {
        grupo_saida:key,
        cliente_id:s.cliente_id,
        cliente_nome:s.cliente_nome,
        data_saida:s.data_saida,
        criado_em:s.criado_em,
        responsavel:s.responsavel || "",
        observacao:s.observacao || "",
        itens:[],
        litros:0,
        q10:0,q20:0,q30:0,q50:0,
        codigos:[],
        origem:[]
      });
    }

    const g = mapa.get(key);
    g.itens.push(s);
    g.litros += Number(s.litros || 0);
    g.q10 += Number(s.q10 || 0);
    g.q20 += Number(s.q20 || 0);
    g.q30 += Number(s.q30 || 0);
    g.q50 += Number(s.q50 || 0);
    if (s.codigos_barris) g.codigos.push(s.codigos_barris);
    if (s.origem_baixada) g.origem.push(`${s.cerveja_nome}: ${s.origem_baixada}`);
    if (dataParaOrdenacao(s.criado_em) > dataParaOrdenacao(g.criado_em)) g.criado_em = s.criado_em;
  });

  return [...mapa.values()].sort((a,b) => dataParaOrdenacao(b.criado_em || b.data_saida) - dataParaOrdenacao(a.criado_em || a.data_saida));
}

async function carregarSaidas(force=false) {
  if (state.loaded.saidas && !force) return;

  const { data, error } = await sb.from("saidas")
    .select("*")
    .order("criado_em", { ascending:false })
    .limit(350);

  const box = document.getElementById("listaSaidas");
  const resumoBox = document.getElementById("saidasResumo");

  if (error) {
    if (box) box.innerHTML = '<div class="item">Erro ao carregar saídas.</div>';
    return;
  }

  const rows = data || [];
  const grupos = agruparSaidas(rows);
  state.saidasAgrupadas = grupos;
  state.saidasRows = rows;

  const litros = rows.reduce((s,r) => s + Number(r.litros || 0), 0);
  const barris = rows.reduce((s,r) => s + somaBarris(r.q10,r.q20,r.q30,r.q50), 0);
  const clientes = new Set(rows.map(r => r.cliente_nome).filter(Boolean)).size;

  if (resumoBox) {
    resumoBox.innerHTML = `
      <div class="card"><span>Fichas de saída</span><strong>${grupos.length}</strong></div>
      <div class="card"><span>Litros enviados</span><strong>${fmt(litros)} L</strong></div>
      <div class="card"><span>Barris enviados</span><strong>${barris}</strong></div>
      <div class="card"><span>Clientes atendidos</span><strong>${clientes}</strong></div>
    `;
  }

  if (!box) return;
  box.innerHTML = grupos.length ? "" : '<div class="item"><span class="sub">Nenhuma saída registrada.</span></div>';

  grupos.forEach(g => {
    const itensHtml = g.itens.map(i =>
      `${escapeHtml(i.cerveja_nome)}: ${fmt(i.litros)} L • 10L=${i.q10||0} • 20L=${i.q20||0} • 30L=${i.q30||0} • 50L=${i.q50||0}`
    ).join("<br>");

    const origemHtml = g.origem.length ? `<div class="sub">Baixa: ${escapeHtml(g.origem.join(" | "))}</div>` : "";
    const codigosHtml = g.codigos.length ? `<div class="sub">Códigos: ${escapeHtml(g.codigos.join(" | "))}</div>` : "";

    box.insertAdjacentHTML("beforeend", `
      <div class="item searchable itemDestaque">
        <div>
          <strong>${escapeHtml(g.cliente_nome)}</strong>
          <div class="sub">${dataBR(g.data_saida)} • ${g.itens.length} item(ns) • ${escapeHtml(g.responsavel || "")}</div>
          <div class="miniSection"><strong>Itens enviados</strong><div class="sub">${itensHtml}</div></div>
          ${origemHtml}
          ${codigosHtml}
          <div class="sub">${escapeHtml(g.observacao || "")}</div>
        </div>
        <span class="badge">${fmt(g.litros)} L</span>
      </div>
    `);
  });

  state.loaded.saidas = true;
}

function exportarSaidasCsv() {
  const rows = state.saidasRows || [];
  if (!rows.length) {
    alert("Carregue as saídas antes de exportar.");
    return;
  }

  const linhas = [
    ["Data","Grupo","Cliente","Cerveja","10L","20L","30L","50L","Litros","Origem baixada","Códigos","Responsável","Observação"]
  ];

  rows.forEach(s => linhas.push([
    s.data_saida,
    s.grupo_saida || s.id,
    s.cliente_nome,
    s.cerveja_nome,
    s.q10 || 0,
    s.q20 || 0,
    s.q30 || 0,
    s.q50 || 0,
    s.litros || 0,
    s.origem_baixada || "",
    s.codigos_barris || "",
    s.responsavel || "",
    s.observacao || ""
  ]));

  baixarCsvErp("saidas-erp-cervejaria.csv", linhas);
}

function calcularAbertoDetalhado(saidasRows, retornosRows, clienteId="", clienteNome="") {
  const filtroSaida = (s) => clienteId ? s.cliente_id === clienteId : s.cliente_nome === clienteNome;
  const filtroRetorno = (r) => clienteId ? r.cliente_id === clienteId : r.cliente_nome === clienteNome;

  const saidas = (saidasRows || []).filter(filtroSaida);
  const retornos = (retornosRows || []).filter(filtroRetorno);

  const out = {
    q10: Math.max(0, saidas.reduce((s,r)=>s+Number(r.q10||0),0) - retornos.reduce((s,r)=>s+Number(r.q10||0),0)),
    q20: Math.max(0, saidas.reduce((s,r)=>s+Number(r.q20||0),0) - retornos.reduce((s,r)=>s+Number(r.q20||0),0)),
    q30: Math.max(0, saidas.reduce((s,r)=>s+Number(r.q30||0),0) - retornos.reduce((s,r)=>s+Number(r.q30||0),0)),
    q50: Math.max(0, saidas.reduce((s,r)=>s+Number(r.q50||0),0) - retornos.reduce((s,r)=>s+Number(r.q50||0),0)),
    litrosSaidos: saidas.reduce((s,r)=>s+Number(r.litros||0),0),
    barrisSaidos: saidas.reduce((s,r)=>s+somaBarris(r.q10,r.q20,r.q30,r.q50),0),
    barrisRetornados: retornos.reduce((s,r)=>s+somaBarris(r.q10,r.q20,r.q30,r.q50),0)
  };
  out.aberto = Math.max(0, out.q10 + out.q20 + out.q30 + out.q50);
  return out;
}

function agruparAbertosPorCliente(saidasRows, retornosRows) {
  const mapa = new Map();

  (saidasRows || []).forEach(s => {
    const key = s.cliente_id || s.cliente_nome;
    if (!mapa.has(key)) mapa.set(key, { cliente_id:s.cliente_id, cliente:s.cliente_nome, q10:0,q20:0,q30:0,q50:0, saidas:0, retornos:0, litros:0, dataMaisAntiga:s.data_saida });
    const c = mapa.get(key);
    c.q10 += Number(s.q10 || 0);
    c.q20 += Number(s.q20 || 0);
    c.q30 += Number(s.q30 || 0);
    c.q50 += Number(s.q50 || 0);
    c.saidas += somaBarris(s.q10,s.q20,s.q30,s.q50);
    c.litros += Number(s.litros || 0);
    if (s.data_saida && (!c.dataMaisAntiga || s.data_saida < c.dataMaisAntiga)) c.dataMaisAntiga = s.data_saida;
  });

  (retornosRows || []).forEach(r => {
    const key = r.cliente_id || r.cliente_nome;
    if (!mapa.has(key)) mapa.set(key, { cliente_id:r.cliente_id, cliente:r.cliente_nome, q10:0,q20:0,q30:0,q50:0, saidas:0, retornos:0, litros:0, dataMaisAntiga:null });
    const c = mapa.get(key);
    c.q10 -= Number(r.q10 || 0);
    c.q20 -= Number(r.q20 || 0);
    c.q30 -= Number(r.q30 || 0);
    c.q50 -= Number(r.q50 || 0);
    c.retornos += somaBarris(r.q10,r.q20,r.q30,r.q50);
  });

  return [...mapa.values()].map(c => ({
    ...c,
    q10: Math.max(0,c.q10),
    q20: Math.max(0,c.q20),
    q30: Math.max(0,c.q30),
    q50: Math.max(0,c.q50),
    aberto: Math.max(0,c.q10) + Math.max(0,c.q20) + Math.max(0,c.q30) + Math.max(0,c.q50)
  })).filter(c => c.aberto > 0).sort((a,b) => b.aberto - a.aberto);
}

async function prepararFormRetorno() {
  await carregarBaseCadastros();
  prepararSelectClientes("retornoCliente");
  prepararSelectCervejas("retornoCerveja");

  const sel = document.getElementById("retornoCliente");
  if (sel) sel.onchange = atualizarResumoRetornoCliente;

  atualizarResumoRetornoCliente();
}

async function atualizarResumoRetornoCliente() {
  const sel = document.getElementById("retornoCliente");
  const box = document.getElementById("retornoResumoCliente");
  if (!sel || !box || !sel.value) {
    if (box) box.innerText = "Selecione um cliente para ver os barris em aberto.";
    return;
  }

  const op = sel.options[sel.selectedIndex];
  const clienteId = sel.value;
  const clienteNome = op ? (op.dataset.nome || op.textContent) : "";

  const [saidas, retornos] = await Promise.all([
    sb.from("saidas").select("*").eq("cliente_id", clienteId),
    sb.from("retornos").select("*").eq("cliente_id", clienteId)
  ]);

  const aberto = calcularAbertoDetalhado(saidas.data || [], retornos.data || [], clienteId, clienteNome);
  box.innerText = `Em aberto: ${aberto.aberto} barril(is) • 10L=${aberto.q10} • 20L=${aberto.q20} • 30L=${aberto.q30} • 50L=${aberto.q50}`;
  state.retornoAbertoAtual = aberto;
}

function preencherRetornoAberto() {
  const aberto = state.retornoAbertoAtual;
  if (!aberto) {
    alert("Selecione um cliente primeiro.");
    return;
  }
  document.getElementById("retornoQ10").value = aberto.q10 || 0;
  document.getElementById("retornoQ20").value = aberto.q20 || 0;
  document.getElementById("retornoQ30").value = aberto.q30 || 0;
  document.getElementById("retornoQ50").value = aberto.q50 || 0;
}

async function abrirRetornoCliente(clienteId, clienteNome) {
  mostrarTela("retornos");
  document.querySelectorAll(".formBox").forEach(f => f.style.display = "none");
  const form = document.getElementById("formRetorno");
  if (form) form.style.display = "block";
  await prepararFormRetorno();
  const sel = document.getElementById("retornoCliente");
  if (sel) {
    sel.value = clienteId || "";
    if (!sel.value && clienteNome) {
      [...sel.options].forEach(op => {
        if ((op.dataset.nome || op.textContent) === clienteNome) sel.value = op.value;
      });
    }
  }
  await atualizarResumoRetornoCliente();
  window.scrollTo({ top:0, behavior:"smooth" });
}

async function salvarRetorno() {
  mostrarErro("retornoErro", "");
  await carregarBaseCadastros();

  const clienteId = document.getElementById("retornoCliente").value;
  const clienteOp = document.getElementById("retornoCliente").options[document.getElementById("retornoCliente").selectedIndex];
  const cliente_nome = clienteOp ? (clienteOp.dataset.nome || clienteOp.textContent) : "";
  const cerveja_nome = document.getElementById("retornoCerveja").value || "";
  const q10 = Number(document.getElementById("retornoQ10").value || 0);
  const q20 = Number(document.getElementById("retornoQ20").value || 0);
  const q30 = Number(document.getElementById("retornoQ30").value || 0);
  const q50 = Number(document.getElementById("retornoQ50").value || 0);
  const codigos_barris = document.getElementById("retornoCodigos").value.trim();
  const responsavel = document.getElementById("retornoResp").value.trim();
  const observacao = document.getElementById("retornoObs").value.trim();

  if (!clienteId || !cliente_nome) {
    mostrarErro("retornoErro", "Selecione o cliente.");
    return;
  }

  const total = somaBarris(q10,q20,q30,q50);
  if (total <= 0) {
    mostrarErro("retornoErro", "Informe pelo menos um barril retornado.");
    return;
  }

  const [saidasBusca, retornosBusca] = await Promise.all([
    sb.from("saidas").select("*").eq("cliente_id", clienteId),
    sb.from("retornos").select("*").eq("cliente_id", clienteId)
  ]);

  const aberto = calcularAbertoDetalhado(saidasBusca.data || [], retornosBusca.data || [], clienteId, cliente_nome);
  if (aberto.aberto > 0 && total > aberto.aberto) {
    const ok = confirm(`Este retorno tem ${total} barril(is), mas o cliente aparece com ${aberto.aberto} em aberto. Deseja registrar mesmo assim?`);
    if (!ok) return;
  }

  const { error } = await sb.from("retornos").insert({
    cliente_id: clienteId,
    cliente_nome,
    cerveja_nome,
    q10,q20,q30,q50,
    codigos_barris,
    responsavel,
    observacao
  });

  if (error) {
    mostrarErro("retornoErro", error.message);
    return;
  }

  await sb.from("movimentacoes").insert({
    tipo:"RETORNO BARRIL",
    categoria:"BARRIL",
    item_nome: cerveja_nome || "Barris retornados",
    quantidade: total,
    unidade:"UN",
    cliente_nome,
    observacao,
    responsavel
  });

  ["retornoQ10","retornoQ20","retornoQ30","retornoQ50"].forEach(id => document.getElementById(id).value = 0);
  ["retornoCodigos","retornoResp","retornoObs"].forEach(id => document.getElementById(id).value = "");
  invalidar("retornos","inicio","painelDia","auditoria","clientes");
  alert("Retorno registrado.");
  carregarRetornos(true);
}

async function carregarRetornos(force=false) {
  if (state.loaded.retornos && !force) return;

  const [saidas, retornos] = await Promise.all([
    sb.from("saidas").select("*").order("data_saida", { ascending:true }).limit(1000),
    sb.from("retornos").select("*").order("criado_em", { ascending:false }).limit(1000)
  ]);

  const saidaRows = saidas.data || [];
  const retornosRows = retornos.data || [];
  state.retornos = retornosRows;
  state.retornosSaidasBase = saidaRows;

  const totalSaidaBarris = saidaRows.reduce((s,r) => s + somaBarris(r.q10,r.q20,r.q30,r.q50), 0);
  const totalRetornoBarris = retornosRows.reduce((s,r) => s + somaBarris(r.q10,r.q20,r.q30,r.q50), 0);
  const abertos = Math.max(0, totalSaidaBarris - totalRetornoBarris);
  const porCliente = agruparAbertosPorCliente(saidaRows, retornosRows);

  const limite = new Date();
  limite.setDate(limite.getDate() - getConfigNumero("dias_alerta_barril_cliente", 21));
  const saidasAntigas = saidaRows.filter(s => new Date(String(s.data_saida) + "T00:00:00") <= limite);
  const barrisAntigosAprox = Math.max(0, saidasAntigas.reduce((s,r)=>s+somaBarris(r.q10,r.q20,r.q30,r.q50),0) - totalRetornoBarris);

  if (document.getElementById("retornosBarrisAbertos")) document.getElementById("retornosBarrisAbertos").innerText = abertos;
  if (document.getElementById("retornosTotalRegistrados")) document.getElementById("retornosTotalRegistrados").innerText = totalRetornoBarris;
  if (document.getElementById("retornosClientesAbertos")) document.getElementById("retornosClientesAbertos").innerText = porCliente.length;
  if (document.getElementById("retornosBarrisAntigos")) document.getElementById("retornosBarrisAntigos").innerText = barrisAntigosAprox;

  const box = document.getElementById("barrisPorCliente");
  if (box) {
    box.innerHTML = porCliente.length ? "" : '<div class="item"><span class="sub">Nenhum barril em aberto.</span></div>';
    porCliente.forEach(c => {
      const dias = c.dataMaisAntiga ? Math.max(0, Math.floor((new Date() - new Date(c.dataMaisAntiga + "T00:00:00")) / 86400000)) : 0;
      box.insertAdjacentHTML("beforeend", `
        <div class="item searchable ${dias >= getConfigNumero("dias_alerta_barril_cliente", 21) ? "itemAtrasado" : "itemDestaque"}">
          <div>
            <strong>${escapeHtml(c.cliente)}</strong>
            <div class="sub">Aberto: ${c.aberto} barril(is) • 10L=${c.q10} • 20L=${c.q20} • 30L=${c.q30} • 50L=${c.q50}</div>
            <div class="sub">Saíram ${c.saidas} • retornaram ${c.retornos} • saída mais antiga ${c.dataMaisAntiga ? dataBR(c.dataMaisAntiga) : "-"}</div>
            <div class="rowActions">
              <button class="btnTiny btnEdit" data-id="${escapeHtml(c.cliente_id || "")}" data-nome="${escapeHtml(c.cliente || "")}" onclick="abrirRetornoCliente(this.dataset.id,this.dataset.nome)">Registrar retorno</button>
            </div>
          </div>
          <span class="badge">${dias} dia(s)</span>
        </div>
      `);
    });
  }

  const rbox = document.getElementById("listaRetornos");
  if (rbox) {
    rbox.innerHTML = retornosRows.length ? "" : '<div class="item"><span class="sub">Nenhum retorno registrado.</span></div>';
    retornosRows.slice(0,50).forEach(r => {
      rbox.insertAdjacentHTML("beforeend", `
        <div class="item searchable">
          <div>
            <strong>${escapeHtml(r.cliente_nome)}</strong>
            <div class="sub">${dataBR(r.data_retorno)} • ${escapeHtml(r.cerveja_nome || "Barris")}</div>
            <div class="sub">10L=${r.q10||0} • 20L=${r.q20||0} • 30L=${r.q30||0} • 50L=${r.q50||0} • ${escapeHtml(r.codigos_barris || "")}</div>
          </div>
          <span class="badge">${somaBarris(r.q10,r.q20,r.q30,r.q50)}</span>
        </div>
      `);
    });
  }

  state.loaded.retornos = true;
}

function exportarRetornosCsv() {
  const rows = state.retornos || [];
  if (!rows.length) {
    alert("Carregue os retornos antes de exportar.");
    return;
  }

  const linhas = [["Data","Cliente","Cerveja","10L","20L","30L","50L","Total barris","Códigos","Responsável","Observação"]];
  rows.forEach(r => linhas.push([
    r.data_retorno,
    r.cliente_nome,
    r.cerveja_nome || "",
    r.q10 || 0,
    r.q20 || 0,
    r.q30 || 0,
    r.q50 || 0,
    somaBarris(r.q10,r.q20,r.q30,r.q50),
    r.codigos_barris || "",
    r.responsavel || "",
    r.observacao || ""
  ]));

  baixarCsvErp("retornos-erp-cervejaria.csv", linhas);
}

async function carregarExtratoCliente() {
  const clienteId = document.getElementById("extratoCliente").value;
  const op = document.getElementById("extratoCliente").options[document.getElementById("extratoCliente").selectedIndex];
  const clienteNome = op ? (op.dataset.nome || op.textContent) : "";
  const box = document.getElementById("extratoClienteConteudo");

  if (!clienteId || !clienteNome) {
    box.innerHTML = '<div class="item"><span class="sub">Selecione um cliente.</span></div>';
    return;
  }

  await carregarBaseCadastros();
  const cliente = state.clientes.find(c => c.id === clienteId) || {};

  const [saidas, retornos] = await Promise.all([
    sb.from("saidas").select("*").eq("cliente_id", clienteId).order("data_saida", { ascending:false }).limit(500),
    sb.from("retornos").select("*").eq("cliente_id", clienteId).order("data_retorno", { ascending:false }).limit(500)
  ]);

  const saidaRows = saidas.data || [];
  const retornoRows = retornos.data || [];
  const aberto = calcularAbertoDetalhado(saidaRows, retornoRows, clienteId, clienteNome);
  const grupos = agruparSaidas(saidaRows);

  const porCerveja = {};
  saidaRows.forEach(s => porCerveja[s.cerveja_nome] = (porCerveja[s.cerveja_nome] || 0) + Number(s.litros || 0));

  const eventos = [
    ...grupos.map(g => ({
      tipo:"SAÍDA",
      data:g.data_saida,
      titulo:`${g.itens.length} item(ns) enviados`,
      detalhe:`${fmt(g.litros)} L • ${g.q10+g.q20+g.q30+g.q50} barril(is)`,
      extra:g.itens.map(i => `${i.cerveja_nome}: ${fmt(i.litros)} L`).join(" | "),
      peso:dataParaOrdenacao(g.criado_em || g.data_saida)
    })),
    ...retornoRows.map(r => ({
      tipo:"RETORNO",
      data:r.data_retorno,
      titulo:r.cerveja_nome || "Barris retornados",
      detalhe:`${somaBarris(r.q10,r.q20,r.q30,r.q50)} barril(is) • 10L=${r.q10||0} • 20L=${r.q20||0} • 30L=${r.q30||0} • 50L=${r.q50||0}`,
      extra:r.codigos_barris || "",
      peso:dataParaOrdenacao(r.criado_em || r.data_retorno)
    }))
  ].sort((a,b) => b.peso - a.peso);

  box.innerHTML = `
    <div class="item blocoVertical">
      <strong>${escapeHtml(clienteNome)}</strong>
      <div class="sub">${escapeHtml(cliente.estabelecimento || "-")} • ${escapeHtml(cliente.cidade || "-")}</div>
      <div class="sub">${escapeHtml(cliente.contato || "")}</div>
      <div class="sub">${escapeHtml(cliente.observacao || "")}</div>
    </div>

    <div class="gridCards">
      <div class="card"><span>Litros enviados</span><strong>${fmt(aberto.litrosSaidos)} L</strong></div>
      <div class="card"><span>Fichas de saída</span><strong>${grupos.length}</strong></div>
      <div class="card"><span>Barris enviados</span><strong>${aberto.barrisSaidos}</strong></div>
      <div class="card"><span>Barris retornados</span><strong>${aberto.barrisRetornados}</strong></div>
      <div class="card"><span>Barris em aberto</span><strong>${aberto.aberto}</strong></div>
    </div>

    <div class="item blocoVertical">
      <strong>Barris em aberto</strong>
      <div class="sub">10L=${aberto.q10} • 20L=${aberto.q20} • 30L=${aberto.q30} • 50L=${aberto.q50}</div>
      <div class="rowActions">
        <button class="btnTiny btnEdit" onclick="abrirRetornoCliente('${clienteId}','${escapeHtml(clienteNome)}')">Registrar retorno deste cliente</button>
      </div>
    </div>

    <div class="item blocoVertical">
      <strong>Cervejas enviadas</strong>
      <div class="sub">${
        Object.entries(porCerveja).length
        ? Object.entries(porCerveja).sort((a,b)=>b[1]-a[1]).map(([k,v]) => `${escapeHtml(k)}: ${fmt(v)} L`).join("<br>")
        : "Nenhuma saída."
      }</div>
    </div>
  `;

  if (!eventos.length) {
    box.insertAdjacentHTML("beforeend", '<div class="item"><span class="sub">Nenhum movimento para este cliente.</span></div>');
  } else {
    box.insertAdjacentHTML("beforeend", '<h3>Histórico do cliente</h3>');
    eventos.forEach(e => {
      box.insertAdjacentHTML("beforeend", `
        <div class="item searchable">
          <div>
            <strong>${escapeHtml(e.tipo)} — ${escapeHtml(e.titulo)}</strong>
            <div class="sub">${dataBR(e.data)} • ${escapeHtml(e.detalhe)}</div>
            <div class="sub">${escapeHtml(e.extra)}</div>
          </div>
          <span class="badge">${escapeHtml(e.tipo)}</span>
        </div>
      `);
    });
  }

  state.ultimaFichaCliente = {
    cliente,
    clienteNome,
    saidaRows,
    retornoRows,
    grupos,
    aberto,
    porCerveja,
    eventos
  };
}

function exportarFichaClienteCsv() {
  if (!state.ultimaFichaCliente) {
    alert("Gere a ficha do cliente antes de exportar.");
    return;
  }

  const f = state.ultimaFichaCliente;
  const linhas = [];
  linhas.push(["Ficha do cliente", f.clienteNome]);
  linhas.push(["Estabelecimento", f.cliente.estabelecimento || ""]);
  linhas.push(["Cidade", f.cliente.cidade || ""]);
  linhas.push(["Contato", f.cliente.contato || ""]);
  linhas.push([]);
  linhas.push(["Resumo"]);
  linhas.push(["Litros enviados", f.aberto.litrosSaidos]);
  linhas.push(["Barris enviados", f.aberto.barrisSaidos]);
  linhas.push(["Barris retornados", f.aberto.barrisRetornados]);
  linhas.push(["Barris em aberto", f.aberto.aberto]);
  linhas.push(["Aberto 10L", f.aberto.q10]);
  linhas.push(["Aberto 20L", f.aberto.q20]);
  linhas.push(["Aberto 30L", f.aberto.q30]);
  linhas.push(["Aberto 50L", f.aberto.q50]);
  linhas.push([]);
  linhas.push(["Cervejas enviadas"]);
  Object.entries(f.porCerveja).forEach(([k,v]) => linhas.push([k,v]));
  linhas.push([]);
  linhas.push(["Histórico"]);
  linhas.push(["Data","Tipo","Título","Detalhe","Extra"]);
  f.eventos.forEach(e => linhas.push([e.data,e.tipo,e.titulo,e.detalhe,e.extra]));

  baixarCsvErp(`ficha-cliente-${f.clienteNome}.csv`, linhas);
}

function prepararFiltrosPhenomena() {
  const de = document.getElementById("phenFiltroDe");
  const ate = document.getElementById("phenFiltroAte");
  if (ate && !ate.value) ate.value = new Date().toISOString().slice(0,10);
  if (de && !de.value) {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    de.value = d.toISOString().slice(0,10);
  }
}

async function carregarPhenomena(force=false) {
  if (state.loaded.phenomena && !force) return;
  await carregarBaseCadastros();
  prepararFiltrosPhenomena();

  const periodo = getPeriodoInputs("phenFiltro");

  let qEntradas = sb.from("phenomena_entradas").select("*").order("criado_em", { ascending:false }).limit(500);
  let qRetiradas = sb.from("movimentacoes").select("*").eq("tipo","RETIRADA PHENOMENA").order("criado_em", { ascending:false }).limit(500);
  let qDebitos = sb.from("phenomena_debitos").select("*").order("criado_em", { ascending:false }).limit(500);
  let qPagamentos = sb.from("phenomena_pagamentos").select("*").order("criado_em", { ascending:false }).limit(500);

  if (periodo.de) {
    qEntradas = qEntradas.gte("criado_em", periodo.de);
    qRetiradas = qRetiradas.gte("criado_em", periodo.de);
    qDebitos = qDebitos.gte("criado_em", periodo.de);
    qPagamentos = qPagamentos.gte("criado_em", periodo.de);
  }
  if (periodo.ateIso) {
    qEntradas = qEntradas.lt("criado_em", periodo.ateIso);
    qRetiradas = qRetiradas.lt("criado_em", periodo.ateIso);
    qDebitos = qDebitos.lt("criado_em", periodo.ateIso);
    qPagamentos = qPagamentos.lt("criado_em", periodo.ateIso);
  }

  const [estoque, entradas, retiradas, debitos, pagamentos, debitosTodos] = await Promise.all([
    sb.from("estoque_cerveja").select("*").eq("origem","PHENOMENA").order("cerveja_nome"),
    qEntradas,
    qRetiradas,
    qDebitos,
    qPagamentos,
    sb.from("phenomena_debitos").select("*").order("criado_em", { ascending:false }).limit(1000)
  ]);

  state.debitosPhenomena = debitosTodos.data || [];
  const debitosPeriodo = debitos.data || [];
  const pagamentosPeriodo = pagamentos.data || [];
  const retiradasPeriodo = retiradas.data || [];
  const entradasPeriodo = entradas.data || [];

  const debitosAbertos = state.debitosPhenomena.filter(d => d.status !== "PAGO");
  const saldoAberto = debitosAbertos.reduce((s,d) => s + (Number(d.valor_total || 0) - Number(d.valor_pago || 0)), 0);
  const totalDebitadoPeriodo = debitosPeriodo.reduce((s,d)=>s+Number(d.valor_total||0),0);
  const totalPagoPeriodo = pagamentosPeriodo.reduce((s,p)=>s+Number(p.valor||0),0);
  const totalRetiradoPeriodo = retiradasPeriodo.reduce((s,r)=>s+Math.abs(Number(r.quantidade||0)),0);

  if (document.getElementById("phenSaldoAberto")) document.getElementById("phenSaldoAberto").innerText = fmtMoeda(saldoAberto);
  if (document.getElementById("phenQtdDebitos")) document.getElementById("phenQtdDebitos").innerText = debitosAbertos.length;
  if (document.getElementById("phenTotalDebitado")) document.getElementById("phenTotalDebitado").innerText = fmtMoeda(totalDebitadoPeriodo);
  if (document.getElementById("phenTotalPago")) document.getElementById("phenTotalPago").innerText = fmtMoeda(totalPagoPeriodo);
  if (document.getElementById("phenTotalRetirado")) document.getElementById("phenTotalRetirado").innerText = fmt(totalRetiradoPeriodo) + " L";

  const ebox = document.getElementById("estoquePhenomena");
  const rows = estoque.data || [];
  ebox.innerHTML = rows.length ? "" : '<div class="item"><span class="sub">Nenhum estoque Phenomena.</span></div>';
  ordenarComZeradosFinal(rows, r => r.cerveja_nome, r => r.litros).forEach(r => {
    ebox.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div>
          <strong>${escapeHtml(r.cerveja_nome)}</strong>
          <div class="sub">10L=${r.q10 || 0} • 20L=${r.q20 || 0} • 30L=${r.q30 || 0} • 50L=${r.q50 || 0}</div>
        </div>
        <span class="badge ${Number(r.litros || 0) <= 0 ? "zero" : ""}">${fmt(r.litros)} L</span>
      </div>
    `);
  });

  const dbox = document.getElementById("debitosPhenomena");
  dbox.innerHTML = debitosPeriodo.length ? "" : '<div class="item"><span class="sub">Nenhum débito no período.</span></div>';
  debitosPeriodo.forEach(d => {
    const aberto = Number(d.valor_total || 0) - Number(d.valor_pago || 0);
    dbox.insertAdjacentHTML("beforeend", `
      <div class="item searchable ${d.status === "PAGO" ? "" : "itemDestaque"}">
        <div>
          <strong>${escapeHtml(d.cerveja_nome)}</strong>
          <div class="sub">${dataHoraBR(d.criado_em)} • ${fmt(d.litros)} L • ${escapeHtml(d.status || "ABERTO")}</div>
          <div class="sub">Total ${fmtMoeda(d.valor_total)} • Pago ${fmtMoeda(d.valor_pago)} • Aberto ${fmtMoeda(aberto)}</div>
          <div class="sub">${escapeHtml(d.observacao || "")}</div>
        </div>
        <span class="badge ${d.status === "PAGO" ? "" : "zero"}">${fmtMoeda(aberto)}</span>
      </div>
    `);
  });

  const pbox = document.getElementById("pagamentosPhenomena");
  pbox.innerHTML = pagamentosPeriodo.length ? "" : '<div class="item"><span class="sub">Nenhum pagamento no período.</span></div>';
  pagamentosPeriodo.forEach(p => {
    pbox.insertAdjacentHTML("beforeend", `
      <div class="item searchable">
        <div>
          <strong>Pagamento Phenomena</strong>
          <div class="sub">${dataHoraBR(p.criado_em)} • ${escapeHtml(p.responsavel || "")}</div>
          <div class="sub">${escapeHtml(p.observacao || "")}</div>
        </div>
        <span class="badge">${fmtMoeda(p.valor)}</span>
      </div>
    `);
  });

  const inbox = document.getElementById("entradasPhenomena");
  inbox.innerHTML = entradasPeriodo.length ? "" : '<div class="item"><span class="sub">Nenhuma entrada no período.</span></div>';
  entradasPeriodo.forEach(r => {
    inbox.insertAdjacentHTML("beforeend", `
      <div class="item searchable">
        <div>
          <strong>${escapeHtml(r.cerveja_nome)}</strong>
          <div class="sub">${dataHoraBR(r.criado_em)} • ${escapeHtml(r.observacao || "")}</div>
        </div>
        <span class="badge">${fmt(r.litros)} L</span>
      </div>
    `);
  });

  const rout = document.getElementById("retiradasPhenomena");
  rout.innerHTML = retiradasPeriodo.length ? "" : '<div class="item"><span class="sub">Nenhuma retirada no período.</span></div>';
  retiradasPeriodo.forEach(r => {
    rout.insertAdjacentHTML("beforeend", `
      <div class="item searchable">
        <div>
          <strong>${escapeHtml(r.item_nome)}</strong>
          <div class="sub">${dataHoraBR(r.criado_em)} • ${escapeHtml(r.responsavel || "")}</div>
          <div class="sub">${escapeHtml(r.observacao || "")}</div>
        </div>
        <span class="badge">${fmt(Math.abs(Number(r.quantidade || 0)))} L</span>
      </div>
    `);
  });

  state.phenomenaPeriodo = {
    periodo,
    estoque: rows,
    entradas: entradasPeriodo,
    retiradas: retiradasPeriodo,
    debitos: debitosPeriodo,
    pagamentos: pagamentosPeriodo,
    saldoAberto,
    totalDebitadoPeriodo,
    totalPagoPeriodo,
    totalRetiradoPeriodo
  };

  state.loaded.phenomena = true;
}

async function prepararFormPagamentoPhenomena() {
  const { data, error } = await sb.from("phenomena_debitos")
    .select("*")
    .neq("status","PAGO")
    .order("criado_em", { ascending:true })
    .limit(1000);

  const sel = document.getElementById("phenPagDebito");
  sel.innerHTML = '<option value="">Selecionar débito...</option>';

  if (error) {
    sel.innerHTML = '<option value="">Erro ao carregar débitos</option>';
    return;
  }

  state.debitosPhenomena = data || [];
  state.debitosPhenomena.forEach(d => {
    const aberto = Number(d.valor_total || 0) - Number(d.valor_pago || 0);
    const op = document.createElement("option");
    op.value = d.id;
    op.dataset.aberto = aberto;
    op.dataset.total = d.valor_total || 0;
    op.dataset.pago = d.valor_pago || 0;
    op.textContent = `${d.cerveja_nome} — ${dataHoraBR(d.criado_em)} — aberto ${fmtMoeda(aberto)}`;
    sel.appendChild(op);
  });

  atualizarResumoPagamentoPhenomena();
}

function exportarPhenomenaCsv() {
  if (!state.phenomenaPeriodo) {
    alert("Carregue a tela Phenomena antes de exportar.");
    return;
  }

  const p = state.phenomenaPeriodo;
  const linhas = [];
  linhas.push(["Phenomena"]);
  linhas.push(["Período", p.periodo.de || "", p.periodo.ate || ""]);
  linhas.push([]);
  linhas.push(["Resumo"]);
  linhas.push(["Saldo aberto geral", p.saldoAberto]);
  linhas.push(["Total debitado período", p.totalDebitadoPeriodo]);
  linhas.push(["Total pago período", p.totalPagoPeriodo]);
  linhas.push(["Litros retirados período", p.totalRetiradoPeriodo]);

  linhas.push([]);
  linhas.push(["Débitos"]);
  linhas.push(["Data","Cerveja","Litros","Valor total","Valor pago","Aberto","Status","Observação"]);
  p.debitos.forEach(d => linhas.push([
    d.criado_em,
    d.cerveja_nome,
    d.litros || 0,
    d.valor_total || 0,
    d.valor_pago || 0,
    Number(d.valor_total || 0) - Number(d.valor_pago || 0),
    d.status || "",
    d.observacao || ""
  ]));

  linhas.push([]);
  linhas.push(["Pagamentos"]);
  linhas.push(["Data","Valor","Responsável","Observação"]);
  p.pagamentos.forEach(pg => linhas.push([pg.criado_em, pg.valor || 0, pg.responsavel || "", pg.observacao || ""]));

  linhas.push([]);
  linhas.push(["Entradas"]);
  linhas.push(["Data","Cerveja","Litros","Observação"]);
  p.entradas.forEach(e => linhas.push([e.criado_em, e.cerveja_nome, e.litros || 0, e.observacao || ""]));

  linhas.push([]);
  linhas.push(["Retiradas"]);
  linhas.push(["Data","Cerveja","Litros","Responsável","Observação"]);
  p.retiradas.forEach(r => linhas.push([r.criado_em, r.item_nome, Math.abs(Number(r.quantidade || 0)), r.responsavel || "", r.observacao || ""]));

  baixarCsvErp("phenomena-erp-cervejaria.csv", linhas);
}



/* ==========================================================
   UPDATE: CONTROLE SIMPLES DE CÓDIGOS DE BARRIS EM CLIENTES
   ========================================================== */

function normalizarCodigoBarril(codigo) {
  return String(codigo || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function extrairCodigosBarris(texto) {
  if (!texto) return [];

  let bruto = String(texto)
    .replace(/\r/g, "\n")
    .split(/[\n,;|]+/);

  if (bruto.length === 1 && bruto[0].trim().includes(" ")) {
    bruto = bruto[0].trim().split(/\s+/);
  }

  const ignorar = new Set([
    "SEM ETIQUETA",
    "SEM-ETIQUETA",
    "S/ETIQUETA",
    "SEM CODIGO",
    "SEM CÓDIGO",
    "SEM-CODIGO",
    "SEM-CÓDIGO",
    "NAO IDENTIFICADO",
    "NÃO IDENTIFICADO",
    "N/A",
    "-"
  ]);

  const vistos = new Set();
  const out = [];

  bruto.forEach(c => {
    const n = normalizarCodigoBarril(c);
    if (!n || ignorar.has(n)) return;
    if (!vistos.has(n)) {
      vistos.add(n);
      out.push(n);
    }
  });

  return out;
}

function montarCodigosAbertosCliente(saidasRows, retornosRows, clienteId="", clienteNome="") {
  const filtraClienteSaida = s => clienteId ? s.cliente_id === clienteId : s.cliente_nome === clienteNome;
  const filtraClienteRetorno = r => clienteId ? r.cliente_id === clienteId : r.cliente_nome === clienteNome;

  const abertos = [];

  (saidasRows || [])
    .filter(filtraClienteSaida)
    .sort((a,b) => dataParaOrdenacao(a.criado_em || a.data_saida) - dataParaOrdenacao(b.criado_em || b.data_saida))
    .forEach(s => {
      extrairCodigosBarris(s.codigos_barris).forEach(codigo => {
        abertos.push({
          codigo,
          cliente_id:s.cliente_id,
          cliente_nome:s.cliente_nome,
          cerveja_nome:s.cerveja_nome,
          data_saida:s.data_saida,
          criado_em:s.criado_em,
          grupo_saida:s.grupo_saida,
          origem_baixada:s.origem_baixada || "",
          semBaixa: String(s.origem_baixada || "").includes("SEM BAIXA")
        });
      });
    });

  (retornosRows || [])
    .filter(filtraClienteRetorno)
    .sort((a,b) => dataParaOrdenacao(a.criado_em || a.data_retorno) - dataParaOrdenacao(b.criado_em || b.data_retorno))
    .forEach(r => {
      extrairCodigosBarris(r.codigos_barris).forEach(codigo => {
        const idx = abertos.findIndex(a => a.codigo === codigo);
        if (idx >= 0) abertos.splice(idx, 1);
      });
    });

  return abertos;
}

function agruparCodigosAbertosPorCliente(saidasRows, retornosRows) {
  const clientes = new Map();

  (saidasRows || []).forEach(s => {
    const key = s.cliente_id || s.cliente_nome;
    if (!clientes.has(key)) clientes.set(key, { cliente_id:s.cliente_id, cliente_nome:s.cliente_nome });
  });

  (retornosRows || []).forEach(r => {
    const key = r.cliente_id || r.cliente_nome;
    if (!clientes.has(key)) clientes.set(key, { cliente_id:r.cliente_id, cliente_nome:r.cliente_nome });
  });

  return [...clientes.values()].map(c => {
    const codigos = montarCodigosAbertosCliente(saidasRows, retornosRows, c.cliente_id, c.cliente_nome);
    return { ...c, codigos };
  }).filter(c => c.codigos.length > 0).sort((a,b) => b.codigos.length - a.codigos.length);
}

function renderCodigosTags(codigos, limite=80) {
  if (!codigos || !codigos.length) return '<span class="sub">Nenhum código em aberto.</span>';

  const hoje = new Date();
  return `<div class="codigoGrid">${
    codigos.slice(0, limite).map(c => {
      const dias = c.data_saida ? Math.max(0, Math.floor((hoje - new Date(c.data_saida + "T00:00:00")) / 86400000)) : 0;
      const cls = dias >= getConfigNumero("dias_alerta_barril_cliente", 21) ? "atrasado" : "";
      return `<span class="codigoTag ${cls}" title="${escapeHtml(c.cerveja_nome || "")} • ${dias} dia(s)">${escapeHtml(c.codigo)}</span>`;
    }).join("")
  }</div>`;
}

function adicionarItemSaida() {
  const container = document.getElementById("saidaItens");
  const idx = container.querySelectorAll(".saidaItem").length + 1;

  const div = document.createElement("div");
  div.className = "saidaItem";
  div.innerHTML = `
    <div class="saidaItemHeader">
      <strong>Item ${idx}</strong>
      <button type="button" class="smallDanger" onclick="this.closest('.saidaItem').remove()">Remover</button>
    </div>

    <label>Cerveja</label>
    <select class="saidaItemCerveja"></select>

    <div class="linha2">
      <div><label>Barris 10L</label><input class="saidaItemQ10" type="number" min="0" value="0"></div>
      <div><label>Barris 20L</label><input class="saidaItemQ20" type="number" min="0" value="0"></div>
    </div>
    <div class="linha2">
      <div><label>Barris 30L</label><input class="saidaItemQ30" type="number" min="0" value="0"></div>
      <div><label>Barris 50L</label><input class="saidaItemQ50" type="number" min="0" value="0"></div>
    </div>

    <label>Códigos dos barris</label>
    <input class="saidaItemCodigos" placeholder="Ex: BR30-01, BR50-03">

    <label class="checkLine">
      <input class="saidaItemSomenteCodigo" type="checkbox">
      <span>Não baixar estoque. Usar apenas para controlar que estes barris foram para o cliente.</span>
    </label>
  `;

  container.appendChild(div);

  const sel = div.querySelector(".saidaItemCerveja");
  sel.innerHTML = '<option value="">Selecionar cerveja...</option>';
  state.cervejas.forEach(c => {
    const op = document.createElement("option");
    op.value = c.nome;
    op.textContent = c.nome;
    sel.appendChild(op);
  });
}

function coletarItensSaida() {
  const itens = [];
  document.querySelectorAll("#saidaItens .saidaItem").forEach(div => {
    const cerveja_nome = div.querySelector(".saidaItemCerveja").value;
    const q10 = Number(div.querySelector(".saidaItemQ10").value || 0);
    const q20 = Number(div.querySelector(".saidaItemQ20").value || 0);
    const q30 = Number(div.querySelector(".saidaItemQ30").value || 0);
    const q50 = Number(div.querySelector(".saidaItemQ50").value || 0);
    const codigos = div.querySelector(".saidaItemCodigos").value.trim();
    const somente_codigo = !!div.querySelector(".saidaItemSomenteCodigo")?.checked;
    const qtdBarris = somaBarris(q10,q20,q30,q50);

    if (cerveja_nome && qtdBarris > 0) {
      itens.push({ cerveja_nome, q10, q20, q30, q50, codigos_barris: codigos, somente_codigo });
    }
  });
  return itens;
}

async function salvarSaidaMultipla() {
  mostrarErro("saidaErro", "");
  await carregarBaseCadastros();

  const clienteId = document.getElementById("saidaCliente").value;
  const clienteOp = document.getElementById("saidaCliente").options[document.getElementById("saidaCliente").selectedIndex];
  const cliente_nome = clienteOp ? (clienteOp.dataset.nome || clienteOp.textContent) : "";
  const responsavel = document.getElementById("saidaResponsavel").value.trim();
  const observacao = document.getElementById("saidaObs").value.trim();
  const itens = coletarItensSaida();

  if (!clienteId || !cliente_nome) {
    mostrarErro("saidaErro", "Selecione o cliente.");
    return;
  }

  if (!itens.length) {
    mostrarErro("saidaErro", "Adicione pelo menos uma cerveja com quantidade.");
    return;
  }

  const simulacoes = [];
  const estoqueVirtual = new Map();
  try {
    for (const item of itens) {
      const qtdBarris = somaBarris(item.q10,item.q20,item.q30,item.q50);
      const qtdCodigos = extrairCodigosBarris(item.codigos_barris).length;
      if (item.codigos_barris && qtdCodigos > 0 && qtdCodigos !== qtdBarris) {
        const ok = confirm(`${item.cerveja_nome}: você informou ${qtdBarris} barril(is), mas ${qtdCodigos} código(s). Deseja continuar mesmo assim?`);
        if (!ok) return;
      }

      if (item.somente_codigo) {
        simulacoes.push({ item, sim:{ updates:[], baixas:[], resumoPorOrigem:{ "SEM BAIXA": 0 } } });
      } else {
        const sim = await simularBaixaCervejaVirtual(item.cerveja_nome, item.q10, item.q20, item.q30, item.q50, estoqueVirtual);
        simulacoes.push({ item, sim });
      }
    }
  } catch(e) {
    mostrarErro("saidaErro", e.message);
    return;
  }

  let resumo = `Cliente: ${cliente_nome}\n\n`;
  simulacoes.forEach(({ item, sim }) => {
    resumo += `${item.cerveja_nome} — ${item.somente_codigo ? "controle de barril/código" : fmt(litrosBarris(item.q10,item.q20,item.q30,item.q50)) + " L"}\n`;
    resumo += `Barris: 10L=${item.q10}, 20L=${item.q20}, 30L=${item.q30}, 50L=${item.q50}\n`;
    if (item.somente_codigo) {
      resumo += `Baixa de estoque: NÃO\n`;
    } else {
      resumo += `Baixa automática: ${Object.entries(sim.resumoPorOrigem).map(([o,l]) => `${o}: ${fmt(l)}L`).join(" • ")}\n`;
    }
    if (item.codigos_barris) resumo += `Códigos: ${item.codigos_barris}\n`;
    resumo += "\n";
  });
  resumo += "Confirmar saída?";

  if (!confirm(resumo)) return;

  const grupo_saida = novoUUID();

  try {
    for (const { item, sim } of simulacoes) {
      if (!item.somente_codigo) {
        for (const u of sim.updates) {
          const cerveja = state.cervejas.find(c => c.nome === item.cerveja_nome);
          await sb.from("estoque_cerveja").upsert({
            cerveja_id: cerveja ? cerveja.id : null,
            cerveja_nome: item.cerveja_nome,
            origem: u.origem,
            q10: Number(u.q10 || 0),
            q20: Number(u.q20 || 0),
            q30: Number(u.q30 || 0),
            q50: Number(u.q50 || 0),
            litros: Number(u.litros || 0),
            atualizado_em: new Date().toISOString()
          }, { onConflict:"cerveja_nome,origem" });
        }
      }

      const litros = item.somente_codigo ? 0 : litrosBarris(item.q10,item.q20,item.q30,item.q50);
      const origem_baixada = item.somente_codigo
        ? "CONTROLE DE BARRIL / SEM BAIXA DE ESTOQUE"
        : Object.entries(sim.resumoPorOrigem).map(([o,l]) => `${o}: ${fmt(l)}L`).join(" | ");
      const cerveja = state.cervejas.find(c => c.nome === item.cerveja_nome);

      const { error: saidaErro } = await sb.from("saidas").insert({
        grupo_saida,
        cliente_id: clienteId,
        cliente_nome,
        cerveja_id: cerveja ? cerveja.id : null,
        cerveja_nome: item.cerveja_nome,
        q10:item.q10,
        q20:item.q20,
        q30:item.q30,
        q50:item.q50,
        litros,
        codigos_barris: item.codigos_barris,
        origem_baixada,
        responsavel,
        observacao
      });

      if (saidaErro) throw saidaErro;

      await sb.from("movimentacoes").insert({
        tipo: item.somente_codigo ? "SAIDA BARRIL CODIGO" : "SAIDA ESTOQUE",
        categoria: item.somente_codigo ? "BARRIL" : "CERVEJA",
        item_nome: item.cerveja_nome,
        quantidade: item.somente_codigo ? somaBarris(item.q10,item.q20,item.q30,item.q50) : -Math.abs(litros),
        unidade: item.somente_codigo ? "UN" : "L",
        destino: cliente_nome,
        cliente_nome,
        observacao: `${origem_baixada}${item.codigos_barris ? " — Códigos: " + item.codigos_barris : ""}${observacao ? " — " + observacao : ""}`,
        responsavel
      });
    }
  } catch(e) {
    mostrarErro("saidaErro", "Erro ao salvar saída: " + e.message);
    return;
  }

  document.getElementById("saidaResponsavel").value = "";
  document.getElementById("saidaObs").value = "";
  document.getElementById("saidaItens").innerHTML = "";
  adicionarItemSaida();
  invalidar("saidas","estoque","inicio","retornos","clientes","painelDia","auditoria");
  alert("Saída registrada.");
  carregarSaidas(true);
  carregarInicio(true);
}

async function carregarSaidas(force=false) {
  if (state.loaded.saidas && !force) return;

  const { data, error } = await sb.from("saidas")
    .select("*")
    .order("criado_em", { ascending:false })
    .limit(500);

  const box = document.getElementById("listaSaidas");
  const resumoBox = document.getElementById("saidasResumo");

  if (error) {
    if (box) box.innerHTML = '<div class="item">Erro ao carregar saídas.</div>';
    return;
  }

  const rows = data || [];
  const grupos = agruparSaidas(rows);
  state.saidasAgrupadas = grupos;
  state.saidasRows = rows;

  const litros = rows.reduce((s,r) => s + Number(r.litros || 0), 0);
  const barris = rows.reduce((s,r) => s + somaBarris(r.q10,r.q20,r.q30,r.q50), 0);
  const codigos = rows.reduce((s,r) => s + extrairCodigosBarris(r.codigos_barris).length, 0);
  const clientes = new Set(rows.map(r => r.cliente_nome).filter(Boolean)).size;

  if (resumoBox) {
    resumoBox.innerHTML = `
      <div class="card"><span>Fichas de saída</span><strong>${grupos.length}</strong></div>
      <div class="card"><span>Litros baixados</span><strong>${fmt(litros)} L</strong></div>
      <div class="card"><span>Barris enviados</span><strong>${barris}</strong></div>
      <div class="card"><span>Códigos registrados</span><strong>${codigos}</strong></div>
      <div class="card"><span>Clientes atendidos</span><strong>${clientes}</strong></div>
    `;
  }

  if (!box) return;
  box.innerHTML = grupos.length ? "" : '<div class="item"><span class="sub">Nenhuma saída registrada.</span></div>';

  grupos.forEach(g => {
    const itensHtml = g.itens.map(i => {
      const semBaixa = String(i.origem_baixada || "").includes("SEM BAIXA");
      return `${escapeHtml(i.cerveja_nome)}: ${semBaixa ? "sem baixa de estoque" : fmt(i.litros) + " L"} • 10L=${i.q10||0} • 20L=${i.q20||0} • 30L=${i.q30||0} • 50L=${i.q50||0}`;
    }).join("<br>");

    const codigos = g.itens.flatMap(i => extrairCodigosBarris(i.codigos_barris).map(c => ({
      codigo:c,
      cerveja_nome:i.cerveja_nome,
      data_saida:g.data_saida
    })));

    const origemHtml = g.origem.length ? `<div class="sub">Baixa: ${escapeHtml(g.origem.join(" | "))}</div>` : "";
    const codigosHtml = codigos.length ? `<div class="codigosBox"><strong>Códigos enviados</strong>${renderCodigosTags(codigos)}</div>` : "";

    box.insertAdjacentHTML("beforeend", `
      <div class="item searchable itemDestaque">
        <div>
          <strong>${escapeHtml(g.cliente_nome)}</strong>
          <div class="sub">${dataBR(g.data_saida)} • ${g.itens.length} item(ns) • ${escapeHtml(g.responsavel || "")}</div>
          <div class="miniSection"><strong>Itens enviados</strong><div class="sub">${itensHtml}</div></div>
          ${origemHtml}
          ${codigosHtml}
          <div class="sub">${escapeHtml(g.observacao || "")}</div>
        </div>
        <span class="badge">${fmt(g.litros)} L</span>
      </div>
    `);
  });

  state.loaded.saidas = true;
}

async function atualizarResumoRetornoCliente() {
  const sel = document.getElementById("retornoCliente");
  const box = document.getElementById("retornoResumoCliente");
  const boxCodigos = document.getElementById("retornoCodigosAbertosCliente");

  if (!sel || !box || !sel.value) {
    if (box) box.innerText = "Selecione um cliente para ver os barris em aberto.";
    if (boxCodigos) boxCodigos.innerText = "Códigos em aberto aparecerão aqui.";
    return;
  }

  const op = sel.options[sel.selectedIndex];
  const clienteId = sel.value;
  const clienteNome = op ? (op.dataset.nome || op.textContent) : "";

  const [saidas, retornos] = await Promise.all([
    sb.from("saidas").select("*").eq("cliente_id", clienteId),
    sb.from("retornos").select("*").eq("cliente_id", clienteId)
  ]);

  const saidaRows = saidas.data || [];
  const retornoRows = retornos.data || [];
  const aberto = calcularAbertoDetalhado(saidaRows, retornoRows, clienteId, clienteNome);
  const codigosAbertos = montarCodigosAbertosCliente(saidaRows, retornoRows, clienteId, clienteNome);

  box.innerText = `Em aberto: ${aberto.aberto} barril(is) • 10L=${aberto.q10} • 20L=${aberto.q20} • 30L=${aberto.q30} • 50L=${aberto.q50}`;
  if (boxCodigos) {
    boxCodigos.innerHTML = `<strong>Códigos em aberto: ${codigosAbertos.length}</strong>${renderCodigosTags(codigosAbertos, 60)}`;
  }

  state.retornoAbertoAtual = aberto;
  state.retornoCodigosAbertosAtual = codigosAbertos;
}

function preencherRetornoAberto() {
  const aberto = state.retornoAbertoAtual;
  if (!aberto) {
    alert("Selecione um cliente primeiro.");
    return;
  }
  document.getElementById("retornoQ10").value = aberto.q10 || 0;
  document.getElementById("retornoQ20").value = aberto.q20 || 0;
  document.getElementById("retornoQ30").value = aberto.q30 || 0;
  document.getElementById("retornoQ50").value = aberto.q50 || 0;

  const codigos = (state.retornoCodigosAbertosAtual || []).map(c => c.codigo);
  if (codigos.length) document.getElementById("retornoCodigos").value = codigos.join(", ");
}

async function salvarRetorno() {
  mostrarErro("retornoErro", "");
  await carregarBaseCadastros();

  const clienteId = document.getElementById("retornoCliente").value;
  const clienteOp = document.getElementById("retornoCliente").options[document.getElementById("retornoCliente").selectedIndex];
  const cliente_nome = clienteOp ? (clienteOp.dataset.nome || clienteOp.textContent) : "";
  const cerveja_nome = document.getElementById("retornoCerveja").value || "";
  const q10 = Number(document.getElementById("retornoQ10").value || 0);
  const q20 = Number(document.getElementById("retornoQ20").value || 0);
  const q30 = Number(document.getElementById("retornoQ30").value || 0);
  const q50 = Number(document.getElementById("retornoQ50").value || 0);
  const codigos_barris = document.getElementById("retornoCodigos").value.trim();
  const responsavel = document.getElementById("retornoResp").value.trim();
  const observacao = document.getElementById("retornoObs").value.trim();

  if (!clienteId || !cliente_nome) {
    mostrarErro("retornoErro", "Selecione o cliente.");
    return;
  }

  const total = somaBarris(q10,q20,q30,q50);
  if (total <= 0) {
    mostrarErro("retornoErro", "Informe pelo menos um barril retornado.");
    return;
  }

  const [saidasBusca, retornosBusca] = await Promise.all([
    sb.from("saidas").select("*").eq("cliente_id", clienteId),
    sb.from("retornos").select("*").eq("cliente_id", clienteId)
  ]);

  const aberto = calcularAbertoDetalhado(saidasBusca.data || [], retornosBusca.data || [], clienteId, cliente_nome);
  const codigosAbertos = montarCodigosAbertosCliente(saidasBusca.data || [], retornosBusca.data || [], clienteId, cliente_nome);
  const codigosRetorno = extrairCodigosBarris(codigos_barris);
  const codigosAbertosSet = new Set(codigosAbertos.map(c => c.codigo));
  const codigosNaoAbertos = codigosRetorno.filter(c => !codigosAbertosSet.has(c));

  if (codigosRetorno.length && codigosRetorno.length !== total) {
    const ok = confirm(`Você informou ${total} barril(is), mas ${codigosRetorno.length} código(s). Deseja registrar mesmo assim?`);
    if (!ok) return;
  }

  if (codigosNaoAbertos.length) {
    const ok = confirm(`Estes códigos não aparecem em aberto para este cliente: ${codigosNaoAbertos.join(", ")}. Deseja registrar mesmo assim?`);
    if (!ok) return;
  }

  if (aberto.aberto > 0 && total > aberto.aberto) {
    const ok = confirm(`Este retorno tem ${total} barril(is), mas o cliente aparece com ${aberto.aberto} em aberto. Deseja registrar mesmo assim?`);
    if (!ok) return;
  }

  const { error } = await sb.from("retornos").insert({
    cliente_id: clienteId,
    cliente_nome,
    cerveja_nome,
    q10,q20,q30,q50,
    codigos_barris,
    responsavel,
    observacao
  });

  if (error) {
    mostrarErro("retornoErro", error.message);
    return;
  }

  await sb.from("movimentacoes").insert({
    tipo:"RETORNO BARRIL",
    categoria:"BARRIL",
    item_nome: cerveja_nome || "Barris retornados",
    quantidade: total,
    unidade:"UN",
    cliente_nome,
    observacao: `${codigos_barris ? "Códigos: " + codigos_barris + " — " : ""}${observacao}`,
    responsavel
  });

  ["retornoQ10","retornoQ20","retornoQ30","retornoQ50"].forEach(id => document.getElementById(id).value = 0);
  ["retornoCodigos","retornoResp","retornoObs"].forEach(id => document.getElementById(id).value = "");
  invalidar("retornos","inicio","painelDia","auditoria","clientes","saidas");
  alert("Retorno registrado.");
  carregarRetornos(true);
}

async function carregarRetornos(force=false) {
  if (state.loaded.retornos && !force) return;

  const [saidas, retornos] = await Promise.all([
    sb.from("saidas").select("*").order("data_saida", { ascending:true }).limit(1500),
    sb.from("retornos").select("*").order("criado_em", { ascending:false }).limit(1500)
  ]);

  const saidaRows = saidas.data || [];
  const retornosRows = retornos.data || [];
  state.retornos = retornosRows;
  state.retornosSaidasBase = saidaRows;

  const totalSaidaBarris = saidaRows.reduce((s,r) => s + somaBarris(r.q10,r.q20,r.q30,r.q50), 0);
  const totalRetornoBarris = retornosRows.reduce((s,r) => s + somaBarris(r.q10,r.q20,r.q30,r.q50), 0);
  const abertos = Math.max(0, totalSaidaBarris - totalRetornoBarris);
  const porCliente = agruparAbertosPorCliente(saidaRows, retornosRows);
  const codigosPorCliente = agruparCodigosAbertosPorCliente(saidaRows, retornosRows);
  const mapaCodigos = new Map(codigosPorCliente.map(c => [c.cliente_id || c.cliente_nome, c.codigos]));

  const limite = new Date();
  limite.setDate(limite.getDate() - getConfigNumero("dias_alerta_barril_cliente", 21));
  const saidasAntigas = saidaRows.filter(s => new Date(String(s.data_saida) + "T00:00:00") <= limite);
  const barrisAntigosAprox = Math.max(0, saidasAntigas.reduce((s,r)=>s+somaBarris(r.q10,r.q20,r.q30,r.q50),0) - totalRetornoBarris);

  if (document.getElementById("retornosBarrisAbertos")) document.getElementById("retornosBarrisAbertos").innerText = abertos;
  if (document.getElementById("retornosTotalRegistrados")) document.getElementById("retornosTotalRegistrados").innerText = totalRetornoBarris;
  if (document.getElementById("retornosClientesAbertos")) document.getElementById("retornosClientesAbertos").innerText = porCliente.length;
  if (document.getElementById("retornosBarrisAntigos")) document.getElementById("retornosBarrisAntigos").innerText = barrisAntigosAprox;

  const box = document.getElementById("barrisPorCliente");
  if (box) {
    box.innerHTML = porCliente.length ? "" : '<div class="item"><span class="sub">Nenhum barril em aberto.</span></div>';
    porCliente.forEach(c => {
      const dias = c.dataMaisAntiga ? Math.max(0, Math.floor((new Date() - new Date(c.dataMaisAntiga + "T00:00:00")) / 86400000)) : 0;
      const codigos = mapaCodigos.get(c.cliente_id || c.cliente) || [];
      box.insertAdjacentHTML("beforeend", `
        <div class="item searchable ${dias >= getConfigNumero("dias_alerta_barril_cliente", 21) ? "itemAtrasado" : "itemDestaque"}">
          <div>
            <strong>${escapeHtml(c.cliente)}</strong>
            <div class="sub">Aberto: ${c.aberto} barril(is) • 10L=${c.q10} • 20L=${c.q20} • 30L=${c.q30} • 50L=${c.q50}</div>
            <div class="sub">Códigos em aberto: ${codigos.length}</div>
            ${codigos.length ? renderCodigosTags(codigos, 50) : ""}
            <div class="sub">Saíram ${c.saidas} • retornaram ${c.retornos} • saída mais antiga ${c.dataMaisAntiga ? dataBR(c.dataMaisAntiga) : "-"}</div>
            <div class="rowActions">
              <button class="btnTiny btnEdit" data-id="${escapeHtml(c.cliente_id || "")}" data-nome="${escapeHtml(c.cliente || "")}" onclick="abrirRetornoCliente(this.dataset.id,this.dataset.nome)">Registrar retorno</button>
            </div>
          </div>
          <span class="badge">${dias} dia(s)</span>
        </div>
      `);
    });
  }

  const rbox = document.getElementById("listaRetornos");
  if (rbox) {
    rbox.innerHTML = retornosRows.length ? "" : '<div class="item"><span class="sub">Nenhum retorno registrado.</span></div>';
    retornosRows.slice(0,80).forEach(r => {
      const codigos = extrairCodigosBarris(r.codigos_barris).map(codigo => ({ codigo, cerveja_nome:r.cerveja_nome, data_saida:r.data_retorno }));
      rbox.insertAdjacentHTML("beforeend", `
        <div class="item searchable">
          <div>
            <strong>${escapeHtml(r.cliente_nome)}</strong>
            <div class="sub">${dataBR(r.data_retorno)} • ${escapeHtml(r.cerveja_nome || "Barris")}</div>
            <div class="sub">10L=${r.q10||0} • 20L=${r.q20||0} • 30L=${r.q30||0} • 50L=${r.q50||0}</div>
            ${codigos.length ? `<div class="codigosBox"><strong>Códigos retornados</strong>${renderCodigosTags(codigos)}</div>` : ""}
          </div>
          <span class="badge">${somaBarris(r.q10,r.q20,r.q30,r.q50)}</span>
        </div>
      `);
    });
  }

  state.loaded.retornos = true;
}

async function carregarExtratoCliente() {
  const clienteId = document.getElementById("extratoCliente").value;
  const op = document.getElementById("extratoCliente").options[document.getElementById("extratoCliente").selectedIndex];
  const clienteNome = op ? (op.dataset.nome || op.textContent) : "";
  const box = document.getElementById("extratoClienteConteudo");

  if (!clienteId || !clienteNome) {
    box.innerHTML = '<div class="item"><span class="sub">Selecione um cliente.</span></div>';
    return;
  }

  await carregarBaseCadastros();
  const cliente = state.clientes.find(c => c.id === clienteId) || {};

  const [saidas, retornos] = await Promise.all([
    sb.from("saidas").select("*").eq("cliente_id", clienteId).order("data_saida", { ascending:false }).limit(700),
    sb.from("retornos").select("*").eq("cliente_id", clienteId).order("data_retorno", { ascending:false }).limit(700)
  ]);

  const saidaRows = saidas.data || [];
  const retornoRows = retornos.data || [];
  const aberto = calcularAbertoDetalhado(saidaRows, retornoRows, clienteId, clienteNome);
  const codigosAbertos = montarCodigosAbertosCliente(saidaRows, retornoRows, clienteId, clienteNome);
  const grupos = agruparSaidas(saidaRows);

  const porCerveja = {};
  saidaRows.forEach(s => porCerveja[s.cerveja_nome] = (porCerveja[s.cerveja_nome] || 0) + Number(s.litros || 0));

  const eventos = [
    ...grupos.map(g => ({
      tipo:"SAÍDA",
      data:g.data_saida,
      titulo:`${g.itens.length} item(ns) enviados`,
      detalhe:`${fmt(g.litros)} L baixados • ${g.q10+g.q20+g.q30+g.q50} barril(is)`,
      extra:g.itens.map(i => `${i.cerveja_nome}: ${String(i.origem_baixada || "").includes("SEM BAIXA") ? "sem baixa" : fmt(i.litros) + " L"}${i.codigos_barris ? " • " + i.codigos_barris : ""}`).join(" | "),
      peso:dataParaOrdenacao(g.criado_em || g.data_saida)
    })),
    ...retornoRows.map(r => ({
      tipo:"RETORNO",
      data:r.data_retorno,
      titulo:r.cerveja_nome || "Barris retornados",
      detalhe:`${somaBarris(r.q10,r.q20,r.q30,r.q50)} barril(is) • 10L=${r.q10||0} • 20L=${r.q20||0} • 30L=${r.q30||0} • 50L=${r.q50||0}`,
      extra:r.codigos_barris || "",
      peso:dataParaOrdenacao(r.criado_em || r.data_retorno)
    }))
  ].sort((a,b) => b.peso - a.peso);

  box.innerHTML = `
    <div class="item blocoVertical">
      <strong>${escapeHtml(clienteNome)}</strong>
      <div class="sub">${escapeHtml(cliente.estabelecimento || "-")} • ${escapeHtml(cliente.cidade || "-")}</div>
      <div class="sub">${escapeHtml(cliente.contato || "")}</div>
      <div class="sub">${escapeHtml(cliente.observacao || "")}</div>
    </div>

    <div class="gridCards">
      <div class="card"><span>Litros baixados</span><strong>${fmt(aberto.litrosSaidos)} L</strong></div>
      <div class="card"><span>Fichas de saída</span><strong>${grupos.length}</strong></div>
      <div class="card"><span>Barris enviados</span><strong>${aberto.barrisSaidos}</strong></div>
      <div class="card"><span>Barris retornados</span><strong>${aberto.barrisRetornados}</strong></div>
      <div class="card"><span>Barris em aberto</span><strong>${aberto.aberto}</strong></div>
      <div class="card"><span>Códigos em aberto</span><strong>${codigosAbertos.length}</strong></div>
    </div>

    <div class="item blocoVertical">
      <strong>Barris em aberto</strong>
      <div class="sub">10L=${aberto.q10} • 20L=${aberto.q20} • 30L=${aberto.q30} • 50L=${aberto.q50}</div>
      <div class="codigosBox"><strong>Códigos em aberto</strong>${renderCodigosTags(codigosAbertos)}</div>
      <div class="rowActions">
        <button class="btnTiny btnEdit" onclick="abrirRetornoCliente('${clienteId}','${escapeHtml(clienteNome)}')">Registrar retorno deste cliente</button>
      </div>
    </div>

    <div class="item blocoVertical">
      <strong>Cervejas baixadas do estoque</strong>
      <div class="sub">${
        Object.entries(porCerveja).length
        ? Object.entries(porCerveja).sort((a,b)=>b[1]-a[1]).map(([k,v]) => `${escapeHtml(k)}: ${fmt(v)} L`).join("<br>")
        : "Nenhuma baixa de estoque."
      }</div>
    </div>
  `;

  if (!eventos.length) {
    box.insertAdjacentHTML("beforeend", '<div class="item"><span class="sub">Nenhum movimento para este cliente.</span></div>');
  } else {
    box.insertAdjacentHTML("beforeend", '<h3>Histórico do cliente</h3>');
    eventos.forEach(e => {
      box.insertAdjacentHTML("beforeend", `
        <div class="item searchable">
          <div>
            <strong>${escapeHtml(e.tipo)} — ${escapeHtml(e.titulo)}</strong>
            <div class="sub">${dataBR(e.data)} • ${escapeHtml(e.detalhe)}</div>
            <div class="sub">${escapeHtml(e.extra)}</div>
          </div>
          <span class="badge">${escapeHtml(e.tipo)}</span>
        </div>
      `);
    });
  }

  state.ultimaFichaCliente = {
    cliente,
    clienteNome,
    saidaRows,
    retornoRows,
    grupos,
    aberto,
    codigosAbertos,
    porCerveja,
    eventos
  };
}

function exportarFichaClienteCsv() {
  if (!state.ultimaFichaCliente) {
    alert("Gere a ficha do cliente antes de exportar.");
    return;
  }

  const f = state.ultimaFichaCliente;
  const linhas = [];
  linhas.push(["Ficha do cliente", f.clienteNome]);
  linhas.push(["Estabelecimento", f.cliente.estabelecimento || ""]);
  linhas.push(["Cidade", f.cliente.cidade || ""]);
  linhas.push(["Contato", f.cliente.contato || ""]);
  linhas.push([]);
  linhas.push(["Resumo"]);
  linhas.push(["Litros baixados", f.aberto.litrosSaidos]);
  linhas.push(["Barris enviados", f.aberto.barrisSaidos]);
  linhas.push(["Barris retornados", f.aberto.barrisRetornados]);
  linhas.push(["Barris em aberto", f.aberto.aberto]);
  linhas.push(["Códigos em aberto", f.codigosAbertos.length]);
  linhas.push(["Aberto 10L", f.aberto.q10]);
  linhas.push(["Aberto 20L", f.aberto.q20]);
  linhas.push(["Aberto 30L", f.aberto.q30]);
  linhas.push(["Aberto 50L", f.aberto.q50]);
  linhas.push([]);
  linhas.push(["Códigos em aberto"]);
  f.codigosAbertos.forEach(c => linhas.push([c.codigo, c.cerveja_nome, c.data_saida, c.origem_baixada]));
  linhas.push([]);
  linhas.push(["Cervejas baixadas do estoque"]);
  Object.entries(f.porCerveja).forEach(([k,v]) => linhas.push([k,v]));
  linhas.push([]);
  linhas.push(["Histórico"]);
  linhas.push(["Data","Tipo","Título","Detalhe","Extra"]);
  f.eventos.forEach(e => linhas.push([e.data,e.tipo,e.titulo,e.detalhe,e.extra]));

  baixarCsvErp(`ficha-cliente-${f.clienteNome}.csv`, linhas);
}



/* ==========================================================
   REGRA DEFINITIVA:
   TODA SAÍDA PARA CLIENTE BAIXA ESTOQUE
   ========================================================== */

function adicionarItemSaida() {
  const container = document.getElementById("saidaItens");
  const idx = container.querySelectorAll(".saidaItem").length + 1;

  const div = document.createElement("div");
  div.className = "saidaItem";
  div.innerHTML = `
    <div class="saidaItemHeader">
      <strong>Item ${idx}</strong>
      <button type="button" class="smallDanger" onclick="this.closest('.saidaItem').remove()">Remover</button>
    </div>

    <label>Cerveja</label>
    <select class="saidaItemCerveja"></select>

    <div class="linha2">
      <div><label>Barris 10L</label><input class="saidaItemQ10" type="number" min="0" value="0"></div>
      <div><label>Barris 20L</label><input class="saidaItemQ20" type="number" min="0" value="0"></div>
    </div>
    <div class="linha2">
      <div><label>Barris 30L</label><input class="saidaItemQ30" type="number" min="0" value="0"></div>
      <div><label>Barris 50L</label><input class="saidaItemQ50" type="number" min="0" value="0"></div>
    </div>

    <label>Códigos dos barris</label>
    <input class="saidaItemCodigos" placeholder="Ex: BR30-01, BR50-03">
    <div class="sub">A saída para cliente sempre baixa o estoque.</div>
  `;

  container.appendChild(div);

  const sel = div.querySelector(".saidaItemCerveja");
  sel.innerHTML = '<option value="">Selecionar cerveja...</option>';
  state.cervejas.forEach(c => {
    const op = document.createElement("option");
    op.value = c.nome;
    op.textContent = c.nome;
    sel.appendChild(op);
  });
}

function coletarItensSaida() {
  const itens = [];

  document.querySelectorAll("#saidaItens .saidaItem").forEach(div => {
    const cerveja_nome = div.querySelector(".saidaItemCerveja").value;
    const q10 = Number(div.querySelector(".saidaItemQ10").value || 0);
    const q20 = Number(div.querySelector(".saidaItemQ20").value || 0);
    const q30 = Number(div.querySelector(".saidaItemQ30").value || 0);
    const q50 = Number(div.querySelector(".saidaItemQ50").value || 0);
    const codigos = div.querySelector(".saidaItemCodigos").value.trim();

    if (cerveja_nome && somaBarris(q10,q20,q30,q50) > 0) {
      itens.push({
        cerveja_nome,
        q10,
        q20,
        q30,
        q50,
        codigos_barris: codigos
      });
    }
  });

  return itens;
}

async function salvarSaidaMultipla() {
  mostrarErro("saidaErro", "");
  await carregarBaseCadastros();

  const clienteId = document.getElementById("saidaCliente").value;
  const clienteOp = document.getElementById("saidaCliente").options[document.getElementById("saidaCliente").selectedIndex];
  const cliente_nome = clienteOp ? (clienteOp.dataset.nome || clienteOp.textContent) : "";
  const responsavel = document.getElementById("saidaResponsavel").value.trim();
  const observacao = document.getElementById("saidaObs").value.trim();
  const itens = coletarItensSaida();

  if (!clienteId || !cliente_nome) {
    mostrarErro("saidaErro", "Selecione o cliente.");
    return;
  }

  if (!itens.length) {
    mostrarErro("saidaErro", "Adicione pelo menos uma cerveja com quantidade.");
    return;
  }

  const simulacoes = [];
  const estoqueVirtual = new Map();

  try {
    for (const item of itens) {
      const qtdBarris = somaBarris(item.q10,item.q20,item.q30,item.q50);
      const qtdCodigos = extrairCodigosBarris(item.codigos_barris).length;

      if (item.codigos_barris && qtdCodigos > 0 && qtdCodigos !== qtdBarris) {
        const ok = confirm(
          `${item.cerveja_nome}: você informou ${qtdBarris} barril(is), mas ${qtdCodigos} código(s). Deseja continuar mesmo assim?`
        );
        if (!ok) return;
      }

      const sim = await simularBaixaCervejaVirtual(
        item.cerveja_nome,
        item.q10,
        item.q20,
        item.q30,
        item.q50,
        estoqueVirtual
      );

      simulacoes.push({ item, sim });
    }
  } catch(e) {
    mostrarErro("saidaErro", e.message);
    return;
  }

  let resumo = `Cliente: ${cliente_nome}\n\n`;

  simulacoes.forEach(({ item, sim }) => {
    resumo += `${item.cerveja_nome} — ${fmt(litrosBarris(item.q10,item.q20,item.q30,item.q50))} L\n`;
    resumo += `Barris: 10L=${item.q10}, 20L=${item.q20}, 30L=${item.q30}, 50L=${item.q50}\n`;
    resumo += `Baixa automática: ${Object.entries(sim.resumoPorOrigem).map(([o,l]) => `${o}: ${fmt(l)}L`).join(" • ")}\n`;

    if (item.codigos_barris) {
      resumo += `Códigos: ${item.codigos_barris}\n`;
    }

    resumo += "\n";
  });

  resumo += "Confirmar saída com baixa de estoque?";

  if (!confirm(resumo)) return;

  const grupo_saida = novoUUID();

  try {
    for (const { item, sim } of simulacoes) {
      for (const u of sim.updates) {
        const cerveja = state.cervejas.find(c => c.nome === item.cerveja_nome);

        const { error: estoqueErro } = await sb.from("estoque_cerveja").upsert({
          cerveja_id: cerveja ? cerveja.id : null,
          cerveja_nome: item.cerveja_nome,
          origem: u.origem,
          q10: Number(u.q10 || 0),
          q20: Number(u.q20 || 0),
          q30: Number(u.q30 || 0),
          q50: Number(u.q50 || 0),
          litros: Number(u.litros || 0),
          atualizado_em: new Date().toISOString()
        }, { onConflict:"cerveja_nome,origem" });

        if (estoqueErro) throw estoqueErro;
      }

      const litros = litrosBarris(item.q10,item.q20,item.q30,item.q50);
      const origem_baixada = Object.entries(sim.resumoPorOrigem)
        .map(([o,l]) => `${o}: ${fmt(l)}L`)
        .join(" | ");

      const cerveja = state.cervejas.find(c => c.nome === item.cerveja_nome);

      const { error: saidaErro } = await sb.from("saidas").insert({
        grupo_saida,
        cliente_id: clienteId,
        cliente_nome,
        cerveja_id: cerveja ? cerveja.id : null,
        cerveja_nome: item.cerveja_nome,
        q10:item.q10,
        q20:item.q20,
        q30:item.q30,
        q50:item.q50,
        litros,
        codigos_barris: item.codigos_barris,
        origem_baixada,
        responsavel,
        observacao
      });

      if (saidaErro) throw saidaErro;

      await sb.from("movimentacoes").insert({
        tipo:"SAIDA ESTOQUE",
        categoria:"CERVEJA",
        item_nome:item.cerveja_nome,
        quantidade:-Math.abs(litros),
        unidade:"L",
        destino:cliente_nome,
        cliente_nome,
        observacao:`${origem_baixada}${item.codigos_barris ? " — Códigos: " + item.codigos_barris : ""}${observacao ? " — " + observacao : ""}`,
        responsavel
      });
    }
  } catch(e) {
    mostrarErro("saidaErro", "Erro ao salvar saída: " + e.message);
    return;
  }

  document.getElementById("saidaResponsavel").value = "";
  document.getElementById("saidaObs").value = "";
  document.getElementById("saidaItens").innerHTML = "";
  adicionarItemSaida();

  invalidar(
    "saidas",
    "estoque",
    "inicio",
    "retornos",
    "clientes",
    "painelDia",
    "auditoria"
  );

  alert("Saída registrada com baixa automática do estoque.");

  carregarSaidas(true);
  carregarInicio(true);
}

