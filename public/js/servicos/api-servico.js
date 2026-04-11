// Servico de API - comunicacao com o backend (Supabase via Express/FastAPI)
const ApiServico = (() => {
  "use strict";

  // Em produção usa a API no Vercel; em desenvolvimento usa localhost
  const BASE_URL = window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://api-express-tau.vercel.app";

  async function request(metodo, caminho, corpo) {
    const opcoes = {
      method: metodo,
      headers: { "Content-Type": "application/json" },
    };

    if (corpo) {
      opcoes.body = JSON.stringify(corpo);
    }

    const sessao = JSON.parse(localStorage.getItem("cf_sessao") || "null");
    if (sessao && sessao.accessToken) {
      opcoes.headers["Authorization"] = "Bearer " + sessao.accessToken;
    }

    const resposta = await fetch(BASE_URL + caminho, opcoes);
    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro || "Erro na requisição");
    }

    return dados;
  }

  // --- Auth ---
  function registrarIgreja(dados) {
    return request("POST", "/api/auth/registrar-igreja", dados);
  }

  function registrarMembro(dados) {
    return request("POST", "/api/auth/registrar-membro", dados);
  }

  function login(email, senha) {
    return request("POST", "/api/auth/login", { email, senha });
  }

  function recuperarSenha(email) {
    return request("POST", "/api/auth/recuperar-senha", { email });
  }

  // --- Igrejas publicas (para mapa) ---
  function obterIgrejasPublicas() {
    return request("GET", "/api/igrejas/publicas");
  }

  // --- Requisicoes genericas ---
  function get(caminho) { return request("GET", caminho); }
  function post(caminho, dados) { return request("POST", caminho, dados); }
  function put(caminho, dados) { return request("PUT", caminho, dados); }
  function del(caminho) { return request("DELETE", caminho); }

  // =============================================
  // MEMBROS
  // =============================================
  async function obterMembros(igrejaId) {
    const dados = await get("/api/membros?igreja_id=" + igrejaId);
    return dados.map(function (m) {
      return {
        id: m.id,
        nomeCompleto: m.nome_completo,
        nome: m.nome_completo,
        email: m.email,
        telefone: m.telefone,
        tipo: m.tipo,
        igrejaId: m.igreja_id,
        codigoIgreja: m.codigo_igreja,
        criadoEm: m.criado_em,
      };
    });
  }

  async function atualizarMembro(id, dados) {
    const corpo = {};
    if (dados.nomeCompleto !== undefined) corpo.nome_completo = dados.nomeCompleto;
    if (dados.nome !== undefined) corpo.nome_completo = dados.nome;
    if (dados.email !== undefined) corpo.email = dados.email;
    if (dados.telefone !== undefined) corpo.telefone = dados.telefone;
    if (dados.tipo !== undefined) corpo.tipo = dados.tipo;
    return put("/api/membros/" + id, corpo);
  }

  // =============================================
  // EVENTOS
  // =============================================
  async function obterEventos(igrejaId) {
    const dados = await get("/api/eventos?igreja_id=" + igrejaId);
    return dados.map(function (e) {
      return {
        id: e.id,
        titulo: e.titulo,
        descricao: e.descricao,
        data: e.data,
        horario: e.horario,
        hora: e.horario,
        local: e.local,
        tipo: e.tipo || "evento",
        igrejaId: e.igreja_id,
        criadoEm: e.criado_em,
      };
    });
  }

  async function criarEvento(dados) {
    return post("/api/eventos", {
      titulo: dados.titulo,
      descricao: dados.descricao || "",
      data: dados.data,
      horario: dados.horario || dados.hora || "",
      local: dados.local || "",
      tipo: dados.tipo || "evento",
      igreja_id: dados.igrejaId,
    });
  }

  async function removerEvento(id) {
    return del("/api/eventos/" + id);
  }

  // =============================================
  // CONTRIBUICOES (PAGAMENTOS)
  // =============================================
  async function obterContribuicoes(igrejaId) {
    const dados = await get("/api/contribuicoes?igreja_id=" + igrejaId);
    return dados.map(function (c) {
      return {
        id: c.id,
        membro: c.membro_nome,
        membroId: c.membro_id,
        igrejaId: c.igreja_id,
        tipo: c.tipo,
        valor: c.valor,
        data: c.data,
        descricao: c.descricao,
        criadoEm: c.criado_em,
      };
    });
  }

  async function criarContribuicao(dados) {
    const sessao = JSON.parse(localStorage.getItem("cf_sessao") || "null");
    return post("/api/contribuicoes", {
      membro_id: dados.membroId,
      igreja_id: dados.igrejaId,
      tipo: dados.tipo,
      valor: dados.valor,
      data: dados.data,
      descricao: dados.descricao || "",
    });
  }

  async function removerContribuicao(id) {
    return del("/api/contribuicoes/" + id);
  }

  async function atualizarContribuicao(id, dados) {
    return put("/api/contribuicoes/" + id, {
      tipo: dados.tipo || undefined,
      valor: dados.valor || undefined,
      data: dados.data || undefined,
      descricao: dados.descricao !== undefined ? dados.descricao : undefined,
    });
  }

  // =============================================
  // COMUNICADOS
  // =============================================
  async function obterComunicados(igrejaId) {
    const dados = await get("/api/comunicados?igreja_id=" + igrejaId);
    return dados.map(function (c) {
      return {
        id: c.id,
        titulo: c.titulo,
        conteudo: c.conteudo,
        prioridade: c.prioridade,
        igrejaId: c.igreja_id,
        criadoEm: c.criado_em,
      };
    });
  }

  async function criarComunicado(dados) {
    return post("/api/comunicados", {
      igreja_id: dados.igrejaId,
      titulo: dados.titulo,
      conteudo: dados.conteudo,
      prioridade: dados.prioridade || "normal",
    });
  }

  async function removerComunicado(id) {
    return del("/api/comunicados/" + id);
  }

  // =============================================
  // PEDIDOS DE ORACAO
  // =============================================
  async function obterPedidosOracao(igrejaId) {
    const dados = await get("/api/pedidos-oracao?igreja_id=" + igrejaId);
    return dados.map(function (p) {
      return {
        id: p.id,
        membro: p.membro_nome,
        membroNome: p.membro_nome,
        membroId: p.membro_id,
        igrejaId: p.igreja_id,
        pedido: p.pedido,
        status: p.status,
        criadoEm: p.criado_em,
        resposta: p.resposta || null,
        respondidoEm: p.respondido_em || null,
        respondidoPor: p.respondido_por || null,
      };
    });
  }

  async function criarPedidoOracao(dados) {
    const sessao = JSON.parse(localStorage.getItem("cf_sessao") || "null");
    return post("/api/pedidos-oracao", {
      igreja_id: dados.igrejaId,
      membro_id: dados.membroId || (sessao ? sessao.id : undefined),
      membro_nome: dados.membroNome || dados.membro || "",
      pedido: dados.pedido,
    });
  }

  async function atualizarPedidoOracao(id, dados) {
    const corpo = {};
    if (dados.pedido !== undefined) corpo.pedido = dados.pedido;
    if (dados.status !== undefined) corpo.status = dados.status;
    if (dados.resposta !== undefined) corpo.resposta = dados.resposta;
    if (dados.respondidoPor !== undefined) corpo.respondido_por = dados.respondidoPor;
    return put("/api/pedidos-oracao/" + id, corpo);
  }

  return {
    BASE_URL,
    request,
    get, post, put, del,
    // Auth
    registrarIgreja, registrarMembro, login, recuperarSenha, obterIgrejasPublicas,
    // Membros
    obterMembros, atualizarMembro,
    // Eventos
    obterEventos, criarEvento, removerEvento,
    // Contribuicoes
    obterContribuicoes, criarContribuicao, atualizarContribuicao, removerContribuicao,
    // Comunicados
    obterComunicados, criarComunicado, removerComunicado,
    // Pedidos de Oracao
    obterPedidosOracao, criarPedidoOracao, atualizarPedidoOracao,
  };
})();
