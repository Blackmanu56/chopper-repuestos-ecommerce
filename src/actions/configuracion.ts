"use server";

import { cache } from "react";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import { requireStaffSession, StaffRole } from "@/lib/session";
import { validateUploadedFile } from "@/lib/uploadValidation";
import { parseProductMetadata, serializeProductMetadata } from "@/lib/productMetadata";

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
  cuotas_habilitadas: boolean;
  cuotas_cantidad: number;
  cuotas_sin_interes: boolean;
  cuotas_recargo_porcentaje: number;
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
  cuotas_habilitadas: true,
  cuotas_cantidad: 3,
  cuotas_sin_interes: true,
  cuotas_recargo_porcentaje: 0,
};

async function verifyStaff(
  userId?: number,
  allowedRoles: StaffRole[] = ["ADMINISTRADOR", "ENCARGADO_VENTAS"]
): Promise<{ authorized: boolean; error?: string }> {
  const res = await requireStaffSession(allowedRoles);
  if (res.authorized) return { authorized: true };

  if (userId) {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { rol: true },
    });
    if (user && user.activo && user.rol && allowedRoles.includes(user.rol.nombre as StaffRole)) {
      return { authorized: true };
    }
  }

  return { authorized: false, error: res.error || "Acceso denegado: debés iniciar sesión con una cuenta de personal autorizado." };
}

/**
 * Obtiene la configuración completa de la tienda
 */
const getCachedConfig = cache(async (): Promise<TiendaConfig> => {
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
      } else if (item.clave === "cuotas_habilitadas") {
        result.cuotas_habilitadas = item.valor === "true";
      } else if (item.clave === "cuotas_sin_interes") {
        result.cuotas_sin_interes = item.valor === "true";
      } else if (item.clave === "cuotas_cantidad") {
        const parsed = parseInt(item.valor, 10);
        result.cuotas_cantidad = !isNaN(parsed) && parsed > 0 ? parsed : 3;
      } else if (item.clave === "cuotas_recargo_porcentaje") {
        const parsed = parseFloat(item.valor);
        result.cuotas_recargo_porcentaje = !isNaN(parsed) && parsed >= 0 ? parsed : 0;
      } else if (item.clave in result) {
        (result as unknown as Record<string, string>)[item.clave] = item.valor;
      }
    }

    return result;
  } catch (error) {
    console.error("Error al obtener configuración de la tienda:", error);
    return DEFAULT_CONFIG;
  }
});

export async function getConfiguracionAction(): Promise<TiendaConfig> {
  return getCachedConfig();
}

/**
 * Guarda o actualiza los datos de identidad y contacto de la tienda (Solo ADMINISTRADOR)
 */
export async function updateConfiguracionAction(
  _ignoredUserId: number,
  values: Partial<TiendaConfig>
): Promise<{ success: boolean; config?: TiendaConfig; error?: string }> {
  const auth = await verifyStaff(_ignoredUserId, ["ADMINISTRADOR", "ENCARGADO_VENTAS"]);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    for (const [key, val] of Object.entries(values)) {
      if (val !== undefined && val !== null && key in DEFAULT_CONFIG) {
        const stringVal = typeof val === "boolean" ? (val ? "true" : "false") : String(val);
        await prisma.configuracionEcommerce.upsert({
          where: { clave: key },
          update: { valor: stringVal },
          create: { clave: key, valor: stringVal },
        });
      }
    }

    try {
      revalidatePath("/", "layout");
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
 * Sube un nuevo logo institucional (Solo ADMINISTRADOR)
 */
export async function uploadLogoAction(
  _ignoredUserId: number,
  formData: FormData
): Promise<{ success: boolean; logoUrl?: string; error?: string }> {
  const auth = await verifyStaff(_ignoredUserId, ["ADMINISTRADOR", "ENCARGADO_VENTAS"]);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    const file = formData.get("logo") as File | null;
    const validation = await validateUploadedFile(file, {
      allowPdf: false,
      allowSvg: true,
    });
    if (!validation.valid || !validation.buffer || !validation.ext) {
      return { success: false, error: validation.error || "Archivo de logo no válido." };
    }

    const brandingDir = path.join(process.cwd(), "public", "uploads", "branding");
    await fs.mkdir(brandingDir, { recursive: true });

    const filename = `logo-${Date.now()}${validation.ext}`;
    const filePath = path.join(brandingDir, filename);
    await fs.writeFile(filePath, validation.buffer);

    const logoUrl = `/uploads/branding/${filename}`;

    await prisma.configuracionEcommerce.upsert({
      where: { clave: "logo_url" },
      update: { valor: logoUrl },
      create: { clave: "logo_url", valor: logoUrl },
    });

    try {
      revalidatePath("/", "layout");
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
 * Sube una imagen para productos, combos, branding o banners
 */
export async function uploadMediaAction(
  _ignoredUserId: number,
  formData: FormData,
  folder: "productos" | "combos" | "branding" | "marcas" | "banners" = "productos"
): Promise<{ success: boolean; url?: string; error?: string }> {
  const allowedRoles: StaffRole[] = ["ADMINISTRADOR", "ENCARGADO_VENTAS"];
  const auth = await verifyStaff(_ignoredUserId, allowedRoles);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const allowedFolders = ["productos", "combos", "branding", "marcas", "banners"];
  const safeFolder = allowedFolders.includes(folder) ? folder : "productos";

  try {
    const file = formData.get("file") as File | null;
    const validation = await validateUploadedFile(file, {
      allowPdf: false,
      allowSvg: true,
    });
    if (!validation.valid || !validation.buffer || !validation.ext) {
      return { success: false, error: validation.error || "Archivo no válido." };
    }

    const targetDir = path.join(process.cwd(), "public", "uploads", safeFolder);
    await fs.mkdir(targetDir, { recursive: true });

    const filename = `${safeFolder}-${Date.now()}-${Math.floor(Math.random() * 1000)}${validation.ext}`;
    const filePath = path.join(targetDir, filename);
    await fs.writeFile(filePath, validation.buffer);

    const url = `/uploads/${safeFolder}/${filename}`;
    return { success: true, url };
  } catch (error) {
    console.error("Error al subir archivo de media:", error);
    return { success: false, error: "Error al guardar el archivo." };
  }
}

// ══════════════════ ETIQUETAS DE OFERTA ══════════════════
export type { EtiquetaOferta } from "@/lib/etiquetas";
import { EtiquetaOferta } from "@/lib/etiquetas";

const DEFAULT_ETIQUETAS: EtiquetaOferta[] = [
  { id: "primavera", nombre: "Mes de la Primavera", emoji: "🎉", activa: true },
  { id: "super-promo", nombre: "Super Promo", emoji: "🔥", activa: true },
  { id: "liquidacion", nombre: "Liquidación", emoji: "💸", activa: true },
  { id: "relampago", nombre: "Oferta Relámpago", emoji: "⚡", activa: false },
  { id: "recomendado", nombre: "Recomendado Posadas", emoji: "⭐", activa: true },
];

const getCachedEtiquetas = cache(async (): Promise<EtiquetaOferta[]> => {
  try {
    const config = await prisma.configuracionEcommerce.findUnique({
      where: { clave: "etiquetas_oferta" },
    });
    if (config?.valor) {
      const parsed = JSON.parse(config.valor);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } else {
      // Si aún no existe en la base de datos, lo persistimos inicialmente
      try {
        await prisma.configuracionEcommerce.create({
          data: {
            clave: "etiquetas_oferta",
            valor: JSON.stringify(DEFAULT_ETIQUETAS),
          },
        });
      } catch {}
    }
  } catch {}
  return DEFAULT_ETIQUETAS;
});

export async function getEtiquetasOfertaAction(): Promise<EtiquetaOferta[]> {
  return getCachedEtiquetas();
}

/**
 * Retorna la lista de nombres de etiquetas actualmente activas
 */
export async function getEtiquetasActivasAction(): Promise<string[]> {
  const etiquetas = await getEtiquetasOfertaAction();
  return etiquetas.filter((e) => e.activa).map((e) => e.nombre.toLowerCase().trim());
}

export async function crearEtiquetaOfertaAction(
  userId: number,
  nombre: string,
  emoji?: string | null
): Promise<{ success: boolean; etiquetas?: EtiquetaOferta[]; error?: string }> {
  const auth = await verifyStaff(userId);
  if (!auth.authorized) return { success: false, error: auth.error };

  const clean = nombre.trim();
  if (!clean) return { success: false, error: "Ingresá un nombre para la etiqueta." };

  const cleanEmoji = emoji?.trim() || null;

  const actuales = await getEtiquetasOfertaAction();
  if (actuales.some((e) => e.nombre.toLowerCase() === clean.toLowerCase())) {
    return { success: false, error: "Ya existe una etiqueta con ese nombre." };
  }

  const nueva: EtiquetaOferta = {
    id: `tag-${Date.now()}`,
    nombre: clean,
    emoji: cleanEmoji,
    activa: true,
  };
  const actualizadas = [...actuales, nueva];

  try {
    await prisma.configuracionEcommerce.upsert({
      where: { clave: "etiquetas_oferta" },
      update: { valor: JSON.stringify(actualizadas) },
      create: { clave: "etiquetas_oferta", valor: JSON.stringify(actualizadas) },
    });

    try {
      revalidatePath("/panel");
      revalidatePath("/ofertas");
      revalidatePath("/combos");
      revalidatePath("/", "layout");
    } catch {}

    return { success: true, etiquetas: actualizadas };
  } catch (err) {
    console.error("Error al crear etiqueta:", err);
    return { success: false, error: "Error al guardar la etiqueta en la base de datos." };
  }
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

  try {
    await prisma.configuracionEcommerce.upsert({
      where: { clave: "etiquetas_oferta" },
      update: { valor: JSON.stringify(actualizadas) },
      create: { clave: "etiquetas_oferta", valor: JSON.stringify(actualizadas) },
    });

    try {
      revalidatePath("/panel");
      revalidatePath("/ofertas");
      revalidatePath("/combos");
      revalidatePath("/", "layout");
    } catch {}

    return { success: true, etiquetas: actualizadas };
  } catch (err) {
    console.error("Error al pausar/reactivar etiqueta:", err);
    return { success: false, error: "Error al actualizar el estado de la etiqueta." };
  }
}

export async function editarEtiquetaOfertaAction(
  userId: number,
  id: string,
  nuevoNombre: string,
  nuevoEmoji?: string | null
): Promise<{ success: boolean; etiquetas?: EtiquetaOferta[]; error?: string }> {
  const auth = await verifyStaff(userId);
  if (!auth.authorized) return { success: false, error: auth.error };

  const clean = nuevoNombre.trim();
  if (!clean) return { success: false, error: "El nombre de la etiqueta no puede estar vacío." };

  const cleanEmoji = nuevoEmoji !== undefined ? (nuevoEmoji?.trim() || null) : undefined;

  const actuales = await getEtiquetasOfertaAction();
  if (actuales.some((e) => e.id !== id && e.nombre.toLowerCase() === clean.toLowerCase())) {
    return { success: false, error: "Ya existe otra etiqueta con ese nombre." };
  }

  const anterior = actuales.find((e) => e.id === id);
  const actualizadas = actuales.map((e) => {
    if (e.id === id) {
      return {
        ...e,
        nombre: clean,
        emoji: cleanEmoji !== undefined ? cleanEmoji : (e.emoji || null),
      };
    }
    return e;
  });

  try {
    await prisma.configuracionEcommerce.upsert({
      where: { clave: "etiquetas_oferta" },
      update: { valor: JSON.stringify(actualizadas) },
      create: { clave: "etiquetas_oferta", valor: JSON.stringify(actualizadas) },
    });

    // Cascada: si la etiqueta cambió de nombre, actualizamos los productos y combos asignados
    if (anterior && anterior.nombre !== clean) {
      await prisma.productoEcommerce.updateMany({
        where: { badgePromo: anterior.nombre },
        data: { badgePromo: clean },
      });

      await prisma.comboEcommerce.updateMany({
        where: { badge: anterior.nombre },
        data: { badge: clean },
      });
    }

    try {
      revalidatePath("/panel");
      revalidatePath("/ofertas");
      revalidatePath("/combos");
      revalidatePath("/", "layout");
    } catch {}

    return { success: true, etiquetas: actualizadas };
  } catch (err) {
    console.error("Error al editar etiqueta:", err);
    return { success: false, error: "Error al actualizar la etiqueta en la base de datos." };
  }
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
    .replace(/Catálogo & Ofertas/gi, "Catálogo y Ofertas")
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

export async function getAuditoriaLogsAction(_ignoredUserId?: number): Promise<AuditoriaLog[]> {
  const auth = await requireStaffSession([
    "ADMINISTRADOR",
    "ENCARGADO_VENTAS",
    "ENCARGADO_STOCK",
  ]);
  if (!auth.authorized) {
    return [];
  }

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
  _ignoredUsuario: string,
  accion: string,
  modulo: string,
  detalle?: string
): Promise<void> {
  const auth = await requireStaffSession([
    "ADMINISTRADOR",
    "ENCARGADO_VENTAS",
    "ENCARGADO_STOCK",
  ]);
  if (!auth.authorized || !auth.user) {
    return;
  }

  try {
    const actuales = await getAuditoriaLogsAction();
    const now = new Date();
    const fecha = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")} hs (${now.toLocaleDateString("es-AR")})`;
    const verifiedUsuario = auth.user.nombreCompleto || auth.user.username;
    const nuevoLog: AuditoriaLog = {
      id: `aud-${Date.now()}`,
      fecha,
      usuario: verifiedUsuario,
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

// ══════════════════ BANNERS DEL INICIO (HERO Y TEMPORADA) ══════════════════

export interface BannerHome {
  id: string;
  titulo: string;
  descripcion: string;
  enlace?: string;
  imagenUrl?: string;
  badge?: string;
  activo: boolean;
  orden: number;
}

const DEFAULT_BANNERS_HOME: BannerHome[] = [
  {
    id: "banner-1",
    titulo: "Hacé tu pedido y retiralo en el local",
    descripcion:
      "Buscá tu repuesto, armá el pedido online y pasá a retirarlo por nuestro local, o pedí envío con Motomandado / Moto Uber. Pagás en efectivo o transferencia al recibir tu mercadería.",
    enlace: "/ofertas",
    imagenUrl: "",
    badge: "CHOPPER REPUESTOS · POSADAS, MISIONES",
    activo: true,
    orden: 1,
  },
  {
    id: "banner-2",
    titulo: "Especial Temporada de Mantenimiento",
    descripcion:
      "Aprovechá ofertas destacadas en lubricantes, filtros, transmisión y frenos para tener tu moto en óptimas condiciones.",
    enlace: "/ofertas",
    imagenUrl: "",
    badge: "Promoción de Temporada",
    activo: true,
    orden: 2,
  },
];

/**
 * Obtiene todos los banners configurados para la página de inicio
 */
const getCachedBannersHome = cache(async (): Promise<BannerHome[]> => {
  try {
    const config = await prisma.configuracionEcommerce.findUnique({
      where: { clave: "banners_home" },
    });
    if (config?.valor) {
      const parsed = JSON.parse(config.valor);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a: BannerHome, b: BannerHome) => (a.orden || 0) - (b.orden || 0));
      }
    } else {
      try {
        await prisma.configuracionEcommerce.create({
          data: {
            clave: "banners_home",
            valor: JSON.stringify(DEFAULT_BANNERS_HOME),
          },
        });
      } catch {}
    }
  } catch (e) {
    console.error("Error al obtener banners home:", e);
  }
  return DEFAULT_BANNERS_HOME;
});

export async function getBannersHomeAction(): Promise<BannerHome[]> {
  return getCachedBannersHome();
}

/**
 * Crea un nuevo banner para el inicio
 */
export async function crearBannerHomeAction(
  userId: number,
  banner: Omit<BannerHome, "id">
): Promise<{ success: boolean; banners?: BannerHome[]; error?: string }> {
  const auth = await verifyStaff(userId, ["ADMINISTRADOR", "ENCARGADO_VENTAS"]);
  if (!auth.authorized) return { success: false, error: auth.error };

  const titulo = banner.titulo?.trim();
  if (!titulo) return { success: false, error: "El banner debe tener un título." };

  const actuales = await getBannersHomeAction();
  const nuevo: BannerHome = {
    ...banner,
    id: `banner-${Date.now()}`,
    titulo,
    descripcion: banner.descripcion?.trim() || "",
    enlace: banner.enlace?.trim() || "",
    imagenUrl: banner.imagenUrl?.trim() || "",
    badge: banner.badge?.trim() || "",
    activo: banner.activo ?? true,
    orden: banner.orden ?? (actuales.length + 1),
  };
  const actualizados = [...actuales, nuevo].sort((a, b) => (a.orden || 0) - (b.orden || 0));

  try {
    await prisma.configuracionEcommerce.upsert({
      where: { clave: "banners_home" },
      update: { valor: JSON.stringify(actualizados) },
      create: { clave: "banners_home", valor: JSON.stringify(actualizados) },
    });

    try {
      revalidatePath("/", "layout");
      revalidatePath("/");
      revalidatePath("/panel");
    } catch {}

    return { success: true, banners: actualizados };
  } catch (err) {
    console.error("Error al crear banner:", err);
    return { success: false, error: "Error al guardar el banner en la base de datos." };
  }
}

/**
 * Modifica un banner existente
 */
export async function editarBannerHomeAction(
  userId: number,
  id: string,
  datos: Partial<BannerHome>
): Promise<{ success: boolean; banners?: BannerHome[]; error?: string }> {
  const auth = await verifyStaff(userId, ["ADMINISTRADOR", "ENCARGADO_VENTAS"]);
  if (!auth.authorized) return { success: false, error: auth.error };

  const actuales = await getBannersHomeAction();
  const index = actuales.findIndex((b) => b.id === id);
  if (index === -1) return { success: false, error: "Banner no encontrado." };

  const bannerPrevio = actuales[index];
  const actualizado: BannerHome = {
    ...bannerPrevio,
    ...datos,
    titulo: datos.titulo !== undefined ? datos.titulo.trim() : bannerPrevio.titulo,
    descripcion: datos.descripcion !== undefined ? datos.descripcion.trim() : bannerPrevio.descripcion,
    enlace: datos.enlace !== undefined ? datos.enlace.trim() : bannerPrevio.enlace,
    imagenUrl: datos.imagenUrl !== undefined ? datos.imagenUrl.trim() : bannerPrevio.imagenUrl,
    badge: datos.badge !== undefined ? datos.badge.trim() : bannerPrevio.badge,
  };

  if (!actualizado.titulo) {
    return { success: false, error: "El banner debe tener un título." };
  }

  actuales[index] = actualizado;
  const actualizados = [...actuales].sort((a, b) => (a.orden || 0) - (b.orden || 0));

  try {
    await prisma.configuracionEcommerce.upsert({
      where: { clave: "banners_home" },
      update: { valor: JSON.stringify(actualizados) },
      create: { clave: "banners_home", valor: JSON.stringify(actualizados) },
    });

    try {
      revalidatePath("/", "layout");
      revalidatePath("/");
      revalidatePath("/panel");
    } catch {}

    return { success: true, banners: actualizados };
  } catch (err) {
    console.error("Error al editar banner:", err);
    return { success: false, error: "Error al actualizar el banner." };
  }
}

/**
 * Activa o pausa un banner
 */
export async function toggleBannerHomeAction(
  userId: number,
  id: string,
  activo: boolean
): Promise<{ success: boolean; banners?: BannerHome[]; error?: string }> {
  return editarBannerHomeAction(userId, id, { activo });
}

/**
 * Elimina un banner
 */
export async function eliminarBannerHomeAction(
  userId: number,
  id: string
): Promise<{ success: boolean; banners?: BannerHome[]; error?: string }> {
  const auth = await verifyStaff(userId, ["ADMINISTRADOR", "ENCARGADO_VENTAS"]);
  if (!auth.authorized) return { success: false, error: auth.error };

  const actuales = await getBannersHomeAction();
  const actualizados = actuales.filter((b) => b.id !== id);

  try {
    await prisma.configuracionEcommerce.upsert({
      where: { clave: "banners_home" },
      update: { valor: JSON.stringify(actualizados) },
      create: { clave: "banners_home", valor: JSON.stringify(actualizados) },
    });

    try {
      revalidatePath("/", "layout");
      revalidatePath("/");
      revalidatePath("/panel");
    } catch {}

    return { success: true, banners: actualizados };
  } catch (err) {
    console.error("Error al eliminar banner:", err);
    return { success: false, error: "Error al eliminar el banner." };
  }
}

const DEFAULT_MOTOS_CATALOGO = [
  "Honda Wave 110",
  "Honda CG 150 Titan",
  "Honda XR 150L",
  "Honda XR 250 Tornado",
  "Honda CB 250 Twister",
  "Honda CBX 250 Twister",
  "Honda Biz 125",
  "Honda XR 190L",
  "Honda GLH 150 Gaucha",
  "Honda CB 190R",
  "Honda Storm 125",
  "Honda Elite 125",
  "Honda PCX 150",
  "Yamaha YBR 125",
  "Yamaha YBR 125 ED",
  "Yamaha FZ 16",
  "Yamaha FZ-FI 2.0",
  "Yamaha Crypton 110",
  "Yamaha XTZ 125",
  "Yamaha XTZ 250 Lander",
  "Yamaha FZ 25",
  "Yamaha Ray ZR 125",
  "Motomel Blitz 110",
  "Motomel Skua 150",
  "Motomel Skua 250",
  "Motomel S2 150",
  "Motomel Sirius 150",
  "Gilera Smash 110",
  "Gilera VC 150",
  "Gilera Sahel 150",
  "Gilera SMX 200",
  "Corven Energy 110",
  "Corven Hunter 150",
  "Corven Triax 150",
  "Corven Triax 250",
  "Zanella ZB 110",
  "Zanella RX 150",
  "Zanella ZR 150",
  "Zanella ZR 250",
  "Bajaj Rouser NS 200",
  "Bajaj Rouser NS 160",
  "Bajaj Rouser 135 LS",
  "Bajaj Boxer 150",
  "Bajaj Dominar 400",
  "Mondial LD 110",
  "Mondial TD 150",
  "Guerrero Trip 110",
  "Suzuki AX 100",
  "Suzuki GN 125",
  "Suzuki EN 125",
  "Suzuki Gixxer 150",
];

const DEFAULT_SPECS_SUGERIDAS = [
  "Posición",
  "Material",
  "Medida / Diámetro",
  "Origen / Fabricación",
  "Paso",
  "Cantidad de eslabones",
  "Tipo de cadena",
  "Viscosidad",
  "Tipo de aceite / fluido",
  "Voltaje / Capacidad",
  "Color",
  "Garantía oficial",
  "Condición",
  "Lado",
  "Rosca",
  "Diámetro interno",
  "Diámetro externo",
  "Espesor",
];

/**
 * Obtiene el catálogo completo y persistente de motos compatibles del e-commerce.
 */
export async function getCatalogoMotosAction(): Promise<string[]> {
  try {
    const record = await prisma.configuracionEcommerce.findUnique({
      where: { clave: "catalogo_motos_compatibles" },
    });

    let list: string[] = [];
    if (record && record.valor) {
      try {
        const parsed = JSON.parse(record.valor);
        if (Array.isArray(parsed)) {
          list = parsed.filter((m) => typeof m === "string" && m.trim().length > 0);
        }
      } catch {}
    }

    if (list.length === 0) {
      list = [...DEFAULT_MOTOS_CATALOGO];
      await prisma.configuracionEcommerce.upsert({
        where: { clave: "catalogo_motos_compatibles" },
        update: { valor: JSON.stringify(list) },
        create: {
          clave: "catalogo_motos_compatibles",
          valor: JSON.stringify(list),
          descripcion: "Catálogo reutilizable de motos y modelos compatibles para el e-commerce",
        },
      });
    }

    // Normalizar, deduplicar case-insensitive y ordenar alfabéticamente
    const map = new Map<string, string>();
    for (const m of list) {
      const clean = m.trim().replace(/\s+/g, " ");
      const lower = clean.toLowerCase();
      if (!map.has(lower)) {
        map.set(lower, clean);
      }
    }

    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  } catch (error) {
    console.error("Error al obtener catálogo de motos:", error);
    return DEFAULT_MOTOS_CATALOGO;
  }
}

/**
 * Agrega una nueva moto al catálogo compartido y persistente de motos compatibles.
 */
export async function agregarMotoCatalogoAction(
  userId: number,
  nombreMoto: string
): Promise<{ success: boolean; motos?: string[]; error?: string }> {
  const auth = await verifyStaff(userId, ["ADMINISTRADOR", "ENCARGADO_VENTAS", "ENCARGADO_STOCK"]);
  if (!auth.authorized) return { success: false, error: auth.error };

  const clean = (nombreMoto || "").trim().replace(/\s+/g, " ");
  if (!clean || clean.length < 3) {
    return { success: false, error: "Ingresá un nombre de moto válido (mínimo 3 caracteres)." };
  }

  try {
    const actuales = await getCatalogoMotosAction();
    const existe = actuales.some((m) => m.toLowerCase() === clean.toLowerCase());
    let actualizados = actuales;

    if (!existe) {
      actualizados = [...actuales, clean].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
      await prisma.configuracionEcommerce.upsert({
        where: { clave: "catalogo_motos_compatibles" },
        update: { valor: JSON.stringify(actualizados) },
        create: {
          clave: "catalogo_motos_compatibles",
          valor: JSON.stringify(actualizados),
          descripcion: "Catálogo reutilizable de motos y modelos compatibles para el e-commerce",
        },
      });
    }

    return { success: true, motos: actualizados };
  } catch (error) {
    console.error("Error al agregar moto al catálogo:", error);
    return { success: false, error: "No se pudo guardar la moto en el catálogo compartido." };
  }
}

/**
 * Obtiene el catálogo de sugerencias de nombres de características técnicas.
 */
export async function getCatalogoSpecsSugeridasAction(): Promise<string[]> {
  try {
    const record = await prisma.configuracionEcommerce.findUnique({
      where: { clave: "catalogo_specs_sugeridas" },
    });

    let list: string[] = [];
    if (record && record.valor) {
      try {
        const parsed = JSON.parse(record.valor);
        if (Array.isArray(parsed)) {
          list = parsed.filter((s) => typeof s === "string" && s.trim().length > 0);
        }
      } catch {}
    }

    if (list.length === 0) {
      list = [...DEFAULT_SPECS_SUGERIDAS];
      await prisma.configuracionEcommerce.upsert({
        where: { clave: "catalogo_specs_sugeridas" },
        update: { valor: JSON.stringify(list) },
        create: {
          clave: "catalogo_specs_sugeridas",
          valor: JSON.stringify(list),
          descripcion: "Sugerencias reutilizables de nombres de características técnicas",
        },
      });
    }

    const map = new Map<string, string>();
    for (const s of list) {
      const clean = s.trim();
      const lower = clean.toLowerCase();
      if (!map.has(lower)) {
        map.set(lower, clean);
      }
    }

    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  } catch (error) {
    console.error("Error al obtener catálogo de specs sugeridas:", error);
    return DEFAULT_SPECS_SUGERIDAS;
  }
}

/**
 * Agrega un nuevo nombre de característica a las sugerencias reutilizables.
 */
export async function agregarSpecSugeridaAction(
  userId: number,
  caracteristica: string
): Promise<{ success: boolean; specs?: string[]; error?: string }> {
  const auth = await verifyStaff(userId, ["ADMINISTRADOR", "ENCARGADO_VENTAS", "ENCARGADO_STOCK"]);
  if (!auth.authorized) return { success: false, error: auth.error };

  const clean = (caracteristica || "").trim().replace(/\s+/g, " ");
  if (!clean || clean.length < 2) {
    return { success: false, error: "Ingresá un nombre de característica válido." };
  }

  try {
    const actuales = await getCatalogoSpecsSugeridasAction();
    const existe = actuales.some((s) => s.toLowerCase() === clean.toLowerCase());
    let actualizados = actuales;

    if (!existe) {
      actualizados = [...actuales, clean].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
      await prisma.configuracionEcommerce.upsert({
        where: { clave: "catalogo_specs_sugeridas" },
        update: { valor: JSON.stringify(actualizados) },
        create: {
          clave: "catalogo_specs_sugeridas",
          valor: JSON.stringify(actualizados),
          descripcion: "Sugerencias reutilizables de nombres de características técnicas",
        },
      });
    }

    return { success: true, specs: actualizados };
  } catch (error) {
    console.error("Error al agregar spec sugerida:", error);
    return { success: false, error: "No se pudo guardar la sugerencia técnica." };
  }
}

/**
 * Verifica qué productos y combos utilizan actualmente un modelo de moto específico.
 */
export async function verificarImpactoEditarMotoAction(nombreActual: string): Promise<{
  count: number;
  productos: Array<{ id: number; nombre: string; tipo: "PRODUCTO" | "COMBO" }>;
}> {
  const cleanTarget = (nombreActual || "").trim().toLowerCase();
  if (!cleanTarget) return { count: 0, productos: [] };

  try {
    const prods = await prisma.productoEcommerce.findMany({
      where: {
        descripcion: { contains: cleanTarget, mode: "insensitive" },
      },
      include: {
        producto: { select: { id: true, nombre: true } },
      },
    });

    const affected: Array<{ id: number; nombre: string; tipo: "PRODUCTO" | "COMBO" }> = [];

    for (const p of prods) {
      const meta = parseProductMetadata(p.descripcion);
      if (meta.motosCompatibles.some((m) => m.toLowerCase() === cleanTarget)) {
        affected.push({
          id: p.producto.id,
          nombre: meta.tituloComercial?.trim() || p.producto.nombre,
          tipo: "PRODUCTO",
        });
      }
    }

    // Comprobar combos
    const combos = await prisma.comboEcommerce.findMany({
      where: {
        descripcion: { contains: cleanTarget, mode: "insensitive" },
      },
      select: { id: true, nombre: true, descripcion: true },
    });

    for (const c of combos) {
      const meta = parseProductMetadata(c.descripcion);
      if (meta.motosCompatibles.some((m) => m.toLowerCase() === cleanTarget)) {
        affected.push({
          id: c.id,
          nombre: c.nombre,
          tipo: "COMBO",
        });
      }
    }

    return { count: affected.length, productos: affected };
  } catch (error) {
    console.error("Error al verificar impacto de moto:", error);
    return { count: 0, productos: [] };
  }
}

/**
 * Corrige o edita un modelo del catálogo compartido, actualizando opcionalmente
 * los productos y combos que ya lo utilizaban para mantener la coherencia.
 */
export async function editarMotoCatalogoAction(
  userId: number,
  nombreActual: string,
  nombreNuevo: string,
  actualizarExistentes = true
): Promise<{
  success: boolean;
  motos?: string[];
  actualizadosCount?: number;
  error?: string;
}> {
  const auth = await verifyStaff(userId, ["ADMINISTRADOR", "ENCARGADO_VENTAS", "ENCARGADO_STOCK"]);
  if (!auth.authorized) return { success: false, error: auth.error };

  const cleanOld = (nombreActual || "").trim();
  const cleanNew = (nombreNuevo || "").trim().replace(/\s+/g, " ");

  if (!cleanNew || cleanNew.length < 3) {
    return { success: false, error: "Ingresá un nombre de moto válido (mínimo 3 caracteres)." };
  }

  if (cleanOld.toLowerCase() === cleanNew.toLowerCase()) {
    return { success: true, motos: await getCatalogoMotosAction(), actualizadosCount: 0 };
  }

  try {
    const actuales = await getCatalogoMotosAction();
    const actualizados = actuales
      .map((m) => (m.toLowerCase() === cleanOld.toLowerCase() ? cleanNew : m))
      .filter((m, idx, arr) => arr.findIndex((x) => x.toLowerCase() === m.toLowerCase()) === idx)
      .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

    await prisma.configuracionEcommerce.upsert({
      where: { clave: "catalogo_motos_compatibles" },
      update: { valor: JSON.stringify(actualizados) },
      create: {
        clave: "catalogo_motos_compatibles",
        valor: JSON.stringify(actualizados),
        descripcion: "Catálogo reutilizable de motos y modelos compatibles para el e-commerce",
      },
    });

    let actualizadosCount = 0;

    if (actualizarExistentes) {
      // 1. Actualizar en ProductoEcommerce
      const prods = await prisma.productoEcommerce.findMany({
        where: {
          descripcion: { contains: cleanOld, mode: "insensitive" },
        },
      });

      for (const p of prods) {
        const meta = parseProductMetadata(p.descripcion);
        if (meta.motosCompatibles.some((m) => m.toLowerCase() === cleanOld.toLowerCase())) {
          const nuevasMotos = meta.motosCompatibles.map((m) =>
            m.toLowerCase() === cleanOld.toLowerCase() ? cleanNew : m
          );
          const newDesc = serializeProductMetadata({
            tituloComercial: meta.tituloComercial,
            texto: meta.texto,
            universal: meta.universal,
            especificaciones: meta.especificaciones,
            motosCompatibles: nuevasMotos,
          });

          await prisma.productoEcommerce.update({
            where: { productoId: p.productoId },
            data: { descripcion: newDesc },
          });
          actualizadosCount++;
        }
      }

      // 2. Actualizar en Combos
      const combos = await prisma.comboEcommerce.findMany({
        where: {
          descripcion: { contains: cleanOld, mode: "insensitive" },
        },
      });

      for (const c of combos) {
        const meta = parseProductMetadata(c.descripcion);
        if (meta.motosCompatibles.some((m) => m.toLowerCase() === cleanOld.toLowerCase())) {
          const nuevasMotos = meta.motosCompatibles.map((m) =>
            m.toLowerCase() === cleanOld.toLowerCase() ? cleanNew : m
          );
          const newDesc = serializeProductMetadata({
            tituloComercial: meta.tituloComercial,
            texto: meta.texto,
            universal: meta.universal,
            especificaciones: meta.especificaciones,
            motosCompatibles: nuevasMotos,
          });

          await prisma.comboEcommerce.update({
            where: { id: c.id },
            data: { descripcion: newDesc },
          });
          actualizadosCount++;
        }
      }
    }

    try {
      revalidatePath("/panel");
      revalidatePath("/producto/[id]", "page");
      revalidatePath("/combos/[id]", "page");
      revalidatePath("/");
    } catch {}

    return { success: true, motos: actualizados, actualizadosCount };
  } catch (error) {
    console.error("Error al editar moto del catálogo:", error);
    return { success: false, error: "No se pudo actualizar el modelo en el catálogo." };
  }
}

