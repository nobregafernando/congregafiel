// =============================================================
// CongregaFiel — Microserviço de Pedidos de Oração
// Responsabilidade: pedidos de oração com resposta pastoral
// Porta padrão: 4007
// =============================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const supabase = require("./supabase");

const app = express();
const PORTA = process.env.PORT || 4007;

app.use(cors());
app.use(express.json());

// -------------------------------------------------------
// Health-check
// -------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({ servico: "prayers-service", status: "ok", timestamp: new Date().toISOString() });
});

// -------------------------------------------------------
// GET /api/pedidos-oracao — Listar pedidos
// Query params: ?igreja_id= &membro_id= &status=
// -------------------------------------------------------
app.get("/api/pedidos-oracao", async (req, res) => {
  try {
    let query = supabase.from("pedidos_oracao").select("*");

    if (req.query.igreja_id) query = query.eq("igreja_id", req.query.igreja_id);
    if (req.query.membro_id) query = query.eq("membro_id", req.query.membro_id);
    if (req.query.status)    query = query.eq("status",    req.query.status);

    const { data, error } = await query.order("criado_em", { ascending: false });
    if (error) return res.status(500).json({ erro: error.message });

    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// GET /api/pedidos-oracao/:id — Buscar pedido por ID
// -------------------------------------------------------
app.get("/api/pedidos-oracao/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("pedidos_oracao")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) return res.status(404).json({ erro: "Pedido de oração não encontrado" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// POST /api/pedidos-oracao — Criar pedido de oração
// -------------------------------------------------------
app.post("/api/pedidos-oracao", async (req, res) => {
  const { igreja_id, membro_id, membro_nome, pedido } = req.body;

  if (!igreja_id || !membro_id || !pedido) {
    return res.status(400).json({ erro: "igreja_id, membro_id e pedido são obrigatórios" });
  }

  try {
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
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// PUT /api/pedidos-oracao/:id — Atualizar / responder pedido
// -------------------------------------------------------
app.put("/api/pedidos-oracao/:id", async (req, res) => {
  const { pedido, status, resposta, respondido_por } = req.body;
  const atualizacao = {};

  if (pedido        !== undefined) atualizacao.pedido        = pedido;
  if (status        !== undefined) atualizacao.status        = status;
  if (resposta      !== undefined) atualizacao.resposta      = resposta;
  if (respondido_por !== undefined) atualizacao.respondido_por = respondido_por;

  // Registra data/hora da resposta automaticamente
  if (resposta !== undefined || status === "respondido") {
    atualizacao.respondido_em = new Date().toISOString();
  }

  if (Object.keys(atualizacao).length === 0) {
    return res.status(400).json({ erro: "Nenhum campo enviado para atualização" });
  }

  try {
    const { data, error } = await supabase
      .from("pedidos_oracao")
      .update(atualizacao)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(404).json({ erro: "Pedido de oração não encontrado" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// DELETE /api/pedidos-oracao/:id — Remover pedido
// -------------------------------------------------------
app.delete("/api/pedidos-oracao/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("pedidos_oracao")
      .delete()
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(404).json({ erro: "Pedido de oração não encontrado" });
    res.json({ mensagem: "Pedido removido com sucesso", pedido: data });
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// Rota não encontrada
// -------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ erro: "Rota não encontrada no prayers-service" });
});

// -------------------------------------------------------
// Iniciar servidor
// -------------------------------------------------------
app.listen(PORTA, () => {
  console.log(`[prayers-service] rodando na porta ${PORTA}`);
});

module.exports = app;