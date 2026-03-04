// pedidos-oracao.js
(async () => {
  "use strict";

  const $ = UIServico.$;
  const $$ = UIServico.$$;

  // ========== AUTH CHECK ==========
  const sessao = SessaoServico.exigirAutenticacao("igreja");
  if (!sessao) return;

  // ========== POPULATE HEADER ==========
  UIServico.popularHeader(sessao);

  // ========== SIDEBAR TOGGLE ==========
  UIServico.configurarSidebar({ toggle: "#menuToggle" });

  // ========== LOGOUT ==========
  UIServico.configurarLogout({ seletor: "#btnSair" });

  // ========== HELPERS ==========
  async function getByIgreja() {
    const pedidos = await ApiServico.obterPedidosOracao(sessao.igrejaId);
    return pedidos.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
  }

  // Status flow: pendente -> orado -> respondido -> pendente
  const STATUS_FLOW = {
    pendente: "orado",
    orado: "respondido",
    respondido: "pendente",
  };

  const STATUS_LABELS = {
    pendente: "Pendente",
    orado: "Orado",
    respondido: "Respondido",
  };

  // ========== FILTER STATE ==========
  let currentFilter = "todos";

  // ========== RENDER ==========
  const grid = $("#pedidosGrid");
  const emptyState = $("#emptyState");
  const pedidosCountEl = $("#pedidosCount");

  async function render() {
    try {
      const allPedidos = await getByIgreja();

      // Update count
      if (pedidosCountEl) pedidosCountEl.textContent = allPedidos.length;

      // Apply filter
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
        .map(
          (p) => `
        <article class="pedido-card" data-id="${p.id}">
          <div class="pedido-card__top">
            <div class="pedido-card__member">
              <div class="pedido-card__avatar">${UIServico.obterIniciais(p.membroNome)}</div>
              <span class="pedido-card__name">${UIServico.escaparHtml(p.membroNome)}</span>
            </div>
            <button class="status-badge status-badge--${p.status}" data-status-toggle="${p.id}" title="Clique para alterar status" type="button">
              <span class="status-badge__dot"></span>
              ${STATUS_LABELS[p.status] || p.status}
            </button>
          </div>
          <p class="pedido-card__text">${UIServico.escaparHtml(p.pedido)}</p>
          <div class="pedido-card__footer">
            <span class="pedido-card__date">${UIServico.formatarDataHora(p.criadoEm)}</span>
          </div>
        </article>
      `
        )
        .join("");
    } catch (erro) {
      console.error("Erro ao carregar pedidos de oracao:", erro);
      UIServico.mostrarToast("Erro ao carregar pedidos de oracao", "error");
    }
  }

  // ========== STATUS TOGGLE ==========
  if (grid) {
    grid.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-status-toggle]");
      if (!btn) return;

      const id = btn.dataset.statusToggle;

      try {
        const allPedidos = await getByIgreja();
        const pedido = allPedidos.find((p) => p.id === id);
        if (!pedido) return;

        const currentStatus = pedido.status || "pendente";
        const nextStatus = STATUS_FLOW[currentStatus] || "pendente";

        await ApiServico.atualizarPedidoOracao(id, { status: nextStatus });
        await render();
        UIServico.mostrarToast(`Status alterado para "${STATUS_LABELS[nextStatus]}"`, "success");
      } catch (erro) {
        console.error("Erro ao atualizar status:", erro);
        UIServico.mostrarToast("Erro ao atualizar status do pedido", "error");
      }
    });
  }

  // ========== FILTER TABS ==========
  $$(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", async () => {
      $$(".filter-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentFilter = tab.dataset.filter || "todos";
      await render();
    });
  });

  // ========== ESCAPE KEY ==========
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const sidebar = $("#sidebar");
      if (sidebar && sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
        const overlay = $("#sidebarOverlay");
        if (overlay) overlay.classList.remove("show");
        document.body.classList.remove("modal-open");
      }
    }
  });

  // ========== INIT ==========
  await render();
})();
