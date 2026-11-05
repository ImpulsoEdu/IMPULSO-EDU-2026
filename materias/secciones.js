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
      resources
        .filter((resource) => resource.subject === ({ Matematica: "Matemática", Fisica: "Física", Quimica: "Química", SisDeRepr: "Sistema de Representación" }[subject]))
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
          card.innerHTML = `
            <div class="section-resource-meta">
              <div class="section-resource-type"><span>Google Drive</span></div>
              <span class="section-resource-level"></span>
            </div>
            <h3 class="section-resource-title"></h3>
            <p class="section-resource-description"></p>`;
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
  const cards = [
    ...resourceList.querySelectorAll(".resource-card, .resource-card2"),
  ].filter((card) => {
    if (sections.has(card.dataset.section)) {
      card.classList.add("section-resource-card", "card-reveal");
      return true;
    }
    card.remove();
    return false;
  });

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

  document.title = sectionTitle
    ? `${sectionTitle} | Repositorio Educativo`
    : "Sección no encontrada";
})();
