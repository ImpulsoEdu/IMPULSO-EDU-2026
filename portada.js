(() => {
  const themeToggle = document.querySelector("[data-theme-toggle]");
  const page = document.querySelector("[data-theme-page]");
  const themeLabel = themeToggle?.querySelector(".tema-claro");
  const themeStorageKey = "edurepositorio-theme";

  if (themeToggle && page && themeLabel) {
    const darkClass = page.dataset.darkClass;
    const darkStylesheet = page.dataset.darkStylesheet;
    const sectionDarkStylesheet = page.dataset.sectionDarkStylesheet;
    const themeFixes = document.querySelector("[data-theme-fixes]");
    let isDark = false;
    let darkStylesheetLink;
    let sectionDarkStylesheetLink;

    try {
      isDark = localStorage.getItem(themeStorageKey) === "dark";
    } catch (error) {
      console.warn("No se pudo recuperar el tema guardado.", error);
    }

    const updateTheme = () => {
      page.classList.toggle("tema-oscuro", isDark);
      if (darkClass) {
        page.classList.toggle(darkClass, isDark);
      }

      if (darkStylesheet) {
        if (isDark && !darkStylesheetLink) {
          darkStylesheetLink = document.createElement("link");
          darkStylesheetLink.rel = "stylesheet";
          darkStylesheetLink.href = darkStylesheet;
          darkStylesheetLink.dataset.themeStylesheet = "";
          if (themeFixes) {
            themeFixes.before(darkStylesheetLink);
          } else {
            document.head.append(darkStylesheetLink);
          }
        } else if (!isDark && darkStylesheetLink) {
          darkStylesheetLink.remove();
          darkStylesheetLink = undefined;
        }
      }

      if (sectionDarkStylesheet) {
        if (isDark && !sectionDarkStylesheetLink) {
          sectionDarkStylesheetLink = document.createElement("link");
          sectionDarkStylesheetLink.rel = "stylesheet";
          sectionDarkStylesheetLink.href = sectionDarkStylesheet;
          sectionDarkStylesheetLink.dataset.themeSectionStylesheet = "";
          document.head.append(sectionDarkStylesheetLink);
        } else if (!isDark && sectionDarkStylesheetLink) {
          sectionDarkStylesheetLink.remove();
          sectionDarkStylesheetLink = undefined;
        }
      }

      themeToggle.setAttribute("aria-pressed", String(isDark));
      themeToggle.setAttribute(
        "aria-label",
        isDark ? "Activar tema claro" : "Activar tema oscuro"
      );
      themeLabel.textContent = isDark ? "TEMA CLARO" : "TEMA OSCURO";
    };

    updateTheme();

    themeToggle.addEventListener("click", () => {
      isDark = !isDark;
      updateTheme();

      try {
        localStorage.setItem(themeStorageKey, isDark ? "dark" : "light");
      } catch (error) {
        console.warn("No se pudo guardar el tema seleccionado.", error);
      }
    });
  }

  const revealPage = document.querySelector(
    ".portada-m-vil-claro, .repositorio-digital-educativo-mobile, .portada-tablet-claro, .repositorio-digital-educativo-tablet, .portada-escritorio-claro"
  );
  const revealCards = revealPage
    ? [
        ...revealPage.querySelectorAll(
          ".subject-card, .subject-card2, .subject-card3, .subject-card4, .institutional-entry, .social-card"
        ),
      ]
    : [];

  if (revealCards.length > 0) {
    if ("IntersectionObserver" in window) {
      const cardObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            entry.target.classList.toggle("is-in-view", entry.isIntersecting);
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -5% 0px" }
      );

      revealCards.forEach((card) => {
        card.classList.add("card-reveal");
        cardObserver.observe(card);
      });
    } else {
      revealCards.forEach((card) => {
        card.classList.add("card-reveal", "is-in-view");
      });
    }
  }

  const filterInput = document.querySelector("#subject-filter");
  const subjectCards = [...document.querySelectorAll("[data-subject-card]")];

  const normalize = (value) =>
    value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const stats = {
    subjects: document.querySelector(".cover-stats ._4"),
    resources: document.querySelector(".cover-stats ._102"),
    sections: document.querySelector(".cover-stats ._10"),
  };
  const subjectMetrics = new Map();
  let metricsLoaded = false;

  const subjectNames = {
    Matematica: "Matemática",
    Fisica: "Física",
    Quimica: "Química",
    SisDeRepr: "Sistema de Representación",
  };

  const getSubjectKey = (card) => {
    const match = card.pathname?.match(
      /\/materias\/(Matematica|Fisica|Quimica|SisDeRepr)\/?$/
    );
    return match?.[1];
  };

  const updateStats = () => {
    const visibleCards = subjectCards.filter((card) => !card.hidden);
    const totals = visibleCards.reduce(
      (result, card) => {
        const metrics = subjectMetrics.get(card);
        if (metrics) {
          result.resources += metrics.resources;
          result.sections += metrics.sections;
        }
        return result;
      },
      { resources: 0, sections: 0 }
    );
    if (document.querySelector("[data-social-section]")) {
      totals.sections += 1;
    }

    if (stats.subjects) stats.subjects.textContent = String(visibleCards.length);
    if (metricsLoaded && stats.resources) {
      stats.resources.textContent = String(totals.resources);
    }
    if (metricsLoaded && stats.sections) {
      stats.sections.textContent = String(totals.sections);
    }
  };

  const loadSubjectMetrics = async () => {
    try {
      const [metrics, resourcesResponse] = await Promise.all([
        Promise.all(
          subjectCards.map(async (card) => {
            const response = await fetch(card.href, { cache: "no-store" });
            if (!response.ok) {
              throw new Error(`HTTP ${response.status} al cargar ${card.href}`);
            }
            const html = await response.text();
            const subjectDocument = new DOMParser().parseFromString(html, "text/html");
            const resources = subjectDocument.querySelectorAll(
              "[data-section-resource-list] [data-section]"
            ).length;
            const sections = subjectDocument.querySelectorAll("[data-section-link]").length;
            return { card, resources, sections };
          })
        ),
        fetch("data/resources.json", { cache: "no-store" }),
      ]);

      let publishedResources = [];
      if (resourcesResponse.ok) {
        const parsedResources = await resourcesResponse.json();
        if (Array.isArray(parsedResources)) publishedResources = parsedResources;
      }

      metrics.forEach(({ card, resources, sections }) => {
        const subject = subjectNames[getSubjectKey(card)];
        const publishedCount = publishedResources.filter(
          (resource) => resource.subject === subject
        ).length;
        const totalResources = resources + publishedCount;
        const count = card.querySelector("[data-subject-resource-count]");
        if (count) count.textContent = String(totalResources);
        subjectMetrics.set(card, { resources: totalResources, sections });
      });
      metricsLoaded = true;
    } catch (error) {
      console.error("No se pudieron actualizar los contadores de materias.", error);
    }
    updateStats();
  };

  if (filterInput && subjectCards.length > 0) {
    filterInput.addEventListener("input", () => {
      const query = normalize(filterInput.value.trim());
      let visibleIndex = 0;

      subjectCards.forEach((card) => {
        const matches = normalize(card.textContent).includes(query);
        const wasHidden = card.hidden;
        card.hidden = !matches;

        if (query && matches) {
          card.style.gridColumn = String((visibleIndex % 2) + 1);
          card.style.gridRow = String(Math.floor(visibleIndex / 2) + 1);
          visibleIndex += 1;
        } else if (!query) {
          card.style.removeProperty("grid-column");
          card.style.removeProperty("grid-row");
        }

        if (wasHidden && matches) {
          card.classList.remove("is-in-view");
          void card.offsetWidth;
          card.classList.add("is-in-view");
        }
      });
      updateStats();
    });
  }

  if (subjectCards.length > 0) {
    void loadSubjectMetrics();
  }
})();
