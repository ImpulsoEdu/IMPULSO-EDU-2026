const GITHUB_API = "https://api.github.com";

const respond = (response, statusCode, body) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.end(JSON.stringify(body));
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

  let body;
  try {
    body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
  } catch {
    return respond(response, 400, { error: "La solicitud no tiene un formato válido." });
  }

  if (body.adminKey !== ADMIN_API_KEY) {
    return respond(response, 401, { error: "Clave administrativa incorrecta." });
  }
  if (!String(body.resourceId || "").trim()) {
    return respond(response, 400, { error: "No se indicó el contenido que se desea eliminar." });
  }

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const fileUrl = `${GITHUB_API}/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/${GITHUB_DATA_PATH}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;

  try {
    const currentResponse = await fetch(fileUrl, { headers });
    if (!currentResponse.ok) {
      return respond(response, currentResponse.status, { error: "No se pudo leer el archivo de recursos en GitHub." });
    }

    const currentFile = await currentResponse.json();
    const resources = JSON.parse(
      Buffer.from(currentFile.content.replace(/\n/g, ""), "base64").toString("utf8")
    );
    if (!Array.isArray(resources)) {
      return respond(response, 500, { error: "El archivo de recursos no tiene un formato válido." });
    }

    const remainingResources = resources.filter(
      (resource) => String(resource.id) !== String(body.resourceId)
    );
    if (remainingResources.length === resources.length) {
      return respond(response, 404, { error: "No se encontró el contenido seleccionado." });
    }

    const updateResponse = await fetch(fileUrl, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Eliminar recurso: ${body.resourceId}`,
        branch: GITHUB_BRANCH,
        content: Buffer.from(JSON.stringify(remainingResources, null, 2) + "\n").toString("base64"),
        sha: currentFile.sha,
      }),
    });

    if (!updateResponse.ok) {
      return respond(response, updateResponse.status, { error: "GitHub rechazó la eliminación del recurso." });
    }
    return respond(response, 200, { message: "Recurso eliminado correctamente." });
  } catch (error) {
    console.error(error);
    return respond(response, 500, { error: "No se pudo completar la eliminación." });
  }
};
