// criar-conta.js - Cadastro com mapa de igrejas + geolocalização
(() => {
  "use strict";

  const $ = UIServico.$;
  const $$ = UIServico.$$;

  let currentTab = "igreja";
  let mapaLeaflet = null;
  let marcadores = [];
  let igrejasCarregadas = [];
  let igrejaSelecionadaCodigo = "";
  let minhaLocalizacao = null;
  let marcadorUsuario = null;

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

  function escaparHtml(texto) {
    if (!texto) return "";
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
  }

  // =============================================
  // TABS
  // =============================================
  function switchTab(tab) {
    currentTab = tab;
    $$(".tab-btn").forEach(b => { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
    const activeBtn = $('[data-tab="' + tab + '"]');
    if (activeBtn) { activeBtn.classList.add("active"); activeBtn.setAttribute("aria-selected", "true"); }

    $$(".tab-panel").forEach(p => p.classList.remove("active"));
    const panel = tab === "igreja" ? $("#formIgreja") : $("#formMembro");
    if (panel) panel.classList.add("active");
    clearErrors();

    // Expandir/contrair card
    const card = $(".auth-card");
    if (card) {
      if (tab === "membro") {
        card.classList.add("card--wide");
        setTimeout(() => inicializarMapa(), 150);
      } else {
        card.classList.remove("card--wide");
      }
    }
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

  // =============================================
  // GEOLOCALIZAÇÃO
  // =============================================
  function mostrarModalLocalizacao() {
    if (!navigator.geolocation) return;

    const modal = $("#modalLocalizacao");
    const btnPermitir = $("#btnPermitirLocal");
    const btnNegar = $("#btnNegarLocal");
    if (!modal) return;

    modal.classList.add("show");

    btnPermitir.addEventListener("click", () => {
      modal.classList.remove("show");
      executarGeolocalizacao();
    }, { once: true });

    btnNegar.addEventListener("click", () => {
      modal.classList.remove("show");
    }, { once: true });
  }

  function executarGeolocalizacao() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        minhaLocalizacao = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        // Adicionar marcador "Você está aqui"
        if (mapaLeaflet) {
          if (marcadorUsuario) mapaLeaflet.removeLayer(marcadorUsuario);

          const iconeUser = L.divIcon({
            className: "marcador-usuario",
            html: '<div style="background:#2563EB;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px rgba(37,99,235,0.3),0 2px 6px rgba(0,0,0,0.3)"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });

          marcadorUsuario = L.marker([minhaLocalizacao.lat, minhaLocalizacao.lng], { icon: iconeUser, zIndexOffset: 1000 })
            .addTo(mapaLeaflet)
            .bindPopup('<div style="text-align:center;font-weight:600;font-size:0.85rem">Você está aqui</div>');
        }

        // Reordenar lista por distância e selecionar mais próxima
        if (igrejasCarregadas.length > 0) {
          reordenarPorDistancia();
        }
      },
      () => {
        // Navegador negou ou erro - mapa funciona normalmente
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function calcularDistancia(lat1, lon1, lat2, lon2) {
    // Haversine formula (retorna km)
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatarDistancia(km) {
    if (km < 1) return Math.round(km * 1000) + " m";
    if (km < 10) return km.toFixed(1) + " km";
    return Math.round(km) + " km";
  }

  function reordenarPorDistancia() {
    if (!minhaLocalizacao) return;

    // Calcular distância para cada igreja
    igrejasCarregadas.forEach(igreja => {
      if (igreja.latitude && igreja.longitude) {
        igreja._distancia = calcularDistancia(
          minhaLocalizacao.lat, minhaLocalizacao.lng,
          igreja.latitude, igreja.longitude
        );
      } else {
        igreja._distancia = Infinity;
      }
    });

    // Ordenar
    igrejasCarregadas.sort((a, b) => a._distancia - b._distancia);

    // Re-renderizar lista
    renderizarLista(igrejasCarregadas);

    // Se não tem igreja selecionada, selecionar a mais próxima automaticamente
    if (!igrejaSelecionadaCodigo) {
      const maisProxima = igrejasCarregadas.find(i => i._distancia < Infinity);
      if (maisProxima) {
        selecionarIgreja(maisProxima);
      }
    }

    // Ajustar mapa para mostrar usuário + igrejas próximas
    if (mapaLeaflet) {
      const bounds = [[minhaLocalizacao.lat, minhaLocalizacao.lng]];
      igrejasCarregadas.forEach(i => {
        if (i.latitude && i.longitude) bounds.push([i.latitude, i.longitude]);
      });
      if (bounds.length > 1) {
        mapaLeaflet.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
      } else {
        mapaLeaflet.setView([minhaLocalizacao.lat, minhaLocalizacao.lng], 13);
      }
    }
  }

  // =============================================
  // MAPA DE IGREJAS
  // =============================================
  function inicializarMapa() {
    if (mapaLeaflet) {
      mapaLeaflet.invalidateSize();
      return;
    }

    const container = $("#mapaIgrejas");
    if (!container) return;

    mapaLeaflet = L.map("mapaIgrejas", {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([-20.47, -54.62], 12); // Campo Grande/MS como padrão

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 18,
    }).addTo(mapaLeaflet);

    carregarIgrejas();
  }

  async function carregarIgrejas() {
    const lista = $("#listaIgrejas");

    try {
      igrejasCarregadas = await ApiServico.obterIgrejasPublicas();

      if (!igrejasCarregadas || igrejasCarregadas.length === 0) {
        if (lista) lista.innerHTML = '<p class="lista-igrejas__loading">Nenhuma igreja cadastrada</p>';
        return;
      }

      const bounds = [];

      igrejasCarregadas.forEach(igreja => {
        // Adicionar marcador no mapa
        if (igreja.latitude && igreja.longitude && mapaLeaflet) {
          const icone = L.divIcon({
            className: "marcador-igreja",
            html: '<div style="background:linear-gradient(135deg,#C4837A,#A86B63);width:28px;height:28px;border-radius:50%;display:grid;place-items:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 21V9l-6-4-6 4v12"/><path d="M2 21h20"/><path d="M9 21v-6h6v6"/></svg></div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -14],
          });

          const marcador = L.marker([igreja.latitude, igreja.longitude], { icon: icone })
            .addTo(mapaLeaflet);

          const popupHtml =
            '<div class="mapa-popup">' +
              '<div class="mapa-popup__nome">' + escaparHtml(igreja.nome) + '</div>' +
              '<div class="mapa-popup__endereco">' + escaparHtml(igreja.endereco || "") + '</div>' +
              '<button class="mapa-popup__btn" onclick="window.__selecionarIgrejaPorCodigo(\'' + igreja.codigo + '\')">Selecionar</button>' +
            '</div>';

          marcador.bindPopup(popupHtml);
          marcador.igrejaData = igreja;
          marcadores.push(marcador);
          bounds.push([igreja.latitude, igreja.longitude]);
        }
      });

      // Renderizar lista
      renderizarLista(igrejasCarregadas);

      // Ajustar zoom
      if (bounds.length > 0 && mapaLeaflet) {
        mapaLeaflet.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
      }

      // Mostrar modal pedindo localização
      mostrarModalLocalizacao();

      // Se já tem código na URL, selecionar automaticamente
      const params = new URLSearchParams(window.location.search);
      const codigoUrl = params.get("igreja");
      if (codigoUrl) {
        const igreja = igrejasCarregadas.find(i => i.codigo.toUpperCase() === codigoUrl.toUpperCase());
        if (igreja) selecionarIgreja(igreja);
      }
    } catch (err) {
      console.error("Erro ao carregar igrejas:", err);
      if (lista) lista.innerHTML = '<p class="lista-igrejas__loading">Erro ao carregar igrejas</p>';
    }
  }

  function renderizarLista(igrejas) {
    const lista = $("#listaIgrejas");
    if (!lista) return;

    lista.innerHTML = "";

    if (igrejas.length === 0) {
      lista.innerHTML = '<p class="lista-igrejas__vazia">Nenhuma igreja encontrada</p>';
      return;
    }

    igrejas.forEach(igreja => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "lista-igrejas__item";
      if (igreja.codigo === igrejaSelecionadaCodigo) {
        item.className += " lista-igrejas__item--active";
      }
      item.dataset.codigo = igreja.codigo;

      let distHtml = "";
      if (igreja._distancia != null && igreja._distancia < Infinity) {
        distHtml = '<span class="lista-igrejas__item-distancia">' + formatarDistancia(igreja._distancia) + '</span>';
      }

      item.innerHTML =
        '<div class="lista-igrejas__item-icon">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 21V9l-6-4-6 4v12"/><path d="M2 21h20"/><path d="M9 21v-6h6v6"/></svg>' +
        '</div>' +
        '<div class="lista-igrejas__item-info">' +
          '<span class="lista-igrejas__item-nome">' + escaparHtml(igreja.nome) + '</span>' +
          '<span class="lista-igrejas__item-endereco">' + escaparHtml(igreja.endereco || "Sem endereço") + '</span>' +
          distHtml +
        '</div>';
      item.addEventListener("click", () => selecionarIgreja(igreja));
      lista.appendChild(item);
    });
  }

  // =============================================
  // PESQUISA DE IGREJAS
  // =============================================
  const buscaInput = $("#buscaIgreja");
  if (buscaInput) {
    buscaInput.addEventListener("input", () => {
      const termo = buscaInput.value.trim().toLowerCase();

      if (!termo) {
        renderizarLista(igrejasCarregadas);
        return;
      }

      const filtradas = igrejasCarregadas.filter(igreja => {
        const nome = (igreja.nome || "").toLowerCase();
        const endereco = (igreja.endereco || "").toLowerCase();
        const codigo = (igreja.codigo || "").toLowerCase();
        return nome.includes(termo) || endereco.includes(termo) || codigo.includes(termo);
      });

      renderizarLista(filtradas);
    });
  }

  // =============================================
  // SELEÇÃO DE IGREJA
  // =============================================
  function selecionarIgreja(igreja) {
    igrejaSelecionadaCodigo = igreja.codigo;

    // Preencher campo de código
    const inputCodigo = $("#codigoIgreja");
    if (inputCodigo) inputCodigo.value = igreja.codigo;

    // Mostrar badge
    const badge = $("#igrejaSelecionada");
    const nomeSpan = $("#igrejaSelecionadaNome");
    if (badge && nomeSpan) {
      nomeSpan.textContent = igreja.nome + " (" + igreja.codigo + ")";
      badge.style.display = "flex";
    }

    // Destacar item na lista
    $$(".lista-igrejas__item").forEach(item => {
      item.classList.toggle("lista-igrejas__item--active", item.dataset.codigo === igreja.codigo);
    });

    // Centralizar no mapa
    if (mapaLeaflet && igreja.latitude && igreja.longitude) {
      mapaLeaflet.setView([igreja.latitude, igreja.longitude], 15);
      marcadores.forEach(m => {
        if (m.igrejaData && m.igrejaData.codigo === igreja.codigo) {
          m.openPopup();
        }
      });
    }

    clearErrors();
  }

  window.__selecionarIgrejaPorCodigo = function(codigo) {
    const igreja = igrejasCarregadas.find(i => i.codigo === codigo);
    if (igreja) selecionarIgreja(igreja);
  };

  // Botão limpar seleção
  const btnLimpar = $("#btnLimparIgreja");
  if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
      igrejaSelecionadaCodigo = "";
      const inputCodigo = $("#codigoIgreja");
      if (inputCodigo) inputCodigo.value = "";
      const badge = $("#igrejaSelecionada");
      if (badge) badge.style.display = "none";
      $$(".lista-igrejas__item").forEach(item => item.classList.remove("lista-igrejas__item--active"));
      marcadores.forEach(m => m.closePopup());
    });
  }

  // =============================================
  // FORM IGREJA
  // =============================================
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

  // =============================================
  // FORM MEMBRO
  // =============================================
  $("#formMembro").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    const nome = $("#nomeCompleto").value.trim();
    const email = $("#emailMembro").value.trim();
    const codigo = (igrejaSelecionadaCodigo || $("#codigoIgreja").value.trim()).toUpperCase();
    const senha = $("#senhaMembro").value;
    const confirmar = $("#confirmarSenhaMembro").value;
    let valid = true;

    if (!codigo) {
      showError("codigoIgrejaError", "Selecione uma igreja no mapa ou informe o codigo");
      valid = false;
    }

    if (!nome || nome.length < 3) {
      showError("nomeCompletoError", "Informe o nome (minimo 3 caracteres)");
      valid = false;
    }

    if (!email || !UIServico.validarEmail(email)) {
      showError("emailMembroError", "Informe um e-mail valido");
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
      await ApiServico.registrarMembro({
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

  // =============================================
  // URL PARAMS
  // =============================================
  const params = new URLSearchParams(window.location.search);
  const tipo = params.get("tipo");
  const igrejaParam = params.get("igreja");

  if (tipo === "membro" || igrejaParam) {
    switchTab("membro");
  } else if (tipo === "igreja") {
    switchTab("igreja");
  }
})();
