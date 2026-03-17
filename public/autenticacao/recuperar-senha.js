// recuperar-senha.js - Servico de recuperacao de senha com Supabase via API
(() => {
  "use strict";

  const $ = UIServico.$;

  $("#recoveryForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailEl = $("#email");
    const errorEl = $("#emailError");
    const email = emailEl.value.trim();

    // Limpar erros
    errorEl.textContent = "";
    errorEl.classList.remove("show");
    emailEl.classList.remove("input-error");

    if (!email || !UIServico.validarEmail(email)) {
      errorEl.textContent = "Informe um e-mail valido";
      errorEl.classList.add("show");
      emailEl.classList.add("input-error");
      return;
    }

    const btn = $('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Enviando...";
    }

    try {
      await ApiServico.recuperarSenha(email);

      // Mostrar estado de sucesso
      $("#sentEmail").textContent = email;
      $("#formState").style.display = "none";
      $("#successState").classList.add("active");
    } catch (err) {
      // Mesmo com erro, mostrar sucesso por seguranca (nao revelar se email existe)
      $("#sentEmail").textContent = email;
      $("#formState").style.display = "none";
      $("#successState").classList.add("active");
    }
  });
})();
