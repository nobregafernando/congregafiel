// comunicados.js
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
    const comunicados = await ApiServico.obterComunicados(sessao.igrejaId);
    return comunicados.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
  }

  // ========== RENDER ==========
  const grid = $("#comunicadosGrid");
  const emptyState = $("#emptyState");

  async function render() {
    try {
      const comunicados = await getByIgreja();

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
            <h3 class="comunicado-card__title">${UIServico.escaparHtml(c.titulo)}</h3>
            <button class="btn btn--icon" data-delete="${c.id}" title="Excluir" type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
          <p class="comunicado-card__content">${UIServico.escaparHtml(c.conteudo)}</p>
          <div class="comunicado-card__footer">
            <span class="comunicado-card__date">${UIServico.formatarDataHora(c.criadoEm)}</span>
            <span class="priority-badge priority-badge--${c.prioridade}">${c.prioridade === "urgente" ? "Urgente" : "Normal"}</span>
          </div>
        </article>
      `
        )
        .join("");
    } catch (erro) {
      console.error("Erro ao carregar comunicados:", erro);
      UIServico.mostrarToast("Erro ao carregar comunicados", "error");
    }
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
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const titulo = ($("#titulo").value || "").trim();
      const conteudo = ($("#conteudo").value || "").trim();
      const prioridade = ($("#prioridade").value || "normal").trim();

      if (!titulo) {
        UIServico.mostrarToast("Informe o titulo do comunicado", "error");
        return;
      }
      if (!conteudo) {
        UIServico.mostrarToast("Escreva o conteudo do comunicado", "error");
        return;
      }

      try {
        await ApiServico.criarComunicado({
          igrejaId: sessao.igrejaId,
          titulo,
          conteudo,
          prioridade,
        });

        closeModalFn();
        await render();
        UIServico.mostrarToast("Comunicado publicado com sucesso", "success");
      } catch (erro) {
        console.error("Erro ao criar comunicado:", erro);
        UIServico.mostrarToast("Erro ao criar comunicado", "error");
      }
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
    btnConfirmDelete.addEventListener("click", async () => {
      if (!deleteTargetId) return;
      try {
        await ApiServico.removerComunicado(deleteTargetId);
        closeConfirmFn();
        await render();
        UIServico.mostrarToast("Comunicado excluido", "success");
      } catch (erro) {
        console.error("Erro ao excluir comunicado:", erro);
        UIServico.mostrarToast("Erro ao excluir comunicado", "error");
      }
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
      }
    }
  });

  // ========== INIT ==========
  await render();
})();
