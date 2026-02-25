// /igreja/fieis.js
(() => {
  "use strict";

  // ---------- HELPERS ----------
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

  let toastTimer = null;

  // ---------- AUTH CHECK ----------
  function getSession() {
    try {
      return JSON.parse(localStorage.getItem("cf_sessao"));
    } catch {
      return null;
    }
  }

  function checkAuth() {
    const sessao = getSession();
    if (!sessao || sessao.tipo !== "igreja") {
      window.location.href = "../autenticacao/login.html";
      return null;
    }
    return sessao;
  }

  // ---------- TOAST ----------
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

  // ---------- SIDEBAR ----------
  function setupSidebar() {
    const sidebar = $("#sidebar");
    const overlay = $("#sidebarOverlay");
    const toggle = $("#menuToggle");

    if (!sidebar || !toggle) return;

    function openSidebar() {
      sidebar.classList.add("is-open");
      if (overlay) overlay.classList.add("is-visible");
      document.body.style.overflow = "hidden";
    }

    function closeSidebar() {
      sidebar.classList.remove("is-open");
      if (overlay) overlay.classList.remove("is-visible");
      document.body.style.overflow = "";
    }

    toggle.addEventListener("click", () => {
      const isOpen = sidebar.classList.contains("is-open");
      if (isOpen) closeSidebar();
      else openSidebar();
    });

    if (overlay) {
      overlay.addEventListener("click", closeSidebar);
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && sidebar.classList.contains("is-open")) {
        closeSidebar();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 860) {
        closeSidebar();
      }
    });
  }

  // ---------- LOGOUT ----------
  function setupLogout() {
    const btnSair = $("#btnSair");
    if (!btnSair) return;

    btnSair.addEventListener("click", () => {
      localStorage.removeItem("cf_sessao");
      showToast("Sessao encerrada");
      setTimeout(() => {
        window.location.href = "../autenticacao/login.html";
      }, 600);
    });
  }

  // ---------- LOAD SESSION UI ----------
  function loadSessionUI(sessao) {
    const churchName = $("#churchName");
    const userName = $("#userName");
    const userAvatar = $("#userAvatar");
    const churchCode = $("#churchCode");

    if (churchName) churchName.textContent = sessao.nomeIgreja || "Igreja";
    if (userName) userName.textContent = sessao.nome || "Pastor";
    if (userAvatar) {
      const initials = (sessao.nome || "P")
        .split(" ")
        .map((w) => w.charAt(0))
        .slice(0, 2)
        .join("")
        .toUpperCase();
      userAvatar.textContent = initials;
    }
    if (churchCode) {
      churchCode.textContent = sessao.codigoIgreja || "------";
    }
  }

  // ---------- LOAD MEMBERS ----------
  function getMembers(igrejaId) {
    try {
      const membros = JSON.parse(localStorage.getItem("cf_membros") || "[]");
      return membros.filter((m) => m.igrejaId === igrejaId);
    } catch {
      return [];
    }
  }

  function formatDate(isoString) {
    if (!isoString) return "---";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "---";
    }
  }

  function getInitials(name) {
    if (!name) return "?";
    return name
      .split(" ")
      .map((w) => w.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  function renderMembers(members) {
    const tbody = $("#membersBody");
    const cardsContainer = $("#membersCards");
    const tableWrap = $("#membersTableWrap");
    const emptyState = $("#emptyState");
    const emptyTitle = $("#emptyTitle");
    const emptyMessage = $("#emptyMessage");

    if (!tbody || !cardsContainer) return;

    // Clear
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

    members.forEach((member, index) => {
      const initials = getInitials(member.nomeCompleto);
      const altClass = index % 2 === 1 ? " member-avatar--alt" : "";
      const formattedDate = formatDate(member.criadoEm);

      // Table row
      const tr = document.createElement("tr");
      tr.innerHTML =
        '<td>' +
          '<div class="member-name">' +
            '<div class="member-avatar' + altClass + '">' + initials + '</div>' +
            '<span class="member-name-text">' + escapeHTML(member.nomeCompleto) + '</span>' +
          '</div>' +
        '</td>' +
        '<td class="member-email">' + escapeHTML(member.email) + '</td>' +
        '<td class="member-date">' + formattedDate + '</td>';
      tbody.appendChild(tr);

      // Card
      const card = document.createElement("div");
      card.className = "member-card";
      card.innerHTML =
        '<div class="member-avatar' + altClass + '">' + initials + '</div>' +
        '<div class="member-card__info">' +
          '<div class="member-card__name">' + escapeHTML(member.nomeCompleto) + '</div>' +
          '<div class="member-card__email">' + escapeHTML(member.email) + '</div>' +
          '<div class="member-card__date">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
            '<span>' + formattedDate + '</span>' +
          '</div>' +
        '</div>';
      cardsContainer.appendChild(card);
    });
  }

  function escapeHTML(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- SEARCH ----------
  function setupSearch(allMembers) {
    const input = $("#searchInput");
    const clearBtn = $("#searchClear");
    const resultsLabel = $("#searchResults");
    const emptyTitle = $("#emptyTitle");
    const emptyMessage = $("#emptyMessage");

    if (!input) return;

    function doSearch() {
      const query = input.value.trim().toLowerCase();

      // Show/hide clear button
      if (clearBtn) clearBtn.hidden = !query;

      if (!query) {
        renderMembers(allMembers);
        updateMemberCount(allMembers.length);
        if (resultsLabel) resultsLabel.textContent = "";
        return;
      }

      const filtered = allMembers.filter((m) => {
        const name = (m.nomeCompleto || "").toLowerCase();
        const email = (m.email || "").toLowerCase();
        return name.includes(query) || email.includes(query);
      });

      renderMembers(filtered);

      if (resultsLabel) {
        if (filtered.length === 0) {
          resultsLabel.textContent = 'Nenhum resultado para "' + input.value.trim() + '"';
        } else {
          resultsLabel.textContent =
            filtered.length + (filtered.length === 1 ? " resultado" : " resultados") +
            ' para "' + input.value.trim() + '"';
        }
      }

      // Customize empty state for search
      if (filtered.length === 0) {
        if (emptyTitle) emptyTitle.textContent = "Nenhum resultado encontrado";
        if (emptyMessage)
          emptyMessage.textContent =
            'Nao encontramos membros com "' + input.value.trim() + '". Tente buscar com outros termos.';
      }
    }

    input.addEventListener("input", doSearch);

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        input.value = "";
        input.focus();
        doSearch();
      });
    }
  }

  // ---------- COPY CODE ----------
  function setupCopyCode(sessao) {
    const btn = $("#btnCopyCode");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      const code = sessao.codigoIgreja || "";
      if (!code) {
        showToast("Codigo da igreja nao disponivel", "error");
        return;
      }

      try {
        await navigator.clipboard.writeText(code);
        btn.classList.add("copied");
        const label = $("span", btn);
        if (label) label.textContent = "Copiado!";
        showToast("Codigo copiado: " + code, "success");

        setTimeout(() => {
          btn.classList.remove("copied");
          if (label) label.textContent = "Copiar";
        }, 2000);
      } catch {
        // Fallback for older browsers
        const textarea = document.createElement("textarea");
        textarea.value = code;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand("copy");
          showToast("Codigo copiado: " + code, "success");
        } catch {
          showToast("Nao foi possivel copiar. Codigo: " + code, "error");
        }
        document.body.removeChild(textarea);
      }
    });
  }

  // ---------- MEMBER COUNT ----------
  function updateMemberCount(count) {
    const el = $("#memberCount");
    if (!el) return;
    if (count === 0) {
      el.textContent = "Nenhum membro cadastrado ainda";
    } else if (count === 1) {
      el.textContent = "1 membro cadastrado";
    } else {
      el.textContent = count + " membros cadastrados";
    }
  }

  // ---------- INIT ----------
  function init() {
    const sessao = checkAuth();
    if (!sessao) return;

    loadSessionUI(sessao);
    setupSidebar();
    setupLogout();
    setupCopyCode(sessao);

    const members = getMembers(sessao.igrejaId);
    updateMemberCount(members.length);
    renderMembers(members);
    setupSearch(members);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
