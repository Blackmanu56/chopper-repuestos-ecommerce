import { NextRequest, NextResponse } from "next/server";
import { getServerSession, verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { validateUploadedFile } from "@/lib/uploadValidation";
import { uploadReceiptImage, MAX_RECEIPT_FILE_SIZE } from "@/lib/storage-service";

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
      allowSvg: true,
      maxSizeBytes: MAX_RECEIPT_FILE_SIZE,
    });

    if (!validation.valid || !validation.buffer || !validation.ext) {
      return NextResponse.json(
        { success: false, error: validation.error || "Formato no válido. Adjuntá JPG, PNG, WEBP, PDF o SVG (máx. 10 MB)." },
        { status: 400 }
      );
    }

    // Subida directa a Supabase Storage (bucket privado 'comprobantes-chopper')
    const uploadRes = await uploadReceiptImage(validation.buffer, file?.name);
    if (!uploadRes.success || !uploadRes.objectPath) {
      return NextResponse.json(
        { success: false, error: uploadRes.error || "No se pudo subir el comprobante a Supabase Storage." },
        { status: 500 }
      );
    }

    // Retorna la ruta interna persistible en base de datos ("pedidos/<filename>")
    return NextResponse.json({
      success: true,
      comprobanteUrl: uploadRes.objectPath,
      internalUrl: uploadRes.internalUrl,
    });
  } catch (error) {
    console.error("Error en API /api/comprobantes/upload:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al procesar el archivo del comprobante." },
      { status: 500 }
    );
  }
}
