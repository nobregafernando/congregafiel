// =============================================================
// FCM Service — Serviço de Notificações Push
// Integra Firebase Cloud Messaging com back-end autenticado
// =============================================================

const FCMServico = (() => {
  let tokenAtual = null;
  let accessTokenAtual = null;

  /**
   * Inicializa FCM após login bem-sucedido
   * @param {string} accessToken - JWT do usuário
   * @returns {Promise<string|null>}
   */
  async function inicializar(accessToken) {
    try {
      accessTokenAtual = accessToken;

      // Aguardar Firebase estar pronto
      if (!window.FCM) {
        console.error("❌ firebase-config.js não carregado");
        return null;
      }

      // Inicializar Firebase
      await window.FCM.inicializarFirebase();

      // Obter token FCM
      tokenAtual = await window.FCM.obterTokenFCM();
      if (!tokenAtual) {
        console.warn("⚠️ Falha ao obter token FCM (navegador pode não permitir)");
        return null;
      }

      // Registrar token no backend
      const registrado = await window.FCM.registrarTokenFCMNoBackend(tokenAtual, accessToken);
      if (!registrado) {
        console.warn("⚠️ Token gerado localmente mas falha ao registrar no backend");
        return null;
      }

      // Configurar listener para mensagens em foreground
      await window.FCM.configurarListenerMensagens();

      console.log("✅ FCM Service inicializado com sucesso");
      return tokenAtual;
    } catch (erro) {
      console.error("❌ Erro ao inicializar FCM Service:", erro);
      return null;
    }
  }

  /**
   * Limpa dados FCM no logout
   * @returns {void}
   */
  function finalizarNoLogout() {
    tokenAtual = null;
    accessTokenAtual = null;
    console.log("✅ FCM Service finalizado");
  }

  /**
   * Retorna token FCM atual
   * @returns {string|null}
   */
  function obterToken() {
    return tokenAtual;
  }

  /**
   * Registra listener para notificações em tempo real
   * @param {function} callback
   * @returns {void}
   */
  function onNotificacaoRecebida(callback) {
    if (typeof callback !== "function") {
      console.error("❌ Callback deve ser uma função");
      return;
    }

    window.addEventListener("fcm-mensagem-recebida", (evento) => {
      callback(evento.detail);
    });
  }

  return {
    inicializar,
    finalizarNoLogout,
    obterToken,
    onNotificacaoRecebida,
  };
})();

// Exportar para uso
if (typeof window !== "undefined") {
  window.FCMServico = FCMServico;
}
