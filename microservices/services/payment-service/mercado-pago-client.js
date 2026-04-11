require("dotenv").config();

let sdkMercadoPago = null;
try {
  sdkMercadoPago = require("mercadopago");
} catch (erro) {
  sdkMercadoPago = null;
}

function criarClientesMercadoPago() {
  if (!sdkMercadoPago || !process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    return {
      configurado: false,
      paymentClient: null,
      preferenceClient: null,
    };
  }

  const { MercadoPagoConfig, Payment, Preference } = sdkMercadoPago;
  const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    options: { timeout: 5000 },
  });

  return {
    configurado: true,
    paymentClient: new Payment(client),
    preferenceClient: new Preference(client),
  };
}

const clientes = criarClientesMercadoPago();

module.exports = {
  ...clientes,
  criarClientesMercadoPago,
};
