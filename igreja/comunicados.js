// comunicados.js
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
  const STORAGE_KEY = "cf_comunicados";

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
      .filter((c) => c.igrejaId === sessao.igrejaId)
      .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
  }

  function generateId() {
    return "com_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
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

  // ========== RENDER ==========
  const grid = $("#comunicadosGrid");
  const emptyState = $("#emptyState");

  function render() {
    const comunicados = getByIgreja();

    if (comunicados.length === 0) {
      if (grid) grid.innerHTML = "";
      if (emptyState) emptyState.classList.add("show");
      return;
    }

    if (emptyState) emptyState.classList.remove("show");
    if (!grid) return;

    grid.innerHTML = comunicados
      .map(
        (c) => `
      <article class="comunicado-card${c.prioridade === "urgente" ? " comunicado-card--urgente" : ""}">
        <div class="comunicado-card__top">
          <h3 class="comunicado-card__title">${escapeHtml(c.titulo)}</h3>
          <button class="btn btn--icon" data-delete="${c.id}" title="Excluir" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
        <p class="comunicado-card__content">${escapeHtml(c.conteudo)}</p>
        <div class="comunicado-card__footer">
          <span class="comunicado-card__date">${formatDateTime(c.criadoEm)}</span>
          <span class="priority-badge priority-badge--${c.prioridade}">${c.prioridade === "urgente" ? "Urgente" : "Normal"}</span>
        </div>
      </article>
    `
      )
      .join("");
  }

  // ========== MODAL ==========
  const modal = $("#modalComunicado");
  const form = $("#formComunicado");
  const btnNovo = $("#btnNovoComunicado");
  const btnCancelar = $("#btnCancelar");
  const closeModal = $("#closeModal");

  function openModal() {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    if (form) form.reset();
    const firstInput = $("#titulo");
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  }

  function closeModalFn() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  if (btnNovo) btnNovo.addEventListener("click", openModal);
  if (btnCancelar) btnCancelar.addEventListener("click", closeModalFn);
  if (closeModal) closeModal.addEventListener("click", closeModalFn);

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target.matches("[data-close-modal]")) closeModalFn();
    });
  }

  // ========== FORM SUBMIT ==========
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const titulo = ($("#titulo").value || "").trim();
      const conteudo = ($("#conteudo").value || "").trim();
      const prioridade = ($("#prioridade").value || "normal").trim();

      if (!titulo) {
        showToast("Informe o titulo do comunicado", "error");
        return;
      }
      if (!conteudo) {
        showToast("Escreva o conteudo do comunicado", "error");
        return;
      }

      const novo = {
        id: generateId(),
        igrejaId: sessao.igrejaId,
        titulo,
        conteudo,
        prioridade,
        criadoEm: new Date().toISOString(),
      };

      const all = getAll();
      all.push(novo);
      saveAll(all);

      closeModalFn();
      render();
      showToast("Comunicado publicado com sucesso", "success");
    });
  }

  // ========== DELETE ==========
  const modalConfirm = $("#modalConfirm");
  const btnConfirmDelete = $("#btnConfirmDelete");
  const btnCancelConfirm = $("#btnCancelConfirm");
  const closeConfirm = $("#closeConfirm");
  let deleteTargetId = null;

  function openConfirm(id) {
    deleteTargetId = id;
    if (modalConfirm) {
      modalConfirm.classList.add("is-open");
      modalConfirm.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
    }
  }

  function closeConfirmFn() {
    deleteTargetId = null;
    if (modalConfirm) {
      modalConfirm.classList.remove("is-open");
      modalConfirm.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
    }
  }

  if (btnCancelConfirm) btnCancelConfirm.addEventListener("click", closeConfirmFn);
  if (closeConfirm) closeConfirm.addEventListener("click", closeConfirmFn);

  if (modalConfirm) {
    modalConfirm.addEventListener("click", (e) => {
      if (e.target.matches("[data-close-confirm]")) closeConfirmFn();
    });
  }

  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener("click", () => {
      if (!deleteTargetId) return;
      const all = getAll().filter((c) => c.id !== deleteTargetId);
      saveAll(all);
      closeConfirmFn();
      render();
      showToast("Comunicado excluido", "success");
    });
  }

  // Grid click delegation for delete buttons
  if (grid) {
    grid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-delete]");
      if (!btn) return;
      openConfirm(btn.dataset.delete);
    });
  }

  // ========== ESCAPE KEY ==========
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (modalConfirm && modalConfirm.classList.contains("is-open")) {
        closeConfirmFn();
      } else if (modal && modal.classList.contains("is-open")) {
        closeModalFn();
      } else if (sidebar && sidebar.classList.contains("open")) {
        closeSidebar();
      }
    }
  });

  // ========== INIT ==========
  render();
})();
