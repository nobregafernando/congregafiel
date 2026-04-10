// =============================================================
// Utilitários de Relatórios - Express.js
// Funções para gerar relatórios consolidados
// =============================================================

/**
 * Resumo Mensal: Agrupa contribuições por mês com totais
 */
async function resumo_mensal(data_inicio, data_fim) {
    try {
        // Simulação - Em produção, consultar Supabase
        const contribuicoes = await obterContribuicoes(data_inicio, data_fim);
        
        const resumo = {};
        for (const contrib of contribuicoes) {
            const data_parts = contrib.data.split('-');
            const mes_key = `${data_parts[0]}-${data_parts[1]}`;
            
            if (!resumo[mes_key]) {
                resumo[mes_key] = { total: 0, quantidade: 0, tipos: {} };
            }
            
            resumo[mes_key].total += contrib.valor;
            resumo[mes_key].quantidade += 1;
            
            const tipo = contrib.tipo;
            if (!resumo[mes_key].tipos[tipo]) {
                resumo[mes_key].tipos[tipo] = 0;
            }
            resumo[mes_key].tipos[tipo] += contrib.valor;
        }
        
        const resumo_ordenado = {};
        for (const mes of Object.keys(resumo).sort()) {
            resumo_ordenado[mes] = resumo[mes];
        }
        
        return {
            tipo: 'resumo_mensal',
            periodo: { inicio: data_inicio, fim: data_fim },
            dados: resumo_ordenado,
            total_geral: Object.values(resumo_ordenado).reduce((sum, item) => sum + item.total, 0),
        };
    } catch (erro) {
        return { erro: erro.message };
    }
}

/**
 * Histórico de Membro: Retorna todas as contribuições de um membro
 */
async function historico_membro(membro_id, data_inicio = null, data_fim = null) {
    try {
        // Validar membro existe
        const membro = await obterMembro(membro_id);
        if (!membro) {
            return { erro: 'Membro não encontrado', status: 404 };
        }
        
        let contribuicoes = await obterContribuicoesMembro(membro_id, data_inicio, data_fim);
        contribuicoes.sort((a, b) => new Date(b.data) - new Date(a.data));
        
        const totais = {};
        for (const c of contribuicoes) {
            if (!totais[c.tipo]) {
                totais[c.tipo] = 0;
            }
            totais[c.tipo] += c.valor;
        }
        
        return {
            tipo: 'historico_membro',
            membro: {
                id: membro.id,
                nome: membro.nome_completo,
                email: membro.email,
            },
            periodo: { inicio: data_inicio || 'indefinido', fim: data_fim || 'indefinido' },
            contribuicoes: contribuicoes,
            totais_por_tipo: totais,
            total_geral: Object.values(totais).reduce((a, b) => a + b, 0),
            quantidade: contribuicoes.length,
        };
    } catch (erro) {
        return { erro: erro.message };
    }
}

/**
 * Comparativo Anual: Compara dois anos mês a mês
 */
async function comparativo_anual(ano1, ano2) {
    try {
        const data1_inicio = `${ano1}-01-01`;
        const data1_fim = `${ano1}-12-31`;
        const data2_inicio = `${ano2}-01-01`;
        const data2_fim = `${ano2}-12-31`;
        
        const contrib1 = await obterContribuicoes(data1_inicio, data1_fim);
        const contrib2 = await obterContribuicoes(data2_inicio, data2_fim);
        
        const agruparPorMes = (contribuicoes) => {
            const grupo = {};
            for (const c of contribuicoes) {
                const mes = c.data.substring(5, 7);
                const chave = `mes_${mes}`;
                if (!grupo[chave]) grupo[chave] = 0;
                grupo[chave] += c.valor;
            }
            return grupo;
        };
        
        const meses1 = agruparPorMes(contrib1);
        const meses2 = agruparPorMes(contrib2);
        
        const comparacao = {};
        for (let i = 1; i <= 12; i++) {
            const mes_key = `mes_${String(i).padStart(2, '0')}`;
            const v1 = meses1[mes_key] || 0;
            const v2 = meses2[mes_key] || 0;
            comparacao[mes_key] = {
                [ano1]: v1,
                [ano2]: v2,
                diferenca: v2 - v1,
                percentual: v1 > 0 ? ((v2 - v1) / v1) * 100 : 0,
            };
        }
        
        return {
            tipo: 'comparativo_anual',
            anos: [ano1, ano2],
            por_mes: comparacao,
            total_ano1: Object.values(meses1).reduce((a, b) => a + b, 0),
            total_ano2: Object.values(meses2).reduce((a, b) => a + b, 0),
        };
    } catch (erro) {
        return { erro: erro.message };
    }
}

/**
 * Top Contribuintes: Ranking dos maiores contribuintes
 */
async function top_contribuintes(limite = 10, data_inicio = null, data_fim = null) {
    try {
        const query = data_inicio && data_fim
            ? await obterContribuicoes(data_inicio, data_fim)
            : await obterTodasContribuicoes();
        
        const por_membro = {};
        for (const c of query) {
            if (!por_membro[c.membro_id]) {
                por_membro[c.membro_id] = {
                    membro_id: c.membro_id,
                    nome: c.membro_nome || 'Desconhecido',
                    email: '',
                    total: 0,
                    contribuicoes: 0,
                };
            }
            por_membro[c.membro_id].total += c.valor;
            por_membro[c.membro_id].contribuicoes += 1;
        }
        
        const top = Object.values(por_membro)
            .sort((a, b) => b.total - a.total)
            .slice(0, limite);
        
        return {
            tipo: 'top_contribuintes',
            limite: limite,
            periodo: { inicio: data_inicio, fim: data_fim },
            ranking: top,
            total_geral: top.reduce((sum, item) => sum + item.total, 0),
        };
    } catch (erro) {
        return { erro: erro.message };
    }
}

/**
 * Inadimplentes: Membros com pagamentos atrasados
 */
async function inadimplentes(dias_atraso = 30) {
    try {
        const data_limite = new Date();
        data_limite.setDate(data_limite.getDate() - dias_atraso);
        const data_limite_str = data_limite.toISOString().split('T')[0];
        
        const membros = await obterTodosMembros();
        const inadimplentes_list = [];
        
        for (const membro of membros) {
            const ultima_contrib = await obterUltimaContribuicao(membro.id);
            
            if (!ultima_contrib) {
                inadimplentes_list.push({
                    membro_id: membro.id,
                    nome: membro.nome_completo,
                    email: membro.email,
                    dias_atraso: 'Nunca contribuiu',
                    ultima_contribuicao: null,
                });
            } else if (ultima_contrib.data < data_limite_str) {
                const ultima_date = new Date(ultima_contrib.data);
                const dias = Math.floor((new Date() - ultima_date) / (1000 * 60 * 60 * 24));
                inadimplentes_list.push({
                    membro_id: membro.id,
                    nome: membro.nome_completo,
                    email: membro.email,
                    dias_atraso: dias,
                    ultima_contribuicao: ultima_contrib.data,
                });
            }
        }
        
        return {
            tipo: 'inadimplentes',
            dias_limite: dias_atraso,
            data_limite: data_limite_str,
            total: inadimplentes_list.length,
            membros: inadimplentes_list,
        };
    } catch (erro) {
        return { erro: erro.message };
    }
}

/**
 * Fluxo de Caixa: Entradas dia a dia com saldo acumulado
 */
async function fluxo_caixa(data_inicio, data_fim) {
    try {
        const contribuicoes = await obterContribuicoes(data_inicio, data_fim);
        
        const fluxo = {};
        for (const c of contribuicoes) {
            if (!fluxo[c.data]) {
                fluxo[c.data] = { entrada: 0, quantidade: 0, detalhes: [] };
            }
            fluxo[c.data].entrada += c.valor;
            fluxo[c.data].quantidade += 1;
            fluxo[c.data].detalhes.push({
                membro_id: c.membro_id,
                tipo: c.tipo,
                valor: c.valor,
            });
        }
        
        const fluxo_ordenado = {};
        let saldo_acumulado = 0;
        for (const data of Object.keys(fluxo).sort()) {
            saldo_acumulado += fluxo[data].entrada;
            fluxo_ordenado[data] = {
                ...fluxo[data],
                saldo_acumulado: saldo_acumulado,
            };
        }
        
        return {
            tipo: 'fluxo_caixa',
            periodo: { inicio: data_inicio, fim: data_fim },
            por_dia: fluxo_ordenado,
            total_periodo: Object.values(fluxo_ordenado)
                .reduce((sum, item) => sum + item.entrada, 0),
        };
    } catch (erro) {
        return { erro: erro.message };
    }
}

// =============================================
// FUNÇÕES AUXILIARES (stubs para integração)
// =============================================

// Estas funções devem integrar com Supabase em produção
async function obterContribuicoes(data_inicio, data_fim) {
    // Stub - retorna array vazio
    return [];
}

async function obterTodasContribuicoes() {
    return [];
}

async function obterContribuicoesMembro(membro_id, data_inicio, data_fim) {
    return [];
}

async function obterMembro(membro_id) {
    return null;
}

async function obterTodosMembros() {
    return [];
}

async function obterUltimaContribuicao(membro_id) {
    return null;
}

module.exports = {
    resumo_mensal,
    historico_membro,
    comparativo_anual,
    top_contribuintes,
    inadimplentes,
    fluxo_caixa,
};
