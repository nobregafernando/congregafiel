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

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast ' + type + ' show';
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

/* ===== Form Toggle ===== */
const formCard   = document.getElementById('formCard');
const btnNovo    = document.getElementById('btnNovoPedido');
const btnCancel  = document.getElementById('btnCancelar');
const formPedido = document.getElementById('formPedido');
const textPedido = document.getElementById('textPedido');

btnNovo.addEventListener('click', () => {
    formCard.style.display = '';
    textPedido.focus();
    btnNovo.style.display = 'none';
});

btnCancel.addEventListener('click', () => {
    formCard.style.display = 'none';
    formPedido.reset();
    btnNovo.style.display = '';
});

/* ===== Submit ===== */
formPedido.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const texto = textPedido.value.trim();
    if (!texto) return;

    const todos = JSON.parse(localStorage.getItem('cf_pedidos_oracao') || '[]');

    const novo = {
        id: generateId(),
        igrejaId: sessao.igrejaId,
        membroId: sessao.id,
        membroNome: sessao.nome,
        pedido: texto,
        status: 'pendente',
        criadoEm: new Date().toISOString()
    };

    todos.push(novo);
    localStorage.setItem('cf_pedidos_oracao', JSON.stringify(todos));

    formPedido.reset();
    formCard.style.display = 'none';
    btnNovo.style.display = '';

    showToast('Pedido de oração enviado com sucesso!', 'success');
    renderPedidos();
});

/* ===== Render ===== */
function renderPedidos() {
    const todos = JSON.parse(localStorage.getItem('cf_pedidos_oracao') || '[]');
    const meus = todos
        .filter(p => p.membroId === sessao.id)
        .sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));

    const lista = document.getElementById('pedidosList');
    const emptyState = document.getElementById('emptyState');

    lista.innerHTML = '';

    if (meus.length === 0) {
        lista.style.display = 'none';
        emptyState.style.display = '';
        return;
    }

    lista.style.display = '';
    emptyState.style.display = 'none';

    meus.forEach(p => {
        const statusClass = {
            'pendente': 'status-badge--pendente',
            'atendido': 'status-badge--atendido',
            'respondido': 'status-badge--respondido'
        }[p.status] || 'status-badge--pendente';

        const statusLabel = {
            'pendente': 'Pendente',
            'atendido': 'Atendido',
            'respondido': 'Respondido'
        }[p.status] || 'Pendente';

        const card = document.createElement('div');
        card.className = 'pedido-card';
        card.innerHTML = `
            <div class="pedido-card-body">${esc(p.pedido)}</div>
            <div class="pedido-card-footer">
                <span class="pedido-date">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    ${formatDate(p.criadoEm)}
                </span>
                <span class="status-badge ${statusClass}">${statusLabel}</span>
            </div>
        `;
        lista.appendChild(card);
    });
}

renderPedidos();

/* ===== Logout ===== */
document.getElementById('btnSair').addEventListener('click', (ev) => {
    ev.preventDefault();
    localStorage.removeItem('cf_sessao');
    window.location.href = '../index.html';
});
