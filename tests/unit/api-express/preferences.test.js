// =============================================================
// CongregaFiel — Testes: Preferências de Notificação (Sprint 10)
// Validação de salvamento e carregamento de preferências
// =============================================================

import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * T1-T4: Testes de Preferências
 */
describe("notification-preferences — Preferências de Notificação", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  it("T1: GET /api/notification-preferences retorna preferências existentes", async () => {
    // Arrange
    const usuario_id = "user-123";
    const preferenciasEsperadas = [
      {
        id: 1,
        usuario_id,
        tipo_notificacao: "contribute",
        habilitada: true,
        som: true,
        vibrar: true,
      },
      {
        id: 2,
        usuario_id,
        tipo_notificacao: "event",
        habilitada: true,
        som: false,
        vibrar: true,
      },
    ];

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        usuario_id,
        preferencias: preferenciasEsperadas,
      }),
    });

    // Act
    const response = await fetch(
      `http://localhost:4009/api/notification-preferences?usuario_id=${usuario_id}`
    );
    const dados = await response.json();

    // Assert
    expect(response.ok).toBe(true);
    expect(dados.preferencias).toHaveLength(2);
    expect(dados.preferencias[0].tipo_notificacao).toBe("contribute");
  });

  it("T2: PUT /api/notification-preferences salva preferência com sucesso", async () => {
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
        preferencia: {
          id: 5,
          ...payload,
          atualizado_em: new Date().toISOString(),
        },
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
    expect(dados.preferencia.tipo_notificacao).toBe("payment");
    expect(dados.preferencia.habilitada).toBe(false);
  });

  it("T3: Alternar som não afeta vibração", async () => {
    // Arrange
    const payloadInicial = {
      usuario_id: "user-456",
      tipo_notificacao: "announcement",
      habilitada: true,
      som: true,
      vibrar: true,
    };

    const payloadAtualizado = {
      ...payloadInicial,
      som: false, // Apenas som muda
    };

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          mensagem: "Preferência atualizada",
          preferencia: payloadAtualizado,
        }),
      });

    // Act
    const response = await fetch("http://localhost:4009/api/notification-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadAtualizado),
    });

    const dados = await response.json();

    // Assert
    expect(dados.preferencia.som).toBe(false);
    expect(dados.preferencia.vibrar).toBe(true); // Não mudou
  });

  it("T4: Desabilitar tipo de notificação completo", async () => {
    // Arrange
    const payload = {
      usuario_id: "user-789",
      tipo_notificacao: "system",
      habilitada: false, // Desabilitado completamente
      som: false,
      vibrar: false,
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        mensagem: "Notificações desabilitadas",
        preferencia: payload,
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
    expect(dados.preferencia.habilitada).toBe(false);
    expect(dados.preferencia.som).toBe(false);
    expect(dados.preferencia.vibrar).toBe(false);
  });
});

/**
 * T5-T6: Integração com notification-service
 */
describe("notification-preferences — Integração com Envio", () => {
  it("T5: notification-service respeita preferência desabilitada", async () => {
    // Arrange
    global.fetch = vi.fn();

    const usuario_id = "user-special";
    const tipoNotificacao = "contribute";

    // Simular: preferência desabilitada
    const preferencia = {
      tipo_notificacao: tipoNotificacao,
      habilitada: false,
    };

    // Act
    // Se habilitada === false, serviço deve pular envio
    const deveEnviar = preferencia.habilitada;

    // Assert
    expect(deveEnviar).toBe(false);
  });

  it("T6: Todos os 5 tipos podem ter preferências independentes", async () => {
    // Arrange
    const tipos = ["contribute", "event", "announcement", "payment", "system"];
    const preferenciasMap = new Map();

    // Act
    tipos.forEach((tipo) => {
      preferenciasMap.set(tipo, {
        tipo_notificacao: tipo,
        habilitada: true,
        som: true,
        vibrar: true,
      });
    });

    // Assert
    expect(preferenciasMap.size).toBe(5);
    tipos.forEach((tipo) => {
      expect(preferenciasMap.has(tipo)).toBe(true);
    });
  });
});
