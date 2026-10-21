// Data source layer for HEALTHOPS.
//
// The dashboard is opened in the browser by the workbook's
// "OpenHealthOpsDashboard" VBA macro, which exports all 16 PivotTables on the
// Healthcare_Pivots sheet to data.js. "Refresh" re-loads data.js from disk, so
// re-running the macro and clicking Refresh is enough.
//
// Every PivotTable is read once into an in-memory snapshot of
// { name: 2D values array }, and pivots.js parses from that snapshot.
const HealthOpsExcel = (function () {
  const PIVOT_SHEET = "Healthcare_Pivots";
  const DATA_FILE = "data.js";

  let snapshot = null; // { generatedAt, pivots: { [name]: any[][] } }

  // ---------- data.js source ----------

  function readGlobalData() {
    if (typeof window !== "undefined" && window.HEALTHOPS_DATA) return window.HEALTHOPS_DATA;
    // Older exports declared `const HEALTHOPS_DATA`, which is a global binding
    // but not a window property.
    // eslint-disable-next-line no-undef
    if (typeof HEALTHOPS_DATA !== "undefined") return HEALTHOPS_DATA;
    return null;
  }

  function loadFromDataFile() {
    const data = readGlobalData();
    if (!data || !data.pivots) {
      throw new Error(
        'No PivotTable data found. In Excel, run the "OpenHealthOpsDashboard" macro to export data.js, then click Refresh.'
      );
    }
    return data;
  }

  // Re-inject data.js with a cache-buster so a fresh macro export is picked up
  // without reloading the whole page. Works from file:// (no fetch/CORS).
  function reloadDataScript() {
    // Legacy exports (`const HEALTHOPS_DATA`) can't be re-declared by a second
    // script tag, so fall back to a full page reload for them.
    if (!window.HEALTHOPS_DATA && readGlobalData()) {
      window.location.reload();
      return new Promise(() => {});
    }
    return new Promise((resolve, reject) => {
      const old = document.querySelector('script[data-healthops-data]');
      const script = document.createElement("script");
      script.src = `${DATA_FILE}?t=${Date.now()}`;
      script.setAttribute("data-healthops-data", "");
      script.onload = () => {
        if (old) old.remove();
        resolve();
      };
      script.onerror = () => {
        script.remove();
        reject(new Error(`Could not load ${DATA_FILE}. Run the "OpenHealthOpsDashboard" macro in Excel first.`));
      };
      document.head.appendChild(script);
    });
  }

  // ---------- public API ----------

  async function loadSnapshot() {
    snapshot = loadFromDataFile();
    return snapshot;
  }

  async function ensureSnapshot() {
    return snapshot || loadSnapshot();
  }

  async function getWorkbookInfo() {
    const data = await ensureSnapshot();
    return {
      sheetName: PIVOT_SHEET,
      pivotTableNames: Object.keys(data.pivots || {}),
      generatedAt: data.generatedAt || null,
    };
  }

  async function readPivotTable(pivotTableName) {
    const data = await ensureSnapshot();
    const values = data.pivots && data.pivots[pivotTableName];
    if (!values) {
      throw new Error(`PivotTable "${pivotTableName}" was not found on ${PIVOT_SHEET}.`);
    }
    return { values };
  }

  async function refreshAllPivotTables() {
    await reloadDataScript();
    snapshot = null;
    return loadSnapshot();
  }

  return { PIVOT_SHEET, getWorkbookInfo, readPivotTable, refreshAllPivotTables, loadSnapshot };
})();
