// =============================================================
// CongregaFiel — Microserviço de Membros
// Responsabilidade: CRUD completo de membros
// Porta padrão: 4002
// =============================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const supabase = require("./supabase");

const app = express();
const PORTA = process.env.PORT || 4002;

app.use(cors());
app.use(express.json());

// -------------------------------------------------------
// Health-check
// -------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({ servico: "members-service", status: "ok", timestamp: new Date().toISOString() });
});

// -------------------------------------------------------
// GET /api/membros — Listar membros
// Query params: ?igreja_id=&tipo=
// -------------------------------------------------------
app.get("/api/membros", async (req, res) => {
  try {
    let query = supabase.from("membros").select("*");

    if (req.query.igreja_id) query = query.eq("igreja_id", req.query.igreja_id);
    if (req.query.tipo)      query = query.eq("tipo", req.query.tipo);

    const { data, error } = await query.order("criado_em", { ascending: true });
    if (error) return res.status(500).json({ erro: error.message });

    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// GET /api/membros/:id — Buscar membro por ID
// -------------------------------------------------------
app.get("/api/membros/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("membros")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) return res.status(404).json({ erro: "Membro não encontrado" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// POST /api/membros — Criar membro
// -------------------------------------------------------
app.post("/api/membros", async (req, res) => {
  const { nome_completo, email, telefone, tipo, igreja_id, codigo_igreja } = req.body;

  if (!nome_completo || !email || !igreja_id) {
    return res.status(400).json({ erro: "nome_completo, email e igreja_id são obrigatórios" });
  }

  try {
    const { data, error } = await supabase
      .from("membros")
      .insert({
        nome_completo,
        email,
        telefone:     telefone || "",
        tipo:         tipo || "membro",
        igreja_id,
        codigo_igreja: codigo_igreja || null,
      })
      .select()
      .single();

    if (error) return res.status(400).json({ erro: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// PUT /api/membros/:id — Atualizar membro
// -------------------------------------------------------
app.put("/api/membros/:id", async (req, res) => {
  const { nome_completo, email, telefone, tipo } = req.body;
  const atualizacao = {};

  if (nome_completo !== undefined) atualizacao.nome_completo = nome_completo;
  if (email       !== undefined) atualizacao.email       = email;
  if (telefone    !== undefined) atualizacao.telefone    = telefone;
  if (tipo        !== undefined) atualizacao.tipo        = tipo;

  if (Object.keys(atualizacao).length === 0) {
    return res.status(400).json({ erro: "Nenhum campo enviado para atualização" });
  }

  try {
    const { data, error } = await supabase
      .from("membros")
      .update(atualizacao)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(404).json({ erro: "Membro não encontrado" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// DELETE /api/membros/:id — Remover membro
// -------------------------------------------------------
app.delete("/api/membros/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("membros")
      .delete()
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(404).json({ erro: "Membro não encontrado" });
    res.json({ mensagem: "Membro removido com sucesso", membro: data });
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// Rota não encontrada
// -------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ erro: "Rota não encontrada no members-service" });
});

// -------------------------------------------------------
// Iniciar servidor
// -------------------------------------------------------
app.listen(PORTA, () => {
  console.log(`[members-service] rodando na porta ${PORTA}`);
});

module.exports = app;
