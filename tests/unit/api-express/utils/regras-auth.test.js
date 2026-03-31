const {
  gerarCodigoIgreja,
  validarPayloadRegistroIgreja,
  validarPayloadRegistroMembro,
  validarPayloadLogin,
  validarPayloadRecuperarSenha,
} = require("../../../../api-express/utils/regras-auth");

describe("regras-auth", () => {
  describe("gerarCodigoIgreja", () => {
    it("gera prefixo com duas letras e quatro dígitos", () => {
      const codigo = gerarCodigoIgreja("Comunidade da Paz", () => 0.5);
      expect(codigo).toMatch(/^[A-ZÀ-Ú]{2}\d{4}$/);
      expect(codigo.startsWith("CO")).toBe(true);
    });

    it('usa prefixo "CF" quando nome não tem letras suficientes', () => {
      const codigo = gerarCodigoIgreja("1", () => 0);
      expect(codigo.startsWith("CF")).toBe(true);
      expect(codigo).toBe("CF1000");
    });
  });

  describe("validações de payload", () => {
    it("valida registro de igreja", () => {
      expect(validarPayloadRegistroIgreja({})).toBe("Todos os campos são obrigatórios");
      expect(validarPayloadRegistroIgreja({
        nome_pastor: "A",
        nome_igreja: "B",
        email: "a@b.com",
        senha: "12345",
      })).toBe("A senha deve ter pelo menos 6 caracteres");
      expect(validarPayloadRegistroIgreja({
        nome_pastor: "A",
        nome_igreja: "B",
        email: "a@b.com",
        senha: "123456",
      })).toBeNull();
    });

    it("valida registro de membro", () => {
      expect(validarPayloadRegistroMembro({})).toBe("Todos os campos são obrigatórios");
      expect(validarPayloadRegistroMembro({
        nome_completo: "Maria",
        email: "maria@x.com",
        codigo_igreja: "CF1234",
        senha: "12345",
      })).toBe("A senha deve ter pelo menos 6 caracteres");
      expect(validarPayloadRegistroMembro({
        nome_completo: "Maria",
        email: "maria@x.com",
        codigo_igreja: "CF1234",
        senha: "123456",
      })).toBeNull();
    });

    it("valida login e recuperação de senha", () => {
      expect(validarPayloadLogin({})).toBe("E-mail e senha são obrigatórios");
      expect(validarPayloadLogin({ email: "x@x.com", senha: "123" })).toBeNull();

      expect(validarPayloadRecuperarSenha({})).toBe("E-mail é obrigatório");
      expect(validarPayloadRecuperarSenha({ email: "x@x.com" })).toBeNull();
    });
  });
});
