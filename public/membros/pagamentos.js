(async function () {
    "use strict";

    var $ = UIServico.$;
    var esc = UIServico.escaparHtml;
    var formatarData = UIServico.formatarData;
    var formatarMoeda = UIServico.formatarMoeda;

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

    /* ===== Carregar Pagamentos ===== */
    var tableWrapper = $("#tableWrapper");
    var tableBody = $("#tableBody");
    var paymentCards = $("#paymentCards");
    var emptyState = $("#emptyState");

    try {
        var todasContribuicoes = await ApiServico.obterContribuicoes(sessao.igrejaId);
        var meusPagamentos = todasContribuicoes
            .filter(function (p) { return p.membro === sessao.nome; })
            .sort(function (a, b) { return (b.data || b.criadoEm || "").localeCompare(a.data || a.criadoEm || ""); });

        var total = meusPagamentos.reduce(function (s, p) { return s + Number(p.valor || 0); }, 0);
        $("#totalValue").textContent = formatarMoeda(total);
        $("#totalCount").textContent = meusPagamentos.length;

        if (meusPagamentos.length === 0) {
            emptyState.style.display = "";
        } else {
            tableWrapper.style.display = "";
            paymentCards.style.display = "";

            meusPagamentos.forEach(function (p) {
                // Linha da tabela
                var tr = document.createElement("tr");
                tr.innerHTML =
                    '<td>' + formatarData(p.data || p.criadoEm) + '</td>' +
                    '<td><span class="type-badge">' + esc(p.tipo || "Geral") + '</span></td>' +
                    '<td>' + esc(p.descricao || "-") + '</td>' +
                    '<td class="text-right value-cell">' + formatarMoeda(p.valor) + '</td>';
                tableBody.appendChild(tr);

                // Card mobile
                var card = document.createElement("div");
                card.className = "payment-card";
                card.innerHTML =
                    '<div class="payment-card-top">' +
                        '<span class="payment-card-type">' + esc(p.tipo || "Geral") + '</span>' +
                        '<span class="payment-card-value">' + formatarMoeda(p.valor) + '</span>' +
                    '</div>' +
                    (p.descricao ? '<p class="payment-card-desc">' + esc(p.descricao) + '</p>' : '') +
                    '<span class="payment-card-date">' + formatarData(p.data || p.criadoEm) + '</span>';
                paymentCards.appendChild(card);
            });
        }
    } catch (erro) {
        UIServico.mostrarToast("Erro ao carregar pagamentos.", "error");
        console.error(erro);
    }
})();
