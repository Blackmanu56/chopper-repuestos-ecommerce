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

  // Traer hasta 5 productos recomendados (de la misma categoría o catálogo general)
  let recommended = await getProducts({
    categoriaId: product.categoriaId,
    excludeId: product.id,
    take: 5,
  });

  if (recommended.length === 0) {
    recommended = await getProducts({
      excludeId: product.id,
      take: 5,
    });
  }

  return (
    <ProductDetailClient
      product={product}
      recommended={recommended}
    />
  );
}
