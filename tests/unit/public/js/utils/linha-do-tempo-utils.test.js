const LinhaDoTempoUtils = require("../../../../../public/js/utils/linha-do-tempo-utils");

describe("LinhaDoTempoUtils", () => {
  it("identifica eventos próximos considerando data de referência", () => {
    const ref = new Date("2026-03-24T08:00:00");
    expect(LinhaDoTempoUtils.isProximo("2026-03-24", ref)).toBe(true);
    expect(LinhaDoTempoUtils.isProximo("2026-03-20", ref)).toBe(false);
  });

  it("formata data longa em português", () => {
    const data = LinhaDoTempoUtils.formatarDataLonga("2026-03-24");
    expect(data).toContain("24 de Março de 2026");
  });

  it("retorna mês/ano no formato yyyy-mm", () => {
    expect(LinhaDoTempoUtils.obterMesAno("2026-03-24")).toBe("2026-03");
  });

  it("retorna tipo padrão quando tipo não existe", () => {
    expect(LinhaDoTempoUtils.obterTipoInfo("inexistente")).toEqual({ label: "Evento" });
  });

  it("encontra próximo evento na lista ordenada", () => {
    const eventos = [
      { id: "1", data: "2026-03-20" },
      { id: "2", data: "2026-03-24" },
      { id: "3", data: "2026-04-01" },
    ];
    const proximo = LinhaDoTempoUtils.encontrarProximoEvento(eventos, new Date("2026-03-24T00:00:00"));
    expect(proximo.id).toBe("2");
  });
});
