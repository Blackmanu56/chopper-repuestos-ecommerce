"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Flame } from "lucide-react";

export default function MarcasCarrusel() {
  const marcas = [
    { name: "HONDA", logo: "/marcas/honda.svg", origen: "Japón", border: "border-red-500/30" },
    { name: "YAMAHA", logo: "/marcas/yamaha.svg", origen: "Japón", border: "border-blue-500/30" },
    { name: "MOTUL", logo: "/marcas/motul.svg", origen: "Francia", border: "border-red-500/40" },
    { name: "CASTROL", logo: "/marcas/castrol.svg", origen: "Reino Unido", border: "border-emerald-500/30" },
    { name: "PIRELLI", logo: "/marcas/pirelli.svg", origen: "Italia", border: "border-amber-500/30" },
    { name: "DID", logo: "/marcas/did.svg", origen: "Japón", border: "border-amber-400/40" },
    { name: "NGK", logo: "/marcas/ngk.svg", origen: "Japón", border: "border-red-500/30" },
    { name: "BOSCH", logo: "/marcas/bosch.svg", origen: "Alemania", border: "border-blue-500/30" },
    { name: "BREMBO", logo: "/marcas/brembo.svg", origen: "Italia", border: "border-red-500/30" },
    { name: "BAJAJ", logo: "/marcas/bajaj.svg", origen: "India", border: "border-blue-500/30" },
    { name: "MOTOMEL", logo: "/marcas/motomel.svg", origen: "Argentina", border: "border-sky-500/30" },
    { name: "GILERA", logo: "/marcas/gilera.svg", origen: "Argentina", border: "border-red-500/30" },
  ];

  const marcasLoop = [...marcas, ...marcas];

  return (
    <section className="rounded-2xl border border-line bg-card p-5 overflow-hidden shadow-sm transition-colors">
      <div className="flex items-center justify-between pb-3 border-b border-line mb-4 px-1 text-xs">
        <div className="flex items-center gap-2">
          <Flame size={15} className="text-brand fill-brand animate-pulse" />
          <span className="font-extrabold uppercase tracking-wider text-white">
            Marcas Oficiales en Stock · Hacé click para filtrar
          </span>
        </div>
        <span className="text-[11px] text-slate-400 hidden sm:inline font-medium">
          Posadas, Misiones · 100% Repuestos Nuevos
        </span>
      </div>

      <div className="overflow-hidden w-full relative py-1">
        <div className="animate-marquee-smooth flex items-center gap-4">
          {marcasLoop.map((m, idx) => (
            <Link
              key={idx}
              href={`/ofertas?marca=${encodeURIComponent(m.name)}`}
              className="marca-card-adaptive flex h-20 w-44 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200 dark:border-line/80 bg-white dark:bg-[#14151a] p-3 text-center transition-all duration-300 hover:scale-105 hover:border-brand hover:shadow-xl hover:shadow-brand/10 group shadow-sm"
              title={`Filtrar repuestos oficiales de ${m.name}`}
            >
              <div className="relative h-10 w-32 flex items-center justify-center">
                <Image
                  src={m.logo}
                  alt={`Logo oficial de ${m.name}`}
                  width={140}
                  height={42}
                  className="max-h-9 w-auto object-contain transition-transform group-hover:scale-105"
                />
              </div>
              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider mt-1 uppercase">
                {m.origen}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
