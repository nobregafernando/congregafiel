// login.js - Servico de login com Supabase via API
(() => {
  "use strict";

  const $ = UIServico.$;

  // Toggle senha
  const toggleBtn = $(".toggle-password");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const input = $("#" + toggleBtn.dataset.target);
      if (!input) return;
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      toggleBtn.setAttribute("aria-label", isPassword ? "Ocultar senha" : "Mostrar senha");
      $(".icon-eye", toggleBtn).style.display = isPassword ? "none" : "";
      $(".icon-eye-off", toggleBtn).style.display = isPassword ? "" : "none";
    });
  }

  function showError(id, msg) {
    const el = $("#" + id);
    const input = el?.previousElementSibling?.querySelector("input");
    if (el) { el.textContent = msg; el.classList.add("show"); }
    if (input) input.classList.add("input-error");
  }

  function clearErrors() {
    document.querySelectorAll(".error-msg").forEach(e => { e.textContent = ""; e.classList.remove("show"); });
    document.querySelectorAll("input").forEach(i => i.classList.remove("input-error"));
  }

  function setLoading(ativo) {
    const btn = $('button[type="submit"]');
    if (btn) {
      btn.disabled = ativo;
      btn.textContent = ativo ? "Entrando..." : "Entrar";
    }
  }

  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    const email = $("#email").value.trim();
    const senha = $("#senha").value;
    let valid = true;

    if (!email || !UIServico.validarEmail(email)) {
      showError("emailError", "Informe um e-mail valido");
      valid = false;
    }

    if (!senha) {
      showError("senhaError", "Informe sua senha");
      valid = false;
    }

    if (!valid) return;

    setLoading(true);

    try {
      const resposta = await ApiServico.login(email, senha);

      const sessao = {
        tipo: resposta.usuario.tipo,
        id: resposta.usuario.id,
        nome: resposta.usuario.nome,
        email: resposta.usuario.email,
        igrejaId: resposta.usuario.igrejaId,
        nomeIgreja: resposta.usuario.nomeIgreja,
        codigoIgreja: resposta.usuario.codigoIgreja,
        accessToken: resposta.access_token,
        logadoEm: new Date().toISOString(),
      };

      SessaoServico.salvar(sessao);

      UIServico.mostrarToast("Login realizado com sucesso!", "success");

      setTimeout(() => {
        if (sessao.tipo === "igreja") {
          window.location.href = "../igreja/painel.html";
        } else {
          window.location.href = "../membros/painel.html";
        }
      }, 600);
    } catch (err) {
      UIServico.mostrarToast(err.message || "E-mail ou senha incorretos", "error");
      setLoading(false);
    }
  });
})();
