"use client";

import React from "react";
import Link from "next/link";
import { ProductItem } from "@/actions/ecommerce";
import { useCart } from "@/context/CartContext";
import { useConfig } from "@/context/ConfigContext";
import { ShoppingCart, MapPin, Lock, AlertCircle, Check } from "lucide-react";

export default function ProductCard({ product }: { product: ProductItem }) {
  const { addToCart, isStaff, getItemCartQuantity, getRemainingStock } = useCart();
  const { config, shouldShowAhorroBadge, calcularCuotas } = useConfig();
  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");
  const precioRegular = product.precioRegular ?? product.precio;
  const ahorro = product.enOferta ? Math.max(0, precioRegular - product.precio) : 0;
  const financiacion = calcularCuotas(product.precio);

  const inCartQty = getItemCartQuantity(product.id, false);
  const remainingStock = getRemainingStock(product);
  const isLimitReached = product.stock > 0 && remainingStock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-3.5 hover:border-brand/60 hover:shadow-xl transition-all shadow-sm">
      <div>
        {/* Badges Superiores */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <span className="rounded-md bg-slate-100 dark:bg-surface border border-slate-200 dark:border-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 group-hover:text-brand transition-colors truncate max-w-[100px]">
            {product.marca || "Original"}
          </span>

          {product.enOferta && shouldShowAhorroBadge(ahorro) ? (
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
            {product.badgePromo}
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
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] text-slate-500 line-through">
                {formatPrice(precioRegular)}
              </span>
              {shouldShowAhorroBadge(ahorro) && (
                <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                  Ahorrás {formatPrice(ahorro)}
                </span>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-transparent select-none mb-1">-</div>
          )}

          <div className="text-lg font-black text-brand tracking-tight">
            {formatPrice(product.precio)}
          </div>
          <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
            Efectivo / Transferencia
          </div>
          {financiacion.habilitadas && (
            <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-1">
              {financiacion.sinInteres
                ? `${financiacion.cuotas} cuotas sin interés de ${formatPrice(financiacion.valorCuota)}`
                : `${financiacion.cuotas} cuotas fijas de ${formatPrice(financiacion.valorCuota)}`}
            </div>
          )}
        </div>

        {/* Tag de Retiro en Local y Disponibilidad de Stock */}
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">Retiro en {config.direccion || "Av. Roque Sáenz Peña 1500"}</span>
          </div>

          {product.stock <= 0 ? (
            <div className="flex items-center gap-1.5 text-[11px] text-red-600 dark:text-red-400 font-semibold">
              <AlertCircle size={12} className="shrink-0" />
              <span>Sin stock en el local</span>
            </div>
          ) : isLowStock ? (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-bold">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              <span>{product.stock === 1 ? "¡Última unidad disponible!" : `¡Últimas ${product.stock} unidades!`}</span>
            </div>
          ) : null}
        </div>

        {/* Botón de Acción */}
        <div className="mt-3 pt-1">
          {product.stock <= 0 ? (
            <button
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-slate-200 dark:border-line py-2.5 px-3 text-xs font-bold text-slate-400 dark:text-zinc-500 bg-slate-100 dark:bg-zinc-800/60"
            >
              Sin stock
            </button>
          ) : isStaff ? (
            <button
              type="button"
              onClick={() => addToCart(product, 1)}
              title="Estás utilizando una cuenta de personal. Para realizar compras, ingresá con una cuenta de cliente."
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-line bg-slate-100 dark:bg-surface py-2.5 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-amber-600 transition-colors"
            >
              <Lock size={13} className="text-slate-400" />
              <span>Solo consulta</span>
            </button>
          ) : isLimitReached ? (
            <button
              type="button"
              onClick={() => addToCart(product, 1)}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/30 py-2.5 px-3 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-xs"
              title="Ya tenés todas las unidades disponibles en tu carrito"
            >
              <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>En tu carrito (máx. {product.stock})</span>
            </button>
          ) : (
            <button
              onClick={() => addToCart(product, 1)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 px-3 text-xs font-bold text-white hover:bg-brandhover shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <ShoppingCart size={15} />
              <span>{inCartQty > 0 ? `Agregar otro (${inCartQty} en carrito)` : "Agregar al carrito"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
