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

  const animatedCoverLogo = document.querySelector(".cover-logo-animation");
  const coverLogoSource = document.querySelector(".cover-logo-source");

  if (animatedCoverLogo && coverLogoSource) {
    const usesVideoFrameCallback =
      typeof coverLogoSource.requestVideoFrameCallback === "function" &&
      typeof coverLogoSource.cancelVideoFrameCallback === "function";
    let coverLogoFrame;
    let coverLogoContext;
    let drawTransparentCoverLogo;

    const vertexShaderSource = `
      attribute vec2 position;
      varying vec2 textureCoordinate;

      void main() {
        textureCoordinate = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;
    const fragmentShaderSource = `
      precision mediump float;
      uniform sampler2D videoTexture;
      uniform vec2 videoScale;
      uniform vec3 logoColor;
      varying vec2 textureCoordinate;

      void main() {
        vec2 coordinate = (textureCoordinate - 0.5) / videoScale + 0.5;
        if (coordinate.x < 0.0 || coordinate.x > 1.0 ||
            coordinate.y < 0.0 || coordinate.y > 1.0) {
          gl_FragColor = vec4(0.0);
          return;
        }

        vec4 videoColor = texture2D(videoTexture, coordinate);
        float brightness = max(videoColor.r, max(videoColor.g, videoColor.b));
        float softness = clamp((brightness - 8.0 / 255.0) / (42.0 / 255.0), 0.0, 1.0);
        gl_FragColor = vec4(logoColor, videoColor.a * softness);
      }
    `;

    const getCoverLogoColor = () =>
      page?.classList.contains("tema-oscuro") ? [255, 255, 255] : [0, 0, 0];

    const createShader = (context, type, source) => {
      const shader = context.createShader(type);
      if (!shader) throw new Error("No se pudo crear el shader del logo.");
      context.shaderSource(shader, source);
      context.compileShader(shader);
      if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
        const message = context.getShaderInfoLog(shader);
        context.deleteShader(shader);
        throw new Error(`No se pudo compilar el shader del logo: ${message}`);
      }
      return shader;
    };

    const createCoverLogoRenderer = () => {
      const context =
        animatedCoverLogo.getContext("webgl", { alpha: true, antialias: true }) ||
        animatedCoverLogo.getContext("experimental-webgl", { alpha: true, antialias: true });
      if (!context) return false;

      const vertexShader = createShader(context, context.VERTEX_SHADER, vertexShaderSource);
      const fragmentShader = createShader(context, context.FRAGMENT_SHADER, fragmentShaderSource);
      const program = context.createProgram();
      if (!program) throw new Error("No se pudo crear el programa de animación del logo.");
      context.attachShader(program, vertexShader);
      context.attachShader(program, fragmentShader);
      context.linkProgram(program);
      if (!context.getProgramParameter(program, context.LINK_STATUS)) {
        throw new Error(`No se pudo enlazar el programa del logo: ${context.getProgramInfoLog(program)}`);
      }

      const position = context.getAttribLocation(program, "position");
      const videoScale = context.getUniformLocation(program, "videoScale");
      const logoColor = context.getUniformLocation(program, "logoColor");
      const videoTexture = context.createTexture();
      const vertexBuffer = context.createBuffer();
      if (position < 0 || !videoScale || !logoColor || !videoTexture || !vertexBuffer) {
        throw new Error("No se pudo preparar el renderizado del logo.");
      }

      context.bindBuffer(context.ARRAY_BUFFER, vertexBuffer);
      context.bufferData(
        context.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        context.STATIC_DRAW
      );
      context.useProgram(program);
      context.enableVertexAttribArray(position);
      context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0);
      context.activeTexture(context.TEXTURE0);
      context.bindTexture(context.TEXTURE_2D, videoTexture);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
      context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, true);
      context.uniform1i(context.getUniformLocation(program, "videoTexture"), 0);
      context.enable(context.BLEND);
      context.blendFuncSeparate(
        context.SRC_ALPHA,
        context.ONE_MINUS_SRC_ALPHA,
        context.ONE,
        context.ONE_MINUS_SRC_ALPHA
      );

      coverLogoContext = {
        context,
        videoScale,
        logoColor,
        videoTexture,
      };
      return true;
    };

    const resizeCoverCanvas = () => {
      const bounds = animatedCoverLogo.getBoundingClientRect();
      const width = animatedCoverLogo.clientWidth || bounds.width;
      const height = animatedCoverLogo.clientHeight || bounds.height;
      const pixelRatio = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3);
      const pixelWidth = Math.max(1, Math.round(width * pixelRatio));
      const pixelHeight = Math.max(1, Math.round(height * pixelRatio));
      if (animatedCoverLogo.width !== pixelWidth || animatedCoverLogo.height !== pixelHeight) {
        animatedCoverLogo.width = pixelWidth;
        animatedCoverLogo.height = pixelHeight;
        coverLogoContext?.context.viewport(0, 0, pixelWidth, pixelHeight);
      }
    };

    const drawTransparentCoverLogoWithCanvas = () => {
      if (coverLogoSource.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const width = animatedCoverLogo.width;
        const height = animatedCoverLogo.height;
        const [logoRed, logoGreen, logoBlue] = getCoverLogoColor();
        const sourceWidth = coverLogoSource.videoWidth || width;
        const sourceHeight = coverLogoSource.videoHeight || height;
        const scale = Math.min(width / sourceWidth, height / sourceHeight);
        const drawnWidth = sourceWidth * scale;
        const drawnHeight = sourceHeight * scale;
        const offsetX = (width - drawnWidth) / 2;
        const offsetY = (height - drawnHeight) / 2;
        const canvasContext = animatedCoverLogo.getContext("2d", { willReadFrequently: true });
        canvasContext.imageSmoothingEnabled = true;
        canvasContext.imageSmoothingQuality = "high";
        canvasContext.clearRect(0, 0, width, height);
        canvasContext.drawImage(
          coverLogoSource,
          offsetX,
          offsetY,
          drawnWidth,
          drawnHeight
        );
        const frame = canvasContext.getImageData(0, 0, width, height);
        const pixels = frame.data;

        for (let index = 0; index < pixels.length; index += 4) {
          const red = pixels[index];
          const green = pixels[index + 1];
          const blue = pixels[index + 2];
          const brightness = Math.max(red, green, blue);
          const softness = Math.min(1, Math.max(0, (brightness - 8) / 42));
          pixels[index] = logoRed;
          pixels[index + 1] = logoGreen;
          pixels[index + 2] = logoBlue;
          pixels[index + 3] = Math.round(pixels[index + 3] * softness);
        }

        canvasContext.putImageData(frame, 0, 0);
      }
      coverLogoFrame = usesVideoFrameCallback
        ? coverLogoSource.requestVideoFrameCallback(drawTransparentCoverLogoWithCanvas)
        : window.requestAnimationFrame(drawTransparentCoverLogoWithCanvas);
    };

    try {
      if (createCoverLogoRenderer()) {
        drawTransparentCoverLogo = () => {
          if (coverLogoSource.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const { context, videoScale, logoColor, videoTexture } = coverLogoContext;
            const sourceWidth = coverLogoSource.videoWidth || 1;
            const sourceHeight = coverLogoSource.videoHeight || 1;
            const aspectRatio = sourceWidth / sourceHeight;
            const canvasAspectRatio = animatedCoverLogo.width / animatedCoverLogo.height;
            const scaleX = Math.min(1, aspectRatio / canvasAspectRatio);
            const scaleY = Math.min(1, canvasAspectRatio / aspectRatio);
            const [red, green, blue] = getCoverLogoColor();

            context.clear(context.COLOR_BUFFER_BIT);
            context.uniform2f(videoScale, scaleX, scaleY);
            context.uniform3f(logoColor, red / 255, green / 255, blue / 255);
            context.bindTexture(context.TEXTURE_2D, videoTexture);
            context.texImage2D(
              context.TEXTURE_2D,
              0,
              context.RGBA,
              context.RGBA,
              context.UNSIGNED_BYTE,
              coverLogoSource
            );
            context.drawArrays(context.TRIANGLE_STRIP, 0, 4);
          }
          coverLogoFrame = usesVideoFrameCallback
            ? coverLogoSource.requestVideoFrameCallback(drawTransparentCoverLogo)
            : window.requestAnimationFrame(drawTransparentCoverLogo);
        };
      } else {
        drawTransparentCoverLogo = drawTransparentCoverLogoWithCanvas;
      }
      resizeCoverCanvas();
      window.addEventListener("resize", resizeCoverCanvas);
      if (coverLogoSource.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        drawTransparentCoverLogo();
      } else {
        coverLogoSource.addEventListener("loadeddata", drawTransparentCoverLogo, { once: true });
      }
    } catch (error) {
      console.error("No se pudo iniciar la animación del logo.", error);
    }

    const navigateWithExit = (event) => {
      const link = event.target.closest("a");
      if (
        !link ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.target === "_blank" ||
        link.hasAttribute("download")
      ) {
        return;
      }

      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      event.preventDefault();
      animatedCoverLogo.classList.add("is-exiting");
      window.setTimeout(() => {
        window.location.assign(destination.href);
      }, 260);
    };

    document.addEventListener("click", navigateWithExit);
    window.addEventListener("pagehide", () => {
      animatedCoverLogo.classList.add("is-exiting");
      if (coverLogoFrame) {
        if (usesVideoFrameCallback) {
          coverLogoSource.cancelVideoFrameCallback(coverLogoFrame);
        } else {
          window.cancelAnimationFrame(coverLogoFrame);
        }
      }
    });
  }

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

  const getResourcesPath = () =>
    /\/(?:movil|tablet)\/?$/.test(window.location.pathname)
      ? "../data/resources.json"
      : "data/resources.json";

  const subjectNames = {
    Matematica: "Matemática",
    Fisica: "Física",
    Quimica: "Química",
    SisDeRepr: "Sistema de Representación",
  };

  const getSubjectKey = (card) => {
    const match = card.pathname?.match(
      /\/materias\/(?:movil\/|tablet\/)?(Matematica|Fisica|Quimica|SisDeRepr)\/?$/
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
            const sections = subjectDocument.querySelectorAll("[data-section-link]").length;
            return { card, sections };
          })
        ),
        fetch(getResourcesPath(), { cache: "no-store" }),
      ]);

      let publishedResources = [];
      if (resourcesResponse.ok) {
        const parsedResources = await resourcesResponse.json();
        if (Array.isArray(parsedResources)) publishedResources = parsedResources;
      }

      metrics.forEach(({ card, sections }) => {
        const subject = subjectNames[getSubjectKey(card)];
        const subjectResources = publishedResources.filter(
          (resource) => resource.subject === subject
        );
        const totalResources = subjectResources.length;
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

    const refreshMetrics = () => {
      if (!document.hidden) void loadSubjectMetrics();
    };

    document.addEventListener("visibilitychange", refreshMetrics);
    window.addEventListener("focus", refreshMetrics);
    window.setInterval(refreshMetrics, 30000);
  }
})();
