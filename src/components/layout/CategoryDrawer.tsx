"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  X,
  ChevronRight,
  Flame,
  Layers,
  Building,
  Package,
  FileCheck,
  ShieldCheck,
  HelpCircle,
  CircleDot,
  Wrench,
  Disc,
  Droplet,
  Zap,
} from "lucide-react";

interface CategoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CategoryGroup {
  id: string;
  name: string;
  icon: any;
  subcategories: string[];
}

export default function CategoryDrawer({ isOpen, onClose }: CategoryDrawerProps) {
  const [expandedCat, setExpandedCat] = useState<string | null>("cubiertas");

  const categories: CategoryGroup[] = [
    {
      id: "cubiertas",
      name: "Neumáticos y Cubiertas",
      icon: Disc,
      subcategories: [
        "Todas las cubiertas",
        "Pirelli",
        "Rinaldi",
        "Michelin",
        "Cámaras de aire",
        "Válvulas y parches",
      ],
    },
    {
      id: "lubricantes",
      name: "Lubricantes y Fluidos",
      icon: Droplet,
      subcategories: [
        "Todos los aceites",
        "Motul 5100 / 7100",
        "Castrol Power 1 / Actevo",
        "Aceites 2T",
        "Aceites 4T",
        "Líquido de frenos DOT 4",
      ],
    },
    {
      id: "frenos",
      name: "Frenos y Seguridad",
      icon: ShieldCheck,
      subcategories: [
        "Pastillas de freno",
        "Discos ventilados",
        "Zapatas / Cintas",
        "Bombas y calipers",
      ],
    },
    {
      id: "motor",
      name: "Motor y Encendido",
      icon: Zap,
      subcategories: [
        "Bujías NGK Japón",
        "Pistones y aros",
        "Juntas de motor",
        "Filtros de aire y aceite",
        "Carburación",
      ],
    },
    {
      id: "transmision",
      name: "Transmisión y Cadenas",
      icon: Layers,
      subcategories: [
        "Cadenas DID reforzadas",
        "Coronas y piñones",
        "Kits de transmisión completos",
      ],
    },
    {
      id: "accesorios",
      name: "Accesorios y Cascos",
      icon: Package,
      subcategories: [
        "Cascos homologados",
        "Espejos y manillares",
        "Candados y alarmas",
        "Iluminación LED",
      ],
    },
    {
      id: "herramientas",
      name: "Herramientas de Taller",
      icon: Wrench,
      subcategories: [
        "Llaves saca bujías",
        "Extractores de volante",
        "Infladores portátiles",
      ],
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay oscuro */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      />

      {/* Drawer Panel */}
      <aside className="relative z-10 flex h-full w-full max-w-sm flex-col bg-white dark:bg-[#131418] border-r border-slate-200 dark:border-line text-slate-900 dark:text-white shadow-2xl animate-in slide-in-from-left duration-250">
        {/* Cabecera del Drawer centrada */}
        <div className="relative flex items-center justify-center border-b border-slate-200 dark:border-line px-5 py-4">
          <Link
            href="/"
            onClick={onClose}
            className="flex flex-col items-center group py-0.5"
            title="Chopper Repuestos - Inicio"
          >
            <Image
              src="/logo-nav.png"
              alt="Chopper Repuestos"
              width={180}
              height={80}
              priority
              className="h-12 w-auto object-contain drop-shadow transition-transform duration-300 group-hover:scale-105"
            />
            <span className="text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase mt-1">
              Catálogo de Repuestos
            </span>
          </Link>

          <button
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        {/* Botones de Acceso Rápido */}
        <div className="grid grid-cols-3 gap-2 p-3 border-b border-slate-200 dark:border-line/60 bg-slate-50 dark:bg-[#101115]">
          <Link
            href="/ofertas"
            onClick={onClose}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 dark:border-line bg-white dark:bg-surface p-2 text-center hover:border-brand transition-colors group"
          >
            <Flame size={16} className="text-brand mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-white">Ofertas</span>
          </Link>

          <Link
            href="/#combos"
            onClick={onClose}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 dark:border-line bg-white dark:bg-surface p-2 text-center hover:border-amber-500 transition-colors group"
          >
            <Layers size={16} className="text-amber-500 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-white">Combos</span>
          </Link>

          <Link
            href="/nosotros"
            onClick={onClose}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 dark:border-line bg-white dark:bg-surface p-2 text-center hover:border-blue-500 transition-colors group"
          >
            <Building size={16} className="text-blue-500 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-white">Nosotros</span>
          </Link>
        </div>

        {/* Lista de Categorías con Acordeón Desplegable */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Categorías de Repuestos
          </div>

          {categories.map((cat) => {
            const Icon = cat.icon;
            const isExpanded = expandedCat === cat.id;

            return (
              <div key={cat.id} className="rounded-xl overflow-hidden border border-slate-200 dark:border-line/40">
                <button
                  onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 text-xs font-semibold transition-all ${
                    isExpanded
                      ? "bg-slate-100 dark:bg-surface text-brand font-bold"
                      : "bg-white dark:bg-[#16171d] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-surface hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={isExpanded ? "text-brand" : "text-slate-400 dark:text-slate-500"} />
                    <span>{cat.name}</span>
                  </div>
                  <ChevronRight
                    size={15}
                    className={`transition-transform duration-200 text-slate-400 dark:text-slate-500 ${
                      isExpanded ? "rotate-90 text-brand" : ""
                    }`}
                  />
                </button>

                {isExpanded && (
                  <div className="bg-slate-50 dark:bg-[#0f1013] px-4 py-2 space-y-1.5 border-t border-slate-200 dark:border-line/40 text-xs">
                    {cat.subcategories.map((sub, i) => (
                      <Link
                        key={i}
                        href={`/ofertas?q=${encodeURIComponent(sub)}`}
                        onClick={onClose}
                        className="flex items-center gap-2 py-1 text-slate-600 dark:text-slate-400 hover:text-brand dark:hover:text-white hover:translate-x-1 transition-all"
                      >
                        <CircleDot size={10} className="text-brand/60" />
                        <span>{sub}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Links Inferiores */}
        <div className="border-t border-slate-200 dark:border-line bg-slate-50 dark:bg-[#0e0f12] p-3 space-y-1 text-xs">
          <Link
            href="/mis-pedidos"
            onClick={onClose}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-surface hover:text-brand transition-colors"
          >
            <Package size={15} className="text-brand" />
            <span>Seguir mi Pedido</span>
          </Link>

          <Link
            href="/panel?tab=comprobante"
            onClick={onClose}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-surface hover:text-emerald-500 transition-colors"
          >
            <FileCheck size={15} className="text-emerald-500" />
            <span>Subir Comprobante</span>
          </Link>

          <a
            href="https://wa.me/5493765243554?text=Hola%20Chopper%20Repuestos!%20Necesito%20ayuda"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors font-semibold"
          >
            <HelpCircle size={15} />
            <span>Ayuda / WhatsApp</span>
          </a>
        </div>
      </aside>
    </div>
  );
}
