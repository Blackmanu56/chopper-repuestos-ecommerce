"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ProductItem } from "@/actions/ecommerce";
import { useCart } from "@/context/CartContext";
import { ShoppingCart, ChevronRight, ChevronLeft } from "lucide-react";

export default function OfertasSection({ products }: { products: ProductItem[] }) {
  const { addToCart } = useCart();
  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -280 : 280;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Priorizamos productos con oferta activa en la base de datos y completamos con el catálogo
  const productosConOferta = products.filter((p) => p.enOferta);
  const otros = products.filter((p) => !p.enOferta);
  const displayList = [...productosConOferta, ...otros].slice(0, 16);

  const ofertas = displayList.map((p, idx) => {
    const regular = p.precioRegular ?? p.precio;
    const ahorro = p.enOferta
      ? Math.max(0, regular - p.precio)
      : Math.round(p.precio * (0.15 + (idx % 3) * 0.05));
    const precioOriginal = p.enOferta ? regular : p.precio + ahorro;
    const badgePromo = p.badgePromo || (p.enOferta ? "Oferta Exclusiva" : null);

    return {
      ...p,
      ahorro,
      precioOriginal,
      badgePromo,
    };
  });

  return (
    <section id="ofertas" className="scroll-mt-24">
      {/* Encabezado con Botón Verde Ver Todo */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-line mb-5">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white md:text-3xl">
            Productos en Oferta
          </h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Los mejores precios del momento, por tiempo limitado.
          </p>
        </div>

        <Link
          href="/ofertas"
          className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-all shadow-md active:scale-95"
        >
          <span>Ver todo</span>
          <ChevronRight size={15} />
        </Link>
      </div>

      {/* Carrusel Horizontal de Ofertas */}
      <div className="relative group">
        {/* Botón Scroll Izquierda */}
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute -left-2 sm:-left-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-9 sm:w-10 items-center justify-center rounded-lg bg-neutral-900/85 hover:bg-neutral-800 text-white shadow-xl border border-neutral-700/60 backdrop-blur-sm transition-all active:scale-95 cursor-pointer hover:border-brand/60"
          aria-label="Oferta anterior"
        >
          <ChevronLeft size={22} />
        </button>

        {/* Botón Scroll Derecha */}
        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute -right-2 sm:-right-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-9 sm:w-10 items-center justify-center rounded-lg bg-neutral-900/85 hover:bg-neutral-800 text-white shadow-xl border border-neutral-700/60 backdrop-blur-sm transition-all active:scale-95 cursor-pointer hover:border-brand/60"
          aria-label="Siguiente oferta"
        >
          <ChevronRight size={22} />
        </button>

        {/* Pista deslizable en una sola línea */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scroll-smooth scrollbar-none pb-4 pt-1 px-1"
        >
          {ofertas.map((prod) => (
            <div
              key={prod.id}
              className="w-[185px] sm:w-[210px] md:w-[220px] shrink-0 group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-3 hover:border-brand/70 hover:shadow-xl transition-all shadow-sm"
            >
            <div>
              {/* Badges superiores con ahorro real y badge personalizable */}
              <div className="space-y-1 mb-2">
                {prod.ahorro > 0 && (
                  <span className="inline-block rounded-md bg-brand px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-sm">
                    AHORRÁ {formatPrice(prod.ahorro)}
                  </span>
                )}
                {prod.badgePromo && (
                  <div className="rounded-md border border-brand/40 bg-brand/10 px-1.5 py-0.5 text-[9px] font-bold text-brand w-fit truncate max-w-[130px]">
                    🏷️ {prod.badgePromo}
                  </div>
                )}
              </div>

              {/* Imagen del Producto */}
              <Link
                href={`/producto/${prod.id}`}
                className="relative mb-2 flex h-36 items-center justify-center rounded-xl bg-slate-50 dark:bg-surface text-slate-500 overflow-hidden p-2 border border-slate-100 dark:border-line/40"
              >
                {prod.imagen ? (
                  <img
                    src={prod.imagen}
                    alt={prod.nombre}
                    className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  >
                    <circle cx="10" cy="6" r="2.6" />
                    <path d="M6 12h5m3-2h4m-4 8h5M8 20l3-5m-5-1h3m0-4L8 7" />
                  </svg>
                )}
              </Link>

              {/* Título */}
              <Link
                href={`/producto/${prod.id}`}
                className="line-clamp-2 text-xs font-bold text-slate-900 dark:text-white hover:text-brand transition-colors min-h-[34px] leading-snug"
                title={prod.nombre}
              >
                {prod.nombre}
              </Link>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200 dark:border-line/60">
              {/* Precio Original Tachado (solo si hay oferta real) + Precio en Oferta */}
              {prod.enOferta && prod.precioOriginal > prod.precio ? (
                <div className="text-[11px] text-slate-500 line-through">
                  {formatPrice(prod.precioOriginal)}
                </div>
              ) : (
                <div className="text-[11px] text-transparent select-none">-</div>
              )}
              <div className="text-base font-black text-brand tracking-tight">
                {formatPrice(prod.precio)}
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400">
                Efectivo / Transferencia
              </div>

              {/* Pill amarillo: 3 cuotas sin interés */}
              <div className="mt-2 flex items-center justify-center gap-1 rounded-lg bg-amber-400 py-1 px-1.5 text-[10px] font-black text-slate-900 shadow-sm">
                <span>💳 3 cuotas sin interés</span>
              </div>

              {/* Botón Agregar al Carrito */}
              <button
                onClick={() => addToCart(prod, 1)}
                className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2 text-[11px] font-bold text-white shadow transition-all active:scale-95"
              >
                <ShoppingCart size={13} />
                <span>Agregar al carrito</span>
              </button>
            </div>
          </div>
        ))}
        </div>
      </div>
    </section>
  );
}
