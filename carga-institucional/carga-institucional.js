(() => {
  const form = document.querySelector("[data-upload-form]");
  const driveInput = document.querySelector("#drive-link");
  const driveError = document.querySelector("#drive-error");
  const driveSuccess = document.querySelector("[data-drive-success]");
  const submitMessage = document.querySelector("[data-submit-message]");
  const subjectSelect = document.querySelector("#subject");
  const sectionSelect = document.querySelector("#section");
  const adminKeyInput = document.querySelector("#admin-key");
  const deleteAdminKeyInput = document.querySelector("#delete-admin-key");
  const resourceToDeleteSelect = document.querySelector("#resource-to-delete");
  const modeButtons = [...document.querySelectorAll("button[data-mode]")];
  const createOnlyFields = [...document.querySelectorAll("[data-create-only]")];
  const createOnlyPanel = document.querySelector("[data-create-only-panel]");
  const deleteFields = document.querySelector("[data-delete-fields]");
  const createCancel = document.querySelector("[data-create-cancel]");
  const deleteCancel = document.querySelector("[data-delete-cancel]");
  let currentMode = "create";
  let resources = [];

  const fallbackSectionsBySubject = {
    Matemática: [
      "Operaciones combinadas",
      "Ecuación y función lineal",
      "Ecuación y función cuadratica",
      "Contenidos Bases",
    ],
    Física: ["M.R.U.", "M.R.U.V.", "Tiro Vertical", "Caída Libre", "Contenidos Bases"],
    Química: ["Contenidos Bases", "Regla del Octeto", "Estructura de Lewis"],
    "Sistema de Representación": ["Perspectiva Dimetrica", "Proyección Ortogonal", "Contenidos Bases"],
  };
  const subjectSources = {
    Matemática: "../materias/Matematica/index.html",
    Física: "../materias/Fisica/index.html",
    Química: "../materias/Quimica/index.html",
    "Sistema de Representación": "../materias/SisDeRepr/index.html",
  };

  const resourcesPath = "../data/resources.json";

  const setRequired = (elements, required) => {
    elements.forEach((element) => {
      element.required = required;
      element.disabled = !required;
    });
  };

  const setMode = (mode) => {
    currentMode = mode;
    const isDelete = mode === "delete";
    form.dataset.mode = mode;
    modeButtons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    createOnlyFields.forEach((field) => {
      field.hidden = isDelete;
      setRequired([...field.querySelectorAll("input, select, textarea")], !isDelete);
    });
    if (createOnlyPanel) {
      createOnlyPanel.hidden = isDelete;
      setRequired(
        [...createOnlyPanel.querySelectorAll("input, select, textarea")],
        !isDelete
      );
    }
    if (deleteFields) deleteFields.hidden = !isDelete;
    if (createCancel) createCancel.hidden = isDelete;
    if (deleteCancel) deleteCancel.hidden = !isDelete;
    setRequired(
      [resourceToDeleteSelect, deleteAdminKeyInput].filter(Boolean),
      isDelete
    );
    submitMessage.hidden = true;
    const submitButton = form.querySelector(".primary-action");
    submitButton.textContent = isDelete ? "Confirmar borrado" : "Validar y adjuntar";
    if (isDelete) {
      driveInput.setCustomValidity("");
      driveError.hidden = true;
      driveSuccess.hidden = true;
      void updateResourceOptions();
    } else {
      validateDriveLink();
    }
  };

  const loadResources = async () => {
    try {
      const response = await fetch(resourcesPath, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = await response.json();
      resources = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      resources = [];
      console.warn("No se pudieron cargar los contenidos publicados.", error);
    }
  };

  const updateResourceOptions = async () => {
    if (!resourceToDeleteSelect) return;
    await loadResources();
    const selectedSubject = subjectSelect.value;
    const selectedSection = sectionSelect.value;
    const matches = resources.filter(
      (resource) => resource.subject === selectedSubject && resource.section === selectedSection
    );
    resourceToDeleteSelect.replaceChildren(
      new Option(
        matches.length ? "Selecciona un contenido" : "No hay contenidos publicados en esta sección",
        "",
        true,
        true
      )
    );
    matches.forEach((resource) => {
      const label = `${resource.title} — ${resource.description}`;
      resourceToDeleteSelect.add(new Option(label, resource.id));
    });
    resourceToDeleteSelect.disabled = matches.length === 0;
  };

  const getSectionsFromSubject = async (subject) => {
    try {
      const response = await fetch(subjectSources[subject], { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const subjectDocument = new DOMParser().parseFromString(
        await response.text(),
        "text/html"
      );
      const sections = [...subjectDocument.querySelectorAll("[data-section-link]")]
        .map((link) => {
          const title = link.cloneNode(true);
          title.querySelectorAll(".text2, .text3").forEach((count) => count.remove());
          return title.textContent.trim();
        })
        .filter(Boolean);
      if (sections.length > 0) return sections;
    } catch (error) {
      console.warn(`No se pudieron leer las secciones de ${subject}.`, error);
    }
    return fallbackSectionsBySubject[subject] ?? [];
  };

  const isGoogleDriveUrl = (value) => {
    try {
      const url = new URL(value.trim());
      return url.protocol === "https:" && url.hostname === "drive.google.com";
    } catch {
      return false;
    }
  };

  const validateDriveLink = () => {
    const valid = isGoogleDriveUrl(driveInput.value);
    const hasValue = driveInput.value.trim().length > 0;
    driveInput.setCustomValidity(valid ? "" : "Ingresa un enlace válido de Google Drive.");
    driveError.hidden = !hasValue || valid;
    driveSuccess.hidden = !hasValue || !valid;
    driveInput.setAttribute("aria-invalid", String(!valid && hasValue));
    return valid;
  };

  driveInput.addEventListener("input", validateDriveLink);
  driveInput.addEventListener("blur", validateDriveLink);

  subjectSelect.addEventListener("change", async () => {
    sectionSelect.disabled = true;
    sectionSelect.replaceChildren(
      new Option("Cargando secciones...", "", true, true)
    );
    const sections = await getSectionsFromSubject(subjectSelect.value);
    sectionSelect.replaceChildren(
      new Option("Selecciona una sección", "", true, true)
    );
    sections.forEach((section) => {
      sectionSelect.add(new Option(section, section));
    });
    sectionSelect.disabled = false;
    if (currentMode === "delete") await updateResourceOptions();
  });

  sectionSelect.addEventListener("change", () => {
    if (currentMode === "delete") void updateResourceOptions();
  });

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });

  deleteCancel?.addEventListener("click", () => {
    form.reset();
    sectionSelect.replaceChildren(
      new Option("Selecciona una sección", "", true, true)
    );
    sectionSelect.disabled = true;
    resourceToDeleteSelect.replaceChildren(
      new Option("Selecciona primero materia y sección", "", true, true)
    );
    setMode("create");
  });

  const submitCreate = async () => {
    const response = await fetch(window.EDU_REPOSITORY_API_URL || "/api/create-resource", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: subjectSelect.value,
        section: sectionSelect.value,
        title: form.title.value,
        description: form.description.value,
        contentType: form["content-type"].value,
        difficulty: form.difficulty.value,
        driveUrl: driveInput.value,
        adminKey: adminKeyInput.value,
      }),
    });
    return response;
  };

  const submitDelete = async () => {
    const response = await fetch(window.EDU_REPOSITORY_DELETE_API_URL || "/api/delete-resource", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resourceId: resourceToDeleteSelect.value,
        adminKey: deleteAdminKeyInput.value,
      }),
    });
    return response;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const validDrive = currentMode === "create" ? validateDriveLink() : true;
    if (!form.checkValidity() || !validDrive) {
      form.reportValidity();
      return;
    }

    const submitButton = form.querySelector(".primary-action");
    submitButton.disabled = true;
    submitButton.textContent = currentMode === "delete" ? "Eliminando..." : "Guardando...";
    submitMessage.hidden = true;

    try {
      const response = currentMode === "delete" ? await submitDelete() : await submitCreate();
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo completar la operación.");
      submitMessage.textContent = currentMode === "delete"
        ? "Contenido eliminado correctamente de GitHub."
        : "Recurso guardado correctamente en GitHub. La tarjeta aparecerá después de publicar los cambios.";
      if (currentMode === "delete") {
        await updateResourceOptions();
        deleteAdminKeyInput.value = "";
      }
    } catch (error) {
      submitMessage.textContent = error.message;
      submitMessage.classList.add("form-message-error");
    } finally {
      submitMessage.hidden = false;
      submitButton.disabled = false;
      submitButton.textContent = currentMode === "delete" ? "Confirmar borrado" : "Validar y adjuntar";
    }
  });

  setMode("create");
})();
