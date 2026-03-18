// =============================================================
// CongregaFiel — Microserviço Financeiro
// Responsabilidade: contribuições (dízimos, ofertas, doações)
// Porta padrão: 4005
// =============================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const supabase = require("./supabase");

const app = express();
const PORTA = process.env.PORT || 4005;

app.use(cors());
app.use(express.json());

// -------------------------------------------------------
// Health-check
// -------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({ servico: "finance-service", status: "ok", timestamp: new Date().toISOString() });
});

// -------------------------------------------------------
// GET /api/contribuicoes — Listar contribuições
// Query params: ?igreja_id= &membro_id= &tipo=
// -------------------------------------------------------
app.get("/api/contribuicoes", async (req, res) => {
  try {
    let query = supabase.from("contribuicoes").select("*");

    if (req.query.igreja_id) query = query.eq("igreja_id", req.query.igreja_id);
    if (req.query.membro_id) query = query.eq("membro_id", req.query.membro_id);
    if (req.query.tipo)      query = query.eq("tipo",      req.query.tipo);

    const { data, error } = await query.order("data", { ascending: false });
    if (error) return res.status(500).json({ erro: error.message });

    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// GET /api/contribuicoes/:id — Buscar contribuição por ID
// -------------------------------------------------------
app.get("/api/contribuicoes/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("contribuicoes")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) return res.status(404).json({ erro: "Contribuição não encontrada" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// POST /api/contribuicoes — Registrar contribuição
// -------------------------------------------------------
app.post("/api/contribuicoes", async (req, res) => {
  const { membro_id, igreja_id, membro_nome, tipo, valor, data, descricao } = req.body;

  if (!membro_id || !igreja_id || !tipo || !valor) {
    return res.status(400).json({ erro: "membro_id, igreja_id, tipo e valor são obrigatórios" });
  }

  const tiposValidos = ["dizimo", "oferta", "doacao", "outro"];
  if (!tiposValidos.includes(tipo)) {
    return res.status(400).json({ erro: `tipo deve ser um de: ${tiposValidos.join(", ")}` });
  }

  try {
    const { data: contribuicao, error } = await supabase
      .from("contribuicoes")
      .insert({
        membro_id,
        igreja_id,
        membro_nome: membro_nome || "",
        tipo,
        valor:       Number(valor),
        data:        data || new Date().toISOString().split("T")[0],
        descricao:   descricao || "",
      })
      .select()
      .single();

    if (error) return res.status(400).json({ erro: error.message });
    res.status(201).json(contribuicao);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// DELETE /api/contribuicoes/:id — Remover contribuição
// -------------------------------------------------------
app.delete("/api/contribuicoes/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("contribuicoes")
      .delete()
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(404).json({ erro: "Contribuição não encontrada" });
    res.json({ mensagem: "Contribuição removida com sucesso", contribuicao: data });
  } catch (err) {
    res.status(500).json({ erro: "Erro interno: " + err.message });
  }
});

// -------------------------------------------------------
// Rota não encontrada
// -------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ erro: "Rota não encontrada no finance-service" });
});

// -------------------------------------------------------
// Iniciar servidor
// -------------------------------------------------------
app.listen(PORTA, () => {
  console.log(`[finance-service] rodando na porta ${PORTA}`);
});

module.exports = app;