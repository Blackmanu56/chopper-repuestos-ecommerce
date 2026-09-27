"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { ShoppingCart, ChevronRight, ChevronLeft, PackageCheck } from "lucide-react";
import { ComboDTO, getPublicCombosAction } from "@/actions/combos";
import { COMBOS_DATA } from "@/data/combos";

interface CombosSectionProps {
  initialCombos?: ComboDTO[];
}

export default function CombosSection({ initialCombos }: CombosSectionProps) {
  const { addToCart } = useCart();
  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");

  const [combos, setCombos] = useState<ComboDTO[]>(initialCombos || []);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -340 : 340;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (!initialCombos || initialCombos.length === 0) {
      setLoading(true);
      getPublicCombosAction()
        .then((data) => {
          if (data && data.length > 0) {
            setCombos(data);
          } else {
            // Fallback a los estáticos si la base de datos estuviera vacía
            const fallback: ComboDTO[] = COMBOS_DATA.map((c) => ({
              id: c.id,
              nombre: c.nombre,
              slug: c.codigo,
              descripcion: c.descripcion,
              badge: c.badge,
              precio: c.precio,
              precioRegular: c.precioOriginal,
              ahorro: c.ahorro,
              descuentoPorcentaje: Math.round((c.ahorro / c.precioOriginal) * 100),
              imagen: c.imagen,
              activo: true,
              destacado: true,
              orden: 0,
              stockCalculado: c.stock,
              items: [],
            }));
            setCombos(fallback);
          }
        })
        .catch((err) => console.error("Error cargando combos:", err))
        .finally(() => setLoading(false));
    }
  }, [initialCombos]);

  const handleAddCombo = (combo: ComboDTO) => {
    addToCart(
      {
        id: combo.id,
        nombre: combo.nombre,
        marca: "Combo Chopper",
        categoriaId: 99,
        categoriaNombre: "Combos Armados",
        precio: combo.precio,
        stock: combo.stockCalculado > 0 ? combo.stockCalculado : 10,
        imagen: combo.imagen,
        esCombo: true,
      } as any,
      1
    );
  };

  return (
    <section id="combos" className="scroll-mt-24">
      {/* Encabezado con Botón Verde Ver Todo */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-line mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white md:text-3xl">
              Combos Armados
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Kits listos para tu moto. El mejor precio combinando repuestos esenciales en Posadas.
          </p>
        </div>

        <Link
          href="/ofertas?cat=combos"
          className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-all shadow-md active:scale-95"
        >
          <span>Ver todo</span>
          <ChevronRight size={15} />
        </Link>
      </div>

      {/* Carrusel Horizontal de Combos (Línea única con scroll y botones de navegación) */}
      <div className="relative group">
        {/* Botón Scroll Izquierda */}
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute -left-2 sm:-left-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-9 sm:w-10 items-center justify-center rounded-lg bg-neutral-900/85 hover:bg-neutral-800 text-white shadow-xl border border-neutral-700/60 backdrop-blur-sm transition-all active:scale-95 cursor-pointer hover:border-brand/60"
          aria-label="Combo anterior"
        >
          <ChevronLeft size={22} />
        </button>

        {/* Botón Scroll Derecha */}
        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute -right-2 sm:-right-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-9 sm:w-10 items-center justify-center rounded-lg bg-neutral-900/85 hover:bg-neutral-800 text-white shadow-xl border border-neutral-700/60 backdrop-blur-sm transition-all active:scale-95 cursor-pointer hover:border-brand/60"
          aria-label="Siguiente combo"
        >
          <ChevronRight size={22} />
        </button>

        {/* Pista deslizable en una sola línea */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-smooth scrollbar-none pb-4 pt-1 px-1"
        >
          {combos.map((combo) => (
            <div
              key={combo.id}
              className="w-[280px] sm:w-[320px] md:w-[340px] shrink-0 group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-4 hover:border-brand/70 hover:shadow-xl transition-all shadow-sm"
            >
            <div>
              {/* Badges superiores */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="rounded-md bg-brand px-2 py-0.5 text-[10px] font-black uppercase text-white shadow-sm">
                  AHORRÁ {formatPrice(combo.ahorro)}
                </span>
                {combo.badge && (
                  <span className="rounded-md border border-brand/40 bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">
                    🏷️ {combo.badge}
                  </span>
                )}
              </div>

              {/* Imagen del Combo con enlace */}
              <Link
                href={`/combos/${combo.id}`}
                className="relative mb-3 flex h-48 w-full items-center justify-center rounded-xl bg-slate-50 dark:bg-surface overflow-hidden p-2 border border-slate-100 dark:border-line/40 block cursor-pointer"
              >
                <img
                  src={combo.imagen || "/combos/combo-service-motul.jpg"}
                  alt={combo.nombre}
                  className="h-full w-full object-contain rounded-lg group-hover:scale-105 transition-transform duration-300"
                />
              </Link>

              {/* Título y Descripción con enlace */}
              <Link
                href={`/combos/${combo.id}`}
                className="block cursor-pointer"
              >
                <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-brand transition-colors">
                  {combo.nombre}
                </h3>
              </Link>
              <p className="mt-1 text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                {combo.descripcion}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-line/60">
              {/* Precios: Tachado + Oferta */}
              <div className="text-xs text-slate-500 line-through">
                {formatPrice(combo.precioRegular)}
              </div>
              <div className="text-xl font-black text-brand tracking-tight">
                {formatPrice(combo.precio)}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                Efectivo / Transferencia en local
              </div>

              {/* Pill amarillo: 3 cuotas sin interés */}
              <div className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-amber-400 py-1 px-2 text-[11px] font-black text-slate-900 shadow-sm">
                <span>💳 3 cuotas sin interés</span>
              </div>

              {/* Botón Agregar al Carrito */}
              <button
                onClick={() => handleAddCombo(combo)}
                className="mt-2.5 w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 px-3 text-xs font-bold text-white shadow transition-all active:scale-95"
              >
                <ShoppingCart size={15} />
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
