"use server";

import { cache } from "react";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { COMBOS_DATA } from "@/data/combos";
import { requireStaffSession } from "@/lib/session";
import {
  ProductSpec,
  parseProductMetadata,
  serializeProductMetadata,
} from "@/lib/productMetadata";

export interface CommercialProductItem {
  id: number;
  nombre: string;
  tituloComercial?: string | null;
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
  descripcion?: string | null;
  universal?: boolean;
  especificaciones?: ProductSpec[];
  motosCompatibles?: string[];
  ordenOferta: number;
  actualizadoEn?: Date | null;
}

export interface ValidatedCartItem {
  id: number;
  cartItemId?: string;
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
 * Valida en el servidor que la sesión activa tenga permisos de administración comercial
 */
async function verifyCommercialStaff(
  userId?: number,
  allowedRoles: Array<"ADMINISTRADOR" | "ENCARGADO_VENTAS" | "ENCARGADO_STOCK"> = [
    "ADMINISTRADOR",
    "ENCARGADO_VENTAS",
    "ENCARGADO_STOCK",
  ]
): Promise<{ authorized: boolean; error?: string }> {
  const auth = await requireStaffSession(allowedRoles);
  if (auth.authorized) return { authorized: true };

  if (userId) {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { rol: true },
    });
    if (user && user.activo && user.rol && allowedRoles.includes(user.rol.nombre as any)) {
      return { authorized: true };
    }
  }

  return {
    authorized: false,
    error:
      auth.error ||
      "No tenés permisos para modificar la configuración comercial del e-commerce.",
  };
}

/**
 * Obtiene la lista completa de productos para la gestión comercial del panel
 */
export async function getCommercialProductsAction(params?: {
  query?: string;
  categoriaId?: number;
  filtro?: "TODOS" | "OFERTAS" | "NO_PUBLICADOS" | "DESTACADOS" | "RECOMENDADOS";
  userId?: number;
}): Promise<{ success: boolean; products: CommercialProductItem[]; error?: string }> {
  let authorized = false;
  let errorMsg: string | undefined;

  const auth = await requireStaffSession(["ADMINISTRADOR", "ENCARGADO_VENTAS", "ENCARGADO_STOCK"]);
  if (auth.authorized) {
    authorized = true;
  } else if (params?.userId) {
    const user = await prisma.usuario.findUnique({
      where: { id: params.userId },
      include: { rol: true },
    });
    if (
      user &&
      user.activo &&
      user.rol &&
      ["ADMINISTRADOR", "ENCARGADO_VENTAS", "ENCARGADO_STOCK"].includes(user.rol.nombre)
    ) {
      authorized = true;
    }
  }

  if (!authorized) {
    return {
      success: false,
      products: [],
      error: auth.error || errorMsg || "Acceso denegado: solo personal autorizado puede consultar el catálogo administrativo.",
    };
  }

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

      const meta = parseProductMetadata(ecom?.descripcion);

      return {
        id: p.id,
        nombre: p.nombre,
        tituloComercial: meta.tituloComercial || null,
        codigo: p.codigo,
        marca: p.marca || p.marcaRelacionada?.nombre || "Genérico",
        categoriaId: p.categoriaId,
        categoriaNombre: p.categoria.nombre,
        precioVenta: p.precioVenta,
        precioCompra: auth.rol === "ADMINISTRADOR" ? p.precioCompra : 0,
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
        descripcion: meta.texto || null,
        universal: meta.universal || false,
        especificaciones: meta.especificaciones,
        motosCompatibles: meta.motosCompatibles,
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
    tituloComercial?: string | null;
    publicadoOnline?: boolean;
    enOferta?: boolean;
    precioOferta?: number | null;
    destacado?: boolean;
    recomendado?: boolean;
    badgePromo?: string | null;
    descripcion?: string | null;
    universal?: boolean;
    especificaciones?: ProductSpec[];
    motosCompatibles?: string[];
    ordenOferta?: number;
    imagenes?: string[];
    precioVenta?: number;
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

    // Actualizar imagen o precioVenta en producto si fueron provistos
    let currentProduct = productBase;
    if (
      (data.imagenes !== undefined && Array.isArray(data.imagenes)) ||
      (data.precioVenta !== undefined && data.precioVenta > 0)
    ) {
      const updateData: any = {};
      if (data.imagenes !== undefined && Array.isArray(data.imagenes)) {
        updateData.imagen = data.imagenes.filter(Boolean).join(",") || null;
      }
      if (data.precioVenta !== undefined && data.precioVenta > 0) {
        updateData.precioVenta = data.precioVenta;
      }
      currentProduct = await prisma.producto.update({
        where: { id: productoId },
        data: updateData,
        include: {
          categoria: { select: { id: true, nombre: true } },
          marcaRelacionada: { select: { id: true, nombre: true } },
        },
      });
    }

    // Determinar descripción y metadatos estructurados
    let finalDescripcion: string | null | undefined = undefined;
    if (
      data.tituloComercial !== undefined ||
      data.descripcion !== undefined ||
      data.universal !== undefined ||
      data.especificaciones !== undefined ||
      data.motosCompatibles !== undefined
    ) {
      const existingEcom = await prisma.productoEcommerce.findUnique({
        where: { productoId },
        select: { descripcion: true },
      });
      const currentMeta = parseProductMetadata(existingEcom?.descripcion);
      const newTitulo =
        data.tituloComercial !== undefined
          ? (data.tituloComercial ? data.tituloComercial.trim() : null)
          : currentMeta.tituloComercial;
      const newTexto = data.descripcion !== undefined ? (data.descripcion || "") : currentMeta.texto;
      const newUniversal =
        data.universal !== undefined ? Boolean(data.universal) : currentMeta.universal;
      const newSpecs = data.especificaciones !== undefined ? data.especificaciones : currentMeta.especificaciones;
      const newMotos = data.motosCompatibles !== undefined ? data.motosCompatibles : currentMeta.motosCompatibles;

      finalDescripcion = serializeProductMetadata({
        tituloComercial: newTitulo,
        texto: newTexto,
        universal: newUniversal,
        especificaciones: newSpecs,
        motosCompatibles: newMotos,
      });
    }

    // Upsert exclusivamente en productos_ecommerce (cero impacto en precioVenta o cantidad física de SGI si no se envió explícito)
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
        descripcion: finalDescripcion !== undefined ? finalDescripcion : null,
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
        ...(finalDescripcion !== undefined && {
          descripcion: finalDescripcion,
        }),
        ...(data.ordenOferta !== undefined && { ordenOferta: data.ordenOferta }),
      },
    });

    let descuentoPorcentaje = 0;
    if (updatedEcom.enOferta && updatedEcom.precioOferta && currentProduct.precioVenta > 0) {
      descuentoPorcentaje = Math.max(
        0,
        Math.round(((currentProduct.precioVenta - updatedEcom.precioOferta) / currentProduct.precioVenta) * 100)
      );
    }

    try {
      revalidatePath("/panel");
      revalidatePath(`/producto/${productoId}`);
      revalidatePath("/ofertas");
      revalidatePath("/");
    } catch {}

    const metaResult = parseProductMetadata(updatedEcom.descripcion);

    const result: CommercialProductItem = {
      id: currentProduct.id,
      nombre: currentProduct.nombre,
      tituloComercial: metaResult.tituloComercial || null,
      codigo: currentProduct.codigo,
      marca: currentProduct.marca || currentProduct.marcaRelacionada?.nombre || "Genérico",
      categoriaId: currentProduct.categoriaId,
      categoriaNombre: currentProduct.categoria.nombre,
      precioVenta: currentProduct.precioVenta,
      precioCompra: currentProduct.precioCompra,
      cantidad: currentProduct.cantidad,
      imagen: currentProduct.imagen,
      activo: currentProduct.activo,
      publicadoOnline: updatedEcom.publicadoOnline,
      enOferta: updatedEcom.enOferta,
      precioOferta: updatedEcom.precioOferta,
      descuentoPorcentaje,
      destacado: updatedEcom.destacado,
      recomendado: updatedEcom.recomendado,
      badgePromo: updatedEcom.badgePromo,
      descripcion: metaResult.texto || null,
      universal: metaResult.universal || false,
      especificaciones: metaResult.especificaciones,
      motosCompatibles: metaResult.motosCompatibles,
      ordenOferta: updatedEcom.ordenOferta,
      actualizadoEn: updatedEcom.actualizadoEn,
    };

    return { success: true, product: result };
  } catch (error) {
    console.error("Error en upsertCommercialProductAction:", error);
    return { success: false, error: "Ocurrió un error al guardar la configuración comercial." };
  }
}

// ══════════════════ CATEGORÍAS & MARCAS ADMIN ══════════════════

export interface MarcaAdminItem {
  id: number;
  nombre: string;
  activo: boolean;
  imagen?: string | null;
  productCount: number;
}

export async function getCategoriasAdminAction(): Promise<{
  success: boolean;
  categorias: { id: number; nombre: string; productCount: number }[];
  error?: string;
}> {
  try {
    const cats = await prisma.categoria.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      include: {
        _count: {
          select: { productos: { where: { activo: true } } },
        },
      },
    });
    return {
      success: true,
      categorias: cats.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        productCount: c._count.productos,
      })),
    };
  } catch (e) {
    console.error("Error al obtener categorias admin:", e);
    return { success: false, categorias: [], error: "No se pudieron obtener las categorías." };
  }
}

export async function crearCategoriaAction(
  userId: number,
  nombre: string
): Promise<{ success: boolean; categoria?: { id: number; nombre: string; productCount: number }; error?: string }> {
  const auth = await verifyCommercialStaff(userId);
  if (!auth.authorized) return { success: false, error: auth.error };

  const clean = nombre.trim();
  if (!clean) return { success: false, error: "El nombre de la categoría es obligatorio." };

  try {
    const existing = await prisma.categoria.findFirst({
      where: { nombre: { equals: clean, mode: "insensitive" } },
    });
    if (existing) {
      return { success: false, error: "Ya existe una categoría con ese nombre." };
    }
    const cat = await prisma.categoria.create({
      data: { nombre: clean, activo: true },
    });
    return { success: true, categoria: { id: cat.id, nombre: cat.nombre, productCount: 0 } };
  } catch (e) {
    console.error("Error al crear categoría:", e);
    return { success: false, error: "No se pudo crear la categoría." };
  }
}

export async function getMarcasAdminAction(): Promise<{
  success: boolean;
  marcas: MarcaAdminItem[];
  error?: string;
}> {
  try {
    const marcas = await prisma.marca.findMany({
      orderBy: { nombre: "asc" },
      include: {
        _count: {
          select: { productos: { where: { activo: true } } },
        },
      },
    });

    return {
      success: true,
      marcas: marcas.map((m) => ({
        id: m.id,
        nombre: m.nombre,
        activo: m.activo,
        imagen: m.imagen,
        productCount: m._count.productos,
      })),
    };
  } catch (e) {
    console.error("Error al obtener marcas:", e);
    return { success: false, marcas: [], error: "No se pudieron obtener las marcas." };
  }
}

export const getMarcasPublicasAction = cache(
  async (): Promise<{
    success: boolean;
    marcas: Array<{ id: number; nombre: string; imagen: string | null }>;
  }> => {
    try {
      const marcas = await prisma.marca.findMany({
        where: { activo: true },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true, imagen: true },
      });
      return { success: true, marcas };
    } catch (e) {
      console.error("Error al obtener marcas públicas:", e);
      return { success: false, marcas: [] };
    }
  }
);

export async function crearMarcaAction(
  userId: number,
  nombre: string,
  imagen?: string | null
): Promise<{ success: boolean; marca?: MarcaAdminItem; error?: string }> {
  const auth = await verifyCommercialStaff(userId);
  if (!auth.authorized) return { success: false, error: auth.error };

  const clean = nombre.trim();
  if (!clean) return { success: false, error: "El nombre de la marca es obligatorio." };

  try {
    const existing = await prisma.marca.findFirst({
      where: { nombre: { equals: clean, mode: "insensitive" } },
    });
    if (existing) {
      return { success: false, error: "Ya existe una marca con ese nombre." };
    }
    const marca = await prisma.marca.create({
      data: { nombre: clean, activo: true, imagen: imagen || null },
    });
    return {
      success: true,
      marca: { id: marca.id, nombre: marca.nombre, activo: marca.activo, imagen: marca.imagen, productCount: 0 },
    };
  } catch (e) {
    console.error("Error al crear marca:", e);
    return { success: false, error: "No se pudo crear la marca." };
  }
}

export async function actualizarLogoMarcaAction(
  userId: number,
  marcaId: number,
  imagen: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await verifyCommercialStaff(userId);
  if (!auth.authorized) return { success: false, error: auth.error };

  try {
    await prisma.marca.update({
      where: { id: marcaId },
      data: { imagen },
    });
    try {
      revalidatePath("/panel");
      revalidatePath("/");
      revalidatePath("/ofertas");
    } catch {}
    return { success: true };
  } catch (e) {
    console.error("Error al actualizar logo de marca:", e);
    return { success: false, error: "No se pudo actualizar el logo de la marca." };
  }
}

export async function editarMarcaCompletaAction(
  userId: number,
  marcaId: number,
  nuevoNombre: string,
  nuevaImagen?: string | null
): Promise<{ success: boolean; error?: string }> {
  const auth = await verifyCommercialStaff(userId);
  if (!auth.authorized) return { success: false, error: auth.error };

  const clean = nuevoNombre.trim();
  if (!clean) return { success: false, error: "El nombre de la marca no puede estar vacío." };

  try {
    const existing = await prisma.marca.findFirst({
      where: {
        id: { not: marcaId },
        nombre: { equals: clean, mode: "insensitive" },
      },
    });
    if (existing) {
      return { success: false, error: "Ya existe otra marca con ese nombre." };
    }

    const updateData: { nombre: string; imagen?: string | null } = { nombre: clean };
    if (nuevaImagen !== undefined) {
      updateData.imagen = nuevaImagen;
    }

    await prisma.marca.update({
      where: { id: marcaId },
      data: updateData,
    });

    try {
      revalidatePath("/panel");
      revalidatePath("/");
      revalidatePath("/ofertas");
    } catch {}

    return { success: true };
  } catch (e) {
    console.error("Error al editar marca:", e);
    return { success: false, error: "No se pudo actualizar la marca." };
  }
}

export async function toggleMarcaAction(
  userId: number,
  id: number,
  activo: boolean
): Promise<{ success: boolean; error?: string }> {
  const auth = await verifyCommercialStaff(userId);
  if (!auth.authorized) return { success: false, error: auth.error };

  try {
    await prisma.marca.update({
      where: { id },
      data: { activo },
    });
    return { success: true };
  } catch (e) {
    console.error("Error al actualizar marca:", e);
    return { success: false, error: "No se pudo actualizar el estado de la marca." };
  }
}

export async function toggleMultiplesMarcasAction(
  userId: number,
  ids: number[],
  activo: boolean
): Promise<{ success: boolean; error?: string }> {
  const auth = await verifyCommercialStaff(userId);
  if (!auth.authorized) return { success: false, error: auth.error };

  if (!ids || ids.length === 0) {
    return { success: false, error: "No seleccionaste ninguna marca." };
  }

  try {
    await prisma.marca.updateMany({
      where: { id: { in: ids } },
      data: { activo },
    });
    return { success: true };
  } catch (e) {
    console.error("Error al actualizar marcas en lote:", e);
    return { success: false, error: "No se pudieron actualizar las marcas seleccionadas." };
  }
}

/**
 * Valida precios y disponibilidad de stock en el servidor para evitar fraudes en el checkout.
 * Diferencia estrictamente entre productos individuales y combos para evitar colisiones y sustituciones erróneas.
 */
export async function validarPreciosServerAction(
  items: { id: number; cantidad: number; esCombo?: boolean; cartItemId?: string }[]
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
      const isExplicitCombo = item.esCombo === true || (typeof item.cartItemId === "string" && item.cartItemId.startsWith("combo-"));
      const isExplicitProduct = item.esCombo === false || (typeof item.cartItemId === "string" && item.cartItemId.startsWith("prod-"));

      // 1. Si es explícitamente un combo: validar ÚNICAMENTE contra combos (nunca contra Producto)
      if (isExplicitCombo) {
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
          const comboStock = dbCombo.items.length > 0 && stocksPosibles.length > 0 ? Math.min(...stocksPosibles) : 0;

          if (comboStock <= 0) {
            warnings.push(`El combo "${dbCombo.nombre}" no tiene stock disponible en este momento y no se pudo incluir en tu pedido.`);
            continue;
          }

          const cant = Math.min(Math.max(1, Math.floor(item.cantidad || 1)), comboStock);
          if (cant < item.cantidad) {
            warnings.push(`Se ajustó la cantidad del combo "${dbCombo.nombre}" a ${cant} por disponibilidad de stock.`);
          }

          const tieneOferta = Boolean(dbCombo.precioRegular && dbCombo.precioRegular > dbCombo.precio);
          const regular = tieneOferta ? dbCombo.precioRegular! : dbCombo.precio;
          const sub = dbCombo.precio * cant;
          subtotalGeneral += sub;

          validated.push({
            id: dbCombo.id,
            cartItemId: item.cartItemId || `combo-${dbCombo.id}`,
            nombre: dbCombo.nombre,
            marca: "Combo Chopper",
            precioRegular: regular,
            precioFinal: dbCombo.precio,
            enOferta: tieneOferta,
            ahorroUnitario: tieneOferta ? Math.max(0, regular - dbCombo.precio) : 0,
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
            cartItemId: item.cartItemId || `combo-${combo.id}`,
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

        warnings.push(`El combo ID #${item.id} ya no está disponible en la tienda.`);
        continue;
      }

      // 2. Si es explícitamente un producto, o si es ambiguo/legado: validar PRIMERO contra Producto
      const p = await prisma.producto.findUnique({
        where: { id: item.id },
        include: {
          ecommerce: true,
          marcaRelacionada: true,
        },
      });

      if (p && p.activo) {
        const ecom = p.ecommerce;
        const publicado = ecom ? ecom.publicadoOnline : true;

        if (!publicado) {
          warnings.push(`"${p.nombre}" ha sido pausado para la venta online.`);
          continue;
        }

        if (p.cantidad <= 0) {
          warnings.push(`"${p.nombre}" se quedó sin stock físico.`);
          continue;
        }

        const cantidadFinal = Math.min(item.cantidad, p.cantidad);
        if (cantidadFinal < item.cantidad) {
          warnings.push(`Stock limitado para "${p.nombre}": solo hay ${p.cantidad} unidad(es) disponible(s).`);
        }

        const enOfertaActiva = Boolean(ecom?.enOferta && ecom.precioOferta && ecom.precioOferta > 0);
        const precioFinal = enOfertaActiva ? (ecom!.precioOferta as number) : p.precioVenta;
        const ahorroUnitario = enOfertaActiva ? Math.max(0, p.precioVenta - precioFinal) : 0;
        const subtotalItem = precioFinal * cantidadFinal;
        subtotalGeneral += subtotalItem;

        validated.push({
          id: p.id,
          cartItemId: item.cartItemId || `prod-${p.id}`,
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
        continue;
      }

      // 3. Fallback para carritos antiguos donde esCombo no estaba definido (y no se encontró como producto)
      if (!isExplicitProduct) {
        const dbComboLegacy = await prisma.comboEcommerce.findUnique({
          where: { id: item.id },
          include: {
            items: {
              include: { producto: true },
            },
          },
        });

        if (dbComboLegacy && dbComboLegacy.activo) {
          const stocksPosibles = dbComboLegacy.items.map((it) =>
            it.cantidad > 0 ? Math.floor((it.producto?.cantidad || 0) / it.cantidad) : 0
          );
          const comboStock = dbComboLegacy.items.length > 0 && stocksPosibles.length > 0 ? Math.min(...stocksPosibles) : 0;

          if (comboStock > 0) {
            const cant = Math.min(Math.max(1, Math.floor(item.cantidad || 1)), comboStock);
            const tieneOferta = Boolean(dbComboLegacy.precioRegular && dbComboLegacy.precioRegular > dbComboLegacy.precio);
            const regular = tieneOferta ? dbComboLegacy.precioRegular! : dbComboLegacy.precio;
            const sub = dbComboLegacy.precio * cant;
            subtotalGeneral += sub;

            validated.push({
              id: dbComboLegacy.id,
              cartItemId: item.cartItemId || `combo-${dbComboLegacy.id}`,
              nombre: dbComboLegacy.nombre,
              marca: "Combo Chopper",
              precioRegular: regular,
              precioFinal: dbComboLegacy.precio,
              enOferta: tieneOferta,
              ahorroUnitario: tieneOferta ? Math.max(0, regular - dbComboLegacy.precio) : 0,
              cantidad: cant,
              stockDisponible: comboStock,
              subtotal: sub,
              imagen: dbComboLegacy.imagen || "/combos/combo-service-motul.jpg",
              esCombo: true,
            });
            continue;
          }
        }
      }

      warnings.push(`El artículo ID #${item.id} ya no está disponible en la tienda.`);
    }

    // 3. Verificación de consumo acumulado de stock entre combos y productos individuales
    const demandaTotal = new Map<number, { requerido: number; nombre: string }>();

    for (const v of validated) {
      if (v.esCombo) {
        const cDb = await prisma.comboEcommerce.findUnique({
          where: { id: v.id },
          include: { items: { include: { producto: true } } },
        });
        if (cDb?.items) {
          for (const ci of cDb.items) {
            const req = ci.cantidad * v.cantidad;
            const cur = demandaTotal.get(ci.productoId) || { requerido: 0, nombre: ci.producto?.nombre || `Producto #${ci.productoId}` };
            cur.requerido += req;
            demandaTotal.set(ci.productoId, cur);
          }
        }
      } else {
        const cur = demandaTotal.get(v.id) || { requerido: 0, nombre: v.nombre };
        cur.requerido += v.cantidad;
        demandaTotal.set(v.id, cur);
      }
    }

    for (const [prodId, dem] of demandaTotal.entries()) {
      const prodDb = await prisma.producto.findUnique({
        where: { id: prodId },
        select: { id: true, nombre: true, cantidad: true },
      });
      if (prodDb && prodDb.cantidad < dem.requerido) {
        warnings.push(
          `Stock limitado para "${dem.nombre}": se requieren ${dem.requerido} u. en total (entre repuestos y combos), pero solo hay ${prodDb.cantidad} u. disponibles en el local.`
        );

        // Ajustar la disponibilidad reportada y corregir cantidades para evitar sobreventa
        for (const v of validated) {
          if (!v.esCombo && v.id === prodId) {
            v.stockDisponible = Math.min(v.stockDisponible, prodDb.cantidad);
            if (v.cantidad > prodDb.cantidad) {
              v.cantidad = Math.max(0, prodDb.cantidad);
              v.subtotal = v.precioFinal * v.cantidad;
            }
          } else if (v.esCombo) {
            const cDb = await prisma.comboEcommerce.findUnique({
              where: { id: v.id },
              include: { items: true },
            });
            const comp = cDb?.items.find((it) => it.productoId === prodId);
            if (comp && comp.cantidad > 0) {
              const maxPosible = Math.floor(prodDb.cantidad / comp.cantidad);
              v.stockDisponible = Math.min(v.stockDisponible, maxPosible);
              if (v.cantidad > maxPosible) {
                v.cantidad = Math.max(0, maxPosible);
                v.subtotal = v.precioFinal * v.cantidad;
              }
            }
          }
        }
      }
    }

    // Recalcular subtotal con las cantidades validadas
    subtotalGeneral = validated.reduce((acc, it) => acc + it.subtotal, 0);

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

/**
 * Aplica oferta a múltiples productos en lote (descuento %, etiqueta promocional y publicación)
 */
export async function aplicarOfertaLoteAction(
  userId: number,
  productoIds: number[],
  descuentoPct: number,
  badgePromo: string
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const auth = await verifyCommercialStaff(userId);
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }
    if (!productoIds.length) {
      return { success: false, error: "No se seleccionaron productos." };
    }

    const productos = await prisma.producto.findMany({
      where: { id: { in: productoIds } },
      select: { id: true, precioVenta: true },
    });

    for (const prod of productos) {
      const precioOferta = Math.round(prod.precioVenta * (1 - Math.max(1, Math.min(90, descuentoPct)) / 100));
      await prisma.productoEcommerce.upsert({
        where: { productoId: prod.id },
        create: {
          productoId: prod.id,
          enOferta: true,
          precioOferta,
          badgePromo: badgePromo ? badgePromo.trim() : null,
          publicadoOnline: true,
        },
        update: {
          enOferta: true,
          precioOferta,
          badgePromo: badgePromo ? badgePromo.trim() : null,
          publicadoOnline: true,
        },
      });
    }

    try {
      revalidatePath("/panel");
      revalidatePath("/ofertas");
      revalidatePath("/");
    } catch {}

    return { success: true, count: productos.length };
  } catch (e) {
    console.error("Error al aplicar oferta en lote:", e);
    return { success: false, error: "Error al aplicar ofertas en lote." };
  }
}

/**
 * Quita la oferta a múltiples productos en lote
 */
export async function quitarOfertaLoteAction(
  userId: number,
  productoIds: number[]
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const auth = await verifyCommercialStaff(userId);
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }
    if (!productoIds.length) {
      return { success: false, error: "No se seleccionaron productos." };
    }

    await prisma.productoEcommerce.updateMany({
      where: { productoId: { in: productoIds } },
      data: {
        enOferta: false,
        precioOferta: null,
        badgePromo: null,
      },
    });

    try {
      revalidatePath("/panel");
      revalidatePath("/ofertas");
      revalidatePath("/");
    } catch {}

    return { success: true, count: productoIds.length };
  } catch (e) {
    console.error("Error al quitar oferta en lote:", e);
    return { success: false, error: "Error al quitar ofertas en lote." };
  }
}
