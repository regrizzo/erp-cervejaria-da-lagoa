/* ==========================================================
   CONTROLE DE ACESSO POR USUÁRIO
   ========================================================== */

const MODULOS_ACESSO = [
  { id:"dashboard", nome:"Dashboard" },
  { id:"producao", nome:"Produção e envase" },
  { id:"estoque", nome:"Estoque" },
  { id:"saidas", nome:"Saídas e retornos" },
  { id:"clientes", nome:"Clientes" },
  { id:"lotes", nome:"Lotes" },
  { id:"fermentos", nome:"Fermentos" },
  { id:"phenomena", nome:"Phenomena" },
  { id:"relatorios", nome:"Relatórios" },
  { id:"auditoria", nome:"Auditoria" },
  { id:"cadastros", nome:"Cadastros" }
];

const TELA_MODULO_ACESSO = {
  busca:"dashboard", inicio:"dashboard", producao:"producao",
  estoque:"estoque", saidas:"saidas", fermentos:"fermentos",
  phenomena:"phenomena", retornos:"saidas", painelDia:"dashboard",
  relatorio:"relatorios", auditoria:"auditoria", configuracoes:"administracao",
  correcoes:"administracao", backup:"administracao", usuarios:"administracao",
  lotes:"lotes", clientes:"clientes", cadastros:"cadastros"
};

function permissoesPadraoPerfil(perfil) {
  const vazio = {};
  [...MODULOS_ACESSO, {id:"administracao"}].forEach(m => {
    vazio[m.id] = { ver:false, editar:false };
  });

  if (perfil === "ADMIN") {
    Object.keys(vazio).forEach(k => vazio[k] = { ver:true, editar:true });
    return vazio;
  }

  const liberar = (modulo, editar=false) => {
    vazio[modulo] = { ver:true, editar:!!editar };
  };

  if (perfil === "PRODUCAO") {
    liberar("dashboard");
    liberar("producao",true);
    liberar("estoque",true);
    liberar("lotes",true);
    liberar("fermentos",true);
    liberar("relatorios");
    liberar("auditoria");
    liberar("cadastros");
  } else if (perfil === "ENTREGA") {
    liberar("dashboard");
    liberar("estoque");
    liberar("saidas",true);
    liberar("clientes",true);
  } else {
    [
      "dashboard","producao","estoque","saidas","clientes",
      "lotes","fermentos","relatorios","auditoria","cadastros"
    ].forEach(m => liberar(m));
  }

  return vazio;
}

function rotuloPerfilAcesso(perfil) {
  return {
    ADMIN:"Administrador",
    PRODUCAO:"Produção",
    ENTREGA:"Entrega/Vendas",
    CONSULTA:"Consulta"
  }[perfil] || perfil || "-";
}

function podeVerModulo(modulo) {
  const u = state.usuarioAtual;
  if (!u || !u.ativo) return false;
  if (modulo === "administracao") return u.perfil === "ADMIN";
  if (u.perfil === "ADMIN") return true;
  return !!u.permissoes?.[modulo]?.ver;
}

function podeEditarModulo(modulo) {
  const u = state.usuarioAtual;
  if (!u || !u.ativo) return false;
  if (modulo === "administracao") return u.perfil === "ADMIN";
  if (u.perfil === "ADMIN") return true;
  return !!u.permissoes?.[modulo]?.editar;
}

function mostrarAcessoAguardando(mensagem) {
  document.getElementById("loginScreen").style.display = "none";
  const cadastro = document.getElementById("cadastroScreen");
  if (cadastro) cadastro.style.display = "none";
  document.getElementById("app").style.display = "none";
  const screen = document.getElementById("accessScreen");
  screen.style.display = "flex";
  document.getElementById("accessScreenMessage").innerText = mensagem ||
    "Seu login existe, mas ainda não foi ativado pelo administrador.";
}

async function carregarUsuarioAtual() {
  const { data:sessao } = await sb.auth.getSession();
  const authUser = sessao.session?.user;
  if (!authUser) return null;

  const { data, error } = await sb.from("usuarios_app")
    .select("*")
    .eq("id",authUser.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  data.email = data.email || authUser.email;
  data.permissoes = data.permissoes || permissoesPadraoPerfil(data.perfil);
  state.usuarioAtual = data;
  return data;
}

function aplicarPermissoesInterface() {
  const usuario = state.usuarioAtual;
  if (!usuario) return;

  document.querySelectorAll("[data-modulo]").forEach(el => {
    const modulo = el.dataset.modulo;
    el.style.display = podeVerModulo(modulo) ? "" : "none";
  });

  document.querySelectorAll("[data-editar-modulo]").forEach(el => {
    el.style.display = podeEditarModulo(el.dataset.editarModulo) ? "" : "none";
  });

  const btn = document.getElementById("btnUsuarioAtual");
  if (btn) btn.innerText = usuario.nome || usuario.email || "Minha conta";

  document.getElementById("minhaContaNome").innerText = usuario.nome || "Usuário";
  document.getElementById("minhaContaEmail").innerText = usuario.email || "";
  document.getElementById("minhaContaPerfil").innerText = rotuloPerfilAcesso(usuario.perfil);
}

async function iniciarApp() {
  try {
    const usuario = await carregarUsuarioAtual();
    if (!usuario) {
      mostrarAcessoAguardando("O perfil deste login ainda não foi criado. Peça ao administrador para executar a atualização de acesso.");
      return;
    }
    if (!usuario.ativo) {
      mostrarAcessoAguardando(`O acesso de ${usuario.email || "este usuário"} está aguardando ativação pelo administrador.`);
      return;
    }

    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("accessScreen").style.display = "none";
    document.getElementById("app").style.display = "block";

    if (typeof instalarProtecaoFormularios === "function") instalarProtecaoFormularios();
    aplicarPermissoesInterface();

    const primeiraTela = podeVerModulo("dashboard") ? "inicio"
      : podeVerModulo("producao") ? "producao"
      : podeVerModulo("estoque") ? "estoque"
      : podeVerModulo("saidas") ? "saidas"
      : "mais";

    mostrarTela(primeiraTela);
  } catch(e) {
    mostrarAcessoAguardando("Não foi possível conferir as permissões: " + e.message);
  }
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
  await iniciarApp();
}

const mostrarTelaSemControleAcesso = mostrarTela;
mostrarTela = function(nome) {
  if (nome === "minhaConta") {
    document.querySelectorAll(".tela").forEach(t => t.classList.remove("active"));
    document.getElementById("telaMinhaConta").classList.add("active");
    aplicarPermissoesInterface();
    return;
  }

  const modulo = TELA_MODULO_ACESSO[nome];
  if (modulo && !podeVerModulo(modulo)) {
    alert("Seu usuário não possui acesso a esta área.");
    return;
  }

  if (nome === "usuarios") {
    document.querySelectorAll(".tela").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".bottomNav button").forEach(b => b.classList.remove("active"));
    document.getElementById("telaUsuarios").classList.add("active");
    document.querySelectorAll(".bottomNav button")[4]?.classList.add("active");
    carregarUsuariosAcesso();
    aplicarPermissoesInterface();
    return;
  }

  mostrarTelaSemControleAcesso(nome);
  aplicarPermissoesInterface();
};

function bloquearAcaoSemPermissao(evento, modulo) {
  if (podeEditarModulo(modulo)) return false;
  evento.preventDefault();
  evento.stopPropagation();
  evento.stopImmediatePropagation();
  alert("Seu perfil permite somente consultar esta área.");
  return true;
}

document.addEventListener("click", event => {
  const el = event.target.closest("[data-editar-modulo]");
  if (el) bloquearAcaoSemPermissao(event,el.dataset.editarModulo);
}, true);

const alterarStatusLoteSemAcesso = typeof alterarStatusLote === "function" ? alterarStatusLote : null;
if (alterarStatusLoteSemAcesso) {
  alterarStatusLote = async function(...args) {
    if (!podeEditarModulo("lotes") && !podeEditarModulo("producao")) {
      alert("Seu perfil não pode alterar o status do lote.");
      return;
    }
    return alterarStatusLoteSemAcesso(...args);
  };
}

const abrirEnvaseDoLoteSemAcesso = typeof abrirEnvaseDoLote === "function" ? abrirEnvaseDoLote : null;
if (abrirEnvaseDoLoteSemAcesso) {
  abrirEnvaseDoLote = async function(...args) {
    if (!podeEditarModulo("producao")) {
      alert("Seu perfil não pode registrar envases.");
      return;
    }
    return abrirEnvaseDoLoteSemAcesso(...args);
  };
}

async function trocarMinhaSenha() {
  mostrarErro("minhaContaErro","");
  const senha = document.getElementById("minhaContaSenha").value;
  const confirmar = document.getElementById("minhaContaSenhaConfirmar").value;

  if (senha.length < 8) {
    mostrarErro("minhaContaErro","A nova senha precisa ter pelo menos 8 caracteres.");
    return;
  }
  if (senha !== confirmar) {
    mostrarErro("minhaContaErro","As senhas não são iguais.");
    return;
  }

  const { error } = await sb.auth.updateUser({ password:senha });
  if (error) {
    mostrarErro("minhaContaErro",error.message);
    return;
  }

  document.getElementById("minhaContaSenha").value = "";
  document.getElementById("minhaContaSenhaConfirmar").value = "";
  alert("Senha alterada.");
}

function renderPermissoesUsuario(permissoes) {
  const grid = document.getElementById("usuarioPermissoesGrid");
  grid.innerHTML = "";

  MODULOS_ACESSO.forEach(modulo => {
    const p = permissoes?.[modulo.id] || { ver:false, editar:false };
    grid.insertAdjacentHTML("beforeend", `
      <div class="permissionRow">
        <strong>${escapeHtml(modulo.nome)}</strong>
        <label class="permissionToggle">Ver
          <input type="checkbox" data-permissao-modulo="${modulo.id}" data-permissao-acao="ver" ${p.ver ? "checked" : ""}>
        </label>
        <label class="permissionToggle">Alterar
          <input type="checkbox" data-permissao-modulo="${modulo.id}" data-permissao-acao="editar" ${p.editar ? "checked" : ""}>
        </label>
      </div>
    `);
  });
}

function coletarPermissoesFormulario() {
  const p = permissoesPadraoPerfil("CONSULTA");
  Object.keys(p).forEach(k => p[k] = { ver:false, editar:false });

  document.querySelectorAll("[data-permissao-modulo]").forEach(input => {
    const modulo = input.dataset.permissaoModulo;
    const acao = input.dataset.permissaoAcao;
    p[modulo] ||= { ver:false, editar:false };
    p[modulo][acao] = input.checked;
  });

  Object.keys(p).forEach(modulo => {
    if (p[modulo].editar) p[modulo].ver = true;
  });
  return p;
}

function aplicarPerfilPadraoFormulario() {
  const perfil = document.getElementById("usuarioAcessoPerfil").value;
  renderPermissoesUsuario(permissoesPadraoPerfil(perfil));
  const disabled = perfil === "ADMIN";
  document.querySelectorAll("[data-permissao-modulo]").forEach(i => {
    if (disabled) i.checked = true;
    i.disabled = disabled;
  });
}

async function carregarUsuariosAcesso() {
  if (state.usuarioAtual?.perfil !== "ADMIN") return;

  const { data, error } = await sb.from("usuarios_app")
    .select("*")
    .order("ativo",{ascending:false})
    .order("nome",{ascending:true});

  const box = document.getElementById("listaUsuariosAcesso");
  if (error) {
    box.innerHTML = `<div class="item"><span class="sub">${escapeHtml(error.message)}</span></div>`;
    return;
  }

  state.usuariosAcesso = data || [];
  const ativos = state.usuariosAcesso.filter(u => u.ativo).length;
  const pendentes = state.usuariosAcesso.filter(u => !u.ativo).length;
  const admins = state.usuariosAcesso.filter(u => u.ativo && u.perfil === "ADMIN").length;

  document.getElementById("usuariosResumo").innerHTML = `
    <div class="card"><span>Usuários</span><strong>${state.usuariosAcesso.length}</strong></div>
    <div class="card"><span>Ativos</span><strong>${ativos}</strong></div>
    <div class="card"><span>Aguardando</span><strong>${pendentes}</strong></div>
    <div class="card"><span>Administradores</span><strong>${admins}</strong></div>
  `;

  box.innerHTML = state.usuariosAcesso.length ? "" : '<div class="item"><span class="sub">Nenhum usuário encontrado.</span></div>';
  state.usuariosAcesso.forEach((u,idx) => {
    box.insertAdjacentHTML("beforeend", `
      <div class="item searchable ${u.ativo ? "userActive" : "userInactive"}">
        <div>
          <strong>${escapeHtml(u.nome || u.email || "Usuário")}</strong>
          <div class="sub">${escapeHtml(u.email || "")}</div>
          <div class="sub">${escapeHtml(rotuloPerfilAcesso(u.perfil))} • ${u.ativo ? "Ativo" : "Aguardando ativação"}</div>
          <div class="rowActions">
            <button class="btnTiny btnEdit" data-editar-modulo="administracao" onclick="editarUsuarioAcesso(${idx})">Editar acesso</button>
          </div>
        </div>
        <span class="badge ${u.ativo ? "" : "zero"}">${u.ativo ? "ATIVO" : "BLOQUEADO"}</span>
      </div>
    `);
  });
  aplicarPermissoesInterface();
}

function editarUsuarioAcesso(idx) {
  const u = state.usuariosAcesso?.[idx];
  if (!u) return;

  document.getElementById("usuarioAcessoId").value = u.id;
  document.getElementById("usuarioAcessoNome").value = u.nome || "";
  document.getElementById("usuarioAcessoEmail").value = u.email || "";
  document.getElementById("usuarioAcessoPerfil").value = u.perfil || "CONSULTA";
  document.getElementById("usuarioAcessoAtivo").checked = !!u.ativo;
  renderPermissoesUsuario(u.permissoes || permissoesPadraoPerfil(u.perfil));

  if (u.perfil === "ADMIN") {
    document.querySelectorAll("[data-permissao-modulo]").forEach(i => {
      i.checked = true;
      i.disabled = true;
    });
  }

  mostrarErro("usuarioAcessoErro","");
  const form = document.getElementById("formUsuarioAcesso");
  form.style.display = "block";
  form.scrollIntoView({behavior:"smooth",block:"start"});
}

async function salvarUsuarioAcesso() {
  mostrarErro("usuarioAcessoErro","");
  if (state.usuarioAtual?.perfil !== "ADMIN") {
    mostrarErro("usuarioAcessoErro","Somente administradores podem alterar acessos.");
    return;
  }

  const id = document.getElementById("usuarioAcessoId").value;
  const nome = document.getElementById("usuarioAcessoNome").value.trim();
  const perfil = document.getElementById("usuarioAcessoPerfil").value;
  const ativo = document.getElementById("usuarioAcessoAtivo").checked;
  const permissoes = perfil === "ADMIN"
    ? permissoesPadraoPerfil("ADMIN")
    : coletarPermissoesFormulario();

  const { error } = await sb.from("usuarios_app")
    .update({ nome,perfil,ativo,permissoes,atualizado_em:new Date().toISOString() })
    .eq("id",id);

  if (error) {
    mostrarErro("usuarioAcessoErro",error.message);
    return;
  }

  document.getElementById("formUsuarioAcesso").style.display = "none";

  if (id === state.usuarioAtual.id) {
    await carregarUsuarioAtual();
    aplicarPermissoesInterface();
  }

  alert("Acesso atualizado.");
  await carregarUsuariosAcesso();
}

/* ==========================================================
   CADASTRO DE USUÁRIO NA TELA DE LOGIN
   ========================================================== */

function limparMensagensCadastro() {
  const erro = document.getElementById("cadastroErro");
  const sucesso = document.getElementById("cadastroSucesso");

  if (erro) {
    erro.style.display = "none";
    erro.innerText = "";
  }

  if (sucesso) {
    sucesso.style.display = "none";
    sucesso.innerText = "";
  }
}

function mostrarCadastro() {
  limparMensagensCadastro();

  const emailLogin = document.getElementById("loginEmail")?.value.trim() || "";
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("accessScreen").style.display = "none";
  document.getElementById("app").style.display = "none";
  document.getElementById("cadastroScreen").style.display = "flex";

  if (emailLogin && !document.getElementById("cadastroEmail").value) {
    document.getElementById("cadastroEmail").value = emailLogin;
  }

  setTimeout(() => document.getElementById("cadastroNome")?.focus(), 80);
}

function voltarParaLogin() {
  const email = document.getElementById("cadastroEmail")?.value.trim() || "";
  document.getElementById("cadastroScreen").style.display = "none";
  document.getElementById("accessScreen").style.display = "none";
  document.getElementById("app").style.display = "none";
  document.getElementById("loginScreen").style.display = "flex";

  if (email) document.getElementById("loginEmail").value = email;
  document.getElementById("loginSenha").value = "";
  document.getElementById("loginErro").style.display = "none";
  setTimeout(() => document.getElementById("loginSenha")?.focus(), 80);
}

function mostrarErroCadastro(mensagem) {
  const erro = document.getElementById("cadastroErro");
  const sucesso = document.getElementById("cadastroSucesso");
  sucesso.style.display = "none";
  erro.innerText = mensagem;
  erro.style.display = "block";
}

async function cadastrarNovoUsuario() {
  limparMensagensCadastro();

  const nome = document.getElementById("cadastroNome").value.trim();
  const email = document.getElementById("cadastroEmail").value.trim().toLowerCase();
  const senha = document.getElementById("cadastroSenha").value;
  const confirmar = document.getElementById("cadastroSenhaConfirmar").value;
  const btn = document.getElementById("cadastroEnviarBtn");

  if (nome.length < 2) {
    mostrarErroCadastro("Informe o nome da pessoa.");
    return;
  }

  if (!email || !email.includes("@")) {
    mostrarErroCadastro("Informe um e-mail válido.");
    return;
  }

  if (senha.length < 8) {
    mostrarErroCadastro("A senha precisa ter pelo menos 8 caracteres.");
    return;
  }

  if (senha !== confirmar) {
    mostrarErroCadastro("As senhas não são iguais.");
    return;
  }

  btn.disabled = true;
  const textoAnterior = btn.innerText;
  btn.innerText = "Enviando cadastro...";

  try {
    const { data, error } = await sb.auth.signUp({
      email,
      password:senha,
      options:{
        data:{
          name:nome,
          full_name:nome
        }
      }
    });

    if (error) throw error;

    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      mostrarErroCadastro("Este e-mail já possui cadastro. Use o botão Voltar para entrar.");
      return;
    }

    document.getElementById("cadastroSenha").value = "";
    document.getElementById("cadastroSenhaConfirmar").value = "";

    if (data.session) {
      mostrarAcessoAguardando(
        `Cadastro de ${email} criado. Agora o administrador precisa ativar o usuário e definir as permissões.`
      );
      return;
    }

    const sucesso = document.getElementById("cadastroSucesso");
    sucesso.innerText =
      "Cadastro enviado. Confira seu e-mail caso seja solicitada uma confirmação. Depois, aguarde o administrador liberar o acesso.";
    sucesso.style.display = "block";

    document.getElementById("loginEmail").value = email;
  } catch(e) {
    const mensagem = String(e?.message || e || "Não foi possível criar o cadastro.");
    mostrarErroCadastro(
      mensagem.toLowerCase().includes("signups not allowed")
        ? "O cadastro de novos usuários está desativado no Supabase. O administrador precisa habilitar o cadastro por e-mail."
        : mensagem
    );
  } finally {
    btn.disabled = false;
    btn.innerText = textoAnterior;
  }
}


/* ==========================================================
   LOGIN COM GOOGLE
   ========================================================== */

const GOOGLE_LOGIN_REDIRECT = "https://regrizzo.github.io/erp-cervejaria-da-lagoa/";

async function entrarComGoogle() {
  const erro = document.getElementById("loginErro");
  const btn = document.getElementById("loginGoogleBtn");

  if (erro) erro.style.display = "none";
  if (btn) {
    btn.disabled = true;
    btn.querySelector("span:last-child").innerText = "Abrindo Google...";
  }

  try {
    const { error } = await sb.auth.signInWithOAuth({
      provider:"google",
      options:{
        redirectTo:GOOGLE_LOGIN_REDIRECT,
        queryParams:{
          prompt:"select_account"
        }
      }
    });

    if (error) throw error;
  } catch(e) {
    if (erro) {
      erro.innerText = String(e?.message || e || "Não foi possível entrar com Google.");
      erro.style.display = "block";
    }

    if (btn) {
      btn.disabled = false;
      btn.querySelector("span:last-child").innerText = "Continuar com Google";
    }
  }
}

// Garante a abertura do app depois que o Google devolver o usuário ao site.
sb.auth.onAuthStateChange((evento, sessao) => {
  if (evento === "SIGNED_IN" && sessao) {
    setTimeout(() => iniciarApp(), 0);
  }
});
