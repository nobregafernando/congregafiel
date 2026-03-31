const GeolocalizacaoUtils = require("../../../../../public/js/utils/geolocalizacao-utils");

describe("GeolocalizacaoUtils", () => {
  it("calcula distância zero para pontos iguais", () => {
    const km = GeolocalizacaoUtils.calcularDistancia(-20.4697, -54.6201, -20.4697, -54.6201);
    expect(km).toBe(0);
  });

  it("calcula distância aproximada entre cidades", () => {
    const cg = { lat: -20.4697, lng: -54.6201 };
    const sp = { lat: -23.5505, lng: -46.6333 };
    const km = GeolocalizacaoUtils.calcularDistancia(cg.lat, cg.lng, sp.lat, sp.lng);
    expect(km).toBeGreaterThan(800);
    expect(km).toBeLessThan(950);
  });

  it("formata distância em metros e quilômetros", () => {
    expect(GeolocalizacaoUtils.formatarDistancia(0.42)).toBe("420 m");
    expect(GeolocalizacaoUtils.formatarDistancia(5.4)).toBe("5.4 km");
    expect(GeolocalizacaoUtils.formatarDistancia(17.7)).toBe("18 km");
  });
});
