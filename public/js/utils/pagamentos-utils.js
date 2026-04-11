(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.PagamentosUtils = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function parseMoneyInput(str) {
    if (!str) return 0;

    const cleaned = str
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
  }

  function getTodayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function isCurrentMonth(dateStr, refDate = new Date()) {
    const d = new Date(dateStr + "T00:00:00");
    return d.getMonth() === refDate.getMonth() && d.getFullYear() === refDate.getFullYear();
  }

  return {
    parseMoneyInput,
    getTodayISO,
    isCurrentMonth,
  };
});
