// /igreja/fieis.js
(async () => {
  "use strict";

  const $ = UIServico.$;
  const $$ = UIServico.$$;

  // ---------- AUTH CHECK ----------
  const sessao = SessaoServico.exigirAutenticacao("igreja");
  if (!sessao) return;

  // ---------- MEMBERS DATA ----------
  async function getMembers(igrejaId) {
    return await ApiServico.obterMembros(igrejaId);
  }

  // ---------- RENDER MEMBERS ----------
  function renderMembers(members) {
    var tbody = $("#membersBody");
    var cardsContainer = $("#membersCards");
    var tableWrap = $("#membersTableWrap");
    var emptyState = $("#emptyState");

    if (!tbody || !cardsContainer) return;

    // Clear existing content
    tbody.innerHTML = "";
    cardsContainer.innerHTML = "";

    if (members.length === 0) {
      if (tableWrap) tableWrap.style.display = "none";
      cardsContainer.style.display = "none";
      if (emptyState) emptyState.hidden = false;
      return;
    }

    // Show table/cards, hide empty state
    if (tableWrap) tableWrap.style.display = "";
    cardsContainer.style.display = "";
    if (emptyState) emptyState.hidden = true;

    members.forEach(function (member, index) {
      var initials = UIServico.obterIniciais(member.nomeCompleto);
      var altClass = index % 2 === 1 ? " member-avatar--alt" : "";
      var formattedDate = member.criadoEm ? UIServico.formatarData(member.criadoEm, { day: "2-digit", month: "short", year: "numeric" }) : "---";
      var safeName = UIServico.escaparHtml(member.nomeCompleto);
      var safeEmail = UIServico.escaparHtml(member.email);

      // Table row
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
          '<div class="member-name">' +
            '<div class="member-avatar' + altClass + '">' + initials + "</div>" +
            '<span class="member-name-text">' + safeName + "</span>" +
          "</div>" +
        "</td>" +
        '<td class="member-email">' + safeEmail + "</td>" +
        '<td class="member-date">' + formattedDate + "</td>";
      tbody.appendChild(tr);

      // Mobile card
      var card = document.createElement("div");
      card.className = "member-card";
      card.innerHTML =
        '<div class="member-avatar' + altClass + '">' + initials + "</div>" +
        '<div class="member-card__info">' +
          '<div class="member-card__name">' + safeName + "</div>" +
          '<div class="member-card__email">' + safeEmail + "</div>" +
          '<div class="member-card__date">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
            "<span>" + formattedDate + "</span>" +
          "</div>" +
        "</div>";
      cardsContainer.appendChild(card);
    });
  }

  // ---------- MEMBER COUNT ----------
  function updateMemberCount(count) {
    var el = $("#memberCount");
    if (!el) return;
    if (count === 0) {
      el.textContent = "Nenhum membro cadastrado ainda";
    } else if (count === 1) {
      el.textContent = "1 membro cadastrado";
    } else {
      el.textContent = count + " membros cadastrados";
    }
  }

  // ---------- SEARCH ----------
  function setupSearch(allMembers) {
    var input = $("#searchInput");
    var clearBtn = $("#searchClear");
    var resultsLabel = $("#searchResults");
    var emptyTitle = $("#emptyTitle");
    var emptyMessage = $("#emptyMessage");

    if (!input) return;

    function doSearch() {
      var query = input.value.trim().toLowerCase();

      // Toggle clear button visibility
      if (clearBtn) clearBtn.hidden = !query;

      if (!query) {
        renderMembers(allMembers);
        updateMemberCount(allMembers.length);
        if (resultsLabel) resultsLabel.textContent = "";

        // Reset empty state text
        if (emptyTitle) emptyTitle.textContent = "Nenhum membro encontrado";
        if (emptyMessage) emptyMessage.textContent = "Compartilhe o codigo de convite da igreja para que os membros possam se cadastrar.";
        return;
      }

      var filtered = allMembers.filter(function (m) {
        var name = (m.nomeCompleto || "").toLowerCase();
        var email = (m.email || "").toLowerCase();
        return name.indexOf(query) !== -1 || email.indexOf(query) !== -1;
      });

      renderMembers(filtered);

      // Update results count text
      if (resultsLabel) {
        if (filtered.length === 0) {
          resultsLabel.textContent = 'Nenhum resultado para "' + input.value.trim() + '"';
        } else {
          var label = filtered.length === 1 ? " resultado" : " resultados";
          resultsLabel.textContent = filtered.length + label + ' para "' + input.value.trim() + '"';
        }
      }

      // Customize empty state message when searching
      if (filtered.length === 0) {
        if (emptyTitle) emptyTitle.textContent = "Nenhum resultado encontrado";
        if (emptyMessage) emptyMessage.textContent = 'Nao encontramos membros com "' + input.value.trim() + '". Tente buscar com outros termos.';
      }
    }

    input.addEventListener("input", doSearch);

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        input.value = "";
        input.focus();
        doSearch();
      });
    }
  }

  // ---------- COPY CODE ----------
  function setupCopyCode() {
    var btn = $("#btnCopyCode");
    if (!btn) return;

    btn.addEventListener("click", function () {
      var code = sessao.codigoIgreja || "";
      if (!code) {
        UIServico.mostrarToast("Codigo da igreja nao disponivel", "error");
        return;
      }

      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(
          function () {
            onCopySuccess(btn, code);
          },
          function () {
            fallbackCopy(btn, code);
          }
        );
      } else {
        fallbackCopy(btn, code);
      }
    });

    function onCopySuccess(button, code) {
      button.classList.add("copied");
      var label = $("span", button);
      if (label) label.textContent = "Copiado!";
      UIServico.mostrarToast("Codigo copiado: " + code, "success");

      setTimeout(function () {
        button.classList.remove("copied");
        if (label) label.textContent = "Copiar";
      }, 2000);
    }

    function fallbackCopy(button, code) {
      var textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        onCopySuccess(button, code);
      } catch (e) {
        UIServico.mostrarToast("Nao foi possivel copiar. Codigo: " + code, "error");
      }
      document.body.removeChild(textarea);
    }
  }

  // ---------- INIT ----------
  async function init() {
    UIServico.popularHeader(sessao);
    UIServico.configurarSidebar();
    UIServico.configurarLogout();
    setupCopyCode();

    // Church code
    var codeEl = $("#churchCode");
    if (codeEl) {
      codeEl.textContent = sessao.codigoIgreja || "------";
    }

    try {
      var members = await getMembers(sessao.igrejaId);
      updateMemberCount(members.length);
      renderMembers(members);
      setupSearch(members);
    } catch (erro) {
      console.error("Erro ao carregar membros:", erro);
      UIServico.mostrarToast("Erro ao carregar membros", "error");
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await init();
    } catch (erro) {
      console.error("Erro ao inicializar fieis:", erro);
      UIServico.mostrarToast("Erro ao carregar a pagina de fieis", "error");
    }
  });
})();
