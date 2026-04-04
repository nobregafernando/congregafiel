const PagamentosUtils = require("../../../../../public/js/utils/pagamentos-utils");

describe("PagamentosUtils", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("faz parse de valor monetário para número", () => {
    expect(PagamentosUtils.parseMoneyInput("12,50")).toBe(12.5);
    expect(PagamentosUtils.parseMoneyInput("R$ 1.234,56")).toBe(1234.56);
  });

  it("retorna 0 para entrada inválida", () => {
    expect(PagamentosUtils.parseMoneyInput("abc")).toBe(0);
    expect(PagamentosUtils.parseMoneyInput("")).toBe(0);
  });

  it("retorna data atual no formato ISO", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T10:00:00Z"));
    expect(PagamentosUtils.getTodayISO()).toBe("2026-03-24");
  });

  it("identifica se a data pertence ao mês corrente", () => {
    const ref = new Date("2026-03-24T00:00:00");
    expect(PagamentosUtils.isCurrentMonth("2026-03-01", ref)).toBe(true);
    expect(PagamentosUtils.isCurrentMonth("2026-02-28", ref)).toBe(false);
  });
});
