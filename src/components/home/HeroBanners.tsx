"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  ArrowRight,
  Flame,
  Bike,
  ShieldCheck,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useConfig } from "@/context/ConfigContext";
import { BannerHome } from "@/actions/configuracion";

interface HeroBannersProps {
  initialBanners?: BannerHome[];
}

export default function HeroBanners({ initialBanners = [] }: HeroBannersProps) {
  const { config } = useConfig();
  const activeBanners = initialBanners.filter((b) => b.activo);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Auto-rotar banners si hay más de uno activo
  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % activeBanners.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [activeBanners.length]);

  const currentBanner = activeBanners.length > 0 ? activeBanners[currentIdx] : null;

  const quickCategories = [
    {
      title: "Lubricantes y Aceites",
      desc: "Motul, Castrol, mineral y semisintético 4T",
      pill: "Alta Rotación",
      marca: "MOTUL",
    },
    {
      title: "Frenos y Pastillas",
      desc: "Discos, zapatas, pastillas y fluidos DOT 4",
      pill: "Seguridad",
      marca: "BREMBO",
    },
    {
      title: "Neumáticos y Cubiertas",
      desc: "Pirelli, Rinaldi, cámaras y válvulas",
      pill: "Rodado Urbano",
      marca: "PIRELLI",
    },
  ];

  const waLink = `https://wa.me/${(config.whatsapp || "5493765243554").replace(/[^0-9]/g, "")}`;
  const addressText = config.direccion || "Av. Roque Sáenz Peña 1500 · Posadas, Misiones";
  const shopName = config.nombre_tienda || "Chopper Repuestos";

  return (
    <section className="mt-4 space-y-6">
      {/* 3 Mini banners superiores tipo Maximus */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {quickCategories.map((item, idx) => (
          <Link
            key={idx}
            href={`/ofertas?marca=${encodeURIComponent(item.marca)}`}
            className="group relative overflow-hidden rounded-2xl border border-line bg-card p-4 transition-all hover:border-brand/60 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-brand/10 border border-brand/30 px-2 py-0.5 text-[10px] font-bold text-brand uppercase tracking-wider">
                {item.pill}
              </span>
              <span className="text-xs text-slate-400 group-hover:text-brand transition-colors">
                Ver ofertas →
              </span>
            </div>
            <h3 className="mt-2 text-base font-extrabold text-white group-hover:text-brand transition-colors">
              {item.title}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* Banner Principal Hero Adaptativo (Modo Oscuro / Modo Claro) */}
      <div className="hero-banner-adaptive relative overflow-hidden rounded-2xl border border-slate-200 dark:border-line bg-gradient-to-r from-red-50/60 via-white to-slate-50 dark:from-[#17181d] dark:via-[#14151a] dark:to-[#101114] p-6 md:p-10 shadow-lg transition-colors">
        {currentBanner?.imagenUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-15 dark:opacity-25 pointer-events-none transition-all duration-500"
            style={{ backgroundImage: `url(${currentBanner.imagenUrl})` }}
          />
        )}
        <div className="relative z-10 grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 dark:bg-brand/15 px-3 py-1 text-xs font-semibold text-brand">
              <Flame size={14} className="fill-brand animate-pulse" />
              <span className="tracking-wide uppercase">
                {currentBanner?.badge || `${shopName} · POSADAS, MISIONES`}
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-5xl leading-tight">
              {currentBanner ? (
                currentBanner.titulo
              ) : (
                <>
                  Hacé tu pedido y{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 dark:from-red-500 dark:via-orange-500 dark:to-amber-500">
                    retiralo en el local
                  </span>
                </>
              )}
            </h1>

            <p className="max-w-2xl text-sm md:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {currentBanner?.descripcion || (
                <>
                  Buscá tu repuesto, armá el pedido online y pasá a retirarlo por nuestro local en{" "}
                  <strong className="text-brand">{addressText}</strong>, o pedí envío con{" "}
                  <strong className="text-emerald-600 dark:text-emerald-500">Motomandado / Moto Uber</strong>. Pagás en efectivo
                  o transferencia al recibir tu mercadería.
                </>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={currentBanner?.enlace || "/ofertas"}
                className="flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white hover:bg-brandhover shadow-lg shadow-brand/30 transition-all active:scale-95"
              >
                <span>Ver productos en oferta</span>
                <ArrowRight size={16} />
              </Link>

              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all active:scale-95"
              >
                <MessageCircle size={16} />
                <span>Contactar por WhatsApp</span>
              </a>
            </div>

            {/* Controles del carrusel si hay múltiples banners activos */}
            {activeBanners.length > 1 && (
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIdx((prev) => (prev - 1 + activeBanners.length) % activeBanners.length)
                  }
                  className="p-1 rounded-lg border border-slate-300 dark:border-line bg-white/70 dark:bg-card/70 text-slate-700 dark:text-slate-300 hover:text-brand transition-colors"
                  aria-label="Banner anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1.5 px-2">
                  {activeBanners.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentIdx(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === currentIdx
                          ? "w-6 bg-brand"
                          : "w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400"
                      }`}
                      aria-label={`Ir al banner ${i + 1}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentIdx((prev) => (prev + 1) % activeBanners.length)}
                  className="p-1 rounded-lg border border-slate-300 dark:border-line bg-white/70 dark:bg-card/70 text-slate-700 dark:text-slate-300 hover:text-brand transition-colors"
                  aria-label="Siguiente banner"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Tarjetas de Beneficios Laterales */}
          <div className="lg:col-span-4 grid gap-3">
            <div className="benefit-card rounded-xl border border-slate-200 dark:border-line/80 bg-white dark:bg-[#1e2029]/80 p-3.5 backdrop-blur flex items-start gap-3 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
                <CreditCard size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Pagás al recibir</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Efectivo o transferencia en mostrador o con el motomandado.
                </p>
              </div>
            </div>

            <div className="benefit-card rounded-xl border border-slate-200 dark:border-line/80 bg-white dark:bg-[#1e2029]/80 p-3.5 backdrop-blur flex items-start gap-3 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Bike size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Motomandado en Posadas</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Envíos rápidos por cadetería y Moto Uber en toda la ciudad.
                </p>
              </div>
            </div>

            <div className="benefit-card rounded-xl border border-slate-200 dark:border-line/80 bg-white dark:bg-[#1e2029]/80 p-3.5 backdrop-blur flex items-start gap-3 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">100% Repuestos Nuevos</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Garantía de fábrica en cajas selladas. Sin usados.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
