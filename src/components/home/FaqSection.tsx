"use client";

import React, { useState } from "react";
import {
  ShoppingBag,
  CreditCard,
  MapPin,
  ShieldCheck,
  Building,
  Plus,
  Minus,
  Bike,
  MessageCircle,
} from "lucide-react";

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export default function FaqSection() {
  const [activeCategory, setActiveCategory] = useState("compras");
  const [openId, setOpenId] = useState<string | null>("c1");

  const categories = [
    { id: "compras", label: "Compras y Pedidos", count: 4, icon: ShoppingBag },
    { id: "envios", label: "Envíos y Retiro", count: 3, icon: Bike },
    { id: "pagos", label: "Pagos y Facturación", count: 3, icon: CreditCard },
    { id: "garantias", label: "Garantías y Calidad", count: 2, icon: ShieldCheck },
    { id: "empresa", label: "Sobre Chopper Repuestos", count: 2, icon: Building },
  ];

  const faqs: FaqItem[] = [
    {
      id: "c1",
      category: "compras",
      question: "¿Cómo realizo un pedido en la tienda online?",
      answer:
        "Elegís el repuesto o combo que necesitás en nuestro catálogo, lo agregás al carrito, completás tus datos en el checkout y seleccionás si vas a retirar por el local o si preferís envío por motomandado en Posadas. Te generamos una orden con número (#ORD-XXXX) para su seguimiento.",
    },
    {
      id: "c2",
      category: "compras",
      question: "¿Es necesario crear una cuenta para comprar?",
      answer:
        "No es obligatorio. Podés ingresar tu nombre, teléfono y DNI en el checkout para que identifiquemos tu orden rápidamente cuando vengas a retirarla o coordinemos el motomandado.",
    },
    {
      id: "c3",
      category: "compras",
      question: "¿Puedo pedir asesoramiento sobre qué pieza lleva mi moto?",
      answer:
        "¡Totalmente! Escribinos a nuestro WhatsApp (+54 9 376 524-3554) indicando marca, modelo y año de tu moto (Honda Wave, Yamaha YBR, Gilera Smash, Motomel Blitz, etc.) y te confirmamos la compatibilidad exacta.",
    },
    {
      id: "c4",
      category: "compras",
      question: "¿Venden repuestos usados o de desarme?",
      answer:
        "No. En Chopper Repuestos todos los artículos son 100% nuevos en sus cajas de fábrica. No comercializamos productos usados ni reacondicionados bajo ningún concepto.",
    },
    {
      id: "e1",
      category: "envios",
      question: "¿Tienen envíos a domicilio en Posadas?",
      answer:
        "Sí, contamos con servicio de cadetería por Motomandado y Moto Uber en todo el ejido urbano de Posadas, Misiones. El envío se abona al recibir tu pedido.",
    },
    {
      id: "e2",
      category: "envios",
      question: "¿Dónde y en qué horarios puedo retirar personalmente?",
      answer:
        "Podés retirar por nuestro local comercial en Av. Roque Sáenz Peña 1500 (Posadas, Misiones). Atendemos de Lunes a Sábados de 8:00 a 12:30 y de 16:30 a 20:30 hs.",
    },
    {
      id: "e3",
      category: "envios",
      question: "¿Cuánto demora en estar listo mi pedido?",
      answer:
        "La mayoría de las órdenes se alistan en el mismo día. Si solicitás motomandado, coordinamos la entrega dentro de la franja horaria que te quede más cómoda.",
    },
    {
      id: "p1",
      category: "pagos",
      question: "¿Cuáles son los medios de pago aceptados?",
      answer:
        "Aceptamos efectivo con precio promocional y transferencias bancarias directas o billeteras virtuales (Mercado Pago, Cuenta DNI, Ualá). Abonás al retirar en mostrador o al cadete.",
    },
    {
      id: "p2",
      category: "pagos",
      question: "¿Cómo informo el pago si transfiero por Mercado Pago o banco?",
      answer:
        "Podés usar la opción 'Subir Comprobante' en el menú o enviarnos la captura de la transferencia directamente a nuestro WhatsApp con tu número de orden.",
    },
    {
      id: "p3",
      category: "pagos",
      question: "¿Emiten comprobante de compra o factura?",
      answer:
        "Sí, entregamos comprobante impreso en mostrador y podemos enviarte el comprobante digital por WhatsApp o correo electrónico.",
    },
    {
      id: "g1",
      category: "garantias",
      question: "¿Los repuestos tienen garantía?",
      answer:
        "Todos nuestros repuestos nuevos cuentan con garantía por defectos de fabricación directa de fábrica (Motul, Castrol, Pirelli, DID, NGK, Bosch, etc.).",
    },
    {
      id: "g2",
      category: "garantias",
      question: "¿Qué pasa si compré una pieza que no era para mi modelo?",
      answer:
        "Tenés 7 días para realizar el cambio en nuestro local de Posadas, siempre que el producto se encuentre en su envoltorio original y sin marcas de instalación.",
    },
    {
      id: "em1",
      category: "empresa",
      question: "¿Quiénes forman Chopper Repuestos?",
      answer:
        "Somos una empresa familiar fundada en julio de 2024 en Posadas, Misiones. Contamos con un equipo dedicado de atención, ventas y depósito para garantizar la mejor experiencia a los motociclistas de la región.",
    },
    {
      id: "em2",
      category: "empresa",
      question: "¿Dónde está ubicado el local de Chopper Repuestos?",
      answer:
        "Nuestro local comercial y depósito se encuentra ubicado en Av. Roque Sáenz Peña 1500, Posadas, Misiones. Podés ver el mapa interactivo y coordenadas GPS en la sección Nosotros.",
    },
  ];

  const filteredFaqs = faqs.filter((f) => f.category === activeCategory);

  const toggleFaq = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="faq" className="mt-16 scroll-mt-24">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-slate-200 dark:border-line pb-4 mb-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white md:text-3xl">
            Preguntas Frecuentes
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Encontrá respuestas sobre pedidos, envíos por motomandado, pagos y retiro en Posadas, Misiones.
          </p>
        </div>
        <a
          href="https://wa.me/5493765243554"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors"
        >
          <MessageCircle size={14} />
          <span>¿Dudas adicionales? Escribinos por WhatsApp (376 524-3554) →</span>
        </a>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Selector de Categorías (Sidebar) */}
        <div className="lg:col-span-4 space-y-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  const firstOfCat = faqs.find((f) => f.category === cat.id);
                  if (firstOfCat) setOpenId(firstOfCat.id);
                }}
                className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-left text-xs font-bold transition-all border ${
                  isActive
                    ? "border-brand bg-brand/10 text-brand shadow-sm"
                    : "border-slate-200 dark:border-line bg-white dark:bg-card text-slate-700 dark:text-slate-300 hover:border-brand/40 hover:text-brand dark:hover:text-white shadow-sm"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={16}
                    className={isActive ? "text-brand" : "text-slate-400"}
                  />
                  <span>{cat.label}</span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isActive
                      ? "bg-brand text-white"
                      : "bg-slate-100 dark:bg-surface text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-line"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Acordeón de preguntas */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-4 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-line text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            <span>{categories.find((c) => c.id === activeCategory)?.label}</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
              {filteredFaqs.length} respuestas
            </span>
          </div>

          <div className="space-y-2.5">
            {filteredFaqs.map((faq) => {
              const isOpen = openId === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`rounded-xl border transition-all overflow-hidden ${
                    isOpen
                      ? "border-brand/40 bg-slate-50 dark:bg-surface shadow-sm"
                      : "border-slate-200 dark:border-line bg-white dark:bg-surface/50 hover:border-slate-300 dark:hover:border-line hover:bg-slate-50 dark:hover:bg-surface"
                  }`}
                >
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
                  >
                    <span className="pr-4">{faq.question}</span>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 dark:border-line bg-slate-100 dark:bg-card text-slate-600 dark:text-slate-400">
                      {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-slate-800 dark:text-slate-300 leading-relaxed border-t border-slate-200 dark:border-line/40 font-medium">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
