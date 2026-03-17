(async function () {
    "use strict";

    var $ = UIServico.$;
    var esc = UIServico.escaparHtml;
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

    /* ===== Helpers locais ===== */
    function formatarDataLonga(dateStr) {
        if (!dateStr) return "";
        var d = new Date(dateStr);
        return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    }

    /* ===== Carregar Eventos ===== */
    var grid = $("#eventosGrid");
    var emptyState = $("#emptyState");

    try {
        var eventosIgreja = (await ApiServico.obterEventos(sessao.igrejaId))
            .sort(function (a, b) { return (a.data || "").localeCompare(b.data || ""); });

        if (eventosIgreja.length === 0) {
            grid.style.display = "none";
            emptyState.style.display = "";
        } else {
            eventosIgreja.forEach(function (ev) {
                var dp = obterPartesData(ev.data);
                var card = document.createElement("div");
                card.className = "evento-card";
                card.innerHTML =
                    '<div class="evento-card-top">' +
                        '<div class="evento-badge">' +
                            '<span class="day">' + dp.dia + '</span>' +
                            '<span class="month">' + dp.mes + '</span>' +
                        '</div>' +
                        '<div class="evento-card-info">' +
                            '<h3>' + esc(ev.titulo || ev.nome) + '</h3>' +
                            '<div class="evento-meta">' +
                                (ev.horario ? '<span>' +
                                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
                                    esc(ev.horario) +
                                '</span>' : '') +
                                (ev.local ? '<span>' +
                                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
                                    esc(ev.local) +
                                '</span>' : '') +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    (ev.descricao ? '<div class="evento-card-body"><p>' + esc(ev.descricao) + '</p></div>' : '');
                grid.appendChild(card);
            });
        }
    } catch (erro) {
        UIServico.mostrarToast("Erro ao carregar eventos.", "error");
        console.error(erro);
    }
})();
