"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { validarPreciosServerAction } from "@/actions/commercial";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Package,
  Layers,
  Sparkles,
  ChevronRight,
  X,
} from "lucide-react";

function ProductImageThumb({ src, alt }: { src?: string | null; alt: string }) {
  const [hasError, setHasError] = useState(false);

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className="h-full w-full object-contain p-1"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-surface text-slate-400 p-2">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-7 h-7 text-slate-400 dark:text-slate-500"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </div>
  );
}

export default function CarritoPage() {
  const router = useRouter();
  const { items, updateQuantity, removeFromCart, clearCart, sincronizarCarrito, subtotal, isStaff, getRemainingStock } = useCart();
  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [stockIssues, setStockIssues] = useState<string[]>([]);

  // Sincronizar y validar en tiempo real los precios y el stock disponible con la base de datos
  const sincronizarConServidor = async (silencioso = false) => {
    if (items.length === 0) return;
    if (!silencioso) setIsValidating(true);

    try {
      const res = await validarPreciosServerAction(
        items.map((i) => ({
          id: i.id,
          cantidad: i.cantidad,
          esCombo: Boolean(i.esCombo),
          cartItemId: i.cartItemId,
        }))
      );

      if (res.success && res.items) {
        sincronizarCarrito(res.items);
        if (res.warnings && res.warnings.length > 0) {
          setStockIssues(res.warnings);
          setSyncNotice("Se actualizaron precios o disponibilidad según el stock real en el local.");
        } else {
          setStockIssues([]);
          if (!silencioso) {
            setSyncNotice("Precios y stock actualizados en tiempo real.");
            setTimeout(() => setSyncNotice(null), 3000);
          }
        }
      } else if (res.error) {
        setStockIssues([res.error]);
      }
    } catch (e) {
      console.error("Error sincronizando carrito:", e);
    } finally {
      if (!silencioso) setIsValidating(false);
    }
  };

  useEffect(() => {
    if (items.length > 0) {
      sincronizarConServidor(true);
    }
  }, []);

  // Verificar si hay algún item con stock insuficiente o nulo
  const itemsConProblemasStock = items.filter(
    (item) => item.stock <= 0 || item.cantidad > item.stock
  );
  const hayBloqueoStock = itemsConProblemasStock.length > 0;

  const totalArticulos = items.reduce((acc, item) => acc + item.cantidad, 0);

  return (
    <div className="max-w-5xl mx-auto mt-4 px-4 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-brand transition-colors">
          Inicio
        </Link>
        <span>&gt;</span>
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          Carrito de compras
        </span>
      </nav>

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-line pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Tu carrito
            </h1>
            {items.length > 0 && (
              <span className="rounded-full bg-brand/10 border border-brand/30 px-2.5 py-0.5 text-xs font-black text-brand">
                {totalArticulos} {totalArticulos === 1 ? "unidad" : "unidades"}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Revisá tus repuestos seleccionados antes de avanzar al checkout.
          </p>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => sincronizarConServidor(false)}
              disabled={isValidating}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-line bg-white dark:bg-surface px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-brand dark:hover:text-white hover:border-brand transition-all active:scale-95"
              title="Actualizar precios y stock en vivo"
            >
              <RefreshCw size={13} className={isValidating ? "animate-spin text-brand" : ""} />
              <span className="hidden sm:inline">Actualizar stock</span>
            </button>

            <button
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all active:scale-95"
              title="Vaciar todo el carrito"
            >
              <Trash2 size={13} />
              <span>Vaciar carrito</span>
            </button>
          </div>
        )}
      </div>

      {/* Alerta de sincronización o advertencia de stock */}
      {syncNotice && (
        <div className="rounded-xl border border-sky-500/30 bg-sky-50 dark:bg-sky-950/30 p-3.5 text-xs text-sky-800 dark:text-sky-300 flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <RefreshCw size={15} className="text-sky-600 dark:text-sky-400 shrink-0" />
            <span>{syncNotice}</span>
          </div>
          <button
            onClick={() => setSyncNotice(null)}
            className="text-sky-600 hover:text-sky-800 dark:hover:text-sky-200"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {isStaff && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-sm animate-in fade-in">
          <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Cuenta de personal detectada</p>
            <p className="text-amber-800 dark:text-amber-300">
              Estás utilizando una cuenta de personal. Para realizar compras, ingresá con una cuenta de cliente.
            </p>
          </div>
        </div>
      )}

      {hayBloqueoStock && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-sm animate-in fade-in">
          <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">
              Disponibilidad limitada de repuestos
            </p>
            <p className="text-amber-800 dark:text-amber-300">
              Algunos productos seleccionados superan el stock físico disponible en el local. Por favor ajustá las cantidades marcadas para poder finalizar tu pedido.
            </p>
            {stockIssues.length > 0 && (
              <ul className="list-disc list-inside mt-1.5 space-y-0.5 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                {stockIssues.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      {items.length === 0 ? (
        /* ESTADO VACÍO AGRADABLE */
        <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-10 sm:p-14 text-center space-y-5 shadow-sm max-w-xl mx-auto my-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand/10 border border-brand/20 text-brand mx-auto shadow-inner">
            <ShoppingBag size={40} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Tu carrito está vacío
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Explorá nuestro catálogo de repuestos oficiales, cubiertas, aceites y combos especiales para tu moto con entrega en Posadas.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/ofertas"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-xs font-bold text-white hover:bg-brandhover shadow-lg shadow-brand/20 transition-all active:scale-95"
            >
              <span>Explorar productos</span>
              <ArrowRight size={14} />
            </Link>

            <Link
              href="/combos"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-line bg-white dark:bg-surface px-5 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 transition-all"
            >
              <Layers size={14} className="text-amber-500" />
              <span>Ver combos con descuento</span>
            </Link>
          </div>

          {/* Accesos rápidos sugeridos */}
          <div className="pt-6 border-t border-slate-100 dark:border-line/60">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Categorías más buscadas
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/ofertas?q=aceite"
                className="rounded-lg bg-slate-100 dark:bg-surface px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-brand hover:bg-brand/10 transition-colors"
              >
                🛢️ Aceites y Lubricantes
              </Link>
              <Link
                href="/ofertas?q=cubierta"
                className="rounded-lg bg-slate-100 dark:bg-surface px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-brand hover:bg-brand/10 transition-colors"
              >
                🏍️ Cubiertas y Cámaras
              </Link>
              <Link
                href="/ofertas?q=freno"
                className="rounded-lg bg-slate-100 dark:bg-surface px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-brand hover:bg-brand/10 transition-colors"
              >
                🛑 Frenos y Pastillas
              </Link>
              <Link
                href="/ofertas?q=transmision"
                className="rounded-lg bg-slate-100 dark:bg-surface px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-brand hover:bg-brand/10 transition-colors"
              >
                ⚙️ Kits de Transmisión
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* LISTADO Y RESUMEN DEL CARRITO */
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Listado de items */}
          <div className="lg:col-span-8 space-y-3">
            {items.map((item) => {
              const itemTotal = item.precio * item.cantidad;
              const sinStock = item.stock <= 0;
              const superaStock = item.cantidad > item.stock;
              const remainingStock = getRemainingStock(item);
              const maxAlcanzado = item.cantidad >= item.stock || remainingStock <= 0;
              const itemKey = item.cartItemId || (item.esCombo ? `combo-${item.id}` : `prod-${item.id}`);

              return (
                <div
                  key={itemKey}
                  className={`rounded-2xl border bg-white dark:bg-card p-4 transition-all shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 ${
                    sinStock || superaStock
                      ? "border-red-400 dark:border-red-500/50 bg-red-50/20 dark:bg-red-950/10"
                      : "border-slate-200 dark:border-line hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {/* Foto del Producto / Combo (sin logos de marca) */}
                  <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-surface border border-slate-200 dark:border-line/70 overflow-hidden">
                    <ProductImageThumb src={item.imagen} alt={item.nombre} />
                    {item.esCombo && (
                      <span className="absolute top-1 left-1 rounded bg-amber-500 px-1.5 py-0.2 text-[9px] font-black uppercase text-slate-950">
                        Combo
                      </span>
                    )}
                  </div>

                  {/* Información del Producto */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded bg-slate-100 dark:bg-surface px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-line/60">
                        {item.marca || "Chopper"}
                      </span>
                      {item.categoriaNombre && (
                        <span className="text-[11px] text-slate-500 font-medium">
                          {item.categoriaNombre}
                        </span>
                      )}
                    </div>

                    <Link
                      href={item.esCombo ? `/combos/${item.id}` : `/producto/${item.id}`}
                      className="text-sm font-bold text-slate-900 dark:text-white hover:text-brand transition-colors block line-clamp-2"
                      title={item.nombre}
                    >
                      {item.nombre}
                    </Link>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        Precio unitario:
                      </span>
                      <strong className="text-slate-900 dark:text-white font-bold">
                        {formatPrice(item.precio)}
                      </strong>
                    </div>

                    {/* Alertas de Stock */}
                    {sinStock ? (
                      <p className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        Sin stock disponible en el local
                      </p>
                    ) : superaStock ? (
                      <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        Supera el stock disponible ({item.stock} u. en mostrador)
                      </p>
                    ) : (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ {item.stock} unidades disponibles en Posadas
                      </p>
                    )}
                  </div>

                  {/* Acciones: Cantidad, Subtotal y Botón de Papelera */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-line/60">
                    {/* Selector de cantidad + y - */}
                    <div className="flex items-center rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface shadow-xs">
                      <button
                        type="button"
                        onClick={() => updateQuantity(itemKey, -1, item.esCombo)}
                        disabled={item.cantidad <= 1}
                        className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:text-brand dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Disminuir cantidad"
                        aria-label="Disminuir cantidad"
                      >
                        <Minus size={13} />
                      </button>

                      <span className="w-8 text-center text-xs font-black text-slate-900 dark:text-white">
                        {item.cantidad}
                      </span>

                      <button
                        type="button"
                        onClick={() => updateQuantity(itemKey, 1, item.esCombo)}
                        disabled={maxAlcanzado || sinStock}
                        className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:text-brand dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={maxAlcanzado ? `Stock máximo alcanzado (${item.stock} u.)` : "Aumentar cantidad"}
                        aria-label="Aumentar cantidad"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div className="w-24 text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block sm:hidden">
                        Subtotal
                      </span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        {formatPrice(itemTotal)}
                      </span>
                    </div>

                    {/* Botón Papelera para eliminar directamente */}
                    <button
                      type="button"
                      onClick={() => removeFromCart(itemKey, item.esCombo)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-300 transition-colors border border-transparent"
                      title="Eliminar este repuesto del carrito"
                      aria-label="Eliminar producto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resumen lateral de compra */}
          <aside className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-5 sm:p-6 space-y-5 shadow-sm sticky top-24">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-line/60 pb-3">
              Resumen del pedido
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total de repuestos</span>
                <span className="font-bold text-slate-900 dark:text-white">{totalArticulos} unidades</span>
              </div>

              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal lista</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatPrice(subtotal)}</span>
              </div>

              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Retiro en mostrador</span>
                <span>¡Gratis!</span>
              </div>

              <div className="border-t border-slate-200 dark:border-line pt-3 flex items-baseline justify-between">
                <div>
                  <span className="text-sm font-black text-slate-900 dark:text-white block">
                    Total
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    IVA incluido
                  </span>
                </div>
                <span className="text-2xl font-black text-brand tracking-tight">
                  {formatPrice(subtotal)}
                </span>
              </div>
            </div>

            {/* Botón de Checkout */}
            {isStaff ? (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-xl bg-slate-200 dark:bg-surface py-3 text-xs font-bold text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-line flex items-center justify-center gap-2"
                >
                  <Lock size={14} className="text-amber-500" />
                  <span>Compras deshabilitadas para personal</span>
                </button>
                <p className="text-[11px] text-center text-amber-600 dark:text-amber-400 font-medium">
                  Para realizar compras, ingresá con una cuenta de cliente.
                </p>
              </div>
            ) : hayBloqueoStock ? (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-xl bg-slate-300 dark:bg-surface py-3 text-xs font-bold text-slate-500 dark:text-slate-500 border border-slate-300 dark:border-line"
                >
                  Finalizar pedido (Stock insuficiente)
                </button>
                <p className="text-[11px] text-center text-amber-600 dark:text-amber-400 font-medium">
                  Ajustá las cantidades para no superar el stock disponible.
                </p>
              </div>
            ) : (
              <Link
                href="/checkout"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand py-3 text-xs font-black text-white hover:bg-brandhover shadow-lg shadow-brand/25 transition-all active:scale-95"
              >
                <span>Finalizar pedido</span>
                <ArrowRight size={15} />
              </Link>
            )}

            {/* Garantías y beneficios de compra */}
            <div className="rounded-xl bg-slate-50 dark:bg-surface/50 border border-slate-200 dark:border-line/70 p-3.5 space-y-2.5 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                <ShieldCheck size={15} className="text-emerald-500 shrink-0" />
                <span>Compra protegida y repuestos oficiales</span>
              </div>
              <p className="leading-relaxed">
                Podés pagar por transferencia bancaria o en efectivo directamente al retirar en el local de Av. Roque Sáenz Peña 1500.
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN: VACIAR CARRITO */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-[#121318] p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 mx-auto">
              <Trash2 size={24} />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                ¿Vaciar el carrito de compras?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Se eliminarán todos los repuestos seleccionados ({totalArticulos} unidades). Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 rounded-xl border border-slate-300 dark:border-line bg-white dark:bg-surface py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  clearCart();
                  setShowClearConfirm(false);
                }}
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 py-2.5 text-xs font-bold text-white shadow-md shadow-red-600/20 transition-all active:scale-95"
              >
                Sí, vaciar carrito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
