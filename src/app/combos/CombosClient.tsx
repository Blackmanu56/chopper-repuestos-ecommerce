"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ComboDTO } from "@/actions/combos";
import { useCart } from "@/context/CartContext";
import { useConfig } from "@/context/ConfigContext";
import {
  Layers,
  Search,
  ShoppingCart,
  Check,
  ChevronRight,
  SlidersHorizontal,
  X,
  ArrowLeft,
  PackageCheck,
  Tag,
  Lock,
} from "lucide-react";

interface CombosClientProps {
  initialCombos: ComboDTO[];
}

export default function CombosClient({ initialCombos }: CombosClientProps) {
  const { addToCart, isStaff, getItemCartQuantity, getRemainingStock } = useCart();
  const { shouldShowAhorroBadge, calcularCuotas } = useConfig();
  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");

  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [soloStock, setSoloStock] = useState(true);
  const [orden, setOrden] = useState<"relevancia" | "menor" | "mayor" | "ahorro">("relevancia");
  const [addedIds, setAddedIds] = useState<Record<number, boolean>>({});

  // Extraer tags únicos presentes en los combos
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    initialCombos.forEach((c) => {
      if (c.badge && c.badge.trim()) {
        set.add(c.badge.trim());
      }
    });
    return Array.from(set);
  }, [initialCombos]);

  // Filtrado y ordenamiento reactivo
  const filteredCombos = useMemo(() => {
    let result = initialCombos.filter((c) => {
      if (soloStock && c.stockCalculado <= 0) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = c.nombre.toLowerCase().includes(q);
        const matchDesc = (c.descripcion || "").toLowerCase().includes(q);
        const matchItems = c.items?.some((it) =>
          it.producto?.nombre?.toLowerCase().includes(q)
        );
        if (!matchName && !matchDesc && !matchItems) return false;
      }

      if (selectedTag) {
        if ((c.badge || "").trim().toLowerCase() !== selectedTag.toLowerCase()) {
          return false;
        }
      }

      return true;
    });

    if (orden === "menor") {
      result.sort((a, b) => a.precio - b.precio);
    } else if (orden === "mayor") {
      result.sort((a, b) => b.precio - a.precio);
    } else if (orden === "ahorro") {
      result.sort((a, b) => b.ahorro - a.ahorro);
    } else {
      // Relevancia: primero los destacados, luego por orden
      result.sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0) || a.orden - b.orden);
    }

    return result;
  }, [initialCombos, search, selectedTag, soloStock, orden]);

  const handleAddCombo = (combo: ComboDTO) => {
    if (isStaff || combo.stockCalculado <= 0) return;
    const componentes = (combo.items || []).map((it) => ({
      productoId: it.productoId,
      cantidad: it.cantidad,
      nombre: it.producto?.nombre,
      stockProducto: it.producto?.cantidad,
    }));

    addToCart(
      {
        id: combo.id,
        nombre: combo.nombre,
        marca: "Combo Chopper",
        categoriaId: 9999,
        categoriaNombre: "Combos Armados",
        precio: combo.precio,
        stock: combo.stockCalculado,
        imagen: combo.imagen,
        esCombo: true,
        componentes,
      } as any,
      1
    );

    setAddedIds((prev) => ({ ...prev, [combo.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [combo.id]: false }));
    }, 2000);
  };

  const clearAllFilters = () => {
    setSearch("");
    setSelectedTag("");
    setSoloStock(false);
    setOrden("relevancia");
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Barra de cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-line pb-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2">
            <Link href="/" className="hover:text-brand transition-colors inline-flex items-center gap-1">
              <ArrowLeft size={13} /> Inicio
            </Link>
            <ChevronRight size={12} />
            <span className="font-semibold text-slate-900 dark:text-white">Combos Armados</span>
          </nav>
          <div className="flex items-center gap-2">
            <Layers size={22} className="text-amber-500 fill-amber-500" />
            <h1 className="text-2xl font-black text-slate-900 dark:text-white md:text-3xl">
              Combos Armados & Kits de Service
            </h1>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Kits completos de repuestos esenciales para moto con descuento directo en Posadas, Misiones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Ordenar por:</label>
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as any)}
            className="rounded-xl border border-slate-300 dark:border-line bg-white dark:bg-surface px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-amber-500 cursor-pointer shadow-sm"
          >
            <option value="relevancia">Relevancia / Destacados</option>
            <option value="menor">Menor precio</option>
            <option value="mayor">Mayor precio</option>
            <option value="ahorro">Mayor ahorro</option>
          </select>
        </div>
      </div>

      {/* Chips de filtros activos */}
      {(search || selectedTag || soloStock) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300">Filtros aplicados:</span>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-surface border border-slate-300 dark:border-line px-3 py-1 text-slate-800 dark:text-slate-200 font-bold"
            >
              <span>Búsqueda: &quot;{search}&quot;</span>
              <X size={12} />
            </button>
          )}
          {selectedTag && (
            <button
              onClick={() => setSelectedTag("")}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 px-3 py-1 text-amber-500 font-bold"
            >
              <span>Etiqueta: {selectedTag}</span>
              <X size={12} />
            </button>
          )}
          {soloStock && (
            <button
              onClick={() => setSoloStock(false)}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-surface border border-slate-300 dark:border-line px-3 py-1 text-slate-800 dark:text-slate-200 font-bold"
            >
              <span>Solo en stock</span>
              <X size={12} />
            </button>
          )}
          <button
            onClick={clearAllFilters}
            className="text-xs text-amber-500 hover:underline font-bold ml-2 cursor-pointer"
          >
            Limpiar todos
          </button>
        </div>
      )}

      {/* LAYOUT PRINCIPAL: FILTROS A LA IZQUIERDA + COMBOS A LA DERECHA */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* SIDEBAR DE FILTROS */}
        <aside className="lg:col-span-3 rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-line text-xs font-bold text-slate-900 dark:text-white">
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal size={14} className="text-amber-500" />
              Filtros de combos
            </span>
            <button
              onClick={clearAllFilters}
              className="text-[11px] text-amber-500 hover:underline font-bold cursor-pointer"
            >
              Limpiar
            </button>
          </div>

          {/* Búsqueda dentro de combos */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Buscar combo
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Ej: Transmisión, Service, Motul..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-line bg-slate-50 dark:bg-surface pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Switch: Solo stock */}
          <div className="flex items-center justify-between py-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Solo stock en el local
            </span>
            <button
              type="button"
              onClick={() => setSoloStock(!soloStock)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                soloStock ? "bg-emerald-500" : "bg-slate-300 dark:bg-zinc-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  soloStock ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Filtro por Etiquetas Promocionales */}
          {availableTags.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-line">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Tag size={13} className="text-amber-500" />
                Campañas y promociones
              </span>
              <div className="flex flex-col gap-1.5">
                {availableTags.map((tag) => {
                  const isSelected = selectedTag.toLowerCase() === tag.toLowerCase();
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(isSelected ? "" : tag)}
                      className={`flex items-center justify-between text-left text-xs px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? "border-amber-500 bg-amber-500/15 text-amber-500 font-bold"
                          : "border-slate-200 dark:border-line/60 bg-slate-50 dark:bg-surface text-slate-700 dark:text-slate-300 hover:border-amber-500/40"
                      }`}
                    >
                      <span className="truncate">{tag}</span>
                      {isSelected && <Check size={12} className="shrink-0 text-amber-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* LISTADO DE COMBOS */}
        <main className="lg:col-span-9 space-y-4">
          {filteredCombos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCombos.map((combo) => {
                const hasOffer = Boolean(combo.enOferta && combo.precioRegular && combo.precioRegular > combo.precio);
                const regular = hasOffer && combo.precioRegular ? combo.precioRegular : combo.precio;
                const ahorro = hasOffer && combo.precioRegular ? Math.max(0, combo.precioRegular - combo.precio) : 0;
                const hasStock = combo.stockCalculado > 0;
                const componentesCombo = (combo.items || []).map((it) => ({
                  productoId: it.productoId,
                  cantidad: it.cantidad,
                  nombre: it.producto?.nombre,
                  stockProducto: it.producto?.cantidad,
                }));
                const inCartQty = getItemCartQuantity(combo.id, true);
                const remainingStock = getRemainingStock({
                  id: combo.id,
                  stock: combo.stockCalculado,
                  esCombo: true,
                  componentes: componentesCombo,
                });
                const isLimitReached = hasStock && remainingStock <= 0;
                const isLowStock = hasStock && combo.stockCalculado <= 5;
                const isAdded = Boolean(addedIds[combo.id]);
                const financiacion = calcularCuotas(combo.precio);
                const cuota = financiacion.valorCuota;

                return (
                  <div
                    key={`combo-card-${combo.id}`}
                    className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-4 hover:border-amber-500/70 hover:shadow-xl transition-all shadow-sm"
                  >
                    <div>
                      {/* Badges superiores: Ahorro & Promo */}
                      <div className="flex items-center justify-between gap-1.5 mb-2.5">
                        {hasOffer && shouldShowAhorroBadge(ahorro) ? (
                          <span className="rounded-md bg-brand px-2 py-0.5 text-[10px] font-black uppercase text-white shadow-sm">
                            {combo.descuentoPorcentaje}% OFF
                          </span>
                        ) : (
                          <span />
                        )}
                        {combo.badge ? (
                          <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500 dark:text-amber-400">
                            {combo.badge}
                          </span>
                        ) : combo.destacado ? (
                          <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500 dark:text-amber-400">
                            ⭐ Destacado
                          </span>
                        ) : null}
                      </div>

                      {/* Imagen del Combo */}
                      <Link
                        href={`/combos/${combo.id}`}
                        className="relative mb-3 flex h-44 w-full items-center justify-center rounded-xl bg-slate-50 dark:bg-surface text-slate-500 overflow-hidden p-2 border border-slate-100 dark:border-line/40 block cursor-pointer"
                      >
                        <img
                          src={combo.imagen || "/combos/combo-service-motul.jpg"}
                          alt={combo.nombre}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = "/combos/combo-service-motul.jpg";
                          }}
                          className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                        {!hasStock && (
                          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white shadow">
                              Sin stock
                            </span>
                          </div>
                        )}
                      </Link>

                      {/* Título del combo */}
                      <Link
                        href={`/combos/${combo.id}`}
                        className="line-clamp-2 text-sm font-bold text-slate-900 dark:text-white hover:text-amber-500 transition-colors leading-snug min-h-[40px] block"
                        title={combo.nombre}
                      >
                        {combo.nombre}
                      </Link>

                      {/* Items que incluye */}
                      {combo.items && combo.items.length > 0 && (
                        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-surface/60 rounded-lg p-2 border border-slate-100 dark:border-line/40 space-y-0.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 block text-[10px] uppercase tracking-wider">
                            Incluye:
                          </span>
                          <p className="line-clamp-2 leading-relaxed">
                            {combo.items.map((it) => `${it.cantidad}x ${it.producto.nombre}`).join(" + ")}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Precios & Acciones */}
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-line/60 space-y-3">
                      {/* Precios distribuidos izquierda y derecha */}
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          {hasOffer && (
                            <div className="text-xs text-slate-400 line-through">
                              {formatPrice(regular)}
                            </div>
                          )}
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl sm:text-2xl font-black text-brand tracking-tight">
                              {formatPrice(combo.precio)}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              efectivo / débito
                            </span>
                          </div>
                        </div>

                        {hasOffer && shouldShowAhorroBadge(ahorro) && (
                          <div className="text-right">
                            <span className="inline-block rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold">
                              Ahorrás {formatPrice(ahorro)}
                            </span>
                          </div>
                        )}
                      </div>

                      {hasStock && isLowStock && (
                        <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          <span>¡Últimos {combo.stockCalculado} kits disponibles!</span>
                        </div>
                      )}

                      {financiacion.habilitadas && (
                        <div className="text-[11px] font-semibold text-amber-500 mt-0.5">
                          {financiacion.sinInteres
                            ? `${financiacion.cuotas} cuotas sin interés de ${formatPrice(cuota)}`
                            : `${financiacion.cuotas} cuotas fijas de ${formatPrice(cuota)}`}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href={`/combos/${combo.id}`}
                          className="flex items-center justify-center rounded-xl border border-slate-300 dark:border-line px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-amber-500 hover:text-amber-500 transition-colors text-center"
                        >
                          Ver detalle
                        </Link>
                        {isStaff ? (
                          <button
                            type="button"
                            onClick={() => handleAddCombo(combo)}
                            title="Estás utilizando una cuenta de personal. Para realizar compras, ingresá con una cuenta de cliente."
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-line bg-slate-100 dark:bg-surface px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-amber-600 transition-colors"
                          >
                            <Lock size={12} className="text-slate-400" /> Consulta
                          </button>
                        ) : !hasStock ? (
                          <button
                            type="button"
                            disabled
                            className="flex items-center justify-center rounded-xl bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 px-3 py-2 text-xs font-bold cursor-not-allowed border border-slate-300 dark:border-zinc-700/50"
                          >
                            Sin stock
                          </button>
                        ) : isLimitReached ? (
                          <button
                            type="button"
                            onClick={() => handleAddCombo(combo)}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-xs text-center"
                            title="Ya tenés todas las unidades disponibles en tu carrito"
                          >
                            <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
                            <span>En carrito (máx.)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddCombo(combo)}
                            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white transition-all shadow-sm cursor-pointer ${
                              isAdded
                                ? "bg-emerald-600 shadow-emerald-900/20"
                                : "bg-emerald-500 hover:bg-emerald-600 active:scale-95 shadow-emerald-900/20"
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check size={14} /> ¡Agregado!
                              </>
                            ) : (
                              <>
                                <ShoppingCart size={14} /> {inCartQty > 0 ? `Comprar (${inCartQty})` : "Comprar"}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-line bg-white dark:bg-card p-12 text-center space-y-3">
              <PackageCheck size={40} className="mx-auto text-slate-400" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                No encontramos combos con los filtros seleccionados
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Probá quitando algunos filtros o buscando con otros términos.
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors"
              >
                Ver todos los combos
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
