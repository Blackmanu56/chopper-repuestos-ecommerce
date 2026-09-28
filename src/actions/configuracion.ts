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
  mostrar_ahorro: boolean;
  ocultar_ahorro_cero: boolean;
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
  mostrar_ahorro: true,
  ocultar_ahorro_cero: true,
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
      } else if (item.clave === "mostrar_ahorro") {
        result.mostrar_ahorro = item.valor === "true";
      } else if (item.clave === "ocultar_ahorro_cero") {
        result.ocultar_ahorro_cero = item.valor === "true";
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

/**
 * Sube una imagen para productos, combos o branding
 */
export async function uploadMediaAction(
  userId: number,
  formData: FormData,
  folder: "productos" | "combos" | "branding" | "marcas" = "productos"
): Promise<{ success: boolean; url?: string; error?: string }> {
  const auth = await verifyStaff(userId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No se seleccionó ningún archivo." };
    }

    const ext = path.extname(file.name).toLowerCase();
    const allowed = [".png", ".jpg", ".jpeg", ".webp", ".svg"];
    if (!allowed.includes(ext)) {
      return { success: false, error: "Formato no válido. Usá PNG, JPG, WEBP o SVG." };
    }

    const targetDir = path.join(process.cwd(), "public", "uploads", folder);
    await fs.mkdir(targetDir, { recursive: true });

    const filename = `${folder}-${Date.now()}-${Math.floor(Math.random() * 1000)}${ext}`;
    const filePath = path.join(targetDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const url = `/uploads/${folder}/${filename}`;
    return { success: true, url };
  } catch (error) {
    console.error("Error al subir archivo de media:", error);
    return { success: false, error: "Error al guardar el archivo." };
  }
}

// ══════════════════ ETIQUETAS DE OFERTA ══════════════════

export interface EtiquetaOferta {
  id: string;
  nombre: string;
  activa: boolean;
  count?: number;
}

const DEFAULT_ETIQUETAS: EtiquetaOferta[] = [
  { id: "primavera", nombre: "Mes de la Primavera", activa: true },
  { id: "super-promo", nombre: "Super Promo", activa: true },
  { id: "liquidacion", nombre: "Liquidación", activa: true },
  { id: "relampago", nombre: "Oferta Relámpago", activa: false },
  { id: "recomendado", nombre: "Recomendado Posadas", activa: true },
];

export async function getEtiquetasOfertaAction(): Promise<EtiquetaOferta[]> {
  try {
    const config = await prisma.configuracionEcommerce.findUnique({
      where: { clave: "etiquetas_oferta" },
    });
    if (config?.valor) {
      const parsed = JSON.parse(config.valor);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_ETIQUETAS;
}

export async function crearEtiquetaOfertaAction(
  userId: number,
  nombre: string
): Promise<{ success: boolean; etiquetas?: EtiquetaOferta[]; error?: string }> {
  const auth = await verifyStaff(userId);
  if (!auth.authorized) return { success: false, error: auth.error };

  const clean = nombre.trim();
  if (!clean) return { success: false, error: "Ingresá un nombre para la etiqueta." };

  const actuales = await getEtiquetasOfertaAction();
  if (actuales.some((e) => e.nombre.toLowerCase() === clean.toLowerCase())) {
    return { success: false, error: "Ya existe una etiqueta con ese nombre." };
  }

  const nueva: EtiquetaOferta = {
    id: `tag-${Date.now()}`,
    nombre: clean,
    activa: true,
  };
  const actualizadas = [...actuales, nueva];

  await prisma.configuracionEcommerce.upsert({
    where: { clave: "etiquetas_oferta" },
    update: { valor: JSON.stringify(actualizadas) },
    create: { clave: "etiquetas_oferta", valor: JSON.stringify(actualizadas) },
  });

  return { success: true, etiquetas: actualizadas };
}

export async function toggleEtiquetaOfertaAction(
  userId: number,
  id: string,
  activa: boolean
): Promise<{ success: boolean; etiquetas?: EtiquetaOferta[]; error?: string }> {
  const auth = await verifyStaff(userId);
  if (!auth.authorized) return { success: false, error: auth.error };

  const actuales = await getEtiquetasOfertaAction();
  const actualizadas = actuales.map((e) => (e.id === id ? { ...e, activa } : e));

  await prisma.configuracionEcommerce.upsert({
    where: { clave: "etiquetas_oferta" },
    update: { valor: JSON.stringify(actualizadas) },
    create: { clave: "etiquetas_oferta", valor: JSON.stringify(actualizadas) },
  });

  return { success: true, etiquetas: actualizadas };
}

export async function editarEtiquetaOfertaAction(
  userId: number,
  id: string,
  nuevoNombre: string
): Promise<{ success: boolean; etiquetas?: EtiquetaOferta[]; error?: string }> {
  const auth = await verifyStaff(userId);
  if (!auth.authorized) return { success: false, error: auth.error };

  const clean = nuevoNombre.trim();
  if (!clean) return { success: false, error: "El nombre de la etiqueta no puede estar vacío." };

  const actuales = await getEtiquetasOfertaAction();
  if (actuales.some((e) => e.id !== id && e.nombre.toLowerCase() === clean.toLowerCase())) {
    return { success: false, error: "Ya existe otra etiqueta con ese nombre." };
  }

  const actualizadas = actuales.map((e) => (e.id === id ? { ...e, nombre: clean } : e));

  await prisma.configuracionEcommerce.upsert({
    where: { clave: "etiquetas_oferta" },
    update: { valor: JSON.stringify(actualizadas) },
    create: { clave: "etiquetas_oferta", valor: JSON.stringify(actualizadas) },
  });

  return { success: true, etiquetas: actualizadas };
}

// ══════════════════ AUDITORÍA DE CAMBIOS ══════════════════

export interface AuditoriaLog {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  modulo: string;
  detalle?: string;
}

function sanitizeModulo(m: string): string {
  if (!m) return "General";
  return m
    .replace(/Identidad & Branding/gi, "Identidad")
    .replace(/Combos & Kits/gi, "Combos y kits")
    .replace(/Catálogo & Ofertas/gi, "Catálogo y marcas")
    .replace(/\s*&\s*/g, " y ");
}

const DEFAULT_AUDITORIA: AuditoriaLog[] = [
  {
    id: "aud-1",
    fecha: "Hoy, 15:45 hs",
    usuario: "Administrador General",
    accion: "Activó campaña 'Mes de la Primavera 2026'",
    modulo: "Identidad",
    detalle: "Banner superior visible en toda la tienda",
  },
  {
    id: "aud-2",
    fecha: "Hoy, 14:30 hs",
    usuario: "Carlos López",
    accion: "Confirmó pago y entrega de orden #ORD-1052",
    modulo: "Pedidos Online",
    detalle: "Cliente: Carlos Motero Posadas ($53.000)",
  },
  {
    id: "aud-3",
    fecha: "Hoy, 12:15 hs",
    usuario: "Administrador General",
    accion: "Creó kit 'Combo Frenos y Seguridad'",
    modulo: "Combos y kits",
    detalle: "Descuento 19% OFF con 3 repuestos vinculados",
  },
];

export async function getAuditoriaLogsAction(): Promise<AuditoriaLog[]> {
  try {
    const config = await prisma.configuracionEcommerce.findUnique({
      where: { clave: "historial_auditoria" },
    });
    if (config?.valor) {
      const parsed = JSON.parse(config.valor);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((l: AuditoriaLog) => ({
          ...l,
          modulo: sanitizeModulo(l.modulo),
        }));
      }
    }
  } catch {}
  return DEFAULT_AUDITORIA;
}

export async function registrarAuditoriaAction(
  usuario: string,
  accion: string,
  modulo: string,
  detalle?: string
): Promise<void> {
  try {
    const actuales = await getAuditoriaLogsAction();
    const now = new Date();
    const fecha = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")} hs (${now.toLocaleDateString("es-AR")})`;
    const nuevoLog: AuditoriaLog = {
      id: `aud-${Date.now()}`,
      fecha,
      usuario,
      accion,
      modulo: sanitizeModulo(modulo),
      detalle,
    };
    const actualizados = [nuevoLog, ...actuales].slice(0, 50); // Guardar los 50 más recientes
    await prisma.configuracionEcommerce.upsert({
      where: { clave: "historial_auditoria" },
      update: { valor: JSON.stringify(actualizados) },
      create: { clave: "historial_auditoria", valor: JSON.stringify(actualizados) },
    });
  } catch (err) {
    console.error("Error al registrar log de auditoría:", err);
  }
}
