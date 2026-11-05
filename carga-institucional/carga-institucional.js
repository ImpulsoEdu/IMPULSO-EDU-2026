(() => {
  const form = document.querySelector("[data-upload-form]");
  const driveInput = document.querySelector("#drive-link");
  const driveError = document.querySelector("#drive-error");
  const driveSuccess = document.querySelector("[data-drive-success]");
  const submitMessage = document.querySelector("[data-submit-message]");

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
