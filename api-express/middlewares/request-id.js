// =============================================================
// CongregaFiel — Middleware: Request ID
// Gera um identificador único por requisição para rastreabilidade.
// Propaga o ID via header X-Request-Id na resposta e para o backend.
// =============================================================

const crypto = require("crypto");

function requestId(req, res, next) {
  // Usar o ID do header se já existir (ex: load balancer), senão gerar novo
  const id = req.headers["x-request-id"] || crypto.randomUUID();

  req.requestId = id;
  res.setHeader("X-Request-Id", id);

  next();
}

module.exports = requestId;
