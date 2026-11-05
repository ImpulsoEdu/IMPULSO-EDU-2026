(() => {
  const form = document.querySelector("[data-upload-form]");
  const driveInput = document.querySelector("#drive-link");
  const driveError = document.querySelector("#drive-error");
  const driveSuccess = document.querySelector("[data-drive-success]");
  const submitMessage = document.querySelector("[data-submit-message]");
  const subjectSelect = document.querySelector("#subject");
  const sectionSelect = document.querySelector("#section");
  const adminKeyInput = document.querySelector("#admin-key");

  const fallbackSectionsBySubject = {
    Matemática: [
      "Operaciones combinadas",
      "Ecuación y función lineal",
      "Ecuación y función cuadratica",
    ],
    Física: ["M.R.U.", "M.R.U.V.", "Tiro Vertical", "Caída Libre"],
    Química: ["Tabla Periódica", "Regla del Octeto", "Compuestos Binarios"],
    "Sistema de Representación": ["Perspectiva Dimetrica", "Proyección Ortogonal"],
  };
  const subjectSources = {
    Matemática: "../materias/Matematica/index.html",
    Física: "../materias/Fisica/index.html",
    Química: "../materias/Quimica/index.html",
    "Sistema de Representación": "../materias/SisDeRepr/index.html",
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
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const validDrive = validateDriveLink();
    if (!form.checkValidity() || !validDrive) {
      form.reportValidity();
      return;
    }

    const submitButton = form.querySelector(".primary-action");
    submitButton.disabled = true;
    submitButton.textContent = "Guardando...";
    submitMessage.hidden = true;

    try {
      const response = await fetch(window.EDU_REPOSITORY_API_URL || "/api/create-resource", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subjectSelect.value,
          section: sectionSelect.value,
          title: form.title.value,
          description: form.description.value,
          difficulty: form.difficulty.value,
          driveUrl: driveInput.value,
          adminKey: adminKeyInput.value,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar el recurso.");
      submitMessage.textContent = "Recurso guardado correctamente en GitHub. La tarjeta aparecerá después de publicar los cambios.";
    } catch (error) {
      submitMessage.textContent = error.message;
      submitMessage.classList.add("form-message-error");
    } finally {
      submitMessage.hidden = false;
      submitButton.disabled = false;
      submitButton.textContent = "Validar y adjuntar";
    }
  });
})();
