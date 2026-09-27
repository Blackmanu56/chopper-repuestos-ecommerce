import React from "react";
import { getCategories, getProducts } from "@/actions/ecommerce";
import { getPublicCombosAction } from "@/actions/combos";
import HeroBanners from "@/components/home/HeroBanners";
import OfertasSection from "@/components/home/OfertasSection";
import CombosSection from "@/components/home/CombosSection";
import MasVendidosSection from "@/components/home/MasVendidosSection";
import MarcasCarrusel from "@/components/home/MarcasCarrusel";
import FaqSection from "@/components/home/FaqSection";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    cat?: string;
  }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q || "";

  const [products, combos] = await Promise.all([
    getProducts({ query: q }),
    getPublicCombosAction(),
  ]);

  return (
    <div className="space-y-12">
      {/* 1. HERO Y MINI BANNERS (SCREENSHOT 1 Y 2) */}
      <HeroBanners />

      {/* 2. PRODUCTOS EN OFERTA (CAPTURA 221212) */}
      <OfertasSection products={products} />

      {/* 3. COMBOS ARMADOS (CON DATOS DINÁMICOS DESDE POSTGRESQL) */}
      <CombosSection initialCombos={combos} />

      {/* 4. LO MÁS VENDIDO (CAPTURA LO MÁS VENDIDO) */}
      <MasVendidosSection products={products} />

      {/* 5. CARRUSEL ANIMADO DE MARCAS DE MOTOS */}
      <MarcasCarrusel />

      {/* 6. PREGUNTAS FRECUENTES INTERACTIVAS (CAPTURA 221244) */}
      <FaqSection />
    </div>
  );
}
