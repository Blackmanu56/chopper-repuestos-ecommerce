"use client";

import React from "react";
import Link from "next/link";
import { ProductItem } from "@/actions/ecommerce";
import { useCart } from "@/context/CartContext";
import { ShoppingCart, MapPin } from "lucide-react";

export default function ProductCard({ product }: { product: ProductItem }) {
  const { addToCart } = useCart();
  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");
  const precioRegular = product.precioRegular ?? product.precio;
  const ahorro = product.enOferta ? Math.max(0, precioRegular - product.precio) : 0;

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-3.5 hover:border-brand/60 hover:shadow-xl transition-all shadow-sm">
      <div>
        {/* Badges Superiores */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <span className="rounded-md bg-slate-100 dark:bg-surface border border-slate-200 dark:border-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 group-hover:text-brand transition-colors truncate max-w-[100px]">
            {product.marca || "Original"}
          </span>

          {product.enOferta && ahorro > 0 ? (
            <span className="rounded-md bg-brand px-1.5 py-0.5 text-[9px] font-black uppercase text-white shadow-xs">
              {product.descuentoPorcentaje ? `${product.descuentoPorcentaje}% OFF` : "OFERTA"}
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[110px]">
              {product.categoriaNombre}
            </span>
          )}
        </div>

        {/* Badge Promocional Personalizado si existe */}
        {product.badgePromo && (
          <div className="mb-2 rounded-md border border-brand/40 bg-brand/10 px-1.5 py-0.5 text-[9px] font-bold text-brand w-fit truncate max-w-[150px]">
            🏷️ {product.badgePromo}
          </div>
        )}

        {/* Imagen del Producto */}
        <Link
          href={`/producto/${product.id}`}
          className="relative mb-3 flex h-36 items-center justify-center rounded-xl bg-slate-50 dark:bg-surface text-slate-500 hover:text-brand transition-colors overflow-hidden group/img border border-slate-100 dark:border-line/40"
        >
          {product.imagen ? (
            <img
              src={product.imagen}
              alt={product.nombre}
              className="h-full w-full object-contain p-2.5 transition-transform duration-300 group-hover/img:scale-108"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400">
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
              <span className="text-[10px] text-slate-500 mt-1">Sin foto</span>
            </div>
          )}
        </Link>

        {/* Título del Producto */}
        <Link
          href={`/producto/${product.id}`}
          className="line-clamp-2 text-sm font-bold text-slate-900 dark:text-white hover:text-brand transition-colors min-h-[40px] leading-snug"
          title={product.nombre}
        >
          {product.nombre}
        </Link>
      </div>

      <div>
        {/* Precio y Condiciones de Pago */}
        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-line/60">
          {product.enOferta && ahorro > 0 ? (
            <div className="text-[11px] text-slate-500 line-through">
              {formatPrice(precioRegular)}
            </div>
          ) : (
            <div className="text-[11px] text-transparent select-none">-</div>
          )}

          <div className="text-lg font-black text-brand tracking-tight">
            {formatPrice(product.precio)}
          </div>
          <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
            Efectivo / Transferencia
          </div>
        </div>

        {/* Tag de Retiro en Local */}
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">Retiro en Av. Roque Sáenz Peña 1500</span>
        </div>

        {/* Botón de Acción */}
        <div className="mt-3 pt-1">
          {product.stock > 0 ? (
            <button
              onClick={() => addToCart(product, 1)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 px-3 text-xs font-bold text-white hover:bg-brandhover shadow-md active:scale-95 transition-all"
            >
              <ShoppingCart size={15} />
              <span>Agregar al carrito</span>
            </button>
          ) : (
            <button
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-line py-2.5 px-3 text-xs font-bold text-slate-500 bg-surface/50"
            >
              Agotado
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
