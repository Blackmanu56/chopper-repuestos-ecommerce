"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ComboDTO } from "@/actions/combos";
import { useCart } from "@/context/CartContext";
import { useConfig } from "@/context/ConfigContext";
import {
  ShoppingCart,
  ChevronRight,
  ChevronLeft,
  PackageCheck,
  ShieldCheck,
  Truck,
  MapPin,
  CheckCircle2,
  Sparkles,
  MessageCircle,
  Star,
  Wrench,
  ThumbsUp,
  FileText,
  Bike,
  AlertTriangle,
  CreditCard,
  Check,
  ShieldAlert,
  Lock,
} from "lucide-react";
import CuotasModal from "@/components/products/CuotasModal";
import { ProductSpec } from "@/lib/productMetadata";

interface ComboDetailClientProps {
  combo: ComboDTO;
  otherCombos: ComboDTO[];
}

export default function ComboDetailClient({ combo, otherCombos }: ComboDetailClientProps) {
  const { addToCart, isStaff, getItemCartQuantity, getRemainingStock } = useCart();
  const { shouldShowAhorroBadge, calcularCuotas } = useConfig();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [showCuotasModal, setShowCuotasModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"descripcion" | "componentes" | "specs" | "motos" | "compra">("descripcion");
  const [activeImage, setActiveImage] = useState<string>(combo.imagen || "/combos/combo-service-motul.jpg");
  const otherCombosScrollRef = useRef<HTMLDivElement>(null);

  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");

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
  const hasStock = combo.stockCalculado > 0;
  const isLimitReached = hasStock && remainingStock <= 0;
  const isLowStock = hasStock && combo.stockCalculado <= 5;

  const scrollCombos = (direction: "left" | "right") => {
    if (otherCombosScrollRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      otherCombosScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Galería de fotos del combo: kit principal + fotos reales de repuestos incluidos
  const getComboGallery = () => {
    const main = combo.imagen || "/combos/combo-service-motul.jpg";
    const itemImages = (combo.items || [])
      .map((it) => it.producto.imagen)
      .filter((img): img is string => Boolean(img));

    const images = [{ id: 1, url: main, label: "Kit Completo Armado" }];
    itemImages.forEach((url, index) => {
      images.push({
        id: index + 2,
        url,
        label: combo.items?.[index]?.producto?.nombre || `Componente ${index + 1}`,
      });
    });

    return images;
  };

  const galleryImages = getComboGallery();

  const handleAddToCart = () => {
    if (isStaff || !hasStock) return;
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
        componentes: componentesCombo,
      } as any,
      qty
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (isStaff || !hasStock) return;
    if (isLimitReached) {
      router.push("/carrito");
      return;
    }
    handleAddToCart();
    router.push("/carrito");
  };

  const financiacion = calcularCuotas(combo.precio);
  const cuota = financiacion.valorCuota;

  const hasOffer = Boolean(combo.enOferta && combo.precioRegular && combo.precioRegular > combo.precio);
  const regular = hasOffer && combo.precioRegular ? combo.precioRegular : combo.precio;
  const ahorro = hasOffer && combo.precioRegular ? Math.max(0, combo.precioRegular - combo.precio) : 0;
  const especificaciones: ProductSpec[] = combo.especificaciones || [];
  const motosCompatibles: string[] = combo.motosCompatibles || [];

  return (
    <div className="space-y-8 pb-12">
      {/* Breadcrumb de navegación */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-brand transition-colors">
          Inicio
        </Link>
        <ChevronRight size={13} />
        <Link href="/combos" className="hover:text-brand transition-colors">
          Combos Armados
        </Link>
        <ChevronRight size={13} />
        <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[240px] sm:max-w-none">
          {combo.nombre}
        </span>
      </nav>

      {/* Tarjeta Principal del Combo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 rounded-3xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 md:p-8 shadow-sm">
        {/* Columna Izquierda: Galería Interactiva con 4 Fotos */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="relative aspect-4/3 w-full rounded-2xl bg-white dark:bg-surface border border-slate-200 dark:border-line/60 overflow-hidden flex items-center justify-center p-4 shadow-sm group">
            {/* Badges superiores */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 items-start">
              {hasOffer && shouldShowAhorroBadge(ahorro) && (
                <span className="rounded-lg bg-brand px-3 py-1 text-xs font-black uppercase text-white shadow-md">
                  AHORRÁ {formatPrice(ahorro)} ({combo.descuentoPorcentaje}% OFF)
                </span>
              )}
              {combo.badge && (
                <span className="rounded-lg border border-brand/40 bg-brand/10 dark:bg-brand/20 px-2.5 py-0.5 text-xs font-bold text-brand backdrop-blur-sm">
                  {combo.badge}
                </span>
              )}
            </div>

            <img
              src={activeImage || combo.imagen || "/combos/combo-service-motul.jpg"}
              alt={combo.nombre}
              className="h-full w-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          {/* Miniaturas Interactivas (si hay más de 1 imagen) */}
          {galleryImages.length > 1 && (
            <div className="flex items-center gap-3">
              {galleryImages.map((img, idx) => {
                const isActive = (activeImage || combo.imagen) === img.url || (!activeImage && idx === 0);
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImage(img.url)}
                    title={img.label}
                    className={`relative h-16 w-16 sm:h-18 sm:w-18 rounded-xl p-1 bg-white shadow-sm overflow-hidden flex items-center justify-center transition-all cursor-pointer ${
                      isActive
                        ? "border-2 border-brand ring-2 ring-brand/30 scale-105"
                        : "border border-slate-200 dark:border-line opacity-75 hover:opacity-100 hover:border-slate-400"
                    }`}
                  >
                    <img src={img.url} alt={img.label} className="h-full w-full object-contain" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Garantías de compra en Posadas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-surface p-2.5 border border-slate-100 dark:border-line/40 text-xs">
              <MapPin size={16} className="text-emerald-500 shrink-0" />
              <span className="font-medium text-slate-700 dark:text-slate-300">Retiro en local Posadas</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-surface p-2.5 border border-slate-100 dark:border-line/40 text-xs">
              <Truck size={16} className="text-brand shrink-0" />
              <span className="font-medium text-slate-700 dark:text-slate-300">Envíos Motomandado</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-surface p-2.5 border border-slate-100 dark:border-line/40 text-xs">
              <ShieldCheck size={16} className="text-amber-500 shrink-0" />
              <span className="font-medium text-slate-700 dark:text-slate-300">Garantía oficial Chopper</span>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Título, Precios y Acciones */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <Sparkles size={13} />
                <span>Kit de Repuestos con Descuento Especial</span>
              </span>

              {/* Badge de verificación oficial */}
              <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-surface px-2.5 py-1 rounded-full border border-slate-200 dark:border-line">
                <Check size={13} className="text-emerald-500" />
                <span>Kit Oficial Verificado</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
              {combo.nombre}
            </h1>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {combo.descripcion}
            </p>
          </div>

          {/* Bloque de Precios y Cuotas */}
          <div className="rounded-2xl border border-slate-200 dark:border-line bg-slate-50/70 dark:bg-surface/50 p-5 space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-3">
                {hasOffer && combo.precioRegular && (
                  <span className="text-sm text-slate-400 line-through">
                    {formatPrice(combo.precioRegular)}
                  </span>
                )}
                <span className="text-3xl sm:text-4xl font-black text-brand tracking-tight">
                  {formatPrice(combo.precio)}
                </span>
              </div>
              {hasOffer && shouldShowAhorroBadge(combo.ahorro) && (
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  Ahorrás {formatPrice(combo.ahorro)} ({combo.descuentoPorcentaje}% OFF)
                </span>
              )}
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              Pago en efectivo o transferencia bancaria al retirar o recibir.
            </div>

            {/* Disponibilidad de stock */}
            <div className="pt-1">
              {hasStock ? (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 w-fit">
                  <CheckCircle2 size={15} />
                  <span>Stock disponible en local ({combo.stockCalculado} unidades)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-bold text-red-500 bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20 w-fit">
                  <AlertTriangle size={15} />
                  <span>Sin stock disponible en este momento</span>
                </div>
              )}
            </div>

            {/* Pill Cuotas */}
            {financiacion.habilitadas && (
              <div
                onClick={() => setShowCuotasModal(true)}
                className="flex items-center justify-between rounded-xl bg-amber-400 py-2.5 px-3.5 text-xs font-black text-slate-950 shadow-sm cursor-pointer hover:bg-amber-300 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>💳</span>
                  <span>
                    {financiacion.sinInteres
                      ? `${financiacion.cuotas} CUOTAS SIN INTERÉS`
                      : `${financiacion.cuotas} CUOTAS FIJAS`}
                  </span>
                  <span className="text-[11px] font-bold text-slate-800">
                    ({formatPrice(cuota)} / mes)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCuotasModal(true);
                  }}
                  className="text-[11px] font-black uppercase underline tracking-wider hover:text-slate-800 cursor-pointer"
                >
                  Ver cuotas &gt;
                </button>
              </div>
            )}
          </div>

          {/* Avisos de Stock para el Combo */}
          {!hasStock ? (
            <div className="rounded-xl border border-red-500/30 bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-800 dark:text-red-300 flex items-center gap-2.5">
              <AlertTriangle size={16} className="text-red-600 dark:text-red-400 shrink-0" />
              <span>
                <strong>SIN STOCK FÍSICO</strong> — Uno o más componentes de este kit no cuentan con existencias suficientes en Posadas.
              </span>
            </div>
          ) : isLowStock ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2.5">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>¡ÚLTIMOS {combo.stockCalculado} KITS DISPONIBLES!</strong> — Stock limitado según disponibilidad de los repuestos en el local.
              </span>
            </div>
          ) : null}

          {/* Aviso si ya alcanzó el límite en el carrito */}
          {isLimitReached && hasStock && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
              <Check size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Ya tenés todos los kits disponibles en tu carrito ({inCartQty} de {combo.stockCalculado} u.).
              </span>
            </div>
          )}

          {/* Botones de Compra y Carrito */}
          <div className="space-y-3">
            {hasStock ? (
              <>
                <div className="flex items-center gap-3">
                  {/* Selector de cantidad */}
                  <div className="flex items-center border border-slate-300 dark:border-line rounded-xl bg-white dark:bg-surface overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      disabled={qty <= 1 || isLimitReached}
                      className="px-3.5 py-3 hover:bg-slate-100 dark:hover:bg-card text-slate-800 dark:text-white font-bold text-sm transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <span className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-white min-w-[40px] text-center">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.min(remainingStock, q + 1))}
                      disabled={isStaff || isLimitReached || qty >= remainingStock}
                      className="px-3.5 py-3 hover:bg-slate-100 dark:hover:bg-card text-slate-800 dark:text-white font-bold text-sm transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      title={qty >= remainingStock ? "Límite de stock disponible alcanzado" : "Aumentar cantidad"}
                    >
                      +
                    </button>
                  </div>

                  {/* Botón secundario: Agregar al Carrito */}
                  {isStaff ? (
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-line bg-slate-100 dark:bg-surface py-3 px-4 text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed"
                    >
                      <Lock size={15} />
                      <span>COMPRA BLOQUEADA</span>
                    </button>
                  ) : isLimitReached ? (
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20 py-3 px-4 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-xs"
                      title="Ya tenés todas las unidades disponibles en tu carrito"
                    >
                      <Check size={16} />
                      <span>LÍMITE EN CARRITO ({combo.stockCalculado} u.)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-line bg-slate-100 dark:bg-surface py-3 px-4 text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:border-brand hover:text-brand shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      {added ? (
                        <>
                          <CheckCircle2 size={16} className="text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">¡Agregado al Carrito!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={16} />
                          <span>AGREGAR AL CARRITO</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Aviso informativo si es personal */}
                {isStaff && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2.5">
                    <ShieldAlert size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Estás utilizando una cuenta de personal. Para realizar compras, ingresá con una cuenta de cliente.</span>
                  </div>
                )}

                {/* Botón Principal: Comprar Ahora */}
                {isStaff ? (
                  <button
                    type="button"
                    disabled
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-200 dark:bg-surface py-3.5 px-6 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-not-allowed border border-slate-300 dark:border-line"
                  >
                    <Lock size={16} className="text-amber-500" />
                    <span>Solo consulta (Personal)</span>
                  </button>
                ) : isLimitReached ? (
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3.5 px-6 text-sm font-black text-white uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>IR A FINALIZAR COMPRA</span>
                    <ChevronRight size={18} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brandhover py-3.5 px-6 text-sm font-black text-white uppercase tracking-wider shadow-lg shadow-brand/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>COMPRAR AHORA</span>
                    <ChevronRight size={18} />
                  </button>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500 py-3.5 px-4 text-xs sm:text-sm font-bold cursor-not-allowed"
                >
                  Combo momentáneamente sin stock
                </button>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                  Uno o más componentes no tienen stock disponible en inventario. Podés consultar reposición por WhatsApp.
                </p>
              </div>
            )}

            {/* Botón WhatsApp */}
            <a
              href={`https://wa.me/5493765243554?text=${encodeURIComponent(
                hasStock
                  ? `Hola Chopper Repuestos! Me interesa consultar sobre el ${combo.nombre} ($${combo.precio})`
                  : `Hola Chopper Repuestos! Quería consultar cuándo reingresa stock del ${combo.nombre}.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-line bg-transparent hover:bg-slate-100 dark:hover:bg-surface py-2.5 px-3 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
            >
              <MessageCircle size={15} className="text-emerald-500" />
              <span>{hasStock ? "Consultar por WhatsApp con un vendedor" : "Consultar reposición por WhatsApp"}</span>
            </a>

            {/* Beneficios de entrega y retiro */}
            <div className="pt-2 border-t border-slate-200 dark:border-line/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-surface border border-slate-200/60 dark:border-line/40">
                <MapPin size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-[11px]">Retiro gratis en el local</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Av. Roque Sáenz Peña 1500 (Posadas)</div>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-surface border border-slate-200/60 dark:border-line/40">
                <Truck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-[11px]">Envíos en el día</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Motomandado y Moto Uber en Posadas</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ FICHA DE DETALLE DEL COMBO (5 SOLAPAS HORIZONTALES) ═══════════ */}
      <section className="space-y-4">
        {/* Selector de solapas horizontales */}
        <div className="flex border-b border-slate-200 dark:border-line text-xs font-bold overflow-x-auto scrollbar-none gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("descripcion")}
            className={`pb-3 px-4 border-b-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === "descripcion"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-black"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Descripción
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("componentes")}
            className={`pb-3 px-4 border-b-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === "componentes"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-black"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Componentes incluidos ({combo.items?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("specs")}
            className={`pb-3 px-4 border-b-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === "specs"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-black"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Especificaciones técnicas ({especificaciones.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("motos")}
            className={`pb-3 px-4 border-b-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === "motos"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-black"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Motos compatibles ({motosCompatibles.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("compra")}
            className={`pb-3 px-4 border-b-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === "compra"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-black"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Información de compra y cuotas
          </button>
        </div>

        {/* CONTENEDOR DE LA PESTAÑA ACTIVA */}
        <div className="rounded-3xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 md:p-8 shadow-sm">
          {/* TAB 1: DESCRIPCIÓN */}
          {activeTab === "descripcion" && (
            <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Acerca de este combo
              </h2>
              <p className="whitespace-pre-line">
                {combo.descripcion || "Kit de repuestos seleccionado y preparado para brindar la máxima durabilidad y rendimiento en tu moto."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-surface border border-slate-100 dark:border-line/40">
                  <PackageCheck size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs">Kit Listo para Instalar</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Todos los componentes necesarios en una sola compra.</div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-surface border border-slate-100 dark:border-line/40">
                  <ShieldCheck size={18} className="text-brand shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs">Garantía Oficial</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">100% nuevos en caja cerrada con garantía de fábrica.</div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-surface border border-slate-100 dark:border-line/40">
                  <MapPin size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs">Retiro o Envío Inmediato</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">En Av. Roque Sáenz Peña 1500 (Posadas) o motomandado.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMPONENTES INCLUIDOS */}
          {activeTab === "componentes" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-line pb-3">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <PackageCheck size={20} className="text-emerald-500" />
                    <span>Componentes Incluidos ({combo.items?.length || 0})</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Cada componente es verificado antes de la entrega para asegurar máxima compatibilidad.
                  </p>
                </div>
              </div>

              {combo.items && combo.items.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {combo.items.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center gap-3.5 rounded-2xl border border-slate-200 dark:border-line bg-slate-50/60 dark:bg-surface p-3.5 hover:border-brand/40 transition-colors"
                    >
                      <div className="relative h-16 w-16 shrink-0 rounded-xl bg-white dark:bg-card border border-slate-100 dark:border-line/60 p-1.5 flex items-center justify-center overflow-hidden">
                        {it.producto.imagen ? (
                          <img
                            src={it.producto.imagen}
                            alt={it.producto.nombre}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-lg">⚙️</span>
                        )}
                        {it.cantidad > 1 && (
                          <span className="absolute top-1 right-1 rounded-md bg-brand px-1.5 py-0.2 text-[9px] font-black text-white shadow">
                            {it.cantidad}x
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-[10px] text-brand font-bold uppercase">
                          <span>{it.producto.marca || "Chopper"}</span>
                          <span>·</span>
                          <span className="text-slate-500 dark:text-slate-400">
                            Cantidad: {it.cantidad}
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                          {it.producto.nombre}
                        </h3>
                        <div className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                          {formatPrice(it.producto.precioVenta)} c/u
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No hay componentes detallados para este combo.</p>
              )}
            </div>
          )}

          {/* TAB 3: ESPECIFICACIONES TÉCNICAS */}
          {activeTab === "specs" && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 dark:border-line pb-3">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText size={20} className="text-emerald-500" />
                  <span>Especificaciones Técnicas</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Ficha técnica detallada provista por el fabricante y verificada por nuestros mecánicos.
                </p>
              </div>

              {especificaciones.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {especificaciones.map((spec: ProductSpec, sIdx: number) => (
                    <div
                      key={sIdx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-surface border border-slate-100 dark:border-line/40"
                    >
                      <span className="font-semibold text-slate-500 dark:text-slate-400">{spec.caracteristica}:</span>
                      <span className="font-bold text-slate-900 dark:text-white text-right">{spec.valor}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface border border-slate-100 dark:border-line/40 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white block">Estándar de Fabricación</span>
                    <span className="text-slate-600 dark:text-slate-400">Repuestos de reposición homologados con especificaciones y tolerancias originales OEM.</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface border border-slate-100 dark:border-line/40 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white block">Condición</span>
                    <span className="text-slate-600 dark:text-slate-400">100% nuevos en empaque cerrado y sellado de fábrica.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MOTOS COMPATIBLES */}
          {activeTab === "motos" && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 dark:border-line pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Bike size={20} className="text-brand" />
                    <span>Motos Compatibles</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Modelos verificados compatibles con este combo o kit.
                  </p>
                </div>

                <a
                  href={`https://wa.me/5493765243554?text=${encodeURIComponent(
                    `Hola Chopper Repuestos! Quería consultar si el combo ${combo.nombre} es compatible con mi moto (modelo y año):`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/20 transition-colors w-fit"
                >
                  <MessageCircle size={14} />
                  <span>¿Dudas con tu modelo? Consultar por WhatsApp</span>
                </a>
              </div>

              {motosCompatibles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {motosCompatibles.map((moto: string, mIdx: number) => (
                    <span
                      key={mIdx}
                      className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-surface border border-slate-200 dark:border-line text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold"
                    >
                      <Bike size={13} className="text-brand" />
                      <span>{moto}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface border border-slate-100 dark:border-line/40 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                  <p>
                    Compatible con los modelos más habituales de 110cc a 250cc (Honda Wave, CG 150 Titan, XR 150/190/250, Yamaha YBR 125, FZ 16, Motomel Blitz 110, Corven Energy 110, Gilera Smash y similares).
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Ante cualquier duda con tu modelo o cilindrada exacta, consultanos por WhatsApp antes de comprar.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: INFORMACIÓN DE COMPRA Y CUOTAS */}
          {activeTab === "compra" && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 dark:border-line pb-3">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard size={20} className="text-amber-500" />
                  <span>Información de Compra, Medios de Pago y Envíos</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Todo lo que necesitás saber para pagar y recibir tu combo en Posadas y Misiones.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Métodos de Pago */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-surface border border-slate-100 dark:border-line/40 space-y-2.5">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <span>💳</span>
                    <span>Medios de Pago Aceptados</span>
                  </h3>
                  <ul className="space-y-1.5 text-slate-700 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-500 shrink-0" />
                      <span><strong>Efectivo en mostrador:</strong> Abonás al retirar en nuestro local.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-500 shrink-0" />
                      <span><strong>Transferencia Bancaria:</strong> Pagás de forma segura y subís tu comprobante.</span>
                    </li>
                    {financiacion.habilitadas && (
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-amber-500 shrink-0" />
                        <span>
                          <strong>Cuotas con tarjeta:</strong> {financiacion.sinInteres ? `${financiacion.cuotas} cuotas sin interés` : `${financiacion.cuotas} cuotas fijas`} de {formatPrice(cuota)}
                        </span>
                      </li>
                    )}
                  </ul>
                  {financiacion.habilitadas && (
                    <button
                      type="button"
                      onClick={() => setShowCuotasModal(true)}
                      className="text-[11px] font-bold text-amber-500 hover:text-amber-400 underline cursor-pointer mt-1 inline-block"
                    >
                      Ver tabla completa de cuotas &gt;
                    </button>
                  )}
                </div>

                {/* Retiro y Envíos */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-surface border border-slate-100 dark:border-line/40 space-y-2.5">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <Truck size={15} className="text-brand" />
                    <span>Retiro en Local y Envíos</span>
                  </h3>
                  <ul className="space-y-1.5 text-slate-700 dark:text-slate-300">
                    <li className="flex items-start gap-2">
                      <MapPin size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span><strong>Retiro sin costo:</strong> En Av. Roque Sáenz Peña 1500, Posadas. Tu pedido se prepara en menos de 1 hora.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Truck size={14} className="text-brand shrink-0 mt-0.5" />
                      <span><strong>Motomandado / Moto Uber en Posadas:</strong> Envío rápido en el día a Posadas y Garupá coordinando por WhatsApp.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECCIÓN INFORMATIVA DE BENEFICIOS Y ENTREGA */}
      <section className="rounded-3xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 md:p-8 shadow-sm space-y-6">
        <div className="border-b border-slate-200 dark:border-line pb-4">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Sparkles size={22} className="text-brand" />
            <span>Beneficios del Kit y Entregas en Posadas</span>
          </h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Todo lo que necesitás saber sobre la compra de kits y combos armados en Chopper Repuestos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-line bg-slate-50/50 dark:bg-surface/50 p-5 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
              <Sparkles size={18} className="text-brand shrink-0" />
              <span>Ahorro Garantizado en Conjunto</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Comprar en combo te permite acceder a un precio promocional inferior al valor individual de cada componente sumado por separado.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-line bg-slate-50/50 dark:bg-surface/50 p-5 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
              <span>Stock Sincronizado en Local</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              La disponibilidad del combo se valida en tiempo real contra el stock real de cada repuesto en nuestro depósito de Av. Roque Sáenz Peña 1500.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-line bg-slate-50/50 dark:bg-surface/50 p-5 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
              <Truck size={18} className="text-amber-500 shrink-0" />
              <span>Retiro Inmediato o Envío</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Retirá sin costo en mostrador de Posadas o solicitá el envío directo en el día por Motomandado a cualquier punto de Posadas y Garupá.
            </p>
          </div>
        </div>
      </section>

      {/* OTROS COMBOS RECOMENDADOS (Horizontal Slider con botones < >) */}
      {otherCombos && otherCombos.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-slate-200 dark:border-line">
          <div className="flex items-center justify-between pb-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Otros Combos <span className="text-brand">Recomendados</span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Más kits armados con descuento para equipar o reparar tu moto.
              </p>
            </div>
            <Link
              href="/combos"
              className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
            >
              <span>Ver todos los combos</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="relative group">
            {/* Botón Scroll Izquierda */}
            <button
              type="button"
              onClick={() => scrollCombos("left")}
              className="absolute -left-2 sm:-left-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-9 sm:w-10 items-center justify-center rounded-lg bg-neutral-900/85 hover:bg-neutral-800 text-white shadow-xl border border-neutral-700/60 backdrop-blur-sm transition-all active:scale-95 cursor-pointer hover:border-brand/60"
              aria-label="Combo anterior"
            >
              <ChevronLeft size={22} />
            </button>

            {/* Botón Scroll Derecha */}
            <button
              type="button"
              onClick={() => scrollCombos("right")}
              className="absolute -right-2 sm:-right-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-9 sm:w-10 items-center justify-center rounded-lg bg-neutral-900/85 hover:bg-neutral-800 text-white shadow-xl border border-neutral-700/60 backdrop-blur-sm transition-all active:scale-95 cursor-pointer hover:border-brand/60"
              aria-label="Siguiente combo"
            >
              <ChevronRight size={22} />
            </button>

            {/* Pista Deslizable */}
            <div
              ref={otherCombosScrollRef}
              className="flex gap-4 overflow-x-auto scroll-smooth scrollbar-none pb-4 pt-1 px-1"
            >
              {otherCombos.map((c) => (
                <Link
                  key={c.id}
                  href={`/combos/${c.id}`}
                  className="w-[240px] sm:w-[280px] shrink-0 group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-4 hover:border-brand/70 hover:shadow-xl transition-all shadow-sm"
                >
                  <div>
                    <div className="relative aspect-4/3 w-full rounded-xl bg-white dark:bg-surface overflow-hidden p-2 mb-3 border border-slate-100 dark:border-line/40">
                      {/* Ahorro badge */}
                      {shouldShowAhorroBadge(c.ahorro) && (
                        <div className="absolute top-2 left-2 z-10">
                          <span className="rounded-md bg-brand px-2 py-0.5 text-[10px] font-black uppercase text-white shadow-sm">
                            AHORRÁ {formatPrice(c.ahorro)}
                          </span>
                        </div>
                      )}
                      <img
                        src={c.imagen || "/combos/combo-service-motul.jpg"}
                        alt={c.nombre}
                        className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span className="font-bold text-brand uppercase">Combo Armado</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">● Stock Posadas</span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-brand transition-colors">
                      {c.nombre}
                    </h3>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-line/60 flex items-center justify-between">
                    <div>
                      {c.enOferta && c.precioRegular && (
                        <div className="text-[11px] text-slate-400 line-through">
                          {formatPrice(c.precioRegular)}
                        </div>
                      )}
                      <div className="text-base font-black text-brand">
                        {formatPrice(c.precio)}
                      </div>
                    </div>
                    <span className="rounded-xl bg-brand hover:bg-brandhover px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95">
                      Ver Kit
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Modal de Cuotas y Financiación */}
      <CuotasModal
        isOpen={showCuotasModal}
        onClose={() => setShowCuotasModal(false)}
        precio={combo.precio}
        titulo={combo.nombre}
      />
    </div>
  );
}
