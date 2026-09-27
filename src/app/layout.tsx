import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FloatingWhatsApp from "@/components/layout/FloatingWhatsApp";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "CHOPER Repuestos — Tienda Online Oficial · Posadas, Misiones",
  description:
    "Catálogo y compra online de repuestos y accesorios para motos en Posadas, Misiones. Retiro en local y envíos por Motomandado / Moto Uber.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[var(--bg)] text-slate-900 dark:text-white antialiased flex flex-col selection:bg-brand selection:text-white">
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              {/* Header sticky con 3 rayitas, logo, buscador, ofertas, modo oscuro e ingresar */}
              <Suspense fallback={<div className="h-20 border-b border-line bg-[#101114]" />}>
                <Header />
              </Suspense>

              {/* Contenido principal */}
              <main className="mx-auto max-w-7xl px-4 pb-16 flex-1 w-full">
                <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando contenido...</div>}>
                  {children}
                </Suspense>
              </main>

              {/* Footer completo estilo Maximus */}
              <Footer />

              {/* Botón flotante de WhatsApp */}
              <FloatingWhatsApp />
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
