// =============================================================
// CongregaFiel — API REST com Express.js + Supabase
// Servidor principal com todas as rotas RESTful
// =============================================================

const express = require("express");
const cors = require("cors");
const supabase = require("./supabase");
const { criarClienteAuth } = require("./supabase");

const app = express();
const PORTA = process.env.PORT || 3000;

// -------------------- Middlewares --------------------
app.use(cors());
app.use(express.json());

// =====================================
// ROTAS — AUTENTICAÇÃO
// =====================================

function gerarCodigo(nomeIgreja) {
  const letras = nomeIgreja.replace(/[^a-zA-ZÀ-ú]/g, "").substring(0, 2).toUpperCase();
  const prefixo = letras.length >= 2 ? letras : "CF";
  const digitos = String(Math.floor(1000 + Math.random() * 9000));
  return prefixo + digitos;
}

// POST /api/auth/registrar-igreja — Cadastrar nova igreja + pastor
app.post("/api/auth/registrar-igreja", async (req, res) => {
  const { nome_pastor, nome_igreja, email, senha, endereco, latitude, longitude } = req.body;

  if (!nome_pastor || !nome_igreja || !email || !senha) {
    return res.status(400).json({ erro: "Todos os campos são obrigatórios" });
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

  if (!nome_completo || !email || !codigo_igreja || !senha) {
    return res.status(400).json({ erro: "Todos os campos são obrigatórios" });
  }
  if (senha.length < 6) {
    return res.status(400).json({ erro: "A senha deve ter pelo menos 6 caracteres" });
  }

  try {
    // 1. Verificar se o código da igreja existe
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

    // 3. Inserir na tabela membros
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
      await supabase.auth.admin.deleteUser(userId);
      return res.status(400).json({ erro: dbError.message });
    }

    res.status(201).json({
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
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// POST /api/auth/login — Login de igreja ou membro
app.post("/api/auth/login", async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: "E-mail e senha são obrigatórios" });
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

  if (!email) {
    return res.status(400).json({ erro: "E-mail é obrigatório" });
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

  if (error) return res.status(404).json({ erro: "Membro não encontrado" });
  res.json(data);
});

// DELETE /api/membros/:id — Remover membro
app.delete("/api/membros/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("membros")
    .delete()
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(404).json({ erro: "Membro não encontrado" });
  res.json({ mensagem: "Membro removido com sucesso", membro: data });
});

// =====================================
// ROTAS — EVENTOS
// =====================================

// GET /api/eventos — Listar eventos (filtro opcional)
app.get("/api/eventos", async (req, res) => {
  let query = supabase.from("eventos").select("*");

  if (req.query.igreja_id) {
    query = query.eq("igreja_id", req.query.igreja_id);
  }

  const { data, error } = await query.order("data", { ascending: true });
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// GET /api/eventos/:id — Buscar evento por ID
app.get("/api/eventos/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("eventos")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ erro: "Evento não encontrado" });
  res.json(data);
});

// POST /api/eventos — Criar novo evento
app.post("/api/eventos", async (req, res) => {
  const { titulo, descricao, data, horario, local, igreja_id, tipo } = req.body;
  if (!titulo || !data || !igreja_id) {
    return res.status(400).json({ erro: "Título, data e igreja_id são obrigatórios" });
  }

  const { data: evento, error } = await supabase
    .from("eventos")
    .insert({
      titulo,
      descricao: descricao || "",
      data,
      horario: horario || "",
      local: local || "",
      igreja_id,
      tipo: tipo || "evento",
    })
    .select()
    .single();

  if (error) return res.status(400).json({ erro: error.message });
  res.status(201).json(evento);
});

// PUT /api/eventos/:id — Atualizar evento
app.put("/api/eventos/:id", async (req, res) => {
  const { titulo, descricao, data, horario, local, tipo } = req.body;
  const atualizacao = {};
  if (titulo !== undefined) atualizacao.titulo = titulo;
  if (descricao !== undefined) atualizacao.descricao = descricao;
  if (data !== undefined) atualizacao.data = data;
  if (horario !== undefined) atualizacao.horario = horario;
  if (local !== undefined) atualizacao.local = local;
  if (tipo !== undefined) atualizacao.tipo = tipo;

  const { data: evento, error } = await supabase
    .from("eventos")
    .update(atualizacao)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(404).json({ erro: "Evento não encontrado" });
  res.json(evento);
});

// DELETE /api/eventos/:id — Remover evento
app.delete("/api/eventos/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("eventos")
    .delete()
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(404).json({ erro: "Evento não encontrado" });
  res.json({ mensagem: "Evento removido com sucesso", evento: data });
});

// =====================================
// ROTAS — CONTRIBUIÇÕES
// =====================================

// GET /api/contribuicoes — Listar contribuições (filtros opcionais)
app.get("/api/contribuicoes", async (req, res) => {
  let query = supabase.from("contribuicoes").select("*");

  if (req.query.igreja_id) {
    query = query.eq("igreja_id", req.query.igreja_id);
  }
  if (req.query.membro_id) {
    query = query.eq("membro_id", req.query.membro_id);
  }
  if (req.query.tipo) {
    query = query.eq("tipo", req.query.tipo);
  }

  const { data, error } = await query.order("data", { ascending: false });
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// GET /api/contribuicoes/:id — Buscar contribuição por ID
app.get("/api/contribuicoes/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("contribuicoes")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ erro: "Contribuição não encontrada" });
  res.json(data);
});

// POST /api/contribuicoes — Registrar nova contribuição
app.post("/api/contribuicoes", async (req, res) => {
  const { membro_id, igreja_id, membro_nome, tipo, valor, data, descricao } = req.body;
  if (!membro_id || !igreja_id || !tipo || !valor) {
    return res.status(400).json({ erro: "membro_id, igreja_id, tipo e valor são obrigatórios" });
  }

  const { data: contribuicao, error } = await supabase
    .from("contribuicoes")
    .insert({
      membro_id,
      igreja_id,
      membro_nome: membro_nome || "",
      tipo,
      valor: Number(valor),
      data: data || new Date().toISOString().split("T")[0],
      descricao: descricao || "",
    })
    .select()
    .single();

  if (error) return res.status(400).json({ erro: error.message });
  res.status(201).json(contribuicao);
});

// DELETE /api/contribuicoes/:id — Remover contribuição
app.delete("/api/contribuicoes/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("contribuicoes")
    .delete()
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(404).json({ erro: "Contribuição não encontrada" });
  res.json({ mensagem: "Contribuição removida com sucesso", contribuicao: data });
});

// =====================================
// ROTAS — COMUNICADOS
// =====================================

// GET /api/comunicados — Listar comunicados (filtro opcional)
app.get("/api/comunicados", async (req, res) => {
  let query = supabase.from("comunicados").select("*");

  if (req.query.igreja_id) {
    query = query.eq("igreja_id", req.query.igreja_id);
  }

  const { data, error } = await query.order("criado_em", { ascending: false });
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// GET /api/comunicados/:id — Buscar comunicado por ID
app.get("/api/comunicados/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("comunicados")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ erro: "Comunicado não encontrado" });
  res.json(data);
});

// POST /api/comunicados — Criar novo comunicado
app.post("/api/comunicados", async (req, res) => {
  const { igreja_id, titulo, conteudo, prioridade } = req.body;
  if (!igreja_id || !titulo || !conteudo) {
    return res.status(400).json({ erro: "igreja_id, titulo e conteudo são obrigatórios" });
  }

  const { data, error } = await supabase
    .from("comunicados")
    .insert({
      igreja_id,
      titulo,
      conteudo,
      prioridade: prioridade || "normal",
    })
    .select()
    .single();

  if (error) return res.status(400).json({ erro: error.message });
  res.status(201).json(data);
});

// PUT /api/comunicados/:id — Atualizar comunicado
app.put("/api/comunicados/:id", async (req, res) => {
  const { titulo, conteudo, prioridade } = req.body;
  const atualizacao = {};
  if (titulo !== undefined) atualizacao.titulo = titulo;
  if (conteudo !== undefined) atualizacao.conteudo = conteudo;
  if (prioridade !== undefined) atualizacao.prioridade = prioridade;

  const { data, error } = await supabase
    .from("comunicados")
    .update(atualizacao)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(404).json({ erro: "Comunicado não encontrado" });
  res.json(data);
});

// DELETE /api/comunicados/:id — Remover comunicado
app.delete("/api/comunicados/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("comunicados")
    .delete()
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(404).json({ erro: "Comunicado não encontrado" });
  res.json({ mensagem: "Comunicado removido com sucesso", comunicado: data });
});

// =====================================
// ROTAS — PEDIDOS DE ORAÇÃO
// =====================================

// GET /api/pedidos-oracao — Listar pedidos de oração (filtros opcionais)
app.get("/api/pedidos-oracao", async (req, res) => {
  let query = supabase.from("pedidos_oracao").select("*");

  if (req.query.igreja_id) {
    query = query.eq("igreja_id", req.query.igreja_id);
  }
  if (req.query.membro_id) {
    query = query.eq("membro_id", req.query.membro_id);
  }
  if (req.query.status) {
    query = query.eq("status", req.query.status);
  }

  const { data, error } = await query.order("criado_em", { ascending: false });
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// GET /api/pedidos-oracao/:id — Buscar pedido por ID
app.get("/api/pedidos-oracao/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("pedidos_oracao")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ erro: "Pedido de oração não encontrado" });
  res.json(data);
});

// POST /api/pedidos-oracao — Criar novo pedido de oração
app.post("/api/pedidos-oracao", async (req, res) => {
  const { igreja_id, membro_id, membro_nome, pedido } = req.body;
  if (!igreja_id || !membro_id || !pedido) {
    return res.status(400).json({ erro: "igreja_id, membro_id e pedido são obrigatórios" });
  }

  const { data, error } = await supabase
    .from("pedidos_oracao")
    .insert({
      igreja_id,
      membro_id,
      membro_nome: membro_nome || "",
      pedido,
      status: "pendente",
    })
    .select()
    .single();

  if (error) return res.status(400).json({ erro: error.message });
  res.status(201).json(data);
});

// PUT /api/pedidos-oracao/:id — Atualizar status do pedido
app.put("/api/pedidos-oracao/:id", async (req, res) => {
  const { pedido, status, resposta, respondido_por } = req.body;
  const atualizacao = {};
  if (pedido !== undefined) atualizacao.pedido = pedido;
  if (status !== undefined) atualizacao.status = status;
  if (resposta !== undefined) atualizacao.resposta = resposta;
  if (respondido_por !== undefined) atualizacao.respondido_por = respondido_por;
  if (resposta !== undefined || status === "respondido") {
    atualizacao.respondido_em = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("pedidos_oracao")
    .update(atualizacao)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(404).json({ erro: "Pedido de oração não encontrado" });
  res.json(data);
});

// DELETE /api/pedidos-oracao/:id — Remover pedido de oração
app.delete("/api/pedidos-oracao/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("pedidos_oracao")
    .delete()
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(404).json({ erro: "Pedido de oração não encontrado" });
  res.json({ mensagem: "Pedido removido com sucesso", pedido: data });
});

// =====================================
// ROTA RAIZ — Informações da API
// =====================================
app.get("/", (req, res) => {
  res.json({
    nome: "CongregaFiel API (Express.js + Supabase)",
    versao: "2.0.0",
    endpoints: {
      auth: {
        registrar_igreja: "POST /api/auth/registrar-igreja",
        registrar_membro: "POST /api/auth/registrar-membro",
        login: "POST /api/auth/login",
        recuperar_senha: "POST /api/auth/recuperar-senha",
      },
      igrejas: "/api/igrejas",
      membros: "/api/membros",
      eventos: "/api/eventos",
      contribuicoes: "/api/contribuicoes",
      comunicados: "/api/comunicados",
      pedidos_oracao: "/api/pedidos-oracao",
    },
  });
});

// -------------------- Iniciar Servidor --------------------
// Em ambiente local, inicia o servidor normalmente
// No Vercel, o módulo é importado como serverless function
if (process.env.VERCEL !== "1") {
  app.listen(PORTA, () => {
    console.log(`CongregaFiel API (Express + Supabase) rodando na porta ${PORTA}`);
    console.log("Endpoints disponíveis:");
    console.log("  POST   /api/auth/registrar-igreja");
    console.log("  POST   /api/auth/registrar-membro");
    console.log("  POST   /api/auth/login");
    console.log("  POST   /api/auth/recuperar-senha");
    console.log("  GET    /api/igrejas");
    console.log("  GET    /api/membros");
    console.log("  GET    /api/eventos");
    console.log("  GET    /api/contribuicoes");
    console.log("  GET    /api/comunicados");
    console.log("  GET    /api/pedidos-oracao");
  });
}

module.exports = app;
