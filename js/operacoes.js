/* ==========================================================
   ATUALIZAÇÃO OPERACIONAL COMPLETA
   ========================================================== */

const STATUS_LOTE_ATIVOS_OP = [
  "FERMENTANDO",
  "DRY_HOPPING",
  "PRONTO_ENVASE",
  "PARCIALMENTE_ENVASADO"
];

const STATUS_LOTE_OPCOES = [
  "FERMENTANDO",
  "DRY_HOPPING",
  "PRONTO_ENVASE",
  "PARCIALMENTE_ENVASADO",
  "ENVASADO",
  "FINALIZADO"
];

function rotuloStatusLote(status) {
  const mapa = {
    FERMENTANDO:"Em fermentação",
    DRY_HOPPING:"Dry hopping",
    PRONTO_ENVASE:"Pronto para envase",
    PARCIALMENTE_ENVASADO:"Parcialmente envasado",
    ENVASADO:"Envasado",
    FINALIZADO:"Finalizado"
  };
  return mapa[status] || status || "-";
}

function classeStatusLote(status) {
  const mapa = {
    FERMENTANDO:"status-fermentando",
    DRY_HOPPING:"status-dry",
    PRONTO_ENVASE:"status-pronto",
    PARCIALMENTE_ENVASADO:"status-parcial",
    ENVASADO:"status-envasado",
    FINALIZADO:"status-finalizado"
  };
  return mapa[status] || "";
}

/* -----------------------------
   PROTEÇÃO DOS FORMULÁRIOS
   ----------------------------- */

function instalarProtecaoFormularios() {
  document.querySelectorAll('.formBox[data-proteger="1"]').forEach(form => {
    if (form.dataset.listenerProtecao === "1") return;

    const marcar = () => {
      form.dataset.sujo = "1";
      form.classList.add("formDirty");
      if (form.id === "formProducao") atualizarResumoProducao();
    };

    form.addEventListener("input", marcar);
    form.addEventListener("change", marcar);
    form.dataset.listenerProtecao = "1";
  });
}

function marcarFormularioLimpo(id) {
  const form = document.getElementById(id);
  if (!form) return;
  form.dataset.sujo = "0";
  form.classList.remove("formDirty");
}

function formularioProtegidoAbertoSujo() {
  return [...document.querySelectorAll('.formBox[data-proteger="1"]')]
    .find(f => f.style.display === "block" && f.dataset.sujo === "1");
}

function confirmarDescartarFormulario(form) {
  if (!form || form.dataset.sujo !== "1") return true;
  return confirm("Existem dados preenchidos que ainda não foram salvos. Deseja descartá-los?");
}

function toggleForm(id) {
  const el = document.getElementById(id);
  if (!el) return;

  const aberto = el.style.display === "block";
  const outroSujo = formularioProtegidoAbertoSujo();

  if (aberto && !confirmarDescartarFormulario(el)) return;
  if (!aberto && outroSujo && outroSujo !== el && !confirmarDescartarFormulario(outroSujo)) return;

  document.querySelectorAll(".formBox").forEach(f => {
    f.style.display = "none";
  });

  el.style.display = aberto ? "none" : "block";

  if (aberto) {
    marcarFormularioLimpo(id);
    return;
  }

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

  instalarProtecaoFormularios();
  marcarFormularioLimpo(id);
}


/* -----------------------------
   PRODUÇÃO MAIS PRÁTICA
   ----------------------------- */

async function prepararFormProducao() {
  prepararSelectCervejas("prodCerveja");
  prepararSelectInsumos("prodFermento","FERMENTO","Sem fermento");

  await carregarFermentosReusoBase(true);
  prepararSelectFermentosReuso("prodFermentoReuso", "Selecionar fermento reutilizável...");
  alternarTipoFermentoProducao();

  if (!document.querySelector("#prodMaltes .linhaInsumo")) {
    adicionarLinhaInsumo("prodMaltes","MALTE");
  }

  if (!document.querySelector("#prodLupulos .linhaInsumo")) {
    adicionarLinhaInsumo("prodLupulos","LUPULO");
  }

  atualizarResumoProducao();
  instalarProtecaoFormularios();
}

function atualizarResumoProducao() {
  const box = document.getElementById("prodResumo");
  if (!box) return;

  const lote = document.getElementById("prodLote")?.value.trim() || "-";
  const cerveja = document.getElementById("prodCerveja")?.value || "Não selecionada";
  const litros = Number(document.getElementById("prodLitros")?.value || 0);
  const maltes = coletarLinhasInsumos("prodMaltes","MALTE");
  const lupulos = coletarLinhasInsumos("prodLupulos","LUPULO");
  const tipoFermento = document.getElementById("prodFermentoTipo")?.value || "ESTOQUE";
  const fermento = tipoFermento === "REUSO"
    ? document.getElementById("prodFermentoReuso")?.selectedOptions?.[0]?.textContent || "Não selecionado"
    : document.getElementById("prodFermento")?.value || "Não selecionado";

  box.innerHTML = `
    <strong>Resumo da produção</strong>
    <div class="envaseSaldoGrid">
      <div><span>Cerveja</span><strong>${escapeHtml(cerveja)}</strong></div>
      <div><span>Lote</span><strong>${escapeHtml(lote)}</strong></div>
      <div><span>Volume</span><strong>${fmt(litros)} L</strong></div>
      <div><span>Insumos</span><strong>${maltes.length} malte(s) • ${lupulos.length} lúpulo(s)</strong></div>
    </div>
    <div class="sub" style="margin-top:7px;">Fermento: ${escapeHtml(fermento)}</div>
  `;
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
  const fermento = fermentoNome && fermentoQtd > 0
    ? state.insumos.find(i => i.tipo === "FERMENTO" && i.nome === fermentoNome)
    : null;

  const fermentoReusoId = document.getElementById("prodFermentoReuso").value;
  const fermentoReusoQtd = Number(document.getElementById("prodFermentoReusoQtd").value || 0);
  const fermentoReuso = state.fermentosReuso.find(f => f.id === fermentoReusoId);
  const insumosParaValidar = [...maltes, ...lupulos];

  if (tipoFermentoProducao === "ESTOQUE" && fermentoNome && fermentoQtd > 0) {
    insumosParaValidar.push({
      tipo:"FERMENTO",
      nome:fermentoNome,
      quantidade:fermentoQtd,
      unidade:fermento ? fermento.unidade : "UN",
      insumo_id:fermento ? fermento.id : null
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

  const { data:loteExistente, error:loteExistenteErro } = await sb
    .from("producoes")
    .select("id,lote,cerveja_nome")
    .eq("cerveja_nome", cerveja_nome)
    .eq("lote", lote)
    .limit(1);

  if (loteExistenteErro) {
    mostrarErro("prodErro", loteExistenteErro.message);
    return;
  }

  if (loteExistente?.length) {
    mostrarErro(
      "prodErro",
      `A cerveja ${cerveja_nome} já possui o lote ${lote}.`
    );
    return;
  }

  const fermentoResumo = tipoFermentoProducao === "REUSO"
    ? `${fermentoReuso?.codigo || "Fermento reutilizável"}: ${fmt(fermentoReusoQtd,3)}`
    : fermentoNome
      ? `${fermentoNome}: ${fmt(fermentoQtd,3)}`
      : "Sem fermento informado";

  let resumo = `CONFIRMAR PRODUÇÃO\n\n`;
  resumo += `${cerveja_nome} — lote ${lote}\n`;
  resumo += `Volume: ${fmt(litros_produzidos)} L\n`;
  resumo += `Maltes: ${maltes.length ? maltes.map(i => `${i.nome} ${fmt(i.quantidade,3)} ${i.unidade}`).join(", ") : "nenhum"}\n`;
  resumo += `Lúpulos: ${lupulos.length ? lupulos.map(i => `${i.nome} ${fmt(i.quantidade,3)} ${i.unidade}`).join(", ") : "nenhum"}\n`;
  resumo += `Fermento: ${fermentoResumo}\n`;

  if (!confirm(resumo)) return;

  const fermentoTipoSalvar = tipoFermentoProducao === "REUSO"
    ? "REUSO"
    : fermentoNome ? "ESTOQUE" : null;

  const fermentoNomeSalvar = tipoFermentoProducao === "REUSO"
    ? fermentoReuso?.codigo || "FERMENTO REUSO"
    : fermentoNome || null;

  const btn = document.getElementById("producaoSalvarBtn");
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Registrando produção...";
  }

  try {
    const { error } = await sb.rpc("erp_registrar_producao", {
      p_lote:lote,
      p_cerveja_nome:cerveja_nome,
      p_litros_produzidos:litros_produzidos,
      p_observacao:observacao || null,
      p_fermento_tipo:fermentoTipoSalvar,
      p_fermento_nome:fermentoNomeSalvar,
      p_fermento_reuso_id:tipoFermentoProducao === "REUSO"
        ? fermentoReusoId
        : null,
      p_fermento_reuso_quantidade:tipoFermentoProducao === "REUSO"
        ? fermentoReusoQtd
        : 0,
      p_insumos:insumosParaValidar.map(item => ({
        tipo:item.tipo,
        nome:item.nome,
        quantidade:item.quantidade,
        unidade:item.unidade
      }))
    });

    if (error) throw error;
  } catch(e) {
    const mensagem = String(
      e?.message || e || "Não foi possível registrar a produção."
    );
    mostrarErro(
      "prodErro",
      mensagem.includes("erp_registrar_producao")
        ? "A atualização SQL 10 de integridade ainda não foi aplicada no Supabase."
        : mensagem
    );
    return;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = "Conferir e salvar produção";
    }
  }

  ["prodLote","prodLitros","prodObs","prodFermentoQtd","prodFermentoReusoQtd"]
    .forEach(id => document.getElementById(id).value = "");

  document.getElementById("prodCerveja").value = "";
  document.getElementById("prodFermento").value = "";
  document.getElementById("prodFermentoReuso").value = "";
  document.getElementById("prodMaltes").innerHTML = "";
  document.getElementById("prodLupulos").innerHTML = "";
  adicionarLinhaInsumo("prodMaltes","MALTE");
  adicionarLinhaInsumo("prodLupulos","LUPULO");

  marcarFormularioLimpo("formProducao");
  atualizarResumoProducao();

  invalidar(
    "producao","producoesFermentando","estoque","inicio",
    "lotes","painelDia","auditoria"
  );

  alert("Produção salva e insumos baixados.");
  carregarProducao(true);
  carregarInicio(true);
}

/* -----------------------------
   STATUS DOS LOTES
   ----------------------------- */

async function carregarProducoesFermentando(force=false) {
  if (state.loaded.producoesFermentando && !force) return;

  const { data, error } = await sb.from("producoes")
    .select("*")
    .in("status", STATUS_LOTE_ATIVOS_OP)
    .order("data_producao", { ascending:false });

  state.producoesFermentando = error ? [] : data || [];
  state.loaded.producoesFermentando = true;
}

async function alterarStatusLote(id, novoStatus) {
  if (!STATUS_LOTE_OPCOES.includes(novoStatus)) return;

  const lote = (
    state.lotes?.find(l => l.id === id) ||
    state.producoesFermentando?.find(l => l.id === id)
  );

  if (!lote) return;

  if (novoStatus === "FINALIZADO") {
    const ok = confirm(
      `Finalizar ${lote.cerveja_nome} — lote ${lote.lote}?`
    );
    if (!ok) return;
  }

  const { error } = await sb.from("producoes")
    .update({ status:novoStatus })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await sb.from("movimentacoes").insert({
    tipo:"STATUS LOTE",
    categoria:"PRODUCAO",
    item_nome:lote.cerveja_nome,
    quantidade:0,
    unidade:"",
    lote:lote.lote,
    observacao:`Status alterado para ${rotuloStatusLote(novoStatus)}`
  });

  invalidar(
    "producao","producoesFermentando","lotes",
    "inicio","painelDia","auditoria"
  );

  if (document.getElementById("telaLotes")?.classList.contains("active")) {
    await carregarLotes(true);
  }

  if (document.getElementById("telaProducao")?.classList.contains("active")) {
    await carregarProducao(true);
  }
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

  const btn = document.getElementById("dryHopSalvarBtn");
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Registrando dry hopping...";
  }

  try {
    const { error } = await sb.rpc("erp_registrar_dry_hopping", {
      p_producao_id:prod.id,
      p_itens:itens.map(item => ({
        nome:item.nome,
        quantidade:item.quantidade,
        unidade:item.unidade
      })),
      p_observacao:obs || null
    });

    if (error) throw error;
  } catch(e) {
    const mensagem = String(
      e?.message || e || "Não foi possível registrar o dry hopping."
    );
    mostrarErro(
      "dryErro",
      mensagem.includes("erp_registrar_dry_hopping")
        ? "A atualização SQL 10 de integridade ainda não foi aplicada no Supabase."
        : mensagem
    );
    return;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = "Salvar dry hopping";
    }
  }

  document.getElementById("dryObs").value = "";
  document.getElementById("dryLupulos").innerHTML = "";
  adicionarLinhaInsumo("dryLupulos","LUPULO");
  marcarFormularioLimpo("formDryHop");

  invalidar(
    "estoque","inicio","producao","producoesFermentando",
    "lotes","painelDia","auditoria"
  );

  alert("Dry hopping registrado e status atualizado.");
  carregarProducao(true);
}

function renderProducoes() {
  const box = document.getElementById("listaProducoes");

  box.innerHTML = state.producoesFermentando.length
    ? ""
    : '<div class="item"><span class="sub">Nenhuma cerveja em produção.</span></div>';

  state.producoesFermentando.forEach(p => {
    const dias = Math.max(
      0,
      Math.floor(
        (new Date() - new Date(p.data_producao + "T00:00:00")) / 86400000
      )
    );

    box.insertAdjacentHTML("beforeend", `
      <div class="item searchable">
        <div>
          <strong>${escapeHtml(p.cerveja_nome)} — lote ${escapeHtml(p.lote)}</strong>
          <div class="sub">${fmt(p.litros_produzidos)} L • Produzida em ${dataBR(p.data_producao)} • ${dias} dia(s)</div>
          <div class="loteStatusActions">
            ${
              ["FERMENTANDO","DRY_HOPPING"].includes(p.status)
                ? `<button class="btnTiny btnEdit" onclick="alterarStatusLote('${p.id}','PRONTO_ENVASE')">Pronto para envase</button>`
                : ""
            }
            ${
              ["PRONTO_ENVASE","PARCIALMENTE_ENVASADO"].includes(p.status)
                ? `<button class="btnTiny btnEdit" onclick="abrirEnvaseDoLote('${p.id}')">Registrar envase</button>`
                : ""
            }
            <button class="btnTiny" onclick="abrirFichaLoteDaProducao('${p.id}')">Ver ficha</button>
          </div>
        </div>
        <span class="statusBadge ${classeStatusLote(p.status)}">${escapeHtml(rotuloStatusLote(p.status))}</span>
      </div>
    `);
  });
}

async function abrirFichaLoteDaProducao(id) {
  mostrarTela("lotes");
  await carregarLotes(true);
  abrirFichaLote(id);
}

async function abrirEnvaseDoLote(id) {
  mostrarTela("producao");

  const form = document.getElementById("formEnvase");
  document.querySelectorAll(".formBox").forEach(f => f.style.display = "none");
  form.style.display = "block";

  await prepararFormEnvase();
  document.getElementById("envaseLote").value = id;
  await carregarSaldoEnvaseSelecionado();

  form.scrollIntoView({ behavior:"smooth", block:"start" });
}

/* -----------------------------
   ENVASE DETALHADO E PARCIAL
   ----------------------------- */

async function prepararFormEnvase() {
  prepararSelectLotes("envaseLote");
  state.envaseSaldoAtual = null;

  [
    "envaseQ10","envaseQ20","envaseQ30","envaseQ50",
    "envaseIncompleto","envaseBarProprio","envasePerdaInformada"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = "0";
  });

  const tamanhoIncompleto = document.getElementById("envaseIncompletoTamanho");
  const codigoIncompleto = document.getElementById("envaseIncompletoCodigo");
  if (tamanhoIncompleto) tamanhoIncompleto.value = "";
  if (codigoIncompleto) codigoIncompleto.value = "";

  atualizarResumoEnvase();
  instalarProtecaoFormularios();
}

async function carregarSaldoEnvaseSelecionado() {
  const prod = getProducaoSelecionada("envaseLote");

  if (!prod) {
    state.envaseSaldoAtual = null;
    atualizarResumoEnvase();
    return;
  }

  const { data, error } = await sb.from("envases")
    .select("*")
    .eq("producao_id", prod.id)
    .order("criado_em", { ascending:true });

  if (error) {
    mostrarErro("envaseErro", error.message);
    return;
  }

  const anteriores = data || [];
  const jaEnvasado = anteriores.reduce(
    (s,e) => s + Number(e.litros_total || 0),
    0
  );

  const perdasAnteriores = anteriores.reduce(
    (s,e) => s + Number(
      e.perda_informada !== undefined && e.perda_informada !== null
        ? e.perda_informada
        : e.perda || 0
    ),
    0
  );

  const produzido = Number(prod.litros_produzidos || 0);
  const saldo = Math.max(0, produzido - jaEnvasado - perdasAnteriores);

  state.envaseSaldoAtual = {
    prod,
    anteriores,
    produzido,
    jaEnvasado,
    perdasAnteriores,
    saldo
  };

  atualizarResumoEnvase();
}

function atualizarResumoEnvase() {
  const el = document.getElementById("envaseResumo");
  if (!el) return;

  const saldoInfo = state.envaseSaldoAtual;
  const prod = getProducaoSelecionada("envaseLote");

  if (!prod || !saldoInfo || saldoInfo.prod.id !== prod.id) {
    el.classList.remove("alertaErro");
    el.innerHTML = "Selecione o lote para ver o saldo.";
    return;
  }

  const litrosBarrisCompletos = litrosBarris(
    document.getElementById("envaseQ10")?.value,
    document.getElementById("envaseQ20")?.value,
    document.getElementById("envaseQ30")?.value,
    document.getElementById("envaseQ50")?.value
  );

  const incompleto = Number(
    document.getElementById("envaseIncompleto")?.value || 0
  );

  const tamanhoIncompleto = Number(
    document.getElementById("envaseIncompletoTamanho")?.value || 0
  );

  const codigoIncompleto = String(
    document.getElementById("envaseIncompletoCodigo")?.value || ""
  ).trim();

  const barProprio = Number(
    document.getElementById("envaseBarProprio")?.value || 0
  );

  const perdaDigitada = Number(
    document.getElementById("envasePerdaInformada")?.value || 0
  );

  const finalizar = !!document.getElementById("envaseFinalizarLote")?.checked;
  const totalEnvaseAtual = litrosBarrisCompletos + incompleto + barProprio;
  const consumoInformado = totalEnvaseAtual + perdaDigitada;
  const excesso = Math.max(0, consumoInformado - saldoInfo.saldo);

  let perdaFinal = perdaDigitada;
  if (finalizar && excesso <= 0) {
    perdaFinal = Math.max(
      perdaDigitada,
      saldoInfo.saldo - totalEnvaseAtual
    );
  }

  const saldoDepois = Math.max(
    0,
    saldoInfo.saldo - totalEnvaseAtual - perdaFinal
  );

  if (excesso > 0) el.classList.add("alertaErro");
  else el.classList.remove("alertaErro");

  el.innerHTML = `
    <strong>${excesso > 0 ? "ATENÇÃO: volume maior que o saldo" : "Resumo do envase"}</strong>
    <div class="envaseSaldoGrid">
      <div><span>Produzido</span><strong>${fmt(saldoInfo.produzido)} L</strong></div>
      <div><span>Já envasado</span><strong>${fmt(saldoInfo.jaEnvasado)} L</strong></div>
      <div><span>Saldo antes</span><strong>${fmt(saldoInfo.saldo)} L</strong></div>
      <div><span>Envase atual</span><strong>${fmt(totalEnvaseAtual)} L</strong></div>
      <div><span>Perda deste envase</span><strong>${fmt(perdaFinal)} L</strong></div>
      <div><span>Saldo depois</span><strong>${fmt(saldoDepois)} L</strong></div>
    </div>
    <div class="sub" style="margin-top:7px;">
      Barris completos: ${fmt(litrosBarrisCompletos)} L •
      Barril incompleto: ${
        incompleto > 0
          ? `${fmt(incompleto)} L${tamanhoIncompleto ? ` em barril de ${fmt(tamanhoIncompleto)} L` : " — selecione o tamanho"}${codigoIncompleto ? ` • código ${escapeHtml(codigoIncompleto)}` : ""}`
          : "0 L"
      } •
      Bar próprio: ${fmt(barProprio)} L
    </div>
    ${excesso > 0 ? `<div class="erro" style="display:block;">Excesso: ${fmt(excesso)} L</div>` : ""}
  `;

  state.envaseCalculoAtual = {
    litrosBarrisCompletos,
    incompleto,
    tamanhoIncompleto,
    codigoIncompleto,
    barProprio,
    perdaDigitada,
    perdaFinal,
    totalEnvaseAtual,
    saldoDepois,
    excesso,
    finalizar
  };
}


/* -----------------------------
   LISTA, STATUS E LINHA DO TEMPO
   ----------------------------- */

function mostrarSubLotes(tipo) {
  state.filtroLotes = tipo;

  document.querySelectorAll("#telaLotes .tab")
    .forEach(t => t.classList.remove("active"));

  const idx = tipo === "todos"
    ? 0
    : tipo === "andamento"
      ? 1
      : tipo === "envasados"
        ? 2
        : 3;

  document.querySelectorAll("#telaLotes .tab")[idx]?.classList.add("active");
  renderListaLotes();
}

function renderResumoLotes() {
  const total = state.lotes.length;
  const andamento = state.lotes.filter(
    l => STATUS_LOTE_ATIVOS_OP.includes(l.status)
  ).length;
  const parciais = state.lotes.filter(
    l => l.status === "PARCIALMENTE_ENVASADO"
  ).length;
  const envasados = state.lotes.filter(
    l => l.status === "ENVASADO"
  ).length;
  const finalizados = state.lotes.filter(
    l => l.status === "FINALIZADO"
  ).length;

  const box = document.getElementById("resumoLotes");
  if (!box) return;

  box.innerHTML = `
    <div class="card"><span>Total de lotes</span><strong>${total}</strong></div>
    <div class="card"><span>Em andamento</span><strong>${andamento}</strong></div>
    <div class="card"><span>Parcialmente envasados</span><strong>${parciais}</strong></div>
    <div class="card"><span>Envasados</span><strong>${envasados}</strong></div>
    <div class="card"><span>Finalizados</span><strong>${finalizados}</strong></div>
  `;
}

function renderListaLotes() {
  const box = document.getElementById("listaLotes");
  if (!box) return;

  let lista = [...state.lotes];

  if (state.filtroLotes === "andamento") {
    lista = lista.filter(l => STATUS_LOTE_ATIVOS_OP.includes(l.status));
  }

  if (state.filtroLotes === "envasados") {
    lista = lista.filter(l => l.status === "ENVASADO");
  }

  if (state.filtroLotes === "finalizados") {
    lista = lista.filter(l => l.status === "FINALIZADO");
  }

  box.innerHTML = lista.length
    ? ""
    : '<div class="item"><span class="sub">Nenhum lote encontrado.</span></div>';

  lista.forEach(l => {
    const dias = l.data_producao
      ? Math.max(
          0,
          Math.floor(
            (new Date() - new Date(l.data_producao + "T00:00:00")) / 86400000
          )
        )
      : 0;

    box.insertAdjacentHTML("beforeend", `
      <div class="item searchable">
        <div>
          <strong>${escapeHtml(l.cerveja_nome)} — lote ${escapeHtml(l.lote)}</strong>
          <div class="sub">${fmt(l.litros_produzidos)} L • ${dataBR(l.data_producao)} • ${dias} dia(s)</div>
          <div class="loteStatusActions">
            <button class="btnTiny btnEdit" onclick="abrirFichaLote('${l.id}')">Ver ficha e linha do tempo</button>
            ${
              ["PRONTO_ENVASE","PARCIALMENTE_ENVASADO"].includes(l.status)
                ? `<button class="btnTiny" onclick="abrirEnvaseDoLote('${l.id}')">Registrar envase</button>`
                : ""
            }
          </div>
        </div>
        <span class="statusBadge ${classeStatusLote(l.status)}">${escapeHtml(rotuloStatusLote(l.status))}</span>
      </div>
    `);
  });
}

function montarLinhaDoTempoLote(lote, insumosRows, dryRows, envaseRows, fermentoRows, movimentosRows) {
  const eventos = [];

  eventos.push({
    data:lote.criado_em || lote.data_producao,
    titulo:"Produção registrada",
    texto:`${fmt(lote.litros_produzidos)} L produzidos`,
    ordem:dataParaOrdenacao(lote.criado_em || lote.data_producao)
  });

  const insumosProducao = insumosRows.filter(i => i.etapa === "PRODUCAO");
  if (insumosProducao.length) {
    eventos.push({
      data:insumosProducao[0].criado_em || lote.data_producao,
      titulo:"Insumos consumidos",
      texto:insumosProducao
        .map(i => `${i.insumo_nome}: ${fmt(i.quantidade,3)} ${i.unidade}`)
        .join(" • "),
      ordem:dataParaOrdenacao(insumosProducao[0].criado_em || lote.data_producao) + 1
    });
  }

  dryRows.forEach(d => eventos.push({
    data:d.criado_em || d.data_dry_hopping,
    titulo:"Dry hopping",
    texto:`${d.lupulo_nome}: ${fmt(d.quantidade,3)} ${d.unidade || "G"}${d.observacao ? " • " + d.observacao : ""}`,
    ordem:dataParaOrdenacao(d.criado_em || d.data_dry_hopping)
  }));

  fermentoRows.forEach(f => eventos.push({
    data:f.criado_em,
    titulo:`Fermento — ${f.acao}`,
    texto:`${f.cerveja_nome || lote.cerveja_nome} • ${fmt(f.quantidade,3)}${f.observacao ? " • " + f.observacao : ""}`,
    ordem:dataParaOrdenacao(f.criado_em)
  }));

  envaseRows.forEach(e => {
    const incompleto = Number(
      e.litros_incompleto !== undefined && e.litros_incompleto !== null
        ? e.litros_incompleto
        : e.litros_incompleto_bar || 0
    );

    const tamanhoIncompleto = Number(e.barril_incompleto_tamanho || 0);
    const codigoIncompleto = String(e.barril_incompleto_codigo || "").trim();
    const bar = Number(e.litros_bar_proprio || 0);

    eventos.push({
      data:e.criado_em || e.data_envase,
      titulo:e.finalizado ? "Envase final" : "Envase",
      texto:[
        `${fmt(e.litros_total)} L no total`,
        `${fmt(e.litros_barris)} L em barris completos`,
        incompleto > 0
          ? `${fmt(incompleto)} L no barril incompleto${tamanhoIncompleto ? ` de ${fmt(tamanhoIncompleto)} L` : ""}${codigoIncompleto ? `, código ${codigoIncompleto}` : ""}`
          : "",
        bar > 0 ? `${fmt(bar)} L para o bar próprio` : "",
        Number(e.perda || 0) > 0 ? `${fmt(e.perda)} L de perda` : "",
        e.saldo_apos !== undefined && e.saldo_apos !== null
          ? `saldo ${fmt(e.saldo_apos)} L`
          : ""
      ].filter(Boolean).join(" • "),
      ordem:dataParaOrdenacao(e.criado_em || e.data_envase)
    });
  });

  movimentosRows
    .filter(m => m.tipo === "STATUS LOTE")
    .forEach(m => eventos.push({
      data:m.criado_em,
      titulo:"Mudança de status",
      texto:m.observacao || "",
      ordem:dataParaOrdenacao(m.criado_em)
    }));

  return eventos.sort((a,b) => a.ordem - b.ordem);
}

async function abrirFichaLote(id) {
  const lote = state.lotes.find(l => l.id === id);
  if (!lote) return;

  const box = document.getElementById("fichaLoteBox");
  const conteudo = document.getElementById("fichaLoteConteudo");

  box.style.display = "block";
  conteudo.innerHTML = '<div class="muted">Carregando ficha...</div>';

  const [insumos, dry, envases, fermentoHist, movimentos] = await Promise.all([
    sb.from("producao_insumos")
      .select("*")
      .eq("producao_id", id)
      .order("criado_em", { ascending:true }),

    sb.from("dry_hopping")
      .select("*")
      .eq("producao_id", id)
      .order("criado_em", { ascending:true }),

    sb.from("envases")
      .select("*")
      .eq("producao_id", id)
      .order("criado_em", { ascending:true }),

    sb.from("fermento_historico")
      .select("*")
      .eq("lote", lote.lote)
      .eq("cerveja_nome", lote.cerveja_nome)
      .order("criado_em", { ascending:true }),

    sb.from("movimentacoes")
      .select("*")
      .eq("lote", lote.lote)
      .order("criado_em", { ascending:true })
  ]);

  const insumosRows = insumos.data || [];
  const dryRows = dry.data || [];
  const envaseRows = envases.data || [];
  const fermentoRows = fermentoHist.data || [];
  const movimentosRows = movimentos.data || [];

  const totalEnvase = envaseRows.reduce(
    (s,e) => s + Number(e.litros_total || 0),
    0
  );

  const totalBarris = envaseRows.reduce(
    (s,e) => s + Number(e.litros_barris || 0),
    0
  );

  const totalIncompleto = envaseRows.reduce(
    (s,e) => s + Number(
      e.litros_incompleto !== undefined && e.litros_incompleto !== null
        ? e.litros_incompleto
        : e.litros_incompleto_bar || 0
    ),
    0
  );

  const totalBar = envaseRows.reduce(
    (s,e) => s + Number(e.litros_bar_proprio || 0),
    0
  );

  const totalPerda = envaseRows.reduce(
    (s,e) => s + Number(e.perda || 0),
    0
  );

  const saldo = Math.max(
    0,
    Number(lote.litros_produzidos || 0) - totalEnvase - totalPerda
  );

  const rendimento = Number(lote.litros_produzidos || 0) > 0
    ? totalEnvase / Number(lote.litros_produzidos || 0) * 100
    : 0;

  const agrupaInsumos = {};
  insumosRows.forEach(i => {
    const k = `${i.etapa || "PRODUCAO"}|${i.tipo}|${i.insumo_nome}|${i.unidade}`;
    agrupaInsumos[k] = (agrupaInsumos[k] || 0) + Number(i.quantidade || 0);
  });

  const linhasInsumos = Object.entries(agrupaInsumos).map(([k,v]) => {
    const [etapa,tipo,nome,unidade] = k.split("|");
    return `${etapa} • ${tipo} — ${nome}: ${fmt(v,3)} ${unidade}`;
  });

  const timeline = montarLinhaDoTempoLote(
    lote,
    insumosRows,
    dryRows,
    envaseRows,
    fermentoRows,
    movimentosRows
  );

  conteudo.innerHTML = `
    <div class="loteFichaTitulo">${escapeHtml(lote.cerveja_nome)} — lote ${escapeHtml(lote.lote)}</div>
    <div class="muted">Produzido em ${dataBR(lote.data_producao)} • ${fmt(lote.litros_produzidos)} L</div>

    <div class="loteStatusActions">
      <span class="statusBadge ${classeStatusLote(lote.status)}">${escapeHtml(rotuloStatusLote(lote.status))}</span>
      <select onchange="alterarStatusLote('${lote.id}',this.value)">
        ${STATUS_LOTE_OPCOES.map(s => `
          <option value="${s}" ${s === lote.status ? "selected" : ""}>
            ${rotuloStatusLote(s)}
          </option>
        `).join("")}
      </select>
      ${
        ["PRONTO_ENVASE","PARCIALMENTE_ENVASADO"].includes(lote.status)
          ? `<button class="btnTiny btnEdit" onclick="abrirEnvaseDoLote('${lote.id}')">Registrar envase</button>`
          : ""
      }
    </div>

    <div class="gridCards" style="margin-top:12px;">
      <div class="card"><span>Produzido</span><strong>${fmt(lote.litros_produzidos)} L</strong></div>
      <div class="card"><span>Envasado</span><strong>${fmt(totalEnvase)} L</strong></div>
      <div class="card"><span>Saldo</span><strong>${fmt(saldo)} L</strong></div>
      <div class="card"><span>Perda</span><strong>${fmt(totalPerda)} L</strong></div>
      <div class="card"><span>Rendimento</span><strong>${fmt(rendimento,1)}%</strong></div>
    </div>

    <div class="fichaGrid">
      <div class="fichaSecao">
        <h4>Insumos usados</h4>
        <div class="sub">${
          linhasInsumos.length
            ? linhasInsumos.map(escapeHtml).join("<br>")
            : "Nenhum insumo registrado."
        }</div>
      </div>

      <div class="fichaSecao">
        <h4>Resumo de envase</h4>
        <div class="sub">
          Barris completos: ${fmt(totalBarris)} L<br>
          Barril incompleto: ${fmt(totalIncompleto)} L<br>
          Bar próprio: ${fmt(totalBar)} L<br>
          Total envasado: ${fmt(totalEnvase)} L<br>
          Perda: ${fmt(totalPerda)} L<br>
          Saldo: ${fmt(saldo)} L
        </div>
      </div>

      <div class="fichaSecao">
        <h4>Fermento</h4>
        <div class="sub">
          Tipo: ${escapeHtml(lote.fermento_tipo || "-")}<br>
          Nome/código: ${escapeHtml(lote.fermento_nome || "-")}
        </div>
      </div>

      <div class="fichaSecao">
        <h4>Observação</h4>
        <div class="sub">${escapeHtml(lote.observacao || "-")}</div>
      </div>
    </div>

    <h3>Linha do tempo</h3>
    <div class="timeline">
      ${
        timeline.length
          ? timeline.map(e => `
              <div class="timelineItem">
                <span class="timelineDot"></span>
                <div class="timelineTitle">${escapeHtml(e.titulo)}</div>
                <div class="timelineDate">${
                  String(e.data || "").includes("T")
                    ? dataHoraBR(e.data)
                    : dataBR(e.data)
                }</div>
                <div class="timelineText">${escapeHtml(e.texto || "")}</div>
              </div>
            `).join("")
          : '<div class="sub">Nenhum evento registrado.</div>'
      }
    </div>
  `;

  box.scrollIntoView({ behavior:"smooth", block:"start" });
}

/* -----------------------------
   CONFERÊNCIA FÍSICA
   ----------------------------- */

async function prepararFormAjusteCerveja() {
  prepararSelectCervejas("ajusteCerveja");
  await atualizarConferenciaCerveja();
}

async function atualizarConferenciaCerveja() {
  const cerveja = document.getElementById("ajusteCerveja")?.value;
  const origem = document.getElementById("ajusteCervejaOrigem")?.value;
  const box = document.getElementById("ajusteCervejaSistema");

  if (!cerveja || !origem) {
    if (box) box.innerText = "Selecione cerveja e origem.";
    return;
  }

  const { data, error } = await sb.from("estoque_cerveja")
    .select("*")
    .eq("cerveja_nome", cerveja)
    .eq("origem", origem)
    .limit(1);

  if (error) {
    box.innerText = error.message;
    return;
  }

  const atual = data?.[0] || {
    q10:0,q20:0,q30:0,q50:0,litros:0
  };

  state.conferenciaCervejaAtual = atual;

  document.getElementById("ajusteCervQ10").value = Number(atual.q10 || 0);
  document.getElementById("ajusteCervQ20").value = Number(atual.q20 || 0);
  document.getElementById("ajusteCervQ30").value = Number(atual.q30 || 0);
  document.getElementById("ajusteCervQ50").value = Number(atual.q50 || 0);

  box.innerHTML = `
    <strong>Esperado pelo sistema: ${fmt(atual.litros)} L</strong>
    <div class="sub">
      10L=${atual.q10 || 0} •
      20L=${atual.q20 || 0} •
      30L=${atual.q30 || 0} •
      50L=${atual.q50 || 0}
    </div>
  `;

  calcularDiferencaConferenciaCerveja();
}

function calcularDiferencaConferenciaCerveja() {
  const atual = state.conferenciaCervejaAtual || { litros:0 };
  const contado = litrosBarris(
    document.getElementById("ajusteCervQ10")?.value,
    document.getElementById("ajusteCervQ20")?.value,
    document.getElementById("ajusteCervQ30")?.value,
    document.getElementById("ajusteCervQ50")?.value
  );

  const dif = contado - Number(atual.litros || 0);
  const cls = dif > 0 ? "diffPos" : dif < 0 ? "diffNeg" : "diffZero";

  document.getElementById("ajusteCervejaDiferenca").innerHTML = `
    Contado: <strong>${fmt(contado)} L</strong> •
    Diferença: <span class="${cls}">${dif > 0 ? "+" : ""}${fmt(dif)} L</span>
  `;
}

async function prepararFormAjusteInsumo() {
  popularAjusteInsumos();
  await atualizarConferenciaInsumo();
}

async function atualizarConferenciaInsumo() {
  const tipo = document.getElementById("ajusteInsumoTipo")?.value;
  const nome = document.getElementById("ajusteInsumoNome")?.value;
  const box = document.getElementById("ajusteInsumoSistema");

  if (!nome) {
    if (box) box.innerText = "Selecione um insumo.";
    return;
  }

  const { data, error } = await sb.from("estoque_insumos")
    .select("*")
    .eq("tipo", tipo)
    .eq("nome", nome)
    .limit(1);

  if (error) {
    box.innerText = error.message;
    return;
  }

  const atual = data?.[0] || {
    quantidade:0,
    unidade:unidadePadrao(tipo)
  };

  state.conferenciaInsumoAtual = atual;
  document.getElementById("ajusteInsumoQtd").value = Number(atual.quantidade || 0);

  box.innerHTML = `
    <strong>Esperado pelo sistema: ${fmt(atual.quantidade,3)} ${escapeHtml(atual.unidade || "")}</strong>
  `;

  calcularDiferencaConferenciaInsumo();
}

function calcularDiferencaConferenciaInsumo() {
  const atual = state.conferenciaInsumoAtual || {
    quantidade:0,
    unidade:""
  };

  const contado = Number(
    document.getElementById("ajusteInsumoQtd")?.value || 0
  );

  const dif = contado - Number(atual.quantidade || 0);
  const cls = dif > 0 ? "diffPos" : dif < 0 ? "diffNeg" : "diffZero";

  document.getElementById("ajusteInsumoDiferenca").innerHTML = `
    Contado: <strong>${fmt(contado,3)} ${escapeHtml(atual.unidade || "")}</strong> •
    Diferença: <span class="${cls}">${dif > 0 ? "+" : ""}${fmt(dif,3)} ${escapeHtml(atual.unidade || "")}</span>
  `;
}

function renderHistoricoConferencias(rows) {
  const box = document.getElementById("historicoConferencias");
  if (!box) return;

  box.innerHTML = rows.length
    ? ""
    : '<div class="item"><span class="sub">Nenhuma conferência registrada.</span></div>';

  rows.forEach(a => {
    const dif = Number(a.diferenca || 0);
    const cls = dif > 0 ? "diffPos" : dif < 0 ? "diffNeg" : "diffZero";

    box.insertAdjacentHTML("beforeend", `
      <div class="item searchable">
        <div>
          <strong>${escapeHtml(a.categoria)} — ${escapeHtml(a.item_nome)}</strong>
          <div class="sub">${dataHoraBR(a.criado_em)} • ${escapeHtml(a.tipo_ou_origem || "")}</div>
          <div class="sub">
            Sistema: ${fmt(a.quantidade_anterior,3)} •
            Contado: ${fmt(a.quantidade_nova,3)} •
            <span class="${cls}">Diferença ${dif > 0 ? "+" : ""}${fmt(dif,3)}</span>
          </div>
          <div class="sub">${escapeHtml(a.motivo || "")} • ${escapeHtml(a.responsavel || "")}</div>
        </div>
      </div>
    `);
  });
}

async function carregarEstoque(force=false) {
  if (state.loaded.estoque && !force) return;

  await carregarBaseCadastros(force);

  const [ec, ei, ajustes, incompletos] = await Promise.all([
    sb.from("estoque_cerveja")
      .select("*")
      .order("cerveja_nome"),

    sb.from("estoque_insumos")
      .select("*")
      .order("tipo")
      .order("nome"),

    sb.from("ajustes_estoque")
      .select("*")
      .order("criado_em", { ascending:false })
      .limit(25),

    sb.from("barris_incompletos")
      .select("*")
      .eq("status","DISPONIVEL")
      .order("cerveja_nome")
      .order("criado_em", { ascending:false })
  ]);

  state.barrisIncompletos = incompletos.data || [];

  renderResumoEstoqueOrigem(ec.data || [], state.barrisIncompletos);
  renderEstoqueCervejas(ec.data || [], state.barrisIncompletos);
  renderEstoqueInsumos(ei.data || []);
  renderHistoricoConferencias(ajustes.data || []);

  state.loaded.estoque = true;
}

/* -----------------------------
   BUSCA GLOBAL
   ----------------------------- */

function abrirBuscaGlobal() {
  mostrarTela("busca");

  const input = document.getElementById("buscaGlobalInput");
  setTimeout(() => input?.focus(), 100);
}

function textoContemBusca(valores, termo) {
  return valores
    .filter(v => v !== null && v !== undefined)
    .join(" ")
    .toLowerCase()
    .includes(termo);
}

async function executarBuscaGlobal() {
  const input = document.getElementById("buscaGlobalInput");
  const termoOriginal = input?.value.trim() || "";
  const termo = termoOriginal.toLowerCase();
  const box = document.getElementById("buscaGlobalResultados");
  const resumo = document.getElementById("buscaGlobalResumo");

  if (termo.length < 2) {
    box.innerHTML = '<div class="item"><span class="sub">Digite pelo menos 2 caracteres.</span></div>';
    resumo.innerHTML = "";
    return;
  }

  box.innerHTML = '<div class="item"><span class="sub">Buscando...</span></div>';

  const [
    clientes,
    cervejas,
    insumos,
    producoes,
    saidas,
    retornos,
    barrisIncompletos,
    movimentos
  ] = await Promise.all([
    sb.from("clientes").select("*").limit(500),
    sb.from("cervejas").select("*").limit(500),
    sb.from("insumos").select("*").limit(500),
    sb.from("producoes").select("*").order("criado_em", { ascending:false }).limit(800),
    sb.from("saidas").select("*").order("criado_em", { ascending:false }).limit(800),
    sb.from("retornos").select("*").order("criado_em", { ascending:false }).limit(800),
    sb.from("barris_incompletos").select("*").order("criado_em", { ascending:false }).limit(800),
    sb.from("movimentacoes").select("*").order("criado_em", { ascending:false }).limit(800)
  ]);

  const resultados = [];

  (clientes.data || []).forEach(c => {
    if (textoContemBusca(
      [c.nome,c.estabelecimento,c.cidade,c.contato,c.observacao],
      termo
    )) {
      resultados.push({
        tipo:"Cliente",
        titulo:c.nome,
        detalhe:[c.estabelecimento,c.cidade,c.contato].filter(Boolean).join(" • "),
        acao:`abrirResultadoCliente('${c.id}')`
      });
    }
  });

  (cervejas.data || []).forEach(c => {
    if (textoContemBusca(
      [c.nome,c.estilo,c.marca,c.observacao],
      termo
    )) {
      resultados.push({
        tipo:"Cerveja",
        titulo:c.nome,
        detalhe:[c.estilo,c.marca].filter(Boolean).join(" • "),
        acao:"mostrarTela('estoque')"
      });
    }
  });

  (insumos.data || []).forEach(i => {
    if (textoContemBusca(
      [i.tipo,i.nome,i.unidade,i.fornecedor_padrao,i.observacao],
      termo
    )) {
      resultados.push({
        tipo:"Insumo",
        titulo:i.nome,
        detalhe:`${i.tipo} • ${i.unidade}`,
        acao:"mostrarTela('estoque')"
      });
    }
  });

  (producoes.data || []).forEach(p => {
    if (textoContemBusca(
      [p.lote,p.cerveja_nome,p.status,p.fermento_nome,p.observacao],
      termo
    )) {
      resultados.push({
        tipo:"Lote",
        titulo:`${p.cerveja_nome} — lote ${p.lote}`,
        detalhe:`${rotuloStatusLote(p.status)} • ${fmt(p.litros_produzidos)} L • ${dataBR(p.data_producao)}`,
        acao:`abrirResultadoLote('${p.id}')`
      });
    }
  });

  (saidas.data || []).forEach(s => {
    if (textoContemBusca(
      [
        s.cliente_nome,s.cerveja_nome,s.codigos_barris,
        s.responsavel,s.observacao,s.grupo_saida
      ],
      termo
    )) {
      resultados.push({
        tipo:"Saída",
        titulo:`${s.cliente_nome} — ${s.cerveja_nome}`,
        detalhe:`${dataBR(s.data_saida)} • ${fmt(s.litros)} L • ${s.codigos_barris || "sem código"}`,
        acao:"mostrarTela('saidas')"
      });
    }
  });

  (retornos.data || []).forEach(r => {
    if (textoContemBusca(
      [
        r.cliente_nome,r.cerveja_nome,r.codigos_barris,
        r.responsavel,r.observacao
      ],
      termo
    )) {
      resultados.push({
        tipo:"Retorno",
        titulo:`${r.cliente_nome} — ${r.cerveja_nome || "Barris"}`,
        detalhe:`${dataBR(r.data_retorno)} • ${r.codigos_barris || "sem código"}`,
        acao:"mostrarTela('retornos')"
      });
    }
  });

  (barrisIncompletos.data || []).forEach(b => {
    if (textoContemBusca(
      [
        b.cerveja_nome,b.lote,b.origem,b.codigo,
        b.status,b.observacao,b.capacidade_litros,b.litros_atuais
      ],
      termo
    )) {
      resultados.push({
        tipo:"Barril incompleto",
        titulo:`${b.cerveja_nome} — ${fmt(b.litros_atuais,2)}/${fmt(b.capacidade_litros)} L`,
        detalhe:`${b.origem} • ${b.codigo || "sem código"} • lote ${b.lote || "-"} • ${b.status}`,
        acao:"mostrarTela('estoque')"
      });
    }
  });

  (movimentos.data || []).forEach(m => {
    if (textoContemBusca(
      [
        m.tipo,m.categoria,m.item_nome,m.lote,
        m.cliente_nome,m.destino,m.observacao,m.responsavel
      ],
      termo
    )) {
      resultados.push({
        tipo:"Movimentação",
        titulo:`${m.tipo} — ${m.item_nome || ""}`,
        detalhe:`${dataHoraBR(m.criado_em)} • ${m.lote || ""} • ${m.observacao || ""}`,
        acao:"mostrarTela('auditoria')"
      });
    }
  });

  const limitados = resultados.slice(0, 120);
  const tipos = new Set(limitados.map(r => r.tipo));

  resumo.innerHTML = `
    <div class="card"><span>Resultados</span><strong>${limitados.length}</strong></div>
    <div class="card"><span>Categorias</span><strong>${tipos.size}</strong></div>
  `;

  box.innerHTML = limitados.length
    ? ""
    : `<div class="item"><span class="sub">Nada encontrado para “${escapeHtml(termoOriginal)}”.</span></div>`;

  limitados.forEach(r => {
    box.insertAdjacentHTML("beforeend", `
      <div class="item searchable">
        <div>
          <div class="searchResultType">${escapeHtml(r.tipo)}</div>
          <strong>${escapeHtml(r.titulo)}</strong>
          <div class="sub">${escapeHtml(r.detalhe || "")}</div>
          <div class="rowActions">
            <button class="btnTiny btnEdit" onclick="${r.acao}">Abrir</button>
          </div>
        </div>
      </div>
    `);
  });
}

async function abrirResultadoLote(id) {
  mostrarTela("lotes");
  await carregarLotes(true);
  abrirFichaLote(id);
}

async function abrirResultadoCliente(id) {
  mostrarTela("clientes");
  await carregarClientes(true);
  await prepararFormExtratoCliente();

  const sel = document.getElementById("extratoCliente");
  if (sel) {
    sel.value = id;
    await carregarExtratoCliente();
    document.getElementById("extratoClienteConteudo")
      ?.scrollIntoView({ behavior:"smooth", block:"start" });
  }
}
