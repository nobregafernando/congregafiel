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

  async function carregarMembros() {
    const membros = await ApiServico.obterMembros(sessao.igrejaId);
    return membros.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto));
  }

  function preencherSelectMembros(membros) {
    const selectMembro = $("#membro");
    if (!selectMembro) return;
    
    const opcaoVazia = selectMembro.querySelector("option[value='']");
    selectMembro.innerHTML = "<option value=''>Selecione um membro</option>";
    
    membros.forEach(membro => {
      const option = document.createElement("option");
      option.value = membro.id;
      option.textContent = membro.nomeCompleto;
      selectMembro.appendChild(option);
    });
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
            <button class="btn btn--icon" data-edit="${p.id}" title="Editar" type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13.5V4h16v9.5"/><path d="M16.862 3.162l2.121 2.121c.781.781.781 2.048 0 2.828l-8.485 8.485M3 21h18"/></svg>
            </button>
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
  const modalTitle = $("#modalTitle");
  
  let modoEdicao = false;
  let edicaoId = null;

  function openModal() {
    if (!modal) return;
    modoEdicao = false;
    edicaoId = null;
    if (modalTitle) modalTitle.textContent = "Registrar pagamento";
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    if (form) form.reset();
    if (dataInput) dataInput.value = getTodayISO();
    
    // Carregar membros e preencher select
    carregarMembros().then(membros => {
      preencherSelectMembros(membros);
    }).catch(erro => {
      console.error("Erro ao carregar membros:", erro);
      UIServico.mostrarToast("Erro ao carregar membros", "error");
    });
    
    const firstInput = $("#membro");
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  }

  function openModalParaEdicao(pagamento) {
    if (!modal) return;
    modoEdicao = true;
    edicaoId = pagamento.id;
    if (modalTitle) modalTitle.textContent = "Editar pagamento";
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    
    // Carregar membros e preencher select
    carregarMembros().then(membros => {
      preencherSelectMembros(membros);
      
      // Preencher form com dados do pagamento
      $("#membro").value = pagamento.membroId;
      $("#tipo").value = pagamento.tipo;
      $("#valor").value = formatBRL(pagamento.valor); // Formatado
      $("#data").value = pagamento.data;
      $("#descricao").value = pagamento.descricao || "";
      
      // Disable membro select em edição (não pode mudar de membro)
      const membroSelect = $("#membro");
      if (membroSelect) membroSelect.disabled = true;
    }).catch(erro => {
      console.error("Erro ao carregar membros:", erro);
      UIServico.mostrarToast("Erro ao carregar membros", "error");
    });
  }

  function closeModalFn() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    
    // Reativar select de membro
    const membroSelect = $("#membro");
    if (membroSelect) membroSelect.disabled = false;
    
    modoEdicao = false;
    edicaoId = null;
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

      if (!tipo) {
        UIServico.mostrarToast("Selecione o tipo de pagamento", "error");
        return;
      }

      const valor = parseMoneyInput(valorStr);
      if (valor <= 0) {
        UIServico.mostrarToast("Informe um valor válido", "error");
        return;
      }
      if (!data) {
        UIServico.mostrarToast("Informe a data", "error");
        return;
      }

      try {
        if (modoEdicao && edicaoId) {
          // Atualizar contribuição existente
          await ApiServico.atualizarContribuicao(edicaoId, {
            tipo,
            valor,
            data,
            descricao,
          });
          UIServico.mostrarToast("Pagamento atualizado com sucesso", "success");
          closeModalFn();
          await render();
        } else {
          // Criar novo pagamento
          if (!membroId) {
            UIServico.mostrarToast("Selecione um membro", "error");
            return;
          }
          
          const resposta = await ApiServico.criarContribuicao({
            igrejaId: sessao.igrejaId,
            membroId: membroId,
            tipo,
            valor,
            data,
            descricao,
          });
          
          // Verificar se há aviso de duplicação
          if (resposta && resposta.aviso) {
            // Mostrar modal de aviso e permitir confirmar
            abrirModalDuplicacao(
              resposta.aviso,
              resposta.id,
              membroId, tipo, valor, data, descricao
            );
          } else {
            UIServico.mostrarToast("Pagamento registrado com sucesso", "success");
            closeModalFn();
            await render();
          }
        }
      } catch (erro) {
        console.error("Erro ao salvar pagamento:", erro);
        UIServico.mostrarToast("Erro ao salvar pagamento", "error");
      }
    });
  }

  // ========== DELETE ==========
  const modalConfirm = $("#modalConfirm");
  const btnConfirmDelete = $("#btnConfirmDelete");
  const btnCancelConfirm = $("#btnCancelConfirm");
  const closeConfirm = $("#closeConfirm");
  let deleteTargetId = null;

  // ========== DUPLICAÇÃO ==========
  const modalDuplicacao = $("#modalDuplicacao");
  const btnConfirmDuplicacao = $("#btnConfirmDuplicacao");
  const btnCancelDuplicacao = $("#btnCancelDuplicacao");
  const closeDuplicacao = $("#closeDuplicacao");
  const textoDuplicacao = $("#textoDuplicacao");
  let dadosPendentesContribuicao = null;

  function abrirModalDuplicacao(aviso, idNova, membroId, tipo, valor, data, descricao) {
    if (!modalDuplicacao) return;
    
    // Guardar dados para possível confirmação
    dadosPendentesContribuicao = { idNova, membroId, tipo, valor, data, descricao };
    
    if (textoDuplicacao) {
      textoDuplicacao.textContent = aviso;
    }
    
    modalDuplicacao.classList.add("is-open");
    modalDuplicacao.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeModalDuplicacaoFn() {
    if (modalDuplicacao) {
      modalDuplicacao.classList.remove("is-open");
      modalDuplicacao.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
    }
    dadosPendentesContribuicao = null;
  }

  if (btnConfirmDuplicacao) {
    btnConfirmDuplicacao.addEventListener("click", async () => {
      closeModalDuplicacaoFn();
      closeModalFn();
      await render();
      UIServico.mostrarToast("Pagamento registrado com sucesso", "success");
    });
  }

  if (btnCancelDuplicacao) btnCancelDuplicacao.addEventListener("click", closeModalDuplicacaoFn);
  if (closeDuplicacao) closeDuplicacao.addEventListener("click", closeModalDuplicacaoFn);

  if (modalDuplicacao) {
    modalDuplicacao.addEventListener("click", (e) => {
      if (e.target.matches("[data-close-duplicacao]")) closeModalDuplicacaoFn();
    });
  }

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
      const btnDelete = e.target.closest("[data-delete]");
      if (btnDelete) {
        openConfirm(btnDelete.dataset.delete);
        return;
      }
      
      const btnEdit = e.target.closest("[data-edit]");
      if (btnEdit) {
        openModalParaEdicaoPorId(btnEdit.dataset.edit);
      }
    });
  }

  async function openModalParaEdicaoPorId(id) {
    try {
      const pagamentos = await getByIgreja();
      const pagamento = pagamentos.find(p => p.id === id);
      if (pagamento) {
        openModalParaEdicao(pagamento);
      } else {
        UIServico.mostrarToast("Pagamento não encontrado", "error");
      }
    } catch (erro) {
      console.error("Erro ao carregar pagamento para edição:", erro);
      UIServico.mostrarToast("Erro ao carregar pagamento", "error");
    }
  }

  // ========== ESCAPE KEY ==========
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (modalDuplicacao && modalDuplicacao.classList.contains("is-open")) {
        closeModalDuplicacaoFn();
      } else if (modalConfirm && modalConfirm.classList.contains("is-open")) {
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
