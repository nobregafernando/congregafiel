// /index.js
(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const header = $(".header");
  const menuToggle = $("#menuToggle");
  const mobileMenu = $("#mobileMenu");

  const accessModal = $("#accessModal");
  const closeModalBtn = $("#closeModal");
  const toastEl = $("#toast");

  const triggerOpenModalIds = [
    "btnEntrar",
    "btnComecar",
    "btnEntrarMobile",
    "btnComecarMobile",
    "btnHeroPastor",
    "btnHeroFiel",
    "btnCadastrarIgreja"
  ];

  let lastFocusedElement = null;
  let toastTimer = null;

  // ---------- HEADER SCROLL ----------
  function handleHeaderScroll() {
    if (!header) return;
    const isScrolled = window.scrollY > 8;
    header.classList.toggle("is-scrolled", isScrolled);
  }

  // ---------- MOBILE MENU ----------
  function closeMobileMenu() {
    if (!mobileMenu || !menuToggle) return;
    mobileMenu.hidden = true;
    menuToggle.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
  }

  function openMobileMenu() {
    if (!mobileMenu || !menuToggle) return;
    mobileMenu.hidden = false;
    menuToggle.classList.add("is-open");
    menuToggle.setAttribute("aria-expanded", "true");
  }

  function toggleMobileMenu() {
    if (!mobileMenu) return;
    const isHidden = mobileMenu.hidden;
    if (isHidden) openMobileMenu();
    else closeMobileMenu();
  }

  // ---------- TOAST ----------
  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("show");

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("show");
    }, 2600);
  }

  // ---------- MODAL ----------
  function openAccessModal(context = "") {
    if (!accessModal) return;

    lastFocusedElement = document.activeElement;
    accessModal.classList.add("is-open");
    accessModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    const title = $("#modalTitle");
    const subtitle = $(".modal__subtitle", accessModal);

    if (title && subtitle) {
      title.textContent = "Escolha seu acesso";
      if (context === "pastor") {
        subtitle.textContent = "Você escolheu fluxo de Pastor. Em seguida iremos para login/cadastro de igreja.";
      } else if (context === "fiel") {
        subtitle.textContent = "Você escolheu fluxo de Fiel. Em seguida iremos para login/acesso da comunidade.";
      } else {
        subtitle.textContent = "Esta é a página inicial. Depois vamos conectar com telas de login/cadastro reais.";
      }
    }

    const firstOption = $('[data-role-select="pastor"]', accessModal);
    if (firstOption) firstOption.focus();
  }

  function closeAccessModal() {
    if (!accessModal) return;

    accessModal.classList.remove("is-open");
    accessModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  function handleRoleSelected(role) {
    if (!role) return;

    closeAccessModal();

    if (role === "pastor") {
      window.location.href = "autenticacao/criar-conta.html?tipo=igreja";
    } else if (role === "fiel") {
      window.location.href = "autenticacao/criar-conta.html?tipo=membro";
    }
  }

  // ---------- SMOOTH LINKS (mobile close on click) ----------
  function setupNavLinks() {
    $$(".nav a, .footer__links a").forEach((link) => {
      link.addEventListener("click", () => {
        closeMobileMenu();
      });
    });
  }

  // ---------- CTA ACTIONS ----------
  function setupCtas() {
    triggerOpenModalIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      el.addEventListener("click", () => {
        if (id === "btnEntrar" || id === "btnEntrarMobile") {
          window.location.href = "autenticacao/login.html";
        } else if (id === "btnHeroPastor") {
          openAccessModal("pastor");
        } else if (id === "btnHeroFiel") {
          openAccessModal("fiel");
        } else if (id === "btnCadastrarIgreja") {
          window.location.href = "autenticacao/criar-conta.html?tipo=igreja";
        } else {
          openAccessModal();
        }
      });
    });

    $$(".role-action").forEach((btn) => {
      btn.addEventListener("click", () => {
        const role = btn.dataset.role || "";
        openAccessModal(role);
      });
    });

    const btnFalarEquipe = $("#btnFalarEquipe");
    if (btnFalarEquipe) {
      btnFalarEquipe.addEventListener("click", () => {
        showToast("Contato da equipe: depois podemos ligar a um formulário/WhatsApp.");
      });
    }
  }

  // ---------- MODAL EVENTS ----------
  function setupModalEvents() {
    if (!accessModal) return;

    closeModalBtn?.addEventListener("click", closeAccessModal);

    accessModal.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.matches("[data-close-modal]")) {
        closeAccessModal();
        return;
      }

      const roleBtn = target.closest("[data-role-select]");
      if (roleBtn) {
        const role = roleBtn.getAttribute("data-role-select");
        handleRoleSelected(role);
      }
    });

    document.addEventListener("keydown", (event) => {
      // Fecha menu mobile com ESC
      if (event.key === "Escape" && mobileMenu && !mobileMenu.hidden) {
        closeMobileMenu();
      }

      // Fecha modal com ESC
      if (event.key === "Escape" && accessModal.classList.contains("is-open")) {
        closeAccessModal();
      }
    });
  }

  // ---------- INTERSECTION ANIMATION (leve) ----------
  function setupRevealOnScroll() {
    const revealItems = [
      ...$$(".feature-card"),
      ...$$(".step-card"),
      ...$$(".role-card"),
      ...$$(".mini-card"),
      $(".panel-card"),
    ].filter(Boolean);

    // se navegador não suportar, ignora sem quebrar
    if (!("IntersectionObserver" in window) || revealItems.length === 0) return;

    revealItems.forEach((item) => {
      item.style.opacity = "0";
      item.style.transform = "translateY(10px)";
      item.style.transition = "opacity .35s ease, transform .35s ease";
    });

    const io = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          observer.unobserve(el);
        });
      },
      { threshold: 0.12 }
    );

    revealItems.forEach((item) => io.observe(item));
  }

  // ---------- INIT ----------
  function init() {
    handleHeaderScroll();
    window.addEventListener("scroll", handleHeaderScroll, { passive: true });

    if (menuToggle) {
      menuToggle.addEventListener("click", toggleMobileMenu);
    }

    setupNavLinks();
    setupCtas();
    setupModalEvents();
    setupRevealOnScroll();

    // Fecha menu mobile se mudar para desktop
    window.addEventListener("resize", () => {
      if (window.innerWidth > 820) {
        closeMobileMenu();
      }
    });

    // Mensagem inicial leve
    setTimeout(() => {
      showToast("Bem-vindo ao Congrega Fiel");
    }, 450);
  }

  document.addEventListener("DOMContentLoaded", init);
})();