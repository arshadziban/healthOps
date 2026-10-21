// KPI engine. Parses every PivotTable once per load into a single model that
// all views render from, and derives KPIs, insights and data-quality notes.
const HealthOpsDashboard = (function () {
  async function loadModel() {
    const P = HealthOpsPivots;
    const [
      departmentPerformance,
      appointmentStatus,
      bookingChannel,
      doctorWorkload,
      waitingTime,
      admissions,
      bedStatus,
      satisfaction,
      demographics,
      patientType,
      insurance,
      visitType,
      diagnosis,
      treatmentStatus,
      dischargeStatus,
      cityPatients,
    ] = await Promise.all([
      P.getDepartmentPerformance(),
      P.getAppointmentStatus(),
      P.getBookingChannel(),
      P.getDoctorWorkload(),
      P.getWaitingTime(),
      P.getAdmissions(),
      P.getBedStatus(),
      P.getPatientSatisfaction(),
      P.getPatientDemographics(),
      P.getPatientType(),
      P.getInsurance(),
      P.getVisitType(),
      P.getDiagnosis(),
      P.getTreatmentStatus(),
      P.getDischargeStatus(),
      P.getCityPatients(),
    ]);

    const model = {
      departmentPerformance,
      appointmentStatus,
      bookingChannel,
      doctorWorkload,
      waitingTime,
      admissions,
      bedStatus,
      satisfaction,
      demographics,
      patientType,
      insurance,
      visitType,
      diagnosis,
      treatmentStatus,
      dischargeStatus,
      cityPatients,
    };
    model.kpis = computeKpis(model);
    model.insights = computeInsights(model);
    model.dataQuality = computeDataQuality(model);
    return model;
  }

  function share(items, label) {
    const total = items.reduce((acc, i) => acc + i.value, 0);
    const item = items.find((i) => i.label.toLowerCase() === label.toLowerCase());
    return item && total ? item.value / total : null;
  }

  function computeKpis(m) {
    const appts = m.appointmentStatus.items;
    return {
      totalPatients: m.patientType.grandTotal,
      totalAppointments: m.appointmentStatus.grandTotal,
      totalVisits: m.visitType.grandTotal,
      totalAdmissions: m.admissions.grandTotal ? m.admissions.grandTotal.totalAdmissions : null,
      totalBeds: m.bedStatus.totalBeds,
      avgWaitingTime: m.waitingTime.overall ? m.waitingTime.overall.avgWaitingTime : null,
      avgConsultation: m.waitingTime.overall ? m.waitingTime.overall.avgConsultationDuration : null,
      avgSatisfaction: m.satisfaction.overall ? m.satisfaction.overall.overall : null,
      currentOccupancyRate: m.bedStatus.occupancyRate,
      completionRate: share(appts, "Completed"),
      noShowRate: share(appts, "No Show"),
      cancellationRate: share(appts, "Cancelled"),
      avgLengthOfStay: m.admissions.grandTotal ? m.admissions.grandTotal.avgLengthOfStay : null,
      inpatientShare: share(m.patientType.items, "Inpatient"),
    };
  }

  function top(items, key = "value") {
    return [...items].sort((a, b) => (b[key] || 0) - (a[key] || 0))[0];
  }

  function computeInsights(m) {
    const U = HealthOpsUtils;
    const k = m.kpis;
    const out = [];

    const busiest = top(m.departmentPerformance.departments, "total");
    if (busiest && m.departmentPerformance.grandTotal) {
      out.push(
        `<strong>${U.escapeHtml(busiest.department)}</strong> carries the highest appointment load: ` +
          `${U.formatNumber(busiest.total)} (${U.formatPercent(busiest.total / m.departmentPerformance.grandTotal)} of all appointments).`
      );
    }

    if (k.noShowRate !== null && k.cancellationRate !== null) {
      out.push(
        `<strong>${U.formatPercent(k.noShowRate + k.cancellationRate)}</strong> of appointments are lost to no-shows ` +
          `(${U.formatPercent(k.noShowRate)}) or cancellations (${U.formatPercent(k.cancellationRate)}).`
      );
    }

    const channel = top(m.bookingChannel.items);
    if (channel && m.bookingChannel.grandTotal) {
      out.push(
        `<strong>${U.escapeHtml(channel.label)}</strong> is the leading booking channel at ` +
          `${U.formatPercent(channel.value / m.bookingChannel.grandTotal)} of bookings.`
      );
    }

    if (k.currentOccupancyRate !== null) {
      out.push(
        `Bed occupancy is <strong>${U.formatPercent(k.currentOccupancyRate)}</strong> ` +
          `(${U.formatNumber(m.bedStatus.byStatus["Occupied"])} of ${U.formatNumber(k.totalBeds)} beds), ` +
          `with ${U.formatNumber(m.bedStatus.byStatus["Available"])} available.`
      );
    }

    if (k.avgWaitingTime !== null && k.avgConsultation) {
      out.push(
        `Patients wait <strong>${U.formatDecimal(k.avgWaitingTime, 1)} min</strong> on average for a ` +
          `${U.formatDecimal(k.avgConsultation, 1)} min consultation (${U.formatDecimal(k.avgWaitingTime / k.avgConsultation, 1)}× ratio).`
      );
    }

    if (k.avgSatisfaction !== null) {
      out.push(`Overall patient satisfaction is <strong>${U.formatDecimal(k.avgSatisfaction, 2)} / 5</strong>.`);
    }

    return out;
  }

  function computeDataQuality(m) {
    const issues = [];
    if (m.bedStatus.departmentsUnrelated) {
      issues.push("Bed status is identical for every department – the Beds table is not related to Departments in the Data Model.");
    }
    if (m.waitingTime.departmentsUnrelated) {
      issues.push("Waiting time is identical for every department – the Visits table is not related to Departments in the Data Model.");
    }
    if (m.satisfaction.departmentsUnrelated) {
      issues.push("Satisfaction is identical for every department – the Satisfaction table is not related to Visits/Departments in the Data Model.");
    }
    return issues;
  }

  return { loadModel };
})();
