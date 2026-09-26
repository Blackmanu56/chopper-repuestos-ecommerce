"use server";

import { prisma } from "@/lib/prisma";

export interface ProductItem {
  id: number;
  nombre: string;
  marca: string;
  categoriaId: number;
  categoriaNombre: string;
  precio: number;
  stock: number;
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
          some: { activo: true },
        },
      },
      select: {
        id: true,
        nombre: true,
        _count: {
          select: {
            productos: {
              where: { activo: true },
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
}): Promise<ProductItem[]> {
  try {
    const where: any = { activo: true };

    if (params?.categoriaId) {
      where.categoriaId = params.categoriaId;
    }

    if (params?.query && params.query.trim() !== "") {
      const q = params.query.trim();
      where.OR = [
        { nombre: { contains: q, mode: "insensitive" } },
        { marca: { contains: q, mode: "insensitive" } },
        { codigo: { contains: q, mode: "insensitive" } },
        { categoria: { nombre: { contains: q, mode: "insensitive" } } },
      ];
    }

    const products = await prisma.producto.findMany({
      where,
      include: {
        categoria: { select: { id: true, nombre: true } },
        marcaRelacionada: { select: { id: true, nombre: true } },
      },
      orderBy: { nombre: "asc" },
    });

    return products.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      marca: p.marca || p.marcaRelacionada?.nombre || "Genérico",
      categoriaId: p.categoriaId,
      categoriaNombre: p.categoria.nombre,
      precio: p.precioVenta,
      stock: p.cantidad,
      codigo: p.codigo,
      imagen: p.imagen,
    }));
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export async function getProductById(id: number): Promise<ProductItem | null> {
  try {
    const p = await prisma.producto.findUnique({
      where: { id },
      include: {
        categoria: { select: { id: true, nombre: true } },
        marcaRelacionada: { select: { id: true, nombre: true } },
      },
    });

    if (!p || !p.activo) return null;

    return {
      id: p.id,
      nombre: p.nombre,
      marca: p.marca || p.marcaRelacionada?.nombre || "Genérico",
      categoriaId: p.categoriaId,
      categoriaNombre: p.categoria.nombre,
      precio: p.precioVenta,
      stock: p.cantidad,
      codigo: p.codigo,
      imagen: p.imagen,
    };
  } catch (error) {
    console.error("Error fetching product by id:", error);
    return null;
  }
}
