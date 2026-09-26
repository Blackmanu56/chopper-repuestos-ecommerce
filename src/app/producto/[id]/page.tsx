import React from "react";
import { notFound } from "next/navigation";
import { getProductById } from "@/actions/ecommerce";
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

  return <ProductDetailClient product={product} />;
}
