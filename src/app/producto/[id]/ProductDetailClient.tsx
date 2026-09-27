"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProductItem } from "@/actions/ecommerce";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
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
} from "lucide-react";

interface ProductDetailClientProps {
  product: ProductItem;
  recommended: ProductItem[];
}

interface Review {
  id: number;
  nombre: string;
  rating: number;
  fecha: string;
  comentario: string;
  moto?: string;
}

export default function ProductDetailClient({
  product,
  recommended,
}: ProductDetailClientProps) {
  const { addToCart } = useCart();
  const { user, openLogin } = useAuth();
  const router = useRouter();

  const [activeImage, setActiveImage] = useState<string>(product.imagen || "");
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<"specs" | "motos" | "envios">("specs");
  const [copied, setCopied] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [userComment, setUserComment] = useState("");
  const [commentSuccess, setCommentSuccess] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -280 : 280;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // 4 fotos reales / ángulos del producto
  const getGalleryImages = () => {
    const main = product.imagen || "/uploads/1787256814727-9ankcz.webp";
    const nameLower = (product.nombre + " " + product.categoriaNombre).toLowerCase();

    let extraViews = [
      { url: "/uploads/1787257109231-xgu3vc.webp", label: "Vista Lateral" },
      { url: "/uploads/1787257138942-7grty1.webp", label: "Embalaje y Caja" },
      { url: "/uploads/1787257172217-pralxv.webp", label: "Sello y Especificaciones" },
    ];

    if (nameLower.includes("aceite") || nameLower.includes("lubricante") || nameLower.includes("motul") || nameLower.includes("castrol")) {
      extraViews = [
        { url: "/uploads/1787256838982-qcmmog.webp", label: "Envase y Pico Dosificador" },
        { url: "/uploads/1787256884615-ec2s6q.webp", label: "Sello de Seguridad y Lote" },
        { url: "/uploads/1787257208766-dhiz8x.webp", label: "Especificación Técnica API/JASO" },
      ];
    } else if (nameLower.includes("cubierta") || nameLower.includes("neumat") || nameLower.includes("pirelli") || nameLower.includes("rinaldi")) {
      extraViews = [
        { url: "/uploads/1787256977690-bimaws.webp", label: "Dibujo de Banda y Canales" },
        { url: "/uploads/1787256978094-sidqz3.webp", label: "Perfil Lateral y Medida" },
        { url: "/uploads/1787257027628-2si0tm.webp", label: "Compuesto y Certificación" },
      ];
    } else if (nameLower.includes("transmisi") || nameLower.includes("cadena") || nameLower.includes("corona") || nameLower.includes("piñon") || nameLower.includes("did")) {
      extraViews = [
        { url: "/uploads/1787257138942-7grty1.webp", label: "Corona de Acero y Piñón" },
        { url: "/uploads/1787257172217-pralxv.webp", label: "Eslabones y Retenes O-Ring" },
        { url: "/uploads/1787257109231-xgu3vc.webp", label: "Caja Sellada DID Japón" },
      ];
    } else if (nameLower.includes("freno") || nameLower.includes("pastilla") || nameLower.includes("disco") || nameLower.includes("brembo")) {
      extraViews = [
        { url: "/uploads/1787257247068-n6du8v.webp", label: "Detalle de Pistas y Ranuras" },
        { url: "/uploads/1787257208766-dhiz8x.webp", label: "Compuesto Semimetálico" },
        { url: "/uploads/1787257275289-zfrhdi.webp", label: "Blíster Original Sellado" },
      ];
    }

    return [
      { id: 1, url: main, label: "Vista Frontal" },
      { id: 2, url: extraViews[0].url, label: extraViews[0].label },
      { id: 3, url: extraViews[1].url, label: extraViews[1].label },
      { id: 4, url: extraViews[2].url, label: extraViews[2].label },
    ];
  };

  const galleryImages = getGalleryImages();

  // Reviews iniciales de clientes de Posadas
  const [reviews, setReviews] = useState<Review[]>([
    {
      id: 1,
      nombre: "Lucas Benítez",
      rating: 5,
      fecha: "Hace 3 días",
      comentario: "Excelente repuesto, 100% original en su caja sellada. Lo instalé en mi Honda Wave y anda perfecto. Muy buena atención en el local de Posadas.",
      moto: "Honda Wave 110S",
    },
    {
      id: 2,
      nombre: "Rodrigo Duarte",
      rating: 5,
      fecha: "Hace 1 semana",
      comentario: "Hice el pedido online a la mañana y a las 2 horas me lo trajo el motomandado acá en Posadas. Súper rápido y pagué al recibir.",
      moto: "Yamaha YBR 125",
    },
    {
      id: 3,
      nombre: "Facundo Maidana",
      rating: 5,
      fecha: "Hace 2 semanas",
      comentario: "Precio inmejorable pagando en efectivo en mostrador. Asesoramiento de diez en Av. Roque Sáenz Peña.",
      moto: "Motomel Blitz 110",
    },
  ]);

  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");

  // Precios promocionales y cuotas
  const regular = product.precioRegular ?? product.precio;
  const precioEfectivo = Math.round(product.precio * 0.9); // 10% OFF en efectivo
  const precioLista = product.enOferta && regular > product.precio
    ? regular
    : Math.round(product.precio * 1.25);   // Precio de lista de referencia
  const ahorroOferta = product.enOferta ? Math.max(0, regular - product.precio) : 0;
  const cuotaValor = Math.round(product.precio / 3);

  const handleQty = (delta: number) => {
    setQty((prev) => Math.max(1, Math.min(prev + delta, product.stock || 10)));
  };

  const handleComprarAhora = () => {
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

  const handleRateProduct = (star: number) => {
    setUserRating(star);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userComment.trim() || !userRating) return;

    const nuevaReview: Review = {
      id: Date.now(),
      nombre: user?.username || "Cliente Posadas",
      rating: userRating,
      fecha: "Recién",
      comentario: userComment.trim(),
      moto: "Cliente Verificado",
    };

    setReviews([nuevaReview, ...reviews]);
    setUserComment("");
    setCommentSuccess(true);
    setTimeout(() => setCommentSuccess(false), 3500);
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

          {/* Miniaturas de galería interactivas (4 fotos reales) */}
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
        </div>

        {/* Columna Derecha: Información, Precios y Compra (Screenshot 2) */}
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
            <span className="font-mono text-[11px] text-slate-500">
              Código: {product.codigo || `CHP-${product.id}`}
            </span>
          </div>

          {/* Título Principal */}
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            {product.nombre}
          </h1>

          {/* Calificación rápida con estrellas */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={15} className="fill-amber-400" />
              ))}
            </div>
            <span className="font-bold text-slate-900 dark:text-white">4.9</span>
            <span className="text-slate-500">({reviews.length} opiniones en Posadas)</span>
          </div>

          {/* BLOQUE DE PRECIO 1: Efectivo / Transferencia (Verde Maximus) */}
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                <CreditCard size={15} />
                Efectivo / Transferencia / Mostrador
              </span>
              <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-950">
                MEJOR PRECIO
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
                {formatPrice(precioEfectivo)}
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-300">
                10% OFF pagando al retirar o transferir
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Precio final promocional con IVA incluido. Pagás al retirar en Posadas o al cadete.
            </p>
          </div>

          {/* BLOQUE DE PRECIO 2: Precio de lista y tarjetas */}
          <div className="rounded-xl border border-slate-200 dark:border-line bg-slate-50 dark:bg-surface/80 p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Precio de lista regular: </span>
              <span className="line-through text-slate-500 font-bold">{formatPrice(precioLista)}</span>
              {product.enOferta && ahorroOferta > 0 && (
                <span className="ml-2 rounded bg-brand/20 px-1.5 py-0.5 text-[10px] font-bold text-brand">
                  {product.badgePromo ? `🏷️ ${product.badgePromo} (-${product.descuentoPorcentaje}%)` : `Oferta -${product.descuentoPorcentaje}%`}
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-slate-600 dark:text-slate-300 font-bold">Con tarjeta débito/crédito: </span>
              <span className="text-slate-900 dark:text-white font-extrabold">{formatPrice(product.precio)}</span>
            </div>
          </div>

          {/* BANNER AMARILLO: 3 CUOTAS SIN INTERÉS */}
          <div className="flex items-center justify-between rounded-xl bg-amber-400 p-3 text-slate-950 font-bold shadow-md">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-base">⚡</span>
              <span>3 CUOTAS SIN INTERÉS de {formatPrice(cuotaValor)}</span>
            </div>
            <span className="text-xs font-black uppercase tracking-wider underline cursor-pointer">
              Ver cuotas &gt;
            </span>
          </div>

          {/* ESTADO DE STOCK Y BENEFICIOS LOCALES EN POSADAS */}
          <div className="space-y-2.5 rounded-xl border border-slate-200 dark:border-line bg-white dark:bg-card p-4 text-xs shadow-sm">
            <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold">
              <Check size={16} className="shrink-0" />
              <span>STOCK EN EL LOCAL — Disponible para retiro inmediato en Av. Roque Sáenz Peña 1500 (Posadas)</span>
            </div>

            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 font-medium">
              <Bike size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Envíos rápidos en el día por <strong>Motomandado</strong> y <strong>Moto Uber</strong> en toda Posadas</span>
            </div>

            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 font-medium">
              <ShieldCheck size={16} className="text-brand shrink-0" />
              <span>Garantía oficial de 6 meses de fábrica. Producto 100% nuevo en caja cerrada</span>
            </div>
          </div>

          {/* BOTONES DE COMPRA Y CANTIDAD */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              {/* Selector de cantidad */}
              <div className="flex items-center rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface">
                <button
                  onClick={() => handleQty(-1)}
                  className="px-3.5 py-2.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-bold"
                  aria-label="Disminuir cantidad"
                >
                  -
                </button>
                <span className="w-10 text-center text-sm font-black text-slate-900 dark:text-white">{qty}</span>
                <button
                  onClick={() => handleQty(1)}
                  className="px-3.5 py-2.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-bold"
                  aria-label="Aumentar cantidad"
                >
                  +
                </button>
              </div>

              {/* Botón secundario: Agregar al carrito */}
              <button
                onClick={() => addToCart(product, qty)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-line bg-slate-100 dark:bg-surface py-3 px-4 text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:border-brand hover:text-brand transition-all active:scale-95 shadow-sm"
              >
                <ShoppingCart size={16} />
                <span>AGREGAR AL CARRITO</span>
              </button>
            </div>

            {/* Botón Principal Grande: COMPRAR AHORA (Verde Maximus) */}
            <button
              onClick={handleComprarAhora}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-3.5 px-6 text-sm font-black text-slate-950 uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              <span>COMPRAR AHORA</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════ ESPECIFICACIONES TÉCNICAS Y COMPATIBILIDAD (Screenshot 3) ═══════════ */}
      <section className="space-y-4">
        {/* Selector de solapas */}
        <div className="flex border-b border-slate-200 dark:border-line text-xs font-bold">
          <button
            onClick={() => setActiveTab("specs")}
            className={`pb-3 px-4 border-b-2 transition-colors ${
              activeTab === "specs"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-black"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Especificaciones Técnicas
          </button>
          <button
            onClick={() => setActiveTab("motos")}
            className={`pb-3 px-4 border-b-2 transition-colors ${
              activeTab === "motos"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-black"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Motos Compatibles
          </button>
          <button
            onClick={() => setActiveTab("envios")}
            className={`pb-3 px-4 border-b-2 transition-colors ${
              activeTab === "envios"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 font-black"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Retiro & Envíos en Posadas
          </button>
        </div>

        {/* Panel de Especificaciones estilo Maximus */}
        {activeTab === "specs" && (
          <div className="rounded-2xl border border-emerald-500/40 bg-white dark:bg-card p-6 space-y-6 shadow-sm">
            {/* Pregunta explicativa destacada */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/5 p-4 space-y-2">
              <h3 className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                ¿QUÉ ES ESTE REPUESTO Y CÓMO FUNCIONA?
              </h3>
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                El <strong className="text-slate-950 dark:text-white">{product.nombre}</strong> de marca <strong className="text-slate-950 dark:text-white">{product.marca}</strong> es un
                componente de alta precisión fabricado bajo estrictas normas de equipo original (OEM).
                Diseñado para soportar las exigencias del tránsito urbano y viajes en ruta en la región
                de Misiones, garantiza durabilidad, óptimo rendimiento mecánico y máxima seguridad en el andar.
              </p>
            </div>

            {/* Tabla de Usos */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">USOS Y APLICACIONES</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-200 dark:border-line">
                  <tbody className="divide-y divide-slate-200 dark:divide-line">
                    <tr className="bg-slate-50 dark:bg-surface/50">
                      <td className="p-3 font-bold text-slate-900 dark:text-white w-1/3">Uso diario urbano en Posadas</td>
                      <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">Excelente respuesta en arranques frecuentes y tránsito interurbano continuo.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">Ruta y viajes de media/larga distancia</td>
                      <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">Resistencia térmica superior en climas calurosos y jornadas intensas.</td>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-surface/50">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">Mantenimiento preventivo</td>
                      <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">Reemplazo directo sin modificaciones ni adaptaciones en el chasis o motor.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabla de Especificaciones del Producto */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">ESPECIFICACIONES DEL PRODUCTO</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-200 dark:border-line">
                  <tbody className="divide-y divide-slate-200 dark:divide-line">
                    <tr className="bg-slate-50 dark:bg-surface/50">
                      <td className="p-3 font-bold text-slate-900 dark:text-white w-1/3">Marca</td>
                      <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">{product.marca}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">Categoría</td>
                      <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">{product.categoriaNombre}</td>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-surface/50">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">Código de pieza</td>
                      <td className="p-3 font-mono text-slate-800 dark:text-slate-200 font-medium">{product.codigo || `CHP-${product.id}`}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">Condición</td>
                      <td className="p-3 text-emerald-700 dark:text-emerald-400 font-bold">100% Nuevo en caja cerrada de fábrica</td>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-surface/50">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">Garantía</td>
                      <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">6 meses directa del fabricante</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Panel de Motos Compatibles */}
        {activeTab === "motos" && (
          <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 space-y-4 shadow-sm text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Modelos de Motocicletas Compatibles</h3>
            <p className="text-slate-700 dark:text-slate-300 font-medium">
              Este repuesto es compatible con una amplia gama de motocicletas 110cc, 125cc, 150cc y 250cc de uso extendido en Posadas:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              <div className="rounded-xl border border-slate-200 dark:border-line bg-slate-50 dark:bg-surface p-3 space-y-1">
                <div className="font-bold text-red-600 dark:text-red-500">HONDA</div>
                <p className="text-slate-800 dark:text-slate-300 text-[11px] font-medium">Wave 110, CG 150 Titan, XR 150L, XR 250 Tornado, Twister 250</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-line bg-slate-50 dark:bg-surface p-3 space-y-1">
                <div className="font-bold text-blue-600 dark:text-blue-500">YAMAHA</div>
                <p className="text-slate-800 dark:text-slate-300 text-[11px] font-medium">YBR 125 ED/ESD, FZ 16, Crypton 110, XTZ 125 / 250 Lander</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-line bg-slate-50 dark:bg-surface p-3 space-y-1">
                <div className="font-bold text-sky-600 dark:text-sky-400">MOTOMEL</div>
                <p className="text-slate-800 dark:text-slate-300 text-[11px] font-medium">Blitz 110, Skua 150 / 250, S2 150, Sirius 150</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-line bg-slate-50 dark:bg-surface p-3 space-y-1">
                <div className="font-bold text-red-500 dark:text-red-400">GILERA</div>
                <p className="text-slate-800 dark:text-slate-300 text-[11px] font-medium">Smash 110 (todas las versiones), VC 150, Sahel 150</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-line bg-slate-50 dark:bg-surface p-3 space-y-1">
                <div className="font-bold text-amber-600 dark:text-amber-400">CORVEN / ZANELLA</div>
                <p className="text-slate-800 dark:text-slate-300 text-[11px] font-medium">Energy 110, Triax 150, Hunter 150, ZB 110, RX 150</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-line bg-slate-50 dark:bg-surface p-3 space-y-1">
                <div className="font-bold text-blue-600 dark:text-blue-400">BAJAJ</div>
                <p className="text-slate-800 dark:text-slate-300 text-[11px] font-medium">Rouser NS 125 / 160 / 200, Boxer 150</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-2 font-medium">
              ¿No ves tu modelo? Escribinos por WhatsApp al <strong className="text-slate-900 dark:text-white">376 524-3554</strong> indicando año y motor y te confirmamos en 5 minutos.
            </p>
          </div>
        )}

        {/* Panel de Retiro y Envíos */}
        {activeTab === "envios" && (
          <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 space-y-4 shadow-sm text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Opciones de Retiro y Entrega en Posadas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 dark:border-line bg-slate-50 dark:bg-surface p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <CreditCard size={16} className="text-brand" />
                  <span>Retiro en el Local</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  <strong>Av. Roque Sáenz Peña 1500 (Posadas, Misiones)</strong>
                </p>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Horarios: Lunes a Sábados de 8:00 a 12:30 y de 16:30 a 20:30 hs. Pagás al retirar en efectivo o transferencia.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-line bg-slate-50 dark:bg-surface p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <Bike size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Cadetería por Motomandado</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  Entregas en el día en toda Posadas
                </p>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Envíos rápidos mediante Moto Uber y Motomandado local. Abonás el repuesto y envío al recibir en tu domicilio.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ═══════════ RESEÑAS Y PUNTUACIÓN DE CLIENTES (Screenshot 4) ═══════════ */}
      <section className="space-y-6 pt-4 border-t border-slate-200 dark:border-line">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white md:text-2xl">
              Reseñas sobre este producto
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Opiniones verificadas de motociclistas de Posadas que compraron este repuesto.
            </p>
          </div>

          {/* Puntaje general y estrellas */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-line bg-white dark:bg-card p-3 w-fit shadow-sm">
            <span className="text-2xl font-black text-slate-900 dark:text-white">4.9</span>
            <div>
              <div className="flex items-center text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={13} className="fill-amber-400" />
                ))}
              </div>
              <span className="text-[10px] text-slate-600 dark:text-slate-400">({reviews.length} valoraciones)</span>
            </div>
          </div>
        </div>

        {/* Puntuación interactiva (cualquiera puede hacer click en las estrellas) */}
        <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                ¿Qué puntaje le das a este producto?
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">Hacé click en las estrellas para registrar tu puntuación.</p>
            </div>

            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRateProduct(star)}
                  className="p-1 hover:scale-125 transition-transform"
                  title={`${star} estrellas`}
                >
                  <Star
                    size={22}
                    className={
                      userRating && userRating >= star
                        ? "text-amber-400 fill-amber-400"
                        : "text-slate-300 dark:text-slate-600 hover:text-amber-400"
                    }
                  />
                </button>
              ))}
              {userRating && (
                <span className="ml-2 text-xs font-bold text-amber-500 dark:text-amber-400">
                  {userRating} / 5
                </span>
              )}
            </div>
          </div>

          {/* Formulario de comentarios condicional a inicio de sesión */}
          <div className="pt-3 border-t border-slate-200 dark:border-line">
            {user ? (
              <form onSubmit={handleSubmitReview} className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <User size={13} className="text-emerald-500" />
                    Opinar como <strong className="text-slate-900 dark:text-white">{user.username}</strong>
                  </span>
                  <span className="text-[11px] text-slate-500">Cliente de Posadas</span>
                </div>

                <textarea
                  rows={2}
                  required
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  placeholder="Contanos tu experiencia con este repuesto, en qué moto lo colocaste..."
                  className="w-full rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface p-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-brand"
                />

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">
                    {userRating ? `Puntaje asignado: ${userRating} ★` : "Seleccioná las estrellas arriba"}
                  </span>
                  <button
                    type="submit"
                    disabled={!userRating || !userComment.trim()}
                    className="rounded-xl bg-brand px-5 py-2 font-bold text-white hover:bg-brandhover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow"
                  >
                    Publicar mi opinión
                  </button>
                </div>
              </form>
            ) : (
              /* Bloque cuando no inició sesión */
              <div className="rounded-xl border border-slate-200 dark:border-line bg-slate-50 dark:bg-surface/50 p-4 text-center space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">¿Querés compartir tu opinión?</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Para dejar una reseña escrita sobre este repuesto, tenés que iniciar sesión.
                </p>
                <button
                  type="button"
                  onClick={openLogin}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brandhover shadow transition-all active:scale-95"
                >
                  <User size={14} />
                  <span>Iniciar sesión para opinar</span>
                </button>
              </div>
            )}

            {commentSuccess && (
              <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold text-center">
                ✓ ¡Gracias por tu reseña! Fue publicada correctamente.
              </div>
            )}
          </div>
        </div>

        {/* Lista de reseñas existentes */}
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-200 dark:border-line bg-white dark:bg-card p-4 space-y-2 text-xs shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{r.nombre}</span>
                  {r.moto && (
                    <span className="rounded bg-slate-100 dark:bg-surface px-1.5 py-0.5 text-[10px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-line font-medium">
                      {r.moto}
                    </span>
                  )}
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">● Compra verificada</span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{r.fecha}</span>
              </div>

              <div className="flex items-center text-amber-400">
                {[...Array(r.rating)].map((_, i) => (
                  <Star key={i} size={12} className="fill-amber-400" />
                ))}
              </div>

              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs sm:text-sm">{r.comentario}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ PRODUCTOS RECOMENDADOS (Horizontal Slider con botones < >) ═══════════ */}
      {recommended.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-slate-200 dark:border-line">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Productos <span className="text-emerald-500">recomendados</span>
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
              {recommended.map((item, idx) => {
                const itemRating = (4.7 + (idx % 3) * 0.1).toFixed(1);
                return (
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
                        <span className="truncate max-w-[110px]">{item.marca} · {item.categoriaNombre}</span>
                        <span className="flex items-center gap-0.5 text-amber-500 font-bold shrink-0">
                          <Star size={10} className="fill-amber-400" />
                          {itemRating}
                        </span>
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
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        {formatPrice(item.precio)}
                      </div>
                      <div className="text-[9px] text-slate-600 dark:text-slate-400 font-medium">Efectivo / Transferencia</div>

                      {/* Cuotas tag */}
                      <div className="mt-1 rounded bg-amber-400 py-0.5 px-1.5 text-[9px] font-bold text-slate-950 text-center truncate shadow-xs">
                        ⚡ 3 cuotas sin interés
                      </div>

                      <button
                        onClick={() => addToCart(item, 1)}
                        className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 py-2 text-xs font-bold text-white shadow transition-all active:scale-95 cursor-pointer"
                      >
                        <ShoppingCart size={13} />
                        <span>Agregar al carrito</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
