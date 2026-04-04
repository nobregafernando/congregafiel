(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.EventosUtils = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function isUpcoming(dateStr, refDate = new Date()) {
    const today = new Date(refDate);
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateStr + "T00:00:00");
    return eventDate >= today;
  }

  function formatDateBR(dateStr) {
    const parts = dateStr.split("-");
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  return {
    isUpcoming,
    formatDateBR,
  };
});
