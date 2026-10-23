"use server";

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

export interface ComboItemDTO {
  id: number;
  productoId: number;
  cantidad: number;
  producto: {
    id: number;
    nombre: string;
    marca: string | null;
    precioVenta: number;
    cantidad: number;
    imagen: string | null;
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
  activo: boolean;
  destacado: boolean;
  orden: number;
  stockCalculado: number;
  items: ComboItemDTO[];
  especificaciones?: ProductSpec[];
  motosCompatibles?: string[];
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
  const auth = await requireStaffSession(allowedRoles);
  if (!auth.authorized) {
    return {
      authorized: false,
      error: auth.error || "No tenés permisos para administrar combos y kits.",
    };
  }
  return { authorized: true };
}

/**
 * Obtiene los combos activos y públicos para la tienda
 */
export async function getPublicCombosAction(): Promise<ComboDTO[]> {
  try {
    const [combos, etiquetas] = await Promise.all([
      prisma.comboEcommerce.findMany({
        where: { activo: true },
        orderBy: [{ orden: "asc" }, { id: "asc" }],
        include: {
          items: {
            include: {
              producto: {
                select: {
                  id: true,
                  nombre: true,
                  marca: true,
                  precioVenta: true,
                  cantidad: true,
                  imagen: true,
                },
              },
            },
          },
        },
      }),
      getEtiquetasOfertaAction(),
    ]);

    return combos.map((c) => {
      const meta = parseProductMetadata(c.descripcion);
      const enOferta = Boolean(c.precioRegular && c.precioRegular > c.precio);
      const regularFinal = enOferta ? c.precioRegular! : null;
      const ahorro = enOferta && regularFinal ? regularFinal - c.precio : 0;
      const descuentoPorcentaje = enOferta && regularFinal ? Math.round((ahorro / regularFinal) * 100) : 0;

      // El stock de un combo está limitado por el componente con menor disponibilidad proporcional
      const stocksPosibles = c.items.map((it) =>
        it.cantidad > 0 ? Math.floor((it.producto?.cantidad || 0) / it.cantidad) : 0
      );
      const stockCalculado = c.items.length > 0 && stocksPosibles.length > 0 ? Math.min(...stocksPosibles) : 0;

      let badge = c.badge ? c.badge.trim() : null;
      if (badge) {
        const matched = etiquetas.find((e) => e.nombre.toLowerCase().trim() === badge!.toLowerCase());
        if (matched) {
          badge = matched.activa ? formatBadgeWithEmoji(badge, matched.emoji) : null;
        }
      }

      return {
        id: c.id,
        nombre: c.nombre,
        slug: c.slug,
        descripcion: meta.texto || c.descripcion,
        badge,
        precio: c.precio,
        precioRegular: regularFinal,
        ahorro,
        descuentoPorcentaje,
        enOferta,
        imagen: c.imagen || "/combos/combo-service-motul.jpg",
        activo: c.activo,
        destacado: c.destacado,
        orden: c.orden,
        stockCalculado,
        items: c.items.map((it) => ({
          id: it.id,
          productoId: it.productoId,
          cantidad: it.cantidad,
          producto: {
            id: it.producto.id,
            nombre: it.producto.nombre,
            marca: it.producto.marca,
            precioVenta: it.producto.precioVenta,
            cantidad: it.producto.cantidad,
            imagen: it.producto.imagen,
          },
        })),
        especificaciones: meta.especificaciones,
        motosCompatibles: meta.motosCompatibles,
      };
    });
  } catch (error) {
    console.error("Error al obtener combos públicos:", error);
    return [];
  }
}

/**
 * Obtiene un combo por su ID para la página de detalle
 */
export async function getComboByIdAction(id: number): Promise<ComboDTO | null> {
  try {
    const [c, etiquetas] = await Promise.all([
      prisma.comboEcommerce.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              producto: {
                select: {
                  id: true,
                  nombre: true,
                  marca: true,
                  precioVenta: true,
                  cantidad: true,
                  imagen: true,
                },
              },
            },
          },
        },
      }),
      getEtiquetasOfertaAction(),
    ]);

    if (c) {
      const meta = parseProductMetadata(c.descripcion);
      const enOferta = Boolean(c.precioRegular && c.precioRegular > c.precio);
      const regularFinal = enOferta ? c.precioRegular! : null;
      const ahorro = enOferta && regularFinal ? regularFinal - c.precio : 0;
      const descuentoPorcentaje = enOferta && regularFinal ? Math.round((ahorro / regularFinal) * 100) : 0;

      const stocksPosibles = c.items.map((it) =>
        it.cantidad > 0 ? Math.floor((it.producto?.cantidad || 0) / it.cantidad) : 0
      );
      const stockCalculado = c.items.length > 0 && stocksPosibles.length > 0 ? Math.min(...stocksPosibles) : 0;

      let badge = c.badge ? c.badge.trim() : null;
      if (badge) {
        const matched = etiquetas.find((e) => e.nombre.toLowerCase().trim() === badge!.toLowerCase());
        if (matched) {
          badge = matched.activa ? formatBadgeWithEmoji(badge, matched.emoji) : null;
        }
      }

      return {
        id: c.id,
        nombre: c.nombre,
        slug: c.slug,
        descripcion: meta.texto || c.descripcion,
        badge,
        precio: c.precio,
        precioRegular: regularFinal,
        ahorro,
        descuentoPorcentaje,
        enOferta,
        imagen: c.imagen || "/combos/combo-service-motul.jpg",
        activo: c.activo,
        destacado: c.destacado,
        orden: c.orden,
        stockCalculado,
        items: c.items.map((it) => ({
          id: it.id,
          productoId: it.productoId,
          cantidad: it.cantidad,
          producto: {
            id: it.producto.id,
            nombre: it.producto.nombre,
            marca: it.producto.marca,
            precioVenta: it.producto.precioVenta,
            cantidad: it.producto.cantidad,
            imagen: it.producto.imagen,
          },
        })),
        especificaciones: meta.especificaciones,
        motosCompatibles: meta.motosCompatibles,
      };
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
      include: {
        items: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                marca: true,
                precioVenta: true,
                cantidad: true,
                imagen: true,
              },
            },
          },
        },
      },
    });

    const mapped = combos.map((c) => {
      const meta = parseProductMetadata(c.descripcion);
      const enOferta = Boolean(c.precioRegular && c.precioRegular > c.precio);
      const regularFinal = enOferta ? c.precioRegular! : null;
      const ahorro = enOferta && regularFinal ? regularFinal - c.precio : 0;
      const descuentoPorcentaje = enOferta && regularFinal ? Math.round((ahorro / regularFinal) * 100) : 0;

      const stocksPosibles = c.items.map((it) =>
        it.cantidad > 0 ? Math.floor((it.producto?.cantidad || 0) / it.cantidad) : 0
      );
      const stockCalculado = c.items.length > 0 && stocksPosibles.length > 0 ? Math.min(...stocksPosibles) : 0;

      return {
        id: c.id,
        nombre: c.nombre,
        slug: c.slug,
        descripcion: meta.texto || c.descripcion,
        badge: c.badge,
        precio: c.precio,
        precioRegular: regularFinal,
        ahorro,
        descuentoPorcentaje,
        enOferta,
        imagen: c.imagen,
        activo: c.activo,
        destacado: c.destacado,
        orden: c.orden,
        stockCalculado,
        items: c.items.map((it) => ({
          id: it.id,
          productoId: it.productoId,
          cantidad: it.cantidad,
          producto: {
            id: it.producto.id,
            nombre: it.producto.nombre,
            marca: it.producto.marca,
            precioVenta: it.producto.precioVenta,
            cantidad: it.producto.cantidad,
            imagen: it.producto.imagen,
          },
        })),
        especificaciones: meta.especificaciones,
        motosCompatibles: meta.motosCompatibles,
      };
    });

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

    // Precio regular opcional: únicamente si es mayor al precio de venta es una oferta real
    const regularPrice =
      input.precioRegular && input.precioRegular > input.precio
        ? Number(input.precioRegular)
        : null;

    // Preservar especificaciones y motos compatibles si no se especifican explícitamente al editar
    let especificaciones = input.especificaciones;
    let motosCompatibles = input.motosCompatibles;

    if (input.id && input.id > 0 && (especificaciones === undefined || motosCompatibles === undefined)) {
      const existingCombo = await prisma.comboEcommerce.findUnique({
        where: { id: input.id },
        select: { descripcion: true },
      });
      if (existingCombo?.descripcion) {
        const existingMeta = parseProductMetadata(existingCombo.descripcion);
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
      texto: input.descripcion,
      especificaciones,
      motosCompatibles,
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
