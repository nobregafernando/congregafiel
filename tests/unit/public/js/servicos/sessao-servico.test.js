const { carregarScript } = require("../../../../helpers/carregar-script");

describe("SessaoServico", () => {
  let SessaoServico;

  beforeAll(() => {
    SessaoServico = carregarScript("public/js/servicos/sessao-servico.js", "SessaoServico");
  });

  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, "", "/inicio.html");
  });

  it("salva e obtém sessão no localStorage", () => {
    const sessao = { id: "1", tipo: "igreja", nome: "Pastor" };
    SessaoServico.salvar(sessao);
    expect(SessaoServico.obter()).toEqual(sessao);
  });

  it("retorna null quando JSON da sessão é inválido", () => {
    localStorage.setItem("cf_sessao", "{invalido");
    expect(SessaoServico.obter()).toBeNull();
  });

  it("exigirAutenticacao redireciona quando sessão não existe", () => {
    const sessao = SessaoServico.exigirAutenticacao("igreja", "/login.html");
    expect(sessao).toBeNull();
    expect(window.location.href).toContain("/login.html");
  });

  it("exigirAutenticacao retorna sessão quando tipo confere", () => {
    const sessaoBase = { id: "2", tipo: "membro" };
    localStorage.setItem("cf_sessao", JSON.stringify(sessaoBase));

    const sessao = SessaoServico.exigirAutenticacao("membro", "/login.html");
    expect(sessao).toEqual(sessaoBase);
  });

  it("encerrar limpa sessão e redireciona", () => {
    localStorage.setItem("cf_sessao", JSON.stringify({ id: "3" }));
    SessaoServico.encerrar("/autenticacao/login.html");
    expect(localStorage.getItem("cf_sessao")).toBeNull();
    expect(window.location.href).toContain("/autenticacao/login.html");
  });
});
