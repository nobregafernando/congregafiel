// pedidos-oracao.js
(() => {
  "use strict";

  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

  // ========== AUTH CHECK ==========
  const sessaoRaw = localStorage.getItem("cf_sessao");
  if (!sessaoRaw) {
    window.location.href = "../autenticacao/login.html";
    return;
  }

  let sessao;
  try {
    sessao = JSON.parse(sessaoRaw);
  } catch {
    localStorage.removeItem("cf_sessao");
    window.location.href = "../autenticacao/login.html";
    return;
  }

  if (!sessao || !sessao.igrejaId) {
    window.location.href = "../autenticacao/login.html";
    return;
  }

  // ========== POPULATE HEADER ==========
  const churchNameEl = $("#churchName");
  const userAvatarEl = $("#userAvatar");
  const userNameEl = $("#userName");

  if (churchNameEl) churchNameEl.textContent = sessao.nomeIgreja || "Igreja";
  if (userNameEl) userNameEl.textContent = sessao.nome || "";
  if (userAvatarEl) {
    const initials = (sessao.nome || "U")
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    userAvatarEl.textContent = initials;
  }

  // ========== SIDEBAR TOGGLE ==========
  const sidebar = $("#sidebar");
  const sidebarOverlay = $("#sidebarOverlay");
  const menuToggle = $("#menuToggle");

  function openSidebar() {
    if (sidebar) sidebar.classList.add("open");
    if (sidebarOverlay) sidebarOverlay.classList.add("show");
    document.body.classList.add("modal-open");
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove("open");
    if (sidebarOverlay) sidebarOverlay.classList.remove("show");
    document.body.classList.remove("modal-open");
  }

  if (menuToggle) menuToggle.addEventListener("click", openSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);

  window.addEventListener("resize", () => {
    if (window.innerWidth > 820) closeSidebar();
  });

  // ========== LOGOUT ==========
  const btnSair = $("#btnSair");
  if (btnSair) {
    btnSair.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("cf_sessao");
      window.location.href = "../autenticacao/login.html";
    });
  }

  // ========== TOAST ==========
  let toastTimer = null;
  function showToast(msg, type = "") {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.className = "toast show" + (type ? " toast--" + type : "");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.className = "toast";
    }, 3000);
  }

  // ========== HELPERS ==========
  const STORAGE_KEY = "cf_pedidos_oracao";

  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveAll(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getByIgreja() {
    return getAll()
      .filter((p) => p.igrejaId === sessao.igrejaId)
      .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
  }

  function formatDateTime(isoStr) {
    const d = new Date(isoStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) + " " + d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function getInitials(name) {
    return (name || "?")
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
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

  function render() {
    const allPedidos = getByIgreja();

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
            <div class="pedido-card__avatar">${getInitials(p.membroNome)}</div>
            <span class="pedido-card__name">${escapeHtml(p.membroNome)}</span>
          </div>
          <button class="status-badge status-badge--${p.status}" data-status-toggle="${p.id}" title="Clique para alterar status" type="button">
            <span class="status-badge__dot"></span>
            ${STATUS_LABELS[p.status] || p.status}
          </button>
        </div>
        <p class="pedido-card__text">${escapeHtml(p.pedido)}</p>
        <div class="pedido-card__footer">
          <span class="pedido-card__date">${formatDateTime(p.criadoEm)}</span>
        </div>
      </article>
    `
      )
      .join("");
  }

  // ========== STATUS TOGGLE ==========
  if (grid) {
    grid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-status-toggle]");
      if (!btn) return;

      const id = btn.dataset.statusToggle;
      const all = getAll();
      const idx = all.findIndex((p) => p.id === id);
      if (idx === -1) return;

      const currentStatus = all[idx].status || "pendente";
      const nextStatus = STATUS_FLOW[currentStatus] || "pendente";
      all[idx].status = nextStatus;
      saveAll(all);

      render();
      showToast(`Status alterado para "${STATUS_LABELS[nextStatus]}"`, "success");
    });
  }

  // ========== FILTER TABS ==========
  $$(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".filter-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentFilter = tab.dataset.filter || "todos";
      render();
    });
  });

  // ========== ESCAPE KEY ==========
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (sidebar && sidebar.classList.contains("open")) {
        closeSidebar();
      }
    }
  });

  // ========== INIT ==========
  render();
})();
