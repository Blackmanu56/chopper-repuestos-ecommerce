import React from "react";
import { notFound } from "next/navigation";
import { getProductById, getProducts } from "@/actions/ecommerce";
import ProductDetailClient from "./ProductDetailClient";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const productId = Number(id);

  if (isNaN(productId)) {
    notFound();
  }

  const product = await getProductById(productId);

  if (!product) {
    notFound();
  }

  // Traer productos recomendados (de la misma categoría o catálogo general)
  const allProds = await getProducts({ categoriaId: product.categoriaId });
  const fallbackProds = allProds.length > 1 ? allProds : await getProducts({});
  const recommended = fallbackProds
    .filter((p) => p.id !== product.id)
    .slice(0, 5);

  return (
    <ProductDetailClient
      product={product}
      recommended={recommended}
    />
  );
}
