// Servico de Sessao - gerencia autenticacao e sessao do usuario
const SessaoServico = (() => {
  "use strict";

  const CHAVE = "cf_sessao";

  function obter() {
    try {
      const dados = localStorage.getItem(CHAVE);
      if (!dados) return null;
      return JSON.parse(dados);
    } catch {
      return null;
    }
  }

  function salvar(sessao) {
    localStorage.setItem(CHAVE, JSON.stringify(sessao));
  }

  function exigirAutenticacao(tipo, urlLogin) {
    const url = urlLogin || "../autenticacao/login.html";
    const sessao = obter();
    if (!sessao || (tipo && sessao.tipo !== tipo)) {
      window.location.href = url;
      return null;
    }
    return sessao;
  }

  function encerrar(urlRedirecionamento) {
    localStorage.removeItem(CHAVE);
    window.location.href = urlRedirecionamento || "../autenticacao/login.html";
  }

  return {
    CHAVE,
    obter,
    salvar,
    exigirAutenticacao,
    encerrar
  };
})();
