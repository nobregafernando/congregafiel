// =============================================================
// CongregaFiel — Microserviço de Eventos
// Responsabilidade: CRUD completo de eventos
// Porta padrão: 4004
// =============================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const supabase = require("./supabase");

const app = express();
const PORTA = process.env.PORT || 4004;

app.use(cors());
app.use(express.json());

// -------------------------------------------------------
// Health-check
// -------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({ servico: "events-service", status: "ok", timestamp: new Date().toISOString() });
});

// -------------------------------------------------------
// GET /api/eventos — Listar eventos
// Query params: ?igreja_id=
// -------------------------------------------------------
app.get("/api/eventos", async (req, res) => {
  try {
    let query = supabase.from("eventos").select("*");

    if (req.query.igreja_id) query = query.eq("igreja_id", req.query.igreja_id);

    const { data, error } = await query.order("data", { ascending: true });
    if (error) return res.status(500).json({ erro: error.message });

    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// GET /api/eventos/:id — Buscar evento por ID
// -------------------------------------------------------
app.get("/api/eventos/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("eventos")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) return res.status(404).json({ erro: "Evento não encontrado" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// POST /api/eventos — Criar evento
// -------------------------------------------------------
app.post("/api/eventos", async (req, res) => {
  const { titulo, descricao, data, horario, local, igreja_id, tipo } = req.body;

  if (!titulo || !data || !igreja_id) {
    return res.status(400).json({ erro: "titulo, data e igreja_id são obrigatórios" });
  }

  try {
    const { data: evento, error } = await supabase
      .from("eventos")
      .insert({
        titulo,
        descricao: descricao || "",
        data,
        horario:   horario || "",
        local:     local   || "",
        igreja_id,
        tipo:      tipo    || "evento",
      })
      .select()
      .single();

    if (error) return res.status(400).json({ erro: error.message });
    res.status(201).json(evento);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// PUT /api/eventos/:id — Atualizar evento
// -------------------------------------------------------
app.put("/api/eventos/:id", async (req, res) => {
  const { titulo, descricao, data, horario, local, tipo } = req.body;
  const atualizacao = {};

  if (titulo    !== undefined) atualizacao.titulo    = titulo;
  if (descricao !== undefined) atualizacao.descricao = descricao;
  if (data      !== undefined) atualizacao.data      = data;
  if (horario   !== undefined) atualizacao.horario   = horario;
  if (local     !== undefined) atualizacao.local     = local;
  if (tipo      !== undefined) atualizacao.tipo      = tipo;

  if (Object.keys(atualizacao).length === 0) {
    return res.status(400).json({ erro: "Nenhum campo enviado para atualização" });
  }

  try {
    const { data: evento, error } = await supabase
      .from("eventos")
      .update(atualizacao)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(404).json({ erro: "Evento não encontrado" });
    res.json(evento);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// DELETE /api/eventos/:id — Remover evento
// -------------------------------------------------------
app.delete("/api/eventos/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("eventos")
      .delete()
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(404).json({ erro: "Evento não encontrado" });
    res.json({ mensagem: "Evento removido com sucesso", evento: data });
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// Rota não encontrada
// -------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ erro: "Rota não encontrada no events-service" });
});

// -------------------------------------------------------
// Iniciar servidor
// -------------------------------------------------------
app.listen(PORTA, () => {
  console.log(`[events-service] rodando na porta ${PORTA}`);
});

module.exports = app;