"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

export interface TiendaConfig {
  nombre_tienda: string;
  logo_url: string;
  direccion: string;
  mapa_url: string;
  telefono: string;
  whatsapp: string;
  email: string;
  horarios: string;
  texto_banner: string;
  mes_promocion: string;
  mostrar_banner_promocion: boolean;
}

const DEFAULT_CONFIG: TiendaConfig = {
  nombre_tienda: "Chopper Repuestos",
  logo_url: "/logo-nav.png",
  direccion: "Av. Roque Sáenz Peña 1500 · Posadas, Misiones",
  mapa_url: "https://www.google.com/maps/place/Av.+Roque+S%C3%A1enz+Pe%C3%B1a+1500,+N3301BJF+Posadas,+Misiones/@-27.3649105,-55.8869655,17z",
  telefono: "376 524-3554",
  whatsapp: "5493765243554",
  email: "contacto@chopper-repuestos.com",
  horarios: "Lun a Sáb 8:00-12:30 / 16:30-20:30",
  texto_banner: "🛵 Motomandado y Moto Uber en el día en Posadas",
  mes_promocion: "Mes de la Primavera",
  mostrar_banner_promocion: true,
};

async function verifyStaff(userId: number): Promise<{ authorized: boolean; error?: string }> {
  try {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { rol: true },
    });

    if (!user || !user.activo) {
      return { authorized: false, error: "Usuario inactivo o no encontrado." };
    }

    const rolName = (user.rol?.nombre || "").toUpperCase();
    if (rolName !== "ADMINISTRADOR" && rolName !== "ENCARGADO_VENTAS") {
      return { authorized: false, error: "Solo los administradores pueden modificar la configuración de la tienda." };
    }

    return { authorized: true };
  } catch (e) {
    console.error("Error verificando staff:", e);
    return { authorized: false, error: "Error de verificación de permisos." };
  }
}

/**
 * Obtiene la configuración completa de la tienda
 */
export async function getConfiguracionAction(): Promise<TiendaConfig> {
  try {
    const configs = await prisma.configuracionEcommerce.findMany();
    const result: TiendaConfig = { ...DEFAULT_CONFIG };

    for (const item of configs) {
      if (item.clave === "mostrar_banner_promocion") {
        result.mostrar_banner_promocion = item.valor === "true";
      } else if (item.clave in result) {
        (result as unknown as Record<string, string>)[item.clave] = item.valor;
      }
    }

    return result;
  } catch (error) {
    console.error("Error al obtener configuración de la tienda:", error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Guarda o actualiza los datos de identidad y contacto de la tienda
 */
export async function updateConfiguracionAction(
  userId: number,
  values: Partial<TiendaConfig>
): Promise<{ success: boolean; config?: TiendaConfig; error?: string }> {
  const auth = await verifyStaff(userId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    for (const [key, val] of Object.entries(values)) {
      if (val !== undefined && val !== null) {
        const stringVal = typeof val === "boolean" ? (val ? "true" : "false") : String(val);
        await prisma.configuracionEcommerce.upsert({
          where: { clave: key },
          update: { valor: stringVal },
          create: { clave: key, valor: stringVal },
        });
      }
    }

    try {
      revalidatePath("/");
      revalidatePath("/ofertas");
      revalidatePath("/combos");
      revalidatePath("/contacto");
      revalidatePath("/nosotros");
      revalidatePath("/panel");
    } catch {}

    const updated = await getConfiguracionAction();
    return { success: true, config: updated };
  } catch (error) {
    console.error("Error actualizando configuración:", error);
    return { success: false, error: "No se pudo guardar la configuración." };
  }
}

/**
 * Sube un nuevo logo institucional
 */
export async function uploadLogoAction(
  userId: number,
  formData: FormData
): Promise<{ success: boolean; logoUrl?: string; error?: string }> {
  const auth = await verifyStaff(userId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    const file = formData.get("logo") as File | null;
    if (!file) {
      return { success: false, error: "No se seleccionó ningún archivo de logo." };
    }

    const ext = path.extname(file.name).toLowerCase();
    const allowed = [".png", ".jpg", ".jpeg", ".webp", ".svg"];
    if (!allowed.includes(ext)) {
      return { success: false, error: "Formato no válido. Use PNG, JPG, WEBP o SVG." };
    }

    const brandingDir = path.join(process.cwd(), "public", "uploads", "branding");
    await fs.mkdir(brandingDir, { recursive: true });

    const filename = `logo-${Date.now()}${ext}`;
    const filePath = path.join(brandingDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const logoUrl = `/uploads/branding/${filename}`;

    await prisma.configuracionEcommerce.upsert({
      where: { clave: "logo_url" },
      update: { valor: logoUrl },
      create: { clave: "logo_url", valor: logoUrl },
    });

    try {
      revalidatePath("/");
      revalidatePath("/panel");
    } catch {}
    return { success: true, logoUrl };
  } catch (error) {
    console.error("Error al subir logo:", error);
    return { success: false, error: "Error al guardar el logo." };
  }
}
