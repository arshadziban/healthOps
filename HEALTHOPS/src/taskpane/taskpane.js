// HEALTHOPS controller: loads the model, renders KPI cards and the active
// view, and wires up navigation and refresh.
(function () {
  const U = HealthOpsUtils;
  const C = HealthOpsCharts;

  let model = null;
  let loading = false;

  // ---------- icons ----------

  // Hugeicons (stroke-rounded, 24x24) — same set as the Hugeicons Figma plugin.
  // Hugeicons (stroke-rounded, 24x24) — same set as the Hugeicons Figma plugin.
  // Hugeicons (stroke-rounded, 24x24) — same set as the Hugeicons Figma plugin.
  const ICONS = {
    appointment: '<path d="M16 2V6M8 2V6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M13 4H11C7.22876 4 5.34315 4 4.17157 5.17157C3 6.34315 3 8.22876 3 12V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H13C16.7712 22 18.6569 22 19.8284 20.8284C21 19.6569 21 17.7712 21 14V12C21 8.22876 21 6.34315 19.8284 5.17157C18.6569 4 16.7712 4 13 4Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M3 10H21" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M12.1258 14H12.0008M12.1258 18H12.0008M7.625 14H7.5M7.625 18H7.5M16.625 14H16.5M12.2508 14C12.2508 14.1381 12.1389 14.25 12.0008 14.25C11.8628 14.25 11.7508 14.1381 11.7508 14C11.7508 13.8619 11.8628 13.75 12.0008 13.75C12.1389 13.75 12.2508 13.8619 12.2508 14ZM12.2508 18C12.2508 18.1381 12.1389 18.25 12.0008 18.25C11.8628 18.25 11.7508 18.1381 11.7508 18C11.7508 17.8619 11.8628 17.75 12.0008 17.75C12.1389 17.75 12.2508 17.8619 12.2508 18ZM7.75 14C7.75 14.1381 7.63807 14.25 7.5 14.25C7.36193 14.25 7.25 14.1381 7.25 14C7.25 13.8619 7.36193 13.75 7.5 13.75C7.63807 13.75 7.75 13.8619 7.75 14ZM7.75 18C7.75 18.1381 7.63807 18.25 7.5 18.25C7.36193 18.25 7.25 18.1381 7.25 18C7.25 17.8619 7.36193 17.75 7.5 17.75C7.63807 17.75 7.75 17.8619 7.75 18ZM16.75 14C16.75 14.1381 16.6381 14.25 16.5 14.25C16.3619 14.25 16.25 14.1381 16.25 14C16.25 13.8619 16.3619 13.75 16.5 13.75C16.6381 13.75 16.75 13.8619 16.75 14Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
    waiting: '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><path d="M12 8V12L14 14" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
    bed: '<path d="M19.5903 6L4.40974 6C4.17689 6 4.06046 6 3.95117 6.01655C3.44896 6.0926 2.98753 6.4267 2.66218 6.94983C2.59137 7.06367 2.52679 7.19473 2.39763 7.45684C2.19831 7.86133 2.09864 8.06357 2.05784 8.21806C1.86185 8.96021 2.18187 9.76918 2.74703 9.96023C2.86468 10 3.04435 10 3.40368 10L20.5963 10C20.9557 10 21.1353 10 21.253 9.96023C21.8181 9.76918 22.1382 8.96021 21.9422 8.21806C21.9014 8.06358 21.8017 7.86128 21.6024 7.45684C21.4732 7.19476 21.4086 7.06366 21.3378 6.94983C21.0125 6.4267 20.551 6.0926 20.0488 6.01655C19.9395 6 19.8231 6 19.5903 6Z" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"/><path d="M6 14L18 14" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"/><path d="M4 10L5.25245 11.5882C5.95166 12.4749 6.17691 13.6387 5.85802 14.717L5.18289 17" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"/><path d="M20 10L18.7476 11.5882C18.0483 12.4749 17.8231 13.6387 18.142 14.717L18.8171 17" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"/><path d="M7 19C7 20.1046 6.10457 21 5 21C3.89543 21 3 20.1046 3 19C3 17.8954 3.89543 17 5 17C6.10457 17 7 17.8954 7 19Z" stroke="currentColor" stroke-width="1.5"/><path d="M21 19C21 20.1046 20.1046 21 19 21C17.8954 21 17 20.1046 17 19C17 17.8954 17.8954 17 19 17C20.1046 17 21 17.8954 21 19Z" stroke="currentColor" stroke-width="1.5"/><path d="M6 6V4.1036C6 3.38598 6.61139 2.85943 7.24254 3.03348L9.24254 3.58501C9.6877 3.70777 10 4.14897 10 4.65513V6" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"/>',
    satisfaction: '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M8 15C8.91212 16.2144 10.3643 17 12 17C13.6357 17 15.0879 16.2144 16 15" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M15.625 8.387V8.91649M8.375 8.387V8.91649M8.75 8.75C8.75 8.33579 8.58211 8 8.375 8C8.16789 8 8 8.33579 8 8.75C8 9.16421 8.16789 9.5 8.375 9.5C8.58211 9.5 8.75 9.16421 8.75 8.75ZM16 8.75C16 8.33579 15.8321 8 15.625 8C15.4179 8 15.25 8.33579 15.25 8.75C15.25 9.16421 15.4179 9.5 15.625 9.5C15.8321 9.5 16 9.16421 16 8.75Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
    patients: '<path d="M18.4995 20.5C18.2663 17.5685 15.8417 15.2477 12.808 15.0521L11.9995 15C11.7107 15.0076 11.4416 15.0178 11.1877 15.0298C8.18075 15.1723 5.7304 17.5974 5.49951 20.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M15.2495 9.25C15.2495 11.0449 13.7944 12.5 11.9995 12.5C10.2046 12.5 8.74952 11.0449 8.74952 9.25C8.74952 7.45507 10.2046 6 11.9995 6C13.7944 6 15.2495 7.45507 15.2495 9.25Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M5.50249 8.5C5.17908 7.99485 4.99158 7.39432 4.99158 6.75C4.99158 4.95507 6.44665 3.5 8.24157 3.5C8.68752 3.5 9.1125 3.58982 9.49939 3.75235" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M18.4963 8.5C18.8197 7.99485 19.0072 7.39432 19.0072 6.75C19.0072 4.95507 17.5521 3.5 15.7572 3.5C15.3113 3.5 14.8863 3.58982 14.4994 3.75235" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M22.0007 17.9996C21.8208 15.7374 19.9995 13.5 17.9995 13" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M1.99927 17.9996C2.17923 15.7374 4.00049 13.5 6.00049 13" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
    visit: '<path d="M20 21.9999V18.9999C20 16.1715 20 14.7572 19.1213 13.8786C18.2426 12.9999 16.8284 12.9999 14 12.9999H10C7.17157 12.9999 5.75736 12.9999 4.87868 13.8786C4 14.7572 4 16.1715 4 18.9999C4 19.9318 4 20.3977 4.15224 20.7652C4.35523 21.2553 4.74458 21.6446 5.23463 21.8476C5.60218 21.9999 6.06812 21.9999 7 21.9999" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M9.5 12.9999L12.5 21.9999M7 13.4999V21.9999" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M12 18.9999H14.5C15.3284 18.9999 16 19.6715 16 20.4999C16 21.3283 15.3284 21.9999 14.5 21.9999H12.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M15.5 6.49997V5.49997C15.5 3.56697 13.933 1.99997 12 1.99997C10.067 1.99997 8.5 3.56697 8.5 5.49997V6.49997C8.5 8.43297 10.067 9.99997 12 9.99997C13.933 9.99997 15.5 8.43297 15.5 6.49997Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
    admission: '<path d="M11 18H15M13.5 8H14.4429C15.7533 8 16.4086 8 16.9641 8.31452C17.5196 8.62904 17.89 9.20972 18.6308 10.3711C19.1502 11.1854 19.6955 11.7765 20.4622 12.3024C21.2341 12.8318 21.6012 13.0906 21.8049 13.506C22 13.9038 22 14.375 22 15.3173C22 16.5596 22 17.1808 21.651 17.5755C21.636 17.5925 21.6207 17.609 21.6049 17.625C21.2375 18 20.6594 18 19.503 18H19" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M5 18C3.58579 18 2.87868 18 2.43934 17.5607C2 17.1213 2 16.4142 2 15V8C2 6.58579 2 5.87868 2.43934 5.43934C2.87868 5 3.58579 5 5 5H10.5C11.9142 5 12.6213 5 13.0607 5.43934C13.5 5.87868 13.5 6.58579 13.5 8V18H9" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M22 15H21" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M8 9V13M10 11L6 11" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><circle cx="17" cy="18" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="7" cy="18" r="2" stroke="currentColor" stroke-width="1.5"/>',
    noShow: '<path d="M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><path d="M14.9994 15L9 9M9.00064 15L15 9" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
  };

  function svg(path) {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${path}</svg>`;
  }

  // ---------- small render helpers ----------

  function setHtml(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function donutCenter(id, value, label) {
    setHtml(id, `<div class="donut-value">${U.formatNumber(value)}</div><div class="donut-label">${U.escapeHtml(label)}</div>`);
  }

  function donutFromList(canvasId, centerId, list, centerLabel) {
    C.renderDonutChart(canvasId, list.items.map((i) => i.label), list.items.map((i) => i.value));
    donutCenter(centerId, list.grandTotal, centerLabel);
  }

  function barFromList(canvasId, list, opts = {}) {
    const items = opts.sort ? [...list.items].sort((a, b) => b.value - a.value) : list.items;
    C.renderBarChart(canvasId, items.map((i) => i.label), [{ label: opts.label || "", data: items.map((i) => i.value) }], opts);
  }

  const minutes = (v) => `${U.formatDecimal(v, 1)} min`;
  const score = (v) => U.formatDecimal(v, 2);
  const days = (v) => `${U.formatDecimal(v, 2)} days`;
  const pct = (v) => U.formatPercent(v);

  // ---------- KPI cards ----------

  function renderKpiCards(k) {
    const cards = [
      { label: "Total Patients", value: U.formatNumber(k.totalPatients), sub: `${U.formatPercent(k.inpatientShare)} inpatient`, icon: "patients" },
      { label: "Appointments", value: U.formatNumber(k.totalAppointments), sub: `${U.formatPercent(k.completionRate)} completed`, icon: "appointment" },
      { label: "Patient Visits", value: U.formatNumber(k.totalVisits), sub: `${U.formatDecimal(k.avgConsultation, 1)} min avg consultation`, icon: "visit" },
      { label: "Admissions", value: U.formatNumber(k.totalAdmissions), sub: `${U.formatDecimal(k.avgLengthOfStay, 1)} days avg stay`, icon: "admission" },
      { label: "Bed Occupancy", value: U.formatPercent(k.currentOccupancyRate), sub: `${U.formatNumber(k.totalBeds)} beds in total`, icon: "bed", tone: k.currentOccupancyRate > 0.85 ? "warn" : null },
      { label: "Avg Waiting Time", value: `${U.formatDecimal(k.avgWaitingTime, 1)} min`, sub: "check-in to consultation", icon: "waiting" },
      { label: "Avg Satisfaction", value: `${U.formatDecimal(k.avgSatisfaction, 2)}<small> / 5</small>`, sub: "overall feedback score", icon: "satisfaction" },
      { label: "No-show Rate", value: U.formatPercent(k.noShowRate), sub: `+ ${U.formatPercent(k.cancellationRate)} cancelled`, icon: "noShow", tone: k.noShowRate > 0.1 ? "warn" : null },
    ];

    setHtml(
      "kpi-row",
      cards
        .map(
          (c, i) => `
        <div class="kpi-card${i === 0 ? " is-featured" : ""}${c.tone ? ` is-${c.tone}` : ""}">
          <div class="kpi-card-top">
            <span class="kpi-icon">${svg(ICONS[c.icon])}</span>
            <div class="kpi-text">
              <div class="kpi-label">${c.label}</div>
              <div class="kpi-value">${c.value}</div>
            </div>
          </div>
          <div class="kpi-sub">${c.sub}</div>
        </div>`
        )
        .join("")
    );
  }

  function renderKpiSkeletons() {
    setHtml(
      "kpi-row",
      Array.from({ length: 8 }, () => `<div class="kpi-card"><div class="kpi-skeleton short"></div><div class="kpi-skeleton"></div></div>`).join("")
    );
  }

  // ---------- shared chart blocks ----------

  // Stack order for status series: positive outcome first, problems last.
  const STATUS_ORDER = ["completed", "occupied", "rescheduled", "available", "no show", "maintenance", "cancelled"];

  function orderStatuses(labels) {
    const rank = (l) => {
      const i = STATUS_ORDER.indexOf(l.toLowerCase());
      return i < 0 ? STATUS_ORDER.length : i;
    };
    return [...labels].sort((a, b) => rank(a) - rank(b));
  }

  function renderDepartmentStacked(canvasId, m) {
    const dp = m.departmentPerformance;
    const depts = [...dp.departments].sort((a, b) => b.total - a.total);
    C.renderBarChart(
      canvasId,
      depts.map((d) => d.department),
      orderStatuses(dp.statusLabels).map((s) => ({ label: s, data: depts.map((d) => d.byStatus[s]) })),
      { horizontal: true, stacked: true }
    );
  }

  function renderDoctorTop10(canvasId, m) {
    const top10 = m.doctorWorkload.doctors.slice(0, 10);
    C.renderBarChart(
      canvasId,
      top10.map((d) => d.doctor),
      [{ label: "Visits", data: top10.map((d) => d.total) }],
      { horizontal: true, tooltipTitle: (i) => `${top10[i].doctor} · ${top10[i].specialization || "—"}` }
    );
  }

  function renderWaiting(canvasId, subId, m) {
    const wt = m.waitingTime;
    if (wt.departmentsUnrelated || !wt.departments.length) {
      const o = wt.overall || {};
      C.renderBarChart(canvasId, ["Waiting time", "Consultation"], [{ label: "Minutes", data: [o.avgWaitingTime, o.avgConsultationDuration] }], { format: minutes, axisFormat: (v) => v });
      setText(subId, "Average across all departments (minutes) – per-department split unavailable");
    } else {
      C.renderBarChart(
        canvasId,
        wt.departments.map((d) => d.department),
        [
          { label: "Waiting time", data: wt.departments.map((d) => d.avgWaitingTime), color: "#2F5A47" },
          { label: "Consultation", data: wt.departments.map((d) => d.avgConsultationDuration), color: "#3ECF8E" },
        ],
        { format: minutes, axisFormat: (v) => v }
      );
      setText(subId, "Average wait vs consultation by department (minutes)");
    }
  }

  function renderSatisfactionOverall(canvasId, m) {
    const s = m.satisfaction.overall || {};
    C.renderBarChart(
      canvasId,
      ["Waiting", "Doctor", "Cleanliness", "Overall"],
      [{ label: "Score", data: [s.waiting, s.doctor, s.cleanliness, s.overall] }],
      { valueMax: 5, format: score, axisFormat: (v) => v }
    );
  }

  // ---------- views ----------

  function renderExecutive(m) {
    renderDepartmentStacked("chart-department", m);
    donutFromList("chart-appointment-status", "appointment-donut-center", m.appointmentStatus, "Appointments");

    const bed = m.bedStatus;
    C.renderDonutChart("chart-bed-status", bed.statusLabels, bed.statusLabels.map((l) => bed.byStatus[l]));
    donutCenter("bed-donut-center", bed.totalBeds, "Beds");
    setText("occupancy-rate-value", U.formatPercent(bed.occupancyRate));
    const fill = document.getElementById("occupancy-meter-fill");
    if (fill) fill.style.width = `${Math.min(100, (bed.occupancyRate || 0) * 100)}%`;

    setHtml("key-insights-list", m.insights.map((t) => `<li>${t}</li>`).join(""));

    renderDoctorTop10("chart-doctor-workload", m);
    renderWaiting("chart-waiting-time", "waiting-sub-exec", m);
    renderSatisfactionOverall("chart-satisfaction", m);
  }

  function renderPatientFlow(m) {
    donutFromList("chart-patient-type", "patient-type-donut-center", m.patientType, "Patients");
    donutFromList("chart-visit-type", "visit-type-donut-center", m.visitType, "Visits");

    const g = m.demographics.genders;
    C.renderDonutChart("chart-demographics-pf", g.map((x) => x.gender), g.map((x) => x.count));
    donutCenter("demographics-donut-center", m.demographics.grandTotal && m.demographics.grandTotal.count, "Patients");

    barFromList("chart-booking-channel-pf", m.bookingChannel, { horizontal: true, sort: true, label: "Appointments" });
    barFromList("chart-city-pf", m.cityPatients, { horizontal: true, sort: true, label: "Patients" });
  }

  function renderHospitalOps(m) {
    const adm = m.admissions;
    C.renderBarChart(
      "chart-admissions-ho",
      adm.departments.map((d) => d.department),
      adm.types.map((t) => ({ label: t, data: adm.departments.map((d) => d.byType[t].admissions) })),
      { horizontal: true, stacked: true }
    );

    C.renderBarChart(
      "chart-los-ho",
      adm.departments.map((d) => d.department),
      [{ label: "Avg length of stay", data: adm.departments.map((d) => d.avgLengthOfStay) }],
      { horizontal: true, format: days, axisFormat: (v) => v }
    );

    const bed = m.bedStatus;
    if (bed.departmentsUnrelated) {
      C.renderBarChart("chart-bed-ho", bed.statusLabels, [{ label: "Beds", data: bed.statusLabels.map((l) => bed.byStatus[l]) }], {});
      setText("bed-sub-ho", "All departments combined – per-department split unavailable");
    } else {
      C.renderBarChart(
        "chart-bed-ho",
        bed.departments.map((d) => d.department),
        orderStatuses(bed.statusLabels).map((s) => ({ label: s, data: bed.departments.map((d) => d.byStatus[s]) })),
        { horizontal: true, stacked: true }
      );
      setText("bed-sub-ho", "Occupied / available / maintenance by department");
    }

    renderDoctorTop10("chart-doctor-ho", m);
    renderDepartmentTable(m);
  }

  function renderDepartmentTable(m) {
    const admByDept = new Map(m.admissions.departments.map((d) => [d.department, d]));
    const bedByDept = m.bedStatus.departmentsUnrelated ? new Map() : new Map(m.bedStatus.departments.map((d) => [d.department, d]));
    const showBeds = bedByDept.size > 0;

    const head = ["Department", "Appointments", "Completed", "No-show", "Cancelled", "Admissions", "Avg stay (days)"]
      .concat(showBeds ? ["Bed occupancy"] : [])
      .map((h, i) => `<th${i ? ' class="num"' : ""}>${h}</th>`)
      .join("");

    const rows = [...m.departmentPerformance.departments]
      .sort((a, b) => b.total - a.total)
      .map((d) => {
        const a = admByDept.get(d.department) || {};
        const b = bedByDept.get(d.department);
        const rate = (s) => (d.total ? d.byStatus[s] / d.total : null);
        const cells = [
          U.formatNumber(d.total),
          U.formatPercent(rate("Completed")),
          U.formatPercent(rate("No Show")),
          U.formatPercent(rate("Cancelled")),
          U.formatNumber(a.totalAdmissions),
          U.formatDecimal(a.avgLengthOfStay, 2),
        ];
        if (showBeds) cells.push(U.formatPercent(b && b.total ? b.byStatus["Occupied"] / b.total : null));
        return `<tr><th scope="row">${U.escapeHtml(d.department)}</th>${cells.map((c) => `<td class="num">${c}</td>`).join("")}</tr>`;
      })
      .join("");

    setHtml("dept-table", `<thead><tr>${head}</tr></thead><tbody>${rows}</tbody>`);
  }

  function renderPatientExperience(m) {
    const sat = m.satisfaction;
    if (sat.departmentsUnrelated || !sat.departments.length) {
      renderSatisfactionOverall("chart-satisfaction-pe", m);
      setText("satisfaction-sub-pe", "Average across all departments (out of 5) – per-department split unavailable");
    } else {
      C.renderBarChart(
        "chart-satisfaction-pe",
        sat.departments.map((d) => d.department),
        [
          { label: "Waiting", data: sat.departments.map((d) => d.waiting) },
          { label: "Doctor", data: sat.departments.map((d) => d.doctor) },
          { label: "Cleanliness", data: sat.departments.map((d) => d.cleanliness) },
          { label: "Overall", data: sat.departments.map((d) => d.overall) },
        ],
        { valueMax: 5, format: score, axisFormat: (v) => v }
      );
      setText("satisfaction-sub-pe", "Satisfaction scores by department (out of 5)");
    }

    renderWaiting("chart-waiting-pe", "waiting-sub-pe", m);

    const depts = m.departmentPerformance.departments;
    C.renderBarChart(
      "chart-reliability-pe",
      depts.map((d) => d.department),
      [
        { label: "No-show rate", data: depts.map((d) => (d.total ? d.byStatus["No Show"] / d.total : null)), color: "#95E5C1" },
        { label: "Cancellation rate", data: depts.map((d) => (d.total ? d.byStatus["Cancelled"] / d.total : null)), color: "#0E3D29" },
      ],
      { format: pct, axisFormat: (v) => `${Math.round(v * 100)}%` }
    );
  }

  function renderClinical(m) {
    barFromList("chart-diagnosis-ci", m.diagnosis, { horizontal: true, sort: true, label: "Visits" });
    donutFromList("chart-treatment-ci", "treatment-donut-center", m.treatmentStatus, "Visits");
    donutFromList("chart-discharge-ci", "discharge-donut-center", m.dischargeStatus, "Admissions");
    barFromList("chart-insurance-ci", m.insurance, { sort: true, label: "Patients" });

    const g = m.demographics.genders;
    const all = m.demographics.grandTotal;
    C.renderBarChart(
      "chart-age-ci",
      g.map((x) => x.gender).concat(all ? ["All patients"] : []),
      [{ label: "Average age", data: g.map((x) => x.avgAge).concat(all ? [all.avgAge] : []) }],
      { format: (v) => `${U.formatDecimal(v, 1)} yrs`, axisFormat: (v) => v }
    );
  }

  const RENDERERS = {
    executive: renderExecutive,
    "patient-flow": renderPatientFlow,
    "hospital-ops": renderHospitalOps,
    "patient-experience": renderPatientExperience,
    "clinical-insights": renderClinical,
  };

  function renderCurrentView() {
    if (!model) return;
    const view = HealthOpsNavigation.getCurrentView();
    try {
      RENDERERS[view](model);
    } catch (error) {
      console.error(error);
      U.showBanner(`Could not render this view: ${error.message}`, "error");
    }
  }

  function renderDataQuality(issues) {
    const box = document.getElementById("data-quality");
    if (!box) return;
    box.hidden = issues.length === 0;
    setText("data-quality-summary", `${issues.length} data model warning${issues.length === 1 ? "" : "s"} – some department breakdowns are unavailable`);
    setHtml("data-quality-list", issues.map((i) => `<li>${U.escapeHtml(i)}</li>`).join(""));
  }

  // ---------- loading ----------

  async function load({ refresh = false } = {}) {
    if (loading) return;
    loading = true;

    const btn = document.getElementById("refresh-btn");
    btn.disabled = true;
    btn.classList.add("is-busy");
    if (!model) renderKpiSkeletons();

    try {
      if (refresh) {
        U.showBanner("Reloading data.js… (run the OpenHealthOpsDashboard macro in Excel first to export fresh values)", "loading");
        await HealthOpsExcel.refreshAllPivotTables();
      } else {
        await HealthOpsExcel.loadSnapshot();
      }

      model = await HealthOpsDashboard.loadModel();
      renderKpiCards(model.kpis);
      renderDataQuality(model.dataQuality);
      renderCurrentView();

      const info = await HealthOpsExcel.getWorkbookInfo();
      U.setLastRefreshed(info.generatedAt ? new Date(info.generatedAt) : new Date());

      if (refresh) U.showBanner("Dashboard refreshed.", "success", 2500);
      else U.hideBanner();
    } catch (error) {
      console.error(error);
      U.showBanner(model ? `Refresh failed: ${error.message} Showing the last loaded data.` : error.message, "error");
      if (!model) setHtml("kpi-row", "");
    } finally {
      loading = false;
      btn.disabled = false;
      btn.classList.remove("is-busy");
    }
  }

  // ---------- bootstrap ----------

  window.addEventListener("error", (event) => {
    U.showBanner(`Script error: ${event.message}`, "error");
  });

  function init() {
    if (typeof Chart === "undefined") {
      U.showBanner("Chart.js failed to load (src/assets/chart.umd.js is missing). Run `npm install` in the HEALTHOPS folder.", "error");
      return;
    }

    HealthOpsNavigation.init(renderCurrentView);
    document.getElementById("refresh-btn").addEventListener("click", () => load({ refresh: true }));

    // Donut legends switch between side and bottom placement at this width.
    window.matchMedia("(max-width: 640px)").addEventListener("change", renderCurrentView);

    load();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
