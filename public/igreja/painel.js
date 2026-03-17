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

      // Count prayer requests (highlight pending)
      const pedidosIgreja = await ApiServico.obterPedidosOracao(igrejaId);
      const pendentes = pedidosIgreja.filter(function(p) { return p.status === "pendente"; });
      const metricOracao = $("#metricOracao");
      if (metricOracao) {
        metricOracao.textContent = pendentes.length > 0
          ? pendentes.length + " pendente" + (pendentes.length > 1 ? "s" : "")
          : pedidosIgreja.length;
        if (pendentes.length > 0) {
          metricOracao.closest(".metric-card").classList.add("metric-card--alerta");
        }
      }
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

  // ---------- CARROSSEL / LINHA DO TEMPO ----------
  var TIPO_LABELS = {
    culto: "Culto", estudo: "Estudo", conferencia: "Conferencia",
    especial: "Especial", evento: "Evento"
  };

  var MESES_CURTOS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  var todosEventosCarrossel = [];
  var filtroCarrossel = "todos";

  function formatarDataCarrossel(dateStr) {
    if (!dateStr) return "";
    var p = dateStr.split("-");
    return p[2] + " " + MESES_CURTOS[parseInt(p[1], 10) - 1] + " " + p[0];
  }

  function renderCarrosselItems(eventos) {
    var track = $("#carrosselTrack");
    var viewport = $("#carrosselViewport");
    if (!track || !viewport) return;

    if (eventos.length === 0) {
      track.innerHTML = '<div class="carrossel-empty">Nenhum evento encontrado.</div>';
      track.style.transform = "translateX(0)";
      return;
    }

    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    var proxId = null;
    for (var i = 0; i < eventos.length; i++) {
      if (new Date(eventos[i].data + "T00:00:00") >= hoje) { proxId = eventos[i].id; break; }
    }

    var svgCal = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
    var svgRelogio = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
    var svgLocal = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';

    var html = "";
    for (var j = 0; j < eventos.length; j++) {
      var ev = eventos[j];
      var tipo = ev.tipo || "evento";
      var passado = new Date(ev.data + "T00:00:00") < hoje;
      var ehProx = ev.id === proxId;
      var tipoLabel = TIPO_LABELS[tipo] || "Evento";

      html += '<div class="carrossel-item' + (passado ? ' carrossel-item--passado' : '') + '">'
        + '<div class="carrossel-card carrossel-card--' + tipo + '">'
        + (ehProx ? '<span class="carrossel-card__badge-prox">Proximo</span>' : '')
        + '<span class="carrossel-card__tipo carrossel-card__tipo--' + tipo + '">' + tipoLabel + '</span>'
        + '<span class="carrossel-card__titulo">' + UIServico.escaparHtml(ev.titulo || ev.nome || "Evento") + '</span>'
        + '<span class="carrossel-card__data">' + svgCal + ' ' + formatarDataCarrossel(ev.data) + '</span>'
        + '<div class="carrossel-card__meta">'
        + (ev.horario ? '<span class="carrossel-card__meta-item">' + svgRelogio + ' ' + UIServico.escaparHtml(ev.horario) + '</span>' : '')
        + (ev.local ? '<span class="carrossel-card__meta-item">' + svgLocal + ' ' + UIServico.escaparHtml(ev.local) + '</span>' : '')
        + '</div></div>'
        + '<div class="carrossel-item__connector"></div>'
        + '<div class="carrossel-item__node carrossel-item__node--' + tipo
        + (ehProx ? ' carrossel-item__node--next' : '')
        + (passado ? ' carrossel-item__node--past' : '') + '"></div>'
        + '</div>';
    }
    track.innerHTML = html;

    // Center the track - calculate initial offset
    carrosselPos = 0;
    track.style.transform = "translateX(0)";

    // Center on the "next" event or center the whole track
    setTimeout(function () {
      var items = track.querySelectorAll(".carrossel-item");
      var proxIdx = -1;
      for (var k = 0; k < eventos.length; k++) {
        if (eventos[k].id === proxId) { proxIdx = k; break; }
      }
      var targetIdx = proxIdx >= 0 ? proxIdx : Math.floor(eventos.length / 2);
      if (items[targetIdx]) {
        var vpW = viewport.offsetWidth;
        var itemLeft = items[targetIdx].offsetLeft;
        var itemW = items[targetIdx].offsetWidth;
        var center = -(itemLeft - (vpW / 2) + (itemW / 2));
        var trackW = track.scrollWidth;
        var maxLeft = 0;
        var maxRight = -(trackW - vpW);
        if (trackW <= vpW) {
          center = (vpW - trackW) / 2;
        } else {
          center = Math.min(maxLeft, Math.max(maxRight, center));
        }
        carrosselPos = center;
        track.style.transition = "transform 0.5s ease";
        track.style.transform = "translateX(" + center + "px)";
        setTimeout(function () { track.style.transition = ""; }, 500);
      }
    }, 50);
  }

  // --- Drag-to-scroll ---
  var carrosselPos = 0;
  var dragStartX = 0;
  var dragStartPos = 0;
  var isDragging = false;
  var hasDragged = false;

  function initDrag() {
    var viewport = $("#carrosselViewport");
    var track = $("#carrosselTrack");
    if (!viewport || !track) return;

    function clampPos(pos) {
      var vpW = viewport.offsetWidth;
      var trackW = track.scrollWidth;
      if (trackW <= vpW) return (vpW - trackW) / 2;
      return Math.min(0, Math.max(-(trackW - vpW), pos));
    }

    function onStart(x) {
      isDragging = true;
      hasDragged = false;
      dragStartX = x;
      dragStartPos = carrosselPos;
      viewport.classList.add("is-dragging");
      track.style.transition = "";
    }

    function onMove(x) {
      if (!isDragging) return;
      var diff = x - dragStartX;
      if (Math.abs(diff) > 5) hasDragged = true;
      carrosselPos = clampPos(dragStartPos + diff);
      track.style.transform = "translateX(" + carrosselPos + "px)";
    }

    function onEnd() {
      if (!isDragging) return;
      isDragging = false;
      viewport.classList.remove("is-dragging");
    }

    // Mouse
    viewport.addEventListener("mousedown", function (e) {
      e.preventDefault();
      onStart(e.clientX);
    });
    window.addEventListener("mousemove", function (e) { onMove(e.clientX); });
    window.addEventListener("mouseup", onEnd);

    // Touch
    viewport.addEventListener("touchstart", function (e) {
      onStart(e.touches[0].clientX);
    }, { passive: true });
    viewport.addEventListener("touchmove", function (e) {
      onMove(e.touches[0].clientX);
    }, { passive: true });
    viewport.addEventListener("touchend", onEnd);

    // Arrow buttons
    var prev = $("#carrosselPrev");
    var next = $("#carrosselNext");
    if (prev) {
      prev.addEventListener("click", function () {
        carrosselPos = clampPos(carrosselPos + 240);
        track.style.transition = "transform 0.35s ease";
        track.style.transform = "translateX(" + carrosselPos + "px)";
        setTimeout(function () { track.style.transition = ""; }, 350);
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        carrosselPos = clampPos(carrosselPos - 240);
        track.style.transition = "transform 0.35s ease";
        track.style.transform = "translateX(" + carrosselPos + "px)";
        setTimeout(function () { track.style.transition = ""; }, 350);
      });
    }
  }

  // --- Filters ---
  function initFiltros() {
    var container = $("#carrosselFiltros");
    if (!container) return;
    container.addEventListener("click", function (e) {
      var btn = e.target.closest(".carrossel-filtro");
      if (!btn) return;
      container.querySelectorAll(".carrossel-filtro").forEach(function (b) { b.classList.remove("carrossel-filtro--active"); });
      btn.classList.add("carrossel-filtro--active");
      filtroCarrossel = btn.getAttribute("data-filtro");
      var lista = filtroCarrossel === "todos" ? todosEventosCarrossel : todosEventosCarrossel.filter(function (ev) { return (ev.tipo || "evento") === filtroCarrossel; });
      renderCarrosselItems(lista);
    });
  }

  async function loadCarrossel() {
    var igrejaId = sessao.igrejaId || sessao.id;
    try {
      todosEventosCarrossel = (await ApiServico.obterEventos(igrejaId))
        .sort(function (a, b) { return (a.data || "").localeCompare(b.data || ""); });
      renderCarrosselItems(todosEventosCarrossel);
      initDrag();
      initFiltros();
    } catch (erro) {
      console.error("Erro ao carregar carrossel:", erro);
    }
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

  // ---------- PEDIDOS PENDENTES ----------
  async function loadPedidosPendentes() {
    var section = $("#pedidosPendentesSection");
    var body = $("#pedidosPendentesBody");
    var countBadge = $("#pedidosPendentesCount");
    if (!section || !body) return;

    var igrejaId = sessao.igrejaId || sessao.id;

    try {
      var todos = await ApiServico.obterPedidosOracao(igrejaId);
      var pendentes = todos
        .filter(function(p) { return p.status === "pendente"; })
        .sort(function(a, b) { return new Date(b.criadoEm) - new Date(a.criadoEm); })
        .slice(0, 5);

      if (pendentes.length === 0) {
        section.style.display = "none";
        return;
      }

      section.style.display = "";
      if (countBadge) countBadge.textContent = pendentes.length;

      body.innerHTML = pendentes.map(function(p) {
        var iniciais = UIServico.obterIniciais(p.membroNome || "?");
        var pedidoTrunc = (p.pedido || "").length > 100
          ? UIServico.escaparHtml(p.pedido.substring(0, 100)) + "..."
          : UIServico.escaparHtml(p.pedido);

        return (
          '<div class="pedido-pendente-row">' +
            '<div class="pedido-pendente-row__avatar">' + iniciais + '</div>' +
            '<div class="pedido-pendente-row__content">' +
              '<div class="pedido-pendente-row__header">' +
                '<strong>' + UIServico.escaparHtml(p.membroNome || "Membro") + '</strong>' +
                '<span class="pedido-pendente-row__time">' + timeAgo(p.criadoEm) + '</span>' +
              '</div>' +
              '<p class="pedido-pendente-row__text">' + pedidoTrunc + '</p>' +
            '</div>' +
          '</div>'
        );
      }).join("");
    } catch (erro) {
      console.error("Erro ao carregar pedidos pendentes:", erro);
    }
  }

  // ---------- QR CODE ----------
  function setupQRCode() {
    const codigoIgreja = sessao.codigoIgreja || "---";
    const origin = window.location.origin;
    const linkConvite = origin + "/autenticacao/criar-conta.html?tipo=membro&igreja=" + codigoIgreja;

    // Link input
    const linkInput = $("#qrcodeLinkInput");
    if (linkInput) linkInput.value = linkConvite;

    // Código da igreja
    const codigoEl = $("#qrcodeCodigoIgreja");
    if (codigoEl) codigoEl.textContent = codigoIgreja;

    // Gerar QR Code
    const container = $("#qrcodeContainer");
    if (container && typeof qrcode !== "undefined") {
      var qr = qrcode(0, "M");
      qr.addData(linkConvite);
      qr.make();
      container.innerHTML = qr.createImgTag(4, 8);
    }

    // Botão copiar
    const btnCopiar = $("#btnCopiarLink");
    if (btnCopiar) {
      btnCopiar.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(linkConvite);
          btnCopiar.innerHTML =
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Copiado!';
          setTimeout(() => {
            btnCopiar.innerHTML =
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar';
          }, 2000);
        } catch (e) {
          // Fallback: selecionar texto
          if (linkInput) {
            linkInput.select();
            document.execCommand("copy");
          }
        }
      });
    }

    // Botão baixar QR
    const btnBaixar = $("#btnBaixarQR");
    if (btnBaixar) {
      btnBaixar.addEventListener("click", () => {
        const img = container ? container.querySelector("img") : null;
        if (!img) return;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const tempImg = new Image();
        tempImg.onload = function() {
          canvas.width = tempImg.width;
          canvas.height = tempImg.height;
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(tempImg, 0, 0);

          const link = document.createElement("a");
          link.download = "qrcode-" + codigoIgreja + ".png";
          link.href = canvas.toDataURL("image/png");
          link.click();
        };
        tempImg.src = img.src;
      });
    }
  }

  // ---------- INIT ----------
  async function init() {
    populateUserInfo();
    setupQRCode();
    await Promise.all([
      loadMetrics(),
      loadCarrossel(),
      loadProximosEventos(),
      loadAtividadeRecente(),
      loadPedidosPendentes()
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
