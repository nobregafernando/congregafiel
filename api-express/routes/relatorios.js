// =============================================================
// Relatórios Financeiros - Rotas Express.js
// Equivalente ao FastAPI em api-fastapi/servidor.py
// =============================================================

const express = require('express');
const router = express.Router();
const {
    resumo_mensal, historico_membro, comparativo_anual,
    top_contribuintes, inadimplentes, fluxo_caixa
} = require('../utils/relatorios-utils');

// Middleware para validação de JWT (aplicado externamente)

/**
 * GET /api/relatorios/resumo-mensal
 * Query params: data_inicio, data_fim
 */
router.get('/resumo-mensal', async (req, res) => {
    try {
        const { data_inicio, data_fim } = req.query;
        
        if (!data_inicio || !data_fim) {
            return res.status(400).json({
                erro: 'data_inicio e data_fim são obrigatórios (YYYY-MM-DD)'
            });
        }

        const resultado = await resumo_mensal(data_inicio, data_fim);
        
        if (resultado.erro) {
            return res.status(500).json(resultado);
        }

        res.json(resultado);
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

/**
 * GET /api/relatorios/historico/:membro_id
 * Query params: data_inicio (optional), data_fim (optional)
 */
router.get('/historico/:membro_id', async (req, res) => {
    try {
        const { membro_id } = req.params;
        const { data_inicio, data_fim } = req.query;

        if (!membro_id) {
            return res.status(400).json({ erro: 'membro_id é obrigatório' });
        }

        const resultado = await historico_membro(membro_id, data_inicio, data_fim);

        if (resultado.status === 404) {
            return res.status(404).json({ erro: resultado.erro });
        }

        if (resultado.erro) {
            return res.status(500).json(resultado);
        }

        res.json(resultado);
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

/**
 * GET /api/relatorios/comparativo-anual
 * Query params: ano1, ano2
 */
router.get('/comparativo-anual', async (req, res) => {
    try {
        const { ano1, ano2 } = req.query;

        if (!ano1 || !ano2) {
            return res.status(400).json({
                erro: 'ano1 e ano2 são obrigatórios (YYYY)'
            });
        }

        const resultado = await comparativo_anual(ano1, ano2);

        if (resultado.erro) {
            return res.status(500).json(resultado);
        }

        res.json(resultado);
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

/**
 * GET /api/relatorios/top-contribuintes
 * Query params: limite (default 10), data_inicio (optional), data_fim (optional)
 */
router.get('/top-contribuintes', async (req, res) => {
    try {
        const limite = parseInt(req.query.limite) || 10;
        const { data_inicio, data_fim } = req.query;

        if (limite < 1 || limite > 1000) {
            return res.status(400).json({ erro: 'limite deve estar entre 1 e 1000' });
        }

        const resultado = await top_contribuintes(limite, data_inicio, data_fim);

        if (resultado.erro) {
            return res.status(500).json(resultado);
        }

        res.json(resultado);
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

/**
 * GET /api/relatorios/inadimplentes
 * Query params: dias_atraso (default 30)
 */
router.get('/inadimplentes', async (req, res) => {
    try {
        const dias_atraso = parseInt(req.query.dias_atraso) || 30;

        if (dias_atraso < 1 || dias_atraso > 365) {
            return res.status(400).json({ erro: 'dias_atraso deve estar entre 1 e 365' });
        }

        const resultado = await inadimplentes(dias_atraso);

        if (resultado.erro) {
            return res.status(500).json(resultado);
        }

        res.json(resultado);
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

/**
 * GET /api/relatorios/fluxo-caixa
 * Query params: data_inicio, data_fim
 */
router.get('/fluxo-caixa', async (req, res) => {
    try {
        const { data_inicio, data_fim } = req.query;

        if (!data_inicio || !data_fim) {
            return res.status(400).json({
                erro: 'data_inicio e data_fim são obrigatórios (YYYY-MM-DD)'
            });
        }

        const resultado = await fluxo_caixa(data_inicio, data_fim);

        if (resultado.erro) {
            return res.status(500).json(resultado);
        }

        res.json(resultado);
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

module.exports = router;
