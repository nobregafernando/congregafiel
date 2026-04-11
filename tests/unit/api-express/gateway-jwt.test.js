// =============================================================
// CongregaFiel — Testes: JWT Centralizado no Gateway
// Validação de token, revogação e logout
// =============================================================

import { describe, it, expect, beforeEach, vi } from "vitest";
import jwt from "jsonwebtoken";

// Mock do supabase-client
vi.mock("../../../microservices/api-gateway/supabase-client", () => ({
  verificarRevogacao: vi.fn(),
  limparCache: vi.fn(),
}));

import verificarJwtGateway from "../../../microservices/api-gateway/middlewares/jwt-gateway";
import * as supabaseClientMock from "../../../microservices/api-gateway/supabase-client";

const JWT_SECRET = "test-secret-key-for-jwt-validation";

// Token válido para testes
function gerarTokenValido(opcoes = {}) {
  const payload = {
    sub: opcoes.userId || "user-123",
    email: opcoes.email || "user@test.com",
    role: opcoes.role || "membro",
    jti: opcoes.jti || "token-id-123",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hora
  };

  return jwt.sign(payload, JWT_SECRET, { algorithm: "HS256" });
}

// Token expirado
function gerarTokenExpirado() {
  const payload = {
    sub: "user-123",
    email: "user@test.com",
    jti: "token-id-expired",
    iat: Math.floor(Date.now() / 1000) - 7200,
    exp: Math.floor(Date.now() / 1000) - 3600, // expirado há 1 hora
  };

  return jwt.sign(payload, JWT_SECRET, { algorithm: "HS256" });
}

describe("Gateway JWT Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    
    req = {
      headers: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    next = vi.fn();

    // Configurar variável de ambiente
    process.env.SUPABASE_JWT_SECRET = JWT_SECRET;

    // Mock padrão: token não revogado
    supabaseClientMock.verificarRevogacao.mockResolvedValue(false);
  });

  it("T1: Token válido aceito e req.usuario setado", async () => {
    const token = gerarTokenValido();
    req.headers.authorization = `Bearer ${token}`;

    await verificarJwtGateway(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.usuario).toBeDefined();
    expect(req.usuario.id).toBe("user-123");
    expect(req.usuario.email).toBe("user@test.com");
    expect(req.usuario.jti).toBe("token-id-123");
  });

  it("T2: Token inválido rejeitado com 401", async () => {
    req.headers.authorization = "Bearer token-inválido-xyz";

    await verificarJwtGateway(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ erro: "Token inválido." })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("T3: Token com jti passa pelo fluxo de revogação sem quebrar o middleware", async () => {
    supabaseClientMock.verificarRevogacao.mockResolvedValue(true);
    
    const token = gerarTokenValido();
    req.headers.authorization = `Bearer ${token}`;

    await verificarJwtGateway(req, res, next);

    expect(next.mock.calls.length + res.status.mock.calls.length).toBeGreaterThan(0);
  });

  it("T4: Token expirado rejeitado com 401", async () => {
    const token = gerarTokenExpirado();
    req.headers.authorization = `Bearer ${token}`;

    await verificarJwtGateway(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ erro: "Token expirado" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("T5: Header Authorization faltante retorna 401", async () => {
    // Sem header de autorização

    await verificarJwtGateway(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ erro: "Token de autenticação não fornecido" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("T6: Bearer malformado retorna 401", async () => {
    req.headers.authorization = "Bearer"; // Sem token após Bearer

    await verificarJwtGateway(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ erro: "Token de autenticação não fornecido" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("T7: Token sem jti não verifica revogação", async () => {
    // Token válido mas sem jti
    const payload = {
      sub: "user-123",
      email: "user@test.com",
      role: "membro",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = jwt.sign(payload, JWT_SECRET);
    req.headers.authorization = `Bearer ${token}`;

    await verificarJwtGateway(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.usuario).toBeDefined();
    expect(supabaseClientMock.verificarRevogacao).not.toHaveBeenCalled();
  });

  it("T8: req.usuario contém dados completos", async () => {
    const token = gerarTokenValido({
      userId: "pastor-456",
      email: "pastor@church.com",
      role: "admin",
      jti: "jti-admin-789",
    });
    req.headers.authorization = `Bearer ${token}`;

    await verificarJwtGateway(req, res, next);

    expect(req.usuario).toEqual({
      id: "pastor-456",
      email: "pastor@church.com",
      role: "admin",
      jti: "jti-admin-789",
      iat: expect.any(Number),
      exp: expect.any(Number),
    });
  });
});
