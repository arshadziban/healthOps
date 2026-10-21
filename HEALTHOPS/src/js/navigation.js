const HealthOpsNavigation = (function () {
  const VIEWS = {
    executive: { title: "Executive Overview", subtitle: "Key insights and performance metrics across your healthcare operations" },
    "patient-flow": { title: "Patient Flow", subtitle: "How patients arrive: booking channels, visit types and demographics" },
    "hospital-ops": { title: "Hospital Operations", subtitle: "Department load, admissions, staffing and bed capacity" },
    "patient-experience": { title: "Patient Experience", subtitle: "Waiting time, satisfaction and appointment reliability" },
    "clinical-insights": { title: "Clinical & Demographics", subtitle: "Diagnosis, treatment and discharge outcomes, insurance and population" },
  };

  let current = "executive";

  function show(view) {
    if (!VIEWS[view]) return;
    current = view;

    document.querySelectorAll(".nav-item[data-view]").forEach((btn) => {
      const active = btn.getAttribute("data-view") === view;
      btn.classList.toggle("is-active", active);
      if (active) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });

    document.querySelectorAll(".view").forEach((section) => {
      section.hidden = section.id !== `view-${view}`;
    });

    document.getElementById("page-title").textContent = VIEWS[view].title;
    document.getElementById("page-subtitle").textContent = VIEWS[view].subtitle;
    document.title = `${VIEWS[view].title} · HEALTHOPS`;
  }

  function init(onNavigate) {
    document.querySelectorAll(".nav-item[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = btn.getAttribute("data-view");
        show(view);
        if (typeof onNavigate === "function") onNavigate(view);
        document.getElementById("main").scrollTo({ top: 0 });
        window.scrollTo({ top: 0 });
      });
    });
  }

  function getCurrentView() {
    return current;
  }

  return { init, show, getCurrentView };
})();
