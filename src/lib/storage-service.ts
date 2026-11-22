import crypto from "crypto";
import path from "path";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

export const R2_CATALOG_PREFIX = "catalogo-chopper";
export const R2_PROFILES_PREFIX = "perfiles-chopper";
export const R2_RECEIPTS_PREFIX = "comprobantes-chopper";
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

export interface UploadCatalogResult {
  success: boolean;
  url?: string;
  objectPath?: string;
  error?: string;
}

export interface ReceiptValidationResult {
  valid: boolean;
  ext?: "jpg" | "png" | "webp" | "pdf" | "svg";
  mime?: string;
  error?: string;
}

export interface UploadReceiptResult {
  success: boolean;
  objectPath?: string;
  filename?: string;
  internalUrl?: string;
  error?: string;
}

function getR2Config(): { client: S3Client; bucket: string; publicUrl: string } | null {
  const endpoint = process.env.R2_ENDPOINT?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim() || "chopper-storage";
  const publicUrl = (
    process.env.R2_PUBLIC_URL?.trim() || "https://pub-aa3a753d242c4c41a86a0dfb2dc02a28.r2.dev"
  ).replace(/\/+$/, "");

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return { client, bucket, publicUrl };
}

async function toBuffer(fileOrBuffer: File | Buffer): Promise<Buffer | null> {
  if (Buffer.isBuffer(fileOrBuffer)) {
    return fileOrBuffer;
  }
  if (fileOrBuffer && typeof (fileOrBuffer as File).arrayBuffer === "function") {
    const arrayBuf = await (fileOrBuffer as File).arrayBuffer();
    return Buffer.from(arrayBuf);
  }
  return null;
}

async function putObjectToR2(
  prefix: string,
  objectPath: string,
  mime: string,
  buffer: Buffer
): Promise<UploadCatalogResult> {
  const r2 = getR2Config();
  if (!r2) {
    return {
      success: false,
      error:
        "Falta la configuración de Cloudflare R2 en el servidor (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY).",
    };
  }

  const key = `${prefix}/${objectPath}`;
  try {
    await r2.client.send(
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: key,
        Body: buffer,
        ContentType: mime,
      })
    );

    return {
      success: true,
      url: `${r2.publicUrl}/${key}`,
      objectPath,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Desconocido";
    return {
      success: false,
      error: `Error al subir archivo a Cloudflare R2: ${message}`,
    };
  }
}

async function deleteObjectFromR2(key: string): Promise<boolean> {
  const r2 = getR2Config();
  if (!r2) return false;

  try {
    await r2.client.send(
      new DeleteObjectCommand({
        Bucket: r2.bucket,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
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

/**
 * Sube una imagen directamente al prefijo catalogo-chopper en Cloudflare R2
 * ejecutándose estrictamente en el entorno del servidor.
 */
export async function uploadCatalogImage(
  fileOrBuffer: File | Buffer,
  folder: CatalogFolder,
  _originalFilename?: string
): Promise<UploadCatalogResult> {
  if (folder !== "productos" && folder !== "combos") {
    return {
      success: false,
      error: "Carpeta de almacenamiento inválida. Solo se permite 'productos' o 'combos'.",
    };
  }

  const buffer = await toBuffer(fileOrBuffer);
  if (!buffer) {
    return { success: false, error: "El archivo proporcionado no es válido." };
  }

  if (buffer.length > MAX_CATALOG_FILE_SIZE) {
    return {
      success: false,
      error: `El archivo supera el límite máximo permitido de 5 MB (tamaño: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  if (buffer.length === 0) {
    return { success: false, error: "El archivo está vacío (0 bytes)." };
  }

  const formatValidation = detectImageMagicBytes(buffer);
  if (!formatValidation.valid || !formatValidation.ext || !formatValidation.mime) {
    return {
      success: false,
      error: formatValidation.error || "Formato de archivo rechazado por validación de seguridad.",
    };
  }

  const uniqueId = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${formatValidation.ext}`;
  const objectPath = `${folder}/${uniqueId}`;

  return putObjectToR2(R2_CATALOG_PREFIX, objectPath, formatValidation.mime, buffer);
}

/**
 * Elimina de forma segura un objeto recién subido en caso de que la transacción
 * posterior en la base de datos falle.
 */
export async function rollbackStorageUpload(objectPath: string): Promise<boolean> {
  if (!objectPath) return false;
  if (!objectPath.startsWith("productos/") && !objectPath.startsWith("combos/")) {
    return false;
  }
  return deleteObjectFromR2(`${R2_CATALOG_PREFIX}/${objectPath}`);
}

/**
 * Sube una fotografía de perfil directamente al prefijo perfiles-chopper en Cloudflare R2.
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

  const buffer = await toBuffer(fileOrBuffer);
  if (!buffer) {
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

  const prefix = folder === "empleados" ? "avatar" : "avatar-cliente";
  const idPart = identifier !== undefined && identifier !== null ? `-${identifier}` : "";
  const uniqueName = `${prefix}${idPart}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${formatValidation.ext}`;
  const objectPath = `${folder}/${uniqueName}`;

  return putObjectToR2(R2_PROFILES_PREFIX, objectPath, formatValidation.mime, buffer);
}

/**
 * Elimina de forma segura un objeto recién subido al prefijo perfiles-chopper
 * si la transacción posterior de base de datos fallase.
 */
export async function rollbackProfileUpload(objectPath: string): Promise<boolean> {
  if (!objectPath) return false;
  if (!objectPath.startsWith("empleados/") && !objectPath.startsWith("clientes/")) {
    return false;
  }
  return deleteObjectFromR2(`${R2_PROFILES_PREFIX}/${objectPath}`);
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

/**
 * Sube un comprobante de pago directamente al prefijo comprobantes-chopper en Cloudflare R2.
 * El archivo queda resguardado bajo 'pedidos/<filename>' servido a través del proxy autenticado.
 */
export async function uploadReceiptImage(
  fileOrBuffer: File | Buffer,
  _originalFilename?: string
): Promise<UploadReceiptResult> {
  const buffer = await toBuffer(fileOrBuffer);
  if (!buffer) {
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

  const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const filename = `comprobante-checkout-${uniqueSuffix}.${validation.ext}`;
  const objectPath = `pedidos/${filename}`;

  const res = await putObjectToR2(R2_RECEIPTS_PREFIX, objectPath, validation.mime, buffer);
  if (!res.success) {
    return {
      success: false,
      error: res.error,
    };
  }

  return {
    success: true,
    objectPath,
    filename,
    internalUrl: `/api/comprobantes/${filename}`,
  };
}

/**
 * Descarga de manera segura un comprobante desde Cloudflare R2 usando credenciales de servidor.
 */
export async function downloadReceiptBuffer(
  objectPath: string
): Promise<{ success: boolean; buffer?: Buffer; contentType?: string; status?: number; error?: string }> {
  const r2 = getR2Config();
  if (!r2 || !objectPath) {
    return { success: false, error: "Credenciales R2 o ruta de comprobante no especificadas.", status: 500 };
  }

  const cleanPath = objectPath.trim().replace(/^\/+/, "");
  if (!cleanPath.startsWith("pedidos/")) {
    return { success: false, error: "Ruta de comprobante no autorizada.", status: 403 };
  }

  try {
    const response = await r2.client.send(
      new GetObjectCommand({
        Bucket: r2.bucket,
        Key: `${R2_RECEIPTS_PREFIX}/${cleanPath}`,
      })
    );

    if (!response.Body) {
      return { success: false, status: 404, error: "Archivo vacío o no encontrado en R2." };
    }

    const bytes = await response.Body.transformToByteArray();
    const buffer = Buffer.from(bytes);
    const contentType = response.ContentType || "application/octet-stream";

    return {
      success: true,
      buffer,
      contentType,
      status: 200,
    };
  } catch (err: unknown) {
    const errObj = err as { $metadata?: { httpStatusCode?: number }; message?: string };
    const status = errObj?.$metadata?.httpStatusCode || 500;
    return {
      success: false,
      status,
      error: `Error al consultar comprobante en R2: ${errObj?.message || "Desconocido"}`,
    };
  }
}

/**
 * Elimina un comprobante recién subido en Cloudflare R2
 * si la transacción en PostgreSQL fallase (rollback compensatorio).
 */
export async function rollbackReceiptUpload(objectPathOrFilename: string): Promise<boolean> {
  if (!objectPathOrFilename) return false;

  let cleanPath = objectPathOrFilename.trim().replace(/^\/+/, "");
  if (cleanPath.startsWith("api/comprobantes/")) {
    cleanPath = `pedidos/${path.basename(cleanPath)}`;
  } else if (!cleanPath.startsWith("pedidos/")) {
    cleanPath = `pedidos/${path.basename(cleanPath)}`;
  }

  if (!cleanPath.startsWith("pedidos/")) {
    return false;
  }

  return deleteObjectFromR2(`${R2_RECEIPTS_PREFIX}/${cleanPath}`);
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
