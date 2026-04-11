// =============================================================
// CongregaFiel - Relatórios Financeiros (Frontend)
// Lógica para gerar, visualizar e exportar relatórios
// =============================================================

class RelatoriosApp {
    constructor() {
        this.relatorioAtual = 'resumo-mensal';
        this.apiServico = null;
        this.usuarioId = null;
        this.igrejaId = null;
        this.pendentes = [];
        this.charts = [];
        this.init();
    }

    async init() {
        // Verificar autenticação
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '../login.html';
            return;
        }

        this.usuarioId = localStorage.getItem('usuarioId');
        this.igrejaId = localStorage.getItem('igrejaId');

        // Inicializar API Serviço
        this.apiServico = new ApiServico(token);

        // Configurar event listeners
        this.setupEventListeners();

        // Gerar relatório inicial
        await this.gerarRelatorio();
    }

    setupEventListeners() {
        // Seleção de relatório
        document.querySelectorAll('.btn-report').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.btn-report').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.relatorioAtual = e.target.dataset.report;
                this.atualizarFiltros();
            });
        });

        // Botões
        document.getElementById('btn-gerar-relatorio').addEventListener('click', () => this.gerarRelatorio());
        document.getElementById('btn-exportar-pdf').addEventListener('click', () => this.exportarPDF());
        document.getElementById('btn-logout').addEventListener('click', () => this.logout());
    }

    atualizarFiltros() {
        const container = document.getElementById('filters-container');
        container.innerHTML = '';

        const filtros = {
            'resumo-mensal': `
                <div class="filter-group">
                    <label>Data Início</label>
                    <input type="date" id="data-inicio" value="${this.getDataAnterior(30)}">
                </div>
                <div class="filter-group">
                    <label>Data Fim</label>
                    <input type="date" id="data-fim" value="${this.getDataHoje()}">
                </div>
            `,
            'historico-membro': `
                <div class="filter-group">
                    <label>Membro</label>
                    <select id="membro-id">
                        <option value="">Selecionando...</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Data Início (opcional)</label>
                    <input type="date" id="data-inicio">
                </div>
                <div class="filter-group">
                    <label>Data Fim (opcional)</label>
                    <input type="date" id="data-fim">
                </div>
            `,
            'comparativo-anual': `
                <div class="filter-group">
                    <label>Ano 1</label>
                    <input type="text" id="ano1" value="${new Date().getFullYear() - 1}" pattern="\\d{4}">
                </div>
                <div class="filter-group">
                    <label>Ano 2</label>
                    <input type="text" id="ano2" value="${new Date().getFullYear()}" pattern="\\d{4}">
                </div>
            `,
            'top-contribuintes': `
                <div class="filter-group">
                    <label>Limite de Resultados</label>
                    <input type="number" id="limite" value="10" min="1" max="100">
                </div>
                <div class="filter-group">
                    <label>Data Início (opcional)</label>
                    <input type="date" id="data-inicio">
                </div>
                <div class="filter-group">
                    <label>Data Fim (opcional)</label>
                    <input type="date" id="data-fim">
                </div>
            `,
            'inadimplentes': `
                <div class="filter-group">
                    <label>Dias de Atraso</label>
                    <input type="number" id="dias-atraso" value="30" min="1">
                </div>
            `,
            'fluxo-caixa': `
                <div class="filter-group">
                    <label>Data Início</label>
                    <input type="date" id="data-inicio" value="${this.getDataAnterior(30)}">
                </div>
                <div class="filter-group">
                    <label>Data Fim</label>
                    <input type="date" id="data-fim" value="${this.getDataHoje()}">
                </div>
            `,
        };

        container.innerHTML = filtros[this.relatorioAtual] || '';

        // Carregar membros para relatório de histórico
        if (this.relatorioAtual === 'historico-membro') {
            this.carregarMembros();
        }
    }

    async carregarMembros() {
        try {
            const membros = await this.apiServico.obterMembros();
            const select = document.getElementById('membro-id');
            select.innerHTML = '<option value="">Selecione um membro...</option>';
            
            membros.forEach(membro => {
                const option = document.createElement('option');
                option.value = membro.id;
                option.textContent = membro.nome_completo;
                select.appendChild(option);
            });
        } catch (erro) {
            console.error('Erro ao carregar membros:', erro);
        }
    }

    async gerarRelatorio() {
        this.mostrarCarregamento(true);
        
        try {
            let dados;

            switch (this.relatorioAtual) {
                case 'resumo-mensal':
                    dados = await this.obterResmuoMensal();
                    break;
                case 'historico-membro':
                    dados = await this.obterHistoricoMembro();
                    break;
                case 'comparativo-anual':
                    dados = await this.obterComparativoAnual();
                    break;
                case 'top-contribuintes':
                    dados = await this.obterTopContribuintes();
                    break;
                case 'inadimplentes':
                    dados = await this.obterInadimplentes();
                    break;
                case 'fluxo-caixa':
                    dados = await this.obterFluxoCaixa();
                    break;
                default:
                    throw new Error('Relatório inválido');
            }

            this.renderizarRelatorio(dados);
            this.mostrarCarregamento(false);
        } catch (erro) {
            this.mostrarErro(erro.message);
            this.mostrarCarregamento(false);
        }
    }

    async obterResmuoMensal() {
        const dataInicio = document.getElementById('data-inicio').value;
        const dataFim = document.getElementById('data-fim').value;
        
        if (!dataInicio || !dataFim) {
            throw new Error('Data início e fim são obrigatórias');
        }

        return await fetch(
            `/api/relatorios/resumo-mensal?data_inicio=${dataInicio}&data_fim=${dataFim}`,
            {
                headers: { 'Authorization': `Bearer ${this.apiServico.token}` }
            }
        ).then(r => r.json());
    }

    async obterHistoricoMembro() {
        const membroId = document.getElementById('membro-id').value;
        const dataInicio = document.getElementById('data-inicio').value;
        const dataFim = document.getElementById('data-fim').value;

        if (!membroId) {
            throw new Error('Selecione um membro');
        }

        let url = `/api/relatorios/historico/${membroId}`;
        const params = new URLSearchParams();
        if (dataInicio) params.append('data_inicio', dataInicio);
        if (dataFim) params.append('data_fim', dataFim);
        if (params.toString()) url += `?${params.toString()}`;

        return await fetch(url, {
            headers: { 'Authorization': `Bearer ${this.apiServico.token}` }
        }).then(r => r.json());
    }

    async obterComparativoAnual() {
        const ano1 = document.getElementById('ano1').value;
        const ano2 = document.getElementById('ano2').value;

        if (!ano1 || !ano2) {
            throw new Error('Anos são obrigatórios');
        }

        return await fetch(
            `/api/relatorios/comparativo-anual?ano1=${ano1}&ano2=${ano2}`,
            {
                headers: { 'Authorization': `Bearer ${this.apiServico.token}` }
            }
        ).then(r => r.json());
    }

    async obterTopContribuintes() {
        const limite = document.getElementById('limite').value || 10;
        const dataInicio = document.getElementById('data-inicio').value;
        const dataFim = document.getElementById('data-fim').value;

        let url = `/api/relatorios/top-contribuintes?limite=${limite}`;
        if (dataInicio) url += `&data_inicio=${dataInicio}`;
        if (dataFim) url += `&data_fim=${dataFim}`;

        return await fetch(url, {
            headers: { 'Authorization': `Bearer ${this.apiServico.token}` }
        }).then(r => r.json());
    }

    async obterInadimplentes() {
        const diasAtraso = document.getElementById('dias-atraso').value || 30;

        return await fetch(
            `/api/relatorios/inadimplentes?dias_atraso=${diasAtraso}`,
            {
                headers: { 'Authorization': `Bearer ${this.apiServico.token}` }
            }
        ).then(r => r.json());
    }

    async obterFluxoCaixa() {
        const dataInicio = document.getElementById('data-inicio').value;
        const dataFim = document.getElementById('data-fim').value;

        if (!dataInicio || !dataFim) {
            throw new Error('Data início e fim são obrigatórias');
        }

        return await fetch(
            `/api/relatorios/fluxo-caixa?data_inicio=${dataInicio}&data_fim=${dataFim}`,
            {
                headers: { 'Authorization': `Bearer ${this.apiServico.token}` }
            }
        ).then(r => r.json());
    }

    renderizarRelatorio(dados) {
        const container = document.getElementById('relatorio-container');
        this.apagarCharts();

        switch (this.relatorioAtual) {
            case 'resumo-mensal':
                this.renderizarResumoMensal(dados, container);
                break;
            case 'historico-membro':
                this.renderizarHistoricoMembro(dados, container);
                break;
            case 'comparativo-anual':
                this.renderizarComparativoAnual(dados, container);
                break;
            case 'top-contribuintes':
                this.renderizarTopContribuintes(dados, container);
                break;
            case 'inadimplentes':
                this.renderizarInadimplentes(dados, container);
                break;
            case 'fluxo-caixa':
                this.renderizarFluxoCaixa(dados, container);
                break;
        }
    }

    renderizarResumoMensal(dados, container) {
        let html = `
            <div class="relatorio-header">
                <h2>📅 Resumo Mensal de Contribuições</h2>
                <div class="periodo">${dados.periodo.inicio} a ${dados.periodo.fim}</div>
                <div class="total-geral">Total: <strong>R$ ${this.formatarValor(dados.total_geral)}</strong></div>
            </div>
            <div class="relatorio-content">
                <div class="chart-container">
                    <canvas id="chart-resumo-mensal"></canvas>
                </div>
                <table class="relatorio-table">
                    <thead>
                        <tr>
                            <th>Mês</th>
                            <th>Total</th>
                            <th>Quantidade</th>
                            <th>Detalhes</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        Object.entries(dados.dados).forEach(([mes, dados_mes]) => {
            const detalhes = Object.entries(dados_mes.tipos)
                .map(([tipo, valor]) => `${tipo}: R$ ${this.formatarValor(valor)}`)
                .join('<br>');
            
            html += `
                <tr>
                    <td>${this.formatarMes(mes)}</td>
                    <td><strong>R$ ${this.formatarValor(dados_mes.total)}</strong></td>
                    <td>${dados_mes.quantidade}</td>
                    <td><small>${detalhes}</small></td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;

        // Gráfico
        setTimeout(() => {
            this.criarGraficoResumoMensal(dados.dados);
        }, 100);
    }

    renderizarHistoricoMembro(dados, container) {
        if (dados.erro) {
            container.innerHTML = `<div class="error">Erro: ${dados.erro}</div>`;
            return;
        }

        let html = `
            <div class="relatorio-header">
                <h2>👤 Histórico de Contribuições</h2>
                <div class="membro-info">
                    <strong>${dados.membro.nome}</strong>
                    <br><small>${dados.membro.email}</small>
                </div>
                <div class="total-geral">Total: <strong>R$ ${this.formatarValor(dados.total_geral)}</strong></div>
            </div>
            <div class="relatorio-content">
                <table class="relatorio-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Tipo</th>
                            <th>Valor</th>
                            <th>Descrição</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        dados.contribuicoes.forEach(contrib => {
            html += `
                <tr>
                    <td>${this.formatarData(contrib.data)}</td>
                    <td>${this.formatarTipo(contrib.tipo)}</td>
                    <td><strong>R$ ${this.formatarValor(contrib.valor)}</strong></td>
                    <td>${contrib.descricao || '-'}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    renderizarComparativoAnual(dados, container) {
        let html = `
            <div class="relatorio-header">
                <h2>📈 Comparativo Anual</h2>
                <div class="periodo">${dados.anos[0]} vs ${dados.anos[1]}</div>
            </div>
            <div class="relatorio-content">
                <div class="stats-container">
                    <div class="stat-box">
                        <div class="stat-label">${dados.anos[0]}</div>
                        <div class="stat-value">R$ ${this.formatarValor(dados.total_ano1)}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">${dados.anos[1]}</div>
                        <div class="stat-value">R$ ${this.formatarValor(dados.total_ano2)}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Diferença</div>
                        <div class="stat-value ${(dados.total_ano2 - dados.total_ano1) >= 0 ? 'positive' : 'negative'}">
                            R$ ${this.formatarValor(Math.abs(dados.total_ano2 - dados.total_ano1))}
                        </div>
                    </div>
                </div>
                <div class="chart-container">
                    <canvas id="chart-comparativo"></canvas>
                </div>
            </div>
        `;

        container.innerHTML = html;

        setTimeout(() => {
            this.criarGraficoComparativoAnual(dados);
        }, 100);
    }

    renderizarTopContribuintes(dados, container) {
        let html = `
            <div class="relatorio-header">
                <h2>🏆 Top ${dados.ranking.length} Contribuintes</h2>
                <div class="total-geral">Total: <strong>R$ ${this.formatarValor(dados.total_geral)}</strong></div>
            </div>
            <div class="relatorio-content">
                <table class="relatorio-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Total Contribuído</th>
                            <th>Quantidade</th>
                            <th>Média</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        dados.ranking.forEach((membro, idx) => {
            const media = membro.total / membro.contribuicoes;
            html += `
                <tr>
                    <td><strong>#${idx + 1}</strong></td>
                    <td>${membro.nome}</td>
                    <td><small>${membro.email}</small></td>
                    <td><strong>R$ ${this.formatarValor(membro.total)}</strong></td>
                    <td>${membro.contribuicoes}</td>
                    <td>R$ ${this.formatarValor(media)}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    renderizarInadimplentes(dados, container) {
        let html = `
            <div class="relatorio-header">
                <h2>⚠️ Membros Inadimplentes</h2>
                <div class="periodo">Atraso: ${dados.dias_limite} dias</div>
                <div class="total-geral">Total de Inadimplentes: <strong>${dados.total}</strong></div>
            </div>
            <div class="relatorio-content">
                ${dados.membros.length === 0 ? '<div class="success">Nenhum membro inadimplente!</div>' : `
                    <table class="relatorio-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Email</th>
                                <th>Última Contribuição</th>
                                <th>Dias de Atraso</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dados.membros.map(membro => `
                                <tr class="row-warning">
                                    <td>${membro.nome}</td>
                                    <td><small>${membro.email}</small></td>
                                    <td>${membro.ultima_contribuicao ? this.formatarData(membro.ultima_contribuicao) : 'Nunca'}</td>
                                    <td><strong>${typeof membro.dias_atraso === 'number' ? membro.dias_atraso + ' dias' : membro.dias_atraso}</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        `;

        container.innerHTML = html;
    }

    renderizarFluxoCaixa(dados, container) {
        let html = `
            <div class="relatorio-header">
                <h2>💰 Fluxo de Caixa</h2>
                <div class="periodo">${dados.periodo.inicio} a ${dados.periodo.fim}</div>
                <div class="total-geral">Total do Período: <strong>R$ ${this.formatarValor(dados.total_periodo)}</strong></div>
            </div>
            <div class="relatorio-content">
                <div class="chart-container">
                    <canvas id="chart-fluxo-caixa"></canvas>
                </div>
                <table class="relatorio-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Entrada</th>
                            <th>Quantidade</th>
                            <th>Saldo Acumulado</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        Object.entries(dados.por_dia).forEach(([data, dados_dia]) => {
            html += `
                <tr>
                    <td>${this.formatarData(data)}</td>
                    <td><strong>R$ ${this.formatarValor(dados_dia.entrada)}</strong></td>
                    <td>${dados_dia.quantidade}</td>
                    <td><strong>R$ ${this.formatarValor(dados_dia.saldo_acumulado)}</strong></td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;

        setTimeout(() => {
            this.criarGraficoFluxoCaixa(dados.por_dia);
        }, 100);
    }

    criarGraficoResumoMensal(dados) {
        const meses = Object.keys(dados).map(m => this.formatarMes(m));
        const totais = Object.values(dados).map(d => d.total);

        const ctx = document.getElementById('chart-resumo-mensal');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: meses,
                datasets: [{
                    label: 'Contribuições por Mês',
                    data: totais,
                    backgroundColor: '#4CAF50',
                    borderColor: '#45a049',
                    borderWidth: 1,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => 'R$ ' + this.formatarValor(value)
                        }
                    }
                }
            }
        });

        this.charts.push(chart);
    }

    criarGraficoComparativoAnual(dados) {
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const dados1 = meses.map((_, i) => dados.por_mes[`mes_${(i + 1).toString().padStart(2, '0')}`]?.[dados.anos[0]] || 0);
        const dados2 = meses.map((_, i) => dados.por_mes[`mes_${(i + 1).toString().padStart(2, '0')}`]?.[dados.anos[1]] || 0);

        const ctx = document.getElementById('chart-comparativo');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: meses,
                datasets: [
                    {
                        label: dados.anos[0],
                        data: dados1,
                        borderColor: '#FF9800',
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        tension: 0.4,
                    },
                    {
                        label: dados.anos[1],
                        data: dados2,
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        tension: 0.4,
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => 'R$ ' + this.formatarValor(value)
                        }
                    }
                }
            }
        });

        this.charts.push(chart);
    }

    criarGraficoFluxoCaixa(dados) {
        const datas = Object.keys(dados).map(d => d.substring(8));
        const saldos = Object.values(dados).map(d => d.saldo_acumulado);

        const ctx = document.getElementById('chart-fluxo-caixa');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: datas,
                datasets: [{
                    label: 'Saldo Acumulado',
                    data: saldos,
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    fill: true,
                    tension: 0.4,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => 'R$ ' + this.formatarValor(value)
                        }
                    }
                }
            }
        });

        this.charts.push(chart);
    }

    async exportarPDF() {
        const { jsPDF } = window.jspdf;
        const elemento = document.getElementById('relatorio-container');

        if (!elemento) {
            this.mostrarErro('Nenhum relatório para exportar');
            return;
        }

        this.mostrarCarregamento(true);

        try {
            const canvas = await html2canvas(elemento, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210;
            const pageHeight = 295;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            // Adicionar cabeçalho
            pdf.setFontSize(16);
            pdf.text('CongregaFiel - Relatório Financeiro', 10, 10);
            pdf.setFontSize(10);
            pdf.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 10, 20);
            position = 30;

            // Adicionar imagem
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= (pageHeight - position);

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`relatorio-${this.relatorioAtual}-${new Date().getTime()}.pdf`);
            this.mostrarCarregamento(false);
        } catch (erro) {
            this.mostrarErro('Erro ao exportar PDF: ' + erro.message);
            this.mostrarCarregamento(false);
        }
    }

    // Utilitários
    formatarValor(valor) {
        return (typeof valor === 'number' ? valor : 0).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    formatarData(data) {
        return new Date(data).toLocaleDateString('pt-BR');
    }

    formatarMes(mes) {
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const [ano, mesNum] = mes.split('-');
        return `${meses[parseInt(mesNum) - 1]} de ${ano}`;
    }

    formatarTipo(tipo) {
        const tipos = {
            'dizimo': 'Dízimo',
            'oferta': 'Oferta',
            'doacao': 'Doação',
            'outro': 'Outro'
        };
        return tipos[tipo] || tipo;
    }

    getDataAnterior(dias) {
        const data = new Date();
        data.setDate(data.getDate() - dias);
        return data.toISOString().split('T')[0];
    }

    getDataHoje() {
        return new Date().toISOString().split('T')[0];
    }

    mostrarCarregamento(mostrar) {
        document.getElementById('loading-modal').classList.toggle('hidden', !mostrar);
    }

    mostrarErro(mensagem) {
        document.getElementById('error-message').textContent = mensagem;
        document.getElementById('error-modal').classList.remove('hidden');
    }

    apagarCharts() {
        this.charts.forEach(chart => chart.destroy());
        this.charts = [];
    }

    logout() {
        localStorage.clear();
        window.location.href = '../login.html';
    }
}

// Inicializar quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    new RelatoriosApp();
});
