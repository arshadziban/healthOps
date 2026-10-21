// Chart.js wrappers with a consistent HEALTHOPS look.
const HealthOpsCharts = (function () {
  // Categorical palette: brand greens first, then distinguishable accents so
  // donuts with 4–6 slices stay readable.
  // Green shades only (Figma mint palette): lighter = neutral, darkest = worst outcome.
  const PALETTE = ["#3ECF8E", "#16995F", "#95E5C1", "#2F5A47", "#5FB88C", "#0E3D29", "#28845B", "#C9F2DF"];

  // Semantic colours for well-known categories, so the same status always
  // gets the same colour across every chart.
  const SEMANTIC = {
    completed: "#3ECF8E",
    cancelled: "#0E3D29",
    "no show": "#16995F",
    rescheduled: "#95E5C1",
    occupied: "#3ECF8E",
    available: "#E3F5EC",
    maintenance: "#2F5A47",
    female: "#3ECF8E",
    male: "#16995F",
    inpatient: "#16995F",
    outpatient: "#95E5C1",
    emergency: "#2F5A47",
    scheduled: "#3ECF8E",
    transfer: "#95E5C1",
  };

  const TEXT_MUTED = "#2F5A47";
  const GRID = "#D7EEE3";
  const BAR_IDLE = "#E3F5EC";
  const BRAND_STOPS = ["#87FFC9", "#46CD90", "#8CEBBF"];
  const chartInstances = {};

  if (typeof Chart !== "undefined") {
    Chart.defaults.font.family = '"Urbanist", "Segoe UI", sans-serif';
    Chart.defaults.font.size = 12;
    Chart.defaults.color = TEXT_MUTED;
    Chart.defaults.animation.duration = 450;
  }

  // Keeps the HTML ".donut-center" label centred on the ring itself, which
  // shifts when Chart.js reserves space for a side legend.
  const donutCenterPlugin = {
    id: "healthopsDonutCenter",
    afterLayout(chart) {
      const label = chart.canvas.parentElement && chart.canvas.parentElement.querySelector(".donut-center");
      const area = chart.chartArea;
      if (!label || !area) return;
      label.style.left = `${(area.left + area.right) / 2}px`;
      label.style.top = `${(area.top + area.bottom) / 2}px`;
    },
  };

  function colorFor(label, i) {
    const key = String(label).trim().toLowerCase();
    return SEMANTIC[key] || PALETTE[i % PALETTE.length];
  }

  function colorsFor(labels) {
    return labels.map(colorFor);
  }

  // Scriptable fill with the brand gradient (#87FFC9 → #46CD90 → #8CEBBF),
  // running from the bar's tip towards its base.
  function brandGradient(ctx, horizontal) {
    const area = ctx.chart.chartArea;
    if (!area) return BRAND_STOPS[1];
    const g = horizontal
      ? ctx.chart.ctx.createLinearGradient(area.right, 0, area.left, 0)
      : ctx.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
    BRAND_STOPS.forEach((c, i) => g.addColorStop(i / (BRAND_STOPS.length - 1), c));
    return g;
  }

  function maxIndex(data) {
    let best = -1;
    data.forEach((v, i) => {
      if (v !== null && v !== undefined && (best < 0 || v > data[best])) best = i;
    });
    return best;
  }

  function create(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    chartInstances[canvasId] = new Chart(canvas.getContext("2d"), config);
    return chartInstances[canvasId];
  }

  function legend(position) {
    return {
      position,
      labels: { boxWidth: 8, boxHeight: 8, padding: 14, usePointStyle: true, pointStyle: "circle", color: "#2F5A47", font: { size: 12 } },
    };
  }

  // White tooltip card, as in the Figma chart.
  function tooltip(format, titleFor) {
    return {
      backgroundColor: "#FFFFFF",
      borderColor: "#D7EEE3",
      borderWidth: 1,
      titleColor: "#0B2A1D",
      bodyColor: "#2F5A47",
      titleFont: { size: 13, weight: "600" },
      bodyFont: { size: 12 },
      padding: 12,
      cornerRadius: 11,
      boxPadding: 5,
      boxWidth: 7,
      boxHeight: 7,
      usePointStyle: true,
      caretSize: 0,
      callbacks: {
        ...(titleFor ? { title: (items) => (items.length ? titleFor(items[0].dataIndex) : "") } : {}),
        label(ctx) {
          const raw = ctx.parsed && typeof ctx.parsed === "object" ? ctx.parsed[ctx.chart.options.indexAxis === "y" ? "x" : "y"] : ctx.parsed;
          const prefix = ctx.dataset.label ? `${ctx.dataset.label}: ` : "";
          return ` ${prefix}${format(raw)}`;
        },
        labelColor(ctx) {
          const c = ctx.dataset.hoverBackgroundColor || ctx.dataset.backgroundColor;
          const solid = typeof c === "string" ? c : "#3ECF8E";
          return { borderColor: solid, backgroundColor: solid };
        },
      },
    };
  }

  function axes({ horizontal, stacked, valueMax, valueFormat }) {
    const valueAxis = {
      beginAtZero: true,
      stacked,
      max: valueMax,
      grid: { color: GRID, drawTicks: false, tickBorderDash: [4, 4] },
      border: { display: false, dash: [4, 4] },
      ticks: { padding: 8, callback: (v) => valueFormat(v) },
    };
    const categoryAxis = {
      stacked,
      grid: { display: false },
      border: { display: false },
      ticks: { padding: 8, autoSkip: false, color: "#2F5A47", font: { size: 12.5 } },
    };
    return horizontal ? { x: valueAxis, y: categoryAxis } : { x: categoryAxis, y: valueAxis };
  }

  // Single- or multi-series bar chart.
  //   series: [{ label, data, color? }]
  //   opts:   { horizontal, stacked, valueMax, format, axisFormat, tooltipTitle(index) }
  // A single series renders like the Figma "Backup Activity" chart: grey bars
  // with the highest value highlighted in the brand gradient.
  function renderBarChart(canvasId, labels, series, opts = {}) {
    const format = opts.format || HealthOpsUtils.formatNumber;
    const multi = series.length > 1;
    const horizontal = !!opts.horizontal;
    return create(canvasId, {
      type: "bar",
      data: {
        labels,
        datasets: series.map((s, i) => {
          if (multi) {
            const color = s.color || colorFor(s.label, i);
            return {
              label: s.label,
              data: s.data,
              backgroundColor: color,
              hoverBackgroundColor: color,
              borderRadius: opts.stacked ? 4 : 8,
              borderSkipped: opts.stacked ? false : "start",
              maxBarThickness: 28,
              categoryPercentage: 0.75,
            };
          }
          const top = maxIndex(s.data);
          return {
            label: s.label,
            data: s.data,
            backgroundColor: (ctx) => (ctx.dataIndex === top ? brandGradient(ctx, horizontal) : BAR_IDLE),
            hoverBackgroundColor: (ctx) => (ctx.dataIndex === top ? brandGradient(ctx, horizontal) : "#C9F2DF"),
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: horizontal ? 22 : 60,
            categoryPercentage: 0.8,
            barPercentage: 0.85,
          };
        }),
      },
      options: {
        indexAxis: horizontal ? "y" : "x",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: multi ? legend("bottom") : { display: false },
          tooltip: tooltip(format, opts.tooltipTitle),
        },
        scales: axes({
          horizontal,
          stacked: !!opts.stacked,
          valueMax: opts.valueMax,
          valueFormat: opts.axisFormat || HealthOpsUtils.formatCompact,
        }),
      },
    });
  }

  function renderDonutChart(canvasId, labels, values) {
    const total = values.reduce((acc, v) => acc + (v || 0), 0);
    const narrow = window.matchMedia("(max-width: 640px)").matches;
    return create(canvasId, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colorsFor(labels),
          borderWidth: 0,
          spacing: 4,
          borderRadius: 8,
          hoverOffset: 6,
        }],
      },
      plugins: [donutCenterPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "74%",
        plugins: {
          legend: legend(narrow ? "bottom" : "right"),
          tooltip: tooltip((v) =>
            `${HealthOpsUtils.formatNumber(v)} (${HealthOpsUtils.formatPercent(total ? v / total : null)})`
          ),
        },
      },
    });
  }

  function resizeAll() {
    Object.values(chartInstances).forEach((c) => c.resize());
  }

  return { renderBarChart, renderDonutChart, resizeAll, colorFor, PALETTE };
})();
