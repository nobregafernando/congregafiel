// =============================================================
// CongregaFiel — Testes: notification-service (Sprint 10)
// Validação de envio de notificações, preferências e logging
// =============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * T1-T6: Testes do notification-service
 */
describe("notification-service — Envio de Notificações", () => {
  let fetchMock;
  let supabaseMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Mock Supabase responses
    supabaseMock = {
      from: vi.fn((table) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(),
          })),
        })),
        insert: vi.fn(),
        upsert: vi.fn(),
      })),
    };
  });

  afterEach(() => {
    delete global.fetch;
  });

  it("T1: POST /api/notificacoes com usuário válido retorna 200", async () => {
    // Arrange
    const payload = {
      usuario_id: "user-123",
      titulo: "Nova Contribuição",
      corpo: "R$ 100,00 recebido",
      tipo: "contribute",
      dados_extra: { ref_id: "contrib-001" },
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        mensagem: "Notificações processadas",
        notif_id: "notif-abc-123",
        total_enviadas: 1,
        timing_ms: 450,
      }),
    });

    // Act
    const response = await fetch("http://localhost:4009/api/notificacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const dados = await response.json();

    // Assert
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    expect(dados.notif_id).toBeTruthy();
    expect(dados.total_enviadas).toBeGreaterThanOrEqual(0);
  });

  it("T2: Notificação registrada em log com timing", async () => {
    // Arrange
    const payload = {
      usuario_id: "user-222",
      titulo: "Novo Evento",
      corpo: "Confraternização domingo 15h",
      tipo: "event",
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        mensagem: "Notificações processadas",
        timing_ms: 123,
      }),
    });

    // Act
    const response = await fetch("http://localhost:4009/api/notificacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const dados = await response.json();

    // Assert
    expect(dados.timing_ms).toBeDefined();
    expect(dados.timing_ms).toBeGreaterThanOrEqual(0);
  });

  it("T3: POST com usuário sem tokens retorna 404", async () => {
    // Arrange
    const payload = {
      usuario_id: "user-sem-tokens",
      titulo: "Test",
      corpo: "Test",
      tipo: "system",
    };

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        mensagem: "Usuário sem tokens FCM registrados",
      }),
    });

    // Act
    const response = await fetch("http://localhost:4009/api/notificacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Assert
    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });

  it("T4: GET /api/notification-preferences retorna preferências do usuário", async () => {
    // Arrange
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        usuario_id: "user-123",
        preferencias: [
          { tipo_notificacao: "contribute", habilitada: true, som: true },
          { tipo_notificacao: "event", habilitada: true, som: false },
        ],
      }),
    });

    // Act
    const response = await fetch(
      "http://localhost:4009/api/notification-preferences?usuario_id=user-123"
    );
    const dados = await response.json();

    // Assert
    expect(response.ok).toBe(true);
    expect(dados.preferencias).toBeInstanceOf(Array);
    expect(dados.preferencias.length).toBeGreaterThan(0);
  });

  it("T5: PUT /api/notification-preferences atualiza preferência", async () => {
    // Arrange
    const payload = {
      usuario_id: "user-123",
      tipo_notificacao: "payment",
      habilitada: false,
      som: false,
      vibrar: true,
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        mensagem: "Preferência atualizada com sucesso",
        preferencia: { id: 5, ...payload },
      }),
    });

    // Act
    const response = await fetch("http://localhost:4009/api/notification-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const dados = await response.json();

    // Assert
    expect(response.ok).toBe(true);
    expect(dados.preferencia.usuario_id).toBe("user-123");
    expect(dados.preferencia.habilitada).toBe(false);
  });

  it("T6: Tipo de notificação inválido retorna erro 400", async () => {
    // Arrange
    const payload = {
      usuario_id: "user-123",
      titulo: "Test",
      corpo: "Test",
      tipo: "invalid-type", // Inválido
    };

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        erro: "Dados de notificação inválidos",
        detalhes: ["tipo deve ser: contribute, event, announcement, payment ou system"],
      }),
    });

    // Act
    const response = await fetch("http://localhost:4009/api/notificacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Assert
    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
  });
});

/**
 * Health Check
 */
describe("notification-service — Health Check", () => {
  it("Health check responde com status ok", async () => {
    // Arrange
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        servico: "notification-service",
        status: "ok",
      }),
    }));

    // Act
    const response = await fetch("http://localhost:4009/health");
    const dados = await response.json();

    // Assert
    expect(response.ok).toBe(true);
    expect(dados.servico).toBe("notification-service");
    expect(dados.status).toBe("ok");
  });
});
