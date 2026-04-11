// =============================================================
// CongregaFiel — Testes: Logout e Token Blacklist (Auth Service)
// =============================================================

import { describe, it, expect, beforeEach, vi } from "vitest";
import jwt from "jsonwebtoken";

const JWT_SECRET = "test-secret-key-for-jwt-validation";

// Mock do módulo express para simular servidor
vi.mock("express", () => {
  const express = vi.fn();
  express.json = vi.fn(() => (req, res, next) => next());
  return { default: express };
});

import app from "../../../microservices/services/auth-service/index";

function gerarToken(opcoes = {}) {
  const payload = {
    sub: opcoes.userId || "user-123",
    email: opcoes.email || "user@test.com",
    jti: opcoes.jti || "token-logout-123",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  return jwt.sign(payload, JWT_SECRET);
}

describe("POST /api/auth/logout", () => {
  it("T9: Logout com token válido retorna 200", async () => {
    const token = gerarToken();
    
    // Simular request POST com token
    const response = await app.post("/api/auth/logout", {
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("mensagem");
  });

  it("T10: Logout sem token retorna 401", async () => {
    const response = await app.post("/api/auth/logout", {
      headers: {},
    });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("erro");
  });

  it("T11: Logout com Bearer malformado retorna 401", async () => {
    const response = await app.post("/api/auth/logout", {
      headers: { authorization: "Bearer" },
    });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("erro");
  });

  it("T12: Logout com token inválido retorna erro", async () => {
    const response = await app.post("/api/auth/logout", {
      headers: { authorization: "Bearer invalid-token-xyz" },
    });

    expect(response.status).toBe(401);
  });
});
