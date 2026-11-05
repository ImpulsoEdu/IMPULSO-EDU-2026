(() => {
  const form = document.querySelector("[data-upload-form]");
  const driveInput = document.querySelector("#drive-link");
  const driveError = document.querySelector("#drive-error");
  const driveSuccess = document.querySelector("[data-drive-success]");
  const submitMessage = document.querySelector("[data-submit-message]");
  const subjectSelect = document.querySelector("#subject");
  const sectionSelect = document.querySelector("#section");

  const sectionsBySubject = {
    Matemática: [
      "Operaciones combinadas",
      "Ecuación y función lineal",
      "Ecuación y función cuadratica",
    ],
    Física: ["M.R.U.", "M.R.U.V.", "Tiro Vertical", "Caída Libre"],
    Química: ["Tabla Periódica", "Regla del Octeto", "Compuestos Binarios"],
    "Sistema de Representación": ["Perspectiva Dimetrica", "Historia Regional"],
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

  subjectSelect.addEventListener("change", () => {
    sectionSelect.replaceChildren(
      new Option("Selecciona una sección", "", true, true)
    );
    sectionsBySubject[subjectSelect.value].forEach((section) => {
      sectionSelect.add(new Option(section, section));
    });
    sectionSelect.disabled = false;
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const validDrive = validateDriveLink();
    if (!form.checkValidity() || !validDrive) {
      form.reportValidity();
      return;
    }
    submitMessage.textContent = "Datos validados correctamente. La tarjeta se creará usando este enlace de Google Drive.";
    submitMessage.hidden = false;
  });
})();
