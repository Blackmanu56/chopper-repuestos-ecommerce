import type { Metadata } from "next";
import "./globals.css";
import AppLayoutWrapper from "@/components/layout/AppLayoutWrapper";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ConfigProvider } from "@/context/ConfigContext";
import { getConfiguracionAction } from "@/actions/configuracion";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfiguracionAction();
  const nombre = config?.nombre_tienda || "CHOPER Repuestos";
  return {
    title: `${nombre} — Tienda Online Oficial · Posadas, Misiones`,
    description:
      "Catálogo y compra online de repuestos y accesorios para motos en Posadas, Misiones. Retiro en local y envíos por Motomandado / Moto Uber.",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialConfig = await getConfiguracionAction();

  return (
    <html lang="es">
      <body className="min-h-screen bg-[var(--bg)] text-slate-900 dark:text-white antialiased flex flex-col selection:bg-brand selection:text-white">
        <ConfigProvider initialConfig={initialConfig}>
          <ThemeProvider>
            <AuthProvider>
              <CartProvider>
                <AppLayoutWrapper>{children}</AppLayoutWrapper>
              </CartProvider>
            </AuthProvider>
          </ThemeProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}

