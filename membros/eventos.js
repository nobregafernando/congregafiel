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

const MONTHS_SHORT = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

function parseDateParts(dateStr) {
    const d = new Date(dateStr);
    return { day: d.getDate(), month: MONTHS_SHORT[d.getMonth()] };
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

/* ===== Load Events ===== */
const todosEventos = JSON.parse(localStorage.getItem('cf_eventos') || '[]');
const eventosIgreja = todosEventos
    .filter(e => e.igrejaId === sessao.igrejaId)
    .sort((a, b) => (a.data || '').localeCompare(b.data || ''));

const grid = document.getElementById('eventosGrid');
const emptyState = document.getElementById('emptyState');

if (eventosIgreja.length === 0) {
    grid.style.display = 'none';
    emptyState.style.display = '';
} else {
    eventosIgreja.forEach(ev => {
        const dp = parseDateParts(ev.data);
        const card = document.createElement('div');
        card.className = 'evento-card';
        card.innerHTML = `
            <div class="evento-card-top">
                <div class="evento-badge">
                    <span class="day">${dp.day}</span>
                    <span class="month">${dp.month}</span>
                </div>
                <div class="evento-card-info">
                    <h3>${esc(ev.titulo || ev.nome)}</h3>
                    <div class="evento-meta">
                        ${ev.horario ? `<span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            ${esc(ev.horario)}
                        </span>` : ''}
                        ${ev.local ? `<span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            ${esc(ev.local)}
                        </span>` : ''}
                    </div>
                </div>
            </div>
            ${ev.descricao ? `<div class="evento-card-body"><p>${esc(ev.descricao)}</p></div>` : ''}
        `;
        grid.appendChild(card);
    });
}

/* ===== Logout ===== */
document.getElementById('btnSair').addEventListener('click', (ev) => {
    ev.preventDefault();
    localStorage.removeItem('cf_sessao');
    window.location.href = '../index.html';
});
