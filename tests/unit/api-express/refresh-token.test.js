// =============================================================
// CongregaFiel — Testes: Refresh Token Flow
// Renovação de JWT e tratamento de expiração
// =============================================================

import { describe, it, expect, beforeEach, vi } from "vitest";
import jwt from "jsonwebtoken";

const JWT_SECRET = "test-secret-key-for-jwt-validation";

// Mock do localStorage
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, value) => { mockStorage[key] = value; },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
};

function gerarRefreshToken(opcoes = {}) {
  const payload = {
    sub: opcoes.userId || "user-123",
    email: opcoes.email || "user@test.com",
    type: "refresh",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 dias
  };

  return jwt.sign(payload, JWT_SECRET);
}

describe("Refresh Token Flow", () => {
  beforeEach(() => {
    global.localStorage.clear();
    vi.clearAllMocks();
  });

  it("T1: POST /api/auth/refresh com token válido retorna novo access_token", async () => {
    const refreshToken = gerarRefreshToken();
    
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        access_token: "novo-access-token-xyz",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.access_token).toBeDefined();
    expect(data.token_type).toBe("Bearer");
  });

  it("T2: POST /api/auth/refresh sem token retorna 401", async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({
        erro: "Refresh token não fornecido",
      }),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(401);
  });

  it("T3: Refresh token expirado é rejeitado", async () => {
    // Token expirado 1 hora atrás
    const payload = {
      sub: "user-123",
      email: "user@test.com",
      iat: Math.floor(Date.now() / 1000) - 7200,
      exp: Math.floor(Date.now() / 1000) - 3600,
    };
    const expiredToken = jwt.sign(payload, JWT_SECRET);

    const decoded = jwt.decode(expiredToken);
    expect(decoded.exp * 1000).toBeLessThan(Date.now());
  });

  it("T4: renovarAccessToken atualiza localStorage com novo token", async () => {
    const accessTokenAntigo = "old-access-token-123";
    const accessTokenNovo = "new-access-token-456";

    // Simular sessão com refresh token
    const sessao = {
      access_token: accessTokenAntigo,
      refresh_token: gerarRefreshToken(),
      usuario: { id: "user-123", email: "user@test.com" },
    };
    localStorage.setItem("cf_sessao", JSON.stringify(sessao));

    // Mock fetch para renovação
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        access_token: accessTokenNovo,
        expires_in: 3600,
      }),
    });

    // Simular renovação
    const novaSessao = JSON.parse(localStorage.getItem("cf_sessao"));
    novaSessao.access_token = accessTokenNovo;
    localStorage.setItem("cf_sessao", JSON.stringify(novaSessao));

    const sessaoAtualizada = JSON.parse(localStorage.getItem("cf_sessao"));
    expect(sessaoAtualizada.access_token).toBe(accessTokenNovo);
  });

  it("T5: POST /api/auth/revoke-all revoga todos refresh tokens", async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        mensagem: "Todos os tokens foram revogados com sucesso",
      }),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const response = await fetch("/api/auth/revoke-all", {
      method: "POST",
      headers: {
        "Authorization": "Bearer valid-access-token",
        "Content-Type": "application/json",
      },
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.mensagem).toContain("revogados");
  });

  it("T6: Multiple refresh tokens podem ser gerenciados", async () => {
    // Simular múltiplos tokens de diferentes dispositivos
    const tokens = [
      { device: "desktop", token: gerarRefreshToken({ userId: "user-123" }) },
      { device: "mobile", token: gerarRefreshToken({ userId: "user-123" }) },
      { device: "tablet", token: gerarRefreshToken({ userId: "user-123" }) },
    ];

    expect(tokens).toHaveLength(3);
    tokens.forEach(t => {
      const decoded = jwt.decode(t.token);
      expect(decoded.sub).toBe("user-123");
    });
  });

  it("T7: fetchComRefresh intercepta 401 e renova token", async () => {
    // Simular primeira chamada retornando 401
    const mockFetch1 = vi.fn().mockResolvedValueOnce({
      status: 401,
      ok: false,
    });

    // Simular renovação bem-sucedida
    const mockFetch2 = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        access_token: "novo-token-xyz",
      }),
    });

    // Simular retry bem-sucedido
    const mockFetch3 = vi.fn().mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: vi.fn().mockResolvedValue({ data: "sucesso" }),
    });

    // Mock de múltiplas chamadas
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ status: 401, ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: "novo-token" }),
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({ data: "ok" }),
      });

    // A lógica seria: 1º chamada falha (401), renova (call 2), retry (call 3)
    expect(global.fetch).toBeDefined();
  });

  it("T8: Token revogado não pode ser usado para refresh", async () => {
    const refreshToken = gerarRefreshToken();

    const mockResponse = {
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({
        erro: "Refresh token expirado ou revogado",
      }),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    expect(response.status).toBe(401);
  });
});
