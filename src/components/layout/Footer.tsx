"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useConfig } from "@/context/ConfigContext";
import {
  MapPin,
  Clock,
  Phone,
  Bike,
  CreditCard,
  ShieldCheck,
  Mail,
} from "lucide-react";

export default function Footer() {
  const { config } = useConfig();
  const cleanWhatsappNumber = (config.whatsapp || "5493765243554").replace(/\D/g, "");
  const mapsHref = config.mapa_url || `https://maps.google.com/?q=${encodeURIComponent(config.direccion || "Av. Roque Sáenz Peña 1500, Posadas, Misiones")}`;

  return (
    <footer className="mt-16 border-t border-slate-200 dark:border-[#1e2028] bg-white dark:bg-[#0c0d10] text-slate-700 dark:text-slate-300 transition-colors shadow-sm">
      {/* Contenedor conciso y resumido */}
      <div className="mx-auto max-w-7xl px-4 py-7">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-slate-200 dark:border-[#1e2028]">
          {/* Logo y descripción con ubicación única */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Link
              href="/"
              className="inline-block group rounded-2xl overflow-hidden border border-slate-300 dark:border-line/80 shrink-0 shadow-lg transition-transform hover:scale-105"
              title={config.nombre_tienda || "Chopper Repuestos"}
            >
              <Image
                src={config.logo_url || "/logo-nav.png"}
                alt={config.nombre_tienda || "Chopper Repuestos"}
                width={200}
                height={95}
                priority
                unoptimized
                className="h-16 sm:h-20 w-auto object-contain block rounded-2xl p-1"
              />
            </Link>

            <div className="text-xs space-y-1">
              <p className="font-black text-slate-900 dark:text-white text-base tracking-tight">
                {config.nombre_tienda || "Chopper Repuestos"}
              </p>
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5 hover:text-brand transition-colors"
              >
                <MapPin size={13} className="text-brand shrink-0" />
                <span>{config.direccion || "Av. Roque Sáenz Peña 1500 · Posadas, Misiones"}</span>
              </a>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 font-semibold">
                  <Bike size={12} /> Motomandado y Moto Uber
                </span>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 font-semibold">
                  <CreditCard size={12} /> Pagás al retirar
                </span>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40 font-semibold">
                  <ShieldCheck size={12} /> 100% Repuestos Nuevos
                </span>
              </div>
            </div>
          </div>

          {/* Enlaces de navegación rápidos */}
          <div className="flex flex-wrap items-center gap-5 text-xs font-bold">
            <Link
              href="/ofertas"
              className="text-slate-700 dark:text-slate-300 hover:text-brand transition-colors"
            >
              🔥 Ofertas
            </Link>
            <Link
              href="/combos"
              className="text-slate-700 dark:text-slate-300 hover:text-brand transition-colors"
            >
              📦 Combos
            </Link>
            <Link
              href="/mis-pedidos"
              className="text-slate-700 dark:text-slate-300 hover:text-brand transition-colors"
            >
              🛵 Pedidos
            </Link>
            <Link
              href="/nosotros"
              className="text-slate-700 dark:text-slate-300 hover:text-brand transition-colors"
            >
              🏢 Nosotros
            </Link>
          </div>

          {/* Horario, teléfono y correo con contraste perfecto según el tema */}
          <div className="flex flex-col sm:items-end justify-center gap-1.5 shrink-0 text-left sm:text-right text-xs">
            <p className="flex items-center sm:justify-end gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
              <Clock size={13} className="text-brand shrink-0" />
              <span>{config.horarios || "Lun a Sáb 8:00-12:30 / 16:30-20:30"}</span>
            </p>
            <a
              href={`https://wa.me/${cleanWhatsappNumber}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center sm:justify-end gap-1.5 text-sm sm:text-base font-black text-slate-900 dark:text-white hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors tracking-wide"
            >
              <Phone size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{config.telefono || "376 524-3554"} (WhatsApp)</span>
            </a>
            <a
              href={`mailto:${config.email || "contacto@chopper-repuestos.com"}`}
              className="flex items-center sm:justify-end gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-brand transition-colors font-medium"
            >
              <Mail size={13} className="text-sky-500 shrink-0" />
              <span>{config.email || "contacto@chopper-repuestos.com"}</span>
            </a>
          </div>
        </div>

        {/* Barra inferior compacta */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <div>
            © {new Date().getFullYear()} {config.nombre_tienda || "Chopper Repuestos"} · Todos los derechos reservados.
          </div>
          <div>
            100% Repuestos Nuevos con Garantía Oficial de Fábrica
          </div>
        </div>
      </div>
    </footer>
  );
}
