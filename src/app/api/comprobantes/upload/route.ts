import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getServerSession, verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { validateUploadedFile } from "@/lib/uploadValidation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Control de acceso
    let session = await getServerSession();
    if (!session) {
      const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
      const payload = verifySessionToken(rawToken);
      if (payload && payload.kind === "CLIENTE") {
        session = payload;
      }
    }

    if (session && session.kind === "STAFF") {
      return NextResponse.json(
        { success: false, error: "Estás utilizando una cuenta de personal. Para realizar compras, ingresá con una cuenta de cliente." },
        { status: 403 }
      );
    }

    if (!session || session.kind !== "CLIENTE") {
      return NextResponse.json(
        { success: false, error: "Debés iniciar sesión con una cuenta de cliente para realizar compras online." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("comprobante") as File | null;

    const validation = await validateUploadedFile(file, {
      allowPdf: true,
      allowSvg: false,
    });

    if (!validation.valid || !validation.buffer || !validation.ext) {
      return NextResponse.json(
        { success: false, error: validation.error || "Formato no válido. Adjuntá JPG, PNG, WEBP o PDF (máx. 5 MB)." },
        { status: 400 }
      );
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "comprobantes");
    await fs.mkdir(uploadsDir, { recursive: true });

    const filename = `comprobante-checkout-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${validation.ext}`;
    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, validation.buffer);

    const comprobanteUrl = `/uploads/comprobantes/${filename}`;
    return NextResponse.json({ success: true, comprobanteUrl });
  } catch (error) {
    console.error("Error en API /api/comprobantes/upload:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al procesar el archivo del comprobante." },
      { status: 500 }
    );
  }
}
