const { carregarScript } = require("../../../../helpers/carregar-script");

function mockRespostaFetch({ ok = true, dados = {} } = {}) {
  return Promise.resolve({
    ok,
    json: async () => dados,
  });
}

describe("ApiServico", () => {
  let ApiServico;

  beforeAll(() => {
    window.history.pushState({}, "", "http://localhost:5500/");
    ApiServico = carregarScript("public/js/servicos/api-servico.js", "ApiServico");
  });

  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn();
  });

  it("inclui token bearer quando sessão possui accessToken", async () => {
    localStorage.setItem("cf_sessao", JSON.stringify({ accessToken: "token-123" }));
    fetch.mockImplementation(() => mockRespostaFetch({ dados: { ok: true } }));

    await ApiServico.get("/api/igrejas");

    expect(fetch).toHaveBeenCalledTimes(1);
    const [, opcoes] = fetch.mock.calls[0];
    expect(opcoes.headers.Authorization).toBe("Bearer token-123");
  });

  it("lança erro quando backend retorna resposta não OK", async () => {
    fetch.mockImplementation(() => mockRespostaFetch({
      ok: false,
      dados: { erro: "Falha customizada" },
    }));

    await expect(ApiServico.get("/api/erro")).rejects.toThrow("Falha customizada");
  });

  it("mapeia membros da API para o formato do frontend", async () => {
    fetch.mockImplementation(() => mockRespostaFetch({
      dados: [{
        id: "m1",
        nome_completo: "Maria Silva",
        email: "maria@teste.com",
        telefone: "9999-9999",
        tipo: "membro",
        igreja_id: "i1",
        codigo_igreja: "CF1234",
        criado_em: "2026-03-24",
      }],
    }));

    const membros = await ApiServico.obterMembros("i1");
    expect(membros[0]).toEqual({
      id: "m1",
      nomeCompleto: "Maria Silva",
      nome: "Maria Silva",
      email: "maria@teste.com",
      telefone: "9999-9999",
      tipo: "membro",
      igrejaId: "i1",
      codigoIgreja: "CF1234",
      criadoEm: "2026-03-24",
    });
  });

  it("cria evento aplicando defaults de tipo e horário", async () => {
    fetch.mockImplementation(() => mockRespostaFetch({ dados: { id: "e1" } }));

    await ApiServico.criarEvento({
      titulo: "Culto Jovem",
      data: "2026-04-01",
      local: "Templo",
      igrejaId: "i1",
    });

    const [, opcoes] = fetch.mock.calls[0];
    const corpo = JSON.parse(opcoes.body);
    expect(corpo.tipo).toBe("evento");
    expect(corpo.horario).toBe("");
  });

  it("atualiza membro convertendo campos para snake_case", async () => {
    fetch.mockImplementation(() => mockRespostaFetch({ dados: { ok: true } }));

    await ApiServico.atualizarMembro("m10", {
      nome: "Nome Novo",
      email: "novo@teste.com",
      telefone: "1111-1111",
    });

    const [url, opcoes] = fetch.mock.calls[0];
    expect(url).toContain("/api/membros/m10");
    const corpo = JSON.parse(opcoes.body);
    expect(corpo).toEqual({
      nome_completo: "Nome Novo",
      email: "novo@teste.com",
      telefone: "1111-1111",
    });
  });

  it("mapeia pedidos de oração com campos opcionais nulos", async () => {
    fetch.mockImplementation(() => mockRespostaFetch({
      dados: [{
        id: "p1",
        membro_nome: "Carlos",
        membro_id: "m1",
        igreja_id: "i1",
        pedido: "Saúde",
        status: "pendente",
        criado_em: "2026-03-20",
      }],
    }));

    const pedidos = await ApiServico.obterPedidosOracao("i1");
    expect(pedidos[0].resposta).toBeNull();
    expect(pedidos[0].respondidoEm).toBeNull();
    expect(pedidos[0].respondidoPor).toBeNull();
  });
});
