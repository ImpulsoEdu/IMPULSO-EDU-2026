const GITHUB_API = "https://api.github.com";

const respond = (response, statusCode, body) => response.status(statusCode).set({
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }).json(body);

const isDriveUrl = (value) => {
  try {
    const url = new URL(String(value).trim());
    return url.protocol === "https:" && url.hostname === "drive.google.com";
  } catch {
    return false;
  }
};

module.exports = async (request, response) => {
  if (request.method === "OPTIONS") return respond(response, 204, {});
  if (request.method !== "POST") return respond(response, 405, { error: "Método no permitido." });

  const {
    GITHUB_TOKEN,
    GITHUB_OWNER,
    GITHUB_REPO,
    GITHUB_BRANCH = "main",
    GITHUB_DATA_PATH = "data/resources.json",
    ADMIN_API_KEY,
  } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || !ADMIN_API_KEY) {
    return respond(response, 503, { error: "El backend no está configurado todavía." });
  }

  const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
  if (body.adminKey !== ADMIN_API_KEY) return respond(response, 401, { error: "Clave administrativa incorrecta." });

  const requiredFields = ["subject", "section", "title", "description", "difficulty", "driveUrl"];
  if (requiredFields.some((field) => !String(body[field] || "").trim())) {
    return respond(response, 400, { error: "Faltan datos obligatorios del recurso." });
  }
  if (!isDriveUrl(body.driveUrl)) return respond(response, 400, { error: "El enlace no pertenece a Google Drive." });

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const fileUrl = `${GITHUB_API}/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/${GITHUB_DATA_PATH}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;

  try {
    const currentResponse = await fetch(fileUrl, { headers });
    let resources = [];
    let sha;

    if (currentResponse.ok) {
      const currentFile = await currentResponse.json();
      sha = currentFile.sha;
      resources = JSON.parse(Buffer.from(currentFile.content.replace(/\n/g, ""), "base64").toString("utf8"));
    } else if (currentResponse.status !== 404) {
      return respond(response, currentResponse.status, { error: "No se pudo leer el archivo de recursos en GitHub." });
    }

    const resource = {
      id: crypto.randomUUID(),
      subject: String(body.subject).trim(),
      section: String(body.section).trim(),
      title: String(body.title).trim(),
      description: String(body.description).trim(),
      difficulty: String(body.difficulty).trim(),
      driveUrl: String(body.driveUrl).trim(),
      createdAt: new Date().toISOString(),
    };
    resources.push(resource);

    const updateResponse = await fetch(fileUrl, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Agregar recurso: ${resource.title}`,
        branch: GITHUB_BRANCH,
        content: Buffer.from(JSON.stringify(resources, null, 2) + "\n").toString("base64"),
        ...(sha ? { sha } : {}),
      }),
    });

    if (!updateResponse.ok) return respond(response, updateResponse.status, { error: "GitHub rechazó la actualización del archivo." });
    return respond(response, 201, { message: "Recurso guardado correctamente.", resource });
  } catch (error) {
    console.error(error);
    return respond(response, 500, { error: "No se pudo completar la operación." });
  }
};
