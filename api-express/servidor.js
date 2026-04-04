// =============================================================
// CongregaFiel — API Gateway (Express.js)
// Ponto único de entrada para o frontend.
// Proxy reverso para o backend FastAPI.
// Aplica CORS, rate-limit, JWT, circuit breaker e logging.
// =============================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { createProxyMiddleware } = require("http-proxy-middleware");
const rateLimit = require("express-rate-limit");

// Middlewares customizados
const requestId = require("./middlewares/request-id");
const logger = require("./middlewares/logger");
const verificarJwt = require("./middlewares/jwt");
const { circuitBreaker, circuitBreakerMiddleware } = require("./middlewares/circuit-breaker");
=======
const supabase = require("./supabase");
const { criarClienteAuth } = require("./supabase");
const {
  gerarCodigoIgreja,
  validarPayloadRegistroIgreja,
  validarPayloadRegistroMembro,
  validarPayloadLogin,
  validarPayloadRecuperarSenha,
} = require("./utils/regras-auth");
const { montarAtualizacaoPedidoOracao } = require("./utils/pedidos-oracao-utils");


const app = express();
const PORTA = process.env.PORT || 3000;

// Endereços dos Microserviços
const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:4001";

// -------------------- Middlewares Globais --------------------

// Request ID — gerar identificador único por requisição
app.use(requestId);

// Logger — registrar todas as requisições
app.use(logger);

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Rate-limit global: 200 requisições / 15 min por IP
const limiteGlobal = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas requisições. Tente novamente em alguns minutos." },
});
app.use(limiteGlobal);

// Rate-limit restrito para rotas de autenticação
const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas de autenticação. Aguarde 15 minutos." },
});

// -------------------- Health-check --------------------
app.get("/health", async (_req, res) => {
  let fastapiStatus = "desconhecido";
  let authStatus = "desconhecido";
  
  try {
    const respFastapi = await fetch(FASTAPI_URL + "/");
    fastapiStatus = respFastapi.ok ? "ok" : "erro";
  } catch {
    fastapiStatus = "indisponível";
    
// -------------------- Middlewares --------------------
app.use(cors());
app.use(express.json());

// =====================================
// ROTAS — AUTENTICAÇÃO
// =====================================

// POST /api/auth/registrar-igreja — Cadastrar nova igreja + pastor
app.post("/api/auth/registrar-igreja", async (req, res) => {
  const { nome_pastor, nome_igreja, email, senha, endereco, latitude, longitude } = req.body;

  const erroValidacao = validarPayloadRegistroIgreja(req.body);
  if (erroValidacao) {
    return res.status(400).json({ erro: erroValidacao });
  }

  try {
    // 1. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { tipo: "igreja", nome: nome_pastor },
    });

    if (authError) {
      if (authError.message.includes("already been registered")) {
        return res.status(409).json({ erro: "E-mail já cadastrado" });
      }
      return res.status(400).json({ erro: authError.message });
    }

    const userId = authData.user.id;
    const codigo = gerarCodigoIgreja(nome_igreja);

    // 2. Inserir na tabela igrejas com o mesmo ID do auth
    const dadosIgreja = {
      id: userId,
      nome: nome_igreja,
      codigo,
      nome_pastor,
      email,
    };
    if (endereco) dadosIgreja.endereco = endereco;
    if (latitude != null) dadosIgreja.latitude = latitude;
    if (longitude != null) dadosIgreja.longitude = longitude;

    const { data: igreja, error: dbError } = await supabase
      .from("igrejas")
      .insert(dadosIgreja)
      .select()
      .single();

    if (dbError) {
      // Rollback: remover usuário auth se falhou no banco
      await supabase.auth.admin.deleteUser(userId);
      return res.status(400).json({ erro: dbError.message });
    }

    // 3. Também inserir o pastor como membro da igreja
    await supabase.from("membros").insert({
      nome_completo: nome_pastor,
      email,
      tipo: "pastor",
      igreja_id: userId,
      codigo_igreja: codigo,
    });

    res.status(201).json({
      mensagem: "Igreja cadastrada com sucesso",
      usuario: {
        id: userId,
        tipo: "igreja",
        nome: nome_pastor,
        email,
        igrejaId: userId,
        nomeIgreja: nome_igreja,
        codigoIgreja: codigo,
      },
    });
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// POST /api/auth/registrar-membro — Cadastrar novo membro
app.post("/api/auth/registrar-membro", async (req, res) => {
  const { nome_completo, email, telefone, codigo_igreja, senha } = req.body;

  const erroValidacao = validarPayloadRegistroMembro(req.body);
  if (erroValidacao) {
    return res.status(400).json({ erro: erroValidacao });

  }

  try {
    const respAuth = await fetch(AUTH_SERVICE_URL + "/health");
    authStatus = respAuth.ok ? "ok" : "erro";
  } catch {
    authStatus = "indisponível";
  }
  
});

// POST /api/auth/login — Login de igreja ou membro
app.post("/api/auth/login", async (req, res) => {
  const { email, senha } = req.body;

  const erroValidacao = validarPayloadLogin(req.body);
  if (erroValidacao) {
    return res.status(400).json({ erro: erroValidacao });
  }

  try {
    // 1. Autenticar via Supabase Auth (cliente separado para não mudar sessão)
    const authClient = criarClienteAuth();
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (authError) {
      return res.status(401).json({ erro: "E-mail ou senha incorretos" });
    }

    const userId = authData.user.id;
    const tipo = authData.user.user_metadata?.tipo;

    // 2. Buscar dados na tabela correspondente
    if (tipo === "igreja") {
      const { data: igreja } = await supabase
        .from("igrejas")
        .select("*")
        .eq("id", userId)
        .single();

      if (!igreja) {
        return res.status(404).json({ erro: "Dados da igreja não encontrados" });
      }

      return res.json({
        usuario: {
          id: userId,
          tipo: "igreja",
          nome: igreja.nome_pastor,
          email: igreja.email,
          igrejaId: userId,
          nomeIgreja: igreja.nome,
          codigoIgreja: igreja.codigo,
        },
        access_token: authData.session.access_token,
      });
    } else {
      const { data: membro } = await supabase
        .from("membros")
        .select("*, igrejas:igreja_id(nome, codigo)")
        .eq("id", userId)
        .single();

      if (!membro) {
        return res.status(404).json({ erro: "Dados do membro não encontrados" });
      }

      return res.json({
        usuario: {
          id: userId,
          tipo: "membro",
          nome: membro.nome_completo,
          email: membro.email,
          igrejaId: membro.igreja_id,
          nomeIgreja: membro.igrejas?.nome || "",
          codigoIgreja: membro.igrejas?.codigo || membro.codigo_igreja,
        },
        access_token: authData.session.access_token,
      });
    }
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// POST /api/auth/recuperar-senha — Enviar e-mail de recuperação
app.post("/api/auth/recuperar-senha", async (req, res) => {
  const { email } = req.body;

  const erroValidacao = validarPayloadRecuperarSenha(req.body);
  if (erroValidacao) {
    return res.status(400).json({ erro: erroValidacao });
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: req.headers.origin + "/autenticacao/login.html",
    });

    if (error) {
      return res.status(400).json({ erro: error.message });
    }

    res.json({ mensagem: "E-mail de recuperação enviado com sucesso" });
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// =====================================
// ROTAS — IGREJAS
// =====================================

// GET /api/igrejas/publicas — Listar igrejas para o mapa (dados públicos, sem auth)
app.get("/api/igrejas/publicas", async (req, res) => {
  const { data, error } = await supabase
    .from("igrejas")
    .select("id, nome, endereco, codigo, nome_pastor, latitude, longitude")
    .order("nome", { ascending: true });

  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// GET /api/igrejas — Listar todas as igrejas
app.get("/api/igrejas", async (req, res) => {
  const { data, error } = await supabase
    .from("igrejas")
    .select("*")
    .order("criado_em", { ascending: true });

  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// GET /api/igrejas/:id — Buscar igreja por ID
app.get("/api/igrejas/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("igrejas")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ erro: "Igreja não encontrada" });
  res.json(data);
});

// POST /api/igrejas — Criar nova igreja
app.post("/api/igrejas", async (req, res) => {
  const { nome, endereco, descricao, codigo, nome_pastor, email } = req.body;
  if (!nome || !codigo) {
    return res.status(400).json({ erro: "Nome e código são obrigatórios" });
  }

  const { data, error } = await supabase
    .from("igrejas")
    .insert({
      nome,
      endereco: endereco || "",
      descricao: descricao || "",
      codigo,
      nome_pastor: nome_pastor || "",
      email: email || null,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ erro: error.message });
  res.status(201).json(data);
});

// PUT /api/igrejas/:id — Atualizar igreja
app.put("/api/igrejas/:id", async (req, res) => {
  const { nome, endereco, descricao, nome_pastor, email, latitude, longitude } = req.body;
  const atualizacao = {};
  if (nome !== undefined) atualizacao.nome = nome;
  if (endereco !== undefined) atualizacao.endereco = endereco;
  if (descricao !== undefined) atualizacao.descricao = descricao;
  if (nome_pastor !== undefined) atualizacao.nome_pastor = nome_pastor;
  if (email !== undefined) atualizacao.email = email;
  if (latitude !== undefined) atualizacao.latitude = latitude;
  if (longitude !== undefined) atualizacao.longitude = longitude;

  const { data, error } = await supabase
    .from("igrejas")
    .update(atualizacao)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(404).json({ erro: "Igreja não encontrada" });
  res.json(data);
});

// DELETE /api/igrejas/:id — Remover igreja
app.delete("/api/igrejas/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("igrejas")
    .delete()
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(404).json({ erro: "Igreja não encontrada" });
  res.json({ mensagem: "Igreja removida com sucesso", igreja: data });
});

// =====================================
// ROTAS — MEMBROS
// =====================================

// GET /api/membros — Listar membros (filtros opcionais)
app.get("/api/membros", async (req, res) => {
  let query = supabase.from("membros").select("*");

  if (req.query.igreja_id) {
    query = query.eq("igreja_id", req.query.igreja_id);
  }
  if (req.query.tipo) {
    query = query.eq("tipo", req.query.tipo);
  }

  const { data, error } = await query.order("criado_em", { ascending: true });
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// GET /api/membros/:id — Buscar membro por ID
app.get("/api/membros/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("membros")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ erro: "Membro não encontrado" });
  res.json(data);
});

// POST /api/membros — Criar novo membro
app.post("/api/membros", async (req, res) => {
  const { nome_completo, email, telefone, tipo, igreja_id, codigo_igreja } = req.body;
  if (!nome_completo || !email || !igreja_id) {
    return res.status(400).json({ erro: "nome_completo, email e igreja_id são obrigatórios" });
  }

  const { data, error } = await supabase
    .from("membros")
    .insert({
      nome_completo,
      email,
      telefone: telefone || "",
      tipo: tipo || "membro",
      igreja_id,
      codigo_igreja: codigo_igreja || null,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ erro: error.message });
  res.status(201).json(data);
});

// PUT /api/membros/:id — Atualizar membro
app.put("/api/membros/:id", async (req, res) => {
  const { nome_completo, email, telefone, tipo } = req.body;
  const atualizacao = {};
  if (nome_completo !== undefined) atualizacao.nome_completo = nome_completo;
  if (email !== undefined) atualizacao.email = email;
  if (telefone !== undefined) atualizacao.telefone = telefone;
  if (tipo !== undefined) atualizacao.tipo = tipo;

  const { data, error } = await supabase
    .from("membros")
    .update(atualizacao)
    .eq("id", req.params.id)
    .select()
    .single();

  res.json({
    servico: "api-gateway",
    status: "ok",
    versao: "4.0.0",
    backends: {
      core: { url: FASTAPI_URL, status: fastapiStatus },
      auth: { url: AUTH_SERVICE_URL, status: authStatus },
    },
    circuito: circuitBreaker.status(),
    timestamp: new Date().toISOString(),
  });
});

// -------------------- Rota Raiz --------------------
app.get("/", (_req, res) => {
  res.json({
    nome: "CongregaFiel API Gateway",
    versao: "4.0.0",
    descricao: "Gateway unificado para múltiplos microserviços políglotas (Node.js e Python)",
    backends: { FastAPI: FASTAPI_URL, AuthNode: AUTH_SERVICE_URL },
    rotas: {
      health:         "/health",
      autenticacao:   "/api/auth/*       (público)",
      igrejas:        "/api/igrejas/*    (público: /publicas)",
      membros:        "/api/membros/*    (protegido)",
      eventos:        "/api/eventos/*    (protegido)",
      contribuicoes:  "/api/contribuicoes/* (protegido)",
      comunicados:    "/api/comunicados/*   (protegido)",
      pedidos_oracao: "/api/pedidos-oracao/* (protegido)",
    },
  });
});

// -------------------- Proxy para FastAPI --------------------

function criarProxy(opcoes = {}) {
  return createProxyMiddleware({
    target: FASTAPI_URL,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        // Propagar request-id para o backend
        if (req.requestId) {
          proxyReq.setHeader("X-Request-Id", req.requestId);
        }
      },
      proxyRes: () => {
        // Resposta OK do backend → registrar sucesso no circuit breaker
        circuitBreaker.registrarSucesso();
      },
      error: (err, _req, res) => {
        // Falha de conexão → registrar no circuit breaker
        circuitBreaker.registrarFalha();
        console.error(`[Gateway] Erro ao conectar no FastAPI (${FASTAPI_URL}): ${err.message}`);
        if (res && !res.headersSent) {
          res.status(502).json({
            erro: "Backend temporariamente indisponível",
            detalhe: process.env.NODE_ENV === "development" ? err.message : undefined,
          });
        }
      },
    },
    ...opcoes,
  });
}

// ---------- Rotas Públicas (sem JWT) ----------

// Auth — proxy para AUTH_SERVICE_URL (microserviço Node.js)
app.use("/api/auth", limiteAuth, circuitBreakerMiddleware, criarProxy({ target: AUTH_SERVICE_URL }));

// PUT /api/pedidos-oracao/:id — Atualizar status do pedido
app.put("/api/pedidos-oracao/:id", async (req, res) => {
  const atualizacao = montarAtualizacaoPedidoOracao(req.body);


// Igrejas públicas (mapa) — proxy para FASTAPI (sem JWT)
app.get("/api/igrejas/publicas", circuitBreakerMiddleware, criarProxy({ target: FASTAPI_URL }));

// ---------- Rotas Protegidas (com JWT) ----------

// As rotas abaixo usam proxy para FASTAPI (microserviço Python)
app.use("/api/igrejas", verificarJwt, circuitBreakerMiddleware, criarProxy({ target: FASTAPI_URL }));
app.use("/api/membros", verificarJwt, circuitBreakerMiddleware, criarProxy({ target: FASTAPI_URL }));
app.use("/api/eventos", verificarJwt, circuitBreakerMiddleware, criarProxy({ target: FASTAPI_URL }));
app.use("/api/contribuicoes", verificarJwt, circuitBreakerMiddleware, criarProxy({ target: FASTAPI_URL }));
app.use("/api/comunicados", verificarJwt, circuitBreakerMiddleware, criarProxy({ target: FASTAPI_URL }));
app.use("/api/pedidos-oracao", verificarJwt, circuitBreakerMiddleware, criarProxy({ target: FASTAPI_URL }));

// -------------------- Rota não encontrada --------------------
app.use((_req, res) => {
  res.status(404).json({ erro: "Rota não encontrada no gateway" });
});

// -------------------- Tratamento de Erros Global --------------------
app.use((err, _req, res, _next) => {
  console.error("[Gateway] Erro não tratado:", err.message);
  res.status(500).json({
    erro: "Erro interno do gateway",
    detalhe: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// -------------------- Iniciar Servidor --------------------
if (process.env.VERCEL !== "1") {
  app.listen(PORTA, () => {
    console.log(`\n🚀 API Gateway v4.0.0 rodando na porta ${PORTA}`);
    console.log(`📡 Roteamento de Microserviços:`);
    console.log(`   - Auth Service (Node.js) → ${AUTH_SERVICE_URL}`);
    console.log(`   - Core Service (Python)  → ${FASTAPI_URL}`);
    console.log(`🔒 JWT: ${process.env.SUPABASE_JWT_SECRET ? "ativado" : "desativado (SUPABASE_JWT_SECRET não configurado)"}`);
    console.log(`⚡ Circuit Breaker: limite=${circuitBreaker.limite}, timeout=${circuitBreaker.timeout}ms\n`);
  });
}

module.exports = app;
