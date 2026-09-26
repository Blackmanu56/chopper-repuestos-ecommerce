import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Header from "@/components/layout/Header";
import { CartProvider } from "@/context/CartContext";

export const metadata: Metadata = {
  title: "CHOPER Repuestos — Tienda Online",
  description: "Catálogo y compra de repuestos para motos. Retiro en local.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#101114] text-white antialiased flex flex-col">
        <CartProvider>
          <Suspense fallback={<div className="h-16 border-b border-line bg-[#101114]" />}>
            <Header />
          </Suspense>

          <main className="mx-auto max-w-7xl px-4 pb-20 flex-1 w-full">
            <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando...</div>}>
              {children}
            </Suspense>
          </main>

          <footer className="mt-16 border-t border-line py-6 text-center text-xs text-slate-500">
            CHOPER Repuestos — Tienda online · Proyecto integrador · Retiro en Av. Colón 1540, Córdoba
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
