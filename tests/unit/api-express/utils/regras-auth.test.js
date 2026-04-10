const {
  gerarCodigoIgreja,
  validarPayloadRegistroIgreja,
  validarPayloadRegistroMembro,
  validarPayloadLogin,
  validarPayloadRecuperarSenha,
  isValidUUID,
  validarContribuicao,
  validarAtualizacaoContribuicao,
  hashVerificacaoContribuicao,
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

  describe("validação de UUIDs", () => {
    it("valida UUIDs no formato correto", () => {
      const uuidValido = "550e8400-e29b-41d4-a716-446655440000";
      expect(isValidUUID(uuidValido)).toBe(true);
    });

    it("rejeita UUIDs inválidos", () => {
      expect(isValidUUID("nao-e-uuid")).toBe(false);
      expect(isValidUUID("123")).toBe(false);
      expect(isValidUUID("")).toBe(false);
      expect(isValidUUID(null)).toBe(false);
    });
  });

  describe("validação de contribuições", () => {
    const uuidMembroValido = "550e8400-e29b-41d4-a716-446655440001";
    const uuidIgrejaValido = "550e8400-e29b-41d4-a716-446655440002";

    it("rejeita contribuição sem membro_id", () => {
      const resultado = validarContribuicao({
        tipo: "dizimo",
        valor: 100.00,
        data: "2026-04-10",
        igreja_id: uuidIgrejaValido,
      });
      expect(resultado).toContain("Membro ID");
    });

    it("rejeita membro_id inválido (não UUID)", () => {
      const resultado = validarContribuicao({
        membro_id: "nao-uuid",
        tipo: "dizimo",
        valor: 100.00,
        data: "2026-04-10",
        igreja_id: uuidIgrejaValido,
      });
      expect(resultado).toContain("Membro ID");
    });

    it("rejeita tipo inválido", () => {
      const resultado = validarContribuicao({
        membro_id: uuidMembroValido,
        tipo: "invalido",
        valor: 100.00,
        data: "2026-04-10",
        igreja_id: uuidIgrejaValido,
      });
      expect(resultado).toContain("Tipo deve ser um dos");
    });

    it("rejeita valor zero ou negativo", () => {
      expect(validarContribuicao({
        membro_id: uuidMembroValido,
        tipo: "dizimo",
        valor: 0,
        data: "2026-04-10",
        igreja_id: uuidIgrejaValido,
      })).toContain("Valor deve ser um número maior que zero");

      expect(validarContribuicao({
        membro_id: uuidMembroValido,
        tipo: "dizimo",
        valor: -100,
        data: "2026-04-10",
        igreja_id: uuidIgrejaValido,
      })).toContain("Valor deve ser um número maior que zero");
    });

    it("rejeita data em formato inválido", () => {
      const resultado = validarContribuicao({
        membro_id: uuidMembroValido,
        tipo: "dizimo",
        valor: 100.00,
        data: "10/04/2026",
        igreja_id: uuidIgrejaValido,
      });
      expect(resultado).toContain("Data deve estar no formato YYYY-MM-DD");
    });

    it("aceita contribuição válida", () => {
      const resultado = validarContribuicao({
        membro_id: uuidMembroValido,
        tipo: "dizimo",
        valor: 150.50,
        data: "2026-04-10",
        igreja_id: uuidIgrejaValido,
        descricao: "Dízimo do mês",
      });
      expect(resultado).toBeNull();
    });

    it("aceita todos os tipos de contribuição", () => {
      const tipos = ["dizimo", "oferta", "doacao", "outro"];
      tipos.forEach(tipo => {
        const resultado = validarContribuicao({
          membro_id: uuidMembroValido,
          tipo,
          valor: 100.00,
          data: "2026-04-10",
          igreja_id: uuidIgrejaValido,
        });
        expect(resultado).toBeNull();
      });
    });
  });

  describe("validação de atualização de contribuições", () => {
    it("aceita campos vazios (atualização parcial)", () => {
      expect(validarAtualizacaoContribuicao({})).toBeNull();
    });

    it("valida tipo quando fornecido", () => {
      expect(validarAtualizacaoContribuicao({ tipo: "dizimo" })).toBeNull();
      expect(validarAtualizacaoContribuicao({ tipo: "invalido" })).toContain("Tipo deve ser um dos");
    });

    it("valida valor quando fornecido", () => {
      expect(validarAtualizacaoContribuicao({ valor: 150.00 })).toBeNull();
      expect(validarAtualizacaoContribuicao({ valor: 0 })).toContain("Valor deve ser um número maior que zero");
      expect(validarAtualizacaoContribuicao({ valor: -50 })).toContain("Valor deve ser um número maior que zero");
    });

    it("valida data quando fornecida", () => {
      expect(validarAtualizacaoContribuicao({ data: "2026-05-15" })).toBeNull();
      expect(validarAtualizacaoContribuicao({ data: "15/05/2026" })).toContain("Data deve estar no formato YYYY-MM-DD");
    });

    it("aceita combinações parciais de campos", () => {
      expect(validarAtualizacaoContribuicao({
        tipo: "oferta",
        valor: 200.00,
      })).toBeNull();

      expect(validarAtualizacaoContribuicao({
        data: "2026-06-01",
      })).toBeNull();
    });
  });

  describe("hash de verificação de duplicação", () => {
    const uuidMembro = "550e8400-e29b-41d4-a716-446655440001";

    it("gera hash consistente para os mesmos dados", () => {
      const hash1 = hashVerificacaoContribuicao(uuidMembro, "dizimo", 100.00, "2026-04-10");
      const hash2 = hashVerificacaoContribuicao(uuidMembro, "dizimo", 100.00, "2026-04-10");
      expect(hash1).toBe(hash2);
    });

    it("gera hashes diferentes para dados diferentes", () => {
      const hash1 = hashVerificacaoContribuicao(uuidMembro, "dizimo", 100.00, "2026-04-10");
      const hash2 = hashVerificacaoContribuicao(uuidMembro, "oferta", 100.00, "2026-04-10");
      const hash3 = hashVerificacaoContribuicao(uuidMembro, "dizimo", 150.00, "2026-04-10");
      
      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash2).not.toBe(hash3);
    });

    it("gera hash válido (string hexadecimal)", () => {
      const hash = hashVerificacaoContribuicao(uuidMembro, "dizimo", 100.00, "2026-04-10");
      expect(typeof hash).toBe("string");
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });
  });
});
