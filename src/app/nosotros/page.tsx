"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Clock,
  Phone,
  Mail,
  ShieldCheck,
  Wrench,
  Sparkles,
  Send,
  CheckCircle,
  ExternalLink,
  ArrowLeft,
  MessageCircle,
  Bike,
} from "lucide-react";

export default function NosotrosPage() {
  const [formState, setFormState] = useState({
    nombre: "",
    telefono: "",
    email: "",
    moto: "",
    mensaje: "",
  });
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [ultimoEnvio, setUltimoEnvio] = useState<{
    nombre: string;
    telefono: string;
    email: string;
    canal: "WHATSAPP" | "EMAIL";
  } | null>(null);

  const formatMessageText = () => {
    return `¡Hola Chopper Repuestos! Te envío una consulta desde la web:
👤 *Nombre:* ${formState.nombre.trim()}
📞 *Teléfono / WhatsApp:* ${formState.telefono.trim()}
📧 *Email:* ${formState.email.trim() || "No especificado"}
🏍️ *Moto:* ${formState.moto.trim() || "No especificada"}
🔧 *Repuesto o consulta:*
${formState.mensaje.trim()}`;
  };

  const handleSendWhatsApp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formState.nombre.trim() || !formState.telefono.trim() || !formState.mensaje.trim()) {
      alert("Por favor completá tu nombre, teléfono y el repuesto que necesitás.");
      return;
    }

    const texto = formatMessageText();
    const url = `https://wa.me/5493765243554?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");

    setUltimoEnvio({
      nombre: formState.nombre,
      telefono: formState.telefono,
      email: formState.email,
      canal: "WHATSAPP",
    });
    setEnviado(true);
  };

  const handleSendEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formState.nombre.trim() || !formState.mensaje.trim()) {
      alert("Por favor completá tu nombre y la consulta.");
      return;
    }

    const asunto = `Consulta de Repuesto - ${formState.nombre.trim()} (${formState.moto.trim() || "Moto"})`;
    const cuerpo = `Hola Chopper Repuestos,

Les envío mi consulta desde la tienda online:

Nombre: ${formState.nombre.trim()}
Teléfono / WhatsApp: ${formState.telefono.trim()}
Email: ${formState.email.trim() || "No especificado"}
Moto: ${formState.moto.trim() || "No especificada"}

Repuesto o consulta:
${formState.mensaje.trim()}

Aguardo su respuesta con cotización y disponibilidad en el local de Posadas. Muchas gracias!`;

    const mailtoUrl = `mailto:contacto@chopperrepuestos.com?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    window.location.href = mailtoUrl;

    setUltimoEnvio({
      nombre: formState.nombre,
      telefono: formState.telefono,
      email: formState.email,
      canal: "EMAIL",
    });
    setEnviado(true);
  };

  return (
    <div className="mt-6 space-y-12 max-w-5xl mx-auto">
      {/* Botón Volver */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Volver al inicio
      </Link>

      {/* Hero: Sobre Nosotros Adaptativo */}
      <section className="nosotros-hero-adaptive relative overflow-hidden rounded-2xl border border-line bg-card p-6 sm:p-10 shadow-sm">
        <div className="grid gap-8 md:grid-cols-12 md:items-center">
          <div className="md:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              <Sparkles size={14} />
              <span>POSADAS, MISIONES · FUNDADA EN JULIO DE 2024</span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
              Sobre Chopper Repuestos
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Somos una empresa familiar de Posadas, Misiones, nacida con la misión de abastecer
              la demanda de repuestos y accesorios para motocicletas en la región,
              ofreciendo soluciones rápidas, accesibles y con asesoramiento de confianza.
            </p>

            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              <strong>100% repuestos nuevos:</strong> Bajo ningún concepto comercializamos artículos
              usados o reacondicionados. Comercializamos tanto de manera presencial en nuestro local
              como a través de nuestra plataforma online con entregas por <strong>Motomandado</strong> y <strong>Moto Uber</strong>.
            </p>

            <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-brand" /> Repuestos nuevos garantizados
              </span>
              <span className="flex items-center gap-1.5">
                <Bike size={16} className="text-emerald-400" /> Motomandado en Posadas
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={16} className="text-brand" /> Local en Posadas, Misiones
              </span>
            </div>
          </div>

          {/* Logo Oficial Grande que ocupa todo el recuadro */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="relative w-full aspect-[7/4] overflow-hidden rounded-2xl border border-line/80 bg-[#121316] shadow-2xl group">
              <Image
                src="/logo-badge.png"
                alt="Logo Chopper Repuestos - Posadas Misiones"
                fill
                priority
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            {/* Texto sacado afuera del recuadro */}
            <div className="mt-3.5 flex flex-col items-center text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-4 py-1 text-xs font-bold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Atención presencial y envíos en Posadas
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Módulo de Ubicación con MAPA REAL MARCADO */}
      <section id="ubicacion" className="scroll-mt-24 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Ubicación del Local & Envíos
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Vení a retirar tu pedido personalmente o solicitalo por motomandado en Posadas, Misiones.
            </p>
          </div>

          <a
            href="https://www.google.com/maps/place/Av.+Roque+S%C3%A1enz+Pe%C3%B1a+1500,+N3301BJF+Posadas,+Misiones/@-27.3649105,-55.8869655,17z"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
          >
            <span>Abrir en Google Maps</span>
            <ExternalLink size={13} />
          </a>
        </div>

        <div className="grid gap-6 md:grid-cols-12">
          {/* Datos del Local */}
          <div className="md:col-span-5 space-y-4">
            <div className="rounded-2xl border border-line bg-card p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <MapPin size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Local Comercial</h4>
                  <p className="text-sm text-brand mt-0.5 font-black">
                    Av. Roque Sáenz Peña 1500
                  </p>
                  <p className="text-xs text-slate-400">
                    Posadas, Misiones, Argentina
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Venta en mostrador y depósito de repuestos
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-line/60">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Clock size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Horarios de Atención</h4>
                  <div className="text-xs text-slate-300 mt-0.5 space-y-0.5">
                    <p>
                      <strong>Lunes a Sábados:</strong> 8:00 a 12:30 y 16:30 a 20:30 hs
                    </p>
                    <p className="text-slate-500">
                      Domingos y feriados: Cerrado
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-line/60">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Bike size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Cadetería Local</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Envíos directos en el día vía <strong>Motomandado</strong> y <strong>Moto Uber</strong> en toda la ciudad.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-4 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
                <Phone size={14} />
                <span>Teléfono / WhatsApp</span>
              </div>
              <p className="text-sm font-black text-white font-mono">
                376 524-3554
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Atención rápida para consultas de compatibilidad y pedidos.
              </p>
            </div>
          </div>

          {/* MAPA REAL EMBEBIDO INTERACTIVO MARCANDO AV. ROQUE SAENZ PEÑA 1500 */}
          <div className="md:col-span-7 rounded-2xl border border-line bg-card overflow-hidden flex flex-col shadow-xl">
            <div className="p-3.5 border-b border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs bg-surface/60">
              <span className="font-black text-white flex items-center gap-1.5 text-sm">
                <MapPin size={16} className="text-brand" />
                Av. Roque Sáenz Peña 1500 (Posadas, Misiones)
              </span>
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Punto de retiro marcado
              </span>
            </div>

            {/* Iframe interactivo de OpenStreetMap con marcador en Av. Roque Sáenz Peña 1500 */}
            <div className="relative w-full h-[320px] bg-[#1a1b22]">
              <iframe
                title="Mapa de ubicación en Av. Roque Sáenz Peña 1500, Posadas"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-55.8910%2C-27.3675%2C-55.8830%2C-27.3625&layer=mapnik&marker=-27.36491%2C-55.88697"
              />
            </div>

            <div className="p-3 bg-surface text-center flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                Chopper Repuestos · <strong>Av. Roque Sáenz Peña 1500</strong> (casi Santa Fe / Colón)
              </span>
              <a
                href="https://www.google.com/maps/place/Av.+Roque+S%C3%A1enz+Pe%C3%B1a+1500,+N3301BJF+Posadas,+Misiones/@-27.3649105,-55.8869655,17z"
                target="_blank"
                rel="noreferrer"
                className="text-brand font-bold hover:underline inline-flex items-center gap-1"
              >
                <span>Cómo llegar en GPS / Google Maps</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Módulo de Contacto */}
      <section id="contacto" className="scroll-mt-24 space-y-6">
        <div className="border-b border-line pb-4">
          <h2 className="text-2xl font-black tracking-tight text-white">
            Contactate con Nosotros
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            ¿Buscás un repuesto para tu moto o querés consultar stock? Escribinos directamente.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-12">
          {/* Canales Directos */}
          <div className="md:col-span-5 space-y-3">
            <a
              href="https://wa.me/5493765243554?text=Hola%20Chopper%20Repuestos!%20Quiero%20hacer%20una%20consulta"
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 hover:border-emerald-500/60 transition-all group"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <MessageCircle size={22} />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                  Atención Inmediata
                </span>
                <h4 className="text-sm font-bold text-white group-hover:text-emerald-300">
                  WhatsApp Oficial
                </h4>
                <p className="text-sm text-emerald-400 font-mono font-bold mt-0.5">
                  376 524-3554
                </p>
              </div>
            </a>

            <div className="rounded-2xl border border-line bg-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-brand">
                  <Mail size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Correo Electrónico</h4>
                  <a
                    href="mailto:contacto@chopperrepuestos.com"
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    contacto@chopperrepuestos.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-line/60">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-brand">
                  <Bike size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Envíos por Cadetería</h4>
                  <p className="text-xs text-slate-400">
                    Motomandado y Moto Uber en Posadas
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Formulario de Contacto Funcional */}
          <div className="md:col-span-7 rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">
              Envianos tu consulta
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-5">
              Te respondemos en el día con la cotización o disponibilidad del repuesto en Posadas.
            </p>

            {enviado ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-6 text-center space-y-3">
                <CheckCircle size={40} className="text-emerald-500 mx-auto" />
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                  ¡Consulta enviada con éxito!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  Recibimos tu solicitud, <span className="font-bold text-slate-900 dark:text-white">{ultimoEnvio?.nombre || "amigo motero"}</span>. Te responderemos en el día con cotización y disponibilidad de stock a tu teléfono/WhatsApp <span className="font-bold text-slate-900 dark:text-white">{ultimoEnvio?.telefono}</span>{ultimoEnvio?.email ? ` o a tu correo ${ultimoEnvio.email}` : ""}.
                </p>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <a
                    href="https://wa.me/5493765243554"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] px-4 py-2.5 text-xs font-bold text-white shadow transition-all active:scale-95"
                  >
                    <MessageCircle size={15} />
                    <span>Abrir chat de WhatsApp (376 524-3554)</span>
                  </a>
                  <button
                    onClick={() => {
                      setEnviado(false);
                      setFormState({
                        nombre: "",
                        telefono: "",
                        email: "",
                        moto: "",
                        mensaje: "",
                      });
                    }}
                    className="rounded-xl border border-slate-300 dark:border-line px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface transition-all"
                  >
                    Enviar otra consulta
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendWhatsApp} className="space-y-4 text-xs">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Tu nombre y apellido *
                    </label>
                    <input
                      required
                      value={formState.nombre}
                      onChange={(e) =>
                        setFormState({ ...formState, nombre: e.target.value })
                      }
                      placeholder="Ej: Carlos Gómez"
                      className="w-full rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface px-3 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Teléfono / WhatsApp *
                    </label>
                    <input
                      required
                      value={formState.telefono}
                      onChange={(e) =>
                        setFormState({ ...formState, telefono: e.target.value })
                      }
                      placeholder="Ej: 376 412-3456"
                      className="w-full rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface px-3 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-brand"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formState.email}
                      onChange={(e) =>
                        setFormState({ ...formState, email: e.target.value })
                      }
                      placeholder="tunombre@gmail.com"
                      className="w-full rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface px-3 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Marca, modelo y año de tu moto
                    </label>
                    <input
                      value={formState.moto}
                      onChange={(e) =>
                        setFormState({ ...formState, moto: e.target.value })
                      }
                      placeholder="Ej: Honda Wave 110 / Gilera Smash 110"
                      className="w-full rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface px-3 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-brand"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Repuesto o consulta que necesitás *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formState.mensaje}
                    onChange={(e) =>
                      setFormState({ ...formState, mensaje: e.target.value })
                    }
                    placeholder="Contanos qué pieza o repuesto estás buscando..."
                    className="w-full rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-brand resize-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] py-3 text-xs font-bold text-white shadow transition-all active:scale-95"
                  >
                    <MessageCircle size={16} />
                    <span>Enviar por WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendEmail}
                    className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-xl border border-brand/40 bg-brand/10 hover:bg-brand/20 py-3 text-xs font-bold text-brand transition-all active:scale-95"
                  >
                    <Mail size={16} />
                    <span>Enviar por Correo</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
