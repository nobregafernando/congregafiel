(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.LinhaDoTempoUtils = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MESES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const TIPOS = {
    culto: { label: "Culto" },
    estudo: { label: "Estudo" },
    conferencia: { label: "Conferência" },
    especial: { label: "Especial" },
    evento: { label: "Evento" },
  };

  function isProximo(dateStr, refDate = new Date()) {
    const hoje = new Date(refDate);
    hoje.setHours(0, 0, 0, 0);
    const d = new Date(dateStr + "T00:00:00");
    return d >= hoje;
  }

  function formatarDataLonga(dateStr) {
    if (!dateStr) return "";
    const partes = dateStr.split("-");
    const dia = partes[2];
    const mesIdx = parseInt(partes[1], 10) - 1;
    const ano = partes[0];
    const nomesDiaSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const d = new Date(dateStr + "T12:00:00");
    const diaSemana = nomesDiaSemana[d.getDay()];
    return diaSemana + ", " + dia + " de " + MESES[mesIdx] + " de " + ano;
  }

  function obterMesAno(dateStr) {
    const partes = dateStr.split("-");
    return partes[0] + "-" + partes[1];
  }

  function obterTipoInfo(tipo) {
    return TIPOS[tipo] || TIPOS.evento;
  }

  function encontrarProximoEvento(eventos, refDate = new Date()) {
    const hoje = new Date(refDate);
    hoje.setHours(0, 0, 0, 0);
    for (let i = 0; i < eventos.length; i++) {
      const d = new Date(eventos[i].data + "T00:00:00");
      if (d >= hoje) return eventos[i];
    }
    return null;
  }

  return {
    MESES,
    isProximo,
    formatarDataLonga,
    obterMesAno,
    obterTipoInfo,
    encontrarProximoEvento,
  };
});
