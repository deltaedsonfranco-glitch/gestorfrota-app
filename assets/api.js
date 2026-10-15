/* ============================================================
 * API.JS — comunicação das telas (GitHub Pages) com o servidor
 * (Apps Script, Api.gs) e controle da sessão no navegador.
 *
 * Substitui o google.script.run da versão antiga. O endereço da
 * API fica em config.js (único lugar para trocar).
 * ============================================================
 */

const CHAVE_TOKEN_LOCALSTORAGE = 'gestorfrota_token';
const CHAVE_USUARIO_LOCALSTORAGE = 'gestorfrota_usuario';
const CHAVE_AVISO_LOGIN = 'gestorfrota_aviso_login';

const appState = {
  secaoAtual: 'dashboard',
  tema: 'claro',
  graficoReceitaDespesa: null,
  carregadoresSecao: {}
};

/* ---------- armazenamento local (protegido contra bloqueio) ---------- */
function lerLocal(chave) {
  try { return localStorage.getItem(chave); } catch (e) { return null; }
}
function gravarLocal(chave, valor) {
  try { localStorage.setItem(chave, valor); } catch (e) { /* navegador bloqueou */ }
}
function apagarLocal(chave) {
  try { localStorage.removeItem(chave); } catch (e) { /* ignora */ }
}
function lerUsuarioSalvo() {
  try { return JSON.parse(lerLocal(CHAVE_USUARIO_LOCALSTORAGE) || 'null'); } catch (e) { return null; }
}
function limparSessaoLocal() {
  apagarLocal(CHAVE_TOKEN_LOCALSTORAGE);
  apagarLocal(CHAVE_USUARIO_LOCALSTORAGE);
}
function guardarAvisoLogin(texto) {
  try { sessionStorage.setItem(CHAVE_AVISO_LOGIN, texto || ''); } catch (e) { /* ignora */ }
}
function pegarAvisoLogin() {
  try {
    const t = sessionStorage.getItem(CHAVE_AVISO_LOGIN) || '';
    sessionStorage.removeItem(CHAVE_AVISO_LOGIN);
    return t;
  } catch (e) { return ''; }
}

function paginaDoPerfil(perfil) {
  return perfil === 'GESTOR' ? 'gestor.html' : 'motorista.html';
}

/* ---------- chamada ao servidor ---------- */

/**
 * Envia um pedido para a API (Api.gs) e devolve uma Promise com
 * o campo "dados" da resposta. Usa Content-Type text/plain para
 * o navegador não exigir a etapa extra de CORS, que o Apps
 * Script não suporta.
 */
function apiPost(pedido) {
  const url = (window.GF_CONFIG && window.GF_CONFIG.API_URL) || '';
  if (!url || url.indexOf('script.google.com') === -1) {
    return Promise.reject(new Error('Endereço da API não configurado (arquivo config.js).'));
  }
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(pedido),
    redirect: 'follow'
  })
    .catch(function () {
      throw new Error('Sem conexão com o servidor. Verifique a internet e tente de novo.');
    })
    .then(function (resposta) {
      if (!resposta.ok) throw new Error('O servidor não respondeu corretamente (código ' + resposta.status + ').');
      return resposta.json().catch(function () {
        throw new Error('Resposta inválida do servidor. Confira o endereço da API em config.js.');
      });
    })
    .then(function (json) {
      if (!json || json.ok !== true) {
        throw new Error((json && json.erro) || 'Erro desconhecido no servidor.');
      }
      return json.dados;
    });
}

function ehErroDeSessao(mensagem) {
  return /sess[ãa]o|usu[áa]rio n[ãa]o encontrado|usu[áa]rio est[áa] inativo/i.test(mensagem || '');
}

function voltarParaLogin(aviso) {
  window.APP_REDIRECIONANDO = true;
  limparSessaoLocal();
  if (aviso) guardarAvisoLogin(aviso);
  window.location.replace('index.html');
}

/**
 * Mesmo nome e mesmo uso da versão antiga:
 *   chamarBackend('listarVeiculos').then(...)
 * Toda chamada passa pelo roteador chamarAutenticado no servidor.
 */
function chamarBackend(nomeFuncao) {
  const args = Array.prototype.slice.call(arguments, 1);
  if (window.APP_REDIRECIONANDO) return new Promise(function () {}); // página saindo

  return apiPost({ acao: 'chamar', funcao: nomeFuncao, token: window.APP_TOKEN, args: args })
    .catch(function (erro) {
      if (ehErroDeSessao(erro.message)) {
        voltarParaLogin(erro.message);
        return new Promise(function () {});
      }
      throw erro;
    });
}

/* ============================================================
 * PÁGINAS DO SISTEMA (gestor.html / motorista.html)
 * ============================================================
 */

/**
 * Roda no <head>, antes de tudo: confere se há sessão salva e se
 * a página é a do perfil certo. Sem sessão → volta ao login.
 */
function protegerPagina(perfilDaPagina) {
  const token = lerLocal(CHAVE_TOKEN_LOCALSTORAGE);
  const usuario = lerUsuarioSalvo();
  if (!token || !usuario || !usuario.perfil) {
    voltarParaLogin('');
    return;
  }
  if (usuario.perfil !== perfilDaPagina) {
    window.APP_REDIRECIONANDO = true;
    window.location.replace(paginaDoPerfil(usuario.perfil));
    return;
  }
  window.APP_TOKEN = token;
  window.APP_USUARIO = usuario;
}

function preencherDadosUsuario(usuario, nomeEmpresa) {
  if (nomeEmpresa) {
    document.querySelectorAll('[data-campo="nomeEmpresa"]').forEach(function (el) { el.textContent = nomeEmpresa; });
    document.title = nomeEmpresa;
  }
  if (usuario) {
    document.querySelectorAll('[data-campo="usuarioNome"]').forEach(function (el) { el.textContent = usuario.nome || ''; });
    document.querySelectorAll('[data-campo="usuarioPerfil"]').forEach(function (el) { el.textContent = usuario.perfil || ''; });
  }
}

/**
 * Confere a sessão com o servidor em segundo plano. Se o token
 * venceu, o usuário foi inativado ou o perfil mudou, volta ao login.
 */
function conferirSessaoNoServidor() {
  apiPost({ acao: 'sessao', token: window.APP_TOKEN }).then(function (r) {
    const u = r.usuario;
    if (!u || !u.autorizado) {
      voltarParaLogin((u && u.motivo) || 'Sua sessão expirou. Faça login novamente.');
      return;
    }
    const salvo = { email: u.email, nome: u.nome, perfil: u.perfil, idMotorista: u.idMotorista };
    gravarLocal(CHAVE_USUARIO_LOCALSTORAGE, JSON.stringify(salvo));
    gravarLocal('gestorfrota_nome_empresa', r.nomeEmpresa || '');
    if (salvo.perfil !== window.APP_USUARIO.perfil) {
      window.APP_REDIRECIONANDO = true;
      window.location.replace(paginaDoPerfil(salvo.perfil));
      return;
    }
    window.APP_USUARIO = salvo;
    preencherDadosUsuario(salvo, r.nomeEmpresa);
  }).catch(function () {
    // Sem internet: segue com os dados salvos; as chamadas
    // seguintes mostram o erro normalmente.
  });
}

function inicializarLogout() {
  const btnSair = document.getElementById('btn-sair');
  if (!btnSair) return;
  btnSair.addEventListener('click', function () {
    const token = window.APP_TOKEN;
    window.APP_REDIRECIONANDO = true;
    limparSessaoLocal();
    const sair = function () { window.location.replace('index.html'); };
    apiPost({ acao: 'logout', token: token }).then(sair, sair);
    setTimeout(sair, 2500); // não deixa o usuário preso se a rede falhar
  });
}

function iniciarPaginaSistema() {
  if (window.APP_REDIRECIONANDO) return;
  if (window.lucide) lucide.createIcons();
  preencherDadosUsuario(window.APP_USUARIO, lerLocal('gestorfrota_nome_empresa'));
  inicializarNavegacao();
  inicializarTema();
  inicializarMenuMobile();
  inicializarLogout();
  carregarSecaoInicial();
  // Na versão do zip, o painel do motorista só carregava os dados
  // depois de tocar em "Início" no menu. Aqui já carrega ao abrir.
  if (window.APP_USUARIO.perfil === 'MOTORISTA' && appState.carregadoresSecao.motorista) {
    appState.carregadoresSecao.motorista();
  }
  conferirSessaoNoServidor();
}

/* ============================================================
 * PÁGINA DE LOGIN (index.html)
 * ============================================================
 */
function iniciarPaginaLogin() {
  if (window.lucide) lucide.createIcons();

  // Já tem sessão salva? Vai direto para a página do perfil
  // (lá a sessão é conferida com o servidor).
  const token = lerLocal(CHAVE_TOKEN_LOCALSTORAGE);
  const usuario = lerUsuarioSalvo();
  if (token && usuario && usuario.perfil) {
    window.location.replace(paginaDoPerfil(usuario.perfil));
    return;
  }

  const aviso = pegarAvisoLogin();
  const avisoEl = document.getElementById('login-aviso-sessao');
  if (aviso && avisoEl) {
    avisoEl.textContent = aviso;
    avisoEl.classList.remove('oculto');
  }

  const nomeSalvo = lerLocal('gestorfrota_nome_empresa');
  if (nomeSalvo) preencherDadosUsuario(null, nomeSalvo);
  apiPost({ acao: 'config' }).then(function (c) {
    if (c && c.nomeEmpresa) {
      gravarLocal('gestorfrota_nome_empresa', c.nomeEmpresa);
      preencherDadosUsuario(null, c.nomeEmpresa);
    }
  }).catch(function () { /* mantém o nome padrão */ });

  inicializarTelaLogin();
}

function entrarComResultado(resultado) {
  gravarLocal(CHAVE_TOKEN_LOCALSTORAGE, resultado.token);
  gravarLocal(CHAVE_USUARIO_LOCALSTORAGE, JSON.stringify(resultado.usuario));
  window.location.replace(paginaDoPerfil(resultado.usuario.perfil));
}

function travarBotao(form, travar) {
  const btn = form.querySelector('button[type="submit"]');
  if (!btn) return;
  btn.disabled = travar;
  if (travar) { btn.dataset.textoOriginal = btn.textContent; btn.textContent = 'Aguarde...'; }
  else if (btn.dataset.textoOriginal) { btn.textContent = btn.dataset.textoOriginal; }
}

function inicializarTelaLogin() {
  const abaMotorista = document.getElementById('aba-login-motorista');
  const abaGestor = document.getElementById('aba-login-gestor');
  const formMotorista = document.getElementById('form-login-motorista');
  const formGestor = document.getElementById('form-login-gestor');
  const formRecuperar = document.getElementById('form-recuperar-senha');

  function mostrarAba(aba) {
    formMotorista.classList.toggle('oculto', aba !== 'motorista');
    formGestor.classList.toggle('oculto', aba !== 'gestor');
    formRecuperar.classList.add('oculto');
    abaMotorista.classList.toggle('ativa', aba === 'motorista');
    abaGestor.classList.toggle('ativa', aba === 'gestor');
  }

  abaMotorista.addEventListener('click', function () { mostrarAba('motorista'); });
  abaGestor.addEventListener('click', function () { mostrarAba('gestor'); });

  // -------- Login do motorista: placa + senha --------
  formMotorista.addEventListener('submit', function (ev) {
    ev.preventDefault();
    const placa = document.getElementById('login-placa').value;
    const senha = document.getElementById('login-senha-motorista').value;
    const erroEl = document.getElementById('login-motorista-mensagem-erro');
    erroEl.classList.add('oculto');
    travarBotao(formMotorista, true);

    apiPost({ acao: 'loginPlaca', placa: placa, senha: senha })
      .then(entrarComResultado)
      .catch(function (erro) {
        travarBotao(formMotorista, false);
        erroEl.textContent = (erro && erro.message) ? erro.message : 'Placa ou senha inválidos.';
        erroEl.classList.remove('oculto');
      });
  });

  // -------- Login do gestor: e-mail + senha --------
  formGestor.addEventListener('submit', function (ev) {
    ev.preventDefault();
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;
    const erroEl = document.getElementById('login-mensagem-erro');
    erroEl.classList.add('oculto');
    travarBotao(formGestor, true);

    apiPost({ acao: 'login', email: email, senha: senha })
      .then(entrarComResultado)
      .catch(function (erro) {
        travarBotao(formGestor, false);
        erroEl.textContent = (erro && erro.message) ? erro.message : 'E-mail ou senha inválidos.';
        erroEl.classList.remove('oculto');
      });
  });

  // -------- Esqueci minha senha (motorista) --------
  document.getElementById('btn-esqueci-senha').addEventListener('click', function () {
    formMotorista.classList.add('oculto');
    formGestor.classList.add('oculto');
    formRecuperar.classList.remove('oculto');
  });
  document.getElementById('btn-voltar-login').addEventListener('click', function () {
    formRecuperar.classList.add('oculto');
    mostrarAba('motorista');
  });

  formRecuperar.addEventListener('submit', function (ev) {
    ev.preventDefault();
    const erroEl = document.getElementById('rec-mensagem-erro');
    const sucessoEl = document.getElementById('rec-mensagem-sucesso');
    erroEl.classList.add('oculto');
    sucessoEl.classList.add('oculto');
    travarBotao(formRecuperar, true);

    apiPost({
      acao: 'redefinirSenha',
      email: document.getElementById('rec-email').value,
      nome: document.getElementById('rec-nome').value,
      nascimento: document.getElementById('rec-nascimento').value,
      novaSenha: document.getElementById('rec-nova-senha').value
    }).then(function () {
      travarBotao(formRecuperar, false);
      sucessoEl.textContent = 'Senha redefinida! Você já pode entrar com a nova senha.';
      sucessoEl.classList.remove('oculto');
      formRecuperar.reset();
    }).catch(function (erro) {
      travarBotao(formRecuperar, false);
      erroEl.textContent = (erro && erro.message) ? erro.message : 'Não foi possível redefinir a senha.';
      erroEl.classList.remove('oculto');
    });
  });
}
