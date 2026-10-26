"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProductItem } from "@/actions/ecommerce";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useConfig } from "@/context/ConfigContext";
import {
  ArrowLeft,
  ShoppingCart,
  Check,
  Star,
  ShieldCheck,
  Bike,
  CreditCard,
  Share2,
  Copy,
  Info,
  ChevronRight,
  ChevronLeft,
  Flame,
  User,
  MessageSquare,
  Sparkles,
  ShieldAlert,
  Lock,
  AlertTriangle,
} from "lucide-react";

interface ProductDetailClientProps {
  product: ProductItem;
  recommended: ProductItem[];
}

export default function ProductDetailClient({
  product,
  recommended,
}: ProductDetailClientProps) {
  const { addToCart, isStaff, getItemCartQuantity, getRemainingStock } = useCart();
  const { user, openLogin } = useAuth();
  const { config, shouldShowAhorroBadge } = useConfig();
  const router = useRouter();

  const [activeImage, setActiveImage] = useState<string>(product.imagen || "");
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<"descripcion" | "specs" | "motos" | "compra_pagos">("descripcion");
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const inCartQty = getItemCartQuantity(product.id, false);
  const remainingStock = getRemainingStock(product);
  const isLimitReached = product.stock > 0 && remainingStock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const sinStock = product.stock <= 0;

  // Especificaciones y compatibilidades: resolución de datos personalizados vs. fallbacks
  const customSpecs = product.especificaciones || [];
  const garantiaSpec = customSpecs.find((s) => s.caracteristica.toLowerCase().includes("garant"));
  const condicionSpec = customSpecs.find(
    (s) => s.caracteristica.toLowerCase().includes("condic") || s.caracteristica.toLowerCase().includes("estado")
  );
  const filteredCustomSpecs = customSpecs.filter((s) => {
    const key = s.caracteristica.toLowerCase();
    return !key.includes("marca") && !key.includes("categor") && !key.includes("código") && !key.includes("codigo") && !key.includes("garant");
  });

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -280 : 280;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Galería basada exclusivamente en la imagen real del producto
  const getGalleryImages = () => {
    if (!product.imagen) return [];
    return [{ id: 1, url: product.imagen, label: product.nombre }];
  };

  const galleryImages = getGalleryImages();

  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");

  // Precios reales basados estrictamente en datos del producto
  const regular = product.precioRegular ?? product.precio;
  const hasOffer = Boolean(product.enOferta && regular > product.precio);
  const ahorroOferta = hasOffer ? Math.max(0, regular - product.precio) : 0;

  const handleQty = (delta: number) => {
    if (sinStock || remainingStock <= 0) return;
    setQty((prev) => Math.max(1, Math.min(prev + delta, remainingStock)));
  };

  const handleComprarAhora = () => {
    if (isStaff || sinStock) {
      return;
    }
    if (isLimitReached) {
      router.push("/checkout");
      return;
    }
    addToCart(product, qty);
    router.push("/checkout");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.nombre,
        text: `Mirá este repuesto en Chopper Repuestos Posadas: ${product.nombre}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="mt-4 space-y-10 max-w-6xl mx-auto">
      {/* ═══════════ BREADCRUMB & ACCIONES SUPERIORES ═══════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-400 border-b border-line pb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link href="/" className="hover:text-white transition-colors">
            Inicio
          </Link>
          <span>/</span>
          <Link href="/ofertas" className="hover:text-white transition-colors">
            Catálogo
          </Link>
          <span>/</span>
          <span className="text-brand font-medium">{product.categoriaNombre}</span>
          <span>/</span>
          <span className="text-slate-300 font-bold truncate max-w-[200px] sm:max-w-[320px]">
            {product.nombre}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 hover:text-white transition-colors"
            title="Compartir repuesto"
          >
            <Share2 size={13} />
            <span>Compartir</span>
          </button>
          <span>|</span>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 hover:text-white transition-colors"
            title="Copiar enlace"
          >
            <Copy size={13} />
            <span>{copied ? "¡Enlace copiado!" : "Copiar enlace"}</span>
          </button>
        </div>
      </div>

      {/* ═══════════ SECCIÓN PRINCIPAL: FOTO A LA IZQUIERDA + COMPRA A LA DERECHA ═══════════ */}
      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Columna Izquierda: Galería y Foto Principal */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative flex aspect-square w-full items-center justify-center rounded-2xl bg-white p-6 shadow-sm border border-line/60 overflow-hidden group">
            {activeImage || product.imagen ? (
              <img
                src={activeImage || product.imagen || ""}
                alt={product.nombre}
                className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400">
                <span className="text-6xl">⚙️</span>
                <span className="text-xs mt-2 font-mono uppercase font-bold text-slate-500">
                  Chopper Repuestos
                </span>
              </div>
            )}

            {/* Badge de garantía en la foto */}
            <div className="absolute top-4 left-4 rounded-full bg-slate-900/80 px-3 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 backdrop-blur">
              ✓ 100% Repuesto Nuevo Oficial
            </div>
          </div>

          {/* Miniaturas de galería interactivas (solo si hay más de 1 imagen) */}
          {galleryImages.length > 1 && (
            <div className="flex items-center gap-3">
              {galleryImages.map((img, idx) => {
                const isActive = (activeImage || product.imagen) === img.url || (!activeImage && idx === 0);
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
        </div>

        {/* Columna Derecha: Información, Precios y Compra */}
        <div className="lg:col-span-6 space-y-5">
          {/* Marca, Categoría y Código */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-surface px-2.5 py-1 font-bold text-brand border border-line">
                {product.marca || "Chopper"}
              </span>
              <span>·</span>
              <span className="font-semibold text-slate-300">{product.categoriaNombre}</span>
            </div>
            {user && user.rol !== "CLIENTE" && (
              <span className="font-mono text-[11px] text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                Stock/Admin: {product.codigo || `CHP-${product.id}`}
              </span>
            )}
          </div>

          {/* Título Principal */}
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            {product.nombre}
          </h1>

          {/* Disponibilidad y estado del repuesto */}
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Check size={14} />
              <span>{product.stock > 0 ? "Disponible en Posadas" : "Consultar disponibilidad"}</span>
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-500 dark:text-slate-400">Repuesto Oficial 100% Nuevo</span>
          </div>

          {/* BLOQUE DE PRECIO REAL */}
          <div className="rounded-2xl border border-slate-200 dark:border-line bg-slate-50/70 dark:bg-surface/50 p-5 space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-3">
                {hasOffer && (
                  <span className="text-sm text-slate-400 line-through">
                    {formatPrice(regular)}
                  </span>
                )}
                <span className="text-3xl sm:text-4xl font-black text-brand tracking-tight">
                  {formatPrice(product.precio)}
                </span>
              </div>
              {hasOffer && shouldShowAhorroBadge(ahorroOferta) && (
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  {product.badgePromo ? `${product.badgePromo} · ` : ""}Ahorrás {formatPrice(ahorroOferta)} ({product.descuentoPorcentaje}% OFF)
                </span>
              )}
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              Precio final con IVA incluido. Pagá en efectivo, transferencia o tarjeta al retirar en Posadas o al recibir.
            </div>
          </div>

          {/* ESTADO DE STOCK Y BENEFICIOS LOCALES EN POSADAS */}
          <div className="space-y-2.5 rounded-xl border border-slate-200 dark:border-line bg-white dark:bg-card p-4 text-xs shadow-sm">
            {sinStock ? (
              <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400 font-bold">
                <AlertTriangle size={16} className="shrink-0" />
                <span>SIN STOCK FÍSICO — Este repuesto se encuentra agotado momentáneamente en Posadas</span>
              </div>
            ) : isLowStock ? (
              <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400 font-bold">
                <AlertTriangle size={16} className="shrink-0" />
                <span>
                  {product.stock === 1
                    ? "¡ÚLTIMA UNIDAD EN EL LOCAL! — Disponible para retiro inmediato"
                    : `¡ÚLTIMAS ${product.stock} UNIDADES EN EL LOCAL! — Disponible para retiro inmediato`}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold">
                <Check size={16} className="shrink-0" />
                <span>STOCK EN EL LOCAL — Disponible para retiro inmediato en Av. Roque Sáenz Peña 1500 (Posadas)</span>
              </div>
            )}

            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 font-medium">
              <Bike size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Envíos rápidos en el día por <strong>Motomandado</strong> y <strong>Moto Uber</strong> en toda Posadas</span>
            </div>

            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 font-medium">
              <ShieldCheck size={16} className="text-brand shrink-0" />
              <span>Garantía oficial de 6 meses de fábrica. Producto 100% nuevo en caja cerrada</span>
            </div>
          </div>

          {/* AVISO DE LÍMITE ALCANZADO EN EL CARRITO */}
          {isLimitReached && !sinStock && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
              <Check size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Ya tenés todas las unidades disponibles en tu carrito ({inCartQty} de {product.stock} u.).
              </span>
            </div>
          )}

          {/* BOTONES DE COMPRA Y CANTIDAD */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              {/* Selector de cantidad */}
              <div className="flex items-center rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface">
                <button
                  type="button"
                  onClick={() => handleQty(-1)}
                  disabled={qty <= 1 || sinStock || isLimitReached}
                  className="px-3.5 py-2.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Disminuir cantidad"
                >
                  -
                </button>
                <span className="w-10 text-center text-sm font-black text-slate-900 dark:text-white">
                  {sinStock ? 0 : qty}
                </span>
                <button
                  type="button"
                  onClick={() => handleQty(1)}
                  disabled={isStaff || sinStock || isLimitReached || qty >= remainingStock}
                  className="px-3.5 py-2.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Aumentar cantidad"
                  title={qty >= remainingStock ? "Límite de stock disponible alcanzado" : "Aumentar cantidad"}
                >
                  +
                </button>
              </div>

              {/* Botón secundario: Agregar al carrito */}
              {sinStock ? (
                <button
                  type="button"
                  disabled
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-line bg-slate-100 dark:bg-zinc-800/60 py-3 px-4 text-xs sm:text-sm font-bold text-slate-400 dark:text-zinc-500 cursor-not-allowed"
                >
                  <span>SIN STOCK</span>
                </button>
              ) : isStaff ? (
                <button
                  type="button"
                  onClick={() => addToCart(product, qty)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-line bg-slate-100 dark:bg-surface py-3 px-4 text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed"
                >
                  <Lock size={15} />
                  <span>COMPRA BLOQUEADA</span>
                </button>
              ) : isLimitReached ? (
                <button
                  type="button"
                  onClick={() => addToCart(product, 1)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20 py-3 px-4 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-xs"
                  title="Ya tenés todas las unidades disponibles en tu carrito"
                >
                  <Check size={16} />
                  <span>LÍMITE EN CARRITO ({product.stock} u.)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => addToCart(product, qty)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-line bg-slate-100 dark:bg-surface py-3 px-4 text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:border-brand hover:text-brand transition-all active:scale-95 shadow-sm cursor-pointer"
                >
                  <ShoppingCart size={16} />
                  <span>AGREGAR AL CARRITO</span>
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

            {/* Botón Principal Grande: COMPRAR AHORA */}
            {sinStock ? (
              <button
                type="button"
                disabled
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-200 dark:bg-zinc-800 py-3.5 px-6 text-sm font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider cursor-not-allowed border border-slate-300 dark:border-zinc-700"
              >
                <span>AGOTADO TEMPORALMENTE</span>
              </button>
            ) : isStaff ? (
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
                onClick={handleComprarAhora}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3.5 px-6 text-sm font-black text-white uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
              >
                <span>IR A FINALIZAR COMPRA</span>
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComprarAhora}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brandhover py-3.5 px-6 text-sm font-black text-white uppercase tracking-wider shadow-lg shadow-brand/20 transition-all active:scale-95 cursor-pointer"
              >
                <span>COMPRAR AHORA</span>
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════ FICHA DE DETALLE DEL PRODUCTO (4 SOLAPAS HORIZONTALES) ═══════════ */}
      <section className="space-y-4">
        {/* Selector de solapas horizontales */}
        <div className="flex border-b border-slate-200 dark:border-line text-xs font-bold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("descripcion")}
            className={`pb-3 px-4 border-b-2 transition-colors shrink-0 ${
              activeTab === "descripcion"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-black"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Descripción
          </button>
          <button
            onClick={() => setActiveTab("specs")}
            className={`pb-3 px-4 border-b-2 transition-colors shrink-0 ${
              activeTab === "specs"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-black"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Especificaciones Técnicas
          </button>
          <button
            onClick={() => setActiveTab("motos")}
            className={`pb-3 px-4 border-b-2 transition-colors shrink-0 ${
              activeTab === "motos"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-black"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Motos Compatibles
          </button>
          <button
            onClick={() => setActiveTab("compra_pagos")}
            className={`pb-3 px-4 border-b-2 transition-colors shrink-0 ${
              activeTab === "compra_pagos"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-black"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Información de Compra y Pagos
          </button>
        </div>

        {/* Solapa 1: Descripción */}
        {activeTab === "descripcion" && (
          <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 space-y-5 shadow-sm text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Descripción del Repuesto
            </h3>
            <div className="rounded-xl border border-slate-200 dark:border-line/70 bg-slate-50 dark:bg-surface/50 p-4 space-y-3">
              {product.descripcion ? (
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal whitespace-pre-line">
                  {product.descripcion}
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                  El <strong className="text-slate-950 dark:text-white">{product.nombre}</strong> de marca <strong className="text-slate-950 dark:text-white">{product.marca || "Chopper"}</strong> es un componente para motocicleta fabricado bajo normas de precisión. Diseñado para responder a las exigencias del tránsito urbano y traslados continuos en la región de Posadas y Misiones, asegura durabilidad, óptimo rendimiento mecánico y confiabilidad en tu andar diario.
                </p>
              )}
            </div>

            {/* Usos y aplicaciones habituales recuperados */}
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Usos y Aplicaciones Habituales
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-200 dark:border-line">
                  <tbody className="divide-y divide-slate-200 dark:divide-line">
                    <tr className="bg-slate-50 dark:bg-surface/50">
                      <td className="p-3 font-bold text-slate-900 dark:text-white w-1/3 sm:w-1/4">Uso diario urbano en Posadas</td>
                      <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">Excelente respuesta en arranques frecuentes, tránsito interurbano continuo y detenciones periódicas.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">Ruta y viajes de media/larga distancia</td>
                      <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">Comportamiento mecánico estable bajo régimen sostenido y temperaturas elevadas de la región.</td>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-surface/50">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">Mantenimiento preventivo y service</td>
                      <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">Reemplazo directo para restablecer la operatividad original del vehículo sin modificaciones forzadas.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="rounded-xl border border-slate-200 dark:border-line bg-white dark:bg-card p-3 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white">✓ Calidad Verificada</span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">Materiales de alta durabilidad testeados para el tránsito y desgaste diario.</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-line bg-white dark:bg-card p-3 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white">✓ Reemplazo Directo</span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">Instalación precisa según medidas correspondientes a la línea del vehículo.</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-line bg-white dark:bg-card p-3 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white">✓ Asesoramiento en Local</span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">Atención técnica en Posadas para despejar dudas de compatibilidad y colocación.</p>
              </div>
            </div>
          </div>
        )}

        {/* Solapa 2: Especificaciones Técnicas */}
        {activeTab === "specs" && (
          <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 space-y-6 shadow-sm text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Ficha Técnica
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border border-slate-200 dark:border-line">
                <tbody className="divide-y divide-slate-200 dark:divide-line">
                  <tr className="bg-slate-50 dark:bg-surface/50">
                    <td className="p-3 font-bold text-slate-900 dark:text-white w-1/3">Marca</td>
                    <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">{product.marca || "Chopper Repuestos"}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">Categoría</td>
                    <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">{product.categoriaNombre}</td>
                  </tr>
                  {product.codigo ? (
                    <tr className="bg-slate-50 dark:bg-surface/50">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">Código de pieza</td>
                      <td className="p-3 font-mono text-slate-800 dark:text-slate-200 font-medium">{product.codigo}</td>
                    </tr>
                  ) : user && user.rol !== "CLIENTE" ? (
                    <tr className="bg-amber-500/5">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">Código interno (Personal)</td>
                      <td className="p-3 font-mono text-amber-500 font-medium">CHP-{product.id}</td>
                    </tr>
                  ) : null}
                  <tr className={product.codigo ? "" : "bg-slate-50 dark:bg-surface/50"}>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">Condición</td>
                    <td className="p-3 text-emerald-700 dark:text-emerald-400 font-bold">
                      {condicionSpec ? condicionSpec.valor : "Repuesto nuevo"}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">Garantía</td>
                    <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">
                      {garantiaSpec ? garantiaSpec.valor : "Garantía oficial sujeta a condiciones del fabricante (consultar plazo para esta pieza)"}
                    </td>
                  </tr>

                  {/* Especificaciones dinámicas adicionales cargadas desde el panel */}
                  {filteredCustomSpecs.map((spec, idx) => (
                    <tr key={`spec-row-${idx}`} className={idx % 2 === 0 ? "bg-slate-50 dark:bg-surface/50" : ""}>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{spec.caracteristica}</td>
                      <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">{spec.valor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredCustomSpecs.length === 0 && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                Ficha técnica base según datos de catálogo. Para especificaciones milimétricas o tolerancias particulares, consultá con nuestro personal técnico en el local.
              </p>
            )}
          </div>
        )}

        {/* Solapa 3: Motos Compatibles */}
        {activeTab === "motos" && (
          <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 space-y-4 shadow-sm text-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Motos y Modelos Compatibles
              </h3>
              {product.universal && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                  <Sparkles size={14} className="text-sky-600 dark:text-sky-400" />
                  Aplicación Universal
                </span>
              )}
            </div>

            {product.universal ? (
              /* CASO 1: Repuesto de aplicación universal */
              <div className="space-y-4">
                <div className="rounded-xl border border-sky-500/30 bg-sky-50/70 dark:bg-sky-950/20 p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-sky-800 dark:text-sky-300 text-sm">
                    <Sparkles size={18} className="text-sky-600 dark:text-sky-400 shrink-0" />
                    <span>Repuesto de Aplicación Universal</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                    Este producto cuenta con <strong>diseño y medidas universales</strong>, siendo compatible y adaptable a una amplia gama de motocicletas, marcas y cilindradas del mercado (salvo especificaciones excepcionales de fábrica).
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Apto para instalación estándar. Si tenés dudas sobre el anclaje, rosca o dimensiones específicas para tu modelo, consultanos por WhatsApp antes de comprar.
                  </p>
                </div>

                {product.motosCompatibles && product.motosCompatibles.length > 0 && (
                  <div className="space-y-2.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      Modelos de referencia frecuente testeados:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {product.motosCompatibles.map((moto, idx) => (
                        <div
                          key={`moto-compat-${idx}`}
                          className="flex items-center gap-2 rounded-xl border border-sky-500/20 dark:border-sky-500/20 bg-sky-50/40 dark:bg-surface p-3 font-semibold text-slate-800 dark:text-slate-200"
                        >
                          <Bike size={16} className="text-sky-600 dark:text-sky-400 shrink-0" />
                          <span className="truncate">{moto}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : product.motosCompatibles && product.motosCompatibles.length > 0 ? (
              /* CASO 2: Compatibilidades específicas verificadas en el panel */
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/20 p-3.5 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                  <Check size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Compatibilidad específica verificada: este repuesto ha sido confirmado para los siguientes modelos:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {product.motosCompatibles.map((moto, idx) => (
                    <div
                      key={`moto-compat-${idx}`}
                      className="flex items-center gap-2 rounded-xl border border-emerald-500/20 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-surface p-3 font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <Bike size={16} className="text-brand shrink-0" />
                      <span className="truncate">{moto}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* CASO 3: Compatibilidad no especificada (reemplaza la guía genérica de plaza) */
              <div className="rounded-xl border border-slate-200 dark:border-line bg-slate-50 dark:bg-surface/60 p-5 space-y-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-sm">
                  <Info size={18} className="text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>Compatibilidad no especificada</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                  Este repuesto no tiene modelos de motocicleta asociados explícitamente en su ficha técnica comercial.
                </p>
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-500/20 p-3 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                  <AlertTriangle size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Para verificar si esta pieza es compatible con el año, serie de motor o versión de tu moto, consultanos por WhatsApp con tu modelo exacto antes de realizar la compra.</span>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 dark:border-line flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-400">
              <span>¿Querés confirmar compatibilidad con tu moto antes de comprar? Escribinos y te asesoramos al instante.</span>
              <a
                href={`https://wa.me/${(config.telefono || "3765243554").replace(/\D/g, "")}?text=${encodeURIComponent(`Hola Chopper Repuestos, quisiera consultar compatibilidad para el producto ${product.nombre} (ID #${product.id})`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Consultar por WhatsApp</span> &gt;
              </a>
            </div>
          </div>
        )}

        {/* Solapa 4: Información de Compra y Pagos */}
        {activeTab === "compra_pagos" && (
          <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 space-y-6 shadow-sm text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Información de Compra, Pagos y Envíos
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Pagos en efectivo y transferencia */}
              <div className="rounded-xl border border-slate-200 dark:border-line bg-slate-50 dark:bg-surface p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <CreditCard size={16} className="text-brand" />
                  <span>Efectivo / Transferencia</span>
                </div>
                <p className="text-brand font-black text-base">
                  {formatPrice(product.precio)}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Abonando en efectivo al retirar en mostrador o mediante transferencia bancaria inmediata.
                </p>
              </div>

              {/* Card 2: Tarjetas y Medios de Pago */}
              <div className="rounded-xl border border-slate-200 dark:border-line bg-slate-50 dark:bg-surface p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <CreditCard size={16} className="text-brand" />
                  <span>Tarjetas y Medios de Pago</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 font-bold text-base">
                  {formatPrice(product.precio)}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Aceptamos tarjetas de débito y crédito bancarias, y pagos mediante billeteras virtuales habilitadas.
                </p>
              </div>

              {/* Card 3: Retiro y Envíos */}
              <div className="rounded-xl border border-slate-200 dark:border-line bg-slate-50 dark:bg-surface p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <Bike size={16} className="text-brand" />
                  <span>Retiro y Envíos Posadas</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  <strong>Local:</strong> {config.direccion || "Av. Roque Sáenz Peña 1500 (Posadas)"}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Envíos en el día por <strong>Motomandado</strong> y <strong>Moto Uber</strong> en Posadas y Gran Posadas.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ═══════════ INFORMACIÓN DE COMPRA, ENVÍOS Y GARANTÍA EN POSADAS ═══════════ */}
      <section className="space-y-4 pt-4 border-t border-slate-200 dark:border-line">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white md:text-2xl">
            Compra segura y entregas en Posadas
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Información sobre modalidades de retiro, envíos y garantía oficial Chopper Repuestos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-5 space-y-2.5 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
              <Bike size={18} className="text-brand shrink-0" />
              <span>Retiro en Local Comercial</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Retirá gratis en nuestro local ubicado en <strong>{config.direccion || "Av. Roque Sáenz Peña 1500 (Posadas)"}</strong>. Tu pedido se prepara de inmediato una vez confirmado.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-5 space-y-2.5 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
              <Check size={18} className="text-emerald-500 shrink-0" />
              <span>Envíos en el Día</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Envíos rápidos a domicilio por <strong>Motomandado</strong> y <strong>Moto Uber</strong> en Posadas y Garupá. Coordinamos la entrega directamente a tu ubicación.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-5 space-y-2.5 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
              <ShieldCheck size={18} className="text-amber-500 shrink-0" />
              <span>Garantía y Asesoramiento</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Todos nuestros repuestos son nuevos y cuentan con garantía de fábrica. Ante cualquier duda de compatibilidad, nuestro equipo en mostrador te asesora.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ PRODUCTOS RECOMENDADOS (Horizontal Slider con botones < >) ═══════════ */}
      {recommended.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-slate-200 dark:border-line">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Productos <span className="text-brand">recomendados</span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Seleccionados para complementar el mantenimiento de tu moto.
              </p>
            </div>
            <Link href="/ofertas" className="text-xs text-brand font-bold hover:underline flex items-center gap-1">
              <span>Ver catálogo completo</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          {/* Carrusel Deslizable con Botones Laterales */}
          <div className="relative group">
            {/* Botón Scroll Izquierda */}
            <button
              type="button"
              onClick={() => scroll("left")}
              className="absolute -left-2 sm:-left-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-9 sm:w-10 items-center justify-center rounded-lg bg-neutral-900/85 hover:bg-neutral-800 text-white shadow-xl border border-neutral-700/60 backdrop-blur-sm transition-all active:scale-95 cursor-pointer hover:border-brand/60"
              aria-label="Producto anterior"
            >
              <ChevronLeft size={22} />
            </button>

            {/* Botón Scroll Derecha */}
            <button
              type="button"
              onClick={() => scroll("right")}
              className="absolute -right-2 sm:-right-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-9 sm:w-10 items-center justify-center rounded-lg bg-neutral-900/85 hover:bg-neutral-800 text-white shadow-xl border border-neutral-700/60 backdrop-blur-sm transition-all active:scale-95 cursor-pointer hover:border-brand/60"
              aria-label="Siguiente producto"
            >
              <ChevronRight size={22} />
            </button>

            {/* Pista Deslizable */}
            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto scroll-smooth scrollbar-none pb-4 pt-1 px-1"
            >
              {recommended.map((item) => (
                <div
                  key={item.id}
                  className="w-[185px] sm:w-[210px] md:w-[220px] shrink-0 group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-3 hover:border-brand/70 hover:shadow-xl transition-all shadow-sm"
                >
                  <div>
                    <Link
                      href={`/producto/${item.id}`}
                      className="relative mb-2 flex h-32 items-center justify-center rounded-xl bg-slate-50 dark:bg-surface p-2 overflow-hidden border border-slate-100 dark:border-line/40"
                    >
                      {item.imagen ? (
                        <img
                          src={item.imagen}
                          alt={item.nombre}
                          className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <span className="text-2xl">⚙️</span>
                      )}
                    </Link>

                    <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      <span className="truncate max-w-[140px]">{item.marca} · {item.categoriaNombre}</span>
                      {item.enOferta && (
                        <span className="text-brand font-black shrink-0">OFERTA</span>
                      )}
                    </div>

                    <Link
                      href={`/producto/${item.id}`}
                      className="line-clamp-2 text-xs font-bold text-slate-900 dark:text-white hover:text-brand transition-colors leading-tight min-h-[32px]"
                      title={item.nombre}
                    >
                      {item.nombre}
                    </Link>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-line/60">
                    <div className="text-sm font-black text-brand tracking-tight">
                      {formatPrice(item.precio)}
                    </div>
                    <div className="text-[9px] text-slate-600 dark:text-slate-400 font-medium">Efectivo / Transferencia</div>

                    <button
                      onClick={() => addToCart(item, 1)}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand hover:bg-brandhover py-2 text-xs font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <ShoppingCart size={13} />
                      <span>Agregar al carrito</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
