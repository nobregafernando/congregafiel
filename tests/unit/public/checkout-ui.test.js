const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { carregarScript } = require("../../helpers/carregar-script");

function carregarModuloFresh(relPath) {
  const absPath = path.resolve(__dirname, "..", "..", "..", relPath);
  const codigo = fs.readFileSync(absPath, "utf8");
  vm.runInThisContext(codigo, { filename: absPath });
}

function montarDOMCheckout() {
  document.body.innerHTML = `
    <div id="toast" class="toast"></div>
    <form id="checkoutForm">
      <input type="number" id="valor" />
      <input type="text" id="descricao" />
      <input type="radio" name="tipo" value="pix_qr_code" checked />
      <input type="radio" name="tipo" value="cartao_credito" />
      <button type="submit">Enviar</button>
    </form>
    <div id="estadoInicial"></div>
    <div id="qrcodeResult" class="hidden"></div>
    <div id="cartaoResult" class="hidden"></div>
    <img id="qrImage" />
    <p id="qrData"></p>
    <p id="statusPagamento" class="status-pill"></p>
    <button id="btnCopiar" type="button">Copiar</button>
    <button id="btnAtualizarStatus" type="button">Atualizar</button>
  `;
}

describe("Checkout UI", () => {
  let modulo;
  let apiMock;

  beforeAll(() => {
    global.SessaoServico = carregarScript("public/js/servicos/sessao-servico.js", "SessaoServico");
    global.UIServico = carregarScript("public/js/servicos/ui-servico.js", "UIServico");
  });

  beforeEach(() => {
    montarDOMCheckout();
    localStorage.clear();
    localStorage.setItem("cf_sessao", JSON.stringify({
      id: "user-1",
      nome: "Maria Teste",
      tipo: "membro",
      igrejaId: "igreja-1",
      accessToken: "token-abc",
    }));

    apiMock = {
      criarPreferenciaPagamento: vi.fn(),
      obterStatusPagamento: vi.fn(),
    };
    global.ApiServico = apiMock;
    global.UIServico.mostrarToast = vi.fn();
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/membros/checkout.html" },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });

    carregarModuloFresh("public/membros/checkout.js");
    modulo = window.CheckoutCongregaFiel.modulo;
  });

  it("T1: página inicializa e expõe módulo de checkout", () => {
    expect(modulo).toBeTruthy();
    expect(typeof modulo.atualizarStatus).toBe("function");
  });

  it("T2: valida valor obrigatório antes de enviar", async () => {
    document.getElementById("valor").value = "0";

    document.getElementById("checkoutForm").dispatchEvent(new Event("submit"));
    await Promise.resolve();

    expect(apiMock.criarPreferenciaPagamento).not.toHaveBeenCalled();
    expect(UIServico.mostrarToast).toHaveBeenCalled();
  });

  it("T3: submit com Pix envia payload correto", async () => {
    apiMock.criarPreferenciaPagamento.mockResolvedValue({
      preference_id: "pref-123",
      qr_code: "base64-pix",
      qr_data: "000201",
    });
    document.getElementById("valor").value = "55";
    document.getElementById("descricao").value = "Contribuição mensal";

    document.getElementById("checkoutForm").dispatchEvent(new Event("submit"));
    await Promise.resolve();
    await Promise.resolve();

    expect(apiMock.criarPreferenciaPagamento).toHaveBeenCalledWith({
      valor: 55,
      tipo: "pix_qr_code",
      descricao: "Contribuição mensal",
    });
  });

  it("T4: exibe QR code e dados para Pix", async () => {
    apiMock.criarPreferenciaPagamento.mockResolvedValue({
      preference_id: "pref-qr",
      qr_code: "base64-pix",
      qr_data: "000201010212",
    });
    document.getElementById("valor").value = "35";

    document.getElementById("checkoutForm").dispatchEvent(new Event("submit"));
    await Promise.resolve();
    await Promise.resolve();

    expect(document.getElementById("qrcodeResult").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("qrData").textContent).toBe("000201010212");
    expect(document.getElementById("qrImage").src).toContain("base64-pix");
  });

  it("T5: redireciona para checkout de cartão", async () => {
    apiMock.criarPreferenciaPagamento.mockResolvedValue({
      preference_id: "pref-card",
      checkout_url: "https://mercadopago.test/card",
    });
    document.getElementById("valor").value = "120";
    document.querySelector('input[value="cartao_credito"]').checked = true;

    document.getElementById("checkoutForm").dispatchEvent(new Event("submit"));
    await Promise.resolve();
    await Promise.resolve();

    expect(window.location.href).toBe("https://mercadopago.test/card");
  });

  it("T6: botão copiar envia código Pix para clipboard", async () => {
    document.getElementById("qrData").textContent = "pix-copia-cola";

    document.getElementById("btnCopiar").click();
    await Promise.resolve();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("pix-copia-cola");
  });
});
