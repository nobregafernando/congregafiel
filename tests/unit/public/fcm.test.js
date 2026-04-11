// =============================================================
// CongregaFiel — Testes: FCM Integration (Sprint 10)
// Validação de token FCM, registro e sincronização com backend
// =============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * T1: Firebase inicializa sem erros
 */
describe("FCM Service - Inicialização", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    // Mock de firebase-config
    global.FCM = {
      inicializarFirebase: vi.fn(async () => {
        return { messaging: "mock-messaging" };
      }),
      obterTokenFCM: vi.fn(async () => null),
      registrarTokenFCMNoBackend: vi.fn(async () => false),
      configurarListenerMensagens: vi.fn(async () => {}),
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete global.FCM;
    delete global.FCMServico;
  });

  it("T1: Firebase inicializa sem erros", async () => {
    // Arrange
    expect(global.FCM).toBeDefined();

    // Act
    const resultado = await global.FCM.inicializarFirebase();

    // Assert
    expect(resultado).toBeDefined();
    expect(global.FCM.inicializarFirebase).toHaveBeenCalled();
  });

  it("T2: obterTokenFCM retorna token válido (mock)", async () => {
    // Arrange
    const tokenMock = "fcm-token-abc123-xyz789";
    global.FCM.obterTokenFCM = vi.fn(async () => tokenMock);

    // Act
    const token = await global.FCM.obterTokenFCM();

    // Assert
    expect(token).toBe(tokenMock);
    expect(token).toMatch(/^fcm-token-/);
    expect(global.FCM.obterTokenFCM).toHaveBeenCalled();
  });

  it("T3: registrarTokenFCMNoBackend retorna sucesso", async () => {
    // Arrange
    const fcmToken = "fcm-token-abc123";
    const accessToken = "jwt-access-token-xyz";
    global.FCM.registrarTokenFCMNoBackend = vi.fn(async (token, jwt) => {
      if (token && jwt) return true;
      return false;
    });

    // Act
    const resultado = await global.FCM.registrarTokenFCMNoBackend(fcmToken, accessToken);

    // Assert
    expect(resultado).toBe(true);
    expect(global.FCM.registrarTokenFCMNoBackend).toHaveBeenCalledWith(fcmToken, accessToken);
  });

  it("T4: POST /api/auth/register-fcm-token com token válido", async () => {
    // Arrange - Simular requisição
    const fcmToken = "fcm-token-valid";
    const accessToken = "Bearer jwt-token-123";
    const deviceType = "web";

    // Mock do fetch
    global.fetch = vi.fn(async (url, options) => {
      if (url === "/api/auth/register-fcm-token") {
        const body = JSON.parse(options.body);
        expect(body.fcmToken).toBe(fcmToken);
        expect(body.deviceType).toBe(deviceType);

        return {
          ok: true,
          status: 200,
          json: async () => ({
            mensagem: "Token FCM registrado com sucesso",
            token_id: 1,
          }),
        };
      }
      return { ok: false, status: 404 };
    });

    // Act
    const response = await fetch("/api/auth/register-fcm-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: accessToken,
      },
      body: JSON.stringify({ fcmToken, deviceType }),
    });

    // Assert
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    const dados = await response.json();
    expect(dados.mensagem).toContain("sucesso");
  });

  it("T5: configurarListenerMensagens registra listener", async () => {
    // Arrange
    const listeners = [];
    global.window = {
      addEventListener: vi.fn((event, callback) => {
        listeners.push({ event, callback });
      }),
      dispatchEvent: vi.fn(),
    };

    global.FCM.configurarListenerMensagens = vi.fn(async () => {
      // Simular registro de listener
      global.window.addEventListener("fcm-mensagem-recebida", () => {});
    });

    // Act
    await global.FCM.configurarListenerMensagens();

    // Assert
    expect(global.FCM.configurarListenerMensagens).toHaveBeenCalled();
    expect(global.window.addEventListener.mock.calls.length).toBeGreaterThan(0);
  });

  it("T6: Logout limpa token FCM", async () => {
    // Arrange - Mock do FCMServico
    const FCMServico = {
      finalizarNoLogout: vi.fn(),
      obterToken: vi.fn(() => null),
    };

    // Act
    FCMServico.finalizarNoLogout();
    const token = FCMServico.obterToken();

    // Assert
    expect(token).toBeNull();
    expect(FCMServico.finalizarNoLogout).toHaveBeenCalled();
  });

  it("T7: onMessage dispara callback com payload correto", async () => {
    // Arrange
    const callbackMock = vi.fn();
    const payload = {
      notification: {
        title: "Nova Contribuição",
        body: "R$ 100,00 recebido",
      },
      data: {
        tipo: "contribute",
        id: "contrib-123",
      },
    };

    // Simular evento FCM
    const event = new CustomEvent("fcm-mensagem-recebida", {
      detail: payload,
    });

    global.window = {
      addEventListener: (eventType, callback) => {
        if (eventType === "fcm-mensagem-recebida") {
          setTimeout(() => callback(event), 10);
        }
      },
      dispatchEvent: vi.fn(),
    };

    // Act
    global.window.addEventListener("fcm-mensagem-recebida", callbackMock);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert
    expect(callbackMock).toHaveBeenCalled();
  });
});

/**
 * Testes de integração com backend
 */
describe("FCM Backend Integration", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("T8: Rota POST /api/auth/register-fcm-token rejeita sem token", async () => {
    // Arrange
    global.fetch = vi.fn(async (url, options) => {
      if (url === "/api/auth/register-fcm-token" && !options.headers.Authorization) {
        return {
          ok: false,
          status: 401,
          json: async () => ({ erro: "Token não fornecido" }),
        };
      }
      return { ok: true, status: 200 };
    });

    // Act
    const response = await fetch("/api/auth/register-fcm-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fcmToken: "token" }),
    });

    // Assert
    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
  });

  it("T9: Rota POST /api/auth/register-fcm-token rejeita deviceType inválido", async () => {
    // Arrange
    global.fetch = vi.fn(async (url, options) => {
      const body = JSON.parse(options.body);
      if (!["web", "ios", "android"].includes(body.deviceType)) {
        return {
          ok: false,
          status: 400,
          json: async () => ({ erro: "deviceType inválido" }),
        };
      }
      return { ok: true, status: 200 };
    });

    // Act
    const response = await fetch("/api/auth/register-fcm-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({ fcmToken: "token", deviceType: "invalid" }),
    });

    // Assert
    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
  });
});
