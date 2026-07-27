/* ==========================================================
   CORREÇÕES SEGURAS E RESTAURAÇÃO DE BACKUP
   ========================================================== */

const TABELAS_BACKUP_ERP = [
  "cervejas","insumos","clientes","fermento_reuso",
  "estoque_cerveja","estoque_insumos","producoes",
  "producao_insumos","dry_hopping","envases","entradas_cerveja",
  "phenomena_entradas","barris_incompletos","saidas","retornos","entradas_insumos",
  "ajustes_estoque","fermento_historico","phenomena_debitos",
  "phenomena_recebimentos","phenomena_pagamentos","movimentacoes","configuracoes","backups",
  "correcoes_lancamentos","restauracoes_backup"
];

const ORDEM_RESTAURACAO_ERP = [
  "cervejas","insumos","clientes","fermento_reuso",
  "estoque_cerveja","estoque_insumos","producoes",
  "producao_insumos","dry_hopping","envases","entradas_cerveja",
  "phenomena_entradas","barris_incompletos","saidas","retornos","entradas_insumos",
  "ajustes_estoque","fermento_historico","phenomena_debitos",
  "phenomena_recebimentos","phenomena_pagamentos","movimentacoes","configuracoes","backups",
  "correcoes_lancamentos","restauracoes_backup"
];

function mostrarTela(nome) {
  const mapa = {
    busca:"telaBusca",
    inicio:"telaInicio",
    producao:"telaProducao",
    estoque:"telaEstoque",
    saidas:"telaSaidas",
    mais:"telaMais",
    fermentos:"telaFermentos",
    phenomena:"telaPhenomena",
    retornos:"telaRetornos",
    painelDia:"telaPainelDia",
    relatorio:"telaRelatorio",
    auditoria:"telaAuditoria",
    configuracoes:"telaConfiguracoes",
    backup:"telaBackup",
    correcoes:"telaCorrecoes",
    lotes:"telaLotes",
    clientes:"telaClientes",
    cadastros:"telaCadastros"
  };

  const destino = document.getElementById(mapa[nome]);
  if (!destino) return;

  const atual = document.querySelector(".tela.active");
  const sujo = typeof formularioProtegidoAbertoSujo === "function"
    ? formularioProtegidoAbertoSujo()
    : null;

  if (
    sujo &&
    atual !== destino &&
    typeof confirmarDescartarFormulario === "function" &&
    !confirmarDescartarFormulario(sujo)
  ) return;

  if (
    sujo &&
    atual !== destino &&
    typeof marcarFormularioLimpo === "function"
  ) marcarFormularioLimpo(sujo.id);

  document.querySelectorAll(".tela").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".bottomNav button").forEach(b => b.classList.remove("active"));
  destino.classList.add("active");

  const btns = document.querySelectorAll(".bottomNav button");
  if (nome === "inicio") btns[0]?.classList.add("active");
  if (nome === "producao") btns[1]?.classList.add("active");
  if (nome === "estoque") btns[2]?.classList.add("active");
  if (nome === "saidas") btns[3]?.classList.add("active");
  if (nome === "fermentos") btns[1]?.classList.add("active");

  if ([
    "mais","clientes","cadastros","lotes","phenomena","retornos",
    "painelDia","relatorio","auditoria","configuracoes","backup","correcoes"
  ].includes(nome)) {
    btns[4]?.classList.add("active");
  }

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
  if (nome === "correcoes") carregarCorrecoes(true);
  if (nome === "backup") carregarHistoricoRestauracoes();
}

/* -----------------------------
   SALVAR DADOS PARA ESTORNO
   ----------------------------- */

async function salvarEntradaCerveja() {
  mostrarErro("entradaCervejaErro", "");

  const cerveja_nome = document.getElementById("entradaCerveja").value;
  const origem = document.getElementById("entradaOrigem").value;
  const q10 = Number(document.getElementById("entradaQ10").value || 0);
  const q20 = Number(document.getElementById("entradaQ20").value || 0);
  const q30 = Number(document.getElementById("entradaQ30").value || 0);
  const q50 = Number(document.getElementById("entradaQ50").value || 0);
  const observacao = document.getElementById("entradaObs").value.trim();

  if (!cerveja_nome || somaBarris(q10,q20,q30,q50) <= 0) {
    mostrarErro(
      "entradaCervejaErro",
      "Selecione a cerveja e informe os barris."
    );
    return;
  }

  const btn = document.getElementById("entradaCervejaSalvarBtn");
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Registrando entrada...";
  }

  try {
    const { error } = await sb.rpc("erp_registrar_entrada_cerveja", {
      p_cerveja_nome:cerveja_nome,
      p_origem:origem,
      p_q10:q10,
      p_q20:q20,
      p_q30:q30,
      p_q50:q50,
      p_observacao:observacao || null
    });

    if (error) throw error;
  } catch(e) {
    const mensagem = String(
      e?.message || e || "Não foi possível registrar a entrada."
    );
    mostrarErro(
      "entradaCervejaErro",
      mensagem.includes("erp_registrar_entrada_cerveja")
        ? "A atualização SQL 10 de integridade ainda não foi aplicada no Supabase."
        : mensagem
    );
    return;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = "Registrar entrada";
    }
  }

  [
    "entradaQ10","entradaQ20","entradaQ30","entradaQ50","entradaObs"
  ].forEach(id => {
    document.getElementById(id).value = id === "entradaObs" ? "" : "0";
  });

  invalidar("estoque","inicio","correcoes","phenomena");
  alert("Entrada de cerveja registrada.");
  carregarEstoque(true);
  carregarInicio(true);
}

async function salvarSaidaMultipla() {
  mostrarErro("saidaErro", "");
  await carregarBaseCadastros();

  const clienteId = document.getElementById("saidaCliente").value;
  const clienteOp = document.getElementById("saidaCliente")
    .options[document.getElementById("saidaCliente").selectedIndex];

  const cliente_nome = clienteOp
    ? (clienteOp.dataset.nome || clienteOp.textContent)
    : "";

  const responsavel = document.getElementById("saidaResponsavel").value.trim();
  const observacao = document.getElementById("saidaObs").value.trim();
  const itens = coletarItensSaida();

  if (!clienteId || !cliente_nome) {
    mostrarErro("saidaErro", "Selecione o cliente.");
    return;
  }

  if (!itens.length) {
    mostrarErro(
      "saidaErro",
      "Adicione pelo menos uma cerveja com quantidade."
    );
    return;
  }

  const simulacoes = [];
  const estoqueVirtual = new Map();

  try {
    for (const item of itens) {
      const qtdBarris = somaBarris(
        item.q10,item.q20,item.q30,item.q50
      );

      const qtdCodigos = typeof extrairCodigosBarris === "function"
        ? extrairCodigosBarris(item.codigos_barris).length
        : 0;

      if (
        item.codigos_barris &&
        qtdCodigos > 0 &&
        qtdCodigos !== qtdBarris
      ) {
        const ok = confirm(
          `${item.cerveja_nome}: você informou ${qtdBarris} barril(is), mas ${qtdCodigos} código(s). Deseja continuar?`
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
    resumo += `${item.cerveja_nome} — ${fmt(
      litrosBarris(item.q10,item.q20,item.q30,item.q50)
    )} L\n`;

    resumo += `Barris: ${detalharBarrisComSaldo(item.q10,item.q20,item.q30,item.q50)}\n`;

    resumo += `Baixa automática: ${
      Object.entries(sim.resumoPorOrigem)
        .map(([o,l]) => `${o}: ${fmt(l)}L`)
        .join(" • ")
    }\n`;

    if (item.codigos_barris) {
      resumo += `Códigos: ${item.codigos_barris}\n`;
    }

    resumo += "\n";
  });

  resumo += "Confirmar saída com baixa de estoque?";
  if (!confirm(resumo)) return;

  const btn = document.getElementById("saidaSalvarBtn");
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Registrando saída...";
  }

  try {
    const { error } = await sb.rpc("erp_registrar_saida_multipla", {
      p_cliente_id:clienteId,
      p_itens:itens.map(item => ({
        cerveja_nome:item.cerveja_nome,
        q10:item.q10,
        q20:item.q20,
        q30:item.q30,
        q50:item.q50,
        codigos_barris:item.codigos_barris || null
      })),
      p_responsavel:responsavel || null,
      p_observacao:observacao || null
    });

    if (error) throw error;
  } catch(e) {
    const mensagem = String(
      e?.message || e || "Não foi possível registrar a saída."
    );
    mostrarErro(
      "saidaErro",
      mensagem.includes("erp_registrar_saida_multipla")
        ? "A atualização SQL 10 de integridade ainda não foi aplicada no Supabase."
        : "Erro ao salvar saída: " + mensagem
    );
    return;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = "Conferir e registrar saída";
    }
  }

  document.getElementById("saidaResponsavel").value = "";
  document.getElementById("saidaObs").value = "";
  document.getElementById("saidaItens").innerHTML = "";
  adicionarItemSaida();

  invalidar(
    "saidas","estoque","inicio","retornos",
    "clientes","painelDia","auditoria","correcoes"
  );

  alert("Saída registrada com baixa automática do estoque.");
  carregarSaidas(true);
  carregarInicio(true);
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
  const tamanhoIncompleto = Number(
    document.getElementById("envaseIncompletoTamanho").value || 0
  );
  const codigoIncompleto = document
    .getElementById("envaseIncompletoCodigo")
    .value
    .trim();
  const barProprio = Number(document.getElementById("envaseBarProprio").value || 0);
  const perdaDigitada = Number(document.getElementById("envasePerdaInformada").value || 0);
  const finalizar = document.getElementById("envaseFinalizarLote").checked;
  const obs = document.getElementById("envaseObs").value.trim();

  if (!prod) {
    mostrarErro("envaseErro", "Selecione o lote.");
    return;
  }

  if (incompleto > 0 && ![10,20,30,50].includes(tamanhoIncompleto)) {
    mostrarErro("envaseErro", "Selecione o tamanho do último barril incompleto.");
    return;
  }

  if (incompleto > tamanhoIncompleto && tamanhoIncompleto > 0) {
    mostrarErro(
      "envaseErro",
      `O volume informado (${fmt(incompleto,2)} L) é maior que a capacidade do barril (${fmt(tamanhoIncompleto)} L).`
    );
    return;
  }

  if (incompleto <= 0 && (tamanhoIncompleto > 0 || codigoIncompleto)) {
    mostrarErro("envaseErro", "Informe os litros do último barril incompleto ou remova seus detalhes.");
    return;
  }

  if (
    !state.envaseSaldoAtual ||
    state.envaseSaldoAtual.prod.id !== prod.id
  ) {
    await carregarSaldoEnvaseSelecionado();
  }

  atualizarResumoEnvase();
  const calc = state.envaseCalculoAtual;

  if (!calc || (calc.totalEnvaseAtual <= 0 && calc.perdaFinal <= 0)) {
    mostrarErro("envaseErro", "Informe o envase ou a perda.");
    return;
  }

  if (calc.excesso > 0.001) {
    mostrarErro(
      "envaseErro",
      `Envase bloqueado: excede o saldo do lote em ${fmt(calc.excesso)} L.`
    );
    return;
  }

  let resumo = `CONFIRMAR ENVASE\n\n`;
  resumo += `${prod.cerveja_nome} — lote ${lote}\n`;
  resumo += `Barris completos: ${fmt(calc.litrosBarrisCompletos)} L\n`;
  resumo += `Último barril incompleto: ${
    incompleto > 0
      ? `${fmt(incompleto)} L em barril de ${fmt(tamanhoIncompleto)} L${codigoIncompleto ? ` • código ${codigoIncompleto}` : ""}`
      : "0 L"
  }\n`;
  resumo += `Bar próprio: ${fmt(barProprio)} L\n`;
  resumo += `Perda: ${fmt(calc.perdaFinal)} L\n`;
  resumo += `Saldo depois: ${fmt(calc.saldoDepois)} L\n`;

  if (!confirm(resumo)) return;

  const btn = document.getElementById("envaseSalvarBtn");
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Registrando envase...";
  }

  try {
    const { error } = await sb.rpc("erp_registrar_envase", {
      p_producao_id:prod.id,
      p_origem:origem,
      p_q10:q10,
      p_q20:q20,
      p_q30:q30,
      p_q50:q50,
      p_litros_incompleto:incompleto,
      p_capacidade_incompleto:incompleto > 0
        ? tamanhoIncompleto
        : null,
      p_codigo_incompleto:incompleto > 0
        ? (codigoIncompleto || null)
        : null,
      p_litros_bar_proprio:barProprio,
      p_perda_informada:perdaDigitada,
      p_finalizar:finalizar,
      p_observacao:obs || null
    });

    if (error) throw error;
  } catch(e) {
    const mensagem = String(
      e?.message || e || "Não foi possível registrar o envase."
    );
    mostrarErro(
      "envaseErro",
      mensagem.includes("erp_registrar_envase")
        ? "A atualização SQL 10 de integridade ainda não foi aplicada no Supabase."
        : mensagem
    );
    return;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = "Conferir e registrar envase";
    }
  }

  [
    "envaseQ10","envaseQ20","envaseQ30","envaseQ50",
    "envaseIncompleto","envaseBarProprio","envasePerdaInformada"
  ].forEach(id => {
    document.getElementById(id).value = "0";
  });

  document.getElementById("envaseIncompletoTamanho").value = "";
  document.getElementById("envaseIncompletoCodigo").value = "";
  document.getElementById("envaseObs").value = "";
  document.getElementById("envaseFinalizarLote").checked = false;

  marcarFormularioLimpo("formEnvase");

  invalidar(
    "producao","producoesFermentando","estoque","inicio",
    "lotes","painelDia","auditoria","phenomena","correcoes"
  );

  alert("Envase registrado.");
  carregarProducao(true);
  carregarInicio(true);
}

/* -----------------------------
   CORREÇÕES
   ----------------------------- */

function rotuloTipoCorrecao(tipo) {
  const mapa = {
    SAIDA:"Saída para cliente",
    RETORNO:"Retorno de barril",
    ENVASE:"Envase",
    ENTRADA_CERVEJA:"Entrada de cerveja",
    ENTRADA_INSUMO:"Entrada de insumo",
    PRODUCAO:"Produção"
  };
  return mapa[tipo] || tipo;
}

function descricaoItemCorrecao(tipo, item) {
  if (tipo === "SAIDA") {
    return {
      titulo:`${item.cliente_nome} — ${item.itens.length} item(ns)`,
      detalhe:`${dataBR(item.data_saida)} • ${fmt(item.litros)} L • ${item.q10+item.q20+item.q30+item.q50} barril(is)`
    };
  }

  if (tipo === "RETORNO") {
    return {
      titulo:`${item.cliente_nome} — ${item.cerveja_nome || "Barris"}`,
      detalhe:`${dataBR(item.data_retorno)} • ${somaBarris(item.q10,item.q20,item.q30,item.q50)} barril(is) • ${item.codigos_barris || "sem código"}`
    };
  }

  if (tipo === "ENVASE") {
    return {
      titulo:`${item.cerveja_nome} — lote ${item.lote}`,
      detalhe:`${dataBR(item.data_envase)} • ${fmt(item.litros_total)} L • ${item.origem}`
    };
  }

  if (tipo === "ENTRADA_CERVEJA") {
    return {
      titulo:`${item.cerveja_nome} — ${item.origem}`,
      detalhe:`${dataHoraBR(item.criado_em)} • ${fmt(item.litros)} L`
    };
  }

  if (tipo === "ENTRADA_INSUMO") {
    return {
      titulo:`${item.tipo} — ${item.nome}`,
      detalhe:`${dataHoraBR(item.criado_em)} • ${fmt(item.quantidade,3)} ${item.unidade}`
    };
  }

  return {
    titulo:`${item.cerveja_nome} — lote ${item.lote}`,
    detalhe:`${dataBR(item.data_producao)} • ${fmt(item.litros_produzidos)} L • ${rotuloStatusLote(item.status)}`
  };
}

async function carregarCorrecoes(force=false) {
  const tipo = document.getElementById("correcaoTipo")?.value || "SAIDA";
  const box = document.getElementById("correcoesLista");

  state.correcaoSelecionada = null;
  document.getElementById("correcaoConfirmacao").style.display = "none";
  box.innerHTML = '<div class="item"><span class="sub">Carregando lançamentos...</span></div>';

  let resposta;

  if (tipo === "SAIDA") {
    resposta = await sb.from("saidas")
      .select("*")
      .order("criado_em", { ascending:false })
      .limit(200);
  } else if (tipo === "RETORNO") {
    resposta = await sb.from("retornos")
      .select("*")
      .order("criado_em", { ascending:false })
      .limit(80);
  } else if (tipo === "ENVASE") {
    resposta = await sb.from("envases")
      .select("*")
      .order("criado_em", { ascending:false })
      .limit(80);
  } else if (tipo === "ENTRADA_CERVEJA") {
    resposta = await sb.from("entradas_cerveja")
      .select("*")
      .order("criado_em", { ascending:false })
      .limit(80);
  } else if (tipo === "ENTRADA_INSUMO") {
    resposta = await sb.from("entradas_insumos")
      .select("*")
      .order("criado_em", { ascending:false })
      .limit(80);
  } else {
    resposta = await sb.from("producoes")
      .select("*")
      .order("criado_em", { ascending:false })
      .limit(80);
  }

  if (resposta.error) {
    box.innerHTML = `<div class="item"><span class="sub">${escapeHtml(resposta.error.message)}</span></div>`;
    return;
  }

  let itens = resposta.data || [];

  if (tipo === "SAIDA") {
    itens = agruparSaidas(itens).map(g => ({
      ...g,
      id:g.itens[0]?.id || null
    }));
  }

  state.correcoesItens = itens;
  state.correcoesTipoAtual = tipo;

  box.innerHTML = itens.length
    ? ""
    : '<div class="item"><span class="sub">Nenhum lançamento encontrado.</span></div>';

  itens.forEach((item, idx) => {
    const d = descricaoItemCorrecao(tipo, item);
    const legado = tipo === "SAIDA" &&
      item.itens.some(i => !Array.isArray(i.detalhes_baixa));

    box.insertAdjacentHTML("beforeend", `
      <div class="item searchable ${legado ? "" : "itemDestaque"}">
        <div>
          <span class="correcaoTipo">${escapeHtml(rotuloTipoCorrecao(tipo))}</span>
          <strong style="display:block;margin-top:5px;">${escapeHtml(d.titulo)}</strong>
          <div class="sub">${escapeHtml(d.detalhe)}</div>
          ${
            legado
              ? '<div class="sub custoWarn">Registro antigo: o estorno automático pode ser bloqueado.</div>'
              : ""
          }
          <div class="rowActions">
            <button class="btnTiny btnEdit" onclick="selecionarCorrecao(${idx})">Revisar estorno</button>
          </div>
        </div>
      </div>
    `);
  });

  await carregarHistoricoCorrecoes();
}

function selecionarCorrecao(idx) {
  const item = state.correcoesItens?.[idx];
  if (!item) return;

  state.correcaoSelecionada = {
    tipo:state.correcoesTipoAtual,
    item
  };

  const d = descricaoItemCorrecao(state.correcoesTipoAtual, item);
  const box = document.getElementById("correcaoConfirmacao");

  document.getElementById("correcaoResumo").innerHTML = `
    <strong>${escapeHtml(d.titulo)}</strong>
    <div class="sub">${escapeHtml(d.detalhe)}</div>
    <div class="sub" style="margin-top:7px;">
      O estoque será revertido quando aplicável. O motivo e uma cópia do lançamento original ficarão no histórico.
    </div>
  `;

  document.getElementById("correcaoMotivo").value = "";
  document.getElementById("correcaoResponsavel").value =
    state.config?.responsavel_padrao || "";
  document.getElementById("correcaoConfirmarCheck").checked = false;
  mostrarErro("correcaoErro", "");

  box.style.display = "block";
  box.scrollIntoView({ behavior:"smooth", block:"start" });
}

async function executarCorrecaoSelecionada() {
  mostrarErro("correcaoErro", "");

  const selecionada = state.correcaoSelecionada;
  const motivo = document.getElementById("correcaoMotivo").value.trim();
  const responsavel = document.getElementById("correcaoResponsavel").value.trim();
  const confirmado = document.getElementById("correcaoConfirmarCheck").checked;

  if (!selecionada) {
    mostrarErro("correcaoErro", "Selecione um lançamento.");
    return;
  }

  if (!motivo) {
    mostrarErro("correcaoErro", "Informe o motivo da correção.");
    return;
  }

  if (!confirmado) {
    mostrarErro("correcaoErro", "Marque a confirmação antes de continuar.");
    return;
  }

  const item = selecionada.item;
  const tipo = selecionada.tipo;
  const descricao = descricaoItemCorrecao(tipo, item);

  const ok = confirm(
    `ESTORNAR LANÇAMENTO?\n\n${descricao.titulo}\n${descricao.detalhe}\n\nMotivo: ${motivo}`
  );

  if (!ok) return;

  const { data, error } = await sb.rpc("erp_estornar_lancamento", {
    p_tipo:tipo,
    p_registro_id:item.id || null,
    p_grupo_saida:tipo === "SAIDA" ? item.grupo_saida : null,
    p_motivo:motivo,
    p_responsavel:responsavel || null
  });

  if (error) {
    mostrarErro("correcaoErro", error.message);
    return;
  }

  state.correcaoSelecionada = null;
  document.getElementById("correcaoConfirmacao").style.display = "none";

  invalidar(
    "inicio","producao","producoesFermentando","estoque",
    "saidas","retornos","lotes","fermentos","fermentosReusoBase",
    "phenomena","painelDia","auditoria","clientes","correcoes"
  );

  alert(data?.descricao || "Lançamento estornado.");
  await carregarCorrecoes(true);
}

async function carregarHistoricoCorrecoes() {
  const box = document.getElementById("correcoesHistorico");
  if (!box) return;

  const { data, error } = await sb.from("correcoes_lancamentos")
    .select("*")
    .order("criado_em", { ascending:false })
    .limit(50);

  if (error) {
    box.innerHTML = `<div class="item"><span class="sub">${escapeHtml(error.message)}</span></div>`;
    return;
  }

  const rows = data || [];
  box.innerHTML = rows.length
    ? ""
    : '<div class="item"><span class="sub">Nenhuma correção registrada.</span></div>';

  rows.forEach(c => {
    box.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div>
          <span class="correcaoTipo">${escapeHtml(rotuloTipoCorrecao(c.tipo))}</span>
          <strong style="display:block;margin-top:5px;">${escapeHtml(c.descricao || "Correção")}</strong>
          <div class="sub">${dataHoraBR(c.criado_em)} • ${escapeHtml(c.responsavel || "")}</div>
          <div class="sub">Motivo: ${escapeHtml(c.motivo || "")}</div>
        </div>
      </div>
    `);
  });
}

/* -----------------------------
   BACKUP E RESTAURAÇÃO
   ----------------------------- */

async function gerarBackupJson() {
  const status = document.getElementById("backupStatus");
  const btn = document.getElementById("backupGerarBtn");
  status.innerText = "Gerando backup...";
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Gerando backup completo...";
  }

  const backup = {
    versao:3,
    gerado_em:new Date().toISOString(),
    projeto:"ERP Cervejaria da Lagoa",
    contagens:{},
    tabelas:{}
  };

  try {
    for (const tabela of TABELAS_BACKUP_ERP) {
      status.innerText = `Gerando backup completo: ${tabela}...`;
      const ordenarPor = tabela === "configuracoes" ? "chave" : "id";
      const data = await buscarTodasLinhas(tabela, {
        ordenarPor,
        desempatarPor:null,
        verificarContagem:true
      });

      backup.tabelas[tabela] = data;
      backup.contagens[tabela] = data.length;
    }

    const totalRegistros = Object.values(backup.contagens)
      .reduce((s,n) => s + Number(n || 0), 0);
    backup.total_registros = totalRegistros;

    const blob = new Blob(
      [JSON.stringify(backup, null, 2)],
      { type:"application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const nome = "backup-erp-cervejaria-" +
      new Date().toISOString().slice(0,10) +
      ".json";

    a.href = url;
    a.download = nome;
    a.click();
    URL.revokeObjectURL(url);

    const { error:historicoErro } = await sb.from("backups").insert({
      descricao:`Backup JSON completo gerado: ${nome} — ${totalRegistros} registro(s)`
    });

    status.innerText = historicoErro
      ? `Backup completo gerado: ${nome} (${totalRegistros} registros). Não foi possível salvar apenas o histórico: ${historicoErro.message}`
      : `Backup completo gerado: ${nome} (${totalRegistros} registros).`;
  } catch(e) {
    status.innerText =
      "Backup cancelado: nenhuma cópia foi baixada porque a leitura não ficou completa. "
      + e.message;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = "💾 Gerar backup JSON";
    }
  }
}

function assinaturaNaturalBackup(tabela, row) {
  const mapas = {
    cervejas:["nome"],
    insumos:["tipo","nome"],
    estoque_cerveja:["cerveja_nome","origem"],
    estoque_insumos:["tipo","nome"],
    producoes:["cerveja_nome","lote"],
    fermento_reuso:["codigo"],
    configuracoes:["chave"]
  };

  const campos = mapas[tabela];
  if (!campos) return null;

  return campos
    .map(c => String(row?.[c] ?? "").trim().toLowerCase())
    .join("|");
}

function linhasValidasBackup(valor) {
  return Array.isArray(valor) ? valor : [];
}

async function analisarArquivoBackup() {
  const file = document.getElementById("backupArquivo")?.files?.[0];
  const previa = document.getElementById("backupPrevia");
  const btn = document.getElementById("backupRestaurarBtn");

  state.backupAnalise = null;
  btn.disabled = true;

  if (!file) {
    previa.innerText = "Selecione um arquivo para analisar.";
    return;
  }

  previa.innerText = "Lendo e conferindo o arquivo...";

  let backup;
  try {
    backup = JSON.parse(await file.text());
  } catch(e) {
    previa.innerHTML = '<span class="custoBad">O arquivo não é um JSON válido.</span>';
    return;
  }

  if (!backup || typeof backup !== "object" || !backup.tabelas) {
    previa.innerHTML = '<span class="custoBad">Este arquivo não possui o formato de backup do ERP.</span>';
    return;
  }

  if (Number(backup.versao || 0) >= 3) {
    const contagens = backup.contagens;
    const divergencias = TABELAS_BACKUP_ERP.filter(tabela => (
      !Array.isArray(backup.tabelas[tabela])
      || !contagens
      || Number(contagens[tabela]) !== backup.tabelas[tabela].length
    ));

    const totalCalculado = TABELAS_BACKUP_ERP.reduce(
      (s,tabela) => s + (
        Array.isArray(backup.tabelas[tabela])
          ? backup.tabelas[tabela].length
          : 0
      ),
      0
    );

    if (
      divergencias.length
      || Number(backup.total_registros) !== totalCalculado
    ) {
      previa.innerHTML = `<span class="custoBad">${escapeHtml(
        "Backup incompleto ou alterado. A restauração foi bloqueada."
      )}</span>`;
      return;
    }
  }

  const detalhes = [];
  let total = 0;
  let novos = 0;
  let duplicados = 0;
  let tabelasComDados = 0;

  for (const tabela of ORDEM_RESTAURACAO_ERP) {
    const rows = linhasValidasBackup(backup.tabelas[tabela]);
    if (!rows.length) continue;

    tabelasComDados += 1;
    total += rows.length;

    let existentes;
    try {
      existentes = await buscarTodasLinhas(tabela, {
        ordenarPor:tabela === "configuracoes" ? "chave" : "id",
        desempatarPor:null,
        verificarContagem:true
      });
    } catch(e) {
      detalhes.push({
        tabela,
        total:rows.length,
        novos:0,
        duplicados:0,
        erro:e.message,
        rowsNovos:[]
      });
      continue;
    }

    const ids = new Set(
      (existentes || [])
        .map(r => r.id)
        .filter(Boolean)
    );

    const naturais = new Set(
      (existentes || [])
        .map(r => assinaturaNaturalBackup(tabela, r))
        .filter(Boolean)
    );

    const rowsNovos = [];
    let dupTabela = 0;

    rows.forEach(row => {
      const assinatura = assinaturaNaturalBackup(tabela, row);
      const existeId = row.id && ids.has(row.id);
      const existeNatural = assinatura && naturais.has(assinatura);

      if (existeId || existeNatural) {
        dupTabela += 1;
      } else {
        rowsNovos.push(row);
      }
    });

    novos += rowsNovos.length;
    duplicados += dupTabela;

    detalhes.push({
      tabela,
      total:rows.length,
      novos:rowsNovos.length,
      duplicados:dupTabela,
      erro:null,
      rowsNovos
    });
  }

  state.backupAnalise = {
    fileName:file.name,
    backup,
    total,
    novos,
    duplicados,
    tabelasComDados,
    detalhes
  };

  const erros = detalhes.filter(d => d.erro);

  previa.innerHTML = `
    <strong>Prévia do backup</strong>
    <div class="backupPreviewGrid">
      <div><span>Gerado em</span><strong>${backup.gerado_em ? dataHoraBR(backup.gerado_em) : "-"}</strong></div>
      <div><span>Tabelas com dados</span><strong>${tabelasComDados}</strong></div>
      <div><span>Registros no arquivo</span><strong>${total}</strong></div>
      <div><span>Serão restaurados</span><strong>${novos}</strong></div>
      <div><span>Já existentes</span><strong>${duplicados}</strong></div>
      <div><span>Erros de leitura</span><strong>${erros.length}</strong></div>
    </div>
    ${
      erros.length
        ? `<div class="erro" style="display:block;margin-top:8px;">Não foi possível verificar: ${escapeHtml(erros.map(e => e.tabela).join(", "))}</div>`
        : ""
    }
  `;

  btn.disabled = novos <= 0 || erros.length > 0;
}

async function restaurarBackupSeguro() {
  const analise = state.backupAnalise;
  const status = document.getElementById("backupRestauracaoStatus");
  const responsavel = document.getElementById("backupResponsavel").value.trim();
  const observacao = document.getElementById("backupObservacao").value.trim();
  const confirmado = document.getElementById("backupConfirmarCheck").checked;
  const btn = document.getElementById("backupRestaurarBtn");

  if (!analise) {
    status.innerText = "Analise o arquivo primeiro.";
    return;
  }

  if (!confirmado) {
    status.innerText = "Marque a confirmação antes de restaurar.";
    return;
  }

  if (analise.novos <= 0) {
    status.innerText = "Não há registros ausentes para restaurar.";
    return;
  }

  const ok = confirm(
    `Restaurar ${analise.novos} registro(s) ausente(s)?\n\nOs ${analise.duplicados} registro(s) já existentes serão ignorados.`
  );

  if (!ok) return;

  btn.disabled = true;
  let inseridos = 0;
  let ignorados = analise.duplicados;
  let falhas = 0;
  const erros = [];
  let processados = 0;
  const totalNovos = analise.novos;

  status.innerHTML = `
    Restaurando...
    <div class="restoreProgress"><div id="restoreProgressBar" style="width:0%"></div></div>
  `;

  for (const tabela of ORDEM_RESTAURACAO_ERP) {
    const detalhe = analise.detalhes.find(d => d.tabela === tabela);
    if (!detalhe || !detalhe.rowsNovos.length) continue;

    for (const row of detalhe.rowsNovos) {
      const { error } = await sb.from(tabela).insert(row);

      if (error) {
        falhas += 1;
        erros.push(`${tabela}: ${error.message}`);
      } else {
        inseridos += 1;
      }

      processados += 1;
      const pct = totalNovos > 0
        ? Math.round(processados / totalNovos * 100)
        : 100;

      const bar = document.getElementById("restoreProgressBar");
      if (bar) bar.style.width = pct + "%";
    }
  }

  await sb.from("restauracoes_backup").insert({
    arquivo_nome:analise.fileName,
    backup_gerado_em:analise.backup.gerado_em || null,
    total_backup:analise.total,
    inseridos,
    ignorados,
    falhas,
    responsavel,
    observacao,
    detalhes:{
      erros:erros.slice(0,50),
      tabelas:analise.detalhes.map(d => ({
        tabela:d.tabela,
        total:d.total,
        novos:d.novos,
        duplicados:d.duplicados
      }))
    }
  });

  await sb.from("backups").insert({
    descricao:`Restauração segura: ${analise.fileName} — inseridos ${inseridos}, ignorados ${ignorados}, falhas ${falhas}`
  });

  status.innerHTML = `
    <strong>Restauração concluída.</strong><br>
    Inseridos: ${inseridos} • Já existentes: ${ignorados} • Falhas: ${falhas}
    ${
      erros.length
        ? `<div class="erro" style="display:block;margin-top:7px;">${escapeHtml(erros.slice(0,5).join(" | "))}</div>`
        : ""
    }
  `;

  state.backupAnalise = null;
  document.getElementById("backupConfirmarCheck").checked = false;
  document.getElementById("backupArquivo").value = "";

  invalidar(
    "inicio","producao","producoesFermentando","estoque",
    "saidas","retornos","lotes","fermentos","fermentosReusoBase",
    "phenomena","painelDia","auditoria","clientes","cadastros","correcoes"
  );

  await carregarHistoricoRestauracoes();
}

async function carregarHistoricoRestauracoes() {
  const box = document.getElementById("backupHistoricoRestauracoes");
  if (!box) return;

  const { data, error } = await sb
    .from("restauracoes_backup")
    .select("*")
    .order("criado_em", { ascending:false })
    .limit(30);

  if (error) {
    box.innerHTML = `<div class="item"><span class="sub">${escapeHtml(error.message)}</span></div>`;
    return;
  }

  const rows = data || [];
  box.innerHTML = rows.length
    ? ""
    : '<div class="item"><span class="sub">Nenhuma restauração registrada.</span></div>';

  rows.forEach(r => {
    box.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div>
          <strong>${escapeHtml(r.arquivo_nome)}</strong>
          <div class="sub">${dataHoraBR(r.criado_em)} • ${escapeHtml(r.responsavel || "")}</div>
          <div class="sub">Inseridos ${r.inseridos || 0} • Ignorados ${r.ignorados || 0} • Falhas ${r.falhas || 0}</div>
          <div class="sub">${escapeHtml(r.observacao || "")}</div>
        </div>
      </div>
    `);
  });
}
