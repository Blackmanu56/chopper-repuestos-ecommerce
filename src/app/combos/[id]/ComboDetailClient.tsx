"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Store,
  Info,
} from "lucide-react";
import { ProductSpec } from "@/lib/productMetadata";

interface ComboDetailClientProps {
  combo: ComboDTO;
  otherCombos: ComboDTO[];
}

export default function ComboDetailClient({ combo, otherCombos }: ComboDetailClientProps) {
  const { addToCart, isStaff, getItemCartQuantity, getRemainingStock } = useCart();
  const { shouldShowAhorroBadge } = useConfig();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState<"descripcion" | "componentes" | "specs" | "motos" | "compra">("descripcion");
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

  // Galería de fotos del combo: Portada (Foto 1) + Galería (Fotos 2, 3, 4) + Fotos de repuestos incluidos
  const getComboGallery = () => {
    const rawImages = (combo.imagenes && combo.imagenes.length > 0)
      ? combo.imagenes
      : (combo.imagen ? combo.imagen.split(",").map((s) => s.trim()).filter(Boolean) : []);

    const comboImages = rawImages.length > 0 ? rawImages : ["/combos/combo-service-motul.jpg"];

    const gallery: Array<{ id: string | number; url: string; label: string; isCover?: boolean }> = [];

    // 1. Fotos del combo definidas en el admin: Foto 1 es Portada, 2, 3 y 4 adicionales de galería
    comboImages.forEach((url, idx) => {
      gallery.push({
        id: `combo-img-${idx}`,
        url,
        label: idx === 0 ? "Kit Completo (Portada)" : `Foto ${idx + 1} del Combo`,
        isCover: idx === 0,
      });
    });

    // 2. Componentes incluidos que tengan foto real propia
    (combo.items || []).forEach((it, idx) => {
      if (it.producto?.imagen && !gallery.some((g) => g.url === it.producto.imagen)) {
        gallery.push({
          id: `item-img-${it.producto.id}`,
          url: it.producto.imagen,
          label: it.producto.nombre || `Repuesto ${idx + 1}`,
        });
      }
    });

    return gallery;
  };

  const galleryImages = getComboGallery();
  const [activeImage, setActiveImage] = useState<string>(galleryImages[0]?.url || combo.imagen || "/combos/combo-service-motul.jpg");
  const currentIdx = Math.max(
    0,
    galleryImages.findIndex((g) => g.url === (activeImage || galleryImages[0]?.url))
  );
  const currentImg = galleryImages[currentIdx] || galleryImages[0];

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

  const hasOffer = Boolean(combo.enOferta && combo.precioRegular && combo.precioRegular > combo.precio);
  const regular = hasOffer && combo.precioRegular ? combo.precioRegular : combo.precio;
  const ahorro = hasOffer && combo.precioRegular ? Math.max(0, combo.precioRegular - combo.precio) : 0;

  const ownSpecs: ProductSpec[] = combo.especificaciones || [];
  const compSpecs = combo.especificacionesComponentes || [];
  const totalSpecsCount = ownSpecs.length + compSpecs.reduce((acc, c) => acc + c.specs.length, 0);
  const hasSpecs = totalSpecsCount > 0;

  const ownMotos: string[] = combo.motosCompatibles || [];
  const compMotos = combo.motosCompatiblesComponentes || [];
  const totalMotosCount = ownMotos.length + compMotos.reduce((acc, c) => acc + c.motos.length, 0);
  const hasMotos = totalMotosCount > 0;

  // Si la pestaña activa actual no tiene contenido, volver a la descripción
  useEffect(() => {
    if (activeTab === "specs" && !hasSpecs) {
      setActiveTab("descripcion");
    }
    if (activeTab === "motos" && !hasMotos) {
      setActiveTab("descripcion");
    }
    if (activeTab === "componentes" && (!combo.items || combo.items.length === 0)) {
      setActiveTab("descripcion");
    }
  }, [activeTab, hasSpecs, hasMotos, combo.items]);

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

      {/* ═══════════ FICHA PRINCIPAL DEL COMBO (UNA SOLA TARJETA INTEGRADA) ═══════════ */}
      <div className="rounded-3xl border border-slate-200 dark:border-line bg-white dark:bg-card p-5 sm:p-6 lg:p-7 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* Columna Izquierda: Galería Integrada de Altura Completa */}
          <div className="lg:col-span-5 flex flex-col justify-between h-full gap-3">
            {/* Foto principal que se expande para aprovechar toda la altura disponible */}
            <div className="relative flex-1 min-h-[340px] lg:min-h-0 w-full flex items-center justify-center overflow-hidden rounded-2xl group">
              {/* Badges superiores */}
              <div className="absolute top-2 left-2 z-10 flex flex-col gap-1.5 items-start pointer-events-none">
                {hasOffer && shouldShowAhorroBadge(ahorro) && (
                  <span className="rounded-lg bg-brand px-2.5 py-1 text-[11px] font-black uppercase text-white shadow-md">
                    AHORRÁ {formatPrice(ahorro)} ({combo.descuentoPorcentaje}% OFF)
                  </span>
                )}
                {combo.badge && (
                  <span className="rounded-lg border border-brand/40 bg-brand/10 dark:bg-brand/20 px-2.5 py-0.5 text-xs font-bold text-brand backdrop-blur-sm">
                    {combo.badge}
                  </span>
                )}
              </div>

              {/* Flechas de navegación rápida en la imagen principal (si hay más de 1 imagen) */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const prevIdx = (currentIdx - 1 + galleryImages.length) % galleryImages.length;
                      setActiveImage(galleryImages[prevIdx].url);
                    }}
                    aria-label="Foto anterior"
                    title="Foto anterior"
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs cursor-pointer shadow-md"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextIdx = (currentIdx + 1) % galleryImages.length;
                      setActiveImage(galleryImages[nextIdx].url);
                    }}
                    aria-label="Siguiente foto"
                    title="Siguiente foto"
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs cursor-pointer shadow-md"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}

              <img
                src={activeImage || galleryImages[0]?.url || combo.imagen || "/combos/combo-service-motul.jpg"}
                alt={currentImg?.label || combo.nombre}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/combos/combo-service-motul.jpg";
                }}
                className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            {/* Miniaturas en la base de la galería */}
            {galleryImages.length > 1 && (
              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100 dark:border-line/60 shrink-0">
                <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-thin">
                  {galleryImages.map((img) => {
                    const isActive = (activeImage || galleryImages[0]?.url) === img.url;
                    return (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setActiveImage(img.url)}
                        title={img.label}
                        className={`relative h-14 w-14 sm:h-16 sm:w-16 rounded-xl p-1 bg-slate-50 dark:bg-surface overflow-hidden flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                          isActive
                            ? "border-2 border-brand ring-2 ring-brand/20 shadow-xs opacity-100"
                            : "border border-slate-200 dark:border-line/70 opacity-60 hover:opacity-100 hover:border-slate-400 dark:hover:border-slate-500"
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={img.label}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = "/combos/combo-service-motul.jpg";
                          }}
                          className="max-h-full max-w-full object-contain"
                        />
                        {img.isCover && (
                          <span className="absolute bottom-0 inset-x-0 bg-slate-950/80 backdrop-blur-[1px] text-[8px] text-white text-center font-bold py-0.5 leading-none">
                            Portada
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Pie de foto limpio con contador */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-0.5">
                  <span className="font-medium truncate max-w-[240px] sm:max-w-[300px]">
                    {currentImg?.label || combo.nombre}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 shrink-0">
                    {currentIdx + 1} de {galleryImages.length}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha: Tarjeta Comercial de Compra y Entrega */}
          <div className="lg:col-span-7 flex flex-col space-y-3.5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <Sparkles size={12} />
                <span>Kit de Repuestos con Descuento</span>
              </span>

              {/* Badge de verificación oficial */}
              <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-surface px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-line">
                <Check size={12} className="text-emerald-500" />
                <span>Kit Oficial Verificado</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
              {combo.nombre}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
              {combo.descripcion}
            </p>
          </div>

          {/* Bloque de Precio */}
          <div className="rounded-2xl border border-slate-200 dark:border-line bg-slate-50/70 dark:bg-surface/50 p-3.5 sm:p-4 space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-2.5">
                {hasOffer && combo.precioRegular && (
                  <span className="text-xs sm:text-sm text-slate-400 line-through">
                    {formatPrice(combo.precioRegular)}
                  </span>
                )}
                <span className="text-2xl sm:text-3xl font-black text-brand tracking-tight">
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
            <div>
              {hasStock ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20 w-fit">
                  <CheckCircle2 size={14} />
                  <span>Stock disponible en local ({combo.stockCalculado} unidades)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-500/10 px-2.5 py-1 rounded-xl border border-red-500/20 w-fit">
                  <AlertTriangle size={14} />
                  <span>Sin stock disponible en este momento</span>
                </div>
              )}
            </div>
          </div>

          {/* Avisos de Stock para el Combo */}
          {!hasStock ? (
            <div className="rounded-xl border border-red-500/30 bg-red-50 dark:bg-red-950/20 p-2.5 text-xs text-red-800 dark:text-red-300 flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-600 dark:text-red-400 shrink-0" />
              <span>
                <strong>SIN STOCK FÍSICO</strong> — Uno o más componentes de este kit no cuentan con existencias suficientes en Posadas.
              </span>
            </div>
          ) : isLowStock ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-2.5 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>¡ÚLTIMOS {combo.stockCalculado} KITS DISPONIBLES!</strong> — Stock limitado según disponibilidad de los repuestos en el local.
              </span>
            </div>
          ) : null}

          {/* Aviso si ya alcanzó el límite en el carrito */}
          {isLimitReached && hasStock && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-2.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <Check size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Ya tenés todos los kits disponibles en tu carrito ({inCartQty} de {combo.stockCalculado} u.).
              </span>
            </div>
          )}

          {/* Botones de Compra y Carrito */}
          <div className="space-y-2.5">
            {hasStock ? (
              <>
                <div className="flex items-center gap-2.5">
                  {/* Selector de cantidad */}
                  <div className="flex items-center border border-slate-300 dark:border-line rounded-xl bg-white dark:bg-surface overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      disabled={qty <= 1 || isLimitReached}
                      className="px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-card text-slate-800 dark:text-white font-bold text-sm transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <span className="px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white min-w-[36px] text-center">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.min(remainingStock, q + 1))}
                      disabled={isStaff || isLimitReached || qty >= remainingStock}
                      className="px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-card text-slate-800 dark:text-white font-bold text-sm transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-line bg-slate-100 dark:bg-surface py-2.5 px-4 text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed"
                    >
                      <Lock size={15} />
                      <span>COMPRA BLOQUEADA</span>
                    </button>
                  ) : isLimitReached ? (
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20 py-2.5 px-4 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-xs"
                      title="Ya tenés todas las unidades disponibles en tu carrito"
                    >
                      <Check size={16} />
                      <span>LÍMITE EN CARRITO ({combo.stockCalculado} u.)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-line bg-slate-100 dark:bg-surface py-2.5 px-4 text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:border-brand hover:text-brand shadow-xs active:scale-95 transition-all cursor-pointer"
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
                  <div className="rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <ShieldAlert size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Estás utilizando una cuenta de personal. Para realizar compras, ingresá con una cuenta de cliente.</span>
                  </div>
                )}

                {/* Botón Principal: Comprar Ahora */}
                {isStaff ? (
                  <button
                    type="button"
                    disabled
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-200 dark:bg-surface py-3 px-6 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-not-allowed border border-slate-300 dark:border-line"
                  >
                    <Lock size={16} className="text-amber-500" />
                    <span>Solo consulta (Personal)</span>
                  </button>
                ) : isLimitReached ? (
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 px-6 text-sm font-black text-white uppercase tracking-wider shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>IR A FINALIZAR COMPRA</span>
                    <ChevronRight size={18} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brandhover py-3 px-6 text-sm font-black text-white uppercase tracking-wider shadow-md shadow-brand/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>COMPRAR AHORA</span>
                    <ChevronRight size={18} />
                  </button>
                )}
              </>
            ) : (
              <div className="space-y-1.5">
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500 py-3 px-4 text-xs sm:text-sm font-bold cursor-not-allowed"
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
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-line bg-transparent hover:bg-slate-100 dark:hover:bg-surface py-2 px-3 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
            >
              <MessageCircle size={15} className="text-emerald-500" />
              <span>{hasStock ? "Consultar por WhatsApp con un vendedor" : "Consultar reposición por WhatsApp"}</span>
            </a>

            {/* Opciones de entrega */}
            <div className="pt-2.5 border-t border-slate-200 dark:border-line/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-surface border border-slate-200/70 dark:border-line/60">
                <Store size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-xs">Retiro en el Local</div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                    Podés retirar tu pedido en el comercio.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-surface border border-slate-200/70 dark:border-line/60">
                <Truck size={16} className="text-brand shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-xs">Motomandado</div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                    Entrega a domicilio según disponibilidad y zona de cobertura.
                  </p>
                </div>
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
          {combo.items && combo.items.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("componentes")}
              className={`pb-3 px-4 border-b-2 transition-colors shrink-0 cursor-pointer ${
                activeTab === "componentes"
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-black"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Componentes incluidos ({combo.items.length})
            </button>
          )}
          {hasSpecs && (
            <button
              type="button"
              onClick={() => setActiveTab("specs")}
              className={`pb-3 px-4 border-b-2 transition-colors shrink-0 cursor-pointer ${
                activeTab === "specs"
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-black"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Especificaciones técnicas ({totalSpecsCount})
            </button>
          )}
          {hasMotos && (
            <button
              type="button"
              onClick={() => setActiveTab("motos")}
              className={`pb-3 px-4 border-b-2 transition-colors shrink-0 cursor-pointer ${
                activeTab === "motos"
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-black"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Motos compatibles ({totalMotosCount})
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab("compra")}
            className={`pb-3 px-4 border-b-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === "compra"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-black"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Información de compra y pagos
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
                  <Wrench size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs">Asesoramiento Técnico</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Atención especializada para despejar dudas de compatibilidad y colocación.</div>
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
            <div className="space-y-6">
              <div className="border-b border-slate-200 dark:border-line pb-3">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText size={20} className="text-emerald-500" />
                  <span>Especificaciones Técnicas</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Ficha técnica oficial y características de los componentes que integran este kit.
                </p>
              </div>

              {/* 1. Especificaciones propias del combo (si existen) */}
              {ownSpecs.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-brand" />
                    <span>Ficha General del Kit</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {ownSpecs.map((spec: ProductSpec, sIdx: number) => (
                      <div
                        key={`own-spec-${sIdx}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-surface border border-slate-100 dark:border-line/40"
                      >
                        <span className="font-semibold text-slate-500 dark:text-slate-400">{spec.caracteristica}:</span>
                        <span className="font-bold text-slate-900 dark:text-white text-right">{spec.valor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Especificaciones desglosadas por repuesto incluido */}
              {compSpecs.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Wrench size={14} className="text-emerald-500" />
                    <span>Ficha Técnica por Repuesto Incluido</span>
                  </h3>

                  <div className="space-y-3">
                    {compSpecs.map((cs) => (
                      <div
                        key={`comp-spec-${cs.productoId}`}
                        className="rounded-2xl border border-slate-200 dark:border-line bg-slate-50/50 dark:bg-surface/50 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-line/60 pb-2">
                          <div className="flex items-center gap-2.5">
                            {cs.imagen ? (
                              <img
                                src={cs.imagen}
                                alt={cs.productoNombre}
                                className="h-9 w-9 object-contain rounded-lg bg-white dark:bg-card border border-slate-200 dark:border-line p-0.5"
                              />
                            ) : (
                              <span className="text-base">⚙️</span>
                            )}
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                                {cs.productoNombre}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                {cs.marca && <span>Marca: {cs.marca}</span>}
                                {cs.marca && cs.codigo && <span>·</span>}
                                {cs.codigo && <span>Cód: {cs.codigo}</span>}
                              </div>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-brand bg-brand/10 px-2.5 py-0.5 rounded-md shrink-0">
                            {cs.cantidad} {cs.cantidad === 1 ? "unidad" : "unidades"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {cs.specs.map((spec, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-card border border-slate-200/60 dark:border-line/40"
                            >
                              <span className="font-medium text-slate-500 dark:text-slate-400">{spec.caracteristica}:</span>
                              <span className="font-bold text-slate-900 dark:text-white text-right">{spec.valor}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MOTOS COMPATIBLES */}
          {activeTab === "motos" && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 dark:border-line pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Bike size={20} className="text-brand" />
                    <span>Motos Compatibles</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Modelos verificados compatibles con este combo o sus piezas individuales.
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

              {/* 1. Compatibilidad General Verificada (Kit Completo) */}
              {ownMotos.length > 0 && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <h3 className="text-xs font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                        Compatibilidad General Verificada (Kit Completo)
                      </h3>
                      <p className="text-[11px] text-emerald-800/80 dark:text-emerald-400/80">
                        Todos los componentes del kit son compatibles en conjunto con los siguientes modelos:
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {ownMotos.map((moto: string, mIdx: number) => (
                      <span
                        key={`own-moto-${mIdx}`}
                        className="inline-flex items-center gap-1.5 bg-white dark:bg-surface border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs"
                      >
                        <Bike size={13} className="text-emerald-600 dark:text-emerald-400" />
                        <span>{moto}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Compatibilidad Específica por Repuesto */}
              {compMotos.length > 0 && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 dark:border-line bg-slate-50 dark:bg-surface/60 p-3 flex items-start gap-2.5">
                    <Info size={16} className="text-brand shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      <strong>Compatibilidad por componente:</strong> Las siguientes motos fueron informadas como compatibles para piezas individuales del kit. Si querés certificar que todos los repuestos correspondan exactamente a tu cilindrada y año, consultanos sin compromiso por WhatsApp.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {compMotos.map((cm) => (
                      <div
                        key={`comp-moto-${cm.productoId}`}
                        className="rounded-2xl border border-slate-200 dark:border-line bg-slate-50/50 dark:bg-surface/50 p-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-line/60 pb-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {cm.productoNombre} ({cm.cantidad}x)
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                            {cm.motos.length} {cm.motos.length === 1 ? "modelo compatible" : "modelos compatibles"}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {cm.motos.map((moto, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 bg-white dark:bg-card border border-slate-200 dark:border-line text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg text-xs"
                            >
                              <Bike size={12} className="text-slate-400" />
                              <span>{moto}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: INFORMACIÓN DE COMPRA Y PAGOS */}
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
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-500 shrink-0" />
                      <span><strong>Tarjetas de Débito y Crédito:</strong> Aceptamos tarjetas bancarias y billeteras virtuales.</span>
                    </li>
                  </ul>
                </div>

                {/* Opciones de Entrega */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-surface border border-slate-100 dark:border-line/40 space-y-2.5">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <Truck size={15} className="text-brand" />
                    <span>Opciones de Entrega</span>
                  </h3>
                  <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                    <li className="flex items-start gap-2">
                      <Store size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span><strong>Retiro en el Local:</strong> Podés retirar tu pedido en nuestro comercio.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Truck size={14} className="text-brand shrink-0 mt-0.5" />
                      <span><strong>Motomandado:</strong> Entrega a domicilio según disponibilidad y zona de cobertura.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECCIÓN INFORMATIVA DE BENEFICIOS Y GARANTÍAS DEL KIT */}
      <section className="rounded-3xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 md:p-8 shadow-sm space-y-6">
        <div className="border-b border-slate-200 dark:border-line pb-4">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Sparkles size={22} className="text-brand" />
            <span>Beneficios y Garantías del Kit</span>
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
              <ShieldCheck size={18} className="text-amber-500 shrink-0" />
              <span>Garantía Oficial y Calidad</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Todos los repuestos del kit son 100% nuevos en empaque original con respaldo de fábrica y atención técnica directa en mostrador.
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
    </div>
  );
}
