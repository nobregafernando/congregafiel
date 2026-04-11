// =============================================================
// Exemplos de Integração dos 6 Gatilhos — DOCUMENTAÇÃO
// Como integrar os gatilhos nas rotas existentes
// Implementação após endpoints FastAPI estarem finalizados
// =============================================================

/**
 * EXEMPLO 1: Integração do Gatilho 1 (Nova Contribuição)
 * ========================================================
 * Onde integrar: /api/contribuicoes POST
 * 
 * ANTES (código atual):
 *   app.use("/api/contribuicoes", verificarJwt, ... proxy);
 * 
 * DEPOIS (com gatilho):
 * 
 *   const { gatilho1_novaContribuicao } = require("./notification-gateways");
 * 
 *   app.post("/api/contribuicoes", verificarJwt, async (req, res, next) => {
 *     // 1. Passar para FastAPI backend
 *     const respostaBackend = await fetch(FASTAPI_URL + "/api/contribuicoes", {
 *       method: "POST",
 *       headers: { ... },
 *       body: JSON.stringify(req.body)
 *     });
 * 
 *     // 2. Se sucesso, disparar gatilho
 *     if (respostaBackend.ok) {
 *       const contribuicao = await respostaBackend.json();
 *       const membro = req.usuario; // De req.usuario (JWT decodificado)
 *       
 *        // Dispara asincronamente - não aguarda
 *       gatilho1_novaContribuicao(contribuicao, membro).catch(err => 
 *         console.error("Erro no gatilho 1:", err)
 *       );
 *     }
 * 
 *     // 3. Retornar resposta original
 *     res.status(respostaBackend.status).json(await respostaBackend.json());
 *   });
 */

/**
 * EXEMPLO 2: Integração do Gatilho 2 (Novo Evento)
 * ================================================
 * Onde integrar: /api/eventos POST
 * Similar ao Exemplo 1, chamando gatilho2_novoEvento()
 */

/**
 * EXEMPLO 3: Integração do Gatilho 3 (Comunicado Broadcast)
 * =========================================================
 * Onde integrar: /api/comunicados POST
 * 
 * Diferença: Precisa buscar lista de membros da igreja
 * 
 *   const membrosIds = await buscarMembrosIgreja(igreja_id);
 *   const resultado = await gatilho3_comunicadoBroadcast(comunicado, membrosIds);
 */

/**
 * EXEMPLO 4: Integração do Gatilho 4 (Pedido de Oração)
 * =====================================================
 * Onde integrar: /api/pedidos-oracao POST
 * 
 * Diferença: Envia apenas para líderes
 * 
 *   const lideresIds = await buscarLideresIgreja(igreja_id);
 *   await gatilho4_pedidoOracaoBroadcast(pedido, lideresIds);
 */

/**
 * EXEMPLO 5: Integração do Gatilho 5 (Relatório Disponível)
 * ⚠️  CRÍTICO PARA SPRINT 11
 * ==================================================
 * Onde integrar: /api/relatorios/* GET (ao gerar PDF/Excel)
 * 
 *   app.get("/api/relatorios/financeiro", verificarJwt, async (req, res) => {
 *     // ... gerar relatório ...
 *     const usuario_id = req.usuario.id;
 * 
 *     // Dispara APÓS gerar com sucesso
 *     await gatilho5_relatorioDisponivel(usuario_id, "Financeiro");
 * 
 *     res.json({ ... });
 *   });
 */

/**
 * EXEMPLO 6: Integração do Gatilho 6 (Alerta de Atraso)
 * ⚠️  CRÍTICO PARA SPRINT 11
 * ================================================
 * Onde integrar: CRON JOB diário (00:00)
 * Não é um gatilho de rota - é um job agendado
 * 
 * IMPLEMENTAÇÃO COM node-cron:
 * 
 *   const cron = require("node-cron");
 *   const { buscarUsuariosComAtraso } = require("./supabase-queries");
 *   const { gatilho6_alertaAtraso } = require("./notification-gateways");
 * 
 *   // Executa todo dia às 00:00
 *   cron.schedule("0 0 * * *", async () => {
 *     console.log("🔔 [CRON] Executando verificação de atrasos...");
 * 
 *     try {
 *       const usuariosComAtraso = await buscarUsuariosComAtraso(diasAtraso: 30);
 * 
 *       for (const usuario of usuariosComAtraso) {
 *         await gatilho6_alertaAtraso(usuario.id, usuario.dias_atraso);
 *       }
 * 
 *       console.log(`✅ [CRON] Verificação concluída: ${usuariosComAtraso.length} alertas`);
 *     } catch (err) {
 *       console.error("[CRON] Erro:", err.message);
 *     }
 *   });
 */

// ========================================
// RESUMO DOS GATILHOS
// ========================================
// 
// Gatilho 1: Nova Contribuição → Usuario que contribuiu (1:1)
// Gatilho 2: Novo Evento → Admin que criou (1:1)
// Gatilho 3: Comunicado → TODOS os membros (1:N broadcast)
// Gatilho 4: Pedido de Oração → LÍDERES/PASTORES (1:N broadcast)
// Gatilho 5: Relatório Disponível → Usuario que solicitou (1:1) ⚠️ CRÍTICO
// Gatilho 6: Alerta de Atraso → Usuario com atraso (N:1 cron) ⚠️ CRÍTICO
//
// Timing Esperado:
// - Gatilhos 1-5: < 2 segundos (após rota completar)
// - Gatilho 6: Diário às 00:00 (background cron)
//
// Validação:
// - Cada gatilho respeita notificacao_preferences
// - Falha de notificação NÃO bloqueia a operação principal
// - Todas notificações são registradas em notificacoes_log
// ========================================

module.exports = {
  EXAMPLE_ONLY: true,
};
