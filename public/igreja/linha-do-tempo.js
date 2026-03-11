// /igreja/linha-do-tempo.js
(async function () {
    "use strict";

    var $ = UIServico.$;
    var esc = UIServico.escaparHtml;

    /* ===== Autenticacao (igreja) ===== */
    var sessao = SessaoServico.exigirAutenticacao("igreja");
    if (!sessao) return;

    /* ===== Sidebar / Topbar / Logout ===== */
    UIServico.popularHeader(sessao);
    UIServico.configurarSidebar({ toggle: "#menuToggle" });
    UIServico.configurarLogout({ seletor: "#btnSair" });

    /* ===== Configuracao de tipos ===== */
    var TIPOS = {
        culto: {
            label: "Culto",
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2H6a2 2 0 0 0-2 2v16l8-4 8 4V4a2 2 0 0 0-2-2z"/></svg>'
        },
        estudo: {
            label: "Estudo",
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>'
        },
        conferencia: {
            label: "Confer\u00eancia",
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>'
        },
        especial: {
            label: "Especial",
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L15 8.5L22 9.5L17 14.5L18 21.5L12 18.5L6 21.5L7 14.5L2 9.5L9 8.5L12 2Z"/></svg>'
        },
        evento: {
            label: "Evento",
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
        }
    };

    var MESES = [
        "Janeiro", "Fevereiro", "Mar\u00e7o", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    /* ===== Helpers ===== */
    function isProximo(dateStr) {
        var hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        return new Date(dateStr + "T00:00:00") >= hoje;
    }

    function formatarDataLonga(dateStr) {
        if (!dateStr) return "";
        var partes = dateStr.split("-");
        var nomesDia = ["Domingo", "Segunda", "Ter\u00e7a", "Quarta", "Quinta", "Sexta", "S\u00e1bado"];
        var d = new Date(dateStr + "T12:00:00");
        return nomesDia[d.getDay()] + ", " + partes[2] + " de " + MESES[parseInt(partes[1], 10) - 1] + " de " + partes[0];
    }

    function formatarDataCurta(dateStr) {
        if (!dateStr) return "";
        var p = dateStr.split("-");
        return p[2] + "/" + p[1] + "/" + p[0];
    }

    function obterMesAno(dateStr) { return dateStr.substring(0, 7); }

    function obterLabelMesAno(dateStr) {
        var p = dateStr.split("-");
        return MESES[parseInt(p[1], 10) - 1] + " " + p[0];
    }

    var svgRelogio = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
    var svgLocal = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
    var svgCalendario = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';

    /* ===== Dados ===== */
    var todosEventos = [];
    var filtroAtual = "todos";

    try {
        todosEventos = (await ApiServico.obterEventos(sessao.igrejaId))
            .sort(function (a, b) { return (a.data || "").localeCompare(b.data || ""); });
    } catch (erro) {
        UIServico.mostrarToast("Erro ao carregar eventos.", "error");
        console.error(erro);
        return;
    }

    /* ===== Proximo evento ===== */
    function encontrarProximo(eventos) {
        var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        for (var i = 0; i < eventos.length; i++) {
            if (new Date(eventos[i].data + "T00:00:00") >= hoje) return eventos[i];
        }
        return null;
    }

    /* ===== Hero ===== */
    function renderizarHero(eventos) {
        var prox = encontrarProximo(eventos);
        $("#statTotal").textContent = eventos.length;
        $("#statCultos").textContent = eventos.filter(function (e) { return e.tipo === "culto"; }).length;
        $("#statProximos").textContent = eventos.filter(function (e) { return isProximo(e.data); }).length;

        var card = $("#nextEventCard");
        if (prox) {
            card.style.display = "";
            $("#nextEventTitle").textContent = prox.titulo;
            var info = [];
            if (prox.horario) info.push(prox.horario);
            if (prox.local) info.push(prox.local);
            info.push(formatarDataCurta(prox.data));
            $("#nextEventInfo").textContent = info.join(" \u2022 ");
            iniciarContagem(prox);
        } else {
            card.style.display = "none";
        }
    }

    /* ===== Countdown ===== */
    var contagemInterval = null;
    function iniciarContagem(ev) {
        if (contagemInterval) clearInterval(contagemInterval);
        function atualizar() {
            var agora = new Date();
            var alvo = ev.horario ? new Date(ev.data + "T" + ev.horario + ":00") : new Date(ev.data + "T00:00:00");
            var diff = Math.max(0, alvo - agora);
            var d = Math.floor(diff / 864e5);
            var h = Math.floor((diff % 864e5) / 36e5);
            var m = Math.floor((diff % 36e5) / 6e4);
            $("#countDias").textContent = d < 10 ? "0" + d : d;
            $("#countHoras").textContent = h < 10 ? "0" + h : h;
            $("#countMin").textContent = m < 10 ? "0" + m : m;
        }
        atualizar();
        contagemInterval = setInterval(atualizar, 60000);
    }

    /* ===== Timeline ===== */
    function renderizarTimeline(eventos) {
        var container = $("#timeline");
        var empty = $("#emptyState");
        if (!eventos.length) { container.innerHTML = ""; container.style.display = "none"; empty.style.display = ""; return; }
        container.style.display = ""; empty.style.display = "none";

        var html = "", mesAtual = "", prox = encontrarProximo(eventos), proxId = prox ? prox.id : null;

        for (var i = 0; i < eventos.length; i++) {
            var ev = eventos[i], tipo = ev.tipo || "evento", info = TIPOS[tipo] || TIPOS.evento;
            var passado = !isProximo(ev.data), ehProx = ev.id === proxId, mesAno = obterMesAno(ev.data);

            if (mesAno !== mesAtual) {
                mesAtual = mesAno;
                html += '<div class="tl-month"><span class="tl-month__label">' + svgCalendario.replace('viewBox', 'width="14" height="14" viewBox') + ' ' + esc(obterLabelMesAno(ev.data)) + '</span></div>';
            }

            html += '<div class="tl-item" data-tipo="' + tipo + '">'
                + '<div class="tl-node tl-node--' + tipo + (ehProx ? ' tl-node--next' : '') + (passado ? ' tl-node--past' : '') + '">' + info.icon + '</div>'
                + '<div class="tl-card tl-card--' + tipo + (passado ? ' tl-card--past' : '') + '">'
                + '<div class="tl-card__header">'
                + '<span class="tl-tipo-badge tl-tipo-badge--' + tipo + '">' + info.label + '</span>'
                + '<span class="tl-date-badge">' + formatarDataLonga(ev.data) + '</span>'
                + (ehProx ? '<span class="tl-next-badge">Em breve</span>' : '')
                + '</div>'
                + '<h3 class="tl-card__title">' + esc(ev.titulo) + '</h3>'
                + (ev.descricao ? '<p class="tl-card__desc">' + esc(ev.descricao) + '</p>' : '')
                + '<div class="tl-card__meta">'
                + (ev.horario ? '<span class="tl-card__meta-item">' + svgRelogio + ' ' + esc(ev.horario) + '</span>' : '')
                + (ev.local ? '<span class="tl-card__meta-item">' + svgLocal + ' ' + esc(ev.local) + '</span>' : '')
                + '</div></div></div>';
        }
        container.innerHTML = html;
        observarItens();
    }

    function observarItens() {
        var itens = document.querySelectorAll(".tl-item");
        if (!("IntersectionObserver" in window)) { itens.forEach(function (el) { el.classList.add("is-visible"); }); return; }
        var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-visible"); obs.unobserve(e.target); } });
        }, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });
        itens.forEach(function (el) { obs.observe(el); });
        document.querySelectorAll(".tl-month").forEach(function (el) {
            el.style.opacity = "0"; el.style.transform = "translateY(10px)"; el.style.transition = "opacity 0.4s ease, transform 0.4s ease";
            var mo = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) { if (e.isIntersecting) { e.target.style.opacity = "1"; e.target.style.transform = "translateY(0)"; mo.unobserve(e.target); } });
            }, { threshold: 0.3 });
            mo.observe(el);
        });
    }

    /* ===== Filtros ===== */
    $("#filters").addEventListener("click", function (e) {
        var btn = e.target.closest(".filters__btn");
        if (!btn) return;
        this.querySelectorAll(".filters__btn").forEach(function (b) { b.classList.remove("filters__btn--active"); });
        btn.classList.add("filters__btn--active");
        filtroAtual = btn.getAttribute("data-filtro");
        var lista = filtroAtual === "todos" ? todosEventos : todosEventos.filter(function (ev) { return (ev.tipo || "evento") === filtroAtual; });
        renderizarTimeline(lista);
    });

    /* ===== Init ===== */
    renderizarHero(todosEventos);
    renderizarTimeline(todosEventos);
})();
