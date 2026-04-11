// =============================================================
// CongregaFiel — Middleware: Validação de JWT do Gateway
// Valida JWT centralmente, consulta blacklist e anexa req.usuario
// =============================================================

const jwt = require("jsonwebtoken");
const supabaseClient = require("../supabase-client");

/**
 * Middleware que valida JWT centralmente no Gateway.
 * Consulta blacklist antes de aceitar o token.
 * Em caso de sucesso, anexa `req.usuario` com os dados decodificados.
 */
async function verificarJwtGateway(req, res, next) {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;

  // Se o secret não estiver configurado, pular validação (dev sem Supabase)
  if (!jwtSecret) {
    console.warn("[jwt-gateway] SUPABASE_JWT_SECRET não configurado — ignorando validação JWT");
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      erro: "Token de autenticação não fornecido",
      detalhe: "Inclua o header: Authorization: Bearer <token>",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    // 1. Validar assinatura do JWT
    const payload = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256"],
    });

    // 2. Verificar se token foi revogado (está na blacklist)
    if (payload.jti) {
      const revogado = await supabaseClient.verificarRevogacao(payload.jti);
      if (revogado) {
        return res.status(401).json({ erro: "Token revogado" });
      }
    }

    // 3. Anexar dados do usuário ao request
    req.usuario = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      iat: payload.iat,
      exp: payload.exp,
      jti: payload.jti,
    };

    next();
  } catch (err) {
    const mensagem = err.name === "TokenExpiredError"
      ? "Token expirado"
      : "Token inválido.";

    return res.status(401).json({ erro: mensagem });
  }
}

module.exports = verificarJwtGateway;
