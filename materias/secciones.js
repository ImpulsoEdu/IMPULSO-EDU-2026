 (async () => {
  const getResourceDataPath = () => {
    const path = window.location.pathname;
    return path.includes("/materias/movil/") || path.includes("/materias/tablet/")
      ? "../../../data/resources.json"
      : "../../data/resources.json";
  };

  const getSubjectKey = () => {
    const match = window.location.pathname.match(
      /\/materias\/(?:movil\/|tablet\/)?(Matematica|Fisica|Quimica|SisDeRepr)(?:\/|$)/
    );
    return match?.[1];
  };

  const getLinkTitle = (link) => {
    const title = link.cloneNode(true);
    title.querySelectorAll(".text2, .text3").forEach((count) => count.remove());
    return title.textContent.trim();
  };

  const contentTypes = {
    documento: { label: "Documento", icon: "document" },
    video: { label: "Video", icon: "video" },
    imagen: { label: "Imagen", icon: "image" },
  };

  const difficultyClasses = {
    "fácil": "section-resource-level--easy",
    intermedio: "section-resource-level--intermediate",
    moderado: "section-resource-level--moderate",
    avanzado: "section-resource-level--advanced",
  };

  const getContentType = (value) => contentTypes[String(value).toLowerCase()] ?? contentTypes.documento;
  const getDifficultyClass = (value) => difficultyClasses[String(value).toLowerCase()] ?? "section-resource-level--moderate";

  const normalizeLegacyLabels = (root) => {
    root.querySelectorAll(".section-resource-level").forEach((level) => {
      level.classList.remove(
        "section-resource-level--easy",
        "section-resource-level--intermediate",
        "section-resource-level--advanced",
        "section-resource-level--moderate"
      );
      level.classList.add(getDifficultyClass(level.textContent));
    });
    root.querySelectorAll(".section-resource-type").forEach((type) => {
      const label = type.querySelector("span:last-child");
      if (!label) return;
      const value = label.textContent.trim().toLowerCase();
      if (value === "pdf" || value === "google drive" || value === "material") {
        label.textContent = "Documento";
      } else if (value === "video") {
        label.textContent = "Video";
      } else if (value === "imagen" || value === "image") {
        label.textContent = "Imagen";
      }
    });
  };

  const getContentIcon = (icon) => {
    if (icon === "video") return '<img class="section-video-icon" src="icon-video0.svg" alt="">';
    if (icon === "image") return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m4 17 5-5 3 3 2-2 6 6"/></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>';
  };

  const appendPublishedResources = async () => {
    try {
      const response = await fetch(getResourceDataPath(), { cache: "no-store" });
      if (!response.ok) return;
      const resources = await response.json();
      const subject = getSubjectKey();
      const resourceList = document.querySelector("[data-section-resource-list]");
      const sectionLinks = [...document.querySelectorAll("[data-section-link]")];
      if (!resourceList || !subject || !Array.isArray(resources)) return;

      const sectionSlugs = new Map(
        sectionLinks.map((link) => [getLinkTitle(link), link.dataset.sectionLink])
      );
      const subjectName = ({ Matematica: "Matemática", Fisica: "Física", Quimica: "Química", SisDeRepr: "Sistema de Representación" }[subject]);
      const publishedResources = resources.filter((resource) => resource.subject === subjectName);
      const publishedIds = new Set(publishedResources.map((resource) => String(resource.id)));

      resourceList.querySelectorAll("[data-resource-id]").forEach((card) => {
        if (!publishedIds.has(String(card.dataset.resourceId))) card.remove();
      });

      publishedResources
        .forEach((resource) => {
          const sectionSlug = sectionSlugs.get(resource.section);
          if (!sectionSlug || resourceList.querySelector(`[data-resource-id="${resource.id}"]`)) return;
          const card = document.createElement("a");
          card.className = "resource-card section-resource-card";
          card.dataset.section = sectionSlug;
          card.dataset.resourceId = resource.id;
          card.href = resource.driveUrl;
          card.target = "_blank";
          card.rel = "noopener noreferrer";
          card.setAttribute("aria-label", `Ver recurso: ${resource.title}`);
          const contentType = getContentType(resource.contentType);
          const difficultyClass = getDifficultyClass(resource.difficulty);
          card.innerHTML = `
            <div class="section-resource-meta">
              <div class="section-resource-type"><span class="section-content-icon">${getContentIcon(contentType.icon)}</span><span></span></div>
              <span class="section-resource-level ${difficultyClass}"></span>
            </div>
            <h3 class="section-resource-title"></h3>
            <p class="section-resource-description"></p>`;
          card.querySelector(".section-resource-type > span:last-child").textContent = contentType.label;
          card.querySelector(".section-resource-level").textContent = resource.difficulty;
          card.querySelector(".section-resource-title").textContent = resource.title;
          card.querySelector(".section-resource-description").textContent = resource.description;
          resourceList.append(card);
        });
    } catch (error) {
      console.warn("No se pudieron cargar los recursos publicados.", error);
    }
  };

  await appendPublishedResources();

  const heading = document.querySelector("[data-section-list-heading]");
  const resourceList = document.querySelector("[data-section-resource-list]");
  const sectionLinks = [...document.querySelectorAll("[data-section-link]")];
  const searchIcon = document.querySelector(".icon-search");
  const searchBar = searchIcon?.closest(".container10, .container11");
  const searchInput = document.querySelector("[data-resource-search]");
  const resourceTotal = document.querySelector('.header [class$="-rec"]');

  if (!heading || !resourceList || sectionLinks.length === 0) {
    console.error("Faltan los controles de secciones o su lista de recursos.");
    return;
  }

  resourceList.parentElement.classList.add("section-resource-panel");
  searchBar?.classList.add("section-search-input");

  const getSectionTitle = (link) => {
    const title = link.cloneNode(true);
    title.querySelectorAll(".text2, .text3").forEach((count) => count.remove());
    return title.textContent.trim();
  };
  const sections = new Map(
    sectionLinks.map((link) => [link.dataset.sectionLink, getSectionTitle(link)])
  );
  const params = new URLSearchParams(window.location.search);
  const requestedSection =
    params.get("seccion") ?? sectionLinks[0].dataset.sectionLink;
  const sectionTitle = sections.get(requestedSection);
  const normalize = (value) =>
    value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  let cards = [
    ...resourceList.querySelectorAll(".resource-card, .resource-card2"),
  ].filter((card) => {
    if (sections.has(card.dataset.section)) {
      card.classList.add("section-resource-card", "card-reveal");
      return true;
    }
    card.remove();
    return false;
  });
  normalizeLegacyLabels(resourceList);

  if ("IntersectionObserver" in window) {
    const cardObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in-view");
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -5% 0px" }
    );

    cards.forEach((card) => cardObserver.observe(card));
  } else {
    cards.forEach((card) => card.classList.add("is-in-view"));
  }

  const emptyState = document.createElement("p");
  emptyState.className = "section-empty-state";
  emptyState.setAttribute("role", "status");
  resourceList.insertAdjacentElement("afterend", emptyState);

  if (params.has("seccion")) {
    const backLink = document.createElement("a");
    backLink.className = "section-back-link";
    backLink.href = "./";
    backLink.textContent = "Volver a las secciones";
    emptyState.insertAdjacentElement("afterend", backLink);
  }

  const updateResources = () => {
    const query = normalize(searchInput?.value.trim() ?? "");
    const matchesQuery = (card) => normalize(card.textContent).includes(query);
    const visibleCards = cards.filter(
      (card) =>
        card.dataset.section === requestedSection && matchesQuery(card)
    );
    const visibleSet = new Set(visibleCards);

    cards.forEach((card) => {
      card.hidden = !visibleSet.has(card);
      if (visibleSet.has(card)) {
        card.classList.add("is-in-view");
      }
    });

    sectionLinks.forEach((link) => {
      link.removeAttribute("aria-current");
      const count = cards.filter(
        (card) =>
          card.dataset.section === link.dataset.sectionLink && matchesQuery(card)
      ).length;
      const countLabel = link.querySelector(".text2 > div, .text3 > div");
      if (countLabel) countLabel.textContent = String(count);
      if (link.dataset.sectionLink === requestedSection) {
        link.setAttribute("aria-current", "page");
      }
    });

    if (resourceTotal) {
      resourceTotal.textContent = resourceTotal.textContent.replace(
        /^\s*\d+/,
        String(cards.length)
      );
    }
    heading.textContent = sectionTitle
      ? `${sectionTitle} — ${visibleCards.length} archivos`
      : "Sección no encontrada";
    resourceList.hidden = visibleCards.length === 0;
    emptyState.textContent = !sectionTitle
      ? "La sección solicitada no existe."
      : query
        ? "No se encontraron contenidos para esta búsqueda."
        : "Todavía no hay contenidos en esta sección.";
    emptyState.hidden = visibleCards.length > 0;
  };

  searchInput?.addEventListener("input", updateResources);
  updateResources();

  const refreshResources = async () => {
    if (document.hidden) return;
    await appendPublishedResources();
    cards = [...resourceList.querySelectorAll(".resource-card, .resource-card2")].filter((card) => {
      if (sections.has(card.dataset.section)) {
        card.classList.add("section-resource-card");
        return true;
      }
      card.remove();
      return false;
    });
    cards.forEach((card) => card.classList.add("is-in-view"));
    normalizeLegacyLabels(resourceList);
    updateResources();
  };

  document.addEventListener("visibilitychange", refreshResources);
  window.addEventListener("focus", refreshResources);
  window.setInterval(refreshResources, 30000);

  document.title = sectionTitle
    ? `${sectionTitle} | Repositorio Educativo`
    : "Sección no encontrada";
})();
