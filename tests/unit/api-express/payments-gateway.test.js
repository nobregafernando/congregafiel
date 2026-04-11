import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

function lerServidorGateway() {
  return fs.readFileSync(
    path.resolve(process.cwd(), "api-express", "servidor.js"),
    "utf8"
  );
}

describe("API Express — integração Sprint 11", () => {
  it("expõe proxy autenticado para /api/pagamentos e /api/relatorios/pagamentos", () => {
    const codigo = lerServidorGateway();

    expect(codigo).toContain('const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || "http://localhost:4008";');
    expect(codigo).toContain('app.use("/api/pagamentos", verificarJwt, circuitBreakerMiddleware, criarProxy(PAYMENT_SERVICE_URL));');
    expect(codigo).toContain('app.use("/api/relatorios/pagamentos", verificarJwt, circuitBreakerMiddleware, criarProxy(PAYMENT_SERVICE_URL));');
  });

  it("propaga contexto autenticado para o payment-service", () => {
    const codigo = lerServidorGateway();

    expect(codigo).toContain('proxyReq.setHeader("x-usuario-id", req.usuario.id || "");');
    expect(codigo).toContain('proxyReq.setHeader("x-usuario-email", req.usuario.email || "");');
    expect(codigo).toContain('proxyReq.setHeader("x-usuario-role", req.usuario.role || "");');
  });

  it("declara payment-service no health check e no resumo de rotas", () => {
    const codigo = lerServidorGateway();

    expect(codigo).toContain('consultarStatus(PAYMENT_SERVICE_URL, "/health")');
    expect(codigo).toContain('payments: { url: PAYMENT_SERVICE_URL, status: paymentStatus },');
    expect(codigo).toContain('payments: PAYMENT_SERVICE_URL,');
    expect(codigo).toContain('pagamentos: "/api/pagamentos/*",');
    expect(codigo).toContain('relatorios_pagamentos: "/api/relatorios/pagamentos",');
  });
});
