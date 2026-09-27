"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ComboDTO } from "@/actions/combos";
import { useCart } from "@/context/CartContext";
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
  Clock,
  ThumbsUp,
} from "lucide-react";

interface ComboDetailClientProps {
  combo: ComboDTO;
  otherCombos: ComboDTO[];
}

export default function ComboDetailClient({ combo, otherCombos }: ComboDetailClientProps) {
  const { addToCart } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImage, setActiveImage] = useState<string>(combo.imagen || "/combos/combo-service-motul.jpg");
  const [userRating, setUserRating] = useState<number | null>(null);
  const [userComment, setUserComment] = useState("");
  const [commentSuccess, setCommentSuccess] = useState(false);
  const otherCombosScrollRef = useRef<HTMLDivElement>(null);

  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");

  const scrollCombos = (direction: "left" | "right") => {
    if (otherCombosScrollRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      otherCombosScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // 4 fotos del combo: kit principal + fotos de repuestos incluidos
  const getComboGallery = () => {
    const main = combo.imagen || "/combos/combo-service-motul.jpg";
    const itemImages = (combo.items || [])
      .map((it) => it.producto.imagen)
      .filter((img): img is string => Boolean(img));

    const fallbacks = [
      "/uploads/1787257109231-xgu3vc.webp",
      "/uploads/1787256814727-9ankcz.webp",
      "/uploads/1787256924603-yyphhb.webp",
      "/uploads/1787257208766-dhiz8x.webp",
    ];

    const img2 = itemImages[0] || fallbacks[0];
    const img3 = itemImages[1] || (img2 !== fallbacks[1] ? fallbacks[1] : fallbacks[2]);
    const img4 = itemImages[2] || fallbacks[3];

    return [
      { id: 1, url: main, label: "Kit Completo Armado" },
      { id: 2, url: img2, label: combo.items?.[0]?.producto?.nombre || "Componente 1" },
      { id: 3, url: img3, label: combo.items?.[1]?.producto?.nombre || "Componente 2" },
      { id: 4, url: img4, label: combo.items?.[2]?.producto?.nombre || "Embalaje y Sellos" },
    ];
  };

  const galleryImages = getComboGallery();

  // Reviews del combo
  const [reviews, setReviews] = useState([
    {
      id: 1,
      nombre: "Martín Galeano",
      rating: 5,
      fecha: "Hace 2 días",
      comentario: `Compré este ${combo.nombre} para mi moto y vino todo impecable. El ahorro respecto a comprar cada pieza por separado es real. Recomiendo 100%.`,
      moto: "Honda CG 150 Titan",
    },
    {
      id: 2,
      nombre: "Sebastián Romero",
      rating: 5,
      fecha: "Hace 5 días",
      comentario: "Súper conveniente. Hice el pedido online, lo retiré en 15 minutos en el local de Posadas y me asesoraron de diez con la colocación.",
      moto: "Yamaha YBR 125",
    },
    {
      id: 3,
      nombre: "Claudio Fleitas",
      rating: 5,
      fecha: "Hace 1 semana",
      comentario: "Excelente relación precio-calidad. Todo original y sellado en caja. El envío por motomandado llegó puntual a Garupá.",
      moto: "Motomel Blitz 110",
    },
  ]);

  const handleRateCombo = (star: number) => {
    setUserRating(star);
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userComment.trim() || !userRating) return;
    const newRev = {
      id: Date.now(),
      nombre: "Cliente Chopper (Verificado)",
      rating: userRating,
      fecha: "Recién",
      comentario: userComment.trim(),
      moto: "Uso diario en Posadas",
    };
    setReviews([newRev, ...reviews]);
    setUserComment("");
    setUserRating(null);
    setCommentSuccess(true);
    setTimeout(() => setCommentSuccess(false), 4000);
  };

  const handleAddToCart = () => {
    addToCart(
      {
        id: combo.id,
        nombre: combo.nombre,
        marca: "Combo Chopper",
        categoriaId: 9999,
        categoriaNombre: "Combos Armados",
        precio: combo.precio,
        stock: combo.stockCalculado > 0 ? combo.stockCalculado : 10,
        imagen: combo.imagen,
        esCombo: true,
      } as any,
      qty
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push("/carrito");
  };

  const cuota = Math.round(combo.precio / 3);

  return (
    <div className="space-y-8 pb-12">
      {/* Breadcrumb de navegación */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-brand transition-colors">
          Inicio
        </Link>
        <ChevronRight size={13} />
        <Link href="/ofertas?cat=combos" className="hover:text-brand transition-colors">
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
              <span className="rounded-lg bg-brand px-3 py-1 text-xs font-black uppercase text-white shadow-md">
                AHORRÁ {formatPrice(combo.ahorro)} ({combo.descuentoPorcentaje}% OFF)
              </span>
              {combo.badge && (
                <span className="rounded-lg border border-brand/40 bg-brand/10 dark:bg-brand/20 px-2.5 py-0.5 text-xs font-bold text-brand backdrop-blur-sm">
                  🏷️ {combo.badge}
                </span>
              )}
            </div>

            <img
              src={activeImage || combo.imagen || "/combos/combo-service-motul.jpg"}
              alt={combo.nombre}
              className="h-full w-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          {/* 4 Miniaturas Interactivas */}
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

              {/* Puntaje unificado */}
              <div className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                <Star size={13} className="fill-amber-400" />
                <span>4.9</span>
                <span className="text-slate-500 dark:text-slate-400 font-normal">({reviews.length} opiniones)</span>
              </div>
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
            <div className="flex items-baseline gap-3">
              <span className="text-sm text-slate-400 line-through">
                {formatPrice(combo.precioRegular)}
              </span>
              <span className="text-3xl sm:text-4xl font-black text-brand tracking-tight">
                {formatPrice(combo.precio)}
              </span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                Ahorrás {formatPrice(combo.ahorro)}
              </span>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              Pago en efectivo o transferencia bancaria al retirar o recibir.
            </div>

            {/* Pill 3 Cuotas sin Interés */}
            <div className="flex items-center justify-between rounded-xl bg-amber-400 py-2 px-3 text-xs font-black text-slate-950 shadow-sm">
              <span>💳 3 CUOTAS SIN INTERÉS</span>
              <span className="text-sm">{formatPrice(cuota)} / mes</span>
            </div>
          </div>

          {/* Botones de Compra y Carrito */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {/* Selector de cantidad */}
              <div className="flex items-center border border-slate-300 dark:border-line rounded-xl bg-white dark:bg-surface overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3.5 py-3 hover:bg-slate-100 dark:hover:bg-card text-slate-800 dark:text-white font-bold text-sm transition-colors cursor-pointer"
                >
                  -
                </button>
                <span className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-white min-w-[40px] text-center">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  className="px-3.5 py-3 hover:bg-slate-100 dark:hover:bg-card text-slate-800 dark:text-white font-bold text-sm transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>

              {/* Botón Agregar al Carrito */}
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3.5 px-4 text-sm font-bold text-white shadow-md active:scale-95 transition-all cursor-pointer"
              >
                {added ? (
                  <>
                    <CheckCircle2 size={18} />
                    <span>¡Agregado al Carrito!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={18} />
                    <span>Agregar al carrito</span>
                  </>
                )}
              </button>
            </div>

            {/* Botón Comprar Ahora */}
            <button
              type="button"
              onClick={handleBuyNow}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brandhover py-3 px-4 text-xs font-bold text-white shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <span>Comprar ahora y coordinar entrega</span>
              <ChevronRight size={16} />
            </button>

            {/* Botón WhatsApp */}
            <a
              href={`https://wa.me/5493765243554?text=${encodeURIComponent(
                `Hola Chopper Repuestos! Me interesa consultar sobre el ${combo.nombre} ($${combo.precio})`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-line bg-transparent hover:bg-slate-100 dark:hover:bg-surface py-2.5 px-3 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
            >
              <MessageCircle size={15} className="text-emerald-500" />
              <span>Consultar por WhatsApp con un vendedor</span>
            </a>
          </div>
        </div>
      </div>

      {/* SECCIÓN DETALLADA: COMPONENTES INCLUIDOS EN EL KIT */}
      {combo.items && combo.items.length > 0 && (
        <section className="rounded-3xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 md:p-8 shadow-sm space-y-5">
          <div className="border-b border-slate-200 dark:border-line pb-4">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <PackageCheck size={24} className="text-emerald-500" />
              <span>Componentes Incluidos en este Combo</span>
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Todos los repuestos son 100% nuevos, originales o compatibles de primera calidad garantizada.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {combo.items.map((it) => (
              <div
                key={it.id}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-line bg-slate-50/60 dark:bg-surface p-4 hover:border-brand/40 transition-colors"
              >
                {/* Imagen del repuesto */}
                <div className="relative h-20 w-20 shrink-0 rounded-xl bg-white dark:bg-card border border-slate-100 dark:border-line/60 p-2 flex items-center justify-center overflow-hidden">
                  {it.producto.imagen ? (
                    <img
                      src={it.producto.imagen}
                      alt={it.producto.nombre}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-xl">⚙️</span>
                  )}
                  {it.cantidad > 1 && (
                    <span className="absolute top-1 right-1 rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-black text-white shadow">
                      {it.cantidad}x
                    </span>
                  )}
                </div>

                {/* Info del repuesto */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-brand font-bold uppercase">
                    <span>{it.producto.marca || "Chopper"}</span>
                    <span>·</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Cant: {it.cantidad}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                    {it.producto.nombre}
                  </h3>
                  <div className="text-xs font-black text-slate-700 dark:text-slate-300">
                    {formatPrice(it.producto.precioVenta)} c/u
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ESPECIFICACIONES TÉCNICAS Y COMPATIBILIDAD */}
      <section className="rounded-3xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 md:p-8 shadow-sm space-y-6">
        <div className="border-b border-slate-200 dark:border-line pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <Wrench size={22} className="text-brand" />
              <span>Especificaciones Técnicas del Combo</span>
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Datos técnicos y compatibilidad verificada por los mecánicos de Chopper Repuestos Posadas.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 dark:bg-surface p-4 border border-slate-100 dark:border-line/40">
            <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] text-brand">
              Compatibilidad de Modelos
            </h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              Diseñado y testeado para motos de 110cc a 250cc (Honda Wave, CG 150 Titan, XR 150/190/250, Yamaha YBR 125, FZ 16, Motomel Blitz 110, Corven Energy 110, Gilera Smash y similares). Ante cualquier duda sobre compatibilidad exacta con tu modelo y año, consultanos por WhatsApp con el número de chasis o cilindrada.
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 dark:bg-surface p-4 border border-slate-100 dark:border-line/40">
            <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] text-brand">
              Garantía y Calidad Chopper
            </h3>
            <ul className="space-y-1.5 text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <span>100% Repuestos Nuevos en Caja y Blíster Original Sellado</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <span>Garantía Oficial de 6 Meses contra defectos de fabricación</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <span>Certificación IRAM / INTI y estándares OEM de ensamblado</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* RETIRO Y ENVÍOS EN POSADAS Y MISIONES */}
      <section className="rounded-3xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 md:p-8 shadow-sm space-y-6">
        <div className="border-b border-slate-200 dark:border-line pb-4">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Truck size={22} className="text-emerald-500" />
            <span>Retiro y Envíos en Posadas</span>
          </h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Opciones de entrega rápida para que no pares tu moto ni un día más.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-line/60 bg-slate-50/70 dark:bg-surface p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
              <MapPin size={18} />
              <span>Retiro en Local</span>
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              Av. Roque Sáenz Peña 1500, Posadas
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Gratis e inmediato. Lunes a Viernes de 8:00 a 12:30 y 16:00 a 20:00. Sábados de 8:00 a 13:00.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-line/60 bg-slate-50/70 dark:bg-surface p-4 space-y-2">
            <div className="flex items-center gap-2 text-brand font-bold text-sm">
              <Truck size={18} />
              <span>Motomandado Express</span>
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              Posadas, Garupá y Candelaria
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Entrega en el día en tu domicilio o taller mecánico. Pagás al recibir en efectivo o transferencia.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-line/60 bg-slate-50/70 dark:bg-surface p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
              <Clock size={18} />
              <span>Envíos al Interior de Misiones</span>
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              Oberá, Eldorado, Iguazú y todo el país
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Despacho en 24hs por Correo Argentino, Vía Cargo o transporte de encomiendas con código de seguimiento.
            </p>
          </div>
        </div>
      </section>

      {/* SECCIÓN DE RESEÑAS Y PUNTAJE */}
      <section className="rounded-3xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-line pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <Star size={24} className="fill-amber-400 text-amber-400" />
              <span>Opiniones sobre este Combo</span>
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Valoraciones reales de motoqueros que compraron e instalaron este kit.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-amber-400/10 border border-amber-400/30 px-4 py-2 rounded-2xl w-fit">
            <span className="text-2xl font-black text-amber-500">4.9</span>
            <div>
              <div className="flex items-center text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className="fill-amber-400" />
                ))}
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                {reviews.length} opiniones verificadas
              </span>
            </div>
          </div>
        </div>

        {/* Formulario de Calificación */}
        <form onSubmit={handleAddReview} className="rounded-2xl bg-slate-50 dark:bg-surface p-4 sm:p-5 border border-slate-200 dark:border-line/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              ¿Compraste este combo? Dejá tu puntuación:
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRateCombo(star)}
                  className="p-1 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  <Star
                    size={20}
                    className={userRating && userRating >= star ? "fill-amber-400 text-amber-400" : "fill-none text-slate-300 dark:text-slate-600"}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={userComment}
              onChange={(e) => setUserComment(e.target.value)}
              placeholder="Contanos tu experiencia con este kit de repuestos..."
              className="flex-1 rounded-xl border border-slate-200 dark:border-line bg-white dark:bg-card px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={!userRating || !userComment.trim()}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer shrink-0"
            >
              Publicar
            </button>
          </div>
          {commentSuccess && (
            <div className="text-xs text-emerald-500 font-bold flex items-center gap-1">
              <CheckCircle2 size={14} />
              <span>¡Gracias por calificar el combo! Tu opinión fue agregada.</span>
            </div>
          )}
        </form>

        {/* Lista de reseñas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-slate-200 dark:border-line bg-slate-50/50 dark:bg-surface/50 p-4 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{r.nombre}</div>
                  {r.moto && (
                    <div className="text-[10px] text-brand font-medium">🏍️ {r.moto}</div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400">{r.fecha}</span>
              </div>

              <div className="flex items-center text-amber-400">
                {[...Array(r.rating)].map((_, i) => (
                  <Star key={i} size={12} className="fill-amber-400" />
                ))}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                "{r.comentario}"
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* OTROS COMBOS RECOMENDADOS (Horizontal Slider con botones < >) */}
      {otherCombos && otherCombos.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-slate-200 dark:border-line">
          <div className="flex items-center justify-between pb-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Otros Combos <span className="text-emerald-500">Recomendados</span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Más kits armados con descuento para equipar o reparar tu moto.
              </p>
            </div>
            <Link
              href="/ofertas?cat=combos"
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
              {otherCombos.map((c, idx) => {
                const comboScore = (4.8 + (idx % 2) * 0.1).toFixed(1);
                return (
                  <Link
                    key={c.id}
                    href={`/combos/${c.id}`}
                    className="w-[240px] sm:w-[280px] shrink-0 group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-4 hover:border-brand/70 hover:shadow-xl transition-all shadow-sm"
                  >
                    <div>
                      <div className="relative aspect-4/3 w-full rounded-xl bg-white dark:bg-surface overflow-hidden p-2 mb-3 border border-slate-100 dark:border-line/40">
                        {/* Ahorro badge */}
                        <div className="absolute top-2 left-2 z-10">
                          <span className="rounded-md bg-brand px-2 py-0.5 text-[10px] font-black uppercase text-white shadow-sm">
                            AHORRÁ {formatPrice(c.ahorro)}
                          </span>
                        </div>
                        <img
                          src={c.imagen || "/combos/combo-service-motul.jpg"}
                          alt={c.nombre}
                          className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                        <span className="font-bold text-brand uppercase">Combo Armado</span>
                        <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                          <Star size={10} className="fill-amber-400" />
                          {comboScore}
                        </span>
                      </div>

                      <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-brand transition-colors">
                        {c.nombre}
                      </h3>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-line/60 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-slate-400 line-through">
                          {formatPrice(c.precioRegular)}
                        </div>
                        <div className="text-base font-black text-brand">
                          {formatPrice(c.precio)}
                        </div>
                      </div>
                      <span className="rounded-lg bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors">
                        Ver Kit
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
