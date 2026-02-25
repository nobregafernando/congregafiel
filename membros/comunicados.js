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
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/* ===== Load Comunicados ===== */
const todosComunicados = JSON.parse(localStorage.getItem('cf_comunicados') || '[]');
const comunicadosIgreja = todosComunicados
    .filter(c => c.igrejaId === sessao.igrejaId)
    .sort((a, b) => (b.criadoEm || b.data || '').localeCompare(a.criadoEm || a.data || ''));

const lista = document.getElementById('comunicadosList');
const emptyState = document.getElementById('emptyState');

if (comunicadosIgreja.length === 0) {
    lista.style.display = 'none';
    emptyState.style.display = '';
} else {
    comunicadosIgreja.forEach(c => {
        const isUrgente = c.prioridade === 'urgente';
        const card = document.createElement('div');
        card.className = 'comunicado-card' + (isUrgente ? ' urgente' : '');

        const prioClass = isUrgente ? 'priority-badge--urgente' : 'priority-badge--normal';
        const prioLabel = isUrgente ? 'Urgente' : 'Normal';
        const prioIcon = isUrgente
            ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
            : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

        card.innerHTML = `
            <div class="comunicado-card-header">
                <h3>${esc(c.titulo)}</h3>
                <span class="priority-badge ${prioClass}">${prioIcon} ${prioLabel}</span>
            </div>
            <div class="comunicado-card-body">${esc(c.conteudo || c.mensagem || '')}</div>
            <div class="comunicado-card-footer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ${formatDate(c.criadoEm || c.data)}
            </div>
        `;
        lista.appendChild(card);
    });
}

/* ===== Logout ===== */
document.getElementById('btnSair').addEventListener('click', (ev) => {
    ev.preventDefault();
    localStorage.removeItem('cf_sessao');
    window.location.href = '../index.html';
});
