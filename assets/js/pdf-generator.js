function print() {
  const language = window.cvI18n ? window.cvI18n.getLanguage() : "en";
  const printURL = new URL("print", window.location.href);
  printURL.searchParams.set("lang", language);
  const printWindow = window.open(printURL.href, "_blank");
  printWindow.onload = function () {
    printWindow.print();
    // Close the print window after a delay
    setTimeout(() => printWindow.close(), 500);
  };
}

async function rasterizeSvgImages(root) {
  const svgImages = Array.from(root.querySelectorAll("img")).filter((image) => {
    return new URL(image.src, window.location.href).pathname.toLowerCase().endsWith(".svg");
  });

  await Promise.all(svgImages.map(async (element) => {
    const response = await fetch(element.src);
    if (!response.ok) {
      throw new Error(`Unable to load SVG asset: ${element.src}`);
    }

    const svgBlob = await response.blob();
    const objectURL = URL.createObjectURL(svgBlob);

    try {
      const sourceImage = new Image();
      sourceImage.src = objectURL;
      await sourceImage.decode();

      const naturalWidth = sourceImage.naturalWidth || 512;
      const naturalHeight = sourceImage.naturalHeight || 512;
      const scale = Math.min(2, 1600 / Math.max(naturalWidth, naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(naturalHeight * scale));
      canvas.getContext("2d").drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
      element.src = canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(objectURL);
    }
  }));
}

async function loadPdfImage(source) {
  const image = new Image();
  image.src = source;
  await image.decode();
  return image;
}

async function normalizeAvatarImage(root) {
  const avatar = root.querySelector(".sidebar-wrapper .avatar");
  if (!avatar) return;

  const source = await loadPdfImage(avatar.src);
  const side = Math.min(source.naturalWidth, source.naturalHeight);
  const sourceX = (source.naturalWidth - side) * 0.5;
  const sourceY = (source.naturalHeight - side) * 0.28;
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 768;
  canvas.getContext("2d").drawImage(
    source,
    sourceX,
    sourceY,
    side,
    side,
    0,
    0,
    canvas.width,
    canvas.height
  );
  avatar.src = canvas.toDataURL("image/jpeg", 0.96);
  avatar.width = canvas.width;
  avatar.height = canvas.height;
}

async function replaceInstitutionLogos(root, selector, filename) {
  const logos = Array.from(root.querySelectorAll(selector));
  const source = new URL(
    `assets/images/institutions/${filename}`,
    window.location.href
  ).href;
  await Promise.all(logos.map(async (logo) => {
    logo.src = source;
    await logo.decode();
  }));
}

async function preparePdfImages(root) {
  await Promise.all([
    normalizeAvatarImage(root),
    replaceInstitutionLogos(
      root,
      ".institution-mark--kist img",
      "kist-symbol.png"
    ),
    replaceInstitutionLogos(
      root,
      ".institution-mark--hyundai img",
      "hyundai-symbol.png"
    ),
  ]);
  await rasterizeSvgImages(root);
}

function ensurePdfStylesheet() {
  const existing = document.querySelector('link[data-pdf-export-styles]');
  if (existing) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL("assets/css/pdf-export.css", window.location.href).href;
    stylesheet.dataset.pdfExportStyles = "true";
    stylesheet.addEventListener("load", resolve, { once: true });
    stylesheet.addEventListener("error", reject, { once: true });
    document.head.appendChild(stylesheet);
  });
}

async function generatePDF() {
  const language = window.cvI18n ? window.cvI18n.getLanguage() : "en";
  const source = document.querySelector(".wrapper");
  const pdfButton = document.querySelector("#pdfButton");

  try {
    await ensurePdfStylesheet();
  } catch (error) {
    console.error("Error loading A4 PDF styles:", error);
    return;
  }

  if (!source) {
    console.error("Error generating PDF: CV content was not found.");
    return;
  }

  const container = source.cloneNode(true);
  container.classList.add("pdf-export");

  if (window.cvI18n) {
    window.cvI18n.applyLanguage(container, language);
  }

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await preparePdfImages(container);
  } catch (error) {
    console.error("Error preparing PDF images:", error);
    return;
  }

  const name = document.querySelector(".name").textContent;
  const suffix = language === "ko" ? "이력서" : "Resume";
  const filename = `${name.replace(/\s+/g, "_")}_${suffix}.pdf`;

  const opt = {
    margin: [10, 10, 10, 10],
    filename: filename,
    image: { type: "png", quality: 1 },
    enableLinks: true,
    pagebreak: {
      mode: ["css", "legacy"],
      avoid: [".item", ".container-block", ".profile-container"],
    },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      backgroundColor: "#ffffff",
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait",
      compress: true,
    },
  };

  try {
    if (pdfButton) {
      pdfButton.disabled = true;
      pdfButton.setAttribute("aria-busy", "true");
    }

    return await html2pdf()
      .set(opt)
      .from(container)
      .save();
  } catch (error) {
    console.error("Error generating PDF:", error);
  } finally {
    if (pdfButton) {
      pdfButton.disabled = false;
      pdfButton.removeAttribute("aria-busy");
    }
    document.querySelectorAll(".html2pdf__overlay, .html2pdf__container").forEach((element) => {
      element.remove();
    });
  }
}
