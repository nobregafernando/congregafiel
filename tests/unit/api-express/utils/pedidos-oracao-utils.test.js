const { montarAtualizacaoPedidoOracao } = require("../../../../api-express/utils/pedidos-oracao-utils");

describe("pedidos-oracao-utils", () => {
  it("monta atualização simples sem responder", () => {
    const atualizacao = montarAtualizacaoPedidoOracao({ pedido: "Nova descrição", status: "pendente" }, "2026-03-24T10:00:00.000Z");
    expect(atualizacao).toEqual({
      pedido: "Nova descrição",
      status: "pendente",
    });
  });

  it("preenche respondido_em quando resposta é enviada", () => {
    const now = "2026-03-24T10:00:00.000Z";
    const atualizacao = montarAtualizacaoPedidoOracao({ resposta: "Estamos orando" }, now);
    expect(atualizacao).toEqual({
      resposta: "Estamos orando",
      respondido_em: now,
    });
  });

  it('preenche respondido_em quando status vira "respondido"', () => {
    const now = "2026-03-24T12:30:00.000Z";
    const atualizacao = montarAtualizacaoPedidoOracao({ status: "respondido", respondido_por: "Pastor" }, now);
    expect(atualizacao).toEqual({
      status: "respondido",
      respondido_por: "Pastor",
      respondido_em: now,
    });
  });
});
