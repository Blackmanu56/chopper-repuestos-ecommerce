"use server";

import { prisma } from "@/lib/prisma";
import { COMBOS_DATA, COMBOS_CATEGORY_ID, COMBOS_CATEGORY_NAME } from "@/data/combos";

export interface ProductItem {
  id: number;
  nombre: string;
  marca: string;
  categoriaId: number;
  categoriaNombre: string;
  precio: number; // Precio final efectivo a cobrar
  stock: number;
  precioRegular?: number; // Precio base de lista original de SGI
  enOferta?: boolean;
  precioOferta?: number | null;
  descuentoPorcentaje?: number;
  badgePromo?: string | null;
  destacado?: boolean;
  recomendado?: boolean;
  publicadoOnline?: boolean;
  codigo?: string | null;
  imagen?: string | null;
}

export interface CategoryItem {
  id: number;
  nombre: string;
  count: number;
}

export async function getCategories(): Promise<CategoryItem[]> {
  try {
    const cats = await prisma.categoria.findMany({
      where: {
        activo: true,
        productos: {
          some: {
            activo: true,
            // Solo contar categorías si tienen productos publicados online
            OR: [
              { ecommerce: null },
              { ecommerce: { publicadoOnline: true } },
            ],
          },
        },
      },
      select: {
        id: true,
        nombre: true,
        _count: {
          select: {
            productos: {
              where: {
                activo: true,
                OR: [
                  { ecommerce: null },
                  { ecommerce: { publicadoOnline: true } },
                ],
              },
            },
          },
        },
      },
      orderBy: { nombre: "asc" },
    });

    return cats.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      count: c._count.productos,
    }));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function getProducts(params?: {
  query?: string;
  categoriaId?: number;
  categoriaNombre?: string;
  soloOfertas?: boolean;
  soloDestacados?: boolean;
}): Promise<ProductItem[]> {
  try {
    const where: any = {
      activo: true,
      // Excluir productos explícitamente pausados o despublicados
      OR: [
        { ecommerce: null },
        { ecommerce: { publicadoOnline: true } },
      ],
    };

    if (params?.categoriaId) {
      where.categoriaId = params.categoriaId;
    } else if (params?.categoriaNombre) {
      where.categoria = { nombre: { equals: params.categoriaNombre, mode: "insensitive" } };
    }

    if (params?.soloOfertas) {
      where.ecommerce = { enOferta: true, publicadoOnline: true };
    } else if (params?.soloDestacados) {
      where.ecommerce = { destacado: true, publicadoOnline: true };
    }

    if (params?.query && params.query.trim() !== "") {
      const q = params.query.trim();
      where.AND = [
        {
          OR: [
            { nombre: { contains: q, mode: "insensitive" } },
            { marca: { contains: q, mode: "insensitive" } },
            { codigo: { contains: q, mode: "insensitive" } },
            { categoria: { nombre: { contains: q, mode: "insensitive" } } },
          ],
        },
      ];
    }

    const products = await prisma.producto.findMany({
      where,
      include: {
        categoria: { select: { id: true, nombre: true } },
        marcaRelacionada: { select: { id: true, nombre: true } },
        ecommerce: true,
      },
      orderBy: { nombre: "asc" },
    });

    return products
      .filter((p) => {
        // Doble guarda: no mostrar si el administrador lo despublicó
        if (p.ecommerce && !p.ecommerce.publicadoOnline) return false;
        return true;
      })
      .map((p) => {
        const ecom = p.ecommerce;
        const enOferta = Boolean(ecom?.enOferta && ecom.precioOferta && ecom.precioOferta > 0);
        const precioOferta = enOferta ? Number(ecom!.precioOferta) : null;
        const precio = enOferta ? precioOferta! : p.precioVenta;
        const precioRegular = p.precioVenta;

        let descuentoPorcentaje = 0;
        if (enOferta && precioRegular > 0) {
          descuentoPorcentaje = Math.max(0, Math.round(((precioRegular - precio) / precioRegular) * 100));
        }

        return {
          id: p.id,
          nombre: p.nombre,
          marca: p.marca || p.marcaRelacionada?.nombre || "Genérico",
          categoriaId: p.categoriaId,
          categoriaNombre: p.categoria.nombre,
          precio,
          precioRegular,
          enOferta,
          precioOferta,
          descuentoPorcentaje,
          badgePromo: ecom?.badgePromo || null,
          destacado: Boolean(ecom?.destacado),
          recomendado: Boolean(ecom?.recomendado),
          publicadoOnline: ecom ? ecom.publicadoOnline : true,
          stock: p.cantidad,
          codigo: p.codigo,
          imagen: p.imagen,
        };
      });
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export async function getProductById(id: number): Promise<ProductItem | null> {
  // Soporte directo para combos armados de Chopper
  const combo = COMBOS_DATA.find((c) => c.id === id);
  if (combo) {
    return {
      id: combo.id,
      nombre: combo.nombre,
      marca: combo.marca,
      categoriaId: COMBOS_CATEGORY_ID,
      categoriaNombre: COMBOS_CATEGORY_NAME,
      precio: combo.precio,
      precioRegular: combo.precio,
      enOferta: true,
      precioOferta: combo.precio,
      descuentoPorcentaje: 15,
      badgePromo: "Combo Chopper",
      destacado: true,
      recomendado: true,
      stock: combo.stock,
      codigo: combo.codigo,
      imagen: combo.imagen,
    };
  }

  try {
    const p = await prisma.producto.findUnique({
      where: { id },
      include: {
        categoria: { select: { id: true, nombre: true } },
        marcaRelacionada: { select: { id: true, nombre: true } },
        ecommerce: true,
      },
    });

    if (!p || !p.activo) return null;
    // Si fue despublicado por el administrador, no se puede ver el detalle
    if (p.ecommerce && !p.ecommerce.publicadoOnline) return null;

    const ecom = p.ecommerce;
    const enOferta = Boolean(ecom?.enOferta && ecom.precioOferta && ecom.precioOferta > 0);
    const precioOferta = enOferta ? Number(ecom!.precioOferta) : null;
    const precio = enOferta ? precioOferta! : p.precioVenta;
    const precioRegular = p.precioVenta;

    let descuentoPorcentaje = 0;
    if (enOferta && precioRegular > 0) {
      descuentoPorcentaje = Math.max(0, Math.round(((precioRegular - precio) / precioRegular) * 100));
    }

    return {
      id: p.id,
      nombre: p.nombre,
      marca: p.marca || p.marcaRelacionada?.nombre || "Genérico",
      categoriaId: p.categoriaId,
      categoriaNombre: p.categoria.nombre,
      precio,
      precioRegular,
      enOferta,
      precioOferta,
      descuentoPorcentaje,
      badgePromo: ecom?.badgePromo || null,
      destacado: Boolean(ecom?.destacado),
      recomendado: Boolean(ecom?.recomendado),
      publicadoOnline: ecom ? ecom.publicadoOnline : true,
      stock: p.cantidad,
      codigo: p.codigo,
      imagen: p.imagen,
    };
  } catch (error) {
    console.error("Error fetching product by id:", error);
    return null;
  }
}
