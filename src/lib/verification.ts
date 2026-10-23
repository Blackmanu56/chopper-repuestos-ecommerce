import crypto from "crypto";

export interface VerificationRecord {
  token: string;
  pedidoId: number;
  empleadoId: number;
  empleadoNombre: string;
  empleadoRol: string;
  tipo: "TITULAR" | "AUTORIZADO";
  dniPresentado: string;
  nombrePresentado?: string;
  motivoAutorizacion?: string;
  createdAt: number;
  expiresAt: number;
}

// Almacén en memoria volátil del servidor para verificaciones de identidad en mostrador
// Tiene un TTL corto (10 minutos) y NO se almacena en base de datos ni cookies persistentes
const verificationStore = new Map<string, VerificationRecord>();

// TTL de 10 minutos
const VERIFICATION_TTL_MS = 10 * 60 * 1000;

/**
 * Limpia registros expirados del almacén en memoria
 */
function cleanupExpiredRecords() {
  const now = Date.now();
  for (const [token, record] of verificationStore.entries()) {
    if (record.expiresAt <= now) {
      verificationStore.delete(token);
    }
  }
}

/**
 * Normaliza un número de DNI removiendo puntos, espacios y guiones
 */
export function normalizeDni(dni: string | null | undefined): string {
  if (!dni) return "";
  return dni.replace(/[^a-zA-Z0-9]/g, "").trim().toLowerCase();
}

/**
 * Registra una nueva verificación de identidad en el servidor y emite un token de sesión volátil
 */
export function createVerificationRecord(params: {
  pedidoId: number;
  empleadoId: number;
  empleadoNombre: string;
  empleadoRol: string;
  tipo: "TITULAR" | "AUTORIZADO";
  dniPresentado: string;
  nombrePresentado?: string;
  motivoAutorizacion?: string;
}): { token: string; record: VerificationRecord } {
  cleanupExpiredRecords();

  // Invalida cualquier token previo que haya existido para este mismo pedido
  for (const [existingToken, rec] of verificationStore.entries()) {
    if (rec.pedidoId === params.pedidoId) {
      verificationStore.delete(existingToken);
    }
  }

  // Genera un token criptográfico no predecible
  const token = `verif_${Date.now()}_${crypto.randomBytes(24).toString("hex")}`;
  const now = Date.now();

  const record: VerificationRecord = {
    token,
    pedidoId: params.pedidoId,
    empleadoId: params.empleadoId,
    empleadoNombre: params.empleadoNombre,
    empleadoRol: params.empleadoRol,
    tipo: params.tipo,
    dniPresentado: params.dniPresentado.trim(),
    nombrePresentado: params.nombrePresentado?.trim(),
    motivoAutorizacion: params.motivoAutorizacion?.trim(),
    createdAt: now,
    expiresAt: now + VERIFICATION_TTL_MS,
  };

  verificationStore.set(token, record);

  return { token, record };
}

/**
 * Valida si un token de verificación de identidad es auténtico, pertenece al pedido indicado,
 * fue emitido por el empleado autenticado y sigue vigente.
 */
export function validateVerificationToken(
  token: string | undefined | null,
  pedidoId: number,
  empleadoId: number
): { valid: boolean; record?: VerificationRecord; error?: string } {
  cleanupExpiredRecords();

  if (!token || typeof token !== "string" || !token.startsWith("verif_")) {
    return {
      valid: false,
      error: "Acceso denegado: se requiere verificación obligatoria de identidad del cliente en el servidor.",
    };
  }

  const record = verificationStore.get(token);
  if (!record) {
    return {
      valid: false,
      error: "La verificación de identidad ha expirado o no es válida. Realizá la verificación nuevamente en mostrador.",
    };
  }

  if (record.pedidoId !== pedidoId) {
    return {
      valid: false,
      error: "La verificación de identidad no corresponde al pedido seleccionado.",
    };
  }

  if (record.empleadoId !== empleadoId) {
    return {
      valid: false,
      error: "La verificación de identidad fue registrada por otro usuario. Cada empleado debe verificar personalmente.",
    };
  }

  if (record.expiresAt <= Date.now()) {
    verificationStore.delete(token);
    return {
      valid: false,
      error: "La verificación de identidad ha caducado por tiempo límite (10 min). Verificá nuevamente al cliente.",
    };
  }

  return { valid: true, record };
}

/**
 * Invalida/consume el token de verificación una vez que el pedido ha sido entregado
 */
export function consumeVerificationToken(token: string | undefined | null) {
  if (token && verificationStore.has(token)) {
    verificationStore.delete(token);
  }
}

/**
 * Invalida todas las verificaciones activas asociadas a un pedido (ej: si se cancela o se cambia de orden)
 */
export function invalidateVerificationForPedido(pedidoId: number) {
  for (const [token, rec] of verificationStore.entries()) {
    if (rec.pedidoId === pedidoId) {
      verificationStore.delete(token);
    }
  }
}
