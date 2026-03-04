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
    function formatarDataPedido(dateStr) {
        if (!dateStr) return "";
        var d = new Date(dateStr);
        return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    }

    /* ===== Toggle do Formulario ===== */
    var formCard = $("#formCard");
    var btnNovo = $("#btnNovoPedido");
    var btnCancel = $("#btnCancelar");
    var formPedido = $("#formPedido");
    var textPedido = $("#textPedido");

    btnNovo.addEventListener("click", function () {
        formCard.style.display = "";
        textPedido.focus();
        btnNovo.style.display = "none";
    });

    btnCancel.addEventListener("click", function () {
        formCard.style.display = "none";
        formPedido.reset();
        btnNovo.style.display = "";
    });

    /* ===== Envio ===== */
    formPedido.addEventListener("submit", async function (ev) {
        ev.preventDefault();
        var texto = textPedido.value.trim();
        if (!texto) return;

        try {
            await ApiServico.criarPedidoOracao({
                igrejaId: sessao.igrejaId,
                membroId: sessao.id,
                membroNome: sessao.nome,
                pedido: texto
            });

            formPedido.reset();
            formCard.style.display = "none";
            btnNovo.style.display = "";

            UIServico.mostrarToast("Pedido de oração enviado com sucesso!", "success");
            await renderPedidos();
        } catch (erro) {
            UIServico.mostrarToast("Erro ao enviar pedido de oração.", "error");
            console.error(erro);
        }
    });

    /* ===== Renderizar ===== */
    async function renderPedidos() {
        try {
            var todos = await ApiServico.obterPedidosOracao(sessao.igrejaId);
            var meus = todos
                .filter(function (p) { return p.membroId === sessao.id; })
                .sort(function (a, b) { return (b.criadoEm || "").localeCompare(a.criadoEm || ""); });

            var lista = $("#pedidosList");
            var emptyState = $("#emptyState");

            lista.innerHTML = "";

            if (meus.length === 0) {
                lista.style.display = "none";
                emptyState.style.display = "";
                return;
            }

            lista.style.display = "";
            emptyState.style.display = "none";

            meus.forEach(function (p) {
                var statusClass = ({
                    "pendente": "status-badge--pendente",
                    "atendido": "status-badge--atendido",
                    "respondido": "status-badge--respondido"
                })[p.status] || "status-badge--pendente";

                var statusLabel = ({
                    "pendente": "Pendente",
                    "atendido": "Atendido",
                    "respondido": "Respondido"
                })[p.status] || "Pendente";

                var card = document.createElement("div");
                card.className = "pedido-card";
                card.innerHTML =
                    '<div class="pedido-card-body">' + esc(p.pedido) + '</div>' +
                    '<div class="pedido-card-footer">' +
                        '<span class="pedido-date">' +
                            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
                            formatarDataPedido(p.criadoEm) +
                        '</span>' +
                        '<span class="status-badge ' + statusClass + '">' + statusLabel + '</span>' +
                    '</div>';
                lista.appendChild(card);
            });
        } catch (erro) {
            UIServico.mostrarToast("Erro ao carregar pedidos de oração.", "error");
            console.error(erro);
        }
    }

    await renderPedidos();
})();
