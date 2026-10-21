// Readers for each of the 16 PivotTables on Healthcare_Pivots.
// Each function parses the PivotTable's rendered range (a 2D values array
// from HealthOpsExcel.readPivotTable) into plain JS structures. Nothing is
// hardcoded – layouts are discovered from the "Row Labels" header rows, so
// the readers keep working if categories are added or reordered.
const HealthOpsPivots = (function () {
  const HEADER_LABELS = new Set(["row labels", "column labels"]);

  // ---------- helpers ----------

  function isBlank(v) {
    return v === "" || v === null || v === undefined;
  }

  function isGrandTotalLabel(label) {
    return typeof label === "string" && label.trim().toLowerCase() === "grand total";
  }

  function isHeaderLabel(label) {
    return typeof label === "string" && HEADER_LABELS.has(label.trim().toLowerCase());
  }

  function toNumber(v) {
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  }

  // Trim and collapse whitespace; if the source label is all lower-case
  // (e.g. " dhaka"), title-case it so it merges with its clean variant.
  function cleanLabel(label) {
    const s = String(label).replace(/\s+/g, " ").trim();
    if (s && s === s.toLowerCase()) {
      return s.replace(/\b\w/g, (ch) => ch.toUpperCase());
    }
    return s;
  }

  // Merges rows whose labels differ only by case/whitespace, summing values.
  // Guards against dirty source data reaching the charts as duplicate bars.
  function mergeDuplicateLabels(items) {
    const byKey = new Map();
    for (const item of items) {
      const key = item.label.toLowerCase();
      const existing = byKey.get(key);
      if (existing) {
        existing.value += item.value;
      } else {
        byKey.set(key, { ...item });
      }
    }
    return [...byKey.values()];
  }

  function findHeaderRowIndex(values) {
    return values.findIndex((r) => typeof r[0] === "string" && r[0].trim().toLowerCase() === "row labels");
  }

  // True when every department row has identical values for the given keys.
  // That pattern means the measure's table is not related to Departments in
  // the Data Model, so each row just repeats the grand total.
  function isUniformAcross(rows, keys) {
    if (rows.length < 2) return false;
    const first = rows[0];
    return rows.every((r) =>
      keys.every((k) => {
        const a = r[k];
        const b = first[k];
        if (a === null || b === null) return a === b;
        return Math.abs(a - b) < 1e-9;
      })
    );
  }

  function sum(arr) {
    return arr.reduce((acc, v) => acc + (v || 0), 0);
  }

  // ---------- generic parsers ----------

  // Single category column + single value column + trailing Grand Total.
  function parseSimpleList(values) {
    const items = [];
    let grandTotal = null;

    for (const row of values) {
      const label = row[0];
      const value = row[1];
      if (isBlank(label) || isHeaderLabel(label)) continue;
      if (isGrandTotalLabel(label)) {
        grandTotal = toNumber(value);
        continue;
      }
      const num = toNumber(value);
      if (num !== null) items.push({ label: cleanLabel(label), value: num });
    }

    const merged = mergeDuplicateLabels(items);
    if (grandTotal === null) grandTotal = sum(merged.map((i) => i.value));
    return { items: merged, grandTotal };
  }

  // Rows = category, columns = a second category, one data field.
  // Layout: [title row], ["Row Labels", col1, ..., "Grand Total"], data..., Grand Total.
  function parseCrossTab(values) {
    const headerIdx = findHeaderRowIndex(values);
    if (headerIdx < 0) return { columns: [], rows: [], grandTotal: null };

    const header = values[headerIdx];
    const lastCol = header.length - 1;
    const hasTotalCol = isGrandTotalLabel(header[lastCol]);
    const columns = header.slice(1, hasTotalCol ? lastCol : undefined).map(cleanLabel);

    const rows = [];
    let grandTotal = null;
    for (let i = headerIdx + 1; i < values.length; i++) {
      const row = values[i];
      const label = row[0];
      if (isBlank(label) || isHeaderLabel(label)) continue;

      const byColumn = {};
      columns.forEach((col, c) => {
        byColumn[col] = toNumber(row[1 + c]);
      });
      const total = hasTotalCol ? toNumber(row[lastCol]) : sum(Object.values(byColumn));

      if (isGrandTotalLabel(label)) {
        grandTotal = { byColumn, total };
      } else {
        rows.push({ label: cleanLabel(label), byColumn, total });
      }
    }
    return { columns, rows, grandTotal };
  }

  // ---------- simple lists ----------

  const simpleReader = (name) => async () => {
    const { values } = await HealthOpsExcel.readPivotTable(name);
    return parseSimpleList(values);
  };

  const getAppointmentStatus = simpleReader("PT_AppointmentStatus");
  const getBookingChannel = simpleReader("PT_BookingChannel");
  const getPatientType = simpleReader("PT_PatientType");
  const getInsurance = simpleReader("PT_Insurance");
  const getVisitType = simpleReader("PT_VisitType");
  const getDiagnosis = simpleReader("PT_Diagnosis");
  const getTreatmentStatus = simpleReader("PT_TreatmentStatus");
  const getDischargeStatus = simpleReader("PT_DischargeStatus");
  const getCityPatients = simpleReader("PT_CityWisePatients");

  // ---------- cross-tabs ----------

  // Department × AppointmentStatus (count of appointments).
  async function getDepartmentPerformance() {
    const { values } = await HealthOpsExcel.readPivotTable("PT_DepartmentPerformance");
    const { columns, rows, grandTotal } = parseCrossTab(values);
    return {
      statusLabels: columns,
      departments: rows.map((r) => ({ department: r.label, byStatus: r.byColumn, total: r.total })),
      grandTotal: grandTotal ? grandTotal.total : null,
      totalsByStatus: grandTotal ? grandTotal.byColumn : {},
    };
  }

  // Doctor × Specialization (total visits). Each doctor has a single
  // specialization, which is the column holding their value.
  async function getDoctorWorkload() {
    const { values } = await HealthOpsExcel.readPivotTable("PT_DoctorWorkload");
    const { columns, rows, grandTotal } = parseCrossTab(values);

    const doctors = rows.map((r) => ({
      doctor: r.label,
      specialization: columns.find((c) => r.byColumn[c] !== null) || null,
      total: r.total,
    }));
    doctors.sort((a, b) => (b.total || 0) - (a.total || 0));

    const totals = doctors.map((d) => d.total || 0);
    return {
      specLabels: columns,
      doctors,
      totalVisits: grandTotal ? grandTotal.total : sum(totals),
      avgVisitsPerDoctor: doctors.length ? sum(totals) / doctors.length : null,
    };
  }

  // Department × Bed status (count of beds).
  async function getBedStatus() {
    const { values } = await HealthOpsExcel.readPivotTable("PT_BedStatus");
    const { columns, rows, grandTotal } = parseCrossTab(values);

    const departments = rows.map((r) => ({ department: r.label, byStatus: r.byColumn, total: r.total }));
    const byStatus = grandTotal ? grandTotal.byColumn : {};
    const totalBeds = grandTotal ? grandTotal.total : null;
    const occupied = byStatus["Occupied"] ?? null;

    return {
      statusLabels: columns,
      byStatus,
      totalBeds,
      occupancyRate: totalBeds && occupied !== null ? occupied / totalBeds : null,
      departments,
      departmentsUnrelated: isUniformAcross(
        departments.map((d) => ({ total: d.total, ...d.byStatus })),
        ["total", ...columns]
      ),
    };
  }

  // ---------- multi-measure pivots ----------

  // Department rows, two measures: Avg Waiting Time, Avg Consultation Duration.
  async function getWaitingTime() {
    const { values } = await HealthOpsExcel.readPivotTable("PT_WaitingTime");
    const departments = [];
    let overall = null;

    for (const row of values) {
      const label = row[0];
      if (isBlank(label) || isHeaderLabel(label)) continue;
      const entry = { avgWaitingTime: toNumber(row[1]), avgConsultationDuration: toNumber(row[2]) };
      if (isGrandTotalLabel(label)) overall = entry;
      else departments.push({ department: cleanLabel(label), ...entry });
    }

    return {
      departments,
      overall,
      departmentsUnrelated: isUniformAcross(departments, ["avgWaitingTime", "avgConsultationDuration"]),
    };
  }

  // Department rows, four measures: Waiting / Doctor / Cleanliness / Overall score.
  async function getPatientSatisfaction() {
    const { values } = await HealthOpsExcel.readPivotTable("PT_PatientSatisfaction");
    const keys = ["waiting", "doctor", "cleanliness", "overall"];
    const departments = [];
    let overall = null;

    for (const row of values) {
      const label = row[0];
      if (isBlank(label) || isHeaderLabel(label)) continue;
      const entry = {};
      keys.forEach((k, i) => {
        entry[k] = toNumber(row[1 + i]);
      });
      if (isGrandTotalLabel(label)) overall = entry;
      else departments.push({ department: cleanLabel(label), ...entry });
    }

    return { departments, overall, departmentsUnrelated: isUniformAcross(departments, keys) };
  }

  // Department rows × AdmissionType columns, each with two measures
  // (Total Admissions, Average Length of Stay), plus two trailing total columns.
  // Layout: [blank/"Column Labels"], [type header], ["Row Labels", measures...], data..., Grand Total.
  async function getAdmissions() {
    const { values } = await HealthOpsExcel.readPivotTable("PT_Admissions");
    const measureIdx = findHeaderRowIndex(values);
    if (measureIdx < 1) return { types: [], departments: [], grandTotal: null };

    const typeRow = values[measureIdx - 1];
    const measureRow = values[measureIdx];

    // Map each data column to { type, measure }.
    const columns = [];
    let currentType = null;
    for (let c = 1; c < measureRow.length; c++) {
      if (!isBlank(typeRow[c])) currentType = cleanLabel(typeRow[c]);
      const measure = measureRow[c];
      if (isBlank(measure) || !currentType || /^total /i.test(currentType)) continue;
      const kind = /length of stay/i.test(measure) ? "avgLengthOfStay" : /admission/i.test(measure) ? "admissions" : null;
      if (kind) columns.push({ c, type: currentType, kind });
    }
    const types = [...new Set(columns.map((col) => col.type))];
    const lastIdx = measureRow.length - 1;

    function parseRow(row) {
      const byType = {};
      types.forEach((t) => {
        byType[t] = { admissions: null, avgLengthOfStay: null };
      });
      columns.forEach(({ c, type, kind }) => {
        byType[type][kind] = toNumber(row[c]);
      });
      return {
        byType,
        totalAdmissions: toNumber(row[lastIdx - 1]),
        avgLengthOfStay: toNumber(row[lastIdx]),
      };
    }

    const departments = [];
    let grandTotal = null;
    for (let i = measureIdx + 1; i < values.length; i++) {
      const row = values[i];
      const label = row[0];
      if (isBlank(label) || isHeaderLabel(label)) continue;
      if (isGrandTotalLabel(label)) grandTotal = parseRow(row);
      else departments.push({ department: cleanLabel(label), ...parseRow(row) });
    }

    return { types, departments, grandTotal };
  }

  // Gender rows × City columns × {Count, Avg Age}, plus trailing totals.
  async function getPatientDemographics() {
    const { values } = await HealthOpsExcel.readPivotTable("PT_PatientDemographics");
    const measureIdx = findHeaderRowIndex(values);
    const genderMap = new Map();
    let grandTotal = null;

    for (let i = Math.max(measureIdx + 1, 0); i < values.length; i++) {
      const row = values[i];
      const label = row[0];
      if (isBlank(label) || isHeaderLabel(label)) continue;
      const count = toNumber(row[row.length - 2]);
      const avgAge = toNumber(row[row.length - 1]);
      if (isGrandTotalLabel(label)) {
        grandTotal = { count, avgAge };
        continue;
      }
      if (count === null) continue;

      const gender = cleanLabel(label);
      const key = gender.toLowerCase();
      const prev = genderMap.get(key);
      if (prev) {
        // Weighted-merge case variants ("male" + "Male").
        const n = prev.count + count;
        prev.avgAge = n ? (prev.avgAge * prev.count + avgAge * count) / n : null;
        prev.count = n;
      } else {
        genderMap.set(key, { gender, count, avgAge });
      }
    }
    return { genders: [...genderMap.values()], grandTotal };
  }

  return {
    // exposed for unit tests
    _internal: { parseSimpleList, parseCrossTab, cleanLabel, isUniformAcross },
    getDepartmentPerformance,
    getAppointmentStatus,
    getBookingChannel,
    getDoctorWorkload,
    getWaitingTime,
    getAdmissions,
    getBedStatus,
    getPatientSatisfaction,
    getPatientDemographics,
    getPatientType,
    getInsurance,
    getVisitType,
    getDiagnosis,
    getTreatmentStatus,
    getDischargeStatus,
    getCityPatients,
  };
})();
