// /igreja/painel.js
(async () => {
  "use strict";

  const $ = UIServico.$;
  const $$ = UIServico.$$;

  // ---------- AUTH CHECK ----------
  const sessao = SessaoServico.exigirAutenticacao("igreja");
  if (!sessao) return;

  // ---------- POPULATE USER INFO ----------
  function populateUserInfo() {
    UIServico.popularHeader(sessao);

    const nome = sessao.nome || "Administrador";
    const nomeIgreja = sessao.nomeIgreja || "Minha Igreja";
    const codigoIgreja = sessao.codigoIgreja || "---";

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
      welcomeDate.textContent = UIServico.formatarDataAtual();
    }
  }

  // ---------- METRICS ----------
  async function loadMetrics() {
    const igrejaId = sessao.igrejaId || sessao.id;

    try {
      // Count members
      const membrosIgreja = await ApiServico.obterMembros(igrejaId);
      const metricFieis = $("#metricFieis");
      if (metricFieis) metricFieis.textContent = membrosIgreja.length;

      // Count events this month
      const eventos = await ApiServico.obterEventos(igrejaId);
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const eventosIgreja = eventos.filter((ev) => {
        if (!ev.data) return false;
        const d = new Date(ev.data);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      const metricEventos = $("#metricEventos");
      if (metricEventos) metricEventos.textContent = eventosIgreja.length;

      // Sum payments this month
      const pagamentos = await ApiServico.obterContribuicoes(igrejaId);
      const pagamentosIgreja = pagamentos.filter((p) => {
        if (!p.data) return false;
        const d = new Date(p.data);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      const totalPagamentos = pagamentosIgreja.reduce((sum, p) => {
        return sum + (parseFloat(p.valor) || 0);
      }, 0);
      const metricPagamentos = $("#metricPagamentos");
      if (metricPagamentos) {
        metricPagamentos.textContent = UIServico.formatarMoeda(totalPagamentos);
      }

      // Count prayer requests
      const pedidosIgreja = await ApiServico.obterPedidosOracao(igrejaId);
      const metricOracao = $("#metricOracao");
      if (metricOracao) metricOracao.textContent = pedidosIgreja.length;
    } catch (erro) {
      console.error("Erro ao carregar metricas:", erro);
      UIServico.mostrarToast("Erro ao carregar metricas do painel", "error");
    }
  }

  // ---------- PROXIMOS EVENTOS ----------
  async function loadProximosEventos() {
    const container = $("#proximosEventos");
    if (!container) return;

    const igrejaId = sessao.igrejaId || sessao.id;

    try {
      const eventos = await ApiServico.obterEventos(igrejaId);
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      // Filter future events for this church, sort by date
      let proximos = eventos
        .filter((ev) => {
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
          const partes = UIServico.obterPartesData(ev.data);
          const horario = ev.horario || "19:00";
          const local = ev.local || "Templo sede";
          return (
            '<div class="event-row">' +
              '<div class="event-row__date">' +
                '<span class="event-row__date-day">' + partes.dia + '</span>' +
                '<span class="event-row__date-month">' + partes.mes + '</span>' +
              '</div>' +
              '<div class="event-row__info">' +
                '<span class="event-row__title">' + UIServico.escaparHtml(ev.nome || ev.titulo || "Evento") + '</span>' +
                '<span class="event-row__meta">' + UIServico.escaparHtml(horario) + ' &bull; ' + UIServico.escaparHtml(local) + '</span>' +
              '</div>' +
            '</div>'
          );
        })
        .join("");
    } catch (erro) {
      console.error("Erro ao carregar proximos eventos:", erro);
    }
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

  // ---------- ATIVIDADE RECENTE ----------
  async function loadAtividadeRecente() {
    const container = $("#atividadeRecente");
    if (!container) return;

    const igrejaId = sessao.igrejaId || sessao.id;

    try {
      // Try to build real activity from API data
      const activities = [];

      // Recent members
      const allMembros = await ApiServico.obterMembros(igrejaId);
      const membros = allMembros
        .filter((m) => m.criadoEm)
        .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))
        .slice(0, 2);

      membros.forEach((m) => {
        activities.push({
          type: "success",
          text: '<strong>' + UIServico.escaparHtml(m.nome || "Novo membro") + '</strong> foi cadastrado(a) como fiel.',
          time: timeAgo(m.criadoEm)
        });
      });

      // Recent payments
      const allPagamentos = await ApiServico.obterContribuicoes(igrejaId);
      const pagamentos = allPagamentos
        .filter((p) => p.data)
        .sort((a, b) => new Date(b.data) - new Date(a.data))
        .slice(0, 2);

      pagamentos.forEach((p) => {
        const valor = parseFloat(p.valor) || 0;
        activities.push({
          type: "info",
          text: 'Pagamento de <strong>' + UIServico.formatarMoeda(valor) + '</strong> registrado' + (p.tipo ? ' (' + UIServico.escaparHtml(p.tipo) + ')' : '') + '.',
          time: timeAgo(p.data)
        });
      });

      // Recent prayer requests
      const allPedidos = await ApiServico.obterPedidosOracao(igrejaId);
      const pedidos = allPedidos
        .filter((p) => p.criadoEm)
        .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))
        .slice(0, 2);

      pedidos.forEach((p) => {
        activities.push({
          type: "warning",
          text: 'Novo pedido de oracao de <strong>' + UIServico.escaparHtml(p.nome || "Anonimo") + '</strong>.',
          time: timeAgo(p.criadoEm)
        });
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
    } catch (erro) {
      console.error("Erro ao carregar atividade recente:", erro);
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
          '<span class="activity-row__time">' + UIServico.escaparHtml(activity.time) + '</span>' +
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
    const partes = UIServico.obterPartesData(dateStr);
    return String(partes.dia).padStart(2, "0") + " " + partes.mes;
  }

  // ---------- INIT ----------
  async function init() {
    populateUserInfo();
    await Promise.all([
      loadMetrics(),
      loadProximosEventos(),
      loadAtividadeRecente()
    ]);
    UIServico.configurarSidebar();
    UIServico.configurarLogout();

    // Welcome toast
    const nome = sessao.nome || "Administrador";
    const firstName = nome.split(" ")[0];
    setTimeout(() => {
      UIServico.mostrarToast("Bem-vindo ao painel, " + firstName + "!", "success");
    }, 500);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await init();
    } catch (erro) {
      console.error("Erro ao inicializar painel:", erro);
      UIServico.mostrarToast("Erro ao carregar o painel", "error");
    }
  });
})();
