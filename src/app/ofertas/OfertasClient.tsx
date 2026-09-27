"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ProductItem, CategoryItem } from "@/actions/ecommerce";
import { useCart } from "@/context/CartContext";
import {
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  Star,
  Flame,
  ArrowLeft,
  SlidersHorizontal,
  X,
} from "lucide-react";

interface OfertasClientProps {
  initialProducts: ProductItem[];
  categories: CategoryItem[];
  initialQuery?: string;
  initialMarca?: string;
  initialCatName?: string;
}

export default function OfertasClient({
  initialProducts,
  categories,
  initialQuery = "",
  initialMarca = "",
  initialCatName = "",
}: OfertasClientProps) {
  const { addToCart } = useCart();
  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");

  // Estados de filtros laterales
  const [soloStock, setSoloStock] = useState(true);
  const [soloOfertas, setSoloOfertas] = useState(false);
  const [orden, setOrden] = useState<"relevancia" | "menor" | "mayor" | "mas_vendidos">("relevancia");
  const [selectedCats, setSelectedCats] = useState<number[]>(() => {
    if (initialCatName) {
      const clean = initialCatName.toLowerCase();
      const match = categories.find(
        (c) =>
          c.nombre.toLowerCase().includes(clean) ||
          clean.includes(c.nombre.toLowerCase()) ||
          (clean.includes("combo") && c.nombre.toLowerCase().includes("combo"))
      );
      return match ? [match.id] : [];
    }
    return [];
  });
  const [selectedMarcas, setSelectedMarcas] = useState<string[]>(() => {
    if (initialMarca) {
      const match = initialProducts.find(
        (p) => (p.marca || "").toLowerCase() === initialMarca.toLowerCase()
      );
      return match ? [match.marca] : [initialMarca.toUpperCase()];
    }
    return [];
  });
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [search, setSearch] = useState(initialQuery);

  // Colapsables de filtros
  const [catOpen, setCatOpen] = useState(true);
  const [marcaOpen, setMarcaOpen] = useState(true);
  const [precioOpen, setPrecioOpen] = useState(true);

  // Marcas únicas presentes en los productos
  const marcasList = useMemo(() => {
    const map = new Map<string, number>();
    initialProducts.forEach((p) => {
      const m = p.marca || "Otras";
      map.set(m, (map.get(m) || 0) + 1);
    });
    return Array.from(map.entries()).map(([nombre, count]) => ({ nombre, count }));
  }, [initialProducts]);

  // Filtrado reactivo de productos
  const filteredProducts = useMemo(() => {
    return initialProducts
      .filter((p) => {
        // Solo con stock
        if (soloStock && p.stock <= 0) return false;

        // Solo ofertas
        if (soloOfertas && !p.enOferta) return false;

        // Búsqueda
        if (search.trim()) {
          const q = search.toLowerCase();
          const match =
            p.nombre.toLowerCase().includes(q) ||
            (p.marca || "").toLowerCase().includes(q) ||
            p.categoriaNombre.toLowerCase().includes(q);
          if (!match) return false;
        }

        // Categorías seleccionadas
        if (selectedCats.length > 0 && !selectedCats.includes(p.categoriaId)) {
          return false;
        }

        // Marcas seleccionadas
        if (selectedMarcas.length > 0) {
          const pMarca = (p.marca || "").toLowerCase();
          const matchesAny = selectedMarcas.some(
            (sm) => sm.toLowerCase() === pMarca || pMarca.includes(sm.toLowerCase())
          );
          if (!matchesAny) return false;
        }

        // Rango de precio
        if (minPrice && p.precio < Number(minPrice)) return false;
        if (maxPrice && p.precio > Number(maxPrice)) return false;

        return true;
      })
      .sort((a, b) => {
        if (orden === "menor") return a.precio - b.precio;
        if (orden === "mayor") return b.precio - a.precio;
        return a.nombre.localeCompare(b.nombre);
      });
  }, [initialProducts, soloStock, soloOfertas, search, selectedCats, selectedMarcas, minPrice, maxPrice, orden]);

  const toggleCat = (id: number) => {
    setSelectedCats((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleMarca = (m: string) => {
    setSelectedMarcas((prev) =>
      prev.includes(m) ? prev.filter((item) => item !== m) : [...prev, m]
    );
  };

  const clearAllFilters = () => {
    setSelectedCats([]);
    setSelectedMarcas([]);
    setMinPrice("");
    setMaxPrice("");
    setSearch("");
    setSoloStock(false);
    setSoloOfertas(false);
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Barra de cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-line pb-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-brand mb-2 transition-colors font-medium"
          >
            <ArrowLeft size={14} /> Volver al inicio
          </Link>
          <div className="flex items-center gap-2">
            <Flame size={22} className="text-brand fill-brand" />
            <h1 className="text-2xl font-black text-slate-900 dark:text-white md:text-3xl">
              Productos en Oferta & Catálogo
            </h1>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Explorá todos los repuestos con precios directos de mostrador en Posadas, Misiones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Ordenar por:</label>
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as any)}
            className="rounded-xl border border-slate-300 dark:border-line bg-white dark:bg-surface px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-brand cursor-pointer shadow-sm"
          >
            <option value="relevancia">Relevancia / Destacados</option>
            <option value="menor">Menor precio</option>
            <option value="mayor">Mayor precio</option>
          </select>
        </div>
      </div>

      {/* Chips de filtros activos */}
      {(selectedMarcas.length > 0 || selectedCats.length > 0 || search || minPrice || maxPrice) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300">Filtros aplicados:</span>
          {selectedMarcas.map((m) => (
            <button
              key={m}
              onClick={() => toggleMarca(m)}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 border border-brand/40 px-3 py-1 text-brand font-bold hover:bg-brand/25 transition-colors"
            >
              <span>Marca: {m}</span>
              <X size={12} />
            </button>
          ))}
          {selectedCats.map((id) => {
            const catObj = categories.find((c) => c.id === id);
            return (
              <button
                key={id}
                onClick={() => toggleCat(id)}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-surface border border-slate-300 dark:border-line px-3 py-1 text-slate-800 dark:text-slate-200 font-bold hover:border-brand transition-colors"
              >
                <span>{catObj?.nombre}</span>
                <X size={12} />
              </button>
            );
          })}
          {search && (
            <button
              onClick={() => setSearch("")}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-surface border border-slate-300 dark:border-line px-3 py-1 text-slate-800 dark:text-slate-200 font-bold"
            >
              <span>Búsqueda: &quot;{search}&quot;</span>
              <X size={12} />
            </button>
          )}
          <button
            onClick={clearAllFilters}
            className="text-xs text-brand hover:underline font-bold ml-2"
          >
            Limpiar todos
          </button>
        </div>
      )}

      {/* LAYOUT PRINCIPAL: FILTROS A LA IZQUIERDA + PRODUCTOS A LA DERECHA */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* SIDEBAR DE FILTROS */}
        <aside className="lg:col-span-3 rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-line text-xs font-bold text-slate-900 dark:text-white">
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal size={14} className="text-brand" />
              Filtros de búsqueda
            </span>
            <button
              onClick={clearAllFilters}
              className="text-[11px] text-brand hover:underline font-bold"
            >
              Limpiar
            </button>
          </div>

          {/* Switch: Solo stock en local */}
          <div className="flex items-center justify-between py-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Solo stock en el local
            </span>
            <button
              type="button"
              onClick={() => setSoloStock(!soloStock)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                soloStock ? "bg-brand" : "bg-slate-300 dark:bg-surface"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  soloStock ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Switch: Solo productos en oferta */}
          <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-line/40 pt-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <span>🏷️</span>
              <span>Solo en oferta activa</span>
            </span>
            <button
              type="button"
              onClick={() => setSoloOfertas(!soloOfertas)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                soloOfertas ? "bg-brand" : "bg-slate-300 dark:bg-surface"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  soloOfertas ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Buscador dentro de filtros */}
          <div>
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por repuesto..."
                className="w-full rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface px-3 py-2 pl-8 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-brand shadow-sm"
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Filtro Rango de Precio */}
          <div className="pt-3 border-t border-slate-200 dark:border-line">
            <button
              onClick={() => setPrecioOpen(!precioOpen)}
              className="w-full flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200"
            >
              <span>Rango de Precio</span>
              {precioOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {precioOpen && (
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Mínimo"
                    className="w-1/2 rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface px-2.5 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-brand shadow-sm"
                  />
                  <span className="text-slate-400 font-bold">-</span>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Máximo"
                    className="w-1/2 rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface px-2.5 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-brand shadow-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Acordeón Categorías */}
          <div className="pt-3 border-t border-slate-200 dark:border-line">
            <button
              onClick={() => setCatOpen(!catOpen)}
              className="w-full flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200"
            >
              <span>Categorías ({categories.length})</span>
              {catOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {catOpen && (
              <div className="mt-3 max-h-56 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {categories.map((c) => {
                  const checked = selectedCats.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center justify-between gap-2 py-1 px-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-surface cursor-pointer text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white font-medium"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCat(c.id)}
                          className="rounded border-slate-300 dark:border-line bg-white dark:bg-surface text-brand focus:ring-brand"
                        />
                        <span className="truncate">{c.nombre}</span>
                      </div>
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">({c.count})</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Acordeón Marcas */}
          <div className="pt-3 border-t border-slate-200 dark:border-line">
            <button
              onClick={() => setMarcaOpen(!marcaOpen)}
              className="w-full flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200"
            >
              <span>Marcas ({marcasList.length})</span>
              {marcaOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {marcaOpen && (
              <div className="mt-3 max-h-56 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {marcasList.map((m) => {
                  const checked = selectedMarcas.some(
                    (sm) => sm.toLowerCase() === m.nombre.toLowerCase()
                  );
                  return (
                    <label
                      key={m.nombre}
                      className="flex items-center justify-between gap-2 py-1 px-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-surface cursor-pointer text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white font-medium"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMarca(m.nombre)}
                          className="rounded border-slate-300 dark:border-line bg-white dark:bg-surface text-brand focus:ring-brand"
                        />
                        <span className="truncate">{m.nombre}</span>
                      </div>
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">({m.count})</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* GRILLA DE PRODUCTOS */}
        <main className="lg:col-span-9 space-y-4">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((p, idx) => {
                const regular = p.precioRegular ?? p.precio;
                const ahorro = p.enOferta ? Math.max(0, regular - p.precio) : 0;
                const precioOriginal = regular;
                const badge = p.badgePromo || (p.enOferta ? "Oferta Posadas" : null);

                const esCombo = Boolean((p as any).esCombo || p.categoriaId === 9999 || p.categoriaNombre.toLowerCase().includes("combo"));
                const itemHref = esCombo ? `/combos/${p.id}` : `/producto/${p.id}`;

                return (
                  <div
                    key={`oferta-card-${esCombo ? "combo" : "prod"}-${p.id}-${idx}`}
                    className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-3 hover:border-brand/70 hover:shadow-xl transition-all shadow-sm"
                  >
                    <div>
                      {/* Badge Ahorra & Promo */}
                      <div className="space-y-1 mb-2">
                        {p.enOferta && ahorro > 0 && (
                          <span className="inline-block rounded-md bg-brand px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-sm">
                            AHORRÁ {formatPrice(ahorro)} ({p.descuentoPorcentaje}% OFF)
                          </span>
                        )}
                        {badge && (
                          <div className="rounded-md border border-brand/40 bg-brand/10 px-1.5 py-0.5 text-[9px] font-bold text-brand w-fit truncate max-w-[130px]">
                            🏷️ {badge}
                          </div>
                        )}
                      </div>

                      {/* Imagen con enlace adecuado */}
                      <Link
                        href={itemHref}
                        className="relative mb-2 flex h-36 items-center justify-center rounded-xl bg-slate-50 dark:bg-surface text-slate-500 overflow-hidden p-2 border border-slate-100 dark:border-line/40"
                      >
                        {p.imagen ? (
                          <img
                            src={p.imagen}
                            alt={p.nombre}
                            className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <span className="text-3xl">⚙️</span>
                            <span className="text-[10px] mt-1 font-mono uppercase">Chopper</span>
                          </div>
                        )}
                      </Link>

                      {/* Marca y Categoría (ocultar para combos para evitar la redundancia solicitada) */}
                      {!esCombo && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-400 font-semibold mb-1">
                          <span className="rounded bg-slate-100 dark:bg-surface px-1.5 py-0.5 border border-slate-200 dark:border-line text-brand font-bold">
                            {p.marca || "Chopper"}
                          </span>
                          <span>·</span>
                          <span className="truncate">{p.categoriaNombre}</span>
                        </div>
                      )}

                      {/* Título */}
                      <Link
                        href={itemHref}
                        className="line-clamp-2 text-xs font-bold text-slate-900 dark:text-white hover:text-brand transition-colors leading-snug min-h-[32px]"
                        title={p.nombre}
                      >
                        {p.nombre}
                      </Link>
                    </div>

                    {/* Precios & Cuotas */}
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-line/60">
                      {p.enOferta && ahorro > 0 ? (
                        <div className="text-[11px] text-slate-500 line-through">
                          {formatPrice(precioOriginal)}
                        </div>
                      ) : (
                        <div className="text-[11px] text-transparent select-none">-</div>
                      )}
                      <div className="text-lg font-black text-slate-900 dark:text-white">
                        {formatPrice(p.precio)}
                      </div>
                      <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                        3 cuotas sin interés de {formatPrice(Math.round(p.precio / 3))}
                      </div>

                      {/* Entrega y Botón Carrito (sin exponer stock numérico local) */}
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          {esCombo ? "Kit Armado · Envío o Retiro" : "Disponible en Posadas"}
                        </span>

                        <button
                          onClick={() => addToCart(p, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white hover:bg-brandhover transition-colors shadow-md active:scale-95 shrink-0 cursor-pointer"
                          title="Agregar al carrito"
                        >
                          <ShoppingCart size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-card p-12 text-center space-y-3">
              <span className="text-4xl">🔍</span>
              <h3 className="text-base font-bold text-white">No se encontraron productos</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No hay repuestos que coincidan con los filtros seleccionados. Probá modificando la búsqueda o quitando marcas/categorías.
              </p>
              <button
                onClick={clearAllFilters}
                className="mt-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brandhover transition-all"
              >
                Limpiar todos los filtros
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
