const EventosUtils = require("../../../../../public/js/utils/eventos-utils");

describe("EventosUtils", () => {
  it("identifica evento futuro corretamente", () => {
    const ref = new Date("2026-03-24T12:00:00");
    expect(EventosUtils.isUpcoming("2026-03-24", ref)).toBe(true);
    expect(EventosUtils.isUpcoming("2026-03-23", ref)).toBe(false);
  });

  it("formata data para padrão brasileiro", () => {
    expect(EventosUtils.formatDateBR("2026-12-05")).toBe("05/12/2026");
  });
});
