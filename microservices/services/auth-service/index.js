// =============================================================
// CongregaFiel — Microserviço de Autenticação
// Responsabilidade: registrar igrejas, registrar membros,
// login unificado e recuperação de senha.
// Porta padrão: 4001
// =============================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { supabase, criarClienteAuth } = require("./supabase");

const app = express();
const PORTA = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

// -------------------------------------------------------
// Health-check
// -------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({ servico: "auth-service", status: "ok", timestamp: new Date().toISOString() });
});

// -------------------------------------------------------
// Auxiliar: gerar código único da igreja (ex: CF1234)
// -------------------------------------------------------
function gerarCodigo(nomeIgreja) {
  const letras = nomeIgreja.replace(/[^a-zA-ZÀ-ú]/g, "").substring(0, 2).toUpperCase();
  const prefixo = letras.length >= 2 ? letras : "CF";
  const digitos = String(Math.floor(1000 + Math.random() * 9000));
  return prefixo + digitos;
}

// -------------------------------------------------------
// POST /api/auth/registrar-igreja
// -------------------------------------------------------
app.post("/api/auth/registrar-igreja", async (req, res) => {
  const { nome_pastor, nome_igreja, email, senha, endereco, latitude, longitude } = req.body;

  if (!nome_pastor || !nome_igreja || !email || !senha) {
    return res.status(400).json({ erro: "nome_pastor, nome_igreja, email e senha são obrigatórios" });
  }
  if (senha.length < 6) {
    return res.status(400).json({ erro: "A senha deve ter pelo menos 6 caracteres" });
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
    const codigo = gerarCodigo(nome_igreja);

    // 2. Inserir na tabela igrejas
    const dadosIgreja = { id: userId, nome: nome_igreja, codigo, nome_pastor, email };
    if (endereco)       dadosIgreja.endereco = endereco;
    if (latitude != null)  dadosIgreja.latitude = latitude;
    if (longitude != null) dadosIgreja.longitude = longitude;

    const { data: igreja, error: dbError } = await supabase
      .from("igrejas")
      .insert(dadosIgreja)
      .select()
      .single();

    if (dbError) {
      await supabase.auth.admin.deleteUser(userId); // rollback
      return res.status(400).json({ erro: dbError.message });
    }

    // 3. Inserir pastor como membro
    await supabase.from("membros").insert({
      nome_completo: nome_pastor,
      email,
      tipo: "pastor",
      igreja_id: userId,
      codigo_igreja: codigo,
    });

    return res.status(201).json({
      mensagem: "Igreja cadastrada com sucesso",
      usuario: {
        id: userId,
        tipo: "igreja",
        nome: nome_pastor,
        email,
        igrejaId: userId,
        nomeIgreja: igreja.nome,
        codigoIgreja: codigo,
      },
    });
  } catch (err) {
    return res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// POST /api/auth/registrar-membro
// -------------------------------------------------------
app.post("/api/auth/registrar-membro", async (req, res) => {
  const { nome_completo, email, telefone, codigo_igreja, senha } = req.body;

  if (!nome_completo || !email || !codigo_igreja || !senha) {
    return res.status(400).json({ erro: "nome_completo, email, codigo_igreja e senha são obrigatórios" });
  }
  if (senha.length < 6) {
    return res.status(400).json({ erro: "A senha deve ter pelo menos 6 caracteres" });
  }

  try {
    // 1. Verificar código da igreja
    const { data: igreja, error: igrejaError } = await supabase
      .from("igrejas")
      .select("id, nome, codigo")
      .eq("codigo", codigo_igreja.toUpperCase())
      .single();

    if (igrejaError || !igreja) {
      return res.status(404).json({ erro: "Código da igreja não encontrado" });
    }

    // 2. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { tipo: "membro", nome: nome_completo },
    });

    if (authError) {
      if (authError.message.includes("already been registered")) {
        return res.status(409).json({ erro: "E-mail já cadastrado" });
      }
      return res.status(400).json({ erro: authError.message });
    }

    const userId = authData.user.id;

    // 3. Inserir membro no banco
    const { data: membro, error: dbError } = await supabase
      .from("membros")
      .insert({
        id: userId,
        nome_completo,
        email,
        telefone: telefone || "",
        tipo: "membro",
        igreja_id: igreja.id,
        codigo_igreja: igreja.codigo,
      })
      .select()
      .single();

    if (dbError) {
      await supabase.auth.admin.deleteUser(userId); // rollback
      return res.status(400).json({ erro: dbError.message });
    }

    return res.status(201).json({
      mensagem: "Membro cadastrado com sucesso",
      usuario: {
        id: userId,
        tipo: "membro",
        nome: nome_completo,
        email,
        igrejaId: igreja.id,
        nomeIgreja: igreja.nome,
        codigoIgreja: igreja.codigo,
      },
    });
  } catch (err) {
    return res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// POST /api/auth/login
// -------------------------------------------------------
app.post("/api/auth/login", async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: "E-mail e senha são obrigatórios" });
  }

  try {
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

    if (tipo === "igreja") {
      const { data: igreja } = await supabase.from("igrejas").select("*").eq("id", userId).single();
      if (!igreja) return res.status(404).json({ erro: "Dados da igreja não encontrados" });

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

      if (!membro) return res.status(404).json({ erro: "Dados do membro não encontrados" });

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
    return res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// POST /api/auth/recuperar-senha
// -------------------------------------------------------
app.post("/api/auth/recuperar-senha", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ erro: "E-mail é obrigatório" });

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: (req.headers.origin || "") + "/autenticacao/login.html",
    });
    if (error) return res.status(400).json({ erro: error.message });
    return res.json({ mensagem: "E-mail de recuperação enviado com sucesso" });
  } catch (err) {
    return res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// POST /api/auth/logout
// Revoga o token adicionando-o à blacklist
// -------------------------------------------------------
app.post("/api/auth/logout", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      erro: "Token não fornecido",
      detalhe: "Inclua o header: Authorization: Bearer <token>",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Decodificar o token para extrair o jti (JWT ID) e user ID
    const decoded = jwt.decode(token);
    
    if (!decoded || !decoded.jti) {
      return res.status(401).json({ erro: "Token inválido" });
    }

    // Inserir na tabela token_blacklist do Supabase
    const { error: dbError } = await supabase
      .from("token_blacklist")
      .insert({
        token_jti: decoded.jti,
        usuario_id: decoded.sub,
        revogado_em: new Date().toISOString(),
        motivo: "logout",
      });

    if (dbError && !dbError.message.includes("duplicate")) {
      console.error("[logout] Erro ao inserir na blacklist:", dbError);
      // Não falhar se não conseguir inserir, apenas registrar o erro
    }

    return res.json({ mensagem: "Logout realizado com sucesso" });
  } catch (err) {
    return res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// POST /api/auth/refresh
// Renova o access token usando refresh token
// -------------------------------------------------------
app.post("/api/auth/refresh", async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(401).json({ erro: "Refresh token não fornecido" });
  }

  try {
    // 1. Decodificar refresh token
    const decoded = jwt.decode(refresh_token);
    
    if (!decoded) {
      return res.status(401).json({ erro: "Refresh token inválido" });
    }

    // 2. Verificar se refresh token ainda é válido
    const { data: tokenRecord, error: dbError } = await supabase
      .from("refresh_tokens")
      .select("*")
      .eq("refresh_token", refresh_token)
      .eq("user_id", decoded.sub)
      .maybeSingle();

    if (dbError || !tokenRecord || tokenRecord.revogado_em) {
      return res.status(401).json({ erro: "Refresh token expirado ou revogado" });
    }

    // 3. Verificar expiração
    if (new Date(tokenRecord.expira_em) < new Date()) {
      return res.status(401).json({ erro: "Refresh token expirado" });
    }

    // 4. Gerar novo access token
    const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
    const newAccessToken = jwt.sign(
      {
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        jti: `jti-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hora
      },
      JWT_SECRET,
      { algorithm: "HS256" }
    );

    return res.json({
      access_token: newAccessToken,
      token_type: "Bearer",
      expires_in: 3600,
    });
  } catch (err) {
    return res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// POST /api/auth/revoke-all
// Revoga todos os refresh tokens de um usuário
// -------------------------------------------------------
app.post("/api/auth/revoke-all", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      erro: "Token não fornecido",
      detalhe: "Inclua o header: Authorization: Bearer <token>",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.decode(token);
    
    if (!decoded || !decoded.sub) {
      return res.status(401).json({ erro: "Token inválido" });
    }

    // Revogar todos os refresh tokens deste usuário
    const { error } = await supabase
      .from("refresh_tokens")
      .update({ revogado_em: new Date().toISOString() })
      .eq("user_id", decoded.sub)
      .is("revogado_em", null);

    if (error) {
      console.error("[revoke-all] Erro:", error);
      return res.status(500).json({ erro: "Erro ao revogar tokens" });
    }

    return res.json({ mensagem: "Todos os tokens foram revogados com sucesso" });
  } catch (err) {
    return res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// POST /api/auth/register-fcm-token
// Registra token FCM do dispositivo para notificações push
// -------------------------------------------------------
app.post("/api/auth/register-fcm-token", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      erro: "Token não fornecido",
      detalhe: "Inclua o header: Authorization: Bearer <token>",
    });
  }

  const token = authHeader.split(" ")[1];
  const { fcmToken, deviceType } = req.body;

  if (!fcmToken) {
    return res.status(400).json({ erro: "fcmToken é obrigatório" });
  }

  if (!["web", "ios", "android"].includes(deviceType)) {
    return res.status(400).json({ erro: "deviceType deve ser: web, ios ou android" });
  }

  try {
    // 1. Decodificar token para obter user_id
    const decoded = jwt.decode(token);
    
    if (!decoded || !decoded.sub) {
      return res.status(401).json({ erro: "Token inválido" });
    }

    const userId = decoded.sub;

    // 2. Upsert token FCM na tabela usuario_tokens_fcm
    const { data, error } = await supabase
      .from("usuario_tokens_fcm")
      .upsert(
        {
          usuario_id: userId,
          fcm_token: fcmToken,
          device_type: deviceType,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "fcm_token" } // Conflito na chave única
      )
      .select()
      .single();

    if (error) {
      console.error("[register-fcm-token] BD erro:", error);
      return res.status(500).json({ erro: "Erro ao salvar token FCM" });
    }

    return res.json({
      mensagem: "Token FCM registrado com sucesso",
      token_id: data.id,
    });
  } catch (err) {
    return res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// Rota não encontrada
// -------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ erro: "Rota não encontrada no auth-service" });
});

// -------------------------------------------------------
// Iniciar servidor
// -------------------------------------------------------
app.listen(PORTA, () => {
  console.log(`[auth-service] rodando na porta ${PORTA}`);
});

module.exports = app;
