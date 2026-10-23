import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "chopper_session";

/**
 * Duraciones de sesión según el tipo de cuenta:
 * - Clientes: 7 días corridos (604.800 segundos)
 * - Personal / Staff: 24 horas continuas (86.400 segundos)
 */
export const CLIENT_SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días (604.800.000 ms)
export const STAFF_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas (86.400.000 ms)

export function getSessionDurationMs(kind: "STAFF" | "CLIENTE"): number {
  return kind === "STAFF" ? STAFF_SESSION_DURATION_MS : CLIENT_SESSION_DURATION_MS;
}

function getSessionSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "chopper-repuestos-posadas-hmac-secret-2026-v1"
  );
}

export type StaffRole = "ADMINISTRADOR" | "ENCARGADO_VENTAS" | "ENCARGADO_STOCK";

export interface SessionPayload {
  kind: "STAFF" | "CLIENTE";
  id: number;
  username: string;
  nombreCompleto: string;
  rol: StaffRole | "CLIENTE";
  correo?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  dni?: string | null;
  cuit?: string | null;
  fotoUrl?: string | null;
  cargo?: string | null;
  iat: number;
  exp: number;
}

/**
 * Emite un token HMAC firmado.
 * Si no se especifica duración, aplica la duración estricta según el tipo de cuenta (24 hs para Staff, 7 días para Clientes).
 * Si se pasan iat y exp previos, respeta el vencimiento absoluto original.
 */
export function signSessionToken(
  data: Omit<SessionPayload, "iat" | "exp"> & { iat?: number; exp?: number },
  overrideDurationMs?: number
): string {
  const now = Date.now();
  const durationMs = overrideDurationMs ?? getSessionDurationMs(data.kind);
  const iat = data.iat ?? now;
  const exp = data.exp ?? (iat + durationMs);

  const payload: SessionPayload = {
    ...data,
    iat,
    exp,
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payloadBase64)
    .digest("base64url");
  return `${payloadBase64}.${signature}`;
}

export type TokenInspectionReason = "expired" | "invalid_signature" | "malformed" | "missing";

export type TokenInspectionResult =
  | { valid: true; payload: SessionPayload }
  | { valid: false; reason: TokenInspectionReason };

/**
 * Inspecciona minuciosamente el token y devuelve el diagnóstico exacto (vencido, firma inválida, etc.)
 */
export function inspectSessionToken(token: string | undefined | null): TokenInspectionResult {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "missing" };
  }
  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, reason: "malformed" };
  }

  const [payloadBase64, signature] = parts;
  if (!payloadBase64 || !signature) {
    return { valid: false, reason: "malformed" };
  }

  const expectedSig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payloadBase64)
    .digest("base64url");

  const sigBuf = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false, reason: "invalid_signature" };
  }

  try {
    const parsed = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf8")) as SessionPayload;
    if (!parsed || typeof parsed.exp !== "number" || typeof parsed.iat !== "number") {
      return { valid: false, reason: "malformed" };
    }
    const now = Date.now();
    if (now > parsed.exp) {
      return { valid: false, reason: "expired" };
    }
    // Límite de duración absoluta contra manipulación de payload
    const maxDuration = getSessionDurationMs(parsed.kind) + 60000;
    if (parsed.exp - parsed.iat > maxDuration) {
      return { valid: false, reason: "malformed" };
    }
    if (!parsed.id || !parsed.rol || !parsed.kind) {
      return { valid: false, reason: "malformed" };
    }
    return { valid: true, payload: parsed };
  } catch {
    return { valid: false, reason: "malformed" };
  }
}

/**
 * Verifica la validez y firma de un token de sesión. Retorna el SessionPayload o null.
 */
export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  const result = inspectSessionToken(token);
  return result.valid ? result.payload : null;
}

export async function setServerSessionCookie(
  data: Omit<SessionPayload, "iat" | "exp"> & { iat?: number; exp?: number },
  overrideDurationMs?: number
): Promise<string> {
  const now = Date.now();
  const durationMs = overrideDurationMs ?? getSessionDurationMs(data.kind);
  const iat = data.iat ?? now;
  const exp = data.exp ?? (iat + durationMs);

  const token = signSessionToken({ ...data, iat, exp }, durationMs);
  const remainingSeconds = Math.max(0, Math.floor((exp - now) / 1000));

  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: remainingSeconds,
      expires: new Date(exp),
    });
  } catch {
    // Contexto no HTTP (ej: tests o scripts de backend)
  }
  return token;
}

export async function clearServerSessionCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
  } catch {}
}

/**
 * Obtiene y valida la sesión activa contra la cookie firmada httpOnly y la base de datos.
 * Nunca confía en parámetros enviados desde el cliente.
 */
export async function getServerSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const inspect = inspectSessionToken(rawToken);
    if (!inspect.valid) {
      if (rawToken) {
        try {
          cookieStore.delete(SESSION_COOKIE_NAME);
        } catch {}
      }
      return null;
    }
    const payload = inspect.payload;

    if (payload.kind === "STAFF") {
      const u = await prisma.usuario.findUnique({
        where: { id: payload.id },
        include: { rol: true, empleado: true },
      });
      if (!u || !u.activo) return null;
      if (u.empleado && !u.empleado.activo) return null;

      const rolNombre = (u.rol?.nombre || "").toUpperCase();
      if (
        rolNombre !== "ADMINISTRADOR" &&
        rolNombre !== "ENCARGADO_VENTAS" &&
        rolNombre !== "ENCARGADO_STOCK"
      ) {
        return null;
      }

      return {
        ...payload,
        username: u.username,
        nombreCompleto: u.nombreCompleto,
        rol: rolNombre as SessionPayload["rol"],
        correo: u.correo,
        telefono: u.telefono,
        dni: u.dni,
        fotoUrl: u.fotoUrl,
        cargo: u.empleado?.cargo || rolNombre,
      };
    }

    if (payload.kind === "CLIENTE") {
      const c = await prisma.cliente.findUnique({
        where: { id: payload.id },
      });
      if (!c || !c.activo) return null;

      return {
        ...payload,
        nombreCompleto: c.nombre,
        rol: "CLIENTE",
        correo: c.email || payload.correo,
        telefono: c.telefono || payload.telefono,
        direccion: c.direccion || payload.direccion,
        dni: c.dni || payload.dni,
        cuit: c.cuit || payload.cuit,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Verifica que exista una sesión de personal (Staff) válida en el servidor y que posea alguno de los roles permitidos.
 * Ignora por completo cualquier `userId` enviado desde el cliente para impedir escalación de privilegios.
 */
export async function requireStaffSession(
  allowedRoles?: Array<"ADMINISTRADOR" | "ENCARGADO_VENTAS" | "ENCARGADO_STOCK">
): Promise<{
  authorized: boolean;
  user?: SessionPayload;
  rol?: "ADMINISTRADOR" | "ENCARGADO_VENTAS" | "ENCARGADO_STOCK";
  nombre?: string;
  error?: string;
}> {
  let rawToken: string | undefined;
  try {
    const cookieStore = await cookies();
    rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  } catch {}

  const inspect = inspectSessionToken(rawToken);
  if (!inspect.valid) {
    if (inspect.reason === "expired") {
      return {
        authorized: false,
        error: "Tu sesión de personal ha expirado tras 24 horas. Por favor, volvé a iniciar sesión.",
      };
    }
    if (inspect.reason === "invalid_signature" || inspect.reason === "malformed") {
      return {
        authorized: false,
        error: "Sesión inválida o adulterada. Por favor, volvé a iniciar sesión.",
      };
    }
    return {
      authorized: false,
      error: "Acceso denegado: debés iniciar sesión con una cuenta de personal autorizado.",
    };
  }

  const session = await getServerSession();
  if (!session) {
    return {
      authorized: false,
      error: "Acceso denegado: tu usuario no existe, está inactivo o no posee una sesión válida.",
    };
  }

  if (session.kind !== "STAFF" || session.rol === "CLIENTE") {
    return {
      authorized: false,
      error: "Acceso denegado: las cuentas de clientes no tienen permisos administrativos.",
    };
  }

  const staffRol = session.rol as "ADMINISTRADOR" | "ENCARGADO_VENTAS" | "ENCARGADO_STOCK";
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(staffRol)) {
    return {
      authorized: false,
      error: `Permiso denegado: tu rol (${staffRol}) no tiene autorización para realizar esta operación.`,
    };
  }

  return {
    authorized: true,
    user: session,
    rol: staffRol,
    nombre: session.nombreCompleto,
  };
}
