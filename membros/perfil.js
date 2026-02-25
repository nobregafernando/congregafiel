/* ===== Auth Check ===== */
let sessao = JSON.parse(localStorage.getItem('cf_sessao') || 'null');
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

/* ===== Helpers ===== */
function getInitials(name) {
    if (!name) return '?';
    const p = name.trim().split(' ');
    return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast ' + type + ' show';
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

/* ===== Populate Page ===== */
function populatePage() {
    document.getElementById('topbarChurch').textContent  = sessao.nomeIgreja || '';
    document.getElementById('topbarName').textContent    = sessao.nome || '';
    document.getElementById('topbarAvatar').textContent  = getInitials(sessao.nome);

    document.getElementById('profileAvatar').textContent = getInitials(sessao.nome);
    document.getElementById('profileName').textContent   = sessao.nome || '';
    document.getElementById('profileEmail').textContent  = sessao.email || '';

    document.getElementById('infoChurch').textContent = sessao.nomeIgreja || '';
    document.getElementById('infoCode').textContent   = sessao.codigoIgreja || '';
    document.getElementById('infoSince').textContent  = formatDate(sessao.logadoEm);

    document.getElementById('editNome').value  = sessao.nome || '';
    document.getElementById('editEmail').value = sessao.email || '';
}
populatePage();

/* ===== Edit Profile ===== */
document.getElementById('formPerfil').addEventListener('submit', (ev) => {
    ev.preventDefault();

    const novoNome  = document.getElementById('editNome').value.trim();
    const novoEmail = document.getElementById('editEmail').value.trim();

    if (!novoNome || !novoEmail) {
        showToast('Preencha todos os campos.', 'error');
        return;
    }

    // Update cf_membros
    const membros = JSON.parse(localStorage.getItem('cf_membros') || '[]');
    const idx = membros.findIndex(m => m.id === sessao.id);
    if (idx !== -1) {
        membros[idx].nome  = novoNome;
        membros[idx].email = novoEmail;
        localStorage.setItem('cf_membros', JSON.stringify(membros));
    }

    // Update session
    sessao.nome  = novoNome;
    sessao.email = novoEmail;
    localStorage.setItem('cf_sessao', JSON.stringify(sessao));

    populatePage();
    showToast('Perfil atualizado com sucesso!', 'success');
});

/* ===== Change Password ===== */
document.getElementById('formSenha').addEventListener('submit', (ev) => {
    ev.preventDefault();

    const senhaAtual   = document.getElementById('senhaAtual').value;
    const senhaNova    = document.getElementById('senhaNova').value;
    const senhaConfirm = document.getElementById('senhaConfirm').value;

    if (!senhaAtual || !senhaNova || !senhaConfirm) {
        showToast('Preencha todos os campos de senha.', 'error');
        return;
    }

    if (senhaNova.length < 6) {
        showToast('A nova senha deve ter pelo menos 6 caracteres.', 'error');
        return;
    }

    if (senhaNova !== senhaConfirm) {
        showToast('As senhas não coincidem.', 'error');
        return;
    }

    // Verify current password
    const membros = JSON.parse(localStorage.getItem('cf_membros') || '[]');
    const membro = membros.find(m => m.id === sessao.id);

    if (!membro) {
        showToast('Membro não encontrado.', 'error');
        return;
    }

    if (membro.senha !== senhaAtual) {
        showToast('Senha atual incorreta.', 'error');
        return;
    }

    // Update password
    membro.senha = senhaNova;
    localStorage.setItem('cf_membros', JSON.stringify(membros));

    document.getElementById('formSenha').reset();
    showToast('Senha alterada com sucesso!', 'success');
});

/* ===== Toggle Password Visibility ===== */
document.querySelectorAll('.btn-eye').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (input.type === 'password') {
            input.type = 'text';
            btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
        } else {
            input.type = 'password';
            btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
        }
    });
});

/* ===== Logout ===== */
document.getElementById('btnSair').addEventListener('click', (ev) => {
    ev.preventDefault();
    localStorage.removeItem('cf_sessao');
    window.location.href = '../index.html';
});
