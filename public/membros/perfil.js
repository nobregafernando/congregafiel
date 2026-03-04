(async function () {
    "use strict";

    var $ = UIServico.$;
    var $$ = UIServico.$$;

    /* ===== Autenticacao ===== */
    var sessao = SessaoServico.exigirAutenticacao("membro", "../index.html");
    if (!sessao) return;

    /* ===== Sidebar / Topbar / Logout ===== */
    UIServico.configurarSidebar({ toggle: "#btnHamburger" });
    UIServico.configurarLogout({ seletor: "#btnSair", url: "../index.html" });

    /* ===== Helpers locais ===== */
    function formatarDataPerfil(dateStr) {
        if (!dateStr) return "N/A";
        var d = new Date(dateStr);
        return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    }

    /* ===== Popular Pagina ===== */
    function popularPagina() {
        UIServico.popularHeader(sessao, {
            nomeIgreja: "#topbarChurch",
            nomeUsuario: "#topbarName",
            avatar: "#topbarAvatar"
        });

        $("#profileAvatar").textContent = UIServico.obterIniciais(sessao.nome);
        $("#profileName").textContent = sessao.nome || "";
        $("#profileEmail").textContent = sessao.email || "";

        $("#infoChurch").textContent = sessao.nomeIgreja || "";
        $("#infoCode").textContent = sessao.codigoIgreja || "";
        $("#infoSince").textContent = formatarDataPerfil(sessao.logadoEm);

        $("#editNome").value = sessao.nome || "";
        $("#editEmail").value = sessao.email || "";
    }
    popularPagina();

    /* ===== Editar Perfil ===== */
    $("#formPerfil").addEventListener("submit", async function (ev) {
        ev.preventDefault();

        var novoNome = $("#editNome").value.trim();
        var novoEmail = $("#editEmail").value.trim();

        if (!novoNome || !novoEmail) {
            UIServico.mostrarToast("Preencha todos os campos.", "error");
            return;
        }

        try {
            await ApiServico.atualizarMembro(sessao.id, { nome: novoNome, email: novoEmail });

            // Atualizar sessao
            sessao.nome = novoNome;
            sessao.email = novoEmail;
            SessaoServico.salvar(sessao);

            popularPagina();
            UIServico.mostrarToast("Perfil atualizado com sucesso!", "success");
        } catch (erro) {
            UIServico.mostrarToast("Erro ao atualizar perfil.", "error");
            console.error(erro);
        }
    });

    /* ===== Alterar Senha ===== */
    $("#formSenha").addEventListener("submit", function (ev) {
        ev.preventDefault();

        var senhaAtual = $("#senhaAtual").value;
        var senhaNova = $("#senhaNova").value;
        var senhaConfirm = $("#senhaConfirm").value;

        if (!senhaAtual || !senhaNova || !senhaConfirm) {
            UIServico.mostrarToast("Preencha todos os campos de senha.", "error");
            return;
        }

        if (senhaNova.length < 6) {
            UIServico.mostrarToast("A nova senha deve ter pelo menos 6 caracteres.", "error");
            return;
        }

        if (senhaNova !== senhaConfirm) {
            UIServico.mostrarToast("As senhas não coincidem.", "error");
            return;
        }

        UIServico.mostrarToast("Alteração de senha: funcionalidade em desenvolvimento.", "info");
        $("#formSenha").reset();
    });

    /* ===== Toggle Visibilidade da Senha ===== */
    $$(".btn-eye").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var targetId = btn.getAttribute("data-target");
            var input = document.getElementById(targetId);
            if (input.type === "password") {
                input.type = "text";
                btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
            } else {
                input.type = "password";
                btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
            }
        });
    });
})();
