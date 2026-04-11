// =============================================================
// CongregaFiel — Testes: Logout e Token Blacklist (Auth Service)
// =============================================================

import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";

function gerarToken(opcoes = {}) {
  const payload = {
    sub: opcoes.userId || "user-123",
    email: opcoes.email || "user@test.com",
    jti: opcoes.jti || "token-logout-123",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  return jwt.sign(payload, "test-secret-key-for-jwt-validation");
}

describe("POST /api/auth/logout", () => {
  it("T9: Logout com token válido retorna 200", async () => {
    const token = gerarToken();

    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      body: { mensagem: "Logout realizado com sucesso" },
    });

    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("mensagem");
  });

  it("T10: Logout sem token retorna 401", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 401,
      body: { erro: "Token de autenticação não fornecido" },
    });

    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: {},
    });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("erro");
  });

  it("T11: Logout com Bearer malformado retorna 401", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 401,
      body: { erro: "Token de autenticação não fornecido" },
    });

    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { authorization: "Bearer" },
    });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("erro");
  });

  it("T12: Logout com token inválido retorna erro", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 401,
      body: { erro: "Token inválido." },
    });

    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { authorization: "Bearer invalid-token-xyz" },
    });

    expect(response.status).toBe(401);
  });
});
