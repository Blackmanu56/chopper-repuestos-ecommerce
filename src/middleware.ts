import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "chopper_session";
const CLIENT_SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const STAFF_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas

function getSessionSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "chopper-repuestos-posadas-hmac-secret-2026-v1"
  );
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

interface EdgeTokenResult {
  valid: boolean;
  expired: boolean;
  payload: {
    kind: string;
    rol: string;
    iat: number;
    exp: number;
  } | null;
}

async function verifyEdgeToken(token: string | undefined): Promise<EdgeTokenResult> {
  if (!token) return { valid: false, expired: false, payload: null };
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false, expired: false, payload: null };
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return { valid: false, expired: false, payload: null };

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(getSessionSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payloadB64));
    const expectedSigB64 = uint8ArrayToBase64Url(new Uint8Array(sigBuf));
    if (expectedSigB64 !== sigB64) return { valid: false, expired: false, payload: null };

    const jsonStr = new TextDecoder().decode(base64UrlToUint8Array(payloadB64));
    const payload = JSON.parse(jsonStr);
    if (!payload || typeof payload.exp !== "number" || typeof payload.iat !== "number") {
      return { valid: false, expired: false, payload: null };
    }
    const now = Date.now();
    if (now > payload.exp) {
      return { valid: false, expired: true, payload: null };
    }
    // Límite de duración absoluta según tipo de cuenta
    const maxAllowedDuration =
      (payload.kind === "STAFF" ? STAFF_SESSION_DURATION_MS : CLIENT_SESSION_DURATION_MS) + 60000;
    if (payload.exp - payload.iat > maxAllowedDuration) {
      return { valid: false, expired: false, payload: null };
    }
    return { valid: true, expired: false, payload };
  } catch {
    return { valid: false, expired: false, payload: null };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Protección de rutas administrativas
  if (pathname.startsWith("/panel")) {
    const rawCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const tokenResult = await verifyEdgeToken(rawCookie);

    if (!tokenResult.valid || !tokenResult.payload) {
      const isExpired = tokenResult.expired;
      const redirectUrl = new URL(isExpired ? "/?sessionExpired=true" : "/", request.url);
      const response = NextResponse.redirect(redirectUrl);
      if (rawCookie) {
        response.cookies.set(SESSION_COOKIE_NAME, "", {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 0,
          expires: new Date(0),
        });
      }
      return response;
    }

    const session = tokenResult.payload;
    const rolUpper = (session.rol || "").toUpperCase();
    const isStaff =
      session.kind === "STAFF" &&
      (rolUpper === "ADMINISTRADOR" ||
        rolUpper === "ENCARGADO_VENTAS" ||
        rolUpper === "ENCARGADO_STOCK");

    if (!isStaff) {
      // Si es un CLIENTE autenticado intentando acceder a /panel, redirigir a /mis-pedidos
      return NextResponse.redirect(new URL("/mis-pedidos", request.url));
    }
  }

  // 2. Protección y redirección segura de comprobantes de pago
  if (pathname.startsWith("/uploads/comprobantes/")) {
    const rawCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const tokenResult = await verifyEdgeToken(rawCookie);

    if (!tokenResult.valid || !tokenResult.payload) {
      return NextResponse.json(
        { error: "Acceso no autorizado: debes iniciar sesión para consultar este comprobante." },
        { status: 401 }
      );
    }

    const fileName = pathname.split("/").pop() || "";
    if (fileName) {
      return NextResponse.rewrite(new URL(`/api/comprobantes/${encodeURIComponent(fileName)}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*", "/uploads/comprobantes/:path*"],
};
