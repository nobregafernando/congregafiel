// =============================================================
// CongregaFiel — Microserviço de Comunicados
// Responsabilidade: CRUD de comunicados com prioridade
// Porta padrão: 4006
// =============================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const supabase = require("./supabase");

const app = express();
const PORTA = process.env.PORT || 4006;

app.use(cors());
app.use(express.json());

// -------------------------------------------------------
// Health-check
// -------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({ servico: "announcements-service", status: "ok", timestamp: new Date().toISOString() });
});

// -------------------------------------------------------
// GET /api/comunicados — Listar comunicados
// Query params: ?igreja_id=
// -------------------------------------------------------
app.get("/api/comunicados", async (req, res) => {
  try {
    let query = supabase.from("comunicados").select("*");

    if (req.query.igreja_id) query = query.eq("igreja_id", req.query.igreja_id);

    const { data, error } = await query.order("criado_em", { ascending: false });
    if (error) return res.status(500).json({ erro: error.message });

    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// GET /api/comunicados/:id — Buscar comunicado por ID
// -------------------------------------------------------
app.get("/api/comunicados/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("comunicados")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) return res.status(404).json({ erro: "Comunicado não encontrado" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// POST /api/comunicados — Criar comunicado
// -------------------------------------------------------
app.post("/api/comunicados", async (req, res) => {
  const { igreja_id, titulo, conteudo, prioridade } = req.body;

  if (!igreja_id || !titulo || !conteudo) {
    return res.status(400).json({ erro: "igreja_id, titulo e conteudo são obrigatórios" });
  }

  const prioridadesValidas = ["normal", "urgente"];
  if (prioridade && !prioridadesValidas.includes(prioridade)) {
    return res.status(400).json({ erro: "prioridade deve ser normal ou urgente" });
  }

  try {
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
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// PUT /api/comunicados/:id — Atualizar comunicado
// -------------------------------------------------------
app.put("/api/comunicados/:id", async (req, res) => {
  const { titulo, conteudo, prioridade } = req.body;
  const atualizacao = {};

  if (titulo     !== undefined) atualizacao.titulo     = titulo;
  if (conteudo   !== undefined) atualizacao.conteudo   = conteudo;
  if (prioridade !== undefined) atualizacao.prioridade = prioridade;

  if (Object.keys(atualizacao).length === 0) {
    return res.status(400).json({ erro: "Nenhum campo enviado para atualização" });
  }

  try {
    const { data, error } = await supabase
      .from("comunicados")
      .update(atualizacao)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(404).json({ erro: "Comunicado não encontrado" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// DELETE /api/comunicados/:id — Remover comunicado
// -------------------------------------------------------
app.delete("/api/comunicados/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("comunicados")
      .delete()
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(404).json({ erro: "Comunicado não encontrado" });
    res.json({ mensagem: "Comunicado removido com sucesso", comunicado: data });
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// Rota não encontrada
// -------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ erro: "Rota não encontrada no announcements-service" });
});

// -------------------------------------------------------
// Iniciar servidor
// -------------------------------------------------------
app.listen(PORTA, () => {
  console.log(`[announcements-service] rodando na porta ${PORTA}`);
});

module.exports = app;