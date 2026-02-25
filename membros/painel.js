/* ===== Auth Check ===== */
const sessao = JSON.parse(localStorage.getItem('cf_sessao') || 'null');
if (!sessao || sessao.tipo !== 'membro') {
    window.location.href = '../index.html';
}

/* ===== Sidebar / Topbar ===== */
const sidebar    = document.getElementById('sidebar');
const overlay    = document.getElementById('sidebarOverlay');
const btnHamb    = document.getElementById('btnHamburger');

btnHamb.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
});

overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
});

/* Topbar populate */
document.getElementById('topbarChurch').textContent = sessao.nomeIgreja || '';
document.getElementById('topbarName').textContent   = sessao.nome || '';
document.getElementById('topbarAvatar').textContent  = getInitials(sessao.nome);

/* Welcome */
document.getElementById('welcomeTitle').textContent = `Bem-vindo, ${sessao.nome.split(' ')[0]}!`;
document.getElementById('welcomeSub').textContent   = sessao.nomeIgreja || '';

/* ===== Helpers ===== */
function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrency(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const MONTHS_SHORT = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

function parseDateParts(dateStr) {
    const d = new Date(dateStr);
    return { day: d.getDate(), month: MONTHS_SHORT[d.getMonth()] };
}

/* ===== Load Data ===== */
const igrejaId = sessao.igrejaId;

// Eventos
const todosEventos = JSON.parse(localStorage.getItem('cf_eventos') || '[]');
const agora = new Date().toISOString();
const eventosIgreja = todosEventos
    .filter(e => e.igrejaId === igrejaId && e.data >= agora.slice(0, 10))
    .sort((a, b) => a.data.localeCompare(b.data));

document.getElementById('statEventos').textContent = eventosIgreja.length;

// Pagamentos
const todosPagamentos = JSON.parse(localStorage.getItem('cf_pagamentos') || '[]');
const meusPagamentos = todosPagamentos.filter(p => p.igrejaId === igrejaId && p.membro === sessao.nome);
const totalPago = meusPagamentos.reduce((s, p) => s + Number(p.valor || 0), 0);
document.getElementById('statPagamentos').textContent = formatCurrency(totalPago);

// Comunicados
const todosComunicados = JSON.parse(localStorage.getItem('cf_comunicados') || '[]');
const comunicadosIgreja = todosComunicados
    .filter(c => c.igrejaId === igrejaId)
    .sort((a, b) => (b.criadoEm || b.data || '').localeCompare(a.criadoEm || a.data || ''));

document.getElementById('statComunicados').textContent = comunicadosIgreja.length;

// Pedidos de oração
const todosPedidos = JSON.parse(localStorage.getItem('cf_pedidos_oracao') || '[]');
const meusPedidos = todosPedidos.filter(p => p.membroId === sessao.id);
document.getElementById('statPedidos').textContent = meusPedidos.length;

/* ===== Render Comunicados ===== */
const listaCom = document.getElementById('listaComunicados');
if (comunicadosIgreja.length > 0) {
    listaCom.innerHTML = '';
    comunicadosIgreja.slice(0, 4).forEach(c => {
        const prioClass = c.prioridade === 'urgente' ? 'priority-badge--urgente' : 'priority-badge--normal';
        const prioLabel = c.prioridade === 'urgente' ? 'Urgente' : 'Normal';
        const div = document.createElement('div');
        div.className = 'comunicado-item';
        div.innerHTML = `
            <h4>${esc(c.titulo)} <span class="priority-badge ${prioClass}">${prioLabel}</span></h4>
            <p>${esc(c.conteudo || c.mensagem || '')}</p>
            <span class="comunicado-date">${formatDate(c.criadoEm || c.data)}</span>
        `;
        listaCom.appendChild(div);
    });
}

/* ===== Render Eventos ===== */
const listaEv = document.getElementById('listaEventos');
if (eventosIgreja.length > 0) {
    listaEv.innerHTML = '';
    eventosIgreja.slice(0, 4).forEach(e => {
        const dp = parseDateParts(e.data);
        const div = document.createElement('div');
        div.className = 'evento-item';
        div.innerHTML = `
            <div class="evento-date-badge">
                <span class="day">${dp.day}</span>
                <span class="month">${dp.month}</span>
            </div>
            <div class="evento-info">
                <h4>${esc(e.titulo || e.nome)}</h4>
                <p>${esc(e.horario || '')}${e.local ? ' &middot; ' + esc(e.local) : ''}</p>
            </div>
        `;
        listaEv.appendChild(div);
    });
}

/* ===== Logout ===== */
document.getElementById('btnSair').addEventListener('click', (ev) => {
    ev.preventDefault();
    localStorage.removeItem('cf_sessao');
    window.location.href = '../index.html';
});

/* ===== Escape HTML ===== */
function esc(str) {
    const el = document.createElement('span');
    el.textContent = str || '';
    return el.innerHTML;
}
