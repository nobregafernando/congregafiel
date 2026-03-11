(async function () {
    "use strict";

    var $ = UIServico.$;
    var esc = UIServico.escaparHtml;
    var formatarData = UIServico.formatarData;
    var formatarMoeda = UIServico.formatarMoeda;
    var obterPartesData = UIServico.obterPartesData;

    /* ===== Autenticacao ===== */
    var sessao = SessaoServico.exigirAutenticacao("membro", "../index.html");
    if (!sessao) return;

    /* ===== Sidebar / Topbar / Logout ===== */
    UIServico.configurarSidebar({ toggle: "#btnHamburger" });
    UIServico.configurarLogout({ seletor: "#btnSair", url: "../index.html" });
    UIServico.popularHeader(sessao, {
        nomeIgreja: "#topbarChurch",
        nomeUsuario: "#topbarName",
        avatar: "#topbarAvatar"
    });

    /* ===== Boas-vindas ===== */
    $("#welcomeTitle").textContent = "Bem-vindo, " + sessao.nome.split(" ")[0] + "!";
    $("#welcomeSub").textContent = sessao.nomeIgreja || "";

    /* ===== Carregar dados ===== */
    var igrejaId = sessao.igrejaId;

    /* ===== Carrossel / Linha do Tempo ===== */
    var TIPO_LABELS = {
        culto: "Culto", estudo: "Estudo", conferencia: "Conferencia",
        especial: "Especial", evento: "Evento"
    };
    var MESES_CURTOS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    var todosEventosCarrossel = [];
    var filtroCarrossel = "todos";
    var carrosselPos = 0;

    function formatarDataCarrossel(dateStr) {
        if (!dateStr) return "";
        var p = dateStr.split("-");
        return p[2] + " " + MESES_CURTOS[parseInt(p[1], 10) - 1] + " " + p[0];
    }

    function renderCarrosselItems(eventos) {
        var track = $("#carrosselTrack");
        var viewport = $("#carrosselViewport");
        if (!track || !viewport) return;

        if (!eventos.length) {
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
              + '<span class="carrossel-card__titulo">' + esc(ev.titulo || ev.nome || "Evento") + '</span>'
              + '<span class="carrossel-card__data">' + svgCal + ' ' + formatarDataCarrossel(ev.data) + '</span>'
              + '<div class="carrossel-card__meta">'
              + (ev.horario ? '<span class="carrossel-card__meta-item">' + svgRelogio + ' ' + esc(ev.horario) + '</span>' : '')
              + (ev.local ? '<span class="carrossel-card__meta-item">' + svgLocal + ' ' + esc(ev.local) + '</span>' : '')
              + '</div></div>'
              + '<div class="carrossel-item__connector"></div>'
              + '<div class="carrossel-item__node carrossel-item__node--' + tipo
              + (ehProx ? ' carrossel-item__node--next' : '')
              + (passado ? ' carrossel-item__node--past' : '') + '"></div>'
              + '</div>';
        }
        track.innerHTML = html;

        carrosselPos = 0;
        track.style.transform = "translateX(0)";

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
                if (trackW <= vpW) {
                    center = (vpW - trackW) / 2;
                } else {
                    center = Math.min(0, Math.max(-(trackW - vpW), center));
                }
                carrosselPos = center;
                track.style.transition = "transform 0.5s ease";
                track.style.transform = "translateX(" + center + "px)";
                setTimeout(function () { track.style.transition = ""; }, 500);
            }
        }, 50);
    }

    function initCarrosselDrag() {
        var viewport = $("#carrosselViewport");
        var track = $("#carrosselTrack");
        if (!viewport || !track) return;
        var isDragging = false, dragStartX = 0, dragStartPos = 0;

        function clampPos(pos) {
            var vpW = viewport.offsetWidth;
            var trackW = track.scrollWidth;
            if (trackW <= vpW) return (vpW - trackW) / 2;
            return Math.min(0, Math.max(-(trackW - vpW), pos));
        }

        function onStart(x) {
            isDragging = true;
            dragStartX = x;
            dragStartPos = carrosselPos;
            viewport.classList.add("is-dragging");
            track.style.transition = "";
        }
        function onMove(x) {
            if (!isDragging) return;
            carrosselPos = clampPos(dragStartPos + (x - dragStartX));
            track.style.transform = "translateX(" + carrosselPos + "px)";
        }
        function onEnd() {
            if (!isDragging) return;
            isDragging = false;
            viewport.classList.remove("is-dragging");
        }

        viewport.addEventListener("mousedown", function (e) { e.preventDefault(); onStart(e.clientX); });
        window.addEventListener("mousemove", function (e) { onMove(e.clientX); });
        window.addEventListener("mouseup", onEnd);
        viewport.addEventListener("touchstart", function (e) { onStart(e.touches[0].clientX); }, { passive: true });
        viewport.addEventListener("touchmove", function (e) { onMove(e.touches[0].clientX); }, { passive: true });
        viewport.addEventListener("touchend", onEnd);

        var prev = $("#carrosselPrev");
        var next = $("#carrosselNext");
        if (prev) prev.addEventListener("click", function () {
            carrosselPos = clampPos(carrosselPos + 240);
            track.style.transition = "transform 0.35s ease";
            track.style.transform = "translateX(" + carrosselPos + "px)";
            setTimeout(function () { track.style.transition = ""; }, 350);
        });
        if (next) next.addEventListener("click", function () {
            carrosselPos = clampPos(carrosselPos - 240);
            track.style.transition = "transform 0.35s ease";
            track.style.transform = "translateX(" + carrosselPos + "px)";
            setTimeout(function () { track.style.transition = ""; }, 350);
        });
    }

    function initCarrosselFiltros() {
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

    try {
        // Eventos
        var agora = new Date().toISOString();
        var todosEventos = await ApiServico.obterEventos(igrejaId);
        todosEventosCarrossel = todosEventos.slice()
            .sort(function (a, b) { return (a.data || "").localeCompare(b.data || ""); });
        var eventosIgreja = todosEventosCarrossel
            .filter(function (e) { return e.data >= agora.slice(0, 10); });

        $("#statEventos").textContent = eventosIgreja.length;

        // Renderizar carrossel com todos os eventos
        renderCarrosselItems(todosEventosCarrossel);
        initCarrosselDrag();
        initCarrosselFiltros();

        // Pagamentos
        var todosContribuicoes = await ApiServico.obterContribuicoes(igrejaId);
        var meusPagamentos = todosContribuicoes
            .filter(function (p) { return p.membro === sessao.nome; });
        var totalPago = meusPagamentos.reduce(function (s, p) { return s + Number(p.valor || 0); }, 0);
        $("#statPagamentos").textContent = formatarMoeda(totalPago);

        // Comunicados
        var comunicadosIgreja = (await ApiServico.obterComunicados(igrejaId))
            .sort(function (a, b) { return (b.criadoEm || b.data || "").localeCompare(a.criadoEm || a.data || ""); });

        $("#statComunicados").textContent = comunicadosIgreja.length;

        // Pedidos de oracao
        var todosPedidos = await ApiServico.obterPedidosOracao(igrejaId);
        var meusPedidos = todosPedidos.filter(function (p) { return p.membroId === sessao.id; });
        $("#statPedidos").textContent = meusPedidos.length;

        /* ===== Renderizar Comunicados ===== */
        var listaCom = $("#listaComunicados");
        if (comunicadosIgreja.length > 0) {
            listaCom.innerHTML = "";
            comunicadosIgreja.slice(0, 4).forEach(function (c) {
                var prioClass = c.prioridade === "urgente" ? "priority-badge--urgente" : "priority-badge--normal";
                var prioLabel = c.prioridade === "urgente" ? "Urgente" : "Normal";
                var div = document.createElement("div");
                div.className = "comunicado-item";
                div.innerHTML =
                    '<h4>' + esc(c.titulo) + ' <span class="priority-badge ' + prioClass + '">' + prioLabel + '</span></h4>' +
                    '<p>' + esc(c.conteudo || c.mensagem || "") + '</p>' +
                    '<span class="comunicado-date">' + formatarData(c.criadoEm || c.data) + '</span>';
                listaCom.appendChild(div);
            });
        }

        /* ===== Renderizar Eventos ===== */
        var listaEv = $("#listaEventos");
        if (eventosIgreja.length > 0) {
            listaEv.innerHTML = "";
            eventosIgreja.slice(0, 4).forEach(function (e) {
                var dp = obterPartesData(e.data);
                var div = document.createElement("div");
                div.className = "evento-item";
                div.innerHTML =
                    '<div class="evento-date-badge">' +
                        '<span class="day">' + dp.dia + '</span>' +
                        '<span class="month">' + dp.mes + '</span>' +
                    '</div>' +
                    '<div class="evento-info">' +
                        '<h4>' + esc(e.titulo || e.nome) + '</h4>' +
                        '<p>' + esc(e.horario || "") + (e.local ? ' &middot; ' + esc(e.local) : '') + '</p>' +
                    '</div>';
                listaEv.appendChild(div);
            });
        }
    } catch (erro) {
        UIServico.mostrarToast("Erro ao carregar dados do painel.", "error");
        console.error(erro);
    }
})();
