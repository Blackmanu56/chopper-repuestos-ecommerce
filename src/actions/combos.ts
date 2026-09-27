"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { COMBOS_DATA } from "@/data/combos";

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
  precioRegular: number;
  ahorro: number;
  descuentoPorcentaje: number;
  imagen: string | null;
  activo: boolean;
  destacado: boolean;
  orden: number;
  stockCalculado: number;
  items: ComboItemDTO[];
}

export interface UpsertComboInput {
  id?: number;
  nombre: string;
  slug?: string;
  descripcion?: string;
  badge?: string;
  precio: number;
  precioRegular?: number;
  imagen?: string;
  activo?: boolean;
  destacado?: boolean;
  orden?: number;
  items: Array<{
    productoId: number;
    cantidad: number;
  }>;
}

/**
 * Valida si un usuario tiene permisos de administración comercial
 */
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
    const isStaff = rolName === "ADMINISTRADOR" || rolName === "ENCARGADO_VENTAS" || rolName === "ENCARGADO_STOCK";

    if (!isStaff) {
      return { authorized: false, error: "No tenés permisos para administrar combos y kits." };
    }

    return { authorized: true };
  } catch (e) {
    console.error("Error verificando staff:", e);
    return { authorized: false, error: "Error de verificación de permisos." };
  }
}

/**
 * Obtiene los combos activos y públicos para la tienda
 */
export async function getPublicCombosAction(): Promise<ComboDTO[]> {
  try {
    const combos = await prisma.comboEcommerce.findMany({
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
    });

    return combos.map((c) => {
      const regularCalculado = c.items.reduce(
        (acc, it) => acc + (it.producto?.precioVenta || 0) * it.cantidad,
        0
      );
      const regularFinal = c.precioRegular && c.precioRegular > 0 ? c.precioRegular : regularCalculado;
      const ahorro = Math.max(0, regularFinal - c.precio);
      const descuentoPorcentaje = regularFinal > 0 ? Math.round((ahorro / regularFinal) * 100) : 0;

      // El stock de un combo está limitado por el componente con menor disponibilidad proporcional
      const stocksPosibles = c.items.map((it) =>
        it.cantidad > 0 ? Math.floor((it.producto?.cantidad || 0) / it.cantidad) : 0
      );
      const stockCalculado = stocksPosibles.length > 0 ? Math.min(...stocksPosibles) : 10;

      return {
        id: c.id,
        nombre: c.nombre,
        slug: c.slug,
        descripcion: c.descripcion,
        badge: c.badge || "Mes de la Primavera",
        precio: c.precio,
        precioRegular: regularFinal,
        ahorro,
        descuentoPorcentaje,
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
    const c = await prisma.comboEcommerce.findUnique({
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
    });

    if (c) {
      const regularCalculado = c.items.reduce(
        (acc, it) => acc + (it.producto?.precioVenta || 0) * it.cantidad,
        0
      );
      const regularFinal = c.precioRegular && c.precioRegular > 0 ? c.precioRegular : regularCalculado;
      const ahorro = Math.max(0, regularFinal - c.precio);
      const descuentoPorcentaje = regularFinal > 0 ? Math.round((ahorro / regularFinal) * 100) : 0;
      const stocksPosibles = c.items.map((it) =>
        it.cantidad > 0 ? Math.floor((it.producto?.cantidad || 0) / it.cantidad) : 0
      );
      const stockCalculado = stocksPosibles.length > 0 ? Math.min(...stocksPosibles) : 10;

      return {
        id: c.id,
        nombre: c.nombre,
        slug: c.slug,
        descripcion: c.descripcion,
        badge: c.badge || "Mes de la Primavera",
        precio: c.precio,
        precioRegular: regularFinal,
        ahorro,
        descuentoPorcentaje,
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
      imagen: staticCombo.imagen,
      activo: true,
      destacado: true,
      orden: 0,
      stockCalculado: staticCombo.stock,
      items: [],
    };
  }

  return null;
}

/**
 * Obtiene todos los combos para el panel administrativo (activos e inactivos)
 */
export async function getAllCombosAdminAction(userId: number): Promise<{ success: boolean; combos?: ComboDTO[]; error?: string }> {
  const auth = await verifyStaff(userId);
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
      const regularCalculado = c.items.reduce(
        (acc, it) => acc + (it.producto?.precioVenta || 0) * it.cantidad,
        0
      );
      const regularFinal = c.precioRegular && c.precioRegular > 0 ? c.precioRegular : regularCalculado;
      const ahorro = Math.max(0, regularFinal - c.precio);
      const descuentoPorcentaje = regularFinal > 0 ? Math.round((ahorro / regularFinal) * 100) : 0;

      const stocksPosibles = c.items.map((it) =>
        it.cantidad > 0 ? Math.floor((it.producto?.cantidad || 0) / it.cantidad) : 0
      );
      const stockCalculado = stocksPosibles.length > 0 ? Math.min(...stocksPosibles) : 0;

      return {
        id: c.id,
        nombre: c.nombre,
        slug: c.slug,
        descripcion: c.descripcion,
        badge: c.badge,
        precio: c.precio,
        precioRegular: regularFinal,
        ahorro,
        descuentoPorcentaje,
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
  const auth = await verifyStaff(userId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  if (!input.nombre || input.nombre.trim().length === 0) {
    return { success: false, error: "El nombre del combo es obligatorio." };
  }

  if (input.precio <= 0) {
    return { success: false, error: "El precio del combo debe ser mayor a 0." };
  }

  if (!input.items || input.items.length === 0) {
    return { success: false, error: "El combo debe incluir al menos un producto del catálogo." };
  }

  try {
    // Validar productos existentes en el SGI
    const productIds = input.items.map((it) => it.productoId);
    const existingProducts = await prisma.producto.findMany({
      where: { id: { in: productIds } },
      select: { id: true, precioVenta: true },
    });

    if (existingProducts.length !== productIds.length) {
      return { success: false, error: "Uno o más productos seleccionados no existen en el catálogo." };
    }

    // Calcular precio regular base si no fue suministrado
    let regularPrice = input.precioRegular;
    if (!regularPrice || regularPrice <= 0) {
      regularPrice = input.items.reduce((acc, it) => {
        const prod = existingProducts.find((p) => p.id === it.productoId);
        return acc + (prod ? prod.precioVenta * it.cantidad : 0);
      }, 0);
    }

    if (input.id && input.id > 0) {
      // ACTUALIZAR COMBO
      await prisma.$transaction(async (tx) => {
        await tx.comboEcommerce.update({
          where: { id: input.id },
          data: {
            nombre: input.nombre.trim(),
            slug: input.slug?.trim() || null,
            descripcion: input.descripcion?.trim() || null,
            badge: input.badge !== undefined ? (input.badge.trim() || null) : null,
            precio: input.precio,
            precioRegular: regularPrice,
            imagen: input.imagen?.trim() || null,
            activo: input.activo !== undefined ? input.activo : true,
            destacado: input.destacado !== undefined ? input.destacado : false,
            orden: input.orden ?? 0,
          },
        });

        // Reemplazar items
        await tx.comboItemEcommerce.deleteMany({
          where: { comboId: input.id },
        });

        for (const item of input.items) {
          await tx.comboItemEcommerce.create({
            data: {
              comboId: input.id!,
              productoId: item.productoId,
              cantidad: Math.max(1, item.cantidad),
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
            descripcion: input.descripcion?.trim() || null,
            badge: input.badge ? input.badge.trim() : "Mes de la Primavera",
            precio: input.precio,
            precioRegular: regularPrice,
            imagen: input.imagen?.trim() || "/combos/combo-service-motul.jpg",
            activo: input.activo !== undefined ? input.activo : true,
            destacado: input.destacado !== undefined ? input.destacado : false,
            orden: input.orden ?? 0,
            items: {
              create: input.items.map((it) => ({
                productoId: it.productoId,
                cantidad: Math.max(1, it.cantidad),
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
