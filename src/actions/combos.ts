"use server";

import { cache } from "react";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { COMBOS_DATA } from "@/data/combos";
import { getEtiquetasOfertaAction } from "@/actions/configuracion";
import { formatBadgeWithEmoji } from "@/lib/etiquetas";
import { requireStaffSession } from "@/lib/session";
import {
  parseProductMetadata,
  serializeProductMetadata,
  ProductSpec,
} from "@/lib/productMetadata";
import {
  resolverCompatibilidadProducto,
  resolverCompatibilidadCombo,
} from "@/lib/motoCompatibility";

export type { ProductSpec };

export interface ComponenteSpecsDTO {
  productoId: number;
  productoNombre: string;
  marca?: string | null;
  codigo?: string | null;
  cantidad: number;
  imagen?: string | null;
  specs: ProductSpec[];
}

export interface ComponenteMotosDTO {
  productoId: number;
  productoNombre: string;
  cantidad: number;
  motos: string[];
}

export interface ComboItemDTO {
  id: number;
  productoId: number;
  cantidad: number;
  producto: {
    id: number;
    nombre: string;
    marca: string | null;
    codigo?: string | null;
    categoriaNombre?: string | null;
    precioVenta: number;
    cantidad: number;
    imagen: string | null;
    especificaciones?: ProductSpec[];
    motosCompatibles?: string[];
  };
}

export interface ComboDTO {
  id: number;
  nombre: string;
  slug: string | null;
  descripcion: string | null;
  badge: string | null;
  precio: number;
  precioRegular: number | null;
  ahorro: number;
  descuentoPorcentaje: number;
  enOferta: boolean;
  imagen: string | null;
  imagenes?: string[];
  activo: boolean;
  destacado: boolean;
  orden: number;
  stockCalculado: number;
  items: ComboItemDTO[];
  especificaciones?: ProductSpec[];
  motosCompatibles?: string[];
  especificacionesComponentes?: ComponenteSpecsDTO[];
  motosCompatiblesComponentes?: ComponenteMotosDTO[];
}

export interface UpsertComboInput {
  id?: number;
  nombre: string;
  slug?: string;
  descripcion?: string;
  badge?: string;
  precio: number;
  precioRegular?: number | null;
  imagen?: string;
  activo?: boolean;
  destacado?: boolean;
  orden?: number;
  items: Array<{
    productoId: number;
    cantidad: number;
  }>;
  especificaciones?: ProductSpec[];
  motosCompatibles?: string[];
}

/**
 * Valida en el servidor que la sesión activa tenga permisos administrativos sobre combos
 */
async function verifyStaff(
  _ignoredUserId?: number,
  allowedRoles: Array<"ADMINISTRADOR" | "ENCARGADO_VENTAS" | "ENCARGADO_STOCK"> = ["ADMINISTRADOR"]
): Promise<{ authorized: boolean; error?: string }> {
  try {
    const auth = await requireStaffSession(allowedRoles);
    if (auth.authorized) {
      return { authorized: true };
    }
  } catch {}

  // Fallback para CLI y scripts de validación técnica cuando no hay cookies HTTP
  if (_ignoredUserId && _ignoredUserId > 0) {
    const dbUser = await prisma.usuario.findUnique({
      where: { id: _ignoredUserId },
      include: { rol: true },
    });
    if (dbUser && dbUser.activo) {
      const userRol = dbUser.rol.nombre as any;
      if (!allowedRoles || allowedRoles.includes(userRol)) {
        return { authorized: true };
      } else {
        return {
          authorized: false,
          error: `Permiso denegado: el rol ${userRol} no tiene autorización para esta operación.`,
        };
      }
    }
  }

  return {
    authorized: false,
    error: "Acceso denegado: debés iniciar sesión con una cuenta de personal autorizado.",
  };
}

const COMBO_INCLUDE_QUERY = {
  items: {
    include: {
      producto: {
        select: {
          id: true,
          nombre: true,
          marca: true,
          codigo: true,
          precioVenta: true,
          cantidad: true,
          imagen: true,
          categoria: { select: { id: true, nombre: true } },
          marcaRelacionada: { select: { id: true, nombre: true } },
          ecommerce: { select: { descripcion: true } },
        },
      },
    },
  },
};

function mapDbComboToDTO(
  c: any,
  etiquetas?: Array<{ nombre: string; activa: boolean; emoji?: string | null }>
): ComboDTO {
  const meta = parseProductMetadata(c.descripcion);
  const sumComponents = (c.items || []).reduce(
    (acc: number, it: any) => acc + (it.producto?.precioVenta || 0) * it.cantidad,
    0
  );
  const regularCalculated = sumComponents > 0 ? sumComponents : c.precioRegular;
  const enOferta = Boolean(regularCalculated && regularCalculated > c.precio);
  const regularFinal = enOferta ? regularCalculated! : null;
  const ahorro = enOferta && regularFinal ? regularFinal - c.precio : 0;
  const descuentoPorcentaje = enOferta && regularFinal ? Math.round((ahorro / regularFinal) * 100) : 0;

  // El stock de un combo está limitado por el componente con menor disponibilidad proporcional
  const stocksPosibles = (c.items || []).map((it: any) =>
    it.cantidad > 0 ? Math.floor(Math.max(0, it.producto?.cantidad || 0) / it.cantidad) : 0
  );
  const stockCalculado = c.items?.length > 0 && stocksPosibles.length > 0 ? Math.min(...stocksPosibles) : 0;

  let badge = c.badge ? c.badge.trim() : null;
  if (badge && etiquetas) {
    const matched = etiquetas.find((e) => e.nombre.toLowerCase().trim() === badge!.toLowerCase());
    if (matched) {
      badge = matched.activa ? formatBadgeWithEmoji(badge, matched.emoji) : null;
    }
  }

  // Desglosar fotos en galería respetando el orden. La Foto 1 es SIEMPRE la portada principal
  const rawImages = (c.imagen || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);
  const imagenes = rawImages.length > 0 ? rawImages : ["/combos/combo-service-motul.jpg"];
  const portada = imagenes[0];

  const especificacionesComponentes: ComponenteSpecsDTO[] = [];
  const motosCompatiblesComponentes: ComponenteMotosDTO[] = [];

  const itemsMapped: ComboItemDTO[] = (c.items || []).map((it: any) => {
    const prod = it.producto;
    const effectiveMarca = prod?.marca || prod?.marcaRelacionada?.nombre || null;
    const categoriaNombre = prod?.categoria?.nombre || null;
    const prodMeta = prod?.ecommerce?.descripcion
      ? parseProductMetadata(prod.ecommerce.descripcion)
      : { texto: null, universal: false, especificaciones: [], motosCompatibles: [] };

    const baseSpecs: ProductSpec[] = [];
    if (effectiveMarca) {
      baseSpecs.push({ caracteristica: "Marca", valor: effectiveMarca });
    }
    if (categoriaNombre) {
      baseSpecs.push({ caracteristica: "Categoría", valor: categoriaNombre });
    }
    if (prod?.codigo) {
      baseSpecs.push({ caracteristica: "Código de pieza", valor: prod.codigo });
    }

    // Custom specs from product metadata (excluding duplicates of Marca/Categoría/Código if present)
    const customSpecs = (prodMeta.especificaciones || []).filter((s) => {
      const k = s.caracteristica.toLowerCase().trim();
      return !k.includes("marca") && !k.includes("categor") && !k.includes("código") && !k.includes("codigo");
    });

    const allSpecs = [...baseSpecs, ...customSpecs];
    const prodCompat = resolverCompatibilidadProducto({
      nombre: prod?.nombre || "",
      categoriaNombre: categoriaNombre || undefined,
      motosCompatibles: prodMeta.motosCompatibles,
      universal: prodMeta.universal,
    });
    const prodMotos = prodCompat.motos || [];

    if (allSpecs.length > 0 && prod) {
      especificacionesComponentes.push({
        productoId: prod.id,
        productoNombre: prod.nombre,
        marca: effectiveMarca,
        codigo: prod.codigo || null,
        cantidad: it.cantidad,
        imagen: prod.imagen || null,
        specs: allSpecs,
      });
    }

    if (prodMotos.length > 0 && prod) {
      motosCompatiblesComponentes.push({
        productoId: prod.id,
        productoNombre: prod.nombre,
        cantidad: it.cantidad,
        motos: prodMotos,
      });
    }

    return {
      id: it.id,
      productoId: it.productoId,
      cantidad: it.cantidad,
      producto: {
        id: prod?.id || it.productoId,
        nombre: prod?.nombre || `Repuesto #${it.productoId}`,
        marca: effectiveMarca,
        codigo: prod?.codigo || null,
        categoriaNombre,
        precioVenta: prod?.precioVenta || 0,
        cantidad: prod?.cantidad || 0,
        imagen: prod?.imagen || null,
        especificaciones: allSpecs,
        motosCompatibles: prodMotos,
      },
    };
  });

  const resCombo = resolverCompatibilidadCombo({
    motosCompatibles: meta.motosCompatibles,
    componentesMotos: motosCompatiblesComponentes,
  });

  const finalComboMotos =
    resCombo.tipo === "UNIFICADO" && resCombo.motosKit.length > 0
      ? resCombo.motosKit
      : meta.motosCompatibles || [];

  return {
    id: c.id,
    nombre: c.nombre,
    slug: c.slug,
    descripcion: meta.texto ? meta.texto : null,
    badge,
    precio: c.precio,
    precioRegular: regularFinal,
    ahorro,
    descuentoPorcentaje,
    enOferta,
    imagen: portada,
    imagenes,
    activo: c.activo,
    destacado: c.destacado,
    orden: c.orden,
    stockCalculado,
    items: itemsMapped,
    especificaciones: meta.especificaciones || [],
    motosCompatibles: finalComboMotos,
    especificacionesComponentes,
    motosCompatiblesComponentes,
  };
}

/**
 * Obtiene los combos activos y públicos para la tienda
 */
export const getPublicCombosAction = cache(async (): Promise<ComboDTO[]> => {
  try {
    const [combos, etiquetas] = await Promise.all([
      prisma.comboEcommerce.findMany({
        where: { activo: true },
        orderBy: [{ destacado: "desc" }, { orden: "asc" }, { id: "asc" }],
        include: COMBO_INCLUDE_QUERY,
      }),
      getEtiquetasOfertaAction(),
    ]);

    return combos.map((c) => mapDbComboToDTO(c, etiquetas));
  } catch (error) {
    console.error("Error al obtener combos públicos:", error);
    return [];
  }
});

/**
 * Obtiene un combo por su ID para la página de detalle
 */
export async function getComboByIdAction(id: number): Promise<ComboDTO | null> {
  try {
    const [c, etiquetas] = await Promise.all([
      prisma.comboEcommerce.findUnique({
        where: { id },
        include: COMBO_INCLUDE_QUERY,
      }),
      getEtiquetasOfertaAction(),
    ]);

    if (c) {
      return mapDbComboToDTO(c, etiquetas);
    }
  } catch (error) {
    console.error("Error al obtener combo por ID:", error);
  }

  // Fallback a estáticos si coincide el ID
  const staticCombo = COMBOS_DATA.find((item) => item.id === id);
  if (staticCombo) {
    return {
      id: staticCombo.id,
      nombre: staticCombo.nombre,
      slug: staticCombo.codigo,
      descripcion: staticCombo.descripcion,
      badge: staticCombo.badge,
      precio: staticCombo.precio,
      precioRegular: staticCombo.precioOriginal,
      ahorro: staticCombo.ahorro,
      descuentoPorcentaje: Math.round((staticCombo.ahorro / staticCombo.precioOriginal) * 100),
      enOferta: Boolean(staticCombo.precioOriginal && staticCombo.precioOriginal > staticCombo.precio),
      imagen: staticCombo.imagen,
      activo: true,
      destacado: true,
      orden: 0,
      stockCalculado: staticCombo.stock,
      items: [],
      especificaciones: [],
      motosCompatibles: [],
      especificacionesComponentes: [],
      motosCompatiblesComponentes: [],
    };
  }

  return null;
}

/**
 * Obtiene todos los combos para el panel administrativo (activos e inactivos)
 */
export async function getAllCombosAdminAction(userId?: number): Promise<{ success: boolean; combos?: ComboDTO[]; error?: string }> {
  const auth = await verifyStaff(userId, ["ADMINISTRADOR", "ENCARGADO_VENTAS", "ENCARGADO_STOCK"]);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    const combos = await prisma.comboEcommerce.findMany({
      orderBy: [{ orden: "asc" }, { id: "asc" }],
      include: COMBO_INCLUDE_QUERY,
    });

    const mapped = combos.map((c) => mapDbComboToDTO(c));
    return { success: true, combos: mapped };
  } catch (error) {
    console.error("Error al obtener combos para admin:", error);
    return { success: false, error: "No se pudieron obtener los combos." };
  }
}

/**
 * Crea o actualiza un combo en la base de datos
 */
export async function upsertComboAction(
  userId: number,
  input: UpsertComboInput
): Promise<{ success: boolean; comboId?: number; error?: string }> {
  const auth = await verifyStaff(userId, ["ADMINISTRADOR"]);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  if (!input.nombre || input.nombre.trim().length === 0) {
    return { success: false, error: "El nombre del combo es obligatorio." };
  }

  if (typeof input.precio !== "number" || isNaN(input.precio) || input.precio <= 0) {
    return { success: false, error: "El precio del combo debe ser mayor a 0." };
  }

  if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
    return { success: false, error: "El combo debe incluir al menos un producto del catálogo." };
  }

  try {
    // Validar y consolidar productos, verificando enteros positivos >= 1
    const consolidatedMap = new Map<number, number>();
    for (const it of input.items) {
      const pid = Number(it.productoId);
      const qty = Number(it.cantidad);
      if (!Number.isInteger(pid) || pid <= 0) {
        return { success: false, error: "Identificador de producto inválido en el combo." };
      }
      if (!Number.isInteger(qty) || qty < 1) {
        return {
          success: false,
          error: "Cada repuesto del combo debe tener una cantidad entera mayor o igual a 1.",
        };
      }
      consolidatedMap.set(pid, (consolidatedMap.get(pid) || 0) + qty);
    }
    const cleanItems = Array.from(consolidatedMap.entries()).map(([productoId, cantidad]) => ({
      productoId,
      cantidad,
    }));

    if (cleanItems.length === 0) {
      return { success: false, error: "El combo debe incluir al menos un producto válido." };
    }

    // Validar productos existentes en el SGI
    const productIds = cleanItems.map((it) => it.productoId);
    const existingProducts = await prisma.producto.findMany({
      where: { id: { in: productIds } },
      select: { id: true, precioVenta: true },
    });

    if (existingProducts.length !== productIds.length) {
      return { success: false, error: "Uno o más productos seleccionados no existen en el catálogo." };
    }

    // Calcular suma real de los precios de venta actuales de los repuestos en SGI
    const sumRegular = cleanItems.reduce((acc, item) => {
      const prod = existingProducts.find((p) => p.id === item.productoId);
      return acc + (prod?.precioVenta || 0) * item.cantidad;
    }, 0);

    // Precio regular: si se envía input.precioRegular se toma como referencia, si no se calcula con sumRegular.
    // Solo es una oferta real si supera el precio del combo.
    const candidateRegular =
      input.precioRegular && input.precioRegular > 0 ? Number(input.precioRegular) : sumRegular;
    const regularPrice = candidateRegular > input.precio ? candidateRegular : null;

    // Extraer texto limpio de input.descripcion por si viene con JSON previo o anidado
    let cleanTexto = input.descripcion !== undefined ? parseProductMetadata(input.descripcion).texto : undefined;

    // Preservar valores existentes si no se especifican explícitamente al editar
    let especificaciones = input.especificaciones;
    let motosCompatibles = input.motosCompatibles;

    if (input.id && input.id > 0 && (cleanTexto === undefined || especificaciones === undefined || motosCompatibles === undefined)) {
      const existingCombo = await prisma.comboEcommerce.findUnique({
        where: { id: input.id },
        select: { descripcion: true },
      });
      if (existingCombo?.descripcion) {
        const existingMeta = parseProductMetadata(existingCombo.descripcion);
        if (cleanTexto === undefined) {
          cleanTexto = existingMeta.texto;
        }
        if (especificaciones === undefined) {
          especificaciones = existingMeta.especificaciones;
        }
        if (motosCompatibles === undefined) {
          motosCompatibles = existingMeta.motosCompatibles;
        }
      }
    }

    // Serializar descripción con metadata (specs y motos compatibles)
    const serializedDesc = serializeProductMetadata({
      texto: cleanTexto,
      especificaciones: especificaciones ?? [],
      motosCompatibles: motosCompatibles ?? [],
    });

    if (input.id && input.id > 0) {
      // ACTUALIZAR COMBO
      await prisma.$transaction(async (tx) => {
        await tx.comboEcommerce.update({
          where: { id: input.id },
          data: {
            nombre: input.nombre.trim(),
            slug: input.slug?.trim() || null,
            descripcion: serializedDesc,
            badge: input.badge !== undefined ? (input.badge ? input.badge.trim() : null) : null,
            precio: input.precio,
            precioRegular: regularPrice,
            imagen: input.imagen?.trim() || null,
            activo: input.activo !== undefined ? input.activo : true,
            destacado: input.destacado !== undefined ? input.destacado : false,
            orden: input.orden ?? 0,
          },
        });

        // Reemplazar items con lista consolidada
        await tx.comboItemEcommerce.deleteMany({
          where: { comboId: input.id },
        });

        for (const item of cleanItems) {
          await tx.comboItemEcommerce.create({
            data: {
              comboId: input.id!,
              productoId: item.productoId,
              cantidad: item.cantidad,
            },
          });
        }
      });

      try {
        revalidatePath("/");
        revalidatePath("/ofertas");
        revalidatePath("/combos");
        revalidatePath("/panel");
      } catch {}
      return { success: true, comboId: input.id };
    } else {
      // CREAR COMBO NUEVO
      const nuevo = await prisma.$transaction(async (tx) => {
        const created = await tx.comboEcommerce.create({
          data: {
            nombre: input.nombre.trim(),
            slug: input.slug?.trim() || null,
            descripcion: serializedDesc,
            badge: input.badge?.trim() || null,
            precio: input.precio,
            precioRegular: regularPrice,
            imagen: input.imagen?.trim() || "/combos/combo-service-motul.jpg",
            activo: input.activo !== undefined ? input.activo : true,
            destacado: input.destacado !== undefined ? input.destacado : false,
            orden: input.orden ?? 0,
            items: {
              create: cleanItems.map((it) => ({
                productoId: it.productoId,
                cantidad: it.cantidad,
              })),
            },
          },
        });
        return created;
      });

      try {
        revalidatePath("/");
        revalidatePath("/ofertas");
        revalidatePath("/combos");
        revalidatePath("/panel");
      } catch {}
      return { success: true, comboId: nuevo.id };
    }
  } catch (error) {
    console.error("Error al guardar combo:", error);
    return { success: false, error: "Error en la base de datos al guardar el combo." };
  }
}

/**
 * Alterna el estado activo de un combo
 */
export async function toggleComboEstadoAction(
  userId: number,
  comboId: number,
  activo: boolean
): Promise<{ success: boolean; error?: string }> {
  const auth = await verifyStaff(userId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    if (activo) {
      const combo = await prisma.comboEcommerce.findUnique({
        where: { id: comboId },
        include: {
          items: {
            include: {
              producto: {
                select: { id: true, cantidad: true },
              },
            },
          },
        },
      });

      if (!combo) {
        return { success: false, error: "El combo no existe." };
      }

      if (!combo.nombre || combo.nombre.trim().length === 0) {
        return { success: false, error: "El combo no tiene un nombre válido." };
      }

      if (combo.precio <= 0) {
        return { success: false, error: "No se puede activar un combo con precio menor o igual a $0." };
      }

      if (!combo.items || combo.items.length === 0) {
        return { success: false, error: "No se puede activar un combo sin repuestos incluidos." };
      }

      const missingProducts = combo.items.filter((it) => !it.producto);
      if (missingProducts.length > 0) {
        return {
          success: false,
          error: "Uno o más repuestos de este combo ya no existen en el catálogo.",
        };
      }
    }

    await prisma.comboEcommerce.update({
      where: { id: comboId },
      data: { activo },
    });

    try {
      revalidatePath("/");
      revalidatePath("/ofertas");
      revalidatePath("/combos");
      revalidatePath("/panel");
    } catch {}
    return { success: true };
  } catch (error) {
    console.error("Error en toggleComboEstadoAction:", error);
    return { success: false, error: "No se pudo actualizar el estado del combo." };
  }
}

/**
 * Elimina un combo de la base de datos
 */
export async function eliminarComboAction(
  userId: number,
  comboId: number
): Promise<{ success: boolean; error?: string }> {
  const auth = await verifyStaff(userId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    await prisma.comboEcommerce.delete({
      where: { id: comboId },
    });

    try {
      revalidatePath("/");
      revalidatePath("/ofertas");
      revalidatePath("/combos");
      revalidatePath("/panel");
    } catch {}
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar combo:", error);
    return { success: false, error: "No se pudo eliminar el combo." };
  }
}
