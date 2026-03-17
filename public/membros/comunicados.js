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

    /* ===== Helpers locais ===== */
    function formatarDataComunicado(dateStr) {
        if (!dateStr) return "";
        var d = new Date(dateStr);
        return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    }

    /* ===== Carregar Comunicados ===== */
    var lista = $("#comunicadosList");
    var emptyState = $("#emptyState");

    try {
        var comunicadosIgreja = (await ApiServico.obterComunicados(sessao.igrejaId))
            .sort(function (a, b) { return (b.criadoEm || b.data || "").localeCompare(a.criadoEm || a.data || ""); });

        if (comunicadosIgreja.length === 0) {
            lista.style.display = "none";
            emptyState.style.display = "";
        } else {
            comunicadosIgreja.forEach(function (c) {
                var isUrgente = c.prioridade === "urgente";
                var card = document.createElement("div");
                card.className = "comunicado-card" + (isUrgente ? " urgente" : "");

                var prioClass = isUrgente ? "priority-badge--urgente" : "priority-badge--normal";
                var prioLabel = isUrgente ? "Urgente" : "Normal";
                var prioIcon = isUrgente
                    ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
                    : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

                card.innerHTML =
                    '<div class="comunicado-card-header">' +
                        '<h3>' + esc(c.titulo) + '</h3>' +
                        '<span class="priority-badge ' + prioClass + '">' + prioIcon + ' ' + prioLabel + '</span>' +
                    '</div>' +
                    '<div class="comunicado-card-body">' + esc(c.conteudo || c.mensagem || "") + '</div>' +
                    '<div class="comunicado-card-footer">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
                        formatarDataComunicado(c.criadoEm || c.data) +
                    '</div>';
                lista.appendChild(card);
            });
        }
    } catch (erro) {
        UIServico.mostrarToast("Erro ao carregar comunicados.", "error");
        console.error(erro);
    }
})();
