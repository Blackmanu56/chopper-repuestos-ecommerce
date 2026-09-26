"use client";

import React from "react";
import Link from "next/link";
import { ProductItem } from "@/actions/ecommerce";
import { useCart } from "@/context/CartContext";

export default function ProductCard({ product }: { product: ProductItem }) {
  const { addToCart } = useCart();
  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");

  return (
    <div className="flex flex-col rounded-xl border border-line bg-card p-3 hover:border-slate-600 transition-colors">
      <Link
        href={`/producto/${product.id}`}
        className="mb-2 flex h-28 items-center justify-center rounded-lg bg-surface text-slate-600 hover:text-brand transition-colors overflow-hidden relative group"
      >
        {product.imagen ? (
          <img
            src={product.imagen}
            alt={product.nombre}
            className="h-full w-full object-contain p-2 group-hover:scale-105 transition-transform"
          />
        ) : (
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
          >
            <circle cx="10" cy="6" r="2.6" />
            <path d="M6 12h5m3-2h4m-4 8h5M8 20l3-5m-5-1h3m0-4L8 7" />
          </svg>
        )}
      </Link>

      <div className="text-xs text-slate-500">
        {product.marca} · {product.categoriaNombre.toLowerCase()}
      </div>

      <Link
        href={`/producto/${product.id}`}
        className="mt-0.5 line-clamp-2 text-sm font-semibold hover:text-brand transition-colors min-h-[40px]"
        title={product.nombre}
      >
        {product.nombre}
      </Link>

      <div className="mt-1 text-base font-black text-brand">
        {formatPrice(product.precio)}
      </div>

      <div className="mt-1">
        {product.stock > 0 ? (
          <span className="text-xs text-green-400">Stock: {product.stock} u.</span>
        ) : (
          <span className="text-xs font-semibold text-red-400">Sin stock</span>
        )}
      </div>

      {product.stock > 0 ? (
        <button
          onClick={() => addToCart(product, 1)}
          className="mt-3 w-full rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:bg-brandhover transition-colors"
        >
          Agregar
        </button>
      ) : (
        <button
          disabled
          className="mt-3 w-full cursor-not-allowed rounded-lg border border-line py-2 text-sm font-semibold text-slate-600"
        >
          Agotado
        </button>
      )}
    </div>
  );
}
