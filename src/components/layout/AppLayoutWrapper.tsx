"use client";

import React, { Suspense } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FloatingWhatsApp from "@/components/layout/FloatingWhatsApp";

export default function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPanel = pathname.startsWith("/panel");

  if (isPanel) {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0f1012] text-[#e7e7ea]">
        <Suspense fallback={<div className="h-20 border-b border-[#26272e] bg-[#101114]" />}>
          <Header />
        </Suspense>
        <div className="flex-1 min-h-0 w-full overflow-hidden">
          <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando panel...</div>}>
            {children}
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header sticky con 3 rayitas, logo, buscador, ofertas, modo oscuro e ingresar */}
      <Suspense fallback={<div className="h-20 border-b border-line bg-[#101114]" />}>
        <Header />
      </Suspense>

      {/* Contenido principal de la tienda */}
      <main className="mx-auto max-w-7xl px-4 pb-16 flex-1 w-full">
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando contenido...</div>}>
          {children}
        </Suspense>
      </main>

      {/* Footer completo estilo Maximus */}
      <Footer />

      {/* Botón flotante de WhatsApp */}
      <FloatingWhatsApp />
    </>
  );
}
