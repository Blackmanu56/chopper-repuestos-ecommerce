import React from "react";
import Link from "next/link";
import { getCategories, getProducts } from "@/actions/ecommerce";
import ProductCard from "@/components/products/ProductCard";
import CategoryFilter from "@/components/products/CategoryFilter";
import { ShoppingCart } from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    cat?: string;
  }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q || "";
  const catId = params.cat ? Number(params.cat) : undefined;

  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({ query: q, categoriaId: catId }),
  ]);

  return (
    <div>
      {/* ═══════════ HERO BANNER ═══════════ */}
      <section className="mt-6 grid gap-4 rounded-2xl border border-line bg-gradient-to-br from-surface to-card p-6 md:p-8 md:grid-cols-2">
        <div className="flex flex-col justify-center">
          <span className="mb-3 inline-flex w-fit items-center rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand ring-1 ring-brand/30">
            NUEVO: Tienda online
          </span>
          <h1 className="text-3xl font-black leading-tight tracking-tight md:text-5xl">
            Hacé tu pedido
            <br />
            y <span className="text-brand">retiralo en el local</span>
          </h1>
          <p className="mt-3 max-w-md text-slate-400 text-sm md:text-base">
            Buscá tu repuesto, armá el pedido online y pasá a retirarlo. Pagás en efectivo o
            transferencia cuando lo recibís.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="#catalogo"
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brandhover transition-colors"
            >
              Ver productos
            </a>
            <Link
              href="/mis-pedidos"
              className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 transition-colors"
            >
              Mis pedidos
            </Link>
          </div>
        </div>
        <div className="hidden items-center justify-center rounded-xl border border-line bg-card text-slate-600 md:flex">
          <ShoppingCart size={90} strokeWidth={1.2} />
        </div>
      </section>

      {/* ═══════════ CATÁLOGO ═══════════ */}
      <section id="catalogo" className="mt-10 scroll-mt-20">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-black tracking-tight">Productos disponibles</h2>
            {q && (
              <p className="text-xs text-slate-400 mt-0.5">
                Filtrado por búsqueda: &quot;<span className="text-white font-semibold">{q}</span>&quot;
              </p>
            )}
          </div>
          <span className="text-sm text-slate-500 font-medium">
            {products.length} {products.length === 1 ? "producto" : "productos"}
          </span>
        </div>

        {/* Filtros de Categorías reales */}
        <CategoryFilter categories={categories} />

        {/* Grilla de Productos */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-line bg-card p-12 text-center">
            <p className="text-lg font-semibold text-slate-300">No se encontraron productos</p>
            <p className="mt-1 text-sm text-slate-500">
              Probá cambiando la categoría o usando otros términos de búsqueda.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brandhover transition-colors"
            >
              Ver todo el catálogo
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
