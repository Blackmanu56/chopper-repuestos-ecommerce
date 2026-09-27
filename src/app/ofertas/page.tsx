import React from "react";
import { getCategories, getProducts } from "@/actions/ecommerce";
import { getPublicCombosAction } from "@/actions/combos";
import OfertasClient from "./OfertasClient";

export const COMBOS_CATEGORY_ID = 9999;
export const COMBOS_CATEGORY_NAME = "Combos Armados";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    cat?: string;
    marca?: string;
    orden?: string;
  }>;
}

export default async function OfertasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q || "";
  const marca = params.marca || "";
  const cat = params.cat || "";

  const [categories, products, combosDb] = await Promise.all([
    getCategories(),
    getProducts({}),
    getPublicCombosAction(),
  ]);

  const combosAsProducts = combosDb.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    marca: "Combo Chopper",
    categoriaId: COMBOS_CATEGORY_ID,
    categoriaNombre: COMBOS_CATEGORY_NAME,
    precio: c.precio,
    stock: c.stockCalculado > 0 ? c.stockCalculado : 10,
    codigo: c.slug || `CMB-${c.id}`,
    imagen: c.imagen,
    precioRegular: c.precioRegular,
    enOferta: true,
    precioOferta: c.precio,
    descuentoPorcentaje: c.descuentoPorcentaje,
    badgePromo: c.badge || "Mes de la Primavera",
    destacado: c.destacado,
    recomendado: true,
    esCombo: true,
  }));

  const allProducts = [...combosAsProducts, ...products];
  const allCategories = [
    { id: COMBOS_CATEGORY_ID, nombre: COMBOS_CATEGORY_NAME, count: combosAsProducts.length },
    ...categories,
  ];

  return (
    <OfertasClient
      initialProducts={allProducts as any}
      categories={allCategories}
      initialQuery={q}
      initialMarca={marca}
      initialCatName={cat}
    />
  );
}
