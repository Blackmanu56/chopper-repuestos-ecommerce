"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCart, Pedido } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { getMisPedidosClienteAction, PedidoDTO } from "@/actions/pedidos";
import {
  Package,
  Search,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Bike,
  Star,
  RotateCcw,
  MessageCircle,
  X,
  AlertCircle,
  ChevronRight,
  ShoppingBag,
  Ticket,
  Building,
  CreditCard,
  Ban,
  User,
  Lock,
} from "lucide-react";

export default function MisPedidosPage() {
  const { pedidos, cambiarEstadoPedido, cancelarPedido, addToCart } = useCart();
  const { user, openLogin, loginClient } = useAuth();
  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");
  const searchParams = useSearchParams();
  const urlNum = searchParams.get("num") ? parseInt(searchParams.get("num")!, 10) : undefined;

  // Filter states
  const [activeTab, setActiveTab] = useState<string>("TODOS");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [reviewModalOrder, setReviewModalOrder] = useState<Pedido | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [dbPedidos, setDbPedidos] = useState<PedidoDTO[]>([]);

  useEffect(() => {
    const dniQuery = user?.dni || "";
    if (dniQuery || urlNum) {
      getMisPedidosClienteAction(dniQuery, urlNum).then((res) => {
        if (res.success && res.pedidos) {
          setDbPedidos(res.pedidos);
        }
      });
    }
  }, [user, urlNum]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const mappedDbPedidos: Pedido[] = dbPedidos.map((db) => ({
    numero: db.numero,
    fecha: new Date(db.creadoEn).toLocaleString("es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " hs",
    nombre: db.nombreCliente,
    dni: db.dniCliente,
    tel: db.telefonoCliente || "",
    email: db.emailCliente || "",
    pago: db.metodoPago as any,
    modalidadEntrega: db.modalidadEntrega as any,
    costoEnvio: db.costoEnvio,
    codigoTicket: `TK-${db.numero}`,
    estado: (db.estado === "ENTREGADO"
      ? "RETIRADO"
      : db.estado === "LISTO_ENTREGA"
      ? "LISTO_PARA_RETIRAR"
      : db.estado) as any,
    total: db.total,
    items: db.items.map((it) => ({
      id: it.productoId || it.comboId || it.id,
      nombre: it.nombre,
      marca: it.marca || "Chopper",
      precio: it.precioUnitario,
      cantidad: it.cantidad,
    })),
    preparadorNombre: db.preparadorNombre,
  } as any));

  const displayPedidos: Pedido[] =
    mappedDbPedidos.length > 0
      ? mappedDbPedidos
      : pedidos;

  // En "Mis Pedidos" el usuario solo ve SUS propios pedidos personales
  const userVisiblePedidos = displayPedidos.filter((p) => {
    if (!user) return true; // Si no hay sesión, muestra los pedidos buscados por DNI / ticket
    if (user.rol !== "CLIENTE") {
      // El staff solo ve sus compras personales si las tuviera con su propio correo/DNI
      const userEmail = (user.correo || "").toLowerCase();
      const userDni = (user.dni || "").trim();
      const orderEmail = (p.email || "").toLowerCase();
      const orderDni = (p.dni || "").trim();
      return (Boolean(userEmail) && orderEmail === userEmail) || (Boolean(userDni) && orderDni === userDni);
    }
    const userEmail = (user.correo || "").toLowerCase();
    const userDni = (user.dni || "").trim();
    const orderEmail = (p.email || "").toLowerCase();
    const orderDni = (p.dni || "").trim();
    return orderEmail === userEmail || (Boolean(userDni) && orderDni === userDni);
  });

  // Filtering logic
  const filteredOrders = userVisiblePedidos.filter((p) => {
    if (activeTab === "PREPARACION") {
      if (p.estado !== "PENDIENTE" && p.estado !== "PREPARANDO") return false;
    } else if (activeTab === "EN_CAMINO") {
      if (p.estado !== "CONFIRMADO" && p.estado !== "LISTO_PARA_RETIRAR") return false;
    } else if (activeTab === "ENTREGADO") {
      if (p.estado !== "RETIRADO") return false;
    } else if (activeTab === "CANCELADOS") {
      if (p.estado !== "CANCELADO") return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchNum = String(p.numero).includes(q) || `ord-${p.numero}`.includes(q) || (p.codigoTicket && p.codigoTicket.toLowerCase().includes(q));
      const matchItems = p.items.some(
        (it) =>
          it.nombre.toLowerCase().includes(q) ||
          it.marca.toLowerCase().includes(q)
      );
      if (!matchNum && !matchItems) return false;
    }

    return true;
  });

  // Cálculo del porcentaje y detalle de cada hito
  const getOrderProgress = (p: Pedido) => {
    const esEfectivoLocal = p.pago === "EFECTIVO_LOCAL" || p.pago === "EFECTIVO";
    const esMotomandado = p.modalidadEntrega === "MOTOMANDADO";

    switch (p.estado) {
      case "PENDIENTE":
        return {
          percent: 25,
          label: esEfectivoLocal ? "Orden de Compra Generada" : "En preparación",
          stepIndex: 1,
          desc: esEfectivoLocal
            ? "Orden de compra registrada. Repuestos en reserva para pagar en efectivo en el local."
            : "Pedido recibido en Posadas. Búsqueda y control en estantería.",
          colorBg: "bg-amber-500",
        };
      case "PREPARANDO":
        return {
          percent: 50,
          label: esEfectivoLocal ? "Repuestos Reservados en Depósito" : "Repuestos preparados en caja",
          stepIndex: 2,
          desc: esEfectivoLocal
            ? "Repuestos apartados en sucursal Av. Roque Sáenz Peña 1500. Presentate con tu ticket para abonar."
            : "Repuestos verificados y empaquetados en caja para despacho.",
          colorBg: "bg-blue-600",
        };
      case "CONFIRMADO":
      case "LISTO_PARA_RETIRAR":
        return {
          percent: 75,
          label: esMotomandado
            ? "En camino por Motomandado / Moto Uber"
            : "Listo en mostrador para retiro",
          stepIndex: 3,
          desc: esMotomandado
            ? `Cadete en trayecto a tu domicilio en Posadas. Tarifa de envío informada: ${p.costoEnvio ? formatPrice(p.costoEnvio) : "$2.500"}.`
            : "Disponible para retiro en mostrador de Av. Roque Sáenz Peña 1500.",
          colorBg: "bg-sky-600",
        };
      case "RETIRADO":
        return {
          percent: 100,
          label: esEfectivoLocal
            ? "Pagado en Efectivo y Entregado"
            : "Producto entregado / Finalizado",
          stepIndex: 4,
          desc: "Orden completada exitosamente. Factura y garantía oficial emitida.",
          colorBg: "bg-emerald-600",
        };
      case "CANCELADO":
        return {
          percent: 0,
          label: "Orden Cancelada",
          stepIndex: 0,
          desc: "La orden fue cancelada y el stock fue liberado.",
          colorBg: "bg-red-600",
        };
      default:
        return {
          percent: 50,
          label: "En gestión",
          stepIndex: 2,
          desc: "Procesando orden.",
          colorBg: "bg-amber-600",
        };
    }
  };

  const getBrandLogo = (marca: string) => {
    const m = marca.toUpperCase();
    if (m.includes("HONDA")) return "/marcas/honda.svg";
    if (m.includes("YAMAHA")) return "/marcas/yamaha.svg";
    if (m.includes("MOTUL")) return "/marcas/motul.svg";
    if (m.includes("CASTROL")) return "/marcas/castrol.svg";
    if (m.includes("PIRELLI")) return "/marcas/pirelli.svg";
    if (m.includes("DID")) return "/marcas/did.svg";
    if (m.includes("NGK")) return "/marcas/ngk.svg";
    if (m.includes("BREMBO")) return "/marcas/brembo.svg";
    return "/logo-nav.png";
  };

  const handleRepetirPedido = (pedido: Pedido) => {
    pedido.items.forEach((it) => {
      addToCart(
        {
          id: it.id,
          nombre: it.nombre,
          precio: it.precio,
          marca: it.marca,
          categoriaId: 1,
          categoriaNombre: "Repuestos",
          stock: 10,
          imagen: getBrandLogo(it.marca),
        },
        it.cantidad
      );
    });
    showToast(`Se agregaron los repuestos del pedido #${pedido.numero} al carrito`);
  };

  // Guard de autenticación: si no está logueado, no muestra pedidos ajenos
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto mt-8 px-4 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link href="/" className="hover:text-brand transition-colors">
            Inicio
          </Link>
          <span>&gt;</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Pedidos
          </span>
        </nav>

        {/* Tarjeta de Inicio de Sesión Requerido */}
        <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-8 sm:p-10 text-center shadow-sm space-y-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 border border-brand/30 text-brand mx-auto">
            <Lock size={32} />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Iniciá sesión para ver tus pedidos
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Para consultar tus órdenes de compra, tickets de retiro en el local de Posadas y el seguimiento en vivo de tu motomandado, ingresá con tu cuenta de cliente.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={openLogin}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-xs font-bold text-white hover:bg-brandhover shadow-lg shadow-brand/20 transition-all active:scale-95"
            >
              <User size={15} />
              <span>Iniciar Sesión</span>
            </button>

            <Link
              href="/ofertas"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-line px-5 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface transition-all"
            >
              <span>Ver catálogo de repuestos</span>
            </Link>
          </div>

          {/* Tarjeta con credenciales de prueba para el usuario */}
          <div className="rounded-xl border border-dashed border-brand/40 bg-brand/5 p-4 max-w-md mx-auto text-left space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-brand">
                Cuenta de Cliente de Demostración
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Acceso Inmediato</span>
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1 font-mono bg-white dark:bg-surface p-2.5 rounded-lg border border-line/60">
              <p>👤 <strong>Usuario / Correo:</strong> cliente@gmail.com</p>
              <p>🔑 <strong>Contraseña:</strong> cliente123</p>
            </div>
            <button
              onClick={() => loginClient("cliente@gmail.com", "cliente123")}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-brand hover:bg-brandhover py-2.5 text-xs font-bold text-white transition-all active:scale-95 shadow"
            >
              <span>⚡ Ingresar directamente con esta cuenta</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto mt-4 px-4 space-y-6">
      {/* Toast flotante */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-slate-900 text-white border border-slate-700 px-4 py-2.5 text-xs font-bold shadow-2xl animate-in fade-in">
          {toastMessage}
        </div>
      )}

      {/* 1. BREADCRUMB */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-brand transition-colors">
          Inicio
        </Link>
        <span>&gt;</span>
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          Pedidos
        </span>
      </nav>

      {/* 2. ENCABEZADO PRINCIPAL (SOLO PEDIDOS) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-line pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Pedidos
            </h1>
            <span className="rounded-full bg-brand/10 border border-brand/30 px-2.5 py-0.5 text-xs font-black text-brand">
              {userVisiblePedidos.length} {userVisiblePedidos.length === 1 ? "orden" : "órdenes"}
            </span>
            {user.rol !== "CLIENTE" && (
              <span className="rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-500">
                Modo {user.rol}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Seguimiento de órdenes, porcentaje en tiempo real y despacho express en Posadas, Misiones.
          </p>
        </div>

        {/* Buscador de pedidos */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por repuesto, código o #ORD..."
            className="w-full rounded-xl border border-slate-300 dark:border-line bg-white dark:bg-surface px-3 py-2 pl-9 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-brand shadow-sm"
          />
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* PESTAÑAS DE FILTRO SUPERIORES */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 dark:border-line pb-2 text-xs font-bold scrollbar-none">
        {[
          { key: "TODOS", label: "Todos los pedidos" },
          { key: "PREPARACION", label: "En preparación / Reserva (25% - 50%)" },
          { key: "EN_CAMINO", label: "En camino / Motomandado (75%)" },
          { key: "ENTREGADO", label: "Entregados (100%)" },
          { key: "CANCELADOS", label: "Cancelados" },
        ].map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-2 px-3 whitespace-nowrap transition-colors border-b-2 ${
                active
                  ? "border-brand text-brand"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* BANNER INFORMATIVO DE ENTREGA EN POSADAS */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/20 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            <strong>Chopper Repuestos Posadas</strong> | Retiro con código en mostrador de Av. Roque Sáenz Peña 1500 o envío express por Motomandado / Moto Uber informado al comprar.
          </span>
        </div>
        <Link
          href="/nosotros"
          className="shrink-0 font-bold hover:underline inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300"
        >
          <span>Ver ubicación en mapa</span>
          <ChevronRight size={13} />
        </Link>
      </div>

      {/* 3. LISTADO DE PEDIDOS CON LÍNEA DE TIEMPO INTEGRADA */}
      <div className="space-y-6">
        {filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-12 text-center space-y-3 shadow-sm">
            <ShoppingBag size={40} className="text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No se encontraron pedidos
            </h3>
            <p className="text-xs text-slate-500">
              {searchTerm
                ? `No hay compras que coincidan con "${searchTerm}".`
                : "No tenés compras en esta categoría."}
            </p>
            <Link
              href="/ofertas"
              className="inline-block rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white hover:bg-brandhover shadow transition-all"
            >
              Ver repuestos en oferta
            </Link>
          </div>
        ) : (
          filteredOrders.map((p) => {
            const progress = getOrderProgress(p);
            const totalArticulos = p.items.reduce((acc, it) => acc + it.cantidad, 0);
            const esEfectivoLocal = p.pago === "EFECTIVO_LOCAL" || p.pago === "EFECTIVO";
            const esMotomandado = p.modalidadEntrega === "MOTOMANDADO";

            return (
              <div
                key={p.numero}
                className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-5 sm:p-6 space-y-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-all"
              >
                {/* CABECERA DE LA ORDEN */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-line/70 pb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-base font-black text-brand">
                        #ORD-{p.numero}
                      </span>

                      {/* Badge con Porcentaje */}
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black shadow-sm ${progress.colorBg} text-white`}
                      >
                        {p.estado !== "CANCELADO" && (
                          <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                        )}
                        <span>{progress.percent}%</span>
                        <span>·</span>
                        <span>{progress.label}</span>
                      </span>

                      {/* Badge de Modalidad */}
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-surface border border-slate-200 dark:border-line px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {esMotomandado ? (
                          <>
                            <Bike size={12} className="text-emerald-500" />
                            <span>Envío Motomandado (Posadas)</span>
                          </>
                        ) : (
                          <>
                            <Building size={12} className="text-brand" />
                            <span>Retiro en Local (Roque Sáenz Peña 1500)</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                      <span>Fecha: {p.fecha}</span>
                      <span>·</span>
                      <span>
                        Pago:{" "}
                        <strong className="text-slate-800 dark:text-slate-200">
                          {esEfectivoLocal
                            ? "💵 Efectivo en Local (Al retirar)"
                            : p.pago === "TARJETA"
                            ? "💳 Tarjeta Débito/Crédito (Acreditada)"
                            : "📱 Transferencia Bancaria (Acreditada)"}
                        </strong>
                      </span>
                      {p.costoEnvio && p.costoEnvio > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            Tarifa cadetería: {formatPrice(p.costoEnvio)}
                          </span>
                        </>
                      )}
                    </div>

                    {(p as any).preparadorNombre && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold pt-1">
                        <ShieldCheck size={14} className="text-blue-500 shrink-0" />
                        <span>Preparación de repuestos a cargo de: <strong className="text-slate-900 dark:text-white">{(p as any).preparadorNombre}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* WhatsApp directo para este pedido */}
                  <a
                    href={`https://wa.me/5493765243554?text=Hola,%20quisiera%20consultar%20por%20mi%20pedido%20%23ORD-${p.numero}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 self-start sm:self-auto"
                  >
                    <MessageCircle size={14} />
                    <span>Consultar por WhatsApp</span>
                  </a>
                </div>

                {/* ═══════════ TICKET / CÓDIGO DE RETIRO O RESERVA ═══════════ */}
                <div className="rounded-xl border border-brand/20 bg-brand/5 dark:bg-brand/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <Ticket size={20} className="text-brand shrink-0" />
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {esEfectivoLocal ? "Ticket de Orden de Compra: " : "Ticket / Código de Retiro: "}
                      </span>
                      <span className="font-mono font-black text-brand text-sm ml-1">
                        #{p.codigoTicket || `TK-${p.numero}`}
                      </span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {esEfectivoLocal
                          ? "Presentá este ticket en el mostrador para abonar en efectivo y llevarte tus repuestos reservados. Si no te acercás, la orden se cancela para liberar stock."
                          : esMotomandado
                          ? "El cadete de Motomandado / Moto Uber te solicitará este código al momento de entregarte el paquete en tu domicilio."
                          : "Presentá este ticket en el mostrador de Av. Roque Sáenz Peña 1500 para retirar sin abonar nada más."}
                      </p>
                    </div>
                  </div>

                  {/* Estado de pago badge */}
                  <div className="shrink-0 text-left sm:text-right">
                    <span
                      className={`inline-block rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                        esEfectivoLocal
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      {esEfectivoLocal ? "Pendiente de pago en caja" : "Pago 100% Acreditado"}
                    </span>
                  </div>
                </div>

                {/* ═══════════ LÍNEA DE TIEMPO DIRECTAMENTE EN LA TARJETA ═══════════ */}
                <div className="rounded-xl border border-slate-200 dark:border-line/80 bg-slate-50/80 dark:bg-surface/60 p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Clock size={15} className="text-brand" />
                      <span>Progreso de despacho y entrega</span>
                    </span>
                    <span className="text-xs font-black text-brand">
                      {progress.percent}% completado
                    </span>
                  </div>

                  {/* BARRA DE PROGRESO */}
                  <div className="relative w-full h-2 rounded-full bg-slate-200 dark:bg-line overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        progress.percent === 100
                          ? "bg-emerald-500"
                          : progress.percent >= 75
                          ? "bg-sky-500"
                          : progress.percent >= 50
                          ? "bg-blue-600"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>

                  {/* 4 HITOS VISUALES ADAPTATIVOS */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {/* Hito 1: 25% */}
                    <div
                      className={`timeline-step-card flex flex-col items-center text-center p-2.5 rounded-xl border transition-all ${
                        progress.percent >= 25
                          ? "border-amber-500/40 shadow-sm"
                          : "opacity-40 border-slate-200 dark:border-line"
                      }`}
                    >
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 ${
                          progress.percent >= 25
                            ? "bg-amber-500 text-white"
                            : "bg-slate-300 dark:bg-line text-slate-600"
                        }`}
                      >
                        {progress.percent > 25 ? "✓" : "25%"}
                      </div>
                      <span className="text-xs font-bold block">
                        {esEfectivoLocal ? "1. Orden Generada" : "1. En preparación"}
                      </span>
                      <span className="text-[10px] text-slate-500 leading-tight mt-0.5 block">
                        {esEfectivoLocal ? "Reserva presencial" : "Búsqueda en depósito"}
                      </span>
                    </div>

                    {/* Hito 2: 50% */}
                    <div
                      className={`timeline-step-card flex flex-col items-center text-center p-2.5 rounded-xl border transition-all ${
                        progress.percent >= 50
                          ? "border-blue-500/40 shadow-sm"
                          : "opacity-40 border-slate-200 dark:border-line"
                      }`}
                    >
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 ${
                          progress.percent >= 50
                            ? "bg-blue-600 text-white"
                            : "bg-slate-300 dark:bg-line text-slate-600"
                        }`}
                      >
                        {progress.percent > 50 ? "✓" : "50%"}
                      </div>
                      <span className="text-xs font-bold block">
                        {esEfectivoLocal ? "2. En Estantería" : "2. Preparado en caja"}
                      </span>
                      <span className="text-[10px] text-slate-500 leading-tight mt-0.5 block">
                        {esEfectivoLocal ? "Separado en mostrador" : "Embalado y verificado"}
                      </span>
                    </div>

                    {/* Hito 3: 75% */}
                    <div
                      className={`timeline-step-card flex flex-col items-center text-center p-2.5 rounded-xl border transition-all ${
                        progress.percent >= 75
                          ? "border-sky-500/40 shadow-sm"
                          : "opacity-40 border-slate-200 dark:border-line"
                      }`}
                    >
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 ${
                          progress.percent >= 75
                            ? "bg-sky-600 text-white"
                            : "bg-slate-300 dark:bg-line text-slate-600"
                        }`}
                      >
                        {progress.percent > 75 ? "✓" : "75%"}
                      </div>
                      <span className="text-xs font-bold block">
                        {esMotomandado
                          ? "3. En camino"
                          : "3. Listo en sucursal"}
                      </span>
                      <span className="text-[10px] text-slate-500 leading-tight mt-0.5 block">
                        {esMotomandado ? "Cadete en trayecto" : "Roque Sáenz Peña 1500"}
                      </span>
                    </div>

                    {/* Hito 4: 100% */}
                    <div
                      className={`timeline-step-card flex flex-col items-center text-center p-2.5 rounded-xl border transition-all ${
                        progress.percent === 100
                          ? "border-emerald-500/40 shadow-sm"
                          : "opacity-40 border-slate-200 dark:border-line"
                      }`}
                    >
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 ${
                          progress.percent === 100
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-300 dark:bg-line text-slate-600"
                        }`}
                      >
                        100%
                      </div>
                      <span className="text-xs font-bold block">
                        4. Finalizado
                      </span>
                      <span className="text-[10px] text-slate-500 leading-tight mt-0.5 block">
                        {esEfectivoLocal ? "Cobrado y retirado" : "Entregado al cliente"}
                      </span>
                    </div>
                  </div>

                  {/* Detalle contextual de avance */}
                  <div className="pt-2 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    {esMotomandado ? (
                      <Bike size={16} className="text-emerald-500 shrink-0" />
                    ) : (
                      <Building size={16} className="text-brand shrink-0" />
                    )}
                    <span>{progress.desc}</span>
                  </div>

                  {/* ACCIONES OPERATIVAS: CADETE / COBRO EN EFECTIVO / CANCELACIÓN */}
                  <div className="pt-2 border-t border-slate-200 dark:border-line/60 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      📍 Sucursal: Av. Roque Sáenz Peña 1500 (Posadas, Misiones)
                    </span>

                    {p.estado !== "RETIRADO" && p.estado !== "CANCELADO" ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Si es Motomandado: botón del cadete */}
                        {esMotomandado && (
                          <button
                            onClick={() => cambiarEstadoPedido(p.numero, "RETIRADO")}
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white transition-all shadow flex items-center gap-1.5 active:scale-95"
                            title="El cadete de Motomandado o Moto Uber registra la entrega al llegar"
                          >
                            <Bike size={14} />
                            <span>🛵 Marcar como Entregado (Cadete / Moto Uber)</span>
                          </button>
                        )}

                        {/* Si es Efectivo en local: registrar cobro en mostrador */}
                        {esEfectivoLocal && (
                          <>
                            <button
                              onClick={() => cambiarEstadoPedido(p.numero, "RETIRADO")}
                              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white transition-all shadow flex items-center gap-1.5 active:scale-95"
                              title="Registrar cobro en efectivo y entrega de repuestos en mostrador"
                            >
                              <CreditCard size={14} />
                              <span>💵 Registrar Cobro en Mostrador y Entregar</span>
                            </button>

                            <button
                              onClick={() => cancelarPedido(p.numero)}
                              className="rounded-xl border border-red-500/40 text-red-500 hover:bg-red-500/10 px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1"
                              title="Si el cliente no vino a pagar la orden de compra, cancelarla para liberar stock"
                            >
                              <Ban size={13} />
                              <span>Cancelar Orden Vencida</span>
                            </button>
                          </>
                        )}

                        {/* Si es Retiro pagado online */}
                        {!esEfectivoLocal && !esMotomandado && (
                          <button
                            onClick={() => cambiarEstadoPedido(p.numero, "RETIRADO")}
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white transition-all shadow flex items-center gap-1.5 active:scale-95"
                          >
                            <Package size={14} />
                            <span>📦 Registrar Retiro con Ticket en Mostrador</span>
                          </button>
                        )}
                      </div>
                    ) : p.estado === "CANCELADO" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-500">
                        <Ban size={15} />
                        <span>Orden Cancelada · Stock devuelto al inventario</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={15} />
                        <span>Orden finalizada con éxito · 100% completado</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* PRODUCTOS DEL PEDIDO */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Repuestos incluidos ({totalArticulos} unidades):
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {p.items.map((it, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-line/70 bg-white dark:bg-surface p-3"
                      >
                        <div className="relative h-12 w-12 shrink-0 rounded-lg bg-slate-50 dark:bg-card p-1.5 flex items-center justify-center border border-slate-100 dark:border-line/40">
                          <Image
                            src={getBrandLogo(it.marca)}
                            alt={it.nombre}
                            width={40}
                            height={40}
                            className="max-h-8 w-auto object-contain"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">
                            {it.nombre}
                          </span>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                            <span className="font-semibold text-brand">{it.marca}</span>
                            <span className="font-mono font-bold">x{it.cantidad}</span>
                          </div>
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white block mt-0.5">
                            {formatPrice(it.precio * it.cantidad)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PIE DE LA TARJETA: TOTAL Y BOTONES PROPIOS DE CHOPPER */}
                <div className="pt-4 border-t border-slate-100 dark:border-line/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <span className="text-[11px] text-slate-500 block uppercase font-bold">
                      Total de la orden
                    </span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">
                      {formatPrice(p.total)}
                    </span>
                    {p.costoEnvio && p.costoEnvio > 0 && (
                      <span className="text-[10px] text-slate-400 block">
                        (Incluye {formatPrice(p.costoEnvio)} de envío Motomandado Posadas)
                      </span>
                    )}
                  </div>

                  {/* Botones de acción Chopper */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleRepetirPedido(p)}
                      className="rounded-xl border border-slate-300 dark:border-line bg-white dark:bg-surface hover:border-brand hover:text-brand px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1.5"
                    >
                      <RotateCcw size={14} />
                      <span>Repetir pedido</span>
                    </button>

                    <button
                      onClick={() => {
                        setReviewModalOrder(p);
                        setReviewSubmitted(false);
                      }}
                      className="rounded-xl border border-slate-300 dark:border-line bg-white dark:bg-surface hover:border-amber-500 hover:text-amber-500 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1.5"
                    >
                      <Star size={14} className="text-amber-500" />
                      <span>Calificar repuestos</span>
                    </button>

                    <a
                      href={`https://wa.me/5493765243554?text=Hola,%20quisiera%20consultar%20por%20mi%20orden%20%23${p.codigoTicket || p.numero}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-brand hover:bg-brandhover px-4 py-2 text-xs font-bold text-white shadow-sm transition-all"
                    >
                      Ayuda Chopper
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ═══════════ MODAL INTERACTIVO DE RESEÑA ═══════════ */}
      {reviewModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-line pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Star size={18} className="text-amber-500 fill-amber-500" />
                <span>Calificar Pedido #{reviewModalOrder.numero}</span>
              </h3>
              <button
                onClick={() => setReviewModalOrder(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {reviewSubmitted ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
                <h4 className="font-bold text-slate-900 dark:text-white text-base">
                  ¡Gracias por tu opinión!
                </h4>
                <p className="text-xs text-slate-500">
                  Tu reseña sobre el pedido #{reviewModalOrder.numero} ayuda a la comunidad motera de Posadas.
                </p>
                <button
                  onClick={() => setReviewModalOrder(null)}
                  className="mt-3 rounded-xl bg-brand px-5 py-2 text-xs font-bold text-white hover:bg-brandhover"
                >
                  Aceptar
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    ¿Cómo calificarías los repuestos y la entrega?
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          size={24}
                          className={`${
                            star <= reviewRating
                              ? "text-amber-500 fill-amber-500"
                              : "text-slate-300 dark:text-slate-600"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-amber-500 ml-2">
                      {reviewRating} de 5 estrellas
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tu comentario sobre el repuesto o la atención
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Contanos cómo anduvo el repuesto en tu moto y la atención en Posadas..."
                    className="w-full rounded-xl border border-slate-300 dark:border-line bg-white dark:bg-surface p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-brand shadow-sm"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewModalOrder(null)}
                    className="rounded-xl border border-slate-300 dark:border-line px-4 py-2 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-surface"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewSubmitted(true)}
                    className="rounded-xl bg-brand hover:bg-brandhover px-5 py-2 font-bold text-white shadow-sm transition-all"
                  >
                    Enviar Calificación
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
