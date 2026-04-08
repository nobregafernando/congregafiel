// pagamentos.js
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
    const pagamentos = await ApiServico.obterContribuicoes(sessao.igrejaId);
    return pagamentos.sort((a, b) => new Date(b.data) - new Date(a.data));
  }

  function formatBRL(value) {
    return UIServico.formatarMoeda(value);
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

  // ========== CARREGAR MEMBROS ==========
  let membrosLista = [];
  async function carregarMembros() {
    try {
      membrosLista = await ApiServico.obterMembros(sessao.igrejaId);
      const select = $("#membro");
      if (!select) return;
      select.innerHTML = '<option value="">Selecione o membro</option>' +
        membrosLista
          .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
          .map(m => `<option value="${m.id}">${UIServico.escaparHtml(m.nome)}</option>`)
          .join("");
    } catch (erro) {
      console.error("Erro ao carregar membros:", erro);
    }
  }
  await carregarMembros();

  // ========== RENDER ==========
  const totalMesEl = $("#totalMes");
  const totalDizimosEl = $("#totalDizimos");
  const totalOfertasEl = $("#totalOfertas");
  const totalOutrosEl = $("#totalOutros");
  const tableBody = $("#pagamentosBody");
  const tableEmpty = $("#tableEmpty");
  const tableCount = $("#tableCount");
  const tableScroll = $(".table-scroll");

  async function render() {
    try {
      const pagamentos = await getByIgreja();

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
          <td>${UIServico.escaparHtml(p.membro)}</td>
          <td><span class="type-badge type-badge--${p.tipo}">${tipoLabels[p.tipo] || p.tipo}</span></td>
          <td class="value-cell">${formatBRL(p.valor)}</td>
          <td class="desc-cell" title="${UIServico.escaparHtml(p.descricao || "")}">${UIServico.escaparHtml(p.descricao || "-")}</td>
          <td>
            <button class="btn btn--icon" data-delete="${p.id}" title="Excluir" type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </td>
        </tr>
      `
        )
        .join("");
    } catch (erro) {
      console.error("Erro ao carregar pagamentos:", erro);
      UIServico.mostrarToast("Erro ao carregar pagamentos", "error");
    }
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
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const membroId = ($("#membro").value || "").trim();
      const tipo = ($("#tipo").value || "").trim();
      const valorStr = ($("#valor").value || "").trim();
      const data = ($("#data").value || "").trim();
      const descricao = ($("#descricao").value || "").trim();

      if (!membroId) {
        UIServico.mostrarToast("Selecione um membro", "error");
        return;
      }
      const membroSelecionado = membrosLista.find(m => m.id === membroId);
      const membroNome = membroSelecionado ? membroSelecionado.nome : "";
      if (!tipo) {
        UIServico.mostrarToast("Selecione o tipo de pagamento", "error");
        return;
      }

      const valor = parseMoneyInput(valorStr);
      if (valor <= 0) {
        UIServico.mostrarToast("Informe um valor valido", "error");
        return;
      }
      if (!data) {
        UIServico.mostrarToast("Informe a data", "error");
        return;
      }

      try {
        await ApiServico.criarContribuicao({
          igrejaId: sessao.igrejaId,
          membro: membroNome,
          membroId: membroId,
          tipo,
          valor,
          data,
          descricao,
        });

        closeModalFn();
        await render();
        UIServico.mostrarToast("Pagamento registrado com sucesso", "success");
      } catch (erro) {
        console.error("Erro ao registrar pagamento:", erro);
        UIServico.mostrarToast("Erro ao registrar pagamento", "error");
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
        await ApiServico.removerContribuicao(deleteTargetId);
        closeConfirmFn();
        await render();
        UIServico.mostrarToast("Pagamento excluido", "success");
      } catch (erro) {
        console.error("Erro ao excluir pagamento:", erro);
        UIServico.mostrarToast("Erro ao excluir pagamento", "error");
      }
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
  await render();
})();
