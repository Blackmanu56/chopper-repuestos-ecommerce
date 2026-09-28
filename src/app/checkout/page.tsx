"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import {
  MapPin,
  Bike,
  CreditCard,
  Building,
  ShieldCheck,
  AlertCircle,
  Clock,
  Ticket,
  RefreshCw,
  CheckCircle,
  Upload,
  Sparkles,
  Zap,
} from "lucide-react";
import { validarPreciosServerAction, ValidatedCartItem } from "@/actions/commercial";
import { crearPedidoOnlineAction, subirComprobantePedidoAction } from "@/actions/pedidos";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart, crearPedido } = useCart();
  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");

  const [modalidadEntrega, setModalidadEntrega] = useState<"RETIRO_LOCAL" | "MOTOMANDADO">("RETIRO_LOCAL");
  const [formData, setFormData] = useState({
    nombre: "Cliente Chopper",
    dni: "34.567.890",
    tel: "376 524-3554",
    email: "cliente@gmail.com",
    direccionEnvio: "Posadas, Misiones",
    pago: "TRANSFERENCIA" as "TRANSFERENCIA" | "TARJETA" | "EFECTIVO_LOCAL",
  });

  // Simulación de Tarjeta y Cuotas
  const [tarjetaCuotas, setTarjetaCuotas] = useState<number>(1);
  const [tarjetaNumero, setTarjetaNumero] = useState("");
  const [tarjetaTitular, setTarjetaTitular] = useState("");
  const [tarjetaVence, setTarjetaVence] = useState("");
  const [tarjetaCvv, setTarjetaCvv] = useState("");

  const cargarTarjetaFicticia = () => {
    setTarjetaNumero("4509 8812 3456 7890");
    setTarjetaTitular("CARLOS LOPEZ");
    setTarjetaVence("08/29");
    setTarjetaCvv("742");
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
        const res = await validarPreciosServerAction(items.map((i) => ({ id: i.id, cantidad: i.cantidad })));
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

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      router.push("/carrito");
      return;
    }

    setVerificandoPrecios(true);
    setServerWarnings([]);

    try {
      // 1. Verificación obligatoria inmutable en el servidor contra PostgreSQL
      const res = await validarPreciosServerAction(
        items.map((i) => ({ id: i.id, cantidad: i.cantidad }))
      );

      if (!res.success) {
        alert(res.error || "No se pudo verificar el pedido contra el servidor.");
        setVerificandoPrecios(false);
        return;
      }

      if (res.warnings && res.warnings.length > 0) {
        setServerWarnings(res.warnings);
      }

      // 2. Si elige efectivo pero seleccionó motomandado, forzamos retiro en local
      const modFinal = formData.pago === "EFECTIVO_LOCAL" ? "RETIRO_LOCAL" : modalidadEntrega;

      // 3. Crear pedido con datos certificados en PostgreSQL
      const resOnline = await crearPedidoOnlineAction({
        nombre: formData.nombre,
        dni: formData.dni,
        tel: formData.tel,
        email: formData.email,
        direccionEnvio: formData.direccionEnvio,
        modalidadEntrega: modFinal,
        costoEnvio: modFinal === "MOTOMANDADO" ? costoMotomandado : 0,
        metodoPago: formData.pago,
        cuotas: formData.pago === "TARJETA" ? tarjetaCuotas : undefined,
        items: items.map((i) => ({
          id: i.id,
          nombre: i.nombre,
          marca: i.marca,
          cantidad: i.cantidad,
          esCombo: Boolean(i.esCombo),
        })),
      });

      if (!resOnline.success || !resOnline.pedido) {
        alert(resOnline.error || "No se pudo registrar el pedido.");
        setVerificandoPrecios(false);
        return;
      }

      // 4. Si pagó por transferencia y adjuntó comprobante en checkout, subirlo de inmediato
      if (formData.pago === "TRANSFERENCIA" && archivoComprobante && resOnline.pedido) {
        try {
          const compFd = new FormData();
          compFd.append("comprobante", archivoComprobante);
          await subirComprobantePedidoAction(resOnline.pedido.numero, compFd);
        } catch (errComp) {
          console.error("Error al subir comprobante adjunto:", errComp);
        }
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
        })),
        totalVerificado: res.subtotal,
      });

      clearCart();
      router.push(`/mis-pedidos?num=${resOnline.pedido.numero}`);
    } catch (err) {
      console.error("Error en checkout:", err);
      alert("Ocurrió un error al procesar el pedido.");
    } finally {
      setVerificandoPrecios(false);
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

      <form onSubmit={handleConfirmar} className="grid gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-8 space-y-5">
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
                    Av. Roque Sáenz Peña 1500 (Posadas). Te genera un <strong>Ticket Digital con Código de Retiro</strong>.
                  </p>
                </div>
                <div className="pt-2 text-[10px] text-slate-500">
                  Lun a Sáb 8:00-12:30 / 16:30-20:30 hs.
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

                  {/* Adjuntar comprobante */}
                  <div className="pt-2 border-t border-slate-200 dark:border-[#26272e]">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-brand" />
                      Adjuntar captura o comprobante de transferencia (Opcional ahora):
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
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
                    <p className="text-[10px] text-slate-500 dark:text-[#6b6c75] mt-1">
                      Si aún no hiciste la transferencia, podés confirmar ahora y adjuntar el comprobante más tarde en <strong>Mis Pedidos</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Opción 2: Tarjeta Débito / Crédito */}
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
                    Tarjeta de Débito o Crédito (Banco / Mercado Pago)
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pago 100% online y seguro.
                  </p>
                </div>
              </label>

              {formData.pago === "TARJETA" && (
                <div className="bg-slate-50 dark:bg-[#141519] border border-slate-200 dark:border-[#26272e] rounded-xl p-4 space-y-4 ml-2 mr-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-[#26272e] pb-2">
                    <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 text-xs">
                      <CreditCard className="w-4 h-4 text-brand" /> Simulación de Pago con Tarjeta
                    </span>
                    <button
                      type="button"
                      onClick={cargarTarjetaFicticia}
                      className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 self-start sm:self-auto"
                    >
                      <Zap className="w-3.5 h-3.5" /> ⚡ Cargar tarjeta ficticia de prueba
                    </button>
                  </div>

                  {/* Selector de Cuotas */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Seleccioná el plan de cuotas:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setTarjetaCuotas(1)}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          tarjetaCuotas === 1
                            ? "border-brand bg-brand/10 text-brand font-bold"
                            : "border-slate-200 dark:border-[#26272e] bg-white dark:bg-[#0f1012] text-slate-700 dark:text-[#b8b9c0]"
                        }`}
                      >
                        <div className="text-xs font-bold">1 pago</div>
                        <div className="text-[11px] font-extrabold">{formatPrice(totalConEnvio)}</div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Sin interés</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTarjetaCuotas(3)}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          tarjetaCuotas === 3
                            ? "border-brand bg-brand/10 text-brand font-bold"
                            : "border-slate-200 dark:border-[#26272e] bg-white dark:bg-[#0f1012] text-slate-700 dark:text-[#b8b9c0]"
                        }`}
                      >
                        <div className="text-xs font-bold">3 cuotas</div>
                        <div className="text-[11px] font-extrabold">{formatPrice(Math.round(totalConEnvio / 3))} / mes</div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Sin interés</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTarjetaCuotas(6)}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          tarjetaCuotas === 6
                            ? "border-brand bg-brand/10 text-brand font-bold"
                            : "border-slate-200 dark:border-[#26272e] bg-white dark:bg-[#0f1012] text-slate-700 dark:text-[#b8b9c0]"
                        }`}
                      >
                        <div className="text-xs font-bold">6 cuotas</div>
                        <div className="text-[11px] font-extrabold">{formatPrice(Math.round(totalConEnvio / 6))} / mes</div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Cuotas fijas</div>
                      </button>
                    </div>
                  </div>

                  {/* Formulario de tarjeta simulada */}
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-[#9a9ba3] block mb-1">
                        Número de Tarjeta
                      </span>
                      <input
                        type="text"
                        placeholder="•••• •••• •••• ••••"
                        value={tarjetaNumero}
                        onChange={(e) => setTarjetaNumero(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-[#35363d] bg-white dark:bg-[#0f1012] px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-brand font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-[#9a9ba3] block mb-1">
                        Nombre y Apellido (Como figura en el plástico)
                      </span>
                      <input
                        type="text"
                        placeholder="Ej: CARLOS LOPEZ"
                        value={tarjetaTitular}
                        onChange={(e) => setTarjetaTitular(e.target.value.toUpperCase())}
                        className="w-full rounded-xl border border-slate-300 dark:border-[#35363d] bg-white dark:bg-[#0f1012] px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-brand uppercase"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-[#9a9ba3] block mb-1">
                          Vencimiento
                        </span>
                        <input
                          type="text"
                          placeholder="MM/AA"
                          value={tarjetaVence}
                          onChange={(e) => setTarjetaVence(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 dark:border-[#35363d] bg-white dark:bg-[#0f1012] px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-brand font-mono text-center"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-[#9a9ba3] block mb-1">
                          Código de Seguridad
                        </span>
                        <input
                          type="password"
                          maxLength={4}
                          placeholder="•••"
                          value={tarjetaCvv}
                          onChange={(e) => setTarjetaCvv(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 dark:border-[#35363d] bg-white dark:bg-[#0f1012] px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-brand font-mono text-center"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2.5 text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>
                      <strong>Modo Simulación:</strong> El pago se aprobará en línea instantáneamente y tu pedido pasará directamente a <strong>CONFIRMADO</strong> en el panel de Chopper.
                    </span>
                  </div>
                </div>
              )}

              {/* Opción 3: Efectivo en mostrador (Orden de Compra y reserva) */}
              <label
                onClick={() => {
                  setFormData((prev) => ({ ...prev, pago: "EFECTIVO_LOCAL" }));
                  setModalidadEntrega("RETIRO_LOCAL");
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
                    Generás tu <strong>Orden de Compra</strong> y tus repuestos quedan reservados en estantería. Te acercás a Av. Roque Sáenz Peña 1500, pagás en efectivo y listo.
                  </p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold pt-0.5">
                    ⚠️ Si el cliente no se acerca al local a pagar y retirar, la orden de compra se cancela automáticamente.
                  </p>
                </div>
              </label>
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
              <div key={item.id} className="pt-2 flex justify-between gap-2">
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
              <span className="text-brand">{formatPrice(totalConEnvio)}</span>
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

          {/* Botón de Confirmación */}
          <button
            type="submit"
            disabled={verificandoPrecios}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brandhover py-3 text-xs font-black text-white shadow-lg shadow-brand/20 transition-all active:scale-95 text-center disabled:opacity-60"
          >
            {verificandoPrecios ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Verificando precios y stock...</span>
              </>
            ) : formData.pago === "EFECTIVO_LOCAL" ? (
              "Generar Orden de Compra y Reservar"
            ) : (
              "Confirmar Pedido y Pagar"
            )}
          </button>

          <p className="text-[11px] text-center text-slate-500">
            {formData.pago === "EFECTIVO_LOCAL"
              ? "📋 Se generará tu ticket con código para pagar al retirar en Av. Roque Sáenz Peña 1500."
              : "🔒 Transacción protegida por Chopper Repuestos Posadas."}
          </p>
        </aside>
      </form>
    </div>
  );
}
