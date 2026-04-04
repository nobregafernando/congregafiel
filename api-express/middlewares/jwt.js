// =============================================================
// CongregaFiel — Middleware: Validação de JWT
// Verifica o token Bearer no header Authorization.
// Usa o JWT secret do Supabase para decodificar o token.
// Rotas públicas devem ser registradas ANTES deste middleware.
// =============================================================

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

/**
 * Middleware que exige um token JWT válido.
 * Em caso de sucesso, anexa `req.usuario` com os dados decodificados.
 */
function verificarJwt(req, res, next) {
  // Se o secret não estiver configurado, pular validação (dev sem Supabase)
  if (!JWT_SECRET) {
    console.warn("[jwt] SUPABASE_JWT_SECRET não configurado — ignorando validação JWT");
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
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });

    req.usuario = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      iat: payload.iat,
      exp: payload.exp,
    };

    next();
  } catch (err) {
    const mensagem = err.name === "TokenExpiredError"
      ? "Token expirado. Faça login novamente."
      : "Token inválido.";

    return res.status(401).json({ erro: mensagem });
  }
}

module.exports = verificarJwt;
