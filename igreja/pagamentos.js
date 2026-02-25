// pagamentos.js
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
  const STORAGE_KEY = "cf_pagamentos";

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
      .sort((a, b) => new Date(b.data) - new Date(a.data));
  }

  function generateId() {
    return "pag_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  }

  function formatBRL(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function parseMoneyInput(str) {
    if (!str) return 0;
    const cleaned = str.replace(/[^\d,.-]/g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
  }

  function getTodayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function isCurrentMonth(dateStr) {
    const now = new Date();
    const d = new Date(dateStr + "T00:00:00");
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }

  // ========== RENDER ==========
  const totalMesEl = $("#totalMes");
  const totalDizimosEl = $("#totalDizimos");
  const totalOfertasEl = $("#totalOfertas");
  const totalOutrosEl = $("#totalOutros");
  const tableBody = $("#pagamentosBody");
  const tableEmpty = $("#tableEmpty");
  const tableCount = $("#tableCount");
  const tableScroll = $(".table-scroll");

  function render() {
    const pagamentos = getByIgreja();

    // Summary (current month)
    let sumTotal = 0, sumDizimo = 0, sumOferta = 0, sumOutro = 0;
    pagamentos.forEach((p) => {
      if (isCurrentMonth(p.data)) {
        const v = p.valor || 0;
        sumTotal += v;
        if (p.tipo === "dizimo") sumDizimo += v;
        else if (p.tipo === "oferta") sumOferta += v;
        else sumOutro += v;
      }
    });

    if (totalMesEl) totalMesEl.textContent = formatBRL(sumTotal);
    if (totalDizimosEl) totalDizimosEl.textContent = formatBRL(sumDizimo);
    if (totalOfertasEl) totalOfertasEl.textContent = formatBRL(sumOferta);
    if (totalOutrosEl) totalOutrosEl.textContent = formatBRL(sumOutro);

    // Table
    if (tableCount) {
      tableCount.textContent = pagamentos.length + (pagamentos.length === 1 ? " registro" : " registros");
    }

    if (pagamentos.length === 0) {
      if (tableScroll) tableScroll.style.display = "none";
      if (tableEmpty) tableEmpty.classList.add("show");
      return;
    }

    if (tableScroll) tableScroll.style.display = "";
    if (tableEmpty) tableEmpty.classList.remove("show");

    if (!tableBody) return;

    const tipoLabels = { dizimo: "Dizimo", oferta: "Oferta", outro: "Outro" };

    tableBody.innerHTML = pagamentos
      .map(
        (p) => `
      <tr>
        <td>${formatDate(p.data)}</td>
        <td>${escapeHtml(p.membro)}</td>
        <td><span class="type-badge type-badge--${p.tipo}">${tipoLabels[p.tipo] || p.tipo}</span></td>
        <td class="value-cell">${formatBRL(p.valor)}</td>
        <td class="desc-cell" title="${escapeHtml(p.descricao || "")}">${escapeHtml(p.descricao || "-")}</td>
        <td>
          <button class="btn btn--icon" data-delete="${p.id}" title="Excluir" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </td>
      </tr>
    `
      )
      .join("");
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ========== MODAL ==========
  const modal = $("#modalPagamento");
  const form = $("#formPagamento");
  const btnNovo = $("#btnNovoPagamento");
  const btnCancelar = $("#btnCancelar");
  const closeModal = $("#closeModal");
  const dataInput = $("#data");

  function openModal() {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    if (form) form.reset();
    if (dataInput) dataInput.value = getTodayISO();
    const firstInput = $("#membro");
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

      const membro = ($("#membro").value || "").trim();
      const tipo = ($("#tipo").value || "").trim();
      const valorStr = ($("#valor").value || "").trim();
      const data = ($("#data").value || "").trim();
      const descricao = ($("#descricao").value || "").trim();

      if (!membro) {
        showToast("Informe o nome do membro", "error");
        return;
      }
      if (!tipo) {
        showToast("Selecione o tipo de pagamento", "error");
        return;
      }

      const valor = parseMoneyInput(valorStr);
      if (valor <= 0) {
        showToast("Informe um valor valido", "error");
        return;
      }
      if (!data) {
        showToast("Informe a data", "error");
        return;
      }

      const novo = {
        id: generateId(),
        igrejaId: sessao.igrejaId,
        membro,
        tipo,
        valor,
        data,
        descricao,
        criadoEm: new Date().toISOString(),
      };

      const all = getAll();
      all.push(novo);
      saveAll(all);

      closeModalFn();
      render();
      showToast("Pagamento registrado com sucesso", "success");
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
      const all = getAll().filter((p) => p.id !== deleteTargetId);
      saveAll(all);
      closeConfirmFn();
      render();
      showToast("Pagamento excluido", "success");
    });
  }

  // Table click delegation for delete buttons
  if (tableBody) {
    tableBody.addEventListener("click", (e) => {
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

  // ========== VALUE INPUT MASK ==========
  const valorInput = $("#valor");
  if (valorInput) {
    valorInput.addEventListener("input", () => {
      let v = valorInput.value.replace(/[^\d,\.]/g, "");
      valorInput.value = v;
    });
  }

  // ========== INIT ==========
  render();
})();
