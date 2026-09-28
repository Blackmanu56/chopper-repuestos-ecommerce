import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import AppLayoutWrapper from "@/components/layout/AppLayoutWrapper";
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
              <AppLayoutWrapper>{children}</AppLayoutWrapper>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
