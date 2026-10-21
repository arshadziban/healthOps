const HealthOpsUtils = (function () {
  const EMPTY = "—";

  function isMissing(value) {
    return value === null || value === undefined || Number.isNaN(value);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatNumber(value) {
    if (isMissing(value)) return EMPTY;
    return new Intl.NumberFormat("en-US").format(Math.round(value));
  }

  function formatCompact(value) {
    if (isMissing(value)) return EMPTY;
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  }

  function formatDecimal(value, digits = 1) {
    if (isMissing(value)) return EMPTY;
    return Number(value).toFixed(digits);
  }

  function formatPercent(value, digits = 1) {
    if (isMissing(value)) return EMPTY;
    return `${(value * 100).toFixed(digits)}%`;
  }

  function formatTimestamp(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return EMPTY;
    return new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  let bannerTimer = null;

  function showBanner(message, type, autoHideMs) {
    const el = document.getElementById("status-banner");
    if (!el) return;
    clearTimeout(bannerTimer);
    el.textContent = message;
    el.className = `status-banner is-${type}`;
    el.setAttribute("role", type === "error" ? "alert" : "status");
    el.hidden = false;
    if (autoHideMs) bannerTimer = setTimeout(hideBanner, autoHideMs);
  }

  function hideBanner() {
    const el = document.getElementById("status-banner");
    if (el) el.hidden = true;
  }

  function setLastRefreshed(date) {
    const el = document.getElementById("last-refreshed");
    if (el) el.textContent = `Data as of ${formatTimestamp(date)}`;
  }

  return {
    escapeHtml,
    formatNumber,
    formatCompact,
    formatDecimal,
    formatPercent,
    formatTimestamp,
    showBanner,
    hideBanner,
    setLastRefreshed,
  };
})();
