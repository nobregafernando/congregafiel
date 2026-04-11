const {
  extrairDadosCheckout,
  montarPreferenceBody,
  registrarPagamentoAberto,
  validarCriacaoPreferencia,
} = require("../../../microservices/services/payment-service/pagamento-utils");

describe("payment-service — preferência Mercado Pago", () => {
  it("T1: valida payload válido de preferência", () => {
    const resultado = validarCriacaoPreferencia({
      valor: 150,
      tipo: "pix_qr_code",
      descricao: "Contribuição mensal",
    });

    expect(resultado.valido).toBe(true);
    expect(resultado.valor).toBe(150);
  });

  it("T2: rejeita valor inválido e tipo desconhecido", () => {
    const resultado = validarCriacaoPreferencia({
      valor: 0,
      tipo: "boleto",
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toEqual(expect.arrayContaining([
      "valor deve ser maior que zero",
      "tipo de pagamento inválido",
    ]));
  });

  it("T3: monta preference body com dados do usuário e webhook", () => {
    const body = montarPreferenceBody({
      valor: 89.9,
      tipo: "cartao_credito",
      descricao: "Oferta especial",
      usuario: { id: "user-1", email: "membro@igreja.com" },
      notificationUrl: "http://localhost:4008/api/pagamentos/webhook",
    });

    expect(body.items[0]).toMatchObject({
      title: "Oferta especial",
      unit_price: 89.9,
      currency_id: "BRL",
    });
    expect(body.external_reference).toBe("user-1");
    expect(body.notification_url).toContain("/api/pagamentos/webhook");
    expect(body.payer.email).toBe("membro@igreja.com");
  });

  it("T4: extrai QR Code para pagamento Pix", () => {
    const resultado = extrairDadosCheckout({
      id: "pref-123",
      point_of_interaction: {
        transaction_data: {
          qr_code_base64: "base64-qrcode",
          qr_code: "000201010212",
        },
      },
    }, "pix_qr_code", 42);

    expect(resultado).toEqual({
      preference_id: "pref-123",
      tipo: "pix_qr_code",
      valor: 42,
      qr_code: "base64-qrcode",
      qr_data: "000201010212",
    });
  });

  it("T5: extrai checkout URL para cartão", () => {
    const resultado = extrairDadosCheckout({
      id: "pref-cartao",
      sandbox_init_point: "https://mercadopago.test/checkout",
    }, "cartao_credito", 150);

    expect(resultado.checkout_url).toBe("https://mercadopago.test/checkout");
    expect(resultado.preference_id).toBe("pref-cartao");
  });

  it("T6: registra pagamento pendente em pagamentos_abertos", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: "aberto-1", status: "pendente" },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const supabase = {
      from: vi.fn(() => ({ insert })),
    };

    const resultado = await registrarPagamentoAberto(supabase, {
      usuario_id: "user-1",
      valor: 35,
      tipo: "pix_qr_code",
      status: "pendente",
    });

    expect(supabase.from).toHaveBeenCalledWith("pagamentos_abertos");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      usuario_id: "user-1",
      valor: 35,
      status: "pendente",
    }));
    expect(resultado.id).toBe("aberto-1");
  });
});
