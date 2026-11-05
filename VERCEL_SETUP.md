# Configuración del backend de carga

El endpoint `api/create-resource.js` guarda los recursos en `data/resources.json` mediante GitHub API.

## Variables de entorno en Vercel

Configura estas variables en el proyecto de Vercel:

```text
GITHUB_TOKEN=token_fine_grained_de_github
GITHUB_OWNER=propietario_del_repositorio
GITHUB_REPO=nombre_del_repositorio
GITHUB_BRANCH=main
ADMIN_API_KEY=una_clave_larga_y_privada
ALLOWED_ORIGIN=https://tu-dominio.github.io
```

El token debe ser fine-grained, limitado al repositorio correcto y con `Contents: write`. No lo coloques en HTML, JavaScript del navegador ni en el repositorio.

Si la página continúa publicada en GitHub Pages y el backend está en un dominio distinto, define antes de cargar el formulario:

```html
<script>
  window.EDU_REPOSITORY_API_URL = "https://tu-proyecto.vercel.app/api/create-resource";
</script>
```

La clave administrativa se escribe en el formulario y se envía por HTTPS; nunca se guarda dentro del proyecto.
