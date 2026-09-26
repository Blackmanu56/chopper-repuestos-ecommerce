import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chopper Repuestos - Tienda Online",
  description: "Catálogo y compra de repuestos para motos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
