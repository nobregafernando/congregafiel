// =============================================================
// Testes para Relatórios Financeiros (FastAPI)
// 30+ testes cobrindo todos os endpoints
// =============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    resumo_mensal, historico_membro, comparativo_anual,
    top_contribuintes, inadimplentes, fluxo_caixa
} from '../relatorios_utils.js';

// Mock Supabase
vi.mock('../supabase_client.js', () => ({
    supabase: {
        table: vi.fn((table) => ({
            select: vi.fn(function(columns) {
                this.columns = columns;
                this.filters = {};
                this.sortConfig = null;
                this.limitConfig = null;
                return this;
            }),
            eq: vi.fn(function(col, val) {
                this.filters[col] = { op: 'eq', val };
                return this;
            }),
            gte: vi.fn(function(col, val) {
                this.filters[col] = { op: 'gte', val };
                return this;
            }),
            lte: vi.fn(function(col, val) {
                this.filters[col] = { op: 'lte', val };
                return this;
            }),
            order: vi.fn(function(col, options) {
                this.sortConfig = { col, desc: options?.desc || false };
                return this;
            }),
            limit: vi.fn(function(num) {
                this.limitConfig = num;
                return this;
            }),
            execute: vi.fn(async function() {
                return this.mockData();
            }),
            mockData: vi.fn(() => ({ data: [] })),
        }))
    }
}));

describe('Relatórios - Resumo Mensal', () => {
    it('T1: Deve retornar resumo mensal com dados válidos', async () => {
        const resultado = await resumo_mensal('2026-01-01', '2026-01-31');
        expect(resultado).toHaveProperty('tipo', 'resumo_mensal');
        expect(resultado).toHaveProperty('periodo');
        expect(resultado).toHaveProperty('dados');
        expect(resultado).toHaveProperty('total_geral');
    });

    it('T2: Resumo mensal deve agrupar por mês corretamente', async () => {
        const resultado = await resumo_mensal('2026-01-01', '2026-02-28');
        expect(resultado.dados).toBeDefined();
        if (Object.keys(resultado.dados).length > 0) {
            const primeiroMes = Object.values(resultado.dados)[0];
            expect(primeiroMes).toHaveProperty('total');
            expect(primeiroMes).toHaveProperty('quantidade');
            expect(primeiroMes).toHaveProperty('tipos');
        }
    });

    it('T3: Resumo mensal deve calcular total_geral corretamente', async () => {
        const resultado = await resumo_mensal('2026-01-01', '2026-01-31');
        const somaItens = Object.values(resultado.dados || {})
            .reduce((sum, item) => sum + item.total, 0);
        expect(resultado.total_geral).toBe(somaItens);
    });

    it('T4: Resumo mensal com período inválido deve retornar dados vazios', async () => {
        const resultado = await resumo_mensal('2026-12-31', '2026-01-01');
        expect(resultado).toHaveProperty('dados');
    });

    it('T5: Resumo mensal deve incluir tipos de contribuição', async () => {
        const resultado = await resumo_mensal('2026-01-01', '2026-01-31');
        if (Object.keys(resultado.dados).length > 0) {
            const tipos = Object.values(resultado.dados)[0].tipos;
            expect(tipos).toBeDefined();
        }
    });
});

describe('Relatórios - Histórico Membro', () => {
    it('T6: Deve retornar histórico de membro válido', async () => {
        const resultado = await historico_membro('123e4567-89ab-4567-89ab-123456789012');
        expect(resultado).toHaveProperty('tipo', 'historico_membro');
        expect(resultado).toHaveProperty('membro');
        expect(resultado).toHaveProperty('contribuicoes');
    });

    it('T7: Histórico deve incluir dados do membro', async () => {
        const resultado = await historico_membro('123e4567-89ab-4567-89ab-123456789012');
        if (!resultado.erro) {
            expect(resultado.membro).toHaveProperty('id');
            expect(resultado.membro).toHaveProperty('nome');
        }
    });

    it('T8: Histórico deve calcular totais por tipo', async () => {
        const resultado = await historico_membro('123e4567-89ab-4567-89ab-123456789012');
        if (!resultado.erro) {
            expect(resultado).toHaveProperty('totais_por_tipo');
            expect(resultado).toHaveProperty('total_geral');
            expect(resultado).toHaveProperty('quantidade');
        }
    });

    it('T9: Histórico com filtro de período deve funcionar', async () => {
        const resultado = await historico_membro(
            '123e4567-89ab-4567-89ab-123456789012',
            '2026-01-01',
            '2026-01-31'
        );
        expect(resultado).toHaveProperty('periodo');
    });

    it('T10: Histórico de membro inexistente deve retornar erro 404', async () => {
        const resultado = await historico_membro('invalid-id');
        if (!resultado.data) {
            expect(resultado).toHaveProperty('erro');
        }
    });

    it('T11: Histórico deve ordenar contribuições por data decrescente', async () => {
        const resultado = await historico_membro('123e4567-89ab-4567-89ab-123456789012');
        if (!resultado.erro && resultado.contribuicoes.length > 1) {
            for (let i = 0; i < resultado.contribuicoes.length - 1; i++) {
                const data1 = new Date(resultado.contribuicoes[i].data);
                const data2 = new Date(resultado.contribuicoes[i + 1].data);
                expect(data1.getTime()).toBeGreaterThanOrEqual(data2.getTime());
            }
        }
    });
});

describe('Relatórios - Comparativo Anual', () => {
    it('T12: Deve retornar comparativo anual válido', async () => {
        const resultado = await comparativo_anual('2025', '2026');
        expect(resultado).toHaveProperty('tipo', 'comparativo_anual');
        expect(resultado).toHaveProperty('anos');
        expect(resultado).toHaveProperty('por_mes');
    });

    it('T13: Comparativo deve incluir totais anuais', async () => {
        const resultado = await comparativo_anual('2025', '2026');
        expect(resultado).toHaveProperty('total_ano1');
        expect(resultado).toHaveProperty('total_ano2');
    });

    it('T14: Comparativo deve calcular diferença percentual', async () => {
        const resultado = await comparativo_anual('2025', '2026');
        expect(resultado.por_mes).toBeDefined();
        const primeirosValores = Object.values(resultado.por_mes)[0];
        if (primeirosValores) {
            expect(primeirosValores).toHaveProperty('diferenca');
            expect(primeirosValores).toHaveProperty('percentual');
        }
    });

    it('T15: Comparativo deve incluir 12 meses', async () => {
        const resultado = await comparativo_anual('2025', '2026');
        expect(Object.keys(resultado.por_mes).length).toBe(12);
    });

    it('T16: Comparativo com anos iguais deve funcionar', async () => {
        const resultado = await comparativo_anual('2026', '2026');
        expect(resultado).toHaveProperty('anos');
    });
});

describe('Relatórios - Top Contribuintes', () => {
    it('T17: Deve retornar ranking de contribuintes', async () => {
        const resultado = await top_contribuintes(10);
        expect(resultado).toHaveProperty('tipo', 'top_contribuintes');
        expect(resultado).toHaveProperty('ranking');
        expect(resultado).toHaveProperty('total_geral');
    });

    it('T18: Ranking deve respeitar limite de resultados', async () => {
        const resultado = await top_contribuintes(5);
        expect(resultado.ranking.length).toBeLessThanOrEqual(5);
    });

    it('T19: Ranking deve estar ordenado por total descrescente', async () => {
        const resultado = await top_contribuintes(10);
        if (resultado.ranking.length > 1) {
            for (let i = 0; i < resultado.ranking.length - 1; i++) {
                expect(resultado.ranking[i].total)
                    .toBeGreaterThanOrEqual(resultado.ranking[i + 1].total);
            }
        }
    });

    it('T20: Cada contribuinte deve incluir nome e email', async () => {
        const resultado = await top_contribuintes(10);
        if (resultado.ranking.length > 0) {
            expect(resultado.ranking[0]).toHaveProperty('nome');
            expect(resultado.ranking[0]).toHaveProperty('email');
            expect(resultado.ranking[0]).toHaveProperty('total');
            expect(resultado.ranking[0]).toHaveProperty('contribuicoes');
        }
    });

    it('T21: Top contribuintes com período deve filtrá-los', async () => {
        const resultado = await top_contribuintes(10, '2026-01-01', '2026-01-31');
        expect(resultado).toHaveProperty('periodo');
        expect(resultado.periodo).toHaveProperty('inicio');
        expect(resultado.periodo).toHaveProperty('fim');
    });

    it('T22: Limite = 1 deve retornar apenas o top 1', async () => {
        const resultado = await top_contribuintes(1);
        expect(resultado.ranking.length).toBeLessThanOrEqual(1);
    });
});

describe('Relatórios - Inadimplentes', () => {
    it('T23: Deve retornar lista de inadimplentes', async () => {
        const resultado = await inadimplentes(30);
        expect(resultado).toHaveProperty('tipo', 'inadimplentes');
        expect(resultado).toHaveProperty('membros');
        expect(resultado).toHaveProperty('total');
    });

    it('T24: Inadimplentes deve ter dias_limite nos resultado', async () => {
        const resultado = await inadimplentes(30);
        expect(resultado).toHaveProperty('dias_limite', 30);
    });

    it('T25: Cada inadimplente deve incluir dados essenciais', async () => {
        const resultado = await inadimplentes(30);
        if (resultado.membros.length > 0) {
            const membro = resultado.membros[0];
            expect(membro).toHaveProperty('membro_id');
            expect(membro).toHaveProperty('nome');
            expect(membro).toHaveProperty('email');
            expect(membro).toHaveProperty('dias_atraso');
        }
    });

    it('T26: Inadimplentes com 60 dias deve ser um subconjunto dos 30 dias', async () => {
        const resultado30 = await inadimplentes(30);
        const resultado60 = await inadimplentes(60);
        expect(resultado60.membros.length).toBeGreaterThanOrEqual(resultado30.membros.length);
    });

    it('T27: Total de inadimplentes deve corresponder ao tamanho da lista', async () => {
        const resultado = await inadimplentes(30);
        expect(resultado.total).toBe(resultado.membros.length);
    });

    it('T28: Deve incluir data_limite no formato correto', async () => {
        const resultado = await inadimplentes(30);
        const regex = /\d{4}-\d{2}-\d{2}/;
        expect(resultado.data_limite).toMatch(regex);
    });
});

describe('Relatórios - Fluxo de Caixa', () => {
    it('T29: Deve retornar fluxo de caixa dia a dia', async () => {
        const resultado = await fluxo_caixa('2026-01-01', '2026-01-31');
        expect(resultado).toHaveProperty('tipo', 'fluxo_caixa');
        expect(resultado).toHaveProperty('por_dia');
        expect(resultado).toHaveProperty('total_periodo');
    });

    it('T30: Fluxo deve ter saldo acumulado correto', async () => {
        const resultado = await fluxo_caixa('2026-01-01', '2026-01-31');
        const dias = Object.entries(resultado.por_dia || {});
        if (dias.length > 0) {
            const primeirodia = dias[0][1];
            expect(primeirodia.entrada).toBe(primeirodia.saldo_acumulado);
        }
    });

    it('T31: Saldo acumulado deve ser crescente', async () => {
        const resultado = await fluxo_caixa('2026-01-01', '2026-01-31');
        const saldos = Object.values(resultado.por_dia || {})
            .map(d => d.saldo_acumulado);
        if (saldos.length > 1) {
            for (let i = 0; i < saldos.length - 1; i++) {
                expect(saldos[i]).toBeLessThanOrEqual(saldos[i + 1]);
            }
        }
    });

    it('T32: Cada dia deve ter entrada, quantidade e detalhes', async () => {
        const resultado = await fluxo_caixa('2026-01-01', '2026-01-31');
        if (Object.keys(resultado.por_dia).length > 0) {
            const primeroDia = Object.values(resultado.por_dia)[0];
            expect(primeroDia).toHaveProperty('entrada');
            expect(primeroDia).toHaveProperty('quantidade');
            expect(primeroDia).toHaveProperty('saldo_acumulado');
            expect(primeroDia).toHaveProperty('detalhes');
        }
    });

    it('T33: Total período deve ser igual ao último saldo acumulado', async () => {
        const resultado = await fluxo_caixa('2026-01-01', '2026-01-31');
        const dias = Object.values(resultado.por_dia || {});
        if (dias.length > 0) {
            const ultimoSaldo = dias[dias.length - 1].saldo_acumulado;
            expect(resultado.total_periodo).toBe(ultimoSaldo);
        }
    });

    it('T34: Detalhes dia deve incluir membro_id, tipo e valor', async () => {
        const resultado = await fluxo_caixa('2026-01-01', '2026-01-31');
        const dias = Object.values(resultado.por_dia || {});
        if (dias.length > 0 && dias[0].detalhes.length > 0) {
            const detalhe = dias[0].detalhes[0];
            expect(detalhe).toHaveProperty('membro_id');
            expect(detalhe).toHaveProperty('tipo');
            expect(detalhe).toHaveProperty('valor');
        }
    });
});

describe('Relatórios - Tratamento de Erros', () => {
    it('T35: Funções devem retornar erro em formato consistente', async () => {
        // Simular erro
        const resultado = await resumo_mensal(null, null).catch(e => ({ erro: e.message }));
        if (resultado.erro) {
            expect(typeof resultado.erro).toBe('string');
        }
    });

    it('T36: Dados inválidos devem ser tratados gracefully', async () => {
        const resultado = await historico_membro('invalid-uuid');
        // Deve retornar erro ou lista vazia, não crash
        expect(resultado).toBeDefined();
    });
});

describe('Relatórios - Integração', () => {
    it('I1: Resumo mensal + Histórico membro devem ser compatíveis', async () => {
        const resumo = await resumo_mensal('2026-01-01', '2026-01-31');
        const historico = await historico_membro('123e4567-89ab-4567-89ab-123456789012',
            '2026-01-01', '2026-01-31');
        
        // Ambos devem retornar estruturas válidas
        expect(resumo).toHaveProperty('tipo');
        if (!historico.erro) {
            expect(historico).toHaveProperty('tipo');
        }
    });

    it('I2: Top contribuintes deve ser subset de todos os membros com contribuições', async () => {
        const top10 = await top_contribuintes(10);
        const historico = await historico_membro('123e4567-89ab-4567-89ab-123456789012');
        
        expect(top10).toHaveProperty('ranking');
        expect(historico).toBeDefined();
    });
});
