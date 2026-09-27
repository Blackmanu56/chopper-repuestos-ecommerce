"use server";

import { prisma } from "@/lib/prisma";
import { COMBOS_DATA } from "@/data/combos";

export interface CommercialProductItem {
  id: number;
  nombre: string;
  codigo: string | null;
  marca: string;
  categoriaId: number;
  categoriaNombre: string;
  precioVenta: number; // Precio base de lista del SGI (READ-ONLY)
  precioCompra: number; // Costo del SGI (READ-ONLY)
  cantidad: number; // Stock físico del SGI (READ-ONLY)
  imagen: string | null;
  activo: boolean; // Estado operativo del SGI (READ-ONLY)

  // Metadatos comerciales de la tienda online:
  publicadoOnline: boolean;
  enOferta: boolean;
  precioOferta: number | null;
  descuentoPorcentaje: number;
  destacado: boolean;
  recomendado: boolean;
  badgePromo: string | null;
  ordenOferta: number;
  actualizadoEn?: Date | null;
}

export interface ValidatedCartItem {
  id: number;
  nombre: string;
  marca: string;
  precioRegular: number;
  precioFinal: number;
  enOferta: boolean;
  ahorroUnitario: number;
  cantidad: number;
  stockDisponible: number;
  subtotal: number;
  imagen?: string | null;
  esCombo?: boolean;
}

/**
 * Valida si un usuario tiene permisos de administración comercial
 */
async function verifyCommercialStaff(userId: number): Promise<{ authorized: boolean; error?: string }> {
  try {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { rol: true },
    });

    if (!user || !user.activo) {
      return { authorized: false, error: "Usuario inactivo o no encontrado." };
    }

    const rolName = (user.rol?.nombre || "").toUpperCase();
    const isStaff = rolName.includes("ADMIN") || rolName.includes("VENTAS");

    if (!isStaff) {
      return {
        authorized: false,
        error: "No tenés permisos para modificar la configuración comercial del e-commerce.",
      };
    }

    return { authorized: true };
  } catch (error) {
    console.error("Error verifying commercial staff:", error);
    return { authorized: false, error: "Error de verificación de permisos." };
  }
}

/**
 * Obtiene la lista completa de productos para la gestión comercial del panel
 */
export async function getCommercialProductsAction(params?: {
  query?: string;
  categoriaId?: number;
  filtro?: "TODOS" | "OFERTAS" | "NO_PUBLICADOS" | "DESTACADOS" | "RECOMENDADOS";
}): Promise<{ success: boolean; products: CommercialProductItem[]; error?: string }> {
  try {
    const where: any = { activo: true };

    if (params?.categoriaId && params.categoriaId > 0) {
      where.categoriaId = params.categoriaId;
    }

    if (params?.query && params.query.trim()) {
      const q = params.query.trim();
      where.OR = [
        { nombre: { contains: q, mode: "insensitive" } },
        { marca: { contains: q, mode: "insensitive" } },
        { codigo: { contains: q, mode: "insensitive" } },
      ];
    }

    const dbProducts = await prisma.producto.findMany({
      where,
      include: {
        categoria: { select: { id: true, nombre: true } },
        marcaRelacionada: { select: { id: true, nombre: true } },
        ecommerce: true,
      },
      orderBy: { nombre: "asc" },
    });

    const mapped: CommercialProductItem[] = dbProducts.map((p) => {
      const ecom = p.ecommerce;
      const publicadoOnline = ecom ? ecom.publicadoOnline : true;
      const enOferta = ecom ? ecom.enOferta : false;
      const precioOferta = ecom?.precioOferta ? Number(ecom.precioOferta) : null;
      const destacado = ecom ? ecom.destacado : false;
      const recomendado = ecom ? ecom.recomendado : false;
      const badgePromo = ecom?.badgePromo || null;
      const ordenOferta = ecom?.ordenOferta ?? 0;

      let descuentoPorcentaje = 0;
      if (enOferta && precioOferta && precioOferta > 0 && p.precioVenta > 0) {
        descuentoPorcentaje = Math.max(0, Math.round(((p.precioVenta - precioOferta) / p.precioVenta) * 100));
      }

      return {
        id: p.id,
        nombre: p.nombre,
        codigo: p.codigo,
        marca: p.marca || p.marcaRelacionada?.nombre || "Genérico",
        categoriaId: p.categoriaId,
        categoriaNombre: p.categoria.nombre,
        precioVenta: p.precioVenta,
        precioCompra: p.precioCompra,
        cantidad: p.cantidad,
        imagen: p.imagen,
        activo: p.activo,
        publicadoOnline,
        enOferta,
        precioOferta,
        descuentoPorcentaje,
        destacado,
        recomendado,
        badgePromo,
        ordenOferta,
        actualizadoEn: ecom?.actualizadoEn || null,
      };
    });

    // Filtros lógicos en memoria según solapa del panel
    let filtered = mapped;
    if (params?.filtro === "OFERTAS") {
      filtered = mapped.filter((p) => p.enOferta);
    } else if (params?.filtro === "NO_PUBLICADOS") {
      filtered = mapped.filter((p) => !p.publicadoOnline);
    } else if (params?.filtro === "DESTACADOS") {
      filtered = mapped.filter((p) => p.destacado);
    } else if (params?.filtro === "RECOMENDADOS") {
      filtered = mapped.filter((p) => p.recomendado);
    }

    return { success: true, products: filtered };
  } catch (error) {
    console.error("Error en getCommercialProductsAction:", error);
    return { success: false, products: [], error: "No se pudieron cargar los productos comerciales." };
  }
}

/**
 * Guarda o actualiza los atributos comerciales de un producto sin tocar SGI
 */
export async function upsertCommercialProductAction(
  userId: number,
  productoId: number,
  data: {
    publicadoOnline?: boolean;
    enOferta?: boolean;
    precioOferta?: number | null;
    destacado?: boolean;
    recomendado?: boolean;
    badgePromo?: string | null;
    ordenOferta?: number;
  }
): Promise<{ success: boolean; error?: string; product?: CommercialProductItem }> {
  try {
    const auth = await verifyCommercialStaff(userId);
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    // Verificar existencia del producto físico en SGI
    const productBase = await prisma.producto.findUnique({
      where: { id: productoId },
      include: {
        categoria: { select: { id: true, nombre: true } },
        marcaRelacionada: { select: { id: true, nombre: true } },
      },
    });

    if (!productBase) {
      return { success: false, error: "El producto seleccionado no existe en el catálogo." };
    }

    // Validar precio de oferta si está activo
    if (data.enOferta && data.precioOferta !== undefined && data.precioOferta !== null) {
      if (data.precioOferta <= 0) {
        return { success: false, error: "El precio de oferta debe ser mayor a cero." };
      }
      if (data.precioOferta >= productBase.precioVenta) {
        return {
          success: false,
          error: `El precio promocional ($${data.precioOferta}) debe ser menor al precio regular de lista ($${productBase.precioVenta}).`,
        };
      }
    }

    // Upsert exclusivamente en productos_ecommerce (cero impacto en precioVenta o cantidad física de SGI)
    const updatedEcom = await prisma.productoEcommerce.upsert({
      where: { productoId },
      create: {
        productoId,
        publicadoOnline: data.publicadoOnline ?? true,
        enOferta: data.enOferta ?? false,
        precioOferta: data.precioOferta !== undefined ? data.precioOferta : null,
        destacado: data.destacado ?? false,
        recomendado: data.recomendado ?? false,
        badgePromo: data.badgePromo !== undefined ? (data.badgePromo ? data.badgePromo.trim() : null) : null,
        ordenOferta: data.ordenOferta ?? 0,
      },
      update: {
        ...(data.publicadoOnline !== undefined && { publicadoOnline: data.publicadoOnline }),
        ...(data.enOferta !== undefined && { enOferta: data.enOferta }),
        ...(data.precioOferta !== undefined && { precioOferta: data.precioOferta }),
        ...(data.destacado !== undefined && { destacado: data.destacado }),
        ...(data.recomendado !== undefined && { recomendado: data.recomendado }),
        ...(data.badgePromo !== undefined && {
          badgePromo: data.badgePromo ? data.badgePromo.trim() : null,
        }),
        ...(data.ordenOferta !== undefined && { ordenOferta: data.ordenOferta }),
      },
    });

    let descuentoPorcentaje = 0;
    if (updatedEcom.enOferta && updatedEcom.precioOferta && productBase.precioVenta > 0) {
      descuentoPorcentaje = Math.max(
        0,
        Math.round(((productBase.precioVenta - updatedEcom.precioOferta) / productBase.precioVenta) * 100)
      );
    }

    const result: CommercialProductItem = {
      id: productBase.id,
      nombre: productBase.nombre,
      codigo: productBase.codigo,
      marca: productBase.marca || productBase.marcaRelacionada?.nombre || "Genérico",
      categoriaId: productBase.categoriaId,
      categoriaNombre: productBase.categoria.nombre,
      precioVenta: productBase.precioVenta,
      precioCompra: productBase.precioCompra,
      cantidad: productBase.cantidad,
      imagen: productBase.imagen,
      activo: productBase.activo,
      publicadoOnline: updatedEcom.publicadoOnline,
      enOferta: updatedEcom.enOferta,
      precioOferta: updatedEcom.precioOferta,
      descuentoPorcentaje,
      destacado: updatedEcom.destacado,
      recomendado: updatedEcom.recomendado,
      badgePromo: updatedEcom.badgePromo,
      ordenOferta: updatedEcom.ordenOferta,
      actualizadoEn: updatedEcom.actualizadoEn,
    };

    return { success: true, product: result };
  } catch (error) {
    console.error("Error en upsertCommercialProductAction:", error);
    return { success: false, error: "Ocurrió un error al guardar la configuración comercial." };
  }
}

/**
 * Valida precios y disponibilidad de stock en el servidor para evitar fraudes en el checkout
 */
export async function validarPreciosServerAction(
  items: { id: number; cantidad: number }[]
): Promise<{
  success: boolean;
  items: ValidatedCartItem[];
  subtotal: number;
  warnings: string[];
  error?: string;
}> {
  try {
    if (!items || items.length === 0) {
      return { success: false, items: [], subtotal: 0, warnings: [], error: "El carrito está vacío." };
    }

    const validated: ValidatedCartItem[] = [];
    const warnings: string[] = [];
    let subtotalGeneral = 0;

    for (const item of items) {
      // 1. Manejo dinámico de combos armados desde PostgreSQL
      const dbCombo = await prisma.comboEcommerce.findUnique({
        where: { id: item.id },
        include: {
          items: {
            include: { producto: true },
          },
        },
      });

      if (dbCombo && dbCombo.activo) {
        const stocksPosibles = dbCombo.items.map((it) =>
          it.cantidad > 0 ? Math.floor((it.producto?.cantidad || 0) / it.cantidad) : 0
        );
        const comboStock = stocksPosibles.length > 0 ? Math.min(...stocksPosibles) : 10;
        const cant = Math.max(1, Math.min(item.cantidad, Math.max(1, comboStock)));
        const regularCalculado = dbCombo.items.reduce(
          (acc, it) => acc + (it.producto?.precioVenta || 0) * it.cantidad,
          0
        );
        const regular = dbCombo.precioRegular && dbCombo.precioRegular > 0 ? dbCombo.precioRegular : regularCalculado;
        const sub = dbCombo.precio * cant;
        subtotalGeneral += sub;

        validated.push({
          id: dbCombo.id,
          nombre: dbCombo.nombre,
          marca: "Combo Chopper",
          precioRegular: regular,
          precioFinal: dbCombo.precio,
          enOferta: true,
          ahorroUnitario: Math.max(0, regular - dbCombo.precio),
          cantidad: cant,
          stockDisponible: comboStock,
          subtotal: sub,
          imagen: dbCombo.imagen || "/combos/combo-service-motul.jpg",
          esCombo: true,
        });
        continue;
      }

      // Fallback a combos estáticos si fuera necesario
      const combo = COMBOS_DATA.find((c) => c.id === item.id);
      if (combo) {
        const cant = Math.max(1, Math.min(item.cantidad, combo.stock));
        const sub = combo.precio * cant;
        subtotalGeneral += sub;

        validated.push({
          id: combo.id,
          nombre: combo.nombre,
          marca: combo.marca,
          precioRegular: combo.precioOriginal,
          precioFinal: combo.precio,
          enOferta: true,
          ahorroUnitario: combo.ahorro,
          cantidad: cant,
          stockDisponible: combo.stock,
          subtotal: sub,
          imagen: combo.imagen,
          esCombo: true,
        });
        continue;
      }

      // 2. Consulta en base de datos real PostgreSQL con configuración comercial
      const p = await prisma.producto.findUnique({
        where: { id: item.id },
        include: {
          ecommerce: true,
          marcaRelacionada: true,
        },
      });

      if (!p || !p.activo) {
        warnings.push(`El producto ID #${item.id} ya no está disponible en la tienda.`);
        continue;
      }

      const ecom = p.ecommerce;
      const publicado = ecom ? ecom.publicadoOnline : true;

      if (!publicado) {
        warnings.push(`"${p.nombre}" ha sido pausado para la venta online.`);
        continue;
      }

      // Verificar stock físico real en SGI
      if (p.cantidad <= 0) {
        warnings.push(`"${p.nombre}" se quedó sin stock físico.`);
        continue;
      }

      const cantidadFinal = Math.min(item.cantidad, p.cantidad);
      if (cantidadFinal < item.cantidad) {
        warnings.push(`Stock limitado para "${p.nombre}": solo hay ${p.cantidad} unidad(es) disponible(s).`);
      }

      // Precio inmutable calculado en el servidor
      const enOfertaActiva = Boolean(ecom?.enOferta && ecom.precioOferta && ecom.precioOferta > 0);
      const precioFinal = enOfertaActiva ? (ecom!.precioOferta as number) : p.precioVenta;
      const ahorroUnitario = enOfertaActiva ? Math.max(0, p.precioVenta - precioFinal) : 0;
      const subtotalItem = precioFinal * cantidadFinal;
      subtotalGeneral += subtotalItem;

      validated.push({
        id: p.id,
        nombre: p.nombre,
        marca: p.marca || p.marcaRelacionada?.nombre || "Genérico",
        precioRegular: p.precioVenta,
        precioFinal,
        enOferta: enOfertaActiva,
        ahorroUnitario,
        cantidad: cantidadFinal,
        stockDisponible: p.cantidad,
        subtotal: subtotalItem,
        imagen: p.imagen,
        esCombo: false,
      });
    }

    if (validated.length === 0) {
      return {
        success: false,
        items: [],
        subtotal: 0,
        warnings,
        error: "Ninguno de los repuestos solicitados se encuentra disponible actualmente.",
      };
    }

    return {
      success: true,
      items: validated,
      subtotal: subtotalGeneral,
      warnings,
    };
  } catch (error) {
    console.error("Error en validarPreciosServerAction:", error);
    return {
      success: false,
      items: [],
      subtotal: 0,
      warnings: [],
      error: "Error interno al verificar los precios de la orden.",
    };
  }
}
