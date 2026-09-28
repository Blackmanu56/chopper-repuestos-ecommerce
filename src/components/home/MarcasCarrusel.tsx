"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import { getMarcasPublicasAction } from "@/actions/commercial";

const DEFAULT_MARCAS = [
  { name: "HONDA", logo: "/marcas/honda.svg", origen: "Japón" },
  { name: "YAMAHA", logo: "/marcas/yamaha.svg", origen: "Japón" },
  { name: "MOTUL", logo: "/marcas/motul.svg", origen: "Francia" },
  { name: "CASTROL", logo: "/marcas/castrol.svg", origen: "Reino Unido" },
  { name: "PIRELLI", logo: "/marcas/pirelli.svg", origen: "Italia" },
  { name: "DID", logo: "/marcas/did.svg", origen: "Japón" },
  { name: "NGK", logo: "/marcas/ngk.svg", origen: "Japón" },
  { name: "BOSCH", logo: "/marcas/bosch.svg", origen: "Alemania" },
  { name: "BREMBO", logo: "/marcas/brembo.svg", origen: "Italia" },
  { name: "BAJAJ", logo: "/marcas/bajaj.svg", origen: "India" },
  { name: "MOTOMEL", logo: "/marcas/motomel.svg", origen: "Argentina" },
  { name: "GILERA", logo: "/marcas/gilera.svg", origen: "Argentina" },
];

export default function MarcasCarrusel() {
  const [marcas, setMarcas] = useState(DEFAULT_MARCAS);

  useEffect(() => {
    let isMounted = true;
    getMarcasPublicasAction().then((res) => {
      if (isMounted && res.success && res.marcas.length > 0) {
        const dynamic = res.marcas.map((m) => {
          const slug = m.nombre
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "");
          return {
            name: m.nombre.toUpperCase(),
            logo: m.imagen || `/marcas/${slug}.svg`,
            origen: "Oficial",
          };
        });
        setMarcas(dynamic);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

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
                <img
                  src={m.logo}
                  alt={`Logo oficial de ${m.name}`}
                  className="max-h-9 max-w-full w-auto object-contain transition-transform group-hover:scale-105"
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
