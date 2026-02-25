/* ===== Auth Check ===== */
const sessao = JSON.parse(localStorage.getItem('cf_sessao') || 'null');
if (!sessao || sessao.tipo !== 'membro') {
    window.location.href = '../index.html';
}

/* ===== Sidebar / Topbar ===== */
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
const btnHamb = document.getElementById('btnHamburger');

btnHamb.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
});
overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
});

document.getElementById('topbarChurch').textContent = sessao.nomeIgreja || '';
document.getElementById('topbarName').textContent   = sessao.nome || '';
document.getElementById('topbarAvatar').textContent  = getInitials(sessao.nome);

/* ===== Helpers ===== */
function getInitials(name) {
    if (!name) return '?';
    const p = name.trim().split(' ');
    return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function esc(str) {
    const el = document.createElement('span');
    el.textContent = str || '';
    return el.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrency(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/* ===== Load Payments ===== */
const todosPagamentos = JSON.parse(localStorage.getItem('cf_pagamentos') || '[]');
const meusPagamentos = todosPagamentos
    .filter(p => p.igrejaId === sessao.igrejaId && p.membro === sessao.nome)
    .sort((a, b) => (b.data || b.criadoEm || '').localeCompare(a.data || a.criadoEm || ''));

const total = meusPagamentos.reduce((s, p) => s + Number(p.valor || 0), 0);
document.getElementById('totalValue').textContent = formatCurrency(total);
document.getElementById('totalCount').textContent = meusPagamentos.length;

const tableWrapper = document.getElementById('tableWrapper');
const tableBody    = document.getElementById('tableBody');
const paymentCards = document.getElementById('paymentCards');
const emptyState   = document.getElementById('emptyState');

if (meusPagamentos.length === 0) {
    emptyState.style.display = '';
} else {
    tableWrapper.style.display = '';
    paymentCards.style.display = '';

    meusPagamentos.forEach(p => {
        // Table row
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(p.data || p.criadoEm)}</td>
            <td><span class="type-badge">${esc(p.tipo || 'Geral')}</span></td>
            <td>${esc(p.descricao || '-')}</td>
            <td class="text-right value-cell">${formatCurrency(p.valor)}</td>
        `;
        tableBody.appendChild(tr);

        // Mobile card
        const card = document.createElement('div');
        card.className = 'payment-card';
        card.innerHTML = `
            <div class="payment-card-top">
                <span class="payment-card-type">${esc(p.tipo || 'Geral')}</span>
                <span class="payment-card-value">${formatCurrency(p.valor)}</span>
            </div>
            ${p.descricao ? `<p class="payment-card-desc">${esc(p.descricao)}</p>` : ''}
            <span class="payment-card-date">${formatDate(p.data || p.criadoEm)}</span>
        `;
        paymentCards.appendChild(card);
    });
}

/* ===== Logout ===== */
document.getElementById('btnSair').addEventListener('click', (ev) => {
    ev.preventDefault();
    localStorage.removeItem('cf_sessao');
    window.location.href = '../index.html';
});
