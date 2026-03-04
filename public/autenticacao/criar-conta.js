// criar-conta.js - Servico de cadastro com Supabase via API
(() => {
  "use strict";

  const $ = UIServico.$;
  const $$ = UIServico.$$;

  let currentTab = "igreja";

  function showError(id, msg) {
    const el = $("#" + id);
    const input = el?.previousElementSibling?.querySelector("input")
      || el?.parentElement?.querySelector("input");
    if (el) { el.textContent = msg; el.classList.add("show"); }
    if (input) input.classList.add("input-error");
  }

  function clearErrors() {
    $$(".error-msg").forEach(e => { e.textContent = ""; e.classList.remove("show"); });
    $$("input").forEach(i => i.classList.remove("input-error"));
  }

  function setLoading(formId, ativo) {
    const btn = $(formId + ' button[type="submit"]');
    if (btn) {
      btn.disabled = ativo;
      btn.textContent = ativo ? "Cadastrando..." : "Criar Conta";
    }
  }

  // Tabs
  function switchTab(tab) {
    currentTab = tab;
    $$(".tab-btn").forEach(b => { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
    const activeBtn = $('[data-tab="' + tab + '"]');
    if (activeBtn) { activeBtn.classList.add("active"); activeBtn.setAttribute("aria-selected", "true"); }

    $$(".tab-panel").forEach(p => p.classList.remove("active"));
    const panel = tab === "igreja" ? $("#formIgreja") : $("#formMembro");
    if (panel) panel.classList.add("active");
    clearErrors();
  }

  $$(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Toggle password
  $$(".toggle-password").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = $("#" + btn.dataset.target);
      if (!input) return;
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      btn.setAttribute("aria-label", isPassword ? "Ocultar senha" : "Mostrar senha");
      $(".icon-eye", btn).style.display = isPassword ? "none" : "";
      $(".icon-eye-off", btn).style.display = isPassword ? "" : "none";
    });
  });

  // FORM IGREJA
  $("#formIgreja").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    const nomePastor = $("#nomePastor").value.trim();
    const nomeIgreja = $("#nomeIgreja").value.trim();
    const email = $("#emailIgreja").value.trim();
    const senha = $("#senhaIgreja").value;
    const confirmar = $("#confirmarSenhaIgreja").value;
    let valid = true;

    if (!nomePastor || nomePastor.length < 3) {
      showError("nomePastorError", "Informe o nome (minimo 3 caracteres)");
      valid = false;
    }

    if (!nomeIgreja || nomeIgreja.length < 3) {
      showError("nomeIgrejaError", "Informe o nome da igreja (minimo 3 caracteres)");
      valid = false;
    }

    if (!email || !UIServico.validarEmail(email)) {
      showError("emailIgrejaError", "Informe um e-mail valido");
      valid = false;
    }

    if (!senha || senha.length < 6) {
      showError("senhaIgrejaError", "A senha deve ter pelo menos 6 caracteres");
      valid = false;
    }

    if (senha !== confirmar) {
      showError("confirmarSenhaIgrejaError", "As senhas nao conferem");
      valid = false;
    }

    if (!valid) return;

    setLoading("#formIgreja", true);

    try {
      const resposta = await ApiServico.registrarIgreja({
        nome_pastor: nomePastor,
        nome_igreja: nomeIgreja,
        email: email,
        senha: senha,
      });

      const codigo = resposta.usuario.codigoIgreja;
      UIServico.mostrarToast("Conta criada! Codigo da igreja: " + codigo, "success");

      setTimeout(() => {
        window.location.href = "login.html?tipo=igreja";
      }, 2000);
    } catch (err) {
      if (err.message.includes("cadastrado") || err.message.includes("registered")) {
        showError("emailIgrejaError", "E-mail ja cadastrado");
      } else {
        UIServico.mostrarToast(err.message || "Erro ao criar conta", "error");
      }
      setLoading("#formIgreja", false);
    }
  });

  // FORM MEMBRO
  $("#formMembro").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    const nome = $("#nomeCompleto").value.trim();
    const email = $("#emailMembro").value.trim();
    const codigo = $("#codigoIgreja").value.trim().toUpperCase();
    const senha = $("#senhaMembro").value;
    const confirmar = $("#confirmarSenhaMembro").value;
    let valid = true;

    if (!nome || nome.length < 3) {
      showError("nomeCompletoError", "Informe o nome (minimo 3 caracteres)");
      valid = false;
    }

    if (!email || !UIServico.validarEmail(email)) {
      showError("emailMembroError", "Informe um e-mail valido");
      valid = false;
    }

    if (!codigo) {
      showError("codigoIgrejaError", "Informe o codigo da igreja");
      valid = false;
    }

    if (!senha || senha.length < 6) {
      showError("senhaMembroError", "A senha deve ter pelo menos 6 caracteres");
      valid = false;
    }

    if (senha !== confirmar) {
      showError("confirmarSenhaMembroError", "As senhas nao conferem");
      valid = false;
    }

    if (!valid) return;

    setLoading("#formMembro", true);

    try {
      const resposta = await ApiServico.registrarMembro({
        nome_completo: nome,
        email: email,
        codigo_igreja: codigo,
        senha: senha,
      });

      UIServico.mostrarToast("Conta criada com sucesso!", "success");

      setTimeout(() => {
        window.location.href = "login.html?tipo=membro";
      }, 2000);
    } catch (err) {
      if (err.message.includes("cadastrado") || err.message.includes("registered")) {
        showError("emailMembroError", "E-mail ja cadastrado");
      } else if (err.message.includes("não encontrado") || err.message.includes("not found")) {
        showError("codigoIgrejaError", "Codigo nao encontrado");
      } else {
        UIServico.mostrarToast(err.message || "Erro ao criar conta", "error");
      }
      setLoading("#formMembro", false);
    }
  });

  // Pre-selecionar tab via URL
  const params = new URLSearchParams(window.location.search);
  const tipo = params.get("tipo");
  if (tipo === "membro") {
    switchTab("membro");
  } else if (tipo === "igreja") {
    switchTab("igreja");
  }
})();
