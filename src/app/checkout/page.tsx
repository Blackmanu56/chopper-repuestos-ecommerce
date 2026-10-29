"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useConfig } from "@/context/ConfigContext";
import {
  MapPin,
  Bike,
  CreditCard,
  Building,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Lock,
  AlertCircle,
  Clock,
  Ticket,
  RefreshCw,
  CheckCircle,
  Upload,
  Zap,
  XCircle,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import {
  detectarMarcaTarjeta,
  formatearNumeroTarjeta,
  validarNumeroTarjeta,
  formatearVencimiento,
  validarVencimiento,
  validarCvv,
  validarTitular,
} from "@/lib/cardValidation";
import { validarPreciosServerAction, ValidatedCartItem } from "@/actions/commercial";
import {
  crearPedidoOnlineAction,
  subirComprobantePedidoAction,
  subirComprobanteDirectoAction,
  limpiarComprobanteHuerfanoAction,
} from "@/actions/pedidos";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, openLogin } = useAuth();
  const { items, subtotal, clearCart, crearPedido, isStaff, sincronizarCarrito } = useCart();
  const { config } = useConfig();
  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");

  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [modalidadEntrega, setModalidadEntrega] = useState<"RETIRO_LOCAL" | "MOTOMANDADO">("RETIRO_LOCAL");
  const [formData, setFormData] = useState({
    nombre: user?.nombreCompleto || "",
    dni: user?.dni || "",
    tel: user?.telefono || "",
    email: user?.correo || "",
    direccionEnvio: user?.direccion || "",
    pago: "TRANSFERENCIA" as "TRANSFERENCIA" | "TARJETA" | "EFECTIVO_LOCAL",
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        nombre: prev.nombre || user.nombreCompleto || "",
        dni: prev.dni || user.dni || "",
        tel: prev.tel || user.telefono || "",
        email: prev.email || user.correo || "",
        direccionEnvio: prev.direccionEnvio || user.direccion || "",
      }));
    }
  }, [user]);

  // Si se selecciona Motomandado y el pago estaba en Efectivo en el local, cambiar a Transferencia
  useEffect(() => {
    if (modalidadEntrega === "MOTOMANDADO" && formData.pago === "EFECTIVO_LOCAL") {
      setFormData((prev) => ({ ...prev, pago: "TRANSFERENCIA" }));
    }
  }, [modalidadEntrega, formData.pago]);

  // Datos de Tarjeta de Débito
  const [tarjetaNumero, setTarjetaNumero] = useState("");
  const [tarjetaTitular, setTarjetaTitular] = useState("");
  const [tarjetaVence, setTarjetaVence] = useState("");
  const [tarjetaCvv, setTarjetaCvv] = useState("");
  const [mostrarCvv, setMostrarCvv] = useState(false);
  const [tarjetaErrores, setTarjetaErrores] = useState<{
    numero?: string;
    titular?: string;
    vencimiento?: string;
    cvv?: string;
  }>({});
  const [tarjetaTouched, setTarjetaTouched] = useState<{
    numero?: boolean;
    titular?: boolean;
    vencimiento?: boolean;
    cvv?: boolean;
  }>({});

  const marcaDetectada = detectarMarcaTarjeta(tarjetaNumero);

  const handleNumeroTarjetaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const rawValue = input.value;
    const cursorPosition = input.selectionStart || 0;

    // Conteo de dígitos antes del cursor en el valor previo
    const digitsBeforeCursor = rawValue.slice(0, cursorPosition).replace(/\D/g, "").length;

    // Formatear valor limpio según la marca detectada
    const formatted = formatearNumeroTarjeta(rawValue);
    setTarjetaNumero(formatted);

    // Ajustar posición del cursor para evitar saltos indeseados
    requestAnimationFrame(() => {
      let currentDigits = 0;
      let newCursor = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) currentDigits++;
        if (currentDigits === digitsBeforeCursor) {
          newCursor = i + 1;
          break;
        }
      }
      if (digitsBeforeCursor === 0) newCursor = 0;
      if (input && typeof input.setSelectionRange === "function") {
        input.setSelectionRange(newCursor, newCursor);
      }
    });

    if (tarjetaTouched.numero) {
      const v = validarNumeroTarjeta(formatted);
      setTarjetaErrores((prev) => ({ ...prev, numero: v.valido ? undefined : v.error }));
    }
  };

  const handleTitularChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filtered = e.target.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑÜ\s.'-]/g, "");
    setTarjetaTitular(filtered);

    if (tarjetaTouched.titular) {
      const v = validarTitular(filtered);
      setTarjetaErrores((prev) => ({ ...prev, titular: v.valido ? undefined : v.error }));
    }
  };

  const handleVencimientoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatearVencimiento(e.target.value, tarjetaVence);
    setTarjetaVence(formatted);

    if (tarjetaTouched.vencimiento) {
      if (formatted.length === 5) {
        const v = validarVencimiento(formatted);
        setTarjetaErrores((prev) => ({ ...prev, vencimiento: v.valido ? undefined : v.error }));
      } else {
        setTarjetaErrores((prev) => ({ ...prev, vencimiento: "Formato incompleto (MM/AA)" }));
      }
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maxLen = marcaDetectada.id === "amex" ? 4 : 3;
    const digits = e.target.value.replace(/\D/g, "").slice(0, maxLen);
    setTarjetaCvv(digits);

    if (tarjetaTouched.cvv) {
      const v = validarCvv(digits, marcaDetectada.id);
      setTarjetaErrores((prev) => ({ ...prev, cvv: v.valido ? undefined : v.error }));
    }
  };

  const handleBlurField = (field: "numero" | "titular" | "vencimiento" | "cvv") => {
    setTarjetaTouched((prev) => ({ ...prev, [field]: true }));
    if (field === "numero") {
      const v = validarNumeroTarjeta(tarjetaNumero);
      setTarjetaErrores((prev) => ({ ...prev, numero: v.valido ? undefined : v.error }));
    } else if (field === "titular") {
      const v = validarTitular(tarjetaTitular);
      setTarjetaErrores((prev) => ({ ...prev, titular: v.valido ? undefined : v.error }));
    } else if (field === "vencimiento") {
      const v = validarVencimiento(tarjetaVence);
      setTarjetaErrores((prev) => ({ ...prev, vencimiento: v.valido ? undefined : v.error }));
    } else if (field === "cvv") {
      const v = validarCvv(tarjetaCvv, marcaDetectada.id);
      setTarjetaErrores((prev) => ({ ...prev, cvv: v.valido ? undefined : v.error }));
    }
  };

  // Transferencia (Comprobante directo en checkout)
  const [archivoComprobante, setArchivoComprobante] = useState<File | null>(null);
  const [previewComprobante, setPreviewComprobante] = useState<string | null>(null);

  const [verificandoPrecios, setVerificandoPrecios] = useState(false);
  const [serverWarnings, setServerWarnings] = useState<string[]>([]);
  const [serverVerifiedItems, setServerVerifiedItems] = useState<ValidatedCartItem[] | null>(null);
  const [serverSubtotal, setServerSubtotal] = useState<number | null>(null);

  // Pre-validar precios en servidor al montar el checkout
  useEffect(() => {
    if (items.length === 0) return;
    let isMounted = true;
    async function check() {
      try {
        const res = await validarPreciosServerAction(
          items.map((i) => ({
            id: i.id,
            cantidad: i.cantidad,
            esCombo: Boolean(i.esCombo),
            cartItemId: i.cartItemId,
          }))
        );
        if (isMounted && res.success) {
          setServerVerifiedItems(res.items);
          setServerSubtotal(res.subtotal);
          if (res.warnings && res.warnings.length > 0) {
            setServerWarnings(res.warnings);
          }
        }
      } catch (e) {
        console.error("Error pre-verificando precios en checkout:", e);
      }
    }
    check();
    return () => {
      isMounted = false;
    };
  }, [items]);

  const costoMotomandado = 2500;
  const costoEnvio = modalidadEntrega === "MOTOMANDADO" ? costoMotomandado : 0;
  const effectiveSubtotal = serverSubtotal !== null ? serverSubtotal : subtotal;
  const totalConEnvio = effectiveSubtotal + costoEnvio;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    if (isStaff) {
      setCheckoutError("Estás utilizando una cuenta de personal. Para realizar compras, ingresá con una cuenta de cliente.");
      return;
    }

    if (!user || user.rol !== "CLIENTE") {
      setCheckoutError("Para completar tu compra, por favor iniciá sesión o registrate con tu cuenta de cliente.");
      openLogin();
      return;
    }

    if (items.length === 0) {
      router.push("/carrito");
      return;
    }

    if (isSubmitting) return;

    // Validación obligatoria para transferencias bancarias
    if (formData.pago === "TRANSFERENCIA" && !archivoComprobante) {
      setCheckoutError("Para abonar por transferencia bancaria, es obligatorio adjuntar la constancia o comprobante de pago.");
      return;
    }

    // Validación obligatoria para pagos con tarjeta de débito / crédito
    if (formData.pago === "TARJETA") {
      const marca = detectarMarcaTarjeta(tarjetaNumero);
      const valNum = validarNumeroTarjeta(tarjetaNumero);
      const valTit = validarTitular(tarjetaTitular);
      const valVenc = validarVencimiento(tarjetaVence);
      const valCvv = validarCvv(tarjetaCvv, marca.id);

      const nuevosErrores = {
        numero: valNum.valido ? undefined : valNum.error,
        titular: valTit.valido ? undefined : valTit.error,
        vencimiento: valVenc.valido ? undefined : valVenc.error,
        cvv: valCvv.valido ? undefined : valCvv.error,
      };

      setTarjetaErrores(nuevosErrores);
      setTarjetaTouched({
        numero: true,
        titular: true,
        vencimiento: true,
        cvv: true,
      });

      if (!valNum.valido || !valTit.valido || !valVenc.valido || !valCvv.valido) {
        const primerError =
          valNum.error ||
          valTit.error ||
          valVenc.error ||
          valCvv.error ||
          "Por favor completá correctamente todos los datos de la tarjeta.";
        setCheckoutError(`Datos de tarjeta inválidos: ${primerError}`);
        return;
      }
    }

    setIsSubmitting(true);
    setVerificandoPrecios(true);
    setServerWarnings([]);

    let comprobanteSubidoUrl: string | undefined = undefined;

    try {
      // 1. Verificación obligatoria inmutable en el servidor contra PostgreSQL
      const res = await validarPreciosServerAction(
        items.map((i) => ({
          id: i.id,
          cantidad: i.cantidad,
          esCombo: Boolean(i.esCombo),
          cartItemId: i.cartItemId,
        }))
      );

      if (!res.success) {
        setCheckoutError(res.error || "No se pudo verificar el pedido contra el servidor.");
        return;
      }

      if (res.warnings && res.warnings.length > 0) {
        setServerWarnings(res.warnings);
        sincronizarCarrito(res.items);
        const hayIncompatibilidad =
          res.items.some((it) => it.stockDisponible <= 0 || it.cantidad <= 0) ||
          res.items.length < items.length;
        if (hayIncompatibilidad) {
          setCheckoutError(
            "La disponibilidad de algunos repuestos cambió en el local. Por favor revisá los avisos arriba y ajustá tu carrito antes de continuar."
          );
          return;
        }
      }

      // 2. Validar coherencia entre modalidad de entrega y método de pago
      if (modalidadEntrega === "MOTOMANDADO" && formData.pago === "EFECTIVO_LOCAL") {
        setCheckoutError(
          "La modalidad Motomandado / Moto Uber no permite pago en efectivo en el local. Por favor seleccioná Transferencia bancaria o Tarjeta de débito."
        );
        return;
      }
      const modFinal = modalidadEntrega;

      // 3. Si pagó por transferencia y adjuntó comprobante, subir el archivo de inmediato
      if (formData.pago === "TRANSFERENCIA" && archivoComprobante) {
        if (archivoComprobante.size > 5 * 1024 * 1024) {
          setCheckoutError(
            "El comprobante seleccionado supera el límite máximo permitido de 5 MB. Por favor adjuntá un archivo más liviano."
          );
          return;
        }

        const compFd = new FormData();
        compFd.append("comprobante", archivoComprobante);

        let resSubida: { success: boolean; comprobanteUrl?: string; error?: string } | null = null;
        try {
          resSubida = await subirComprobanteDirectoAction(compFd);
        } catch (uploadErr) {
          console.warn("Server Action de comprobante no completó, reintentando vía endpoint directo:", uploadErr);
          try {
            const apiRes = await fetch("/api/comprobantes/upload", {
              method: "POST",
              body: compFd,
            });
            if (apiRes.ok) {
              resSubida = await apiRes.json();
            } else {
              const errJson = await apiRes.json().catch(() => ({}));
              resSubida = {
                success: false,
                error: errJson.error || "No se pudo subir el archivo.",
              };
            }
          } catch (apiErr) {
            console.error("Fallo de red en subida de comprobante:", apiErr);
          }
        }

        if (!resSubida || !resSubida.success || !resSubida.comprobanteUrl) {
          setCheckoutError(
            resSubida?.error ||
              "No se pudo procesar el comprobante adjuntado. Por favor, verificá que sea un formato válido (JPG, PNG, WEBP o PDF, máx. 5 MB)."
          );
          return;
        }
        comprobanteSubidoUrl = resSubida.comprobanteUrl;
      }

      // 4. Crear pedido con datos certificados en PostgreSQL
      const resOnline = await crearPedidoOnlineAction({
        nombre: formData.nombre,
        dni: formData.dni,
        tel: formData.tel,
        email: formData.email,
        direccionEnvio: formData.direccionEnvio,
        modalidadEntrega: modFinal,
        costoEnvio: modFinal === "MOTOMANDADO" ? costoMotomandado : 0,
        metodoPago: formData.pago,
        cuotas: formData.pago === "TARJETA" ? 1 : undefined,
        datosTarjeta:
          formData.pago === "TARJETA"
            ? {
                numero: tarjetaNumero,
                titular: tarjetaTitular,
                vencimiento: tarjetaVence,
              }
            : undefined,
        comprobanteUrl: comprobanteSubidoUrl,
        items: items.map((i) => ({
          id: i.id,
          nombre: i.nombre,
          marca: i.marca,
          cantidad: i.cantidad,
          esCombo: Boolean(i.esCombo),
        })),
      });

      if (!resOnline.success || !resOnline.pedido) {
        if (comprobanteSubidoUrl) {
          await limpiarComprobanteHuerfanoAction(comprobanteSubidoUrl);
        }
        setCheckoutError(resOnline.error || "No se pudo registrar el pedido.");
        return;
      }

      // También mantener sincronizado el contexto del cliente y vaciar carrito
      crearPedido({
        nombre: formData.nombre,
        dni: formData.dni,
        tel: formData.tel,
        email: formData.email,
        pago: formData.pago,
        modalidadEntrega: modFinal,
        costoEnvio: modFinal === "MOTOMANDADO" ? costoMotomandado : 0,
        itemsVerificados: res.items.map((i) => ({
          id: i.id,
          nombre: i.nombre,
          marca: i.marca,
          precio: i.precioFinal,
          cantidad: i.cantidad,
          esCombo: Boolean(i.esCombo),
        })),
        totalVerificado: res.subtotal,
      });

      clearCart();
      router.push(`/mis-pedidos?num=${resOnline.pedido.numero}`);
    } catch (err: any) {
      console.error("Error en checkout:", err);
      if (comprobanteSubidoUrl) {
        await limpiarComprobanteHuerfanoAction(comprobanteSubidoUrl).catch(() => {});
      }
      const rawMsg = err?.message || "";
      if (rawMsg.includes("Failed to fetch") || rawMsg.includes("fetch failed")) {
        setCheckoutError(
          "No se pudo completar la comunicación con el servidor al procesar el pedido o el comprobante. Por favor verificá tu conexión a internet o intentá con un archivo más liviano (máx. 5 MB)."
        );
      } else {
        setCheckoutError(
          rawMsg
            ? `Error al procesar el pedido: ${rawMsg}`
            : "Ocurrió un error al procesar el pedido. Por favor, verificá los datos ingresados."
        );
      }
    } finally {
      setVerificandoPrecios(false);
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-10 text-center max-w-lg mx-auto shadow-sm">
        <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
          No hay repuestos en el carrito
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Agregá repuestos antes de finalizar tu pedido.
        </p>
        <Link
          href="/ofertas"
          className="mt-4 inline-block rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white hover:bg-brandhover shadow transition-all"
        >
          Ver catálogo de repuestos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto mt-6 px-4 space-y-6">
      <div className="border-b border-slate-200 dark:border-line pb-3">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Finalizar Pedido
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Elegí la modalidad de entrega y el medio de pago seguro para Posadas, Misiones.
        </p>
      </div>

      {checkoutError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-700 dark:text-red-400 flex items-start justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-red-800 dark:text-red-300">
                Atención al procesar la compra
              </p>
              <p className="mt-1 leading-relaxed">{checkoutError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCheckoutError(null)}
            className="text-red-500 hover:text-red-700 dark:hover:text-red-300 p-1 cursor-pointer"
            aria-label="Cerrar aviso"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleConfirmar} className="grid gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-8 space-y-5">
          {/* Aviso para personal */}
          {isStaff && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-5 text-amber-900 dark:text-amber-200 flex items-start gap-3.5 shadow-sm animate-in fade-in">
              <ShieldAlert size={22} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-bold text-sm">Compras deshabilitadas para personal</h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Estás utilizando una cuenta de personal. Para realizar compras, ingresá con una cuenta de cliente.
                </p>
              </div>
            </div>
          )}

          {/* Aviso para visitante no autenticado */}
          {!user && (
            <div className="rounded-2xl border border-brand/40 bg-brand/5 dark:bg-brand/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck size={18} className="text-brand" />
                  <span>Identificación de cliente requerida</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Las compras online están reservadas exclusivamente a clientes. Iniciá sesión o registrate para confirmar tu pedido.
                </p>
              </div>
              <button
                type="button"
                onClick={openLogin}
                className="shrink-0 px-4 py-2.5 rounded-xl bg-brand hover:bg-brandhover text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Iniciar Sesión / Registrarse
              </button>
            </div>
          )}

          {/* 1. TUS DATOS */}
          <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-5 space-y-3 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              1. Datos del Cliente
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <label className="block">
                <span className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                  Nombre y Apellido *
                </span>
                <input
                  required
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 dark:border-line bg-white dark:bg-surface px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-brand"
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                  DNI (para facturación y retiro) *
                </span>
                <input
                  required
                  name="dni"
                  value={formData.dni}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 dark:border-line bg-white dark:bg-surface px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-brand"
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                  Teléfono / WhatsApp *
                </span>
                <input
                  required
                  name="tel"
                  value={formData.tel}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 dark:border-line bg-white dark:bg-surface px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-brand"
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                  Email para recibir ticket de compra *
                </span>
                <input
                  required
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 dark:border-line bg-white dark:bg-surface px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-brand"
                />
              </label>
            </div>
          </div>

          {/* 2. MODALIDAD DE ENTREGA */}
          <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-5 space-y-3 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              2. Modalidad de Entrega
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Opción Retiro en Local */}
              <label
                onClick={() => setModalidadEntrega("RETIRO_LOCAL")}
                className={`flex flex-col justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  modalidadEntrega === "RETIRO_LOCAL"
                    ? "border-brand bg-brand/5 dark:bg-brand/10 shadow-sm"
                    : "border-slate-200 dark:border-line hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Building size={16} className="text-brand" />
                      <span>Retiro en el Local</span>
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      GRATIS
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] pt-1 leading-relaxed">
                    {config.direccion || "Av. Roque Sáenz Peña 1500 (Posadas)"}. Te genera un <strong>Ticket Digital con Código de Retiro</strong>.
                  </p>
                </div>
                <div className="pt-2 text-[10px] text-slate-500">
                  {config.horarios || "Lun a Sáb 8:00-12:30 / 16:30-20:30 hs."}
                </div>
              </label>

              {/* Opción Motomandado / Moto Uber */}
              <label
                onClick={() => {
                  setModalidadEntrega("MOTOMANDADO");
                  if (formData.pago === "EFECTIVO_LOCAL") {
                    setFormData((prev) => ({ ...prev, pago: "TRANSFERENCIA" }));
                  }
                }}
                className={`flex flex-col justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  modalidadEntrega === "MOTOMANDADO"
                    ? "border-brand bg-brand/5 dark:bg-brand/10 shadow-sm"
                    : "border-slate-200 dark:border-line hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Bike size={16} className="text-emerald-500" />
                      <span>Motomandado / Moto Uber</span>
                    </span>
                    <span className="text-[11px] font-black text-brand">
                      {formatPrice(costoMotomandado)}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] pt-1 leading-relaxed">
                    Envío express en el día a cualquier punto de Posadas con cadetería asignada.
                  </p>
                </div>
                <div className="pt-2 text-[10px] text-emerald-600 font-semibold">
                  Tarifa fija informada para Posadas: $2.500
                </div>
              </label>
            </div>

            {modalidadEntrega === "MOTOMANDADO" && (
              <div className="pt-2">
                <label className="block text-xs">
                  <span className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                    Dirección de Entrega en Posadas (Calle, número y referencias) *
                  </span>
                  <input
                    required
                    name="direccionEnvio"
                    value={formData.direccionEnvio}
                    onChange={handleChange}
                    placeholder="Ej: Av. Tambor de Tacuarí 3450, timbre 2"
                    className="w-full rounded-xl border border-slate-300 dark:border-line bg-white dark:bg-surface px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-brand"
                  />
                </label>
              </div>
            )}
          </div>

          {/* 3. FORMAS DE PAGO */}
          <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-5 space-y-3 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              3. Forma de Pago
            </h2>

            <div className="space-y-2.5 text-xs">
              {/* Opción 1: Transferencia Bancaria */}
              <label
                onClick={() => setFormData((prev) => ({ ...prev, pago: "TRANSFERENCIA" }))}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  formData.pago === "TRANSFERENCIA"
                    ? "border-brand bg-brand/5 dark:bg-brand/10 shadow-sm"
                    : "border-slate-200 dark:border-line hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="pago"
                  checked={formData.pago === "TRANSFERENCIA"}
                  onChange={() => {}}
                  className="mt-0.5 accent-brand"
                />
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Transferencia Bancaria / CVU / Alias Chopper (Recomendado)
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Acreditación inmediata sin comisión. Te emitimos comprobante y despachamos o preparamos para retiro.
                  </p>
                </div>
              </label>

              {formData.pago === "TRANSFERENCIA" && (
                <div className="bg-slate-50 dark:bg-[#141519] border border-slate-200 dark:border-[#26272e] rounded-xl p-4 space-y-3.5 ml-2 mr-2">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#26272e] pb-2">
                    <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 text-xs">
                      <Building className="w-4 h-4 text-brand" /> Datos de la cuenta para transferir
                    </span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Acreditación inmediata
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-white dark:bg-[#0f1012] p-2.5 rounded-lg border border-slate-200 dark:border-[#26272e]">
                      <span className="text-[10px] text-slate-500 dark:text-[#6b6c75] block font-semibold">ALIAS:</span>
                      <b className="text-brand text-sm tracking-wide">CHOPPER.REPUESTOS</b>
                    </div>
                    <div className="bg-white dark:bg-[#0f1012] p-2.5 rounded-lg border border-slate-200 dark:border-[#26272e]">
                      <span className="text-[10px] text-slate-500 dark:text-[#6b6c75] block font-semibold">CBU:</span>
                      <b className="text-slate-800 dark:text-white text-xs select-all">0000003100012345678901</b>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-[#9a9ba3]">
                    Banco: <strong>Banco Macro</strong> · Titular: <strong>Chopper Repuestos S.R.L.</strong>
                  </div>

                  {/* Adjuntar comprobante obligatorio */}
                  <div className="pt-2 border-t border-slate-200 dark:border-[#26272e]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-brand" />
                        Comprobante de transferencia *
                      </span>
                      <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Obligatorio
                      </span>
                    </div>
                    <input
                      type="file"
                      required={formData.pago === "TRANSFERENCIA"}
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            setCheckoutError(
                              "El archivo seleccionado supera el límite máximo de 5 MB. Por favor seleccioná un archivo más liviano."
                            );
                            e.target.value = "";
                            setArchivoComprobante(null);
                            setPreviewComprobante(null);
                            return;
                          }
                          setCheckoutError(null);
                          setArchivoComprobante(file);
                          if (file.type.startsWith("image/")) {
                            setPreviewComprobante(URL.createObjectURL(file));
                          } else {
                            setPreviewComprobante(null);
                          }
                        }
                      }}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand/10 file:text-brand hover:file:bg-brand/20 cursor-pointer"
                    />
                    {previewComprobante && (
                      <div className="mt-2 flex items-center gap-2">
                        <img
                          src={previewComprobante}
                          alt="Comprobante preview"
                          className="w-16 h-16 object-cover rounded-lg border border-slate-300 dark:border-[#35363d]"
                        />
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" /> Comprobante adjuntado listo para enviar
                        </div>
                      </div>
                    )}
                    {archivoComprobante && !previewComprobante && (
                      <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Archivo PDF adjuntado: {archivoComprobante.name}
                      </div>
                    )}
                    {!archivoComprobante && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                        ⚠️ Debés adjuntar la constancia o captura de tu transferencia bancaria antes de confirmar el pedido.
                      </p>
                    )}
                    <p className="text-[10px] text-slate-500 dark:text-[#6b6c75] mt-1">
                      Tu pedido se registrará en estado <strong>Por verificar pago</strong> y será validado por el equipo de Ventas.
                    </p>
                  </div>
                </div>
              )}

              {/* Opción 2: Tarjeta de Débito */}
              <label
                onClick={() => setFormData((prev) => ({ ...prev, pago: "TARJETA" }))}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  formData.pago === "TARJETA"
                    ? "border-brand bg-brand/5 dark:bg-brand/10 shadow-sm"
                    : "border-slate-200 dark:border-line hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="pago"
                  checked={formData.pago === "TARJETA"}
                  onChange={() => {}}
                  className="mt-0.5 accent-brand"
                />
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Tarjeta de Débito
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pago 100% online y seguro en una sola operación por el total.
                  </p>
                </div>
              </label>

              {formData.pago === "TARJETA" && (
                <div className="bg-slate-50 dark:bg-[#141519] border border-slate-200 dark:border-[#26272e] rounded-xl p-4 space-y-4 ml-2 mr-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-[#26272e] pb-2">
                    <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 text-xs">
                      <CreditCard className="w-4 h-4 text-brand" /> Pago con Tarjeta de Débito
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      1 pago de {formatPrice(totalConEnvio)}
                    </span>
                  </div>

                  {/* Formulario de tarjeta con validaciones en tiempo real */}
                  <div className="space-y-3 text-xs pt-1">
                    {/* Número de Tarjeta */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-[#9a9ba3]">
                          Número de Tarjeta <span className="text-red-500">*</span>
                        </span>
                        {marcaDetectada.id !== "generica" && (
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border tracking-wider transition-all ${marcaDetectada.colorBadge}`}
                          >
                            {marcaDetectada.nombre}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          name="numero-tarjeta"
                          autoComplete="cc-number"
                          placeholder={marcaDetectada.placeholder}
                          value={tarjetaNumero}
                          onChange={handleNumeroTarjetaChange}
                          onBlur={() => handleBlurField("numero")}
                          maxLength={marcaDetectada.maxDigitos + 4}
                          className={`w-full rounded-xl border bg-white dark:bg-[#0f1012] px-3 py-2 text-xs text-slate-900 dark:text-white outline-none font-mono transition-colors ${
                            tarjetaErrores.numero && tarjetaTouched.numero
                              ? "border-red-500 focus:border-red-500"
                              : tarjetaTouched.numero && !tarjetaErrores.numero && tarjetaNumero.replace(/\D/g, "").length >= 13
                              ? "border-emerald-500 focus:border-emerald-500"
                              : "border-slate-300 dark:border-[#35363d] focus:border-brand"
                          }`}
                        />
                        {tarjetaTouched.numero && !tarjetaErrores.numero && tarjetaNumero.replace(/\D/g, "").length >= 13 && (
                          <Check className="w-4 h-4 text-emerald-500 absolute right-3 top-2.5" />
                        )}
                      </div>
                      {tarjetaErrores.numero && tarjetaTouched.numero && (
                        <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 animate-in fade-in">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{tarjetaErrores.numero}</span>
                        </p>
                      )}
                    </div>

                    {/* Nombre y Apellido del Titular */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-[#9a9ba3] block mb-1">
                        Nombre y Apellido (Como figura en el plástico) <span className="text-red-500">*</span>
                      </span>
                      <input
                        type="text"
                        name="titular-tarjeta"
                        autoComplete="cc-name"
                        placeholder="Ej: CARLOS LOPEZ"
                        value={tarjetaTitular}
                        onChange={handleTitularChange}
                        onBlur={() => handleBlurField("titular")}
                        className={`w-full rounded-xl border bg-white dark:bg-[#0f1012] px-3 py-2 text-xs text-slate-900 dark:text-white outline-none uppercase transition-colors ${
                          tarjetaErrores.titular && tarjetaTouched.titular
                            ? "border-red-500 focus:border-red-500"
                            : tarjetaTouched.titular && !tarjetaErrores.titular && tarjetaTitular.length >= 3
                            ? "border-emerald-500 focus:border-emerald-500"
                            : "border-slate-300 dark:border-[#35363d] focus:border-brand"
                        }`}
                      />
                      {tarjetaErrores.titular && tarjetaTouched.titular && (
                        <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 animate-in fade-in">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{tarjetaErrores.titular}</span>
                        </p>
                      )}
                    </div>

                    {/* Vencimiento y CVV */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-[#9a9ba3] block mb-1">
                          Vencimiento (MM/AA) <span className="text-red-500">*</span>
                        </span>
                        <input
                          type="text"
                          name="vencimiento-tarjeta"
                          autoComplete="cc-exp"
                          placeholder="MM/AA"
                          maxLength={5}
                          value={tarjetaVence}
                          onChange={handleVencimientoChange}
                          onBlur={() => handleBlurField("vencimiento")}
                          className={`w-full rounded-xl border bg-white dark:bg-[#0f1012] px-3 py-2 text-xs text-slate-900 dark:text-white outline-none font-mono text-center transition-colors ${
                            tarjetaErrores.vencimiento && tarjetaTouched.vencimiento
                              ? "border-red-500 focus:border-red-500"
                              : tarjetaTouched.vencimiento && !tarjetaErrores.vencimiento && tarjetaVence.length === 5
                              ? "border-emerald-500 focus:border-emerald-500"
                              : "border-slate-300 dark:border-[#35363d] focus:border-brand"
                          }`}
                        />
                        {tarjetaErrores.vencimiento && tarjetaTouched.vencimiento && (
                          <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 animate-in fade-in">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{tarjetaErrores.vencimiento}</span>
                          </p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-[#9a9ba3]">
                            CVV / CVC <span className="text-red-500">*</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {marcaDetectada.id === "amex" ? "4 dígitos" : "3 dígitos"}
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type={mostrarCvv ? "text" : "password"}
                            name="cvv-tarjeta"
                            autoComplete="cc-csc"
                            maxLength={marcaDetectada.id === "amex" ? 4 : 3}
                            placeholder={marcaDetectada.id === "amex" ? "••••" : "•••"}
                            value={tarjetaCvv}
                            onChange={handleCvvChange}
                            onBlur={() => handleBlurField("cvv")}
                            className={`w-full rounded-xl border bg-white dark:bg-[#0f1012] pl-3 pr-9 py-2 text-xs text-slate-900 dark:text-white outline-none font-mono text-center transition-colors ${
                              tarjetaErrores.cvv && tarjetaTouched.cvv
                                ? "border-red-500 focus:border-red-500"
                                : tarjetaTouched.cvv && !tarjetaErrores.cvv && tarjetaCvv.length >= 3
                                ? "border-emerald-500 focus:border-emerald-500"
                                : "border-slate-300 dark:border-[#35363d] focus:border-brand"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setMostrarCvv((prev) => !prev)}
                            title={mostrarCvv ? "Ocultar código de seguridad" : "Mostrar código de seguridad"}
                            className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            {mostrarCvv ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {tarjetaErrores.cvv && tarjetaTouched.cvv && (
                          <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 animate-in fade-in">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{tarjetaErrores.cvv}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Opción 3: Efectivo en mostrador (Orden de Compra y reserva) - Exclusivo para Retiro en el Local */}
              {modalidadEntrega === "RETIRO_LOCAL" && (
                <label
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, pago: "EFECTIVO_LOCAL" }));
                  }}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    formData.pago === "EFECTIVO_LOCAL"
                      ? "border-amber-500 bg-amber-500/10 shadow-sm"
                      : "border-slate-200 dark:border-line hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="pago"
                    checked={formData.pago === "EFECTIVO_LOCAL"}
                    onChange={() => {}}
                    className="mt-0.5 accent-amber-500"
                  />
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      💵 Efectivo en el Local (Orden de Compra / Reserva presencial)
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Generás tu <strong>Orden de Compra</strong> y tus repuestos quedan reservados en estantería. Te acercás a {config.direccion || "Av. Roque Sáenz Peña 1500"}, pagás en efectivo y listo.
                    </p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium pt-0.5">
                      Tu pedido quedará reservado para retirar en el local. Deberás abonar en efectivo al momento del retiro.
                    </p>
                  </div>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* 4. ASIDE RESUMEN DEL PEDIDO */}
        <aside className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-5 space-y-4 shadow-sm sticky top-20">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Resumen de la Orden
          </h2>

          <div className="max-h-60 space-y-2 overflow-y-auto pr-1 text-xs divide-y divide-slate-100 dark:divide-line/50">
            {items.map((item) => (
              <div
                key={item.cartItemId || (item.esCombo ? `combo-${item.id}` : `prod-${item.id}`)}
                className="pt-2 flex justify-between gap-2"
              >
                <span className="text-slate-700 dark:text-slate-300 truncate font-medium">
                  {item.cantidad}x {item.nombre}
                </span>
                <span className="font-bold text-slate-900 dark:text-white shrink-0">
                  {formatPrice(item.precio * item.cantidad)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 dark:border-line pt-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal repuestos</span>
              <span>{formatPrice(effectiveSubtotal)}</span>
            </div>

            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>
                {modalidadEntrega === "MOTOMANDADO"
                  ? "Envío Motomandado Posadas"
                  : "Retiro en mostrador"}
              </span>
              <span className={costoEnvio > 0 ? "font-bold text-brand" : "font-bold text-emerald-600"}>
                {costoEnvio > 0 ? formatPrice(costoEnvio) : "GRATIS"}
              </span>
            </div>

            <div className="flex justify-between border-t border-slate-200 dark:border-line pt-2 text-base font-black text-slate-900 dark:text-white">
              <span>Total a pagar</span>
              <div className="text-right">
                <span className="text-brand">
                  {formatPrice(totalConEnvio)}
                </span>
                {formData.pago === "TARJETA" && (
                  <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    1 solo pago (Tarjeta de Débito)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Badge de Verificación Server-Side */}
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>Precios y stock certificados por el servidor PostgreSQL.</span>
          </div>

          {/* Avisos si hubo ajuste de stock o disponibilidad */}
          {serverWarnings.length > 0 && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5 text-[11px] text-amber-700 dark:text-amber-400 space-y-1">
              <div className="flex items-center gap-1 font-bold">
                <AlertCircle size={13} />
                <span>Avisos de disponibilidad:</span>
              </div>
              {serverWarnings.map((w, idx) => (
                <p key={idx} className="leading-tight">• {w}</p>
              ))}
            </div>
          )}

          {/* Banner de error directo sobre el botón */}
          {checkoutError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[11px] text-red-700 dark:text-red-400 flex items-start gap-2 animate-in fade-in">
              <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block text-red-800 dark:text-red-300">No se pudo procesar:</span>
                <p className="leading-tight">{checkoutError}</p>
              </div>
            </div>
          )}

          {/* Botón de Confirmación */}
          {isStaff ? (
            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-200 dark:bg-surface py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-not-allowed border border-slate-300 dark:border-line"
            >
              <Lock size={15} className="text-amber-500" />
              <span>Compras no permitidas con cuenta de personal</span>
            </button>
          ) : !user ? (
            <button
              type="button"
              onClick={openLogin}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brandhover py-3.5 text-xs font-black text-white shadow-lg shadow-brand/20 transition-all active:scale-95 cursor-pointer"
            >
              <UserCheck size={16} />
              <span>Iniciar Sesión como Cliente para Confirmar</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={verificandoPrecios || isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brandhover py-3 text-xs font-black text-white shadow-lg shadow-brand/20 transition-all active:scale-95 text-center disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
            >
              {verificandoPrecios || isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>{isSubmitting ? "Procesando pedido..." : "Verificando precios y stock..."}</span>
                </>
              ) : formData.pago === "EFECTIVO_LOCAL" ? (
                "Generar Orden de Compra y Reservar"
              ) : (
                "Confirmar Pedido y Pagar"
              )}
            </button>
          )}

          <p className="text-[11px] text-center text-slate-500">
            {formData.pago === "EFECTIVO_LOCAL"
              ? `📋 Se generará tu ticket con código para pagar al retirar en ${config.direccion || "Av. Roque Sáenz Peña 1500"}.`
              : `🔒 Transacción protegida por ${config.nombre_tienda || "Chopper Repuestos"}.`}
          </p>
        </aside>
      </form>
    </div>
  );
}
