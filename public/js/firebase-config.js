// =============================================================
// Firebase Cloud Messaging Configuration
// Responsável por inicializar Firebase e gerenciar tokens FCM
// =============================================================

let messaging = null;
let firebaseApp = null;

/**
 * Inicializa Firebase com configurações da CDN
 * @returns {Promise<void>}
 */
async function inicializarFirebase() {
  try {
    // Dynamic import dos módulos Firebase
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
    const { getMessaging } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js");

    const firebaseConfig = {
      apiKey: "AIzaSyDemoKey", // Será substituído por build/deploy
      authDomain: "congregafiel.firebaseapp.com",
      projectId: "congregafiel-demo",
      storageBucket: "congregafiel-demo.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abcdef123456",
    };

    firebaseApp = initializeApp(firebaseConfig);
    messaging = getMessaging(firebaseApp);

    console.log("✅ Firebase inicializado com sucesso");
    return messaging;
  } catch (erro) {
    console.error("❌ Erro ao inicializar Firebase:", erro);
    throw erro;
  }
}

/**
 * Obtém token FCM do navegador
 * Requer permissão de notificação do usuário
 * @returns {Promise<string|null>}
 */
async function obterTokenFCM() {
  try {
    if (!messaging) {
      await inicializarFirebase();
    }

    // Verificar suporte do navegador
    if (!("serviceWorker" in navigator) || !("Notification" in window)) {
      console.warn("⚠️ Navegador não suporta Notification API ou Service Worker");
      return null;
    }

    // Verificar permissão de notificação
    if (Notification.permission === "denied") {
      console.warn("⚠️ Notificações bloqueadas pelo usuário");
      return null;
    }

    // Pedir permissão se necessário
    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.warn("⚠️ Usuário rejeitou permissão de notificações");
        return null;
      }
    }

    // Importar getToken
    const { getToken } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js");

    const token = await getToken(messaging, {
      vapidKey: "BH2MZ3I7-abcdef1234567890ABCDEF1234567890ABCDEF", // Será substituído por build
    });

    if (token) {
      console.log("🔔 FCM Token obtido:", token.substring(0, 20) + "...");
      return token;
    } else {
      console.warn("⚠️ Falha ao gerar token FCM");
      return null;
    }
  } catch (erro) {
    console.error("❌ Erro ao obter FCM token:", erro);
    return null;
  }
}

/**
 * Registra token FCM no backend após login
 * @param {string} token - Token FCM
 * @param {string} accessToken - JWT do usuário
 * @returns {Promise<boolean>}
 */
async function registrarTokenFCMNoBackend(token, accessToken) {
  try {
    if (!token || !accessToken) {
      console.error("❌ Token ou accessToken ausentes");
      return false;
    }

    const response = await fetch("/api/auth/register-fcm-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        fcmToken: token,
        deviceType: "web",
      }),
    });

    if (!response.ok) {
      console.error("❌ Erro ao registrar FCM token:", response.status);
      return false;
    }

    const dados = await response.json();
    console.log("✅ FCM Token registrado no backend");
    return true;
  } catch (erro) {
    console.error("❌ Erro ao registrar FCM no backend:", erro);
    return false;
  }
}

/**
 * Configura listener para mensagens entrantes
 * Executa quando app está em foreground
 * @returns {void}
 */
async function configurarListenerMensagens() {
  try {
    if (!messaging) {
      await inicializarFirebase();
    }

    const { onMessage } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js");

    onMessage(messaging, (payload) => {
      console.log("📬 Mensagem FCM recebida em foreground:", payload);

      // Extrair dados
      const titulo = payload.notification?.title || "Notificação";
      const corpo = payload.notification?.body || "";
      const dados = payload.data || {};

      // Mostrar toast
      mostrarNotificacaoToast(titulo, corpo, dados);

      // Disparar evento customizado para listeners
      window.dispatchEvent(
        new CustomEvent("fcm-mensagem-recebida", {
          detail: { titulo, corpo, dados },
        })
      );
    });

    console.log("✅ Listener de mensagens FCM configurado");
  } catch (erro) {
    console.error("❌ Erro ao configurar listener FCM:", erro);
  }
}

/**
 * Mostra notificação em toast (por 5 segundos)
 * @param {string} titulo
 * @param {string} corpo
 * @param {object} dados
 */
function mostrarNotificacaoToast(titulo, corpo, dados) {
  const toastContainer = document.getElementById("toast") || criarToastContainer();

  const toastDiv = document.createElement("div");
  toastDiv.className = "fcm-toast";
  toastDiv.innerHTML = `
    <div class="fcm-toast__content">
      <strong>${titulo}</strong>
      ${corpo ? `<p>${corpo}</p>` : ""}
    </div>
  `;

  toastContainer.appendChild(toastDiv);

  // Animar entrada
  setTimeout(() => toastDiv.classList.add("is-visible"), 10);

  // Remover após 5 segundos
  setTimeout(() => {
    toastDiv.classList.remove("is-visible");
    setTimeout(() => toastDiv.remove(), 300);
  }, 5000);
}

/**
 * Cria container de toast se não existir
 * @returns {HTMLElement}
 */
function criarToastContainer() {
  const container = document.createElement("div");
  container.id = "toast";
  container.className = "fcm-toast-container";
  document.body.appendChild(container);
  return container;
}

/**
 * Exportar para uso global
 */
if (typeof window !== "undefined") {
  window.FCM = {
    inicializarFirebase,
    obterTokenFCM,
    registrarTokenFCMNoBackend,
    configurarListenerMensagens,
    mostrarNotificacaoToast,
  };
}
