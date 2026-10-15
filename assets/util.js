/* Utilitários de tela (loader, avisos, executar, navegação).
 * Copiado de JavaScript1.html (Apps Script). */

  function mostrarLoader() {
    const loader = document.getElementById('loader-global');
    if (loader) loader.classList.remove('oculto');
  }

  function ocultarLoader() {
    const loader = document.getElementById('loader-global');
    if (loader) loader.classList.add('oculto');
  }

  function mostrarToast(mensagem, tipo) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast' + (tipo ? ' ' + tipo : '');
    toast.textContent = mensagem;
    container.appendChild(toast);
    setTimeout(function () {
      toast.remove();
    }, 5000);
  }

  /**
   * Executa uma chamada ao backend já tratando loader e erros
   * de forma padronizada. Uso:
   *   executar('getDadosDashboardGestor').then(function(dados) {...});
   */
  function executar(nomeFuncao) {
    const args = Array.prototype.slice.call(arguments, 1);
    mostrarLoader();
    return chamarBackend.apply(null, [nomeFuncao].concat(args))
      .catch(function (erro) {
        mostrarToast(erro && erro.message ? erro.message : 'Ocorreu um erro inesperado.', 'erro');
        throw erro;
      })
      .finally(function () {
        ocultarLoader();
      });
  }

  /* ============================================================
   * NAVEGAÇÃO ENTRE SEÇÕES
   * ============================================================
   */
  function inicializarNavegacao() {
    const itens = document.querySelectorAll('.menu-item');
    itens.forEach(function (item) {
      item.addEventListener('click', function (ev) {
        ev.preventDefault();
        const secao = item.getAttribute('data-secao');
        irParaSecao(secao);
        fecharMenuMobile();
      });
    });
  }

  function irParaSecao(secao) {
    document.querySelectorAll('.menu-item').forEach(function (i) {
      i.classList.toggle('ativo', i.getAttribute('data-secao') === secao);
    });
    document.querySelectorAll('.secao').forEach(function (s) {
      s.classList.add('oculto');
    });
    const alvo = document.getElementById('secao-' + secao);
    if (alvo) alvo.classList.remove('oculto');
    appState.secaoAtual = secao;

    // Cada módulo pode registrar uma função de carregamento em
    // appState.carregadoresSecao[secao] = function() {...}
    // Assim evitamos recarregar tudo sempre e cada arquivo de
    // módulo (Veiculos.html, Viagens.html etc.) fica independente.
    if (appState.carregadoresSecao && appState.carregadoresSecao[secao]) {
      appState.carregadoresSecao[secao]();
    }
  }

