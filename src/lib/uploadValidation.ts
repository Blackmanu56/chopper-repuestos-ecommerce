import path from "path";

export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function detectFileFormatByMagicBytes(
  buffer: Buffer
): "jpg" | "png" | "webp" | "pdf" | "svg" | null {
  if (!buffer || buffer.length < 4) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "webp";
  }

  // PDF: %PDF- (25 50 44 46 2D)
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return "pdf";
  }

  // SVG (texto XML seguro sin scripts)
  const headText = buffer.subarray(0, Math.min(buffer.length, 1024)).toString("utf8").trim();
  if (headText.startsWith("<svg") || (headText.startsWith("<?xml") && headText.includes("<svg"))) {
    const fullText = buffer.toString("utf8").toLowerCase();
    if (fullText.includes("<script") || fullText.includes("javascript:") || fullText.includes("onload=")) {
      return null;
    }
    return "svg";
  }

  return null;
}

export async function validateUploadedFile(
  file: File | null,
  options: {
    allowPdf?: boolean;
    allowSvg?: boolean;
    maxSizeBytes?: number;
  } = {}
): Promise<{
  valid: boolean;
  buffer?: Buffer;
  ext?: string;
  error?: string;
}> {
  if (!file || typeof file.arrayBuffer !== "function") {
    return { valid: false, error: "No se seleccionó ningún archivo válido." };
  }

  const maxBytes = options.maxSizeBytes ?? MAX_UPLOAD_SIZE_BYTES;
  if (file.size <= 0) {
    return { valid: false, error: "El archivo seleccionado está vacío." };
  }
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `El archivo supera el tamaño máximo permitido (${Math.round(maxBytes / (1024 * 1024))} MB).`,
    };
  }

  const rawExt = path.extname(file.name || "").toLowerCase();
  const allowedExts = [".jpg", ".jpeg", ".png", ".webp"];
  if (options.allowPdf) allowedExts.push(".pdf");
  if (options.allowSvg) allowedExts.push(".svg");

  if (!allowedExts.includes(rawExt)) {
    return {
      valid: false,
      error: `Extensión no permitida (${rawExt || "sin extensión"}). Formatos aceptados: ${allowedExts.join(", ")}.`,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectFileFormatByMagicBytes(buffer);
  if (!detected) {
    return {
      valid: false,
      error: "El contenido real del archivo no corresponde a una imagen o documento válido.",
    };
  }

  if (detected === "pdf" && !options.allowPdf) {
    return { valid: false, error: "No se admiten archivos PDF en este campo." };
  }
  if (detected === "svg" && !options.allowSvg) {
    return { valid: false, error: "No se admiten archivos SVG en este campo." };
  }

  // Verificar coherencia entre extensión y contenido binario
  const normalizedExt = rawExt === ".jpeg" ? "jpg" : rawExt.replace(".", "");
  if (normalizedExt !== detected) {
    return {
      valid: false,
      error: `El contenido del archivo (${detected.toUpperCase()}) no coincide con su extensión (${rawExt}).`,
    };
  }

  return {
    valid: true,
    buffer,
    ext: rawExt,
  };
}
