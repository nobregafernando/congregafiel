// /igreja/eventos.js
(async () => {
  "use strict";

  const $ = UIServico.$;
  const $$ = UIServico.$$;

  // ---------- AUTH CHECK ----------
  const sessao = SessaoServico.exigirAutenticacao("igreja");
  if (!sessao) return;

  // ---------- STORAGE ----------
  async function getEventos() {
    return await ApiServico.obterEventos(sessao.igrejaId);
  }

  // ---------- HELPERS ----------
  function isUpcoming(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateStr + "T00:00:00");
    return eventDate >= today;
  }

  function formatDateBR(dateStr) {
    const parts = dateStr.split("-");
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  // ---------- RENDER EVENTS ----------
  async function renderEventos() {
    const grid = $("#eventsGrid");
    const empty = $("#emptyState");

    try {
      const eventos = await getEventos();

      // Sort: upcoming first (nearest date first), then past (most recent first)
      eventos.sort((a, b) => {
        const aUp = isUpcoming(a.data);
        const bUp = isUpcoming(b.data);

        if (aUp && !bUp) return -1;
        if (!aUp && bUp) return 1;

        if (aUp && bUp) {
          if (a.data !== b.data) return a.data < b.data ? -1 : 1;
          return a.hora < b.hora ? -1 : 1;
        }

        // Both past: most recent first
        return a.data > b.data ? -1 : 1;
      });

      if (eventos.length === 0) {
        grid.innerHTML = "";
        grid.style.display = "none";
        empty.style.display = "block";
        return;
      }

      grid.style.display = "grid";
      empty.style.display = "none";

      let html = "";

      for (const ev of eventos) {
        const partes = UIServico.obterPartesData(ev.data);
        const [year] = ev.data.split("-");
        const upcoming = isUpcoming(ev.data);

        const cardClass = "event-card" + (upcoming ? "" : " event-card--past");
        const badgeHtml = upcoming
          ? '<span class="event-badge event-badge--upcoming">Pr\u00f3ximo</span>'
          : '<span class="event-badge event-badge--past">Passado</span>';

        const descHtml = ev.descricao
          ? '<p class="event-card__desc">' + UIServico.escaparHtml(ev.descricao) + "</p>"
          : "";

        html += '<div class="' + cardClass + '">'
          + '<div class="event-card__date">'
          +   '<span class="event-card__date-day">' + partes.dia + "</span>"
          +   '<span class="event-card__date-month">' + partes.mes + "</span>"
          +   '<span class="event-card__date-year">' + year + "</span>"
          + "</div>"
          + '<div class="event-card__body">'
          +   '<div class="event-card__top">'
          +     '<h3 class="event-card__title">' + UIServico.escaparHtml(ev.titulo) + "</h3>"
          +     badgeHtml
          +   "</div>"
          +   descHtml
          +   '<div class="event-card__meta">'
          +     '<span class="event-card__meta-item">'
          +       '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
          +       ev.hora
          +     "</span>"
          +     '<span class="event-card__meta-item">'
          +       '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>'
          +       UIServico.escaparHtml(ev.local)
          +     "</span>"
          +     '<span class="event-card__meta-item">'
          +       '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
          +       formatDateBR(ev.data)
          +     "</span>"
          +   "</div>"
          + "</div>"
          + '<div class="event-card__actions">'
          +   '<button class="btn-icon-delete" data-delete-id="' + ev.id + '" title="Excluir evento" type="button">'
          +     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>'
          +   "</button>"
          + "</div>"
          + "</div>";
      }

      grid.innerHTML = html;
    } catch (erro) {
      console.error("Erro ao carregar eventos:", erro);
      UIServico.mostrarToast("Erro ao carregar eventos", "error");
    }
  }

  // ---------- MODAL: CREATE EVENT ----------
  function setupCreateModal() {
    const modal = $("#modalEvento");
    const overlay = $("#modalOverlay");
    const btnOpen = $("#btnCriarEvento");
    const btnClose = $("#btnFecharModal");
    const btnCancel = $("#btnCancelar");
    const form = $("#formEvento");

    function openModal() {
      form.reset();
      clearErrors();
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("no-scroll");
      setTimeout(() => $("#inputTitulo").focus(), 100);
    }

    function closeModal() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("no-scroll");
    }

    btnOpen.addEventListener("click", openModal);
    btnClose.addEventListener("click", closeModal);
    btnCancel.addEventListener("click", closeModal);
    overlay.addEventListener("click", closeModal);

    // Form validation & submit
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearErrors();

      const titulo = $("#inputTitulo").value.trim();
      const descricao = $("#inputDescricao").value.trim();
      const data = $("#inputData").value;
      const hora = $("#inputHora").value;
      const local = $("#inputLocal").value.trim();

      let valid = true;

      if (!titulo) {
        setError("inputTitulo", "erroTitulo", "Informe o t\u00edtulo do evento.");
        valid = false;
      } else if (titulo.length < 3) {
        setError("inputTitulo", "erroTitulo", "O t\u00edtulo deve ter pelo menos 3 caracteres.");
        valid = false;
      }

      if (!data) {
        setError("inputData", "erroData", "Selecione a data do evento.");
        valid = false;
      }

      if (!hora) {
        setError("inputHora", "erroHora", "Informe o hor\u00e1rio do evento.");
        valid = false;
      }

      if (!local) {
        setError("inputLocal", "erroLocal", "Informe o local do evento.");
        valid = false;
      } else if (local.length < 2) {
        setError("inputLocal", "erroLocal", "O local deve ter pelo menos 2 caracteres.");
        valid = false;
      }

      if (!valid) return;

      try {
        await ApiServico.criarEvento({
          titulo,
          descricao,
          data,
          horario: hora,
          local,
          igrejaId: sessao.igrejaId
        });

        closeModal();
        await renderEventos();
        UIServico.mostrarToast("Evento criado com sucesso!", "success");
      } catch (erro) {
        console.error("Erro ao criar evento:", erro);
        UIServico.mostrarToast("Erro ao criar evento", "error");
      }
    });

    return { closeModal };
  }

  // ---------- MODAL: CONFIRM DELETE ----------
  function setupDeleteModal() {
    const modal = $("#modalConfirm");
    const overlay = $("#confirmOverlay");
    const btnClose = $("#btnFecharConfirm");
    const btnCancel = $("#btnCancelarConfirm");
    const btnConfirm = $("#btnConfirmarExclusao");

    let pendingId = null;

    function openConfirm(id) {
      pendingId = id;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("no-scroll");
    }

    function closeConfirm() {
      pendingId = null;
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("no-scroll");
    }

    btnClose.addEventListener("click", closeConfirm);
    btnCancel.addEventListener("click", closeConfirm);
    overlay.addEventListener("click", closeConfirm);

    btnConfirm.addEventListener("click", async () => {
      if (!pendingId) return;
      try {
        await ApiServico.removerEvento(pendingId);
        closeConfirm();
        await renderEventos();
        UIServico.mostrarToast("Evento exclu\u00eddo com sucesso.", "error");
      } catch (erro) {
        console.error("Erro ao excluir evento:", erro);
        UIServico.mostrarToast("Erro ao excluir evento", "error");
      }
    });

    // Event delegation on grid
    const grid = $("#eventsGrid");
    grid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-delete-id]");
      if (btn) openConfirm(btn.getAttribute("data-delete-id"));
    });

    return { closeConfirm };
  }

  // ---------- FORM ERRORS ----------
  function clearErrors() {
    $$(".form-error").forEach(el => { el.textContent = ""; });
    $$(".is-invalid").forEach(el => { el.classList.remove("is-invalid"); });
  }

  function setError(inputId, errorId, msg) {
    const input = $("#" + inputId);
    const error = $("#" + errorId);
    if (input) input.classList.add("is-invalid");
    if (error) error.textContent = msg;
  }

  // ---------- KEYBOARD ----------
  function setupKeyboard(createModal, deleteModal) {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const modalEvento = $("#modalEvento");
        const modalConfirm = $("#modalConfirm");
        if (modalConfirm.classList.contains("is-open")) {
          deleteModal.closeConfirm();
        } else if (modalEvento.classList.contains("is-open")) {
          createModal.closeModal();
        } else {
          // Close sidebar if open
          const sidebar = $("#sidebar");
          if (sidebar && sidebar.classList.contains("is-open")) {
            sidebar.classList.remove("is-open");
            const overlay = $("#sidebarOverlay");
            if (overlay) overlay.classList.remove("is-visible");
            document.body.classList.remove("no-scroll");
          }
        }
      }
    });
  }

  // ---------- INIT ----------
  UIServico.popularHeader(sessao);
  UIServico.configurarSidebar({ toggle: "#menuToggle" });
  UIServico.configurarLogout({ seletor: "#btnSair" });
  const createModal = setupCreateModal();
  const deleteModal = setupDeleteModal();
  setupKeyboard(createModal, deleteModal);
  await renderEventos();

})();
