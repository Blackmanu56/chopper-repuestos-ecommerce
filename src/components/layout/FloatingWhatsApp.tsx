"use client";

import React from "react";
import { MessageCircle } from "lucide-react";

export default function FloatingWhatsApp() {
  const phone = "5493765243554";
  const message = encodeURIComponent(
    "Hola Chopper Repuestos! Quería hacer una consulta sobre repuestos para mi moto."
  );
  const waUrl = `https://wa.me/${phone}?text=${message}`;

  return (
    <aside aria-label="Contacto por WhatsApp" className="fixed bottom-6 right-6 z-50 flex items-center group">
      <span className="hidden sm:inline-block mr-3 rounded-xl bg-card border border-line px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
        ¿Dudas? Escribinos al 376 524-3554
      </span>
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir chat de WhatsApp"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_4px_20px_rgba(16,185,129,0.4)] hover:bg-emerald-600 hover:scale-110 active:scale-95 transition-all"
      >
        <MessageCircle size={28} className="fill-current" />
      </a>
    </aside>
  );
}
