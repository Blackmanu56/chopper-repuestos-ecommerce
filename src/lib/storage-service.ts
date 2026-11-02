import crypto from "crypto";
import path from "path";

export const SUPABASE_STORAGE_URL = "https://feecgedfxtmtmdaakxgy.supabase.co";
export const SUPABASE_CATALOG_BUCKET = "catalogo-chopper";
export const SUPABASE_PROFILES_BUCKET = "perfiles-chopper";
export const SUPABASE_RECEIPTS_BUCKET = "comprobantes-chopper";
export const MAX_CATALOG_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_RECEIPT_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export type CatalogFolder = "productos" | "combos";
export type ProfileFolder = "empleados" | "clientes";

export interface FileValidationResult {
  valid: boolean;
  ext?: "jpg" | "png" | "webp";
  mime?: string;
  error?: string;
}

/**
 * Detecta el formato real del archivo inspeccionando exclusivamente sus magic bytes.
 * No confía en la extensión ni en el header Content-Type enviado por el cliente.
 */
export function detectImageMagicBytes(buffer: Buffer): FileValidationResult {
  if (!buffer || buffer.length < 12) {
    return {
      valid: false,
      error: "Archivo inválido o dañado (tamaño inferior al encabezado mínimo).",
    };
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, ext: "jpg", mime: "image/jpeg" };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
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
    return { valid: true, ext: "png", mime: "image/png" };
  }

  // 3. WebP: "RIFF" (offset 0..3) y "WEBP" (offset 8..11)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, ext: "webp", mime: "image/webp" };
  }

  return {
    valid: false,
    error: "Formato de imagen no permitido. Solo se aceptan archivos JPEG, PNG o WebP genuinos.",
  };
}

export interface UploadCatalogResult {
  success: boolean;
  url?: string;
  objectPath?: string;
  error?: string;
}

/**
 * Sube una imagen directamente al bucket catalogo-chopper de Supabase Storage
 * ejecutándose estrictamente en el entorno del servidor.
 */
export async function uploadCatalogImage(
  fileOrBuffer: File | Buffer,
  folder: CatalogFolder,
  originalFilename?: string
): Promise<UploadCatalogResult> {
  // Validación estricta de carpeta de destino
  if (folder !== "productos" && folder !== "combos") {
    return {
      success: false,
      error: "Carpeta de almacenamiento inválida. Solo se permite 'productos' o 'combos'.",
    };
  }

  let buffer: Buffer;
  if (Buffer.isBuffer(fileOrBuffer)) {
    buffer = fileOrBuffer;
  } else if (fileOrBuffer && typeof (fileOrBuffer as File).arrayBuffer === "function") {
    const arrayBuf = await (fileOrBuffer as File).arrayBuffer();
    buffer = Buffer.from(arrayBuf);
  } else {
    return { success: false, error: "El archivo proporcionado no es válido." };
  }

  // Validación de tamaño máximo (5 MB)
  if (buffer.length > MAX_CATALOG_FILE_SIZE) {
    return {
      success: false,
      error: `El archivo supera el límite máximo permitido de 5 MB (tamaño: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  if (buffer.length === 0) {
    return { success: false, error: "El archivo está vacío (0 bytes)." };
  }

  // Validación de magic bytes
  const formatValidation = detectImageMagicBytes(buffer);
  if (!formatValidation.valid || !formatValidation.ext || !formatValidation.mime) {
    return {
      success: false,
      error: formatValidation.error || "Formato de archivo rechazado por validación de seguridad.",
    };
  }

  // Comprobar credencial de administración en variables de entorno del servidor
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || serviceKey.trim() === "") {
    return {
      success: false,
      error:
        "Falta la configuración del servidor: la variable SUPABASE_SERVICE_ROLE_KEY no está definida en el entorno. La subida a Supabase Storage se detuvo por seguridad.",
    };
  }

  // Generar nombre de archivo único para evitar colisiones y sobrescrituras accidentales
  const uniqueId = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${formatValidation.ext}`;
  const objectPath = `${folder}/${uniqueId}`;

  const uploadEndpoint = `${SUPABASE_STORAGE_URL}/storage/v1/object/${SUPABASE_CATALOG_BUCKET}/${objectPath}`;

  try {
    const response = await fetch(uploadEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey.trim()}`,
        "Content-Type": formatValidation.mime,
        "x-upsert": "false", // Prohibir sobrescritura
      },
      body: buffer,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return {
        success: false,
        error: `Error al subir imagen a Supabase Storage (HTTP ${response.status}): ${errText || response.statusText}`,
      };
    }

    const publicUrl = `${SUPABASE_STORAGE_URL}/storage/v1/object/public/${SUPABASE_CATALOG_BUCKET}/${objectPath}`;
    return {
      success: true,
      url: publicUrl,
      objectPath,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Error de conexión con Supabase Storage: ${err?.message || "Desconocido"}`,
    };
  }
}

/**
 * Elimina de forma segura un objeto recién subido en caso de que la transacción
 * posterior en la base de datos falle. Solo debe invocarse sobre el archivo nuevo
 * creado por la operación en curso, nunca sobre imágenes previas ni compartidas.
 */
export async function rollbackStorageUpload(objectPath: string): Promise<boolean> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || !objectPath) return false;

  // Sanitización de path: debe comenzar con productos/ o combos/
  if (!objectPath.startsWith("productos/") && !objectPath.startsWith("combos/")) {
    return false;
  }

  try {
    const deleteEndpoint = `${SUPABASE_STORAGE_URL}/storage/v1/object/${SUPABASE_CATALOG_BUCKET}`;
    const response = await fetch(deleteEndpoint, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${serviceKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: [objectPath] }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Sube una fotografía de perfil directamente al bucket perfiles-chopper de Supabase Storage.
 * Compatible tanto con empleados (folder "empleados") como con clientes (folder "clientes").
 */
export async function uploadProfileImage(
  fileOrBuffer: File | Buffer,
  folder: ProfileFolder,
  identifier?: number | string
): Promise<UploadCatalogResult> {
  if (folder !== "empleados" && folder !== "clientes") {
    return {
      success: false,
      error: "Carpeta de perfil inválida. Solo se permite 'empleados' o 'clientes'.",
    };
  }

  let buffer: Buffer;
  if (Buffer.isBuffer(fileOrBuffer)) {
    buffer = fileOrBuffer;
  } else if (fileOrBuffer && typeof (fileOrBuffer as File).arrayBuffer === "function") {
    const arrayBuf = await (fileOrBuffer as File).arrayBuffer();
    buffer = Buffer.from(arrayBuf);
  } else {
    return { success: false, error: "El archivo proporcionado no es válido." };
  }

  if (buffer.length > MAX_CATALOG_FILE_SIZE) {
    return {
      success: false,
      error: `La imagen supera el límite máximo permitido de 5 MB (tamaño: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  if (buffer.length === 0) {
    return { success: false, error: "El archivo está vacío (0 bytes)." };
  }

  const formatValidation = detectImageMagicBytes(buffer);
  if (!formatValidation.valid || !formatValidation.ext || !formatValidation.mime) {
    return {
      success: false,
      error: formatValidation.error || "Formato de archivo rechazado. Solo se permiten imágenes JPG, PNG o WebP.",
    };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || serviceKey.trim() === "") {
    return {
      success: false,
      error: "Falta la configuración del servidor: SUPABASE_SERVICE_ROLE_KEY no está definida en el entorno.",
    };
  }

  const prefix = folder === "empleados" ? "avatar" : "avatar-cliente";
  const idPart = identifier !== undefined && identifier !== null ? `-${identifier}` : "";
  const uniqueName = `${prefix}${idPart}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${formatValidation.ext}`;
  const objectPath = `${folder}/${uniqueName}`;

  const uploadEndpoint = `${SUPABASE_STORAGE_URL}/storage/v1/object/${SUPABASE_PROFILES_BUCKET}/${objectPath}`;

  try {
    const response = await fetch(uploadEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey.trim()}`,
        "Content-Type": formatValidation.mime,
        "x-upsert": "false",
      },
      body: buffer,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return {
        success: false,
        error: `Error al subir perfil a Supabase Storage (HTTP ${response.status}): ${errText || response.statusText}`,
      };
    }

    const publicUrl = `${SUPABASE_STORAGE_URL}/storage/v1/object/public/${SUPABASE_PROFILES_BUCKET}/${objectPath}`;
    return {
      success: true,
      url: publicUrl,
      objectPath,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Error de conexión con Supabase Storage: ${err?.message || "Desconocido"}`,
    };
  }
}

/**
 * Elimina de forma segura un objeto recién subido al bucket perfiles-chopper
 * si la transacción posterior de base de datos fallase.
 */
export async function rollbackProfileUpload(objectPath: string): Promise<boolean> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || !objectPath) return false;

  if (!objectPath.startsWith("empleados/") && !objectPath.startsWith("clientes/")) {
    return false;
  }

  try {
    const deleteEndpoint = `${SUPABASE_STORAGE_URL}/storage/v1/object/${SUPABASE_PROFILES_BUCKET}`;
    const response = await fetch(deleteEndpoint, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${serviceKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: [objectPath] }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export interface ReceiptValidationResult {
  valid: boolean;
  ext?: "jpg" | "png" | "webp" | "pdf" | "svg";
  mime?: string;
  error?: string;
}

/**
 * Valida el formato de un comprobante de pago inspeccionando sus magic bytes.
 * Admite JPEG, PNG, WebP, PDF y SVG (este último sin scripts ni eventos JS).
 */
export function detectReceiptMagicBytes(buffer: Buffer): ReceiptValidationResult {
  if (!buffer || buffer.length < 4) {
    return {
      valid: false,
      error: "Comprobante inválido o incompleto (tamaño inferior al encabezado mínimo).",
    };
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, ext: "jpg", mime: "image/jpeg" };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
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
    return { valid: true, ext: "png", mime: "image/png" };
  }

  // 3. WebP: "RIFF" .... "WEBP"
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
    return { valid: true, ext: "webp", mime: "image/webp" };
  }

  // 4. PDF: %PDF- (25 50 44 46 2D)
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return { valid: true, ext: "pdf", mime: "application/pdf" };
  }

  // 5. SVG: Texto XML con nodo raíz svg
  const headText = buffer.subarray(0, Math.min(buffer.length, 1024)).toString("utf8").trim();
  if (headText.startsWith("<svg") || (headText.startsWith("<?xml") && headText.includes("<svg"))) {
    const fullText = buffer.toString("utf8").toLowerCase();
    if (fullText.includes("<script") || fullText.includes("javascript:") || fullText.includes("onload=") || fullText.includes("onerror=")) {
      return {
        valid: false,
        error: "Archivo SVG rechazado por contener código ejecutable o scripts embebidos potencialmente peligrosos.",
      };
    }
    return { valid: true, ext: "svg", mime: "image/svg+xml" };
  }

  return {
    valid: false,
    error: "Formato no permitido. Solo se aceptan archivos PDF, JPG, PNG, WEBP o SVG legítimos.",
  };
}

export interface UploadReceiptResult {
  success: boolean;
  objectPath?: string;
  filename?: string;
  internalUrl?: string;
  error?: string;
}

/**
 * Sube un comprobante de pago directamente al bucket privado comprobantes-chopper de Supabase Storage.
 * El archivo queda resguardado bajo 'pedidos/<filename>' sin acceso público directo.
 */
export async function uploadReceiptImage(
  fileOrBuffer: File | Buffer,
  originalFilename?: string
): Promise<UploadReceiptResult> {
  let buffer: Buffer;
  if (Buffer.isBuffer(fileOrBuffer)) {
    buffer = fileOrBuffer;
  } else if (fileOrBuffer && typeof (fileOrBuffer as File).arrayBuffer === "function") {
    const arrayBuf = await (fileOrBuffer as File).arrayBuffer();
    buffer = Buffer.from(arrayBuf);
  } else {
    return { success: false, error: "El archivo de comprobante proporcionado no es válido." };
  }

  if (buffer.length > MAX_RECEIPT_FILE_SIZE) {
    return {
      success: false,
      error: `El comprobante supera el límite máximo permitido de 10 MB (tamaño: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  if (buffer.length === 0) {
    return { success: false, error: "El comprobante está vacío (0 bytes)." };
  }

  const validation = detectReceiptMagicBytes(buffer);
  if (!validation.valid || !validation.ext || !validation.mime) {
    return {
      success: false,
      error: validation.error || "Formato de archivo rechazado por validación de seguridad.",
    };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || serviceKey.trim() === "") {
    return {
      success: false,
      error: "Falta la configuración del servidor: SUPABASE_SERVICE_ROLE_KEY no está definida en el entorno.",
    };
  }

  const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const filename = `comprobante-checkout-${uniqueSuffix}.${validation.ext}`;
  const objectPath = `pedidos/${filename}`;

  const uploadEndpoint = `${SUPABASE_STORAGE_URL}/storage/v1/object/${SUPABASE_RECEIPTS_BUCKET}/${objectPath}`;

  try {
    const response = await fetch(uploadEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey.trim()}`,
        "Content-Type": validation.mime,
        "x-upsert": "false",
      },
      body: buffer,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return {
        success: false,
        error: `Error al subir comprobante a Supabase Storage (HTTP ${response.status}): ${errText || response.statusText}`,
      };
    }

    return {
      success: true,
      objectPath,
      filename,
      internalUrl: `/api/comprobantes/${filename}`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Error de conexión con Supabase Storage: ${err?.message || "Desconocido"}`,
    };
  }
}

/**
 * Descarga de manera segura un comprobante del bucket privado comprobantes-chopper
 * usando la clave de servicio del servidor.
 */
export async function downloadReceiptBuffer(
  objectPath: string
): Promise<{ success: boolean; buffer?: Buffer; contentType?: string; status?: number; error?: string }> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || !objectPath) {
    return { success: false, error: "Credenciales o ruta de comprobante no especificadas.", status: 500 };
  }

  const cleanPath = objectPath.trim().replace(/^\/+/, "");
  if (!cleanPath.startsWith("pedidos/")) {
    return { success: false, error: "Ruta de comprobante no autorizada.", status: 403 };
  }

  const authenticatedUrl = `${SUPABASE_STORAGE_URL}/storage/v1/object/authenticated/${SUPABASE_RECEIPTS_BUCKET}/${cleanPath}?t=${Date.now()}`;

  try {
    const response = await fetch(authenticatedUrl, {
      headers: {
        Authorization: `Bearer ${serviceKey.trim()}`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: `Supabase Storage devolvió HTTP ${response.status} al recuperar el comprobante.`,
      };
    }

    const arrayBuf = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    return {
      success: true,
      buffer,
      contentType,
      status: 200,
    };
  } catch (err: any) {
    return {
      success: false,
      status: 500,
      error: `Error de red al consultar comprobante: ${err?.message || "Desconocido"}`,
    };
  }
}

/**
 * Elimina un comprobante recién subido al bucket privado comprobantes-chopper
 * si la transacción en PostgreSQL fallase (rollback compensatorio).
 */
export async function rollbackReceiptUpload(objectPathOrFilename: string): Promise<boolean> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || !objectPathOrFilename) return false;

  let cleanPath = objectPathOrFilename.trim().replace(/^\/+/, "");
  if (cleanPath.startsWith("api/comprobantes/")) {
    cleanPath = `pedidos/${path.basename(cleanPath)}`;
  } else if (!cleanPath.startsWith("pedidos/")) {
    cleanPath = `pedidos/${path.basename(cleanPath)}`;
  }

  if (!cleanPath.startsWith("pedidos/")) {
    return false;
  }

  try {
    const deleteEndpoint = `${SUPABASE_STORAGE_URL}/storage/v1/object/${SUPABASE_RECEIPTS_BUCKET}`;
    const response = await fetch(deleteEndpoint, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${serviceKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: [cleanPath] }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json().catch(() => []);
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

/**
 * Resuelve la URL segura para el frontend a partir del valor persistido en base de datos.
 * Las rutas internas 'pedidos/<filename>' se transforman en '/api/comprobantes/<filename>'.
 */
export function resolverUrlComprobanteParaVista(url: string | null | undefined): string | null {
  if (!url) return null;
  const clean = url.trim();
  if (!clean) return null;
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }
  const safeFile = path.basename(clean);
  return `/api/comprobantes/${safeFile}`;
}
