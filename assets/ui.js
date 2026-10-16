  /**
   * Registra a função responsável por carregar os dados de uma
   * seção quando ela é aberta pela primeira vez / navegada até.
   * Cada arquivo de módulo chama isso no seu próprio <script>.
   */
  function registrarCarregadorSecao(secao, funcao) {
    appState.carregadoresSecao[secao] = funcao;
  }

  function carregarSecaoInicial() {
    const perfil = document.getElementById('app') ? document.getElementById('app').dataset.perfil : null;
    if (perfil === 'GESTOR') {
      registrarCarregadorSecao('dashboard', carregarDashboardGestor);
      carregarDashboardGestor();
    }
  }

  /* ============================================================
   * MENU MOBILE (gaveta lateral)
   * ============================================================
   */
  function inicializarMenuMobile() {
    const btnToggle = document.getElementById('btn-toggle-menu');
    const overlay = document.getElementById('overlay-sidebar');
    if (btnToggle) {
      btnToggle.addEventListener('click', function () {
        document.getElementById('sidebar').classList.add('aberta');
        overlay.classList.add('visivel');
      });
    }
    if (overlay) {
      overlay.addEventListener('click', fecharMenuMobile);
    }
  }

  function fecharMenuMobile() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay-sidebar');
    if (sidebar) sidebar.classList.remove('aberta');
    if (overlay) overlay.classList.remove('visivel');
  }

  /* ============================================================
   * TEMA CLARO/ESCURO (mantido apenas em memória durante a sessão,
   * sem uso de localStorage/sessionStorage, conforme requisito)
   * ============================================================
   */
  function inicializarTema() {
    const btnTema = document.getElementById('btn-tema');
    if (!btnTema) return;
    btnTema.addEventListener('click', function () {
      appState.tema = (appState.tema === 'claro') ? 'escuro' : 'claro';
      document.documentElement.setAttribute('data-theme', appState.tema);
      const icone = btnTema.querySelector('i');
      if (icone && window.lucide) {
        icone.setAttribute('data-lucide', appState.tema === 'escuro' ? 'sun' : 'moon');
        lucide.createIcons();
      }
    });
  }

  /* ============================================================
   * MODAL GENÉRICO (usado pelos módulos de cadastro/formulário)
   * ============================================================
   */
  document.addEventListener('DOMContentLoaded', function () {
    const btnFechar = document.getElementById('modal-fechar');
    const overlay = document.getElementById('modal-overlay');
    if (btnFechar) btnFechar.addEventListener('click', fecharModal);
    if (overlay) {
      overlay.addEventListener('click', function (ev) {
        if (ev.target === overlay) fecharModal();
      });
    }
  });

  /**
   * Abre o modal genérico com um título e um HTML de corpo
   * (normalmente um formulário). Retorna o elemento #modal-corpo
   * para que o chamador possa adicionar listeners aos campos.
   */
  function abrirModal(titulo, htmlCorpo) {
    document.getElementById('modal-titulo').textContent = titulo;
    const corpo = document.getElementById('modal-corpo');
    corpo.innerHTML = htmlCorpo;
    document.getElementById('modal-overlay').classList.remove('oculto');
    if (window.lucide) lucide.createIcons();
    return corpo;
  }

  function fecharModal() {
    document.getElementById('modal-overlay').classList.add('oculto');
    document.getElementById('modal-corpo').innerHTML = '';
  }

  /* ============================================================
   * HELPERS DE CONSTRUÇÃO DE CAMPOS DE FORMULÁRIO
   * Centralizados aqui (arquivo sempre carregado) para serem
   * reaproveitados por qualquer módulo — telas de cadastro do
   * gestor e painel do motorista.
   * ============================================================
   */
  function campoTexto(label, id, valor, placeholder) {
    return '<div class="campo"><label for="' + id + '">' + label + '</label>' +
      '<input type="text" id="' + id + '" value="' + (valor || '') + '" placeholder="' + (placeholder || '') + '"></div>';
  }
  function campoNumero(label, id, valor) {
    return '<div class="campo"><label for="' + id + '">' + label + '</label>' +
      '<input type="number" step="0.01" id="' + id + '" value="' + (valor !== undefined && valor !== null ? valor : '') + '"></div>';
  }
  function campoData(label, id, valorDate) {
    const valorFormatado = valorDate ? new Date(valorDate).toLocaleDateString('pt-BR') : '';
    return '<div class="campo"><label for="' + id + '">' + label + '</label>' +
      '<input type="text" id="' + id + '" placeholder="dd/mm/aaaa" value="' + valorFormatado + '"></div>';
  }
  function campoDataHora(label, id, valorDate) {
    const d = valorDate ? new Date(valorDate) : new Date();
    const pad = function (n) { return String(n).padStart(2, '0'); };
    const valorFormatado = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    return '<div class="campo"><label for="' + id + '">' + label + '</label>' +
      '<input type="datetime-local" id="' + id + '" value="' + valorFormatado + '"></div>';
  }

  /**
   * Linhas do memorial de cálculo: as de categoria INFORMATIVO_* (recebido
   * do cliente, saldo a receber, repasse) são apenas informativas — não têm
   * sinal de + ou − e aparecem em cinza/itálico.
   */
  function ehMemorialInformativo(m) {
    return String(m.categoria || '').indexOf('INFORMATIVO') === 0;
  }
  function sinalMemoria(m) {
    if (ehMemorialInformativo(m)) return '';
    return m.categoria === 'RECEITA' ? '+' : '−';
  }
  function estiloLinhaMemoria(m) {
    if (!ehMemorialInformativo(m)) return '';
    const cor = m.categoria === 'INFORMATIVO_SALDO' ? 'var(--cor-alerta)' : 'var(--cor-texto-suave)';
    return ' style="color:' + cor + ';font-style:italic;"';
  }
  function rotuloCategoriaMemoria(m) {
    return String(m.categoria || '').replace('INFORMATIVO_', 'INFO: ').replace(/_/g, ' ');
  }

  /**
   * Monta o painel de referência do último abastecimento (km/data
   * do sistema veículo, horímetro/dias do sistema refrigeração),
   * usado tanto na tela do gestor quanto no painel do motorista ao
   * abrir o formulário de abastecimento.
   */
  function montarHtmlReferenciaAbastecimento(ref) {
    if (!ref) return '';
    const partes = [];

    if (ref.ultimaData) {
      partes.push('<strong>Último abastecimento (veículo):</strong> ' + Number(ref.ultimoKm).toLocaleString('pt-BR') + ' km em ' +
        new Date(ref.ultimaData).toLocaleDateString('pt-BR') + ' — <strong>' + Number(ref.kmRodadosDesdeUltimo || 0).toLocaleString('pt-BR') + ' km rodados</strong> desde então');
    } else {
      partes.push('Nenhum abastecimento do sistema veículo registrado ainda.');
    }

    if (ref.dataUltimoRefrigeracao) {
      partes.push('<strong>Último abastecimento (refrigeração):</strong> horímetro ' + Number(ref.ultimoHorimetroRefrigeracao).toLocaleString('pt-BR') + ' h em ' +
        new Date(ref.dataUltimoRefrigeracao).toLocaleDateString('pt-BR') + ' — faz <strong>' + ref.diasDesdeUltimaRefrigeracao + ' dia(s)</strong>');
    }

    if (ref.consumoMedioKmL) {
      if (ref.metodoConsumo === 'TANQUE_CHEIO') {
        let linha = '<strong>Consumo médio (tanque cheio):</strong> ' + ref.consumoMedioKmL + ' km/l';
        if (ref.situacaoConsumo && ref.situacaoConsumo !== 'SEM_COMPARACAO' && ref.ultimoConsumoKmL) {
          const rotulos = { ABAIXO: '🔴 abaixo da média', NA_MEDIA: '🟢 na média', ACIMA: '🟢 acima da média' };
          linha += ' — último trecho: ' + ref.ultimoConsumoKmL + ' km/l (' + rotulos[ref.situacaoConsumo] + ')';
        }
        partes.push(linha);
      } else {
        partes.push('Consumo médio estimado: ' + ref.consumoMedioKmL + ' km/l <span style="color:var(--cor-texto-suave);">(marque "tanque cheio" nos abastecimentos para um cálculo exato)</span>');
      }
    }
    if (ref.ultimoCheioKm) {
      partes.push('<strong>Último tanque cheio:</strong> ' + Number(ref.ultimoCheioKm).toLocaleString('pt-BR') + ' km' +
        (Number(ref.litrosDesdeUltimoCheio) > 0 ? ' — ' + Number(ref.litrosDesdeUltimoCheio).toLocaleString('pt-BR') + ' L abastecidos depois (parciais)' : ''));
    }

    if (ref.refrigMediaLH) {
      let linha = '<strong>Consumo da refrigeração (tanque cheio):</strong> ' + ref.refrigMediaLH + ' L/h';
      if (ref.refrigSituacao && ref.refrigSituacao !== 'SEM_COMPARACAO' && ref.refrigUltimoLH) {
        const rot = { ACIMA: '🔴 gastando mais que a média', NA_MEDIA: '🟢 na média', ABAIXO: '🟢 gastando menos que a média' };
        linha += ' — último trecho: ' + ref.refrigUltimoLH + ' L/h (' + rot[ref.refrigSituacao] + ')';
      }
      partes.push(linha);
    }
    if (ref.refrigUltimoCheioHorimetro) {
      partes.push('<strong>Último tanque cheio (refrigeração):</strong> horímetro ' + Number(ref.refrigUltimoCheioHorimetro).toLocaleString('pt-BR') + ' h' +
        (Number(ref.refrigLitrosDesdeUltimoCheio) > 0 ? ' — ' + Number(ref.refrigLitrosDesdeUltimoCheio).toLocaleString('pt-BR') + ' L abastecidos depois (parciais)' : ''));
    }

    return '<div style="background:var(--cor-fundo);padding:10px 12px;border-radius:8px;font-size:12px;line-height:1.6;">' +
      partes.join('<br>') + '</div>';
  }
  function campoSelect(label, id, optionsHtml) {
    return '<div class="campo"><label for="' + id + '">' + label + '</label>' +
      '<select id="' + id + '">' + optionsHtml + '</select></div>';
  }
  function campoTextarea(label, id, valor) {
    return '<div class="campo campo-full"><label for="' + id + '">' + label + '</label>' +
      '<textarea id="' + id + '" rows="3">' + (valor || '') + '</textarea></div>';
  }
  function campoCheckbox(label, id, marcado) {
    return '<label class="campo-checkbox"><input type="checkbox" id="' + id + '" ' + (marcado ? 'checked' : '') + '> ' + label + '</label>';
  }

  /* ============================================================
   * PAGAMENTOS DO CLIENTE POR VIAGEM (adiantamento / parcelas / saldo)
   * Modal compartilhado: usado em Viagens e em Financeiro.
   * ============================================================
   */
  function abrirPagamentosFreteModal(idViagem, aoAtualizar) {
    const corpo = abrirModal('Pagamentos do cliente', '<p style="color:var(--cor-texto-suave);">Carregando...</p>');
    renderizarPagamentosFrete(corpo, idViagem, aoAtualizar);
  }

  function renderizarPagamentosFrete(corpo, idViagem, aoAtualizar) {
    executar('listarPagamentosFrete', idViagem).then(function (d) {
      const formas = ['PIX', 'TRANSFERENCIA', 'BOLETO', 'DINHEIRO', 'CHEQUE', 'OUTRO'];
      const optsForma = '<option value="">Forma de pagamento...</option>' + formas.map(function (f) {
        return '<option value="' + f + '">' + f.charAt(0) + f.slice(1).toLowerCase() + '</option>';
      }).join('');

      const linhas = (d.pagamentos || []).map(function (p) {
        return '<tr>' +
          '<td>' + (p.data ? new Date(p.data).toLocaleDateString('pt-BR') : '-') + '</td>' +
          '<td>' + formatarMoedaFrontend(p.valor) + '</td>' +
          '<td>' + (p.forma || '-') + '</td>' +
          '<td style="font-size:12px;">' + (p.observacoes || '') + '</td>' +
          '<td><button class="btn-icone-tabela" title="Estornar este pagamento" data-estornar="' + p.idRecebimentoFrete + '"><i data-lucide="undo-2"></i></button></td>' +
        '</tr>';
      }).join('');

      const quitado = d.valorFrete > 0 && d.saldo <= 0.005;
      const formularioNovo = quitado
        ? '<p style="color:var(--cor-sucesso);font-weight:600;">Frete quitado.</p>'
        : '<form id="form-pagamento-frete" class="form-grid">' +
            campoNumero('Valor pago pelo cliente (R$) *', 'pg-valor', d.saldo > 0 ? d.saldo : '') +
            campoData('Data do pagamento', 'pg-data', new Date()) +
            campoSelect('Forma', 'pg-forma', optsForma) +
            campoTexto('Observação', 'pg-obs', '', 'Ex: adiantamento de 50%') +
            '<div class="form-acoes"><button type="submit" class="btn btn-primario">Registrar pagamento</button></div>' +
          '</form>';

      corpo.innerHTML =
        '<p style="font-size:13px;color:var(--cor-texto-suave);margin-bottom:8px;">' + d.numeroViagem + ' — ' + (d.cliente || '') + ' — ' + d.rota + '</p>' +
        '<div class="grid-kpis">' +
          '<div class="kpi-card"><span class="kpi-label">Valor do frete</span><span class="kpi-valor">' + formatarMoedaFrontend(d.valorFrete) + '</span></div>' +
          '<div class="kpi-card"><span class="kpi-label">Já recebido</span><span class="kpi-valor">' + formatarMoedaFrontend(d.totalRecebido) + '</span></div>' +
          '<div class="kpi-card"><span class="kpi-label">Saldo a receber</span><span class="kpi-valor">' + formatarMoedaFrontend(Math.max(0, d.saldo)) + '</span></div>' +
        '</div>' +
        (linhas
          ? '<div class="tabela-wrapper" style="margin-top:12px;"><table class="tabela-simples"><thead><tr><th>Data</th><th>Valor</th><th>Forma</th><th>Obs.</th><th></th></tr></thead><tbody>' + linhas + '</tbody></table></div>'
          : '<p style="margin-top:12px;color:var(--cor-texto-suave);">Nenhum pagamento registrado ainda.</p>') +
        '<div style="margin-top:14px;">' + formularioNovo + '</div>' +
        '<div class="form-acoes"><button type="button" class="btn btn-secundario" onclick="fecharModal()">Fechar</button></div>';

      if (window.lucide) lucide.createIcons();

      const form = corpo.querySelector('#form-pagamento-frete');
      if (form) {
        form.addEventListener('submit', function (ev) {
          ev.preventDefault();
          executar('registrarPagamentoCliente', idViagem,
            document.getElementById('pg-valor').value,
            document.getElementById('pg-data').value,
            document.getElementById('pg-forma').value,
            document.getElementById('pg-obs').value
          ).then(function () {
            mostrarToast('Pagamento registrado.', 'sucesso');
            if (typeof aoAtualizar === 'function') aoAtualizar();
            renderizarPagamentosFrete(corpo, idViagem, aoAtualizar);
          });
        });
      }

      corpo.querySelectorAll('[data-estornar]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          // confirm() é bloqueado no iframe do Apps Script: confirma com 2º clique.
          if (!btn.getAttribute('data-confirmar')) {
            btn.setAttribute('data-confirmar', '1');
            btn.innerHTML = '<span style="font-size:11px;">Confirmar?</span>';
            setTimeout(function () { btn.removeAttribute('data-confirmar'); if (window.lucide) { btn.innerHTML = '<i data-lucide="undo-2"></i>'; lucide.createIcons(); } }, 4000);
            return;
          }
          executar('estornarPagamentoFrete', btn.getAttribute('data-estornar')).then(function () {
            mostrarToast('Pagamento estornado.', 'sucesso');
            if (typeof aoAtualizar === 'function') aoAtualizar();
            renderizarPagamentosFrete(corpo, idViagem, aoAtualizar);
          });
        });
      });
    });
  }

  /* ============================================================
   * DASHBOARD DO GESTOR
   * ============================================================
   */
  let dashboardInicializado = false;

  function carregarDashboardGestor() {
    if (!dashboardInicializado) {
      inicializarControlesDashboard();
      dashboardInicializado = true;
    }

    const dataInicio = document.getElementById('dash-dataInicio').value;
    const dataFim = document.getElementById('dash-dataFim').value;

    executar('getDadosDashboardGestor', dataInicio, dataFim).then(function (dados) {
      renderizarKpis(dados);
      renderizarStatusFrota(dados.porStatus);
      renderizarGraficoReceitaDespesa(dados.historicoReceitaDespesa);
      renderizarRankingResultado(dados.rankingResultado);

      const rotulo = document.getElementById('dash-periodo-aplicado');
      if (rotulo && dados.periodoInicio && dados.periodoFim) {
        rotulo.textContent = 'Exibindo: ' + new Date(dados.periodoInicio).toLocaleDateString('pt-BR') +
          ' a ' + new Date(dados.periodoFim).toLocaleDateString('pt-BR');
      }
    });
    executar('obterAlertas').then(renderizarAlertasDashboard);
  }

  function inicializarControlesDashboard() {
    // Preenche o período padrão (mês corrente) nos campos de data.
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    document.getElementById('dash-dataInicio').value = inicioMes.toLocaleDateString('pt-BR');
    document.getElementById('dash-dataFim').value = hoje.toLocaleDateString('pt-BR');

    document.getElementById('btn-aplicar-periodo-dashboard').addEventListener('click', carregarDashboardGestor);

    // Cliques nos cartões de indicador levam para a aba correspondente,
    // aplicando um filtro pronto quando fizer sentido (ex: "Viagens em
    // andamento" já abre Viagens filtrado por EM_ANDAMENTO).
    document.querySelectorAll('.kpi-clicavel').forEach(function (card) {
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      const ativar = function () {
        const secao = card.getAttribute('data-destino-secao');
        if (!secao) return;
        irParaSecao(secao);

        const filtroId = card.getAttribute('data-destino-filtro-id');
        const filtroValor = card.getAttribute('data-destino-filtro-valor');
        const gerarRelatorio = card.getAttribute('data-destino-gerar-relatorio') === 'true';

        if (filtroId && filtroValor) {
          setTimeout(function () {
            const el = document.getElementById(filtroId);
            if (!el) return;
            el.value = filtroValor;
            el.dispatchEvent(new Event('change'));
            if (gerarRelatorio) {
              setTimeout(function () {
                const btn = document.getElementById('btn-gerar-relatorio');
                if (btn) btn.click();
              }, 150);
            }
          }, 100);
        }
      };
      card.addEventListener('click', ativar);
      card.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ativar(); }
      });
    });
  }

  function renderizarAlertasDashboard(alertas) {
    const container = document.getElementById('lista-alertas-dashboard');
    if (!container) return;

    if (alertas.total === 0) {
      container.innerHTML = '<p style="color:var(--cor-texto-suave);font-size:13px;">Nenhum alerta no momento. Tudo em dia!</p>';
      return;
    }

    function bloco(titulo, itens, badgeClasse, formatar) {
      if (!itens || itens.length === 0) return '';
      return '<div style="margin-bottom:10px;"><strong style="font-size:13px;">' + titulo + ' (' + itens.length + ')</strong>' +
        '<ul style="margin:6px 0 0;padding-left:18px;font-size:13px;">' +
        itens.map(function (i) { return '<li>' + formatar(i) + ' <span class="badge ' + badgeClasse + '" style="margin-left:4px;">atenção</span></li>'; }).join('') +
        '</ul></div>';
    }

    container.innerHTML =
      bloco('Manutenções vencendo', alertas.manutencoesVencendo, 'badge-alerta', function (i) { return i.placa + ': ' + i.tipo + ' — ' + i.referencia; }) +
      bloco('Documentos vencendo', alertas.documentosVencendo, 'badge-critico', function (i) { return i.placa + ': ' + i.tipo + ' — ' + i.vencimento + (i.vencido ? ' (VENCIDO)' : ''); }) +
      bloco('CNH/MOPP vencendo', alertas.cnhMoppVencendo, 'badge-critico', function (i) { return i.motorista + ': ' + i.tipo + ' — ' + i.vencimento + (i.vencido ? ' (VENCIDO)' : ''); }) +
      bloco('Veículos parados', alertas.veiculosParados, 'badge-alerta', function (i) { return i.placa + ': ' + i.diasParado + ' dias sem viagem'; }) +
      bloco('Consumo anormal', alertas.consumoAnormal, 'badge-alerta', function (i) { return i.placa + ': ' + i.consumoRecente + ' km/l recente (média ' + i.mediaHistorica + ' km/l)'; }) +
      bloco('Checklists com pendência', alertas.checklistsPendentes, 'badge-critico', function (i) { return i.placa + ': ' + i.status.replace('_', ' '); }) +
      bloco('Ocorrências críticas em aberto', alertas.ocorrenciasCriticas, 'badge-critico', function (i) { return i.placa + ': ' + i.tipo + ' (' + i.gravidade + ')'; });

    if (!container.innerHTML) {
      container.innerHTML = '<p style="color:var(--cor-texto-suave);font-size:13px;">Nenhum alerta no momento. Tudo em dia!</p>';
    }
  }

  function formatarMoedaFrontend(valor) {
    const numero = Number(valor) || 0;
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function renderizarKpis(dados) {
    document.querySelectorAll('[data-kpi]').forEach(function (el) {
      const campo = el.getAttribute('data-kpi');
      const valor = dados[campo];
      if (['faturamentoMes', 'recebidoClienteMes', 'aReceberFretes', 'despesaMes', 'resultadoLiquidoMes', 'saldoFundoReserva'].indexOf(campo) !== -1) {
        el.textContent = formatarMoedaFrontend(valor);
      } else {
        el.textContent = valor;
      }
    });
  }

  function renderizarStatusFrota(porStatus) {
    document.querySelectorAll('#tabela-status-frota [data-status]').forEach(function (el) {
      const status = el.getAttribute('data-status');
      el.textContent = (porStatus && porStatus[status] !== undefined) ? porStatus[status] : 0;
    });
  }

  function renderizarGraficoReceitaDespesa(historico) {
    const canvas = document.getElementById('grafico-receita-despesa');
    if (!canvas || !window.Chart) return;

    const labels = historico.map(function (h) { return h.mesLabel; });
    const receitas = historico.map(function (h) { return h.receita; });
    const despesasArr = historico.map(function (h) { return h.despesa; });

    if (appState.graficoReceitaDespesa) {
      appState.graficoReceitaDespesa.destroy();
    }

    appState.graficoReceitaDespesa = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Receita', data: receitas, backgroundColor: '#556b2f' },
          { label: 'Despesa', data: despesasArr, backgroundColor: '#f2b705' }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: {
            ticks: {
              callback: function (valor) { return formatarMoedaFrontend(valor); }
            }
          }
        }
      }
    });
  }

  function renderizarRankingResultado(ranking) {
    const tbody = document.querySelector('#tabela-ranking-resultado tbody');
    if (!tbody) return;

    if (!ranking || ranking.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" style="color:var(--cor-texto-suave);">Nenhum fechamento aprovado/pago encontrado ainda.</td></tr>';
      return;
    }

    tbody.innerHTML = ranking.map(function (r) {
      return '<tr><td>' + r.placa + '</td><td>' + formatarMoedaFrontend(r.resultado) + '</td></tr>';
    }).join('');
  }
