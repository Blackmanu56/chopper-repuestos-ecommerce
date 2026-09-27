import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const ECOMMERCE_DIR = path.join(process.cwd(), "public", "uploads", "avatars");
const SGI_DIR = path.resolve(process.cwd(), "..", "sgi-repuestos", "public", "uploads", "avatars");

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ file: string }> }
) {
  try {
    const { file } = await context.params;
    const safeFile = path.basename(file);

    // 1. Probar en e-commerce public
    const localPath = path.join(ECOMMERCE_DIR, safeFile);
    try {
      const data = await fs.readFile(localPath);
      return returnImageResponse(safeFile, data);
    } catch {}

    // 2. Si no está en e-commerce, buscarlo en SGI y sincronizarlo
    const sgiPath = path.join(SGI_DIR, safeFile);
    try {
      const data = await fs.readFile(sgiPath);
      // Auto-sincronizar para futuros accesos estáticos directos
      try {
        await fs.mkdir(ECOMMERCE_DIR, { recursive: true });
        await fs.writeFile(localPath, data);
      } catch {}
      return returnImageResponse(safeFile, data);
    } catch {}

    return new NextResponse("Avatar not found", { status: 404 });
  } catch (error) {
    return new NextResponse("Internal server error", { status: 500 });
  }
}

function returnImageResponse(filename: string, buffer: Buffer) {
  const ext = path.extname(filename).toLowerCase();
  let contentType = "image/jpeg";
  if (ext === ".png") contentType = "image/png";
  else if (ext === ".webp") contentType = "image/webp";

  return new NextResponse(buffer as any, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
