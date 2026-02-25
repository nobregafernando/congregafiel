// /igreja/painel.js
(() => {
  "use strict";

  // ---------- HELPERS ----------
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

  const SESSION_KEY = "cf_sessao";
  const LOGIN_URL = "../autenticacao/login.html";

  // ---------- SESSION CHECK ----------
  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function requireAuth() {
    const session = getSession();
    if (!session || session.tipo !== "igreja") {
      window.location.href = LOGIN_URL;
      return null;
    }
    return session;
  }

  // ---------- TOAST ----------
  let toastTimer = null;

  function showToast(message, type) {
    const el = $("#toast");
    if (!el) return;

    el.className = "toast";
    if (type === "success") el.classList.add("toast--success");
    else if (type === "error") el.classList.add("toast--error");

    let iconSvg = "";
    if (type === "success") {
      iconSvg = '<svg class="toast__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D8A4E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    } else if (type === "error") {
      iconSvg = '<svg class="toast__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    }

    el.innerHTML = iconSvg + '<span>' + escapeHtml(message) + '</span>';
    el.classList.add("show");

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove("show");
    }, 3200);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- SIDEBAR ----------
  const sidebar = $("#sidebar");
  const sidebarOverlay = $("#sidebarOverlay");
  const sidebarToggle = $("#sidebarToggle");
  const sidebarClose = $("#sidebarClose");

  function openSidebar() {
    if (!sidebar) return;
    sidebar.classList.add("is-open");
    if (sidebarOverlay) sidebarOverlay.classList.add("is-visible");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove("is-open");
    if (sidebarOverlay) sidebarOverlay.classList.remove("is-visible");
    document.body.style.overflow = "";
  }

  function setupSidebar() {
    if (sidebarToggle) {
      sidebarToggle.addEventListener("click", openSidebar);
    }
    if (sidebarClose) {
      sidebarClose.addEventListener("click", closeSidebar);
    }
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener("click", closeSidebar);
    }

    // Close sidebar on resize to desktop
    window.addEventListener("resize", () => {
      if (window.innerWidth > 820) {
        closeSidebar();
      }
    });

    // ESC key closes sidebar
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && sidebar && sidebar.classList.contains("is-open")) {
        closeSidebar();
      }
    });
  }

  // ---------- LOGOUT ----------
  function setupLogout() {
    const btn = $("#btnLogout");
    if (!btn) return;
    btn.addEventListener("click", () => {
      localStorage.removeItem(SESSION_KEY);
      window.location.href = LOGIN_URL;
    });
  }

  // ---------- POPULATE USER INFO ----------
  function populateUserInfo(session) {
    const nome = session.nome || "Administrador";
    const nomeIgreja = session.nomeIgreja || "Minha Igreja";
    const codigoIgreja = session.codigoIgreja || "---";

    // Topbar
    const topbarChurchName = $("#topbarChurchName");
    if (topbarChurchName) topbarChurchName.textContent = nomeIgreja;

    const topbarUserName = $("#topbarUserName");
    if (topbarUserName) topbarUserName.textContent = nome;

    const topbarAvatarInitial = $("#topbarAvatarInitial");
    if (topbarAvatarInitial) {
      topbarAvatarInitial.textContent = nome.charAt(0).toUpperCase();
    }

    // Welcome
    const welcomeHeading = $("#welcomeHeading");
    if (welcomeHeading) {
      welcomeHeading.textContent = "Bem-vindo, " + nome.split(" ")[0];
    }

    const welcomeChurchName = $("#welcomeChurchName");
    if (welcomeChurchName) welcomeChurchName.textContent = nomeIgreja;

    const welcomeChurchCode = $("#welcomeChurchCode");
    if (welcomeChurchCode) welcomeChurchCode.textContent = codigoIgreja;

    // Date
    const welcomeDate = $("#welcomeDate");
    if (welcomeDate) {
      welcomeDate.textContent = formatCurrentDate();
    }
  }

  function formatCurrentDate() {
    const now = new Date();
    const options = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    };
    let formatted = now.toLocaleDateString("pt-BR", options);
    // Capitalize first letter
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  // ---------- METRICS ----------
  function loadMetrics(session) {
    const igrejaId = session.igrejaId || session.id;

    // Count members
    const membros = safeParseArray("cf_membros");
    const membrosIgreja = membros.filter((m) => m.igrejaId === igrejaId);
    const metricFieis = $("#metricFieis");
    if (metricFieis) metricFieis.textContent = membrosIgreja.length;

    // Count events this month
    const eventos = safeParseArray("cf_eventos");
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const eventosIgreja = eventos.filter((ev) => {
      if (ev.igrejaId !== igrejaId) return false;
      if (!ev.data) return false;
      const d = new Date(ev.data);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const metricEventos = $("#metricEventos");
    if (metricEventos) metricEventos.textContent = eventosIgreja.length;

    // Sum payments this month
    const pagamentos = safeParseArray("cf_pagamentos");
    const pagamentosIgreja = pagamentos.filter((p) => {
      if (p.igrejaId !== igrejaId) return false;
      if (!p.data) return false;
      const d = new Date(p.data);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const totalPagamentos = pagamentosIgreja.reduce((sum, p) => {
      return sum + (parseFloat(p.valor) || 0);
    }, 0);
    const metricPagamentos = $("#metricPagamentos");
    if (metricPagamentos) {
      metricPagamentos.textContent = "R$ " + formatCurrency(totalPagamentos);
    }

    // Count prayer requests
    const pedidos = safeParseArray("cf_pedidos_oracao");
    const pedidosIgreja = pedidos.filter((p) => p.igrejaId === igrejaId);
    const metricOracao = $("#metricOracao");
    if (metricOracao) metricOracao.textContent = pedidosIgreja.length;
  }

  function safeParseArray(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function formatCurrency(value) {
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  // ---------- PROXIMOS EVENTOS ----------
  function loadProximosEventos(session) {
    const container = $("#proximosEventos");
    if (!container) return;

    const igrejaId = session.igrejaId || session.id;
    const eventos = safeParseArray("cf_eventos");
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Filter future events for this church, sort by date
    let proximos = eventos
      .filter((ev) => {
        if (ev.igrejaId !== igrejaId) return false;
        if (!ev.data) return false;
        const d = new Date(ev.data);
        return d >= now;
      })
      .sort((a, b) => new Date(a.data) - new Date(b.data))
      .slice(0, 4);

    // If no real events, show placeholders
    if (proximos.length === 0) {
      proximos = getPlaceholderEvents();
    }

    container.innerHTML = proximos
      .map((ev) => {
        const d = new Date(ev.data);
        const day = d.getDate();
        const month = getMonthAbbr(d.getMonth());
        const horario = ev.horario || "19:00";
        const local = ev.local || "Templo sede";
        return (
          '<div class="event-row">' +
            '<div class="event-row__date">' +
              '<span class="event-row__date-day">' + day + '</span>' +
              '<span class="event-row__date-month">' + month + '</span>' +
            '</div>' +
            '<div class="event-row__info">' +
              '<span class="event-row__title">' + escapeHtml(ev.nome || ev.titulo || "Evento") + '</span>' +
              '<span class="event-row__meta">' + escapeHtml(horario) + ' &bull; ' + escapeHtml(local) + '</span>' +
            '</div>' +
          '</div>'
        );
      })
      .join("");
  }

  function getPlaceholderEvents() {
    const now = new Date();
    const base = now.getDate();
    const month = now.getMonth();
    const year = now.getFullYear();

    return [
      {
        nome: "Culto de Domingo",
        data: new Date(year, month, base + ((7 - now.getDay()) % 7 || 7)).toISOString(),
        horario: "18:00",
        local: "Templo sede"
      },
      {
        nome: "Estudo Biblico",
        data: new Date(year, month, base + 3).toISOString(),
        horario: "19:30",
        local: "Sala 1"
      },
      {
        nome: "Reuniao de Jovens",
        data: new Date(year, month, base + 5).toISOString(),
        horario: "20:00",
        local: "Templo sede"
      },
      {
        nome: "Culto de Oracao",
        data: new Date(year, month, base + 8).toISOString(),
        horario: "19:00",
        local: "Templo sede"
      }
    ];
  }

  function getMonthAbbr(monthIndex) {
    const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
    return months[monthIndex] || "";
  }

  // ---------- ATIVIDADE RECENTE ----------
  function loadAtividadeRecente(session) {
    const container = $("#atividadeRecente");
    if (!container) return;

    const igrejaId = session.igrejaId || session.id;

    // Try to build real activity from localStorage data
    const activities = [];

    // Recent members
    const membros = safeParseArray("cf_membros")
      .filter((m) => m.igrejaId === igrejaId && m.criadoEm)
      .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))
      .slice(0, 2);

    membros.forEach((m) => {
      activities.push({
        type: "success",
        text: '<strong>' + escapeHtml(m.nome || "Novo membro") + '</strong> foi cadastrado(a) como fiel.',
        time: timeAgo(m.criadoEm)
      });
    });

    // Recent payments
    const pagamentos = safeParseArray("cf_pagamentos")
      .filter((p) => p.igrejaId === igrejaId && p.data)
      .sort((a, b) => new Date(b.data) - new Date(a.data))
      .slice(0, 2);

    pagamentos.forEach((p) => {
      const valor = parseFloat(p.valor) || 0;
      activities.push({
        type: "info",
        text: 'Pagamento de <strong>R$ ' + formatCurrency(valor) + '</strong> registrado' + (p.tipo ? ' (' + escapeHtml(p.tipo) + ')' : '') + '.',
        time: timeAgo(p.data)
      });
    });

    // Recent prayer requests
    const pedidos = safeParseArray("cf_pedidos_oracao")
      .filter((p) => p.igrejaId === igrejaId && p.criadoEm)
      .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))
      .slice(0, 2);

    pedidos.forEach((p) => {
      activities.push({
        type: "warning",
        text: 'Novo pedido de oracao de <strong>' + escapeHtml(p.nome || "Anonimo") + '</strong>.',
        time: timeAgo(p.criadoEm)
      });
    });

    // Sort by most recent
    activities.sort((a, b) => {
      // Keep original order since we already sorted each category
      return 0;
    });

    // If no real data, show placeholders
    if (activities.length === 0) {
      const placeholders = getPlaceholderActivities();
      container.innerHTML = placeholders
        .map((a) => renderActivityRow(a))
        .join("");
    } else {
      container.innerHTML = activities
        .slice(0, 6)
        .map((a) => renderActivityRow(a))
        .join("");
    }
  }

  function getPlaceholderActivities() {
    return [
      {
        type: "success",
        text: '<strong>Maria Silva</strong> foi cadastrada como fiel.',
        time: "Hoje, 10:32"
      },
      {
        type: "info",
        text: 'Pagamento de <strong>R$ 150,00</strong> registrado (Dizimo).',
        time: "Hoje, 09:15"
      },
      {
        type: "warning",
        text: 'Novo pedido de oracao de <strong>Joao Santos</strong>.',
        time: "Ontem, 21:40"
      },
      {
        type: "success",
        text: 'Evento <strong>Culto de Jovens</strong> criado.',
        time: "Ontem, 14:20"
      },
      {
        type: "info",
        text: 'Comunicado <strong>Aviso importante</strong> publicado.',
        time: "23 Fev, 16:05"
      }
    ];
  }

  function renderActivityRow(activity) {
    return (
      '<div class="activity-row">' +
        '<div class="activity-row__dot activity-row__dot--' + (activity.type || "info") + '"></div>' +
        '<div class="activity-row__content">' +
          '<span class="activity-row__text">' + activity.text + '</span>' +
          '<span class="activity-row__time">' + escapeHtml(activity.time) + '</span>' +
        '</div>' +
      '</div>'
    );
  }

  function timeAgo(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "Agora";
    if (diffMin < 60) return "Ha " + diffMin + " min";
    if (diffHour < 24) return "Ha " + diffHour + "h";
    if (diffDay === 1) return "Ontem";
    if (diffDay < 7) return "Ha " + diffDay + " dias";

    // Format as date
    const day = date.getDate().toString().padStart(2, "0");
    const month = getMonthAbbr(date.getMonth());
    return day + " " + month;
  }

  // ---------- INIT ----------
  function init() {
    const session = requireAuth();
    if (!session) return;

    populateUserInfo(session);
    loadMetrics(session);
    loadProximosEventos(session);
    loadAtividadeRecente(session);
    setupSidebar();
    setupLogout();

    // Welcome toast
    const nome = session.nome || "Administrador";
    const firstName = nome.split(" ")[0];
    setTimeout(() => {
      showToast("Bem-vindo ao painel, " + firstName + "!", "success");
    }, 500);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
