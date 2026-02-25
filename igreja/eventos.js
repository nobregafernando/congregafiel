// /igreja/eventos.js

(function () {
  "use strict";

  /* ===== AUTH CHECK ===== */
  const sessao = JSON.parse(localStorage.getItem("cf_sessao") || "null");

  if (!sessao || sessao.tipo !== "igreja") {
    window.location.href = "../autenticacao/login.html";
    return;
  }

  /* ===== DOM REFS ===== */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const sidebar = $("#sidebar");
  const sidebarOverlay = $("#sidebarOverlay");
  const hamburger = $("#hamburger");

  const nomeIgrejaEl = $("#nomeIgreja");
  const nomeUsuarioEl = $("#nomeUsuario");
  const emailUsuarioEl = $("#emailUsuario");
  const userAvatarEl = $("#userAvatar");

  const eventsGrid = $("#eventsGrid");
  const emptyState = $("#emptyState");

  const modalEvento = $("#modalEvento");
  const modalOverlay = $("#modalOverlay");
  const btnCriarEvento = $("#btnCriarEvento");
  const btnFecharModal = $("#btnFecharModal");
  const btnCancelar = $("#btnCancelar");
  const formEvento = $("#formEvento");

  const modalConfirm = $("#modalConfirm");
  const confirmOverlay = $("#confirmOverlay");
  const btnFecharConfirm = $("#btnFecharConfirm");
  const btnCancelarConfirm = $("#btnCancelarConfirm");
  const btnConfirmarExclusao = $("#btnConfirmarExclusao");

  const toastEl = $("#toast");

  /* ===== POPULATE HEADER ===== */
  nomeIgrejaEl.textContent = sessao.nomeIgreja || "Igreja";
  nomeUsuarioEl.textContent = sessao.nome || "Pastor";
  emailUsuarioEl.textContent = sessao.email || "";
  userAvatarEl.textContent = (sessao.nome || "P").charAt(0).toUpperCase();

  /* ===== SIDEBAR TOGGLE ===== */
  function openSidebar() {
    sidebar.classList.add("is-open");
    sidebarOverlay.classList.add("is-visible");
    hamburger.classList.add("is-open");
    document.body.classList.add("modal-open");
  }

  function closeSidebar() {
    sidebar.classList.remove("is-open");
    sidebarOverlay.classList.remove("is-visible");
    hamburger.classList.remove("is-open");
    document.body.classList.remove("modal-open");
  }

  hamburger.addEventListener("click", function () {
    sidebar.classList.contains("is-open") ? closeSidebar() : openSidebar();
  });

  sidebarOverlay.addEventListener("click", closeSidebar);

  /* ===== LOGOUT ===== */
  $("#btnSair").addEventListener("click", function () {
    localStorage.removeItem("cf_sessao");
    window.location.href = "../autenticacao/login.html";
  });

  /* ===== HELPERS ===== */
  const MONTH_NAMES = [
    "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
    "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"
  ];

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
  }

  function formatDate(dateStr) {
    const parts = dateStr.split("-");
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  function formatTime(timeStr) {
    return timeStr; // already HH:MM
  }

  function isUpcoming(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateStr + "T00:00:00");
    return eventDate >= today;
  }

  /* ===== TOAST ===== */
  let toastTimeout = null;

  function showToast(message, type) {
    clearTimeout(toastTimeout);

    const iconSvg = type === "success"
      ? '<svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
      : '<svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';

    toastEl.className = "toast toast--" + type;
    toastEl.innerHTML = iconSvg + "<span>" + message + "</span>";

    requestAnimationFrame(function () {
      toastEl.classList.add("show");
    });

    toastTimeout = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 3500);
  }

  /* ===== STORAGE ===== */
  function getEventos() {
    var all = JSON.parse(localStorage.getItem("cf_eventos") || "[]");
    return all.filter(function (e) {
      return e.igrejaId === sessao.igrejaId;
    });
  }

  function getAllEventos() {
    return JSON.parse(localStorage.getItem("cf_eventos") || "[]");
  }

  function saveEventos(allEventos) {
    localStorage.setItem("cf_eventos", JSON.stringify(allEventos));
  }

  function addEvento(evento) {
    var all = getAllEventos();
    all.push(evento);
    saveEventos(all);
  }

  function deleteEvento(id) {
    var all = getAllEventos();
    var filtered = all.filter(function (e) {
      return e.id !== id;
    });
    saveEventos(filtered);
  }

  /* ===== RENDER ===== */
  function renderEventos() {
    var eventos = getEventos();

    // Sort: upcoming first (by date asc), then past (by date desc)
    eventos.sort(function (a, b) {
      var aUp = isUpcoming(a.data);
      var bUp = isUpcoming(b.data);

      if (aUp && !bUp) return -1;
      if (!aUp && bUp) return 1;

      if (aUp && bUp) {
        // Both upcoming: nearest first
        return a.data < b.data ? -1 : a.data > b.data ? 1 : (a.hora < b.hora ? -1 : 1);
      }

      // Both past: most recent first
      return a.data > b.data ? -1 : a.data < b.data ? 1 : 0;
    });

    if (eventos.length === 0) {
      eventsGrid.innerHTML = "";
      eventsGrid.style.display = "none";
      emptyState.style.display = "block";
      return;
    }

    eventsGrid.style.display = "grid";
    emptyState.style.display = "none";

    var html = "";

    eventos.forEach(function (ev) {
      var dateParts = ev.data.split("-");
      var day = parseInt(dateParts[2], 10);
      var monthIdx = parseInt(dateParts[1], 10) - 1;
      var year = dateParts[0];
      var upcoming = isUpcoming(ev.data);

      var cardClass = "event-card" + (upcoming ? "" : " event-card--past");
      var badgeHtml = upcoming
        ? '<span class="event-badge event-badge--upcoming">Pr\u00f3ximo</span>'
        : '<span class="event-badge event-badge--past">Passado</span>';

      var descHtml = ev.descricao
        ? '<p class="event-card__desc">' + escapeHtml(ev.descricao) + '</p>'
        : '';

      html += '<div class="' + cardClass + '">'
        + '  <div class="event-card__date">'
        + '    <span class="event-card__date-day">' + day + '</span>'
        + '    <span class="event-card__date-month">' + MONTH_NAMES[monthIdx] + '</span>'
        + '    <span class="event-card__date-year">' + year + '</span>'
        + '  </div>'
        + '  <div class="event-card__body">'
        + '    <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">'
        + '      <h3 class="event-card__title">' + escapeHtml(ev.titulo) + '</h3>'
        + '      ' + badgeHtml
        + '    </div>'
        + '    ' + descHtml
        + '    <div class="event-card__meta">'
        + '      <span class="event-card__meta-item">'
        + '        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
        + '        ' + formatTime(ev.hora)
        + '      </span>'
        + '      <span class="event-card__meta-item">'
        + '        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>'
        + '        ' + escapeHtml(ev.local)
        + '      </span>'
        + '      <span class="event-card__meta-item">'
        + '        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
        + '        ' + formatDate(ev.data)
        + '      </span>'
        + '    </div>'
        + '  </div>'
        + '  <div class="event-card__actions">'
        + '    <button class="btn-icon" data-delete="' + ev.id + '" title="Excluir evento" type="button">'
        + '      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>'
        + '    </button>'
        + '  </div>'
        + '</div>';
    });

    eventsGrid.innerHTML = html;
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ===== MODAL - CREATE EVENT ===== */
  function openModal() {
    formEvento.reset();
    clearErrors();
    modalEvento.classList.add("is-open");
    modalEvento.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    // Focus on first input
    setTimeout(function () {
      $("#titulo").focus();
    }, 100);
  }

  function closeModal() {
    modalEvento.classList.remove("is-open");
    modalEvento.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  btnCriarEvento.addEventListener("click", openModal);
  btnFecharModal.addEventListener("click", closeModal);
  btnCancelar.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", closeModal);

  // Close modal on Escape
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (modalEvento.classList.contains("is-open")) closeModal();
      if (modalConfirm.classList.contains("is-open")) closeConfirmModal();
    }
  });

  /* ===== FORM VALIDATION & SUBMIT ===== */
  function clearErrors() {
    $$(".form-error").forEach(function (el) { el.textContent = ""; });
    $$(".is-invalid").forEach(function (el) { el.classList.remove("is-invalid"); });
  }

  function setError(inputId, errorId, msg) {
    var input = $("#" + inputId);
    var error = $("#" + errorId);
    if (input) input.classList.add("is-invalid");
    if (error) error.textContent = msg;
  }

  formEvento.addEventListener("submit", function (e) {
    e.preventDefault();
    clearErrors();

    var titulo = $("#titulo").value.trim();
    var descricao = $("#descricao").value.trim();
    var data = $("#data").value;
    var hora = $("#hora").value;
    var local = $("#local").value.trim();

    var valid = true;

    if (!titulo) {
      setError("titulo", "erroTitulo", "Informe o t\u00edtulo do evento.");
      valid = false;
    } else if (titulo.length < 3) {
      setError("titulo", "erroTitulo", "O t\u00edtulo deve ter pelo menos 3 caracteres.");
      valid = false;
    }

    if (!data) {
      setError("data", "erroData", "Selecione a data do evento.");
      valid = false;
    }

    if (!hora) {
      setError("hora", "erroHora", "Informe o hor\u00e1rio do evento.");
      valid = false;
    }

    if (!local) {
      setError("local", "erroLocal", "Informe o local do evento.");
      valid = false;
    } else if (local.length < 2) {
      setError("local", "erroLocal", "O local deve ter pelo menos 2 caracteres.");
      valid = false;
    }

    if (!valid) return;

    var evento = {
      id: generateId(),
      titulo: titulo,
      descricao: descricao,
      data: data,
      hora: hora,
      local: local,
      igrejaId: sessao.igrejaId,
      criadoEm: new Date().toISOString()
    };

    addEvento(evento);
    closeModal();
    renderEventos();
    showToast("Evento criado com sucesso!", "success");
  });

  /* ===== DELETE EVENT ===== */
  var eventoParaExcluir = null;

  function openConfirmModal(id) {
    eventoParaExcluir = id;
    modalConfirm.classList.add("is-open");
    modalConfirm.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeConfirmModal() {
    eventoParaExcluir = null;
    modalConfirm.classList.remove("is-open");
    modalConfirm.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  btnFecharConfirm.addEventListener("click", closeConfirmModal);
  btnCancelarConfirm.addEventListener("click", closeConfirmModal);
  confirmOverlay.addEventListener("click", closeConfirmModal);

  btnConfirmarExclusao.addEventListener("click", function () {
    if (eventoParaExcluir) {
      deleteEvento(eventoParaExcluir);
      closeConfirmModal();
      renderEventos();
      showToast("Evento exclu\u00eddo com sucesso.", "danger");
    }
  });

  // Event delegation for delete buttons
  eventsGrid.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-delete]");
    if (btn) {
      openConfirmModal(btn.getAttribute("data-delete"));
    }
  });

  /* ===== INIT ===== */
  renderEventos();

})();
