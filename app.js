
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
  retornos: []
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
    clientes: "telaClientes",
    cadastros: "telaCadastros"
  };

  document.getElementById(mapa[nome]).classList.add("active");

  const btns = document.querySelectorAll(".bottomNav button");
  if (nome === "inicio") btns[0].classList.add("active");
  if (nome === "producao") btns[1].classList.add("active");
  if (nome === "estoque") btns[2].classList.add("active");
  if (nome === "saidas") btns[3].classList.add("active");
  if (["mais","clientes","cadastros","fermentos","phenomena","retornos","painelDia","relatorio","auditoria","configuracoes","backup"].includes(nome)) btns[4].classList.add("active");

  if (nome === "inicio") carregarInicio();
  if (nome === "producao") carregarProducao();
  if (nome === "estoque") carregarEstoque();
  if (nome === "saidas") carregarSaidas();
  if (nome === "clientes") carregarClientes();
  if (nome === "cadastros") carregarCadastros();
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

  if (!state.configuracoes.dias_alerta_barril_cliente) state.configuracoes.dias_alerta_barril_cliente = "21";
  if (!state.configuracoes.dias_alerta_lote_fermentando) state.configuracoes.dias_alerta_lote_fermentando = "10";
  if (!state.configuracoes.dias_alerta_validade_insumos) state.configuracoes.dias_alerta_validade_insumos = "30";

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

  const [estoque, producoes, clientes, insumos, saidas, retornos] = await Promise.all([
    sb.from("estoque_cerveja").select("litros"),
    sb.from("producoes").select("id,status").eq("status","FERMENTANDO"),
    sb.from("clientes").select("id", { count:"exact", head:true }),
    sb.from("estoque_insumos").select("tipo,quantidade"),
    sb.from("saidas").select("q10,q20,q30,q50"),
    sb.from("retornos").select("q10,q20,q30,q50")
  ]);

  const litros = (estoque.data || []).reduce((s,r) => s + Number(r.litros || 0), 0);
  const malte = (insumos.data || []).filter(i => i.tipo === "MALTE").reduce((s,r) => s + Number(r.quantidade || 0), 0);
  const lupulo = (insumos.data || []).filter(i => i.tipo === "LUPULO").reduce((s,r) => s + Number(r.quantidade || 0), 0);
  const fermento = (insumos.data || []).filter(i => i.tipo === "FERMENTO").reduce((s,r) => s + Number(r.quantidade || 0), 0);

  const barrisSaidas = (saidas.data || []).reduce((s,r) => s + somaBarris(r.q10,r.q20,r.q30,r.q50), 0);
  const barrisRetornos = (retornos.data || []).reduce((s,r) => s + somaBarris(r.q10,r.q20,r.q30,r.q50), 0);
  const barrisEmClientes = Math.max(0, barrisSaidas - barrisRetornos);

  document.getElementById("cardEstoqueCerveja").innerText = fmt(litros) + " L";
  document.getElementById("cardFermentando").innerText = (producoes.data || []).length;
  document.getElementById("cardClientes").innerText = clientes.count || 0;
  document.getElementById("cardMalte").innerText = fmt(malte, 1) + " KG";
  document.getElementById("cardLupulo").innerText = fmt(lupulo, 1) + " G";
  document.getElementById("cardFermento").innerText = fmt(fermento, 1) + " UN";
  const cardBarris = document.getElementById("cardBarrisClientes");
  if (cardBarris) cardBarris.innerText = barrisEmClientes;
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
    op.value = p.lote;
    op.textContent = `${p.lote} — ${p.cerveja_nome} (${fmt(p.litros_produzidos)}L)`;
    sel.appendChild(op);
  });
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
  const lote = document.getElementById("dryLote").value;
  const obs = document.getElementById("dryObs").value.trim();
  const itens = coletarLinhasInsumos("dryLupulos","LUPULO");

  if (!lote || !itens.length) {
    mostrarErro("dryErro", "Selecione o lote e pelo menos um lúpulo.");
    return;
  }

  const prod = state.producoesFermentando.find(p => p.lote === lote);
  if (!prod) {
    mostrarErro("dryErro", "Lote não encontrado.");
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
  const lote = document.getElementById("envaseLote")?.value;
  const prod = state.producoesFermentando.find(p => p.lote === lote);
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
  const lote = document.getElementById("envaseLote").value;
  const origem = document.getElementById("envaseOrigem").value;
  const q10 = Number(document.getElementById("envaseQ10").value || 0);
  const q20 = Number(document.getElementById("envaseQ20").value || 0);
  const q30 = Number(document.getElementById("envaseQ30").value || 0);
  const q50 = Number(document.getElementById("envaseQ50").value || 0);
  const incompleto = Number(document.getElementById("envaseIncompleto").value || 0);
  const obs = document.getElementById("envaseObs").value.trim();

  if (!lote || (somaBarris(q10,q20,q30,q50) <= 0 && incompleto <= 0)) {
    mostrarErro("envaseErro", "Selecione o lote e informe o envase.");
    return;
  }

  const prod = state.producoesFermentando.find(p => p.lote === lote);
  if (!prod) {
    mostrarErro("envaseErro", "Lote não encontrado.");
    return;
  }

  const litrosFull = litrosBarris(q10,q20,q30,q50);
  const total = litrosFull + incompleto;
  const produzido = Number(prod.litros_produzidos || 0);

  const { data: envasesAnteriores, error: envasesAnterioresErro } = await sb.from("envases")
    .select("litros_total")
    .eq("lote", lote);

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

  renderEstoqueCervejas(ec.data || []);
  renderEstoqueInsumos(ei.data || []);
  state.loaded.estoque = true;
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
        </div>
      </div>
    `);
  });
  state.loaded.clientes = true;
}

async function salvarCliente() {
  mostrarErro("cliErro", "");
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

  const { error } = await sb.from("clientes").insert(payload);
  if (error) {
    mostrarErro("cliErro", error.message);
    return;
  }

  ["cliNome","cliEstabelecimento","cliCidade","cliContato","cliObs"].forEach(id => document.getElementById(id).value = "");
  invalidar("baseCadastros","clientes","inicio","saidas");
  alert("Cliente salvo.");
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
        </div>
      </div>
    `);
  });

  state.loaded.cadastros = true;
}

async function salvarCerveja() {
  mostrarErro("cadCervejaErro", "");
  const nome = document.getElementById("cadCervejaNome").value.trim().toUpperCase();
  if (!nome) {
    mostrarErro("cadCervejaErro", "Informe o nome da cerveja.");
    return;
  }

  const { error } = await sb.from("cervejas").insert({
    nome,
    estilo: document.getElementById("cadCervejaEstilo").value.trim(),
    marca: document.getElementById("cadCervejaMarca").value.trim()
  });

  if (error) {
    mostrarErro("cadCervejaErro", error.message);
    return;
  }

  ["cadCervejaNome","cadCervejaEstilo","cadCervejaMarca"].forEach(id => document.getElementById(id).value = "");
  invalidar("baseCadastros","cadastros","estoque","producao","inicio");
  alert("Cerveja salva.");
  await carregarBaseCadastros(true);
  carregarCadastros(true);
}

function ajustarUnidade() {
  const tipo = document.getElementById("cadInsumoTipo").value;
  document.getElementById("cadInsumoUnidade").value = unidadePadrao(tipo);
}

async function salvarInsumo() {
  mostrarErro("cadInsumoErro", "");
  const tipo = document.getElementById("cadInsumoTipo").value;
  const nome = document.getElementById("cadInsumoNome").value.trim();
  const unidade = document.getElementById("cadInsumoUnidade").value;
  if (!nome) {
    mostrarErro("cadInsumoErro", "Informe o nome do insumo.");
    return;
  }

  const { error } = await sb.from("insumos").insert({
    tipo,
    nome,
    unidade,
    fornecedor_padrao: document.getElementById("cadInsumoFornecedor").value.trim(),
    estoque_minimo: Number(document.getElementById("cadInsumoMinimo").value || 0)
  });

  if (error) {
    mostrarErro("cadInsumoErro", error.message);
    return;
  }

  ["cadInsumoNome","cadInsumoFornecedor","cadInsumoMinimo"].forEach(id => document.getElementById(id).value = "");
  invalidar("baseCadastros","cadastros","estoque","producao","inicio");
  alert("Insumo salvo.");
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
      const prod = state.producoesFermentando.find(p => p.lote === lote.value);
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
  const lote = document.getElementById("coletaLote").value;
  const base = document.getElementById("coletaBase").value.trim();
  const quantidade = Number(document.getElementById("coletaQtd").value || 0);
  const observacao = document.getElementById("coletaObs").value.trim();

  if (!lote || !base || quantidade <= 0) {
    mostrarErro("coletaErro", "Informe lote, fermento base e quantidade coletada.");
    return;
  }

  const prod = state.producoesFermentando.find(p => p.lote === lote);
  if (!prod) {
    mostrarErro("coletaErro", "Lote não encontrado.");
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

  const codigo = `F-${lote}-G${geracao}-${Date.now().toString().slice(-4)}`;

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

  document.getElementById("configDiasBarrilCliente").value = getConfigNumero("dias_alerta_barril_cliente", 21);
  document.getElementById("configDiasLoteFermentando").value = getConfigNumero("dias_alerta_lote_fermentando", 10);
  document.getElementById("configDiasValidadeInsumos").value = getConfigNumero("dias_alerta_validade_insumos", 30);

  state.loaded.configuracoes = true;
}

async function salvarConfiguracoes() {
  mostrarErro("configErro", "");

  const payload = [
    { chave:"dias_alerta_barril_cliente", valor:String(Number(document.getElementById("configDiasBarrilCliente").value || 21)), atualizado_em:new Date().toISOString() },
    { chave:"dias_alerta_lote_fermentando", valor:String(Number(document.getElementById("configDiasLoteFermentando").value || 10)), atualizado_em:new Date().toISOString() },
    { chave:"dias_alerta_validade_insumos", valor:String(Number(document.getElementById("configDiasValidadeInsumos").value || 30)), atualizado_em:new Date().toISOString() }
  ];

  const { error } = await sb.from("configuracoes").upsert(payload, { onConflict:"chave" });
  if (error) {
    mostrarErro("configErro", error.message);
    return;
  }

  invalidar("configuracoes","configuracoesBase","phenomena","painelDia");
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

  const itens = [];

  const cervejasZeradas = [...estoquePorCerveja.entries()].filter(([n,q]) => q <= 0).sort((a,b)=>a[0].localeCompare(b[0],"pt-BR"));
  itens.push({ titulo:"🍺 Cervejas zeradas", linhas: cervejasZeradas.map(([n]) => n) });

  const insumosZerados = [...estoqueInsumo.values()].filter(i => Number(i.quantidade || 0) <= 0).sort((a,b)=>a.tipo.localeCompare(b.tipo) || a.nome.localeCompare(b.nome,"pt-BR"));
  itens.push({ titulo:"🌾 Insumos zerados", linhas: insumosZerados.map(i => `${i.tipo} — ${i.nome}`) });

  const insumosBaixos = [...estoqueInsumo.values()].filter(i => Number(i.quantidade || 0) > 0 && Number(i.quantidade || 0) <= Number(i.estoque_minimo || 0)).sort((a,b)=>a.tipo.localeCompare(b.tipo) || a.nome.localeCompare(b.nome,"pt-BR"));
  itens.push({ titulo:"⚠️ Insumos abaixo do mínimo", linhas: insumosBaixos.map(i => `${i.tipo} — ${i.nome}: ${fmt(i.quantidade,2)} ${i.unidade} / mínimo ${fmt(i.estoque_minimo,2)}`) });

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
    <div class="item blocoVertical"><strong>Saídas por cerveja</strong><div class="sub">${Object.entries(porCerveja).length ? Object.entries(porCerveja).sort((a,b)=>a[0].localeCompare(b[0],"pt-BR")).map(([k,v])=>`${escapeHtml(k)}: ${fmt(v)} L`).join("<br>") : "Sem saídas."}</div></div>
    <div class="item blocoVertical"><strong>Insumos consumidos</strong><div class="sub">${Object.entries(consumo).length ? Object.entries(consumo).sort((a,b)=>a[0].localeCompare(b[0],"pt-BR")).map(([k,v])=>`${escapeHtml(k)}: ${fmt(v,2)}`).join("<br>") : "Sem consumo."}</div></div>
  `;
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
    projeto: "ERP Cervejaria Supabase",
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
  prepararSelectClientes("saidaCliente");
  document.getElementById("saidaItens").innerHTML = "";
  adicionarItemSaida();
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

  const grupo_saida = crypto.randomUUID();

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
