// pedidos-oracao.js — Igreja
(async () => {
  "use strict";

  const $ = UIServico.$;
  const $$ = UIServico.$$;
  const esc = UIServico.escaparHtml;

  // ========== AUTH CHECK ==========
  const sessao = SessaoServico.exigirAutenticacao("igreja");
  if (!sessao) return;

  UIServico.popularHeader(sessao);
  UIServico.configurarSidebar({ toggle: "#menuToggle" });
  UIServico.configurarLogout({ seletor: "#btnSair" });

  // ========== VERSÍCULOS SUGERIDOS ==========
  const VERSICULOS = [
    { ref: "Filipenses 4:6-7", texto: "Não andeis ansiosos de coisa alguma; antes, as vossas petições sejam em tudo conhecidas diante de Deus pela oração e súplicas, com ação de graças." },
    { ref: "Salmos 34:17", texto: "Os justos clamam, e o Senhor os ouve e os livra de todas as suas angústias." },
    { ref: "Mateus 11:28", texto: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei." },
    { ref: "Isaías 41:10", texto: "Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus." },
    { ref: "Salmos 46:1", texto: "Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia." },
    { ref: "Romanos 8:28", texto: "Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus." },
    { ref: "Jeremias 29:11", texto: "Porque eu bem sei os pensamentos que penso de vós, diz o Senhor; pensamentos de paz e não de mal, para vos dar o fim que esperais." },
    { ref: "Salmos 23:1,4", texto: "O Senhor é o meu pastor, nada me faltará. Ainda que eu andasse pelo vale da sombra da morte, não temeria mal algum, porque tu estás comigo." },
    { ref: "2 Coríntios 1:3-4", texto: "Bendito seja o Deus de toda consolação, que nos consola em toda a nossa tribulação." },
    { ref: "1 Pedro 5:7", texto: "Lançando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós." },
    { ref: "Salmos 121:1-2", texto: "Elevo os meus olhos para os montes: de onde me virá o socorro? O meu socorro vem do Senhor, que fez os céus e a terra." },
    { ref: "João 14:27", texto: "Deixo-vos a paz, a minha paz vos dou; não vo-la dou como o mundo a dá. Não se turbe o vosso coração." },
  ];

  // ========== STATUS ==========
  const STATUS_LABELS = {
    pendente: "Pendente",
    orado: "Orado",
    respondido: "Respondido",
  };

  // ========== STATE ==========
  let currentFilter = "todos";
  let pedidoAtual = null;

  // ========== DOM ==========
  const grid = $("#pedidosGrid");
  const emptyState = $("#emptyState");
  const pedidosCountEl = $("#pedidosCount");

  // Modal
  const modal = $("#modalResponder");
  const modalAvatar = $("#modalAvatar");
  const modalNome = $("#modalMembroNome");
  const modalTexto = $("#modalPedidoTexto");
  const modalTitulo = $("#modalTitulo");
  const modalResposta = $("#modalResposta");
  const versiculosGrid = $("#versiculosGrid");
  const btnFechar = $("#btnFecharModal");
  const btnOrado = $("#btnMarcarOrado");
  const btnEnviar = $("#btnEnviarResposta");

  // ========== DATA ==========
  async function getByIgreja() {
    const pedidos = await ApiServico.obterPedidosOracao(sessao.igrejaId);
    return pedidos.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
  }

  // ========== RENDER ==========
  async function render() {
    try {
      const allPedidos = await getByIgreja();
      if (pedidosCountEl) pedidosCountEl.textContent = allPedidos.length;

      const pedidos =
        currentFilter === "todos"
          ? allPedidos
          : allPedidos.filter((p) => p.status === currentFilter);

      if (pedidos.length === 0) {
        if (grid) grid.innerHTML = "";
        if (emptyState) emptyState.classList.add("show");
        return;
      }

      if (emptyState) emptyState.classList.remove("show");
      if (!grid) return;

      grid.innerHTML = pedidos
        .map((p) => {
          var respostaHtml = "";
          if (p.resposta) {
            respostaHtml =
              '<div class="pedido-card__resposta">' +
                '<div class="pedido-card__resposta-header">' +
                  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
                  '<strong>' + esc(p.respondidoPor || sessao.nome || "Igreja") + '</strong>' +
                '</div>' +
                '<p class="pedido-card__resposta-texto">' + esc(p.resposta) + '</p>' +
              '</div>';
          }

          return (
            '<article class="pedido-card" data-id="' + p.id + '">' +
              '<div class="pedido-card__top">' +
                '<div class="pedido-card__member">' +
                  '<div class="pedido-card__avatar">' + UIServico.obterIniciais(p.membroNome) + '</div>' +
                  '<span class="pedido-card__name">' + esc(p.membroNome) + '</span>' +
                '</div>' +
                '<button class="status-badge status-badge--' + p.status + '" data-abrir-modal="' + p.id + '" title="Clique para responder" type="button">' +
                  '<span class="status-badge__dot"></span>' +
                  (STATUS_LABELS[p.status] || p.status) +
                '</button>' +
              '</div>' +
              '<p class="pedido-card__text">' + esc(p.pedido) + '</p>' +
              respostaHtml +
              '<div class="pedido-card__footer">' +
                '<span class="pedido-card__date">' + UIServico.formatarDataHora(p.criadoEm) + '</span>' +
                (p.status !== "respondido"
                  ? '<button class="btn-responder" data-abrir-modal="' + p.id + '" type="button">' +
                      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
                      'Responder' +
                    '</button>'
                  : '') +
              '</div>' +
            '</article>'
          );
        })
        .join("");
    } catch (erro) {
      console.error("Erro ao carregar pedidos de oracao:", erro);
      UIServico.mostrarToast("Erro ao carregar pedidos de oração", "error");
    }
  }

  // ========== MODAL ==========
  function renderVersiculos() {
    // Shuffle and pick 4
    var shuffled = VERSICULOS.slice().sort(() => Math.random() - 0.5).slice(0, 4);
    versiculosGrid.innerHTML = "";
    shuffled.forEach(function (v) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "versiculo-chip";
      btn.dataset.texto = "\u201C" + v.texto + "\u201D \u2014 " + v.ref;

      var refSpan = document.createElement("span");
      refSpan.className = "versiculo-chip__ref";
      refSpan.textContent = v.ref;

      var textoSpan = document.createElement("span");
      textoSpan.className = "versiculo-chip__texto";
      textoSpan.textContent = v.texto.substring(0, 60) + "...";

      btn.appendChild(refSpan);
      btn.appendChild(textoSpan);
      versiculosGrid.appendChild(btn);
    });
  }

  function abrirModal(pedido) {
    pedidoAtual = pedido;
    modalAvatar.textContent = UIServico.obterIniciais(pedido.membroNome);
    modalNome.textContent = pedido.membroNome;
    modalTexto.textContent = pedido.pedido;
    modalResposta.value = pedido.resposta || "";

    if (pedido.status === "respondido") {
      modalTitulo.textContent = "Editar resposta";
      btnOrado.style.display = "none";
    } else {
      modalTitulo.textContent = "Responder pedido";
      btnOrado.style.display = "";
    }

    renderVersiculos();
    modal.classList.add("show");
    document.body.classList.add("modal-open");
    modalResposta.focus();
  }

  function fecharModal() {
    modal.classList.remove("show");
    document.body.classList.remove("modal-open");
    pedidoAtual = null;
    modalResposta.value = "";
  }

  // Click on badge or "Responder" button
  if (grid) {
    grid.addEventListener("click", async (e) => {
      var btn = e.target.closest("[data-abrir-modal]");
      if (!btn) return;

      var id = btn.dataset.abrirModal;
      var allPedidos = await getByIgreja();
      var pedido = allPedidos.find((p) => p.id === id);
      if (pedido) abrirModal(pedido);
    });
  }

  // Fechar
  btnFechar.addEventListener("click", fecharModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) fecharModal();
  });

  // Versículo click
  versiculosGrid.addEventListener("click", (e) => {
    var chip = e.target.closest(".versiculo-chip");
    if (!chip) return;
    var texto = chip.dataset.texto;
    var current = modalResposta.value.trim();
    modalResposta.value = current ? current + "\n\n" + texto : texto;
    modalResposta.focus();
  });

  // Marcar como orado
  btnOrado.addEventListener("click", async () => {
    if (!pedidoAtual) return;
    btnOrado.disabled = true;
    try {
      var dados = { status: "orado" };
      var texto = modalResposta.value.trim();
      if (texto) {
        dados.resposta = texto;
        dados.respondidoPor = sessao.nome || "Igreja";
      }
      await ApiServico.atualizarPedidoOracao(pedidoAtual.id, dados);
      fecharModal();
      await render();
      UIServico.mostrarToast("Pedido marcado como orado", "success");
    } catch (erro) {
      console.error(erro);
      UIServico.mostrarToast("Erro ao atualizar pedido", "error");
    }
    btnOrado.disabled = false;
  });

  // Enviar resposta
  btnEnviar.addEventListener("click", async () => {
    var texto = modalResposta.value.trim();
    if (!texto) {
      modalResposta.focus();
      UIServico.mostrarToast("Escreva uma mensagem de resposta", "error");
      return;
    }
    if (!pedidoAtual) return;
    btnEnviar.disabled = true;
    try {
      await ApiServico.atualizarPedidoOracao(pedidoAtual.id, {
        status: "respondido",
        resposta: texto,
        respondidoPor: sessao.nome || "Igreja",
      });
      fecharModal();
      await render();
      UIServico.mostrarToast("Resposta enviada com sucesso!", "success");
    } catch (erro) {
      console.error(erro);
      UIServico.mostrarToast("Erro ao enviar resposta", "error");
    }
    btnEnviar.disabled = false;
  });

  // Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fecharModal();
  });

  // ========== FILTER TABS ==========
  $$(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", async () => {
      $$(".filter-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentFilter = tab.dataset.filter || "todos";
      await render();
    });
  });

  // ========== INIT ==========
  await render();
})();
