// Servico de UI - funcoes utilitarias de interface
const UIServico = (() => {
  "use strict";

  const $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  const $$ = function (sel, scope) { return Array.from((scope || document).querySelectorAll(sel)); };

  const MESES_CURTOS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

  // ---------- TOAST ----------
  let toastTimer = null;

  function mostrarToast(mensagem, tipo) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = mensagem;
    el.className = "toast show" + (tipo ? " toast--" + tipo : "");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.className = "toast";
    }, 3000);
  }

  // ---------- ESCAPE HTML ----------
  function escaparHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  // ---------- INICIAIS ----------
  function obterIniciais(nome) {
    if (!nome) return "?";
    const partes = nome.trim().split(" ");
    if (partes.length === 1) return partes[0][0].toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  // ---------- FORMATACAO ----------
  function formatarData(dateStr, opcoes) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const opts = opcoes || { day: "2-digit", month: "2-digit", year: "numeric" };
    return d.toLocaleDateString("pt-BR", opts);
  }

  function formatarDataHora(isoStr) {
    const d = new Date(isoStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }) + " " + d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function formatarDataAtual() {
    const agora = new Date();
    let formatado = agora.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    return formatado.charAt(0).toUpperCase() + formatado.slice(1);
  }

  function obterPartesData(dateStr) {
    const d = new Date(dateStr);
    return { dia: d.getDate(), mes: MESES_CURTOS[d.getMonth()] };
  }

  // ---------- SIDEBAR ----------
  function configurarSidebar(opcoes) {
    const ops = opcoes || {};
    const sidebarEl = $(ops.sidebar || "#sidebar");
    const overlayEl = $(ops.overlay || "#sidebarOverlay");
    const toggleEl = $(ops.toggle || "#sidebarToggle, #menuToggle, #btnHamburger");
    const closeEl = $(ops.close || "#sidebarClose");

    if (!sidebarEl) return;

    const classeAberta = ops.classeAberta || "is-open";
    const classeOverlay = ops.classeOverlay || "is-visible";

    function abrir() {
      sidebarEl.classList.add(classeAberta);
      if (overlayEl) overlayEl.classList.add(classeOverlay);
      document.body.style.overflow = "hidden";
    }

    function fechar() {
      sidebarEl.classList.remove(classeAberta);
      if (overlayEl) overlayEl.classList.remove(classeOverlay);
      document.body.style.overflow = "";
    }

    if (toggleEl) {
      toggleEl.addEventListener("click", function () {
        sidebarEl.classList.contains(classeAberta) ? fechar() : abrir();
      });
    }

    if (closeEl) closeEl.addEventListener("click", fechar);
    if (overlayEl) overlayEl.addEventListener("click", fechar);

    window.addEventListener("resize", function () {
      if (window.innerWidth > 820) fechar();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sidebarEl.classList.contains(classeAberta)) {
        fechar();
      }
    });

    return { abrir: abrir, fechar: fechar };
  }

  // ---------- LOGOUT ----------
  function configurarLogout(opcoes) {
    const ops = opcoes || {};
    const seletor = ops.seletor || "#btnLogout, #btnSair";
    const url = ops.url || "../autenticacao/login.html";

    const btn = $(seletor);
    if (!btn) return;

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      SessaoServico.encerrar(url);
    });
  }

  // ---------- POPULAR HEADER ----------
  function popularHeader(sessao, mapeamento) {
    const mapa = mapeamento || {};

    const elNomeIgreja = $(mapa.nomeIgreja || "#churchName, #topbarChurchName, #topbarChurch");
    const elNomeUsuario = $(mapa.nomeUsuario || "#userName, #topbarUserName, #topbarName");
    const elAvatar = $(mapa.avatar || "#userAvatar, #topbarAvatarInitial, #topbarAvatar");

    if (elNomeIgreja) elNomeIgreja.textContent = sessao.nomeIgreja || "Igreja";
    if (elNomeUsuario) elNomeUsuario.textContent = sessao.nome || "";
    if (elAvatar) elAvatar.textContent = obterIniciais(sessao.nome);
  }

  // ---------- VALIDACAO ----------
  function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  return {
    $: $,
    $$: $$,
    MESES_CURTOS: MESES_CURTOS,
    mostrarToast: mostrarToast,
    escaparHtml: escaparHtml,
    obterIniciais: obterIniciais,
    formatarData: formatarData,
    formatarDataHora: formatarDataHora,
    formatarMoeda: formatarMoeda,
    formatarDataAtual: formatarDataAtual,
    obterPartesData: obterPartesData,
    configurarSidebar: configurarSidebar,
    configurarLogout: configurarLogout,
    popularHeader: popularHeader,
    validarEmail: validarEmail
  };
})();
