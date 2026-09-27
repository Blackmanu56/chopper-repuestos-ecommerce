"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ProductItem } from "@/actions/ecommerce";
import { useCart } from "@/context/CartContext";
import { ArrowLeft, ShoppingCart } from "lucide-react";

export default function ProductDetailClient({ product }: { product: ProductItem }) {
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);
  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");

  const handleQty = (delta: number) => {
    setQty((prev) => Math.max(1, Math.min(prev + delta, product.stock)));
  };

  return (
    <div className="mt-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft size={16} /> Volver a la tienda
      </Link>

      <div className="grid gap-6 rounded-2xl border border-line bg-card p-6 md:grid-cols-2">
        {/* Foto o Icono */}
        <div className="flex h-72 items-center justify-center rounded-xl bg-surface text-slate-600 overflow-hidden p-4">
          {product.imagen ? (
            <img
              src={product.imagen}
              alt={product.nombre}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <svg
              width="80"
              height="80"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <circle cx="10" cy="6" r="2.6" />
              <path d="M6 12h5m3-2h4m-4 8h5M8 20l3-5m-5-1h3m0-4L8 7" />
            </svg>
          )}
        </div>

        {/* Info y Acciones */}
        <div className="flex flex-col justify-center">
          <div className="text-xs text-slate-500">
            {product.marca} · {product.categoriaNombre.toLowerCase()}
            {product.codigo && <span> · Código: {product.codigo}</span>}
          </div>

          <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
            {product.nombre}
          </h1>

          <div className="mt-3 text-3xl font-black text-brand">
            {formatPrice(product.precio)}
          </div>

          <div
            className={`mt-2 text-sm font-medium ${
              product.stock > 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {product.stock > 0
              ? "Disponible para retiro en el local"
              : "Producto sin stock"}
          </div>

          {product.stock > 0 ? (
            <div className="mt-5 flex items-center gap-3">
              {/* Selector de cantidad */}
              <div className="flex items-center rounded-lg border border-line bg-surface">
                <button
                  onClick={() => handleQty(-1)}
                  className="px-3 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-bold">{qty}</span>
                <button
                  onClick={() => handleQty(1)}
                  className="px-3 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  +
                </button>
              </div>

              {/* Botón agregar */}
              <button
                onClick={() => addToCart(product, qty)}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-brand py-2.5 px-4 text-sm font-semibold text-white hover:bg-brandhover transition-colors"
              >
                <ShoppingCart size={18} /> Agregar al carrito
              </button>
            </div>
          ) : (
            <div className="mt-5">
              <button
                disabled
                className="w-full cursor-not-allowed rounded-lg border border-line py-2.5 text-sm font-semibold text-slate-600"
              >
                Producto agotado
              </button>
            </div>
          )}

          {/* Información de retiro */}
          <div className="mt-6 border-t border-line pt-4 text-sm text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Retiro en el local (Av. Colón 1540, Córdoba)</p>
            <p className="text-xs">
              El pago se realiza en mostrador al momento de retirar (efectivo o transferencia).
              Sujeto a disponibilidad física en stock.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
