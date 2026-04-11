// =============================================================
// Firebase Admin SDK Configuration — notification-service
// Inicializa Firebase para envio de notificações FCM
// =============================================================

const admin = require("firebase-admin");
require("dotenv").config();

let app = null;

/**
 * Inicializa Firebase Admin SDK
 * @returns {Object} app inicializado
 */
function inicializarFirebaseAdmin() {
  if (app) {
    return app;
  }

  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountKey) {
      console.error(
        "❌ FIREBASE_SERVICE_ACCOUNT_KEY não definido em .env"
      );
      throw new Error("Firebase service account key missing");
    }

    let credential;
    try {
      const parsedKey = JSON.parse(serviceAccountKey);
      credential = admin.credential.cert(parsedKey);
    } catch (parseErr) {
      console.error("❌ Erro ao parsear FIREBASE_SERVICE_ACCOUNT_KEY JSON:", parseErr.message);
      throw new Error("Invalid Firebase credentials JSON");
    }

    app = admin.initializeApp({
      credential: credential,
    });

    console.log("✅ Firebase Admin SDK inicializado");
    return app;
  } catch (err) {
    console.error("❌ Erro ao inicializar Firebase:", err.message);
    process.exit(1);
  }
}

module.exports = { inicializarFirebaseAdmin };
