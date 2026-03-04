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

    try {
        // Eventos
        var agora = new Date().toISOString();
        var todosEventos = await ApiServico.obterEventos(igrejaId);
        var eventosIgreja = todosEventos
            .filter(function (e) { return e.data >= agora.slice(0, 10); })
            .sort(function (a, b) { return a.data.localeCompare(b.data); });

        $("#statEventos").textContent = eventosIgreja.length;

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
