(async function () {
    "use strict";

    var $ = UIServico.$;
    var esc = UIServico.escaparHtml;

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
        var d = new Date(dateStr + "T00:00:00");
        return d >= hoje;
    }

    function formatarDataLonga(dateStr) {
        if (!dateStr) return "";
        var partes = dateStr.split("-");
        var dia = partes[2];
        var mesIdx = parseInt(partes[1], 10) - 1;
        var ano = partes[0];
        var nomesDiaSemana = ["Domingo", "Segunda", "Ter\u00e7a", "Quarta", "Quinta", "Sexta", "S\u00e1bado"];
        var d = new Date(dateStr + "T12:00:00");
        var diaSemana = nomesDiaSemana[d.getDay()];
        return diaSemana + ", " + dia + " de " + MESES[mesIdx] + " de " + ano;
    }

    function formatarDataCurta(dateStr) {
        if (!dateStr) return "";
        var partes = dateStr.split("-");
        return partes[2] + "/" + partes[1] + "/" + partes[0];
    }

    function obterMesAno(dateStr) {
        var partes = dateStr.split("-");
        return partes[0] + "-" + partes[1];
    }

    function obterLabelMesAno(dateStr) {
        var partes = dateStr.split("-");
        var mesIdx = parseInt(partes[1], 10) - 1;
        return MESES[mesIdx] + " " + partes[0];
    }

    function obterTipoInfo(tipo) {
        return TIPOS[tipo] || TIPOS.evento;
    }

    /* ===== SVG Icons para meta ===== */
    var svgRelogio = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
    var svgLocal = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
    var svgCalendario = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';

    /* ===== Carregar Eventos ===== */
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

    /* ===== Encontrar proximo evento ===== */
    function encontrarProximoEvento(eventos) {
        var hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        for (var i = 0; i < eventos.length; i++) {
            var d = new Date(eventos[i].data + "T00:00:00");
            if (d >= hoje) return eventos[i];
        }
        return null;
    }

    /* ===== Renderizar Hero ===== */
    function renderizarHero(eventos) {
        var proximo = encontrarProximoEvento(eventos);
        var cardEl = $("#nextEventCard");
        var totalEl = $("#statTotal");
        var cultosEl = $("#statCultos");
        var proximosEl = $("#statProximos");

        // Stats
        var total = eventos.length;
        var cultos = eventos.filter(function (e) { return e.tipo === "culto"; }).length;
        var proximos = eventos.filter(function (e) { return isProximo(e.data); }).length;
        totalEl.textContent = total;
        cultosEl.textContent = cultos;
        proximosEl.textContent = proximos;

        // Next event card
        if (proximo) {
            cardEl.style.display = "";
            $("#nextEventTitle").textContent = proximo.titulo;
            var info = [];
            if (proximo.horario) info.push(proximo.horario);
            if (proximo.local) info.push(proximo.local);
            info.push(formatarDataCurta(proximo.data));
            $("#nextEventInfo").textContent = info.join(" \u2022 ");

            iniciarContagem(proximo);
        } else {
            cardEl.style.display = "none";
        }
    }

    /* ===== Countdown ===== */
    var contagemInterval = null;

    function iniciarContagem(evento) {
        if (contagemInterval) clearInterval(contagemInterval);

        function atualizar() {
            var agora = new Date();
            var alvo;
            if (evento.horario) {
                alvo = new Date(evento.data + "T" + evento.horario + ":00");
            } else {
                alvo = new Date(evento.data + "T00:00:00");
            }

            var diff = alvo.getTime() - agora.getTime();
            if (diff < 0) diff = 0;

            var dias = Math.floor(diff / (1000 * 60 * 60 * 24));
            var horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            var min = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            $("#countDias").textContent = dias < 10 ? "0" + dias : dias;
            $("#countHoras").textContent = horas < 10 ? "0" + horas : horas;
            $("#countMin").textContent = min < 10 ? "0" + min : min;
        }

        atualizar();
        contagemInterval = setInterval(atualizar, 60000);
    }

    /* ===== Renderizar Timeline ===== */
    function renderizarTimeline(eventos) {
        var container = $("#timeline");
        var emptyState = $("#emptyState");

        if (eventos.length === 0) {
            container.innerHTML = "";
            container.style.display = "none";
            emptyState.style.display = "";
            return;
        }

        container.style.display = "";
        emptyState.style.display = "none";

        var html = "";
        var mesAtual = "";
        var proximo = encontrarProximoEvento(eventos);
        var proximoId = proximo ? proximo.id : null;

        for (var i = 0; i < eventos.length; i++) {
            var ev = eventos[i];
            var mesAno = obterMesAno(ev.data);
            var tipo = ev.tipo || "evento";
            var tipoInfo = obterTipoInfo(tipo);
            var passado = !isProximo(ev.data);
            var ehProximo = ev.id === proximoId;

            // Month separator
            if (mesAno !== mesAtual) {
                mesAtual = mesAno;
                html += '<div class="tl-month">'
                    + '<span class="tl-month__label">'
                    + svgCalendario.replace('viewBox', 'width="14" height="14" viewBox')
                    + ' ' + esc(obterLabelMesAno(ev.data))
                    + '</span>'
                    + '</div>';
            }

            // Node classes
            var nodeClass = "tl-node tl-node--" + tipo;
            if (ehProximo) nodeClass += " tl-node--next";
            if (passado) nodeClass += " tl-node--past";

            // Card classes
            var cardClass = "tl-card tl-card--" + tipo;
            if (passado) cardClass += " tl-card--past";

            // Build card HTML
            html += '<div class="tl-item" data-tipo="' + tipo + '">'
                + '<div class="' + nodeClass + '">' + tipoInfo.icon + '</div>'
                + '<div class="' + cardClass + '">'
                + '<div class="tl-card__header">'
                + '<span class="tl-tipo-badge tl-tipo-badge--' + tipo + '">' + tipoInfo.label + '</span>'
                + '<span class="tl-date-badge">' + formatarDataLonga(ev.data) + '</span>'
                + (ehProximo ? '<span class="tl-next-badge">Em breve</span>' : '')
                + '</div>'
                + '<h3 class="tl-card__title">' + esc(ev.titulo) + '</h3>'
                + (ev.descricao ? '<p class="tl-card__desc">' + esc(ev.descricao) + '</p>' : '')
                + '<div class="tl-card__meta">';

            if (ev.horario) {
                html += '<span class="tl-card__meta-item">' + svgRelogio + ' ' + esc(ev.horario) + '</span>';
            }
            if (ev.local) {
                html += '<span class="tl-card__meta-item">' + svgLocal + ' ' + esc(ev.local) + '</span>';
            }

            html += '</div></div></div>';
        }

        container.innerHTML = html;

        // Animar itens ao entrar na viewport
        observarItens();
    }

    /* ===== Intersection Observer para animacoes ===== */
    function observarItens() {
        var itens = document.querySelectorAll(".tl-item");
        if (!("IntersectionObserver" in window)) {
            // Fallback: mostrar todos imediatamente
            itens.forEach(function (el) { el.classList.add("is-visible"); });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });

        itens.forEach(function (el) {
            observer.observe(el);
        });

        // Meses também
        document.querySelectorAll(".tl-month").forEach(function (el) {
            el.style.opacity = "0";
            el.style.transform = "translateY(10px)";
            el.style.transition = "opacity 0.4s ease, transform 0.4s ease";

            var monthObs = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = "1";
                        entry.target.style.transform = "translateY(0)";
                        monthObs.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.3 });
            monthObs.observe(el);
        });
    }

    /* ===== Filtros ===== */
    function configurarFiltros() {
        var container = $("#filters");
        container.addEventListener("click", function (e) {
            var btn = e.target.closest(".filters__btn");
            if (!btn) return;

            // Atualizar estado ativo
            container.querySelectorAll(".filters__btn").forEach(function (b) {
                b.classList.remove("filters__btn--active");
            });
            btn.classList.add("filters__btn--active");

            filtroAtual = btn.getAttribute("data-filtro");
            aplicarFiltro();
        });
    }

    function aplicarFiltro() {
        var eventosFiltrados;
        if (filtroAtual === "todos") {
            eventosFiltrados = todosEventos;
        } else {
            eventosFiltrados = todosEventos.filter(function (e) {
                return (e.tipo || "evento") === filtroAtual;
            });
        }
        renderizarTimeline(eventosFiltrados);
    }

    /* ===== Init ===== */
    renderizarHero(todosEventos);
    renderizarTimeline(todosEventos);
    configurarFiltros();

})();
