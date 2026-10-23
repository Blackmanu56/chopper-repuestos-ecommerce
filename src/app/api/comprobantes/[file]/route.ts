import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getServerSession, verifySessionToken, SESSION_COOKIE_NAME, SessionPayload } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "comprobantes");
const LEGACY_DIR = path.join(process.cwd(), "public", "comprobantes");

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ file: string }> }
) {
  try {
    const { file } = await context.params;
    if (!file || typeof file !== "string") {
      return NextResponse.json({ error: "Nombre de archivo inválido." }, { status: 400 });
    }

    const safeFile = path.basename(file).trim();
    if (!safeFile || safeFile === "." || safeFile === "..") {
      return NextResponse.json({ error: "Nombre de archivo inválido." }, { status: 400 });
    }

    // 1. Control de acceso del lado del servidor
    let session = await getServerSession();
    if (!session) {
      const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
      const payload = verifySessionToken(rawToken);
      if (payload) {
        if (payload.kind === "STAFF") {
          const u = await prisma.usuario.findUnique({
            where: { id: payload.id },
            include: { rol: true },
          });
          if (u && u.activo) {
            session = {
              ...payload,
              rol: (u.rol?.nombre || "").toUpperCase() as any,
              nombreCompleto: u.nombreCompleto,
            };
          }
        } else if (payload.kind === "CLIENTE") {
          const c = await prisma.cliente.findUnique({
            where: { id: payload.id },
          });
          if (c && c.activo) {
            session = {
              ...payload,
              rol: "CLIENTE",
              nombreCompleto: c.nombre,
            };
          }
        }
      }
    }

    if (!session) {
      return NextResponse.json(
        { error: "No autorizado. Iniciá sesión para acceder a este comprobante." },
        { status: 401 }
      );
    }

    const rolUpper = (session.rol || "").toUpperCase();
    const isStaff =
      session.kind === "STAFF" &&
      (rolUpper === "ADMINISTRADOR" ||
        rolUpper === "ENCARGADO_VENTAS" ||
        rolUpper === "ENCARGADO_STOCK");

    if (!isStaff) {
      if (session.kind === "CLIENTE") {
        // Verificar titularidad del pedido si es cliente
        const pedidoCliente = await prisma.pedidoEcommerce.findFirst({
          where: {
            comprobanteUrl: {
              contains: safeFile,
            },
            OR: [
              { clienteId: session.id },
              ...(session.dni ? [{ dniCliente: session.dni }] : []),
              ...(session.correo ? [{ emailCliente: session.correo }] : []),
            ],
          },
          select: { id: true, numero: true },
        });

        if (!pedidoCliente) {
          return NextResponse.json(
            { error: "Acceso denegado: este comprobante no pertenece a tu cuenta." },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Acceso denegado: permisos insuficientes para consultar comprobantes." },
          { status: 403 }
        );
      }
    }

    // 2. Localizar archivo físico en disco
    let targetPath = path.join(UPLOADS_DIR, safeFile);
    let fileBuffer: Buffer | null = null;

    try {
      fileBuffer = await fs.readFile(targetPath);
    } catch {
      // Fallback a carpeta legacy si existiera
      const legacyPath = path.join(LEGACY_DIR, safeFile);
      try {
        fileBuffer = await fs.readFile(legacyPath);
        targetPath = legacyPath;
      } catch {
        fileBuffer = null;
      }
    }

    if (!fileBuffer) {
      return NextResponse.json(
        {
          error: "Comprobante no encontrado en el servidor.",
          archivo: safeFile,
        },
        { status: 404 }
      );
    }

    // 3. Determinar MIME type
    const ext = path.extname(safeFile).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".pdf") {
      contentType = "application/pdf";
    } else if (ext === ".jpg" || ext === ".jpeg") {
      contentType = "image/jpeg";
    } else if (ext === ".png") {
      contentType = "image/png";
    } else if (ext === ".webp") {
      contentType = "image/webp";
    } else if (ext === ".svg") {
      contentType = "image/svg+xml";
    }

    return new NextResponse(fileBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${safeFile}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    console.error("Error al servir comprobante:", error);
    return NextResponse.json(
      { error: "Error interno al recuperar el comprobante." },
      { status: 500 }
    );
  }
}
