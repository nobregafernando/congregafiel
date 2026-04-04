const { carregarScript } = require("../../../../helpers/carregar-script");

describe("UIServico", () => {
  let UIServico;

  beforeAll(() => {
    UIServico = carregarScript("public/js/servicos/ui-servico.js", "UIServico");
  });

  it("valida e-mail corretamente", () => {
    expect(UIServico.validarEmail("maria@igreja.com")).toBe(true);
    expect(UIServico.validarEmail("email-invalido")).toBe(false);
  });

  it("obtém iniciais para nomes simples e compostos", () => {
    expect(UIServico.obterIniciais("Joao")).toBe("J");
    expect(UIServico.obterIniciais("Joao Silva")).toBe("JS");
    expect(UIServico.obterIniciais("")).toBe("?");
  });

  it("escapa HTML para evitar injeção", () => {
    const texto = '<img src=x onerror="alert(1)">';
    expect(UIServico.escaparHtml(texto)).toBe('&lt;img src=x onerror="alert(1)"&gt;');
  });

  it("formata valor monetário em BRL", () => {
    const valor = UIServico.formatarMoeda(10.5);
    expect(valor).toContain("10,50");
    expect(valor).toContain("R$");
  });

  it("retorna partes da data com mês abreviado", () => {
    const partes = UIServico.obterPartesData("2026-03-24");
    expect(partes).toEqual({ dia: 24, mes: "MAR" });
  });
});
