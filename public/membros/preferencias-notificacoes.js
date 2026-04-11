// =============================================================
// Preferências de Notificações — Client-side
// Carrega, salva e sincroniza preferências do usuário
// =============================================================

class PreferenciasNotificacoes {
  constructor() {
    this.usuario = null;
    this.preferencias = new Map();
    this.tipos = ["contribute", "event", "announcement", "payment", "system"];
    this.opções = ["habilitada", "som", "vibrar"];
  }

  /**
   * Inicializa a página
   */
  async inicializar() {
    try {
      // 1. Verificar autenticação
      this.usuario = await this.obterUsuarioAutenticado();
      if (!this.usuario) {
        window.location.href = "/autenticacao/login.html";
        return;
      }

      // 2. Carregar preferências
      await this.carregarPreferencias();

      // 3. Renderizar UI
      this.renderizarUI();

      // 4. Adicionar listeners
      this.adicionarListeners();

      // Mostrar conteúdo principal
      document.getElementById("mainContent").style.display = "block";
      document.getElementById("loading").style.display = "none";
    } catch (erro) {
      console.error("❌ Erro ao inicializar:", erro);
      this.mostrarErro(erro.message);
    }
  }

  /**
   * Obtém usuário autenticado (de localStorage/sessionStorage)
   */
  async obterUsuarioAutenticado() {
    const sessionData = sessionStorage.getItem("usuario");
    if (!sessionData) {
      return null;
    }
    return JSON.parse(sessionData);
  }

  /**
   * Carrega preferências do backend
   */
  async carregarPreferencias() {
    try {
      const accessToken = sessionStorage.getItem("access_token");
      if (!accessToken) {
        throw new Error("Token não encontrado");
      }

      const response = await fetch(
        `/api/notification-preferences?usuario_id=${this.usuario.id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar preferências");
      }

      const dados = await response.json();
      
      // Armazenar preferências
      dados.preferencias.forEach((pref) => {
        this.preferencias.set(pref.tipo_notificacao, pref);
      });

      // Adicionar tipos faltantes com valores default
      this.tipos.forEach((tipo) => {
        if (!this.preferencias.has(tipo)) {
          this.preferencias.set(tipo, {
            tipo_notificacao: tipo,
            habilitada: true,
            som: true,
            vibrar: true,
          });
        }
      });
    } catch (erro) {
      console.warn("⚠️ Erro ao carregar preferências:", erro.message);
      // Usar defaults se falhar
      this.tipos.forEach((tipo) => {
        this.preferencias.set(tipo, {
          tipo_notificacao: tipo,
          habilitada: true,
          som: true,
          vibrar: true,
        });
      });
    }
  }

  /**
   * Renderiza UI com preferências carregadas
   */
  renderizarUI() {
    this.tipos.forEach((tipo) => {
      const pref = this.preferencias.get(tipo);

      // Atualizar toggle
      const toggle = document.getElementById(`toggle-${tipo}`);
      if (toggle) {
        toggle.checked = pref.habilitada;
        this.atualizarSubOpcoes(tipo, pref.habilitada);
      }

      // Atualizar checkboxes de som e vibrar
      const somCheckbox = document.getElementById(`som-${tipo}`);
      const vibrCheckbox = document.getElementById(`vibrar-${tipo}`);

      if (somCheckbox) somCheckbox.checked = pref.som;
      if (vibrCheckbox) vibrCheckbox.checked = pref.vibrar;
    });
  }

  /**
   * Atualiza estado das sub-opções (som, vibrar)
   */
  atualizarSubOpcoes(tipo, habilitada) {
    const somCheckbox = document.getElementById(`som-${tipo}`);
    const vibrCheckbox = document.getElementById(`vibrar-${tipo}`);

    if (somCheckbox) somCheckbox.disabled = !habilitada;
    if (vibrCheckbox) vibrCheckbox.disabled = !habilitada;
  }

  /**
   * Adiciona listeners aos elementos
   */
  adicionarListeners() {
    // Toggles principais
    this.tipos.forEach((tipo) => {
      const toggle = document.getElementById(`toggle-${tipo}`);
      if (toggle) {
        toggle.addEventListener("change", () => {
          this.atualizarSubOpcões(tipo, toggle.checked);
        });
      }
    });

    // Botões de ação
    document.getElementById("btnSalvar").addEventListener("click", () =>
      this.salvarPreferencias()
    );
    document.getElementById("btnResetear").addEventListener("click", () =>
      this.resetarPadroes()
    );
  }

  /**
   * Salva preferências no backend
   */
  async salvarPreferencias() {
    try {
      const btnSalvar = document.getElementById("btnSalvar");
      btnSalvar.disabled = true;

      const accessToken = sessionStorage.getItem("access_token");

      // Salvar cada preferência
      const tarefas = this.tipos.map((tipo) => {
        const habilitada = document.getElementById(`toggle-${tipo}`).checked;
        const som = document.getElementById(`som-${tipo}`).checked;
        const vibrar = document.getElementById(`vibrar-${tipo}`).checked;

        return fetch("/api/notification-preferences", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            usuario_id: this.usuario.id,
            tipo_notificacao: tipo,
            habilitada,
            som,
            vibrar,
          }),
        });
      });

      const resultados = await Promise.all(tarefas);
      const todosOk = resultados.every((r) => r.ok);

      if (!todosOk) {
        throw new Error("Falha ao salvar algumas preferências");
      }

      this.mostrarMensagem("✅ Preferências salvas com sucesso!", "success");
      btnSalvar.disabled = false;
    } catch (erro) {
      console.error("❌ Erro ao salvar:", erro.message);
      this.mostrarMensagem(
        `❌ Erro ao salvar: ${erro.message}`,
        "error"
      );
      document.getElementById("btnSalvar").disabled = false;
    }
  }

  /**
   * Reseta para padrões (todos habilitados)
   */
  resetarPadroes() {
    if (!confirm("Deseja restaurar todos para o padrão (habilitado)?")) {
      return;
    }

    this.tipos.forEach((tipo) => {
      document.getElementById(`toggle-${tipo}`).checked = true;
      document.getElementById(`som-${tipo}`).checked = true;
      document.getElementById(`vibrar-${tipo}`).checked = true;
      this.atualizarSubOpcoes(tipo, true);
    });

    this.mostrarMensagem("↻ Padrões restaurados", "success");
  }

  /**
   * Mostra mensagem de toast
   */
  mostrarMensagem(texto, tipo = "success") {
    const toast = document.getElementById("toast-message");
    toast.textContent = texto;
    toast.className = `toast ${tipo === "error" ? "error" : ""}`;
    toast.style.display = "block";

    setTimeout(() => {
      toast.style.display = "none";
    }, 3000);
  }

  /**
   * Mostra estado de erro
   */
  mostrarErro(mensagem) {
    document.getElementById("loading").style.display = "none";
    document.getElementById("mainContent").style.display = "none";

    const errorState = document.getElementById("errorState");
    document.getElementById("errorMessage").textContent = mensagem;
    errorState.style.display = "block";
  }
}

// Inicializar quando página carregar
document.addEventListener("DOMContentLoaded", () => {
  const prefs = new PreferenciasNotificacoes();
  prefs.inicializar();
});
