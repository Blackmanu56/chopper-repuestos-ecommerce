"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import {
  getMisPedidosClienteAction,
  PedidoDTO,
  subirComprobantePedidoAction,
  cancelarOSolicitarCancelacionClienteAction,
  prepararVolverAComprarAction,
  VolverAComprarResultadoDTO,
} from "@/actions/pedidos";
import {
  Package,
  Search,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Bike,
  RotateCcw,
  X,
  AlertCircle,
  ChevronRight,
  ShoppingBag,
  ShoppingCart,
  Ticket,
  Building,
  CreditCard,
  Ban,
  User,
  Lock,
  Eye,
  Upload,
  AlertTriangle,
  Check,
} from "lucide-react";

// Componente para miniatura con imagen real o ícono neutral de repuesto (sin logos de marca ficticios)
function ProductThumbnail({ src, alt }: { src?: string | null; alt: string }) {
  const [error, setError] = useState(false);

  if (src && !error) {
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setError(true)}
        className="h-full w-full object-contain p-1"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-surface text-slate-400 p-2">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-6 h-6 text-slate-400 dark:text-slate-500"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </div>
  );
}

// Estados del stepper secuencial operativo
const STEPPER_STATES = [
  { key: "PENDIENTE", label: "Pendiente de confirmación", desc: "Orden registrada a la espera de confirmación de pago." },
  { key: "CONFIRMADO", label: "Pendiente de preparación", desc: "Pago verificado. En cola para inicio de preparación en depósito." },
  { key: "PREPARANDO", label: "En preparación", desc: "Personal de stock controlando checklist y embalando las piezas." },
  { key: "LISTO_ENTREGA", label: "Listo para entregar", desc: "Paquete listo para retirar en mostrador o ser despachado." },
  { key: "ENTREGADO", label: "Entregado", desc: "Orden entregada exitosamente." },
];

function getEstadoIndex(estado: string): number {
  switch (estado) {
    case "PENDIENTE":
      return 0;
    case "CONFIRMADO":
      return 1;
    case "PREPARANDO":
      return 2;
    case "LISTO_ENTREGA":
    case "LISTO_PARA_RETIRAR":
      return 3;
    case "ENTREGADO":
    case "RETIRADO":
      return 4;
    default:
      return -1;
  }
}

function getEstadoPreparacionLabel(estado: string, modalidadEntrega: string) {
  switch (estado) {
    case "PENDIENTE":
      return "Pendiente de confirmación";
    case "CONFIRMADO":
      return "Pendiente de preparación";
    case "PREPARANDO":
      return "En preparación";
    case "LISTO_ENTREGA":
    case "LISTO_PARA_RETIRAR":
      return modalidadEntrega === "MOTOMANDADO" ? "Listo para envío" : "Listo para entregar";
    case "ENTREGADO":
    case "RETIRADO":
      return "Entregado";
    case "CANCELADO":
      return "Cancelado";
    default:
      return estado;
  }
}

// Lógica precisa para el estado del pago según registros en PostgreSQL
function getPaymentStatusInfo(pedido: PedidoDTO) {
  const isPaid = pedido.estadoPago === "PAGADO";
  const hasRejection =
    (pedido.notas || "").toLowerCase().includes("rechazado") ||
    pedido.estadoPago === "RECHAZADO";

  if (isPaid) {
    if (pedido.metodoPago === "EFECTIVO_LOCAL") {
      return {
        label: "Pago acreditado en mostrador",
        detail: "El cobro en efectivo fue registrado en mostrador al retirar.",
        badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        type: "ACREDITADO",
      };
    }
    return {
      label: "Pago acreditado",
      detail: "La acreditación del pago fue confirmada por el equipo de Ventas.",
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      type: "ACREDITADO",
    };
  }

  if (hasRejection) {
    return {
      label: "Comprobante rechazado",
      detail: "El comprobante enviado no pudo ser validado. Por favor comunicate o adjuntá uno nuevo.",
      badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
      type: "RECHAZADO",
    };
  }

  if (pedido.metodoPago === "EFECTIVO_LOCAL") {
    return {
      label: "Pago en efectivo al retirar",
      detail: "Abonás el importe exacto en efectivo al retirar en mostrador de Av. Roque Sáenz Peña 1500.",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      type: "EFECTIVO_PENDIENTE",
    };
  }

  if (pedido.metodoPago === "TRANSFERENCIA") {
    if (pedido.comprobanteUrl) {
      return {
        label: "Comprobante enviado, pendiente de verificación",
        detail: "Tu comprobante fue recibido. Ventas está verificando la acreditación bancaria.",
        badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
        type: "VERIFICACION_PENDIENTE",
      };
    }
    return {
      label: "Pago pendiente",
      detail: "Pendiente de transferencia bancaria y envío de comprobante.",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      type: "PENDIENTE",
    };
  }

  if (pedido.metodoPago === "TARJETA") {
    return {
      label: "Pago pendiente",
      detail: "En proceso de validación por la pasarela de pagos.",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      type: "PENDIENTE",
    };
  }

  return {
    label: "Pago pendiente",
    detail: "Pendiente de regularización.",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    type: "PENDIENTE",
  };
}

export default function MisPedidosPage() {
  const { addToCart } = useCart();
  const { user, openLogin, loginClient, isStaff } = useAuth();
  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlNum = searchParams.get("num") ? parseInt(searchParams.get("num")!, 10) : undefined;

  // Tabs: "EN_CURSO" vs "HISTORIAL"
  const [activeTab, setActiveTab] = useState<"EN_CURSO" | "HISTORIAL">("EN_CURSO");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<PedidoDTO | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dbPedidos, setDbPedidos] = useState<PedidoDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Subir comprobante desde el modal de detalle
  const [uploadingReceipt, setUploadingReceipt] = useState<boolean>(false);

  // Estados para cancelación de pedidos por el cliente
  const [modalCancelacionOpen, setModalCancelacionOpen] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [procesandoCancelacion, setProcesandoCancelacion] = useState(false);

  // Estados para volver a comprar con validación de stock y precios actuales
  const [modalVolverComprarOpen, setModalVolverComprarOpen] = useState(false);
  const [preparandoVolverComprar, setPreparandoVolverComprar] = useState(false);
  const [volverComprarData, setVolverComprarData] = useState<VolverAComprarResultadoDTO | null>(null);

  const fetchPedidos = () => {
    if (!user) {
      setDbPedidos([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    getMisPedidosClienteAction().then((res) => {
      setIsLoading(false);
      if (res.success && res.pedidos) {
        setDbPedidos(res.pedidos);
        // Si vino por query param ?num=, abrir directamente el detalle del pedido y seleccionar la pestaña adecuada
        if (urlNum) {
          const match = res.pedidos.find((p) => p.numero === urlNum);
          if (match) {
            setSelectedOrder(match);
            const isHistorical = ["ENTREGADO", "RETIRADO", "CANCELADO"].includes(match.estado);
            setActiveTab(isHistorical ? "HISTORIAL" : "EN_CURSO");
          }
        }
      } else {
        setDbPedidos([]);
      }
    });
  };

  useEffect(() => {
    fetchPedidos();
  }, [user, urlNum]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenCancelar = (pedido: PedidoDTO) => {
    setSelectedOrder(pedido);
    setMotivoCancelacion("");
    setModalCancelacionOpen(true);
  };

  const handleConfirmarCancelacion = async () => {
    if (!selectedOrder) return;
    const cleanMotivo = motivoCancelacion.trim();
    if (!cleanMotivo || cleanMotivo.length < 3) {
      showToast("Por favor escribí el motivo de la cancelación (mínimo 3 letras).");
      return;
    }

    setProcesandoCancelacion(true);
    try {
      const res = await cancelarOSolicitarCancelacionClienteAction(selectedOrder.id, cleanMotivo);
      if (res.success && res.pedido) {
        showToast(res.mensaje || "Operación procesada con éxito.");
        setSelectedOrder(res.pedido);
        setDbPedidos((prev) => prev.map((p) => (p.id === res.pedido!.id ? res.pedido! : p)));
        setModalCancelacionOpen(false);
      } else {
        showToast(res.error || "No se pudo procesar la cancelación.");
      }
    } catch {
      showToast("Error de conexión al procesar la cancelación.");
    } finally {
      setProcesandoCancelacion(false);
    }
  };

  const handleIniciarVolverAComprar = async (pedidoId: number) => {
    if (isStaff) {
      showToast("Estás utilizando una cuenta de personal. Para realizar compras, ingresá con una cuenta de cliente.");
      return;
    }
    setPreparandoVolverComprar(true);
    try {
      const res = await prepararVolverAComprarAction(pedidoId);
      if (res.success && res.itemsParaCarrito) {
        setVolverComprarData(res);
        setModalVolverComprarOpen(true);
      } else {
        showToast(res.error || "No se pudieron consultar los artículos para volver a comprar.");
      }
    } catch {
      showToast("Error al consultar disponibilidad de los repuestos.");
    } finally {
      setPreparandoVolverComprar(false);
    }
  };

  const handleConfirmarAgregarAlCarrito = (irAlCarrito = false) => {
    if (isStaff) {
      showToast("Estás utilizando una cuenta de personal. Para realizar compras, ingresá con una cuenta de cliente.");
      return;
    }
    if (!volverComprarData?.itemsParaCarrito?.length) return;

    volverComprarData.itemsParaCarrito.forEach((it) => {
      addToCart(
        {
          id: it.id,
          nombre: it.nombre,
          precio: it.precio,
          marca: it.marca,
          categoriaId: it.categoriaId,
          categoriaNombre: it.categoriaNombre,
          stock: it.stock,
          imagen: it.imagen,
          esCombo: it.esCombo,
        } as any,
        it.cantidadAgregada
      );
    });

    showToast(`Se agregaron ${volverComprarData.itemsParaCarrito.length} artículo(s) al carrito.`);
    setModalVolverComprarOpen(false);
    if (irAlCarrito) {
      router.push("/carrito");
    }
  };

  const handleSubirComprobante = async (pedidoNumero: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append("comprobante", file);
      const res = await subirComprobantePedidoAction(pedidoNumero, formData);
      if (res.success && res.comprobanteUrl) {
        showToast("¡Comprobante adjuntado con éxito! Se envió a verificación.");
        setSelectedOrder((prev) => (prev ? { ...prev, comprobanteUrl: res.comprobanteUrl! } : null));
        setDbPedidos((prev) =>
          prev.map((p) => (p.numero === pedidoNumero ? { ...p, comprobanteUrl: res.comprobanteUrl! } : p))
        );
      } else {
        showToast(res.error || "No se pudo subir el comprobante.");
      }
    } catch (err) {
      console.error("Error al subir comprobante:", err);
      showToast("Error de conexión al subir el archivo.");
    } finally {
      setUploadingReceipt(false);
    }
  };

  // Listados filtrados para En Curso e Historial
  const pedidosEnCurso = dbPedidos.filter((p) =>
    ["PENDIENTE", "CONFIRMADO", "PREPARANDO", "LISTO_ENTREGA", "LISTO_PARA_RETIRAR"].includes(p.estado)
  );
  const pedidosHistorial = dbPedidos.filter((p) =>
    ["ENTREGADO", "RETIRADO", "CANCELADO"].includes(p.estado)
  );
  const listadoActual = activeTab === "EN_CURSO" ? pedidosEnCurso : pedidosHistorial;
  const filteredOrders = listadoActual.filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return String(p.numero).includes(q) || p.items.some((it) => it.nombre.toLowerCase().includes(q));
  });

  // 1. Guard de autenticación: si no está logueado, solicitar inicio de sesión
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto mt-8 px-4 space-y-6">
        <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link href="/" className="hover:text-brand transition-colors">
            Inicio
          </Link>
          <span>&gt;</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Mis Pedidos
          </span>
        </nav>

        <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-8 sm:p-10 text-center shadow-sm space-y-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 border border-brand/30 text-brand mx-auto">
            <Lock size={32} />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Iniciá sesión para ver tus pedidos
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Para consultar tus órdenes de compra, tickets de retiro en mostrador y el seguimiento en vivo de tu compra, ingresá con tu cuenta de cliente.
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
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto mt-4 px-4 space-y-6">
      {/* Toast Flotante */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-slate-900 text-white border border-slate-700 px-4 py-2.5 text-xs font-bold shadow-2xl animate-in fade-in">
          {toastMessage}
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-brand transition-colors">
          Inicio
        </Link>
        <span>&gt;</span>
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          Mis Pedidos
        </span>
      </nav>

      {/* Encabezado y Buscador */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-line pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Mis Pedidos
            </h1>
            <span className="rounded-full bg-brand/10 border border-brand/30 px-2.5 py-0.5 text-xs font-black text-brand">
              {dbPedidos.length} {dbPedidos.length === 1 ? "orden" : "órdenes"}
            </span>
            {user.rol !== "CLIENTE" && (
              <span className="rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-500">
                {user.rol}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Seguimiento de compras, retiro en el local de Posadas y comprobantes oficiales.
          </p>
        </div>

        {/* Buscador de pedidos */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por #orden o repuesto..."
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

      {/* DOS PESTAÑAS PRINCIPALES: EN CURSO vs HISTORIAL */}
      <div className="flex border-b border-slate-200 dark:border-line gap-2 text-sm font-bold">
        <button
          onClick={() => setActiveTab("EN_CURSO")}
          className={`flex items-center gap-2 pb-3 px-4 border-b-2 transition-colors ${
            activeTab === "EN_CURSO"
              ? "border-brand text-brand"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <span>En curso</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-black ${
              activeTab === "EN_CURSO"
                ? "bg-brand text-white"
                : "bg-slate-100 dark:bg-surface text-slate-600 dark:text-slate-400"
            }`}
          >
            {pedidosEnCurso.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("HISTORIAL")}
          className={`flex items-center gap-2 pb-3 px-4 border-b-2 transition-colors ${
            activeTab === "HISTORIAL"
              ? "border-brand text-brand"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <span>Historial</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-black ${
              activeTab === "HISTORIAL"
                ? "bg-brand text-white"
                : "bg-slate-100 dark:bg-surface text-slate-600 dark:text-slate-400"
            }`}
          >
            {pedidosHistorial.length}
          </span>
        </button>
      </div>

      {/* Banner informativo del local */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/20 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            <strong>Retiro en mostrador Chopper Posadas:</strong> Av. Roque Sáenz Peña 1500 (Lun a Sáb 8:00-12:30 / 16:30-20:30 hs).
          </span>
        </div>
        <Link
          href="/nosotros"
          className="shrink-0 font-bold hover:underline inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300"
        >
          <span>Ver horarios y mapa</span>
          <ChevronRight size={13} />
        </Link>
      </div>

      {/* Listado de tarjetas compactas */}
      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-12 text-center space-y-3">
          <Clock size={36} className="text-slate-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Cargando tus pedidos...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-12 text-center space-y-3 shadow-sm">
          <Package size={40} className="text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {searchTerm
              ? `No se encontraron pedidos para "${searchTerm}"`
              : activeTab === "EN_CURSO"
              ? "No tenés pedidos en curso"
              : "No tenés compras en tu historial"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeTab === "EN_CURSO"
              ? "Todas tus órdenes anteriores ya fueron completadas o canceladas."
              : "Los pedidos que recibas o se completen aparecerán registrados aquí."}
          </p>
          <Link
            href="/ofertas"
            className="inline-block rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white hover:bg-brandhover shadow transition-all"
          >
            Explorar catálogo de repuestos
          </Link>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredOrders.map((pedido) => {
            const paymentInfo = getPaymentStatusInfo(pedido);
            const totalArticulos = pedido.items.reduce((acc, it) => acc + it.cantidad, 0);
            const fechaStr = new Date(pedido.creadoEn).toLocaleString("es-AR", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }) + " hs";

            const prepLabel = getEstadoPreparacionLabel(pedido.estado, pedido.modalidadEntrega);
            const isCancelled = pedido.estado === "CANCELADO";
            const isReciente = urlNum === pedido.numero;

            return (
              <div
                key={pedido.id}
                className={`rounded-2xl border bg-white dark:bg-card p-4 sm:p-5 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isReciente
                    ? "border-emerald-500/60 ring-2 ring-emerald-500/20"
                    : "border-slate-200 dark:border-line hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {/* Bloque Izquierdo: Identificación y Fechas */}
                <div className="space-y-1.5 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-base font-black text-brand">
                      #{pedido.numero}
                    </span>
                    <span className="rounded-md bg-slate-100 dark:bg-surface px-2 py-0.5 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 border border-line/60">
                      TK-{pedido.numero}
                    </span>
                    {isReciente && (
                      <span className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        Pedido recién realizado
                      </span>
                    )}
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500 font-medium">
                      {fechaStr}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <span>
                      {totalArticulos} {totalArticulos === 1 ? "repuesto" : "repuestos"}
                    </span>
                    <span>·</span>
                    <span>
                      {pedido.modalidadEntrega === "MOTOMANDADO" ? "Envío Motomandado" : "Retiro en mostrador"}
                    </span>
                  </div>
                </div>

                {/* Bloque Central: Estado de Preparación y Estado del Pago */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {/* Badge Estado Preparación */}
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold ${
                      isCancelled
                        ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
                        : pedido.estado === "ENTREGADO"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-brand/10 text-brand border-brand/30"
                    }`}
                  >
                    {isCancelled ? <Ban size={12} /> : <Package size={12} />}
                    <span>{prepLabel}</span>
                  </span>

                  {/* Badge Estado Pago */}
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold ${paymentInfo.badgeClass}`}
                    title={paymentInfo.detail}
                  >
                    <CreditCard size={12} />
                    <span>{paymentInfo.label}</span>
                  </span>

                  {/* Badge Solicitud de Cancelación en Trámite */}
                  {pedido.solicitudCancelacion?.estado === "PENDIENTE" && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
                      <Clock size={12} />
                      <span>Cancelación en trámite</span>
                    </span>
                  )}
                </div>

                {/* Bloque Derecho: Importe y Botón Ver Detalle / Volver a comprar */}
                <div className="flex items-center justify-between md:justify-end gap-2 sm:gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-line/60">
                  <div className="text-left md:text-right pr-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Total
                    </span>
                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      {formatPrice(pedido.total)}
                    </span>
                  </div>

                  {activeTab === "HISTORIAL" && (
                    <button
                      type="button"
                      onClick={() => handleIniciarVolverAComprar(pedido.id)}
                      disabled={preparandoVolverComprar}
                      className={
                        isStaff
                          ? "inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 px-3.5 py-2 text-xs font-bold border border-slate-300 dark:border-zinc-700 shadow-sm transition-all cursor-pointer"
                          : "inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer"
                      }
                      title={
                        isStaff
                          ? "Estás utilizando una cuenta de personal. Para realizar compras, ingresá con una cuenta de cliente."
                          : "Consultar precios y agregar al carrito"
                      }
                    >
                      {isStaff ? (
                        <Lock size={13} className="text-slate-500 dark:text-zinc-400" />
                      ) : (
                        <RotateCcw size={13} className={preparandoVolverComprar ? "animate-spin" : ""} />
                      )}
                      <span>{isStaff ? "Solo consulta" : "Volver a comprar"}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedOrder(pedido)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-surface dark:hover:bg-slate-700 border border-slate-700/50 px-4 py-2 text-xs font-bold text-white transition-all active:scale-95 shadow-sm cursor-pointer"
                  >
                    <Eye size={13} />
                    <span>Ver detalle</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DETALLE DE PEDIDO CON SEGUIMIENTO VISUAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-[#121318] p-5 sm:p-7 shadow-2xl space-y-6 my-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            {/* Cabecera del Modal */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-line pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    Pedido #{selectedOrder.numero}
                  </h2>
                  <span className="rounded-lg bg-brand/10 border border-brand/30 px-2 py-0.5 text-xs font-black text-brand font-mono">
                    TK-{selectedOrder.numero}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Registrado el{" "}
                  {new Date(selectedOrder.creadoEn).toLocaleString("es-AR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  hs
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface transition-colors"
                aria-label="Cerrar detalle"
              >
                <X size={20} />
              </button>
            </div>

            {/* SEGUIMIENTO VISUAL SECUENCIAL */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Seguimiento del pedido
              </h3>

              {selectedOrder.estado === "CANCELADO" ? (
                /* Estado Cancelado - No simula avance */
                <div className="rounded-xl border border-red-500/40 bg-red-50 dark:bg-red-950/30 p-4 text-xs text-red-900 dark:text-red-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-red-700 dark:text-red-400">
                    <Ban size={16} />
                    <span>Pedido Cancelado</span>
                  </div>
                  <p className="text-red-800 dark:text-red-300">
                    Este pedido fue cancelado y no continúa en preparación. El stock fue reintegrado al inventario del local.
                  </p>
                </div>
              ) : (
                /* Stepper de 5 pasos con nombres comprensibles y sin falsear estados futuros */
                <div className="rounded-xl border border-slate-200 dark:border-line bg-slate-50/50 dark:bg-surface/40 p-4 space-y-4">
                  <div className="relative">
                    {/* Línea base del stepper */}
                    <div className="absolute top-4 left-3 right-3 h-0.5 bg-slate-200 dark:bg-line -z-0" />

                    {/* Pasos */}
                    <div className="relative z-10 grid grid-cols-5 gap-1 text-center">
                      {STEPPER_STATES.map((step, idx) => {
                        const currentIdx = getEstadoIndex(selectedOrder.estado);
                        const isCompleted = currentIdx > idx;
                        const isCurrent = currentIdx === idx;
                        const isFuture = currentIdx < idx;

                        return (
                          <div key={step.key} className="flex flex-col items-center">
                            {/* Círculo indicador */}
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                                isCompleted
                                  ? "bg-emerald-500 text-white shadow-sm"
                                  : isCurrent
                                  ? "bg-brand text-white ring-4 ring-brand/20 shadow-md"
                                  : "bg-slate-200 dark:bg-line text-slate-400 dark:text-slate-600"
                              }`}
                            >
                              {isCompleted ? (
                                <Check size={14} />
                              ) : (
                                <span>{idx + 1}</span>
                              )}
                            </div>

                            {/* Etiqueta del estado */}
                            <span
                              className={`mt-2 text-[10px] sm:text-[11px] font-bold leading-tight ${
                                isCurrent
                                  ? "text-brand"
                                  : isCompleted
                                  ? "text-slate-800 dark:text-slate-200"
                                  : "text-slate-400 dark:text-slate-600"
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Descripción del estado actual */}
                  <div className="border-t border-slate-200 dark:border-line/70 pt-2.5 text-center text-xs text-slate-600 dark:text-slate-400">
                    {STEPPER_STATES[Math.max(0, getEstadoIndex(selectedOrder.estado))]?.desc}
                  </div>
                </div>
              )}
            </div>

            {/* ESTADO DEL PAGO DETALLADO */}
            <div className="rounded-xl border border-slate-200 dark:border-line bg-slate-50 dark:bg-surface/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Estado del pago
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-xs font-bold ${
                    getPaymentStatusInfo(selectedOrder).badgeClass
                  }`}
                >
                  <CreditCard size={12} />
                  <span>{getPaymentStatusInfo(selectedOrder).label}</span>
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400">
                {getPaymentStatusInfo(selectedOrder).detail}
              </p>

              {/* Opción de adjuntar comprobante si es transferencia y aún no fue verificado */}
              {selectedOrder.metodoPago === "TRANSFERENCIA" &&
                selectedOrder.estadoPago !== "PAGADO" && (
                  <div className="pt-2 border-t border-slate-200 dark:border-line/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-[11px] text-slate-500">
                      {selectedOrder.comprobanteUrl ? (
                        <span className="text-sky-600 dark:text-sky-400 font-medium">
                          ✓ Ya adjuntaste un comprobante. Podés reemplazarlo si hiciste otra transferencia.
                        </span>
                      ) : (
                        <span>¿Hiciste la transferencia? Adjuntá la captura para agilizar la preparación.</span>
                      )}
                    </div>

                    <label className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand hover:bg-brandhover px-3.5 py-2 text-xs font-bold text-white cursor-pointer transition-all shadow-sm">
                      <Upload size={13} />
                      <span>{uploadingReceipt ? "Subiendo..." : "Subir comprobante"}</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => handleSubirComprobante(selectedOrder.numero, e)}
                        disabled={uploadingReceipt}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
            </div>

            {/* MODALIDAD Y DIRECCIÓN DE ENTREGA */}
            <div className="rounded-xl border border-slate-200 dark:border-line p-4 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                {selectedOrder.modalidadEntrega === "MOTOMANDADO" ? (
                  <>
                    <Bike size={16} className="text-brand" />
                    <span>Envío express por Motomandado</span>
                  </>
                ) : (
                  <>
                    <Building size={16} className="text-brand" />
                    <span>Retiro en mostrador · Chopper Repuestos</span>
                  </>
                )}
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                {selectedOrder.modalidadEntrega === "MOTOMANDADO"
                  ? `Destino de entrega: ${selectedOrder.direccionEnvio || "Posadas, Misiones"}`
                  : "Dirección: Av. Roque Sáenz Peña 1500, Posadas, Misiones. Presentar número de pedido o DNI."}
              </p>
            </div>

            {/* LISTA DE PRODUCTOS CON IMÁGENES REALES */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Productos comprados ({selectedOrder.items.length})
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-line/60 rounded-xl border border-slate-200 dark:border-line overflow-hidden">
                {selectedOrder.items.map((it) => (
                  <div
                    key={it.id}
                    className="p-3.5 bg-white dark:bg-card flex items-center gap-3.5"
                  >
                    {/* Imagen real del producto / combo o neutral fallback */}
                    <div className="h-14 w-14 rounded-lg bg-slate-50 dark:bg-surface border border-slate-200 dark:border-line/70 shrink-0 overflow-hidden flex items-center justify-center">
                      <ProductThumbnail src={it.imagen} alt={it.nombre} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {it.nombre}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {it.marca || "Chopper"} · {formatPrice(it.precioUnitario)} × {it.cantidad} u.
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {formatPrice(it.subtotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TOTALES Y ACCIONES */}
            <div className="border-t border-slate-200 dark:border-line pt-4 space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal productos</span>
                  <span>
                    {formatPrice(
                      selectedOrder.items.reduce((acc, it) => acc + it.subtotal, 0)
                    )}
                  </span>
                </div>
                {selectedOrder.costoEnvio > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Costo de envío (Motomandado)</span>
                    <span>{formatPrice(selectedOrder.costoEnvio)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-900 dark:text-white border-t border-slate-100 dark:border-line/60 pt-2">
                  <span>Importe total</span>
                  <span className="text-brand">{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Botón Volver a comprar si el pedido está en Historial */}
                  {(selectedOrder.estado === "ENTREGADO" || selectedOrder.estado === "CANCELADO") && (
                    <button
                      type="button"
                      onClick={() => handleIniciarVolverAComprar(selectedOrder.id)}
                      disabled={preparandoVolverComprar}
                      className={
                        isStaff
                          ? "w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 px-4 py-2.5 text-xs font-bold border border-slate-300 dark:border-zinc-700 shadow-sm transition-colors cursor-pointer"
                          : "w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer shadow-sm"
                      }
                      title={
                        isStaff
                          ? "Estás utilizando una cuenta de personal. Para realizar compras, ingresá con una cuenta de cliente."
                          : "Consultar precios y agregar al carrito"
                      }
                    >
                      {isStaff ? (
                        <Lock size={13} className="text-slate-500 dark:text-zinc-400" />
                      ) : (
                        <RotateCcw size={13} className={preparandoVolverComprar ? "animate-spin" : ""} />
                      )}
                      <span>{isStaff ? "Solo consulta" : "Volver a comprar"}</span>
                    </button>
                  )}

                  {/* Botón Cancelación si el pedido está En curso */}
                  {selectedOrder.estado === "PENDIENTE" && (
                    <button
                      type="button"
                      onClick={() => handleOpenCancelar(selectedOrder)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 px-4 py-2.5 text-xs font-bold text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                    >
                      <Ban size={13} />
                      <span>Cancelar pedido (inmediato)</span>
                    </button>
                  )}

                  {["CONFIRMADO", "PREPARANDO", "LISTO_ENTREGA", "LISTO_PARA_RETIRAR"].includes(selectedOrder.estado) && (
                    selectedOrder.solicitudCancelacion?.estado === "PENDIENTE" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs font-bold">
                        <Clock size={13} />
                        <span>Solicitud de cancelación en trámite</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenCancelar(selectedOrder)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2.5 text-xs font-bold text-amber-700 dark:text-amber-400 transition-colors cursor-pointer"
                      >
                        <AlertTriangle size={13} />
                        <span>Solicitar cancelación</span>
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="w-full sm:w-auto rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-surface dark:hover:bg-slate-700 px-5 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN O SOLICITUD DE CANCELACIÓN */}
      {modalCancelacionOpen && selectedOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-[#121318] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-line pb-3">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle size={20} />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {selectedOrder.estado === "PENDIENTE"
                    ? `Cancelar pedido #${selectedOrder.numero}`
                    : `Solicitar cancelación del pedido #${selectedOrder.numero}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalCancelacionOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5">
              {selectedOrder.estado === "PENDIENTE" ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300">
                  <span className="font-bold block mb-0.5">Cancelación inmediata:</span>
                  Tu pedido se encuentra pendiente de confirmación. Al confirmar, se dará de baja en el acto y los repuestos volverán a estar disponibles en el stock del local.
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-800 dark:text-blue-300">
                  <span className="font-bold block mb-0.5">Requiere aprobación:</span>
                  Tu pedido ya se encuentra confirmado o en armado en depósito. Se enviará una solicitud al personal de Ventas y Administración para autorizar la anulación y reposición de las piezas.
                </div>
              )}

              {selectedOrder.estadoPago === "PAGADO" && (
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-surface border border-slate-200 dark:border-line text-slate-700 dark:text-slate-300">
                  <span className="font-bold block text-slate-900 dark:text-white mb-0.5">
                    Información sobre pagos acreditados:
                  </span>
                  Este pedido figura con pago acreditado. La cancelación no realiza reintegros de dinero automáticos; el reintegro se coordina con Ventas en mostrador o mediante transferencia.
                </div>
              )}

              <div className="space-y-1 pt-1">
                <label className="font-bold text-slate-900 dark:text-white block">
                  Motivo de la cancelación <span className="text-red-500">*</span>:
                </label>
                <textarea
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                  placeholder="Por favor contanos brevemente por qué necesitás cancelar la compra..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 dark:border-line bg-white dark:bg-surface px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-brand placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-line">
              <button
                type="button"
                onClick={() => setModalCancelacionOpen(false)}
                disabled={procesandoCancelacion}
                className="rounded-xl border border-slate-300 dark:border-line px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface transition-colors cursor-pointer"
              >
                Volver atrás
              </button>
              <button
                type="button"
                onClick={handleConfirmarCancelacion}
                disabled={procesandoCancelacion || motivoCancelacion.trim().length < 3}
                className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {procesandoCancelacion
                  ? "Procesando..."
                  : selectedOrder.estado === "PENDIENTE"
                  ? "Confirmar cancelación"
                  : "Enviar solicitud a Ventas"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VOLVER A COMPRAR CON PRECIOS Y STOCK ACTUALIZADOS */}
      {modalVolverComprarOpen && volverComprarData && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-[#121318] p-6 shadow-2xl space-y-4 my-6">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-line pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <RotateCcw size={18} className="text-emerald-500" />
                  <span>Volver a comprar · Pedido #{volverComprarData.pedidoOriginalNumero}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verificamos stock y cotizaciones actuales en tiempo real.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalVolverComprarOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Avisos de cambios de precio o ajustes de stock */}
            {volverComprarData.avisos && volverComprarData.avisos.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <AlertCircle size={14} />
                  <span>Actualizaciones de stock o precio:</span>
                </span>
                <ul className="list-disc pl-5 space-y-0.5">
                  {volverComprarData.avisos.map((av, idx) => (
                    <li key={idx}>{av}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Artículos sin stock o pausados */}
            {volverComprarData.itemsNoDisponibles && volverComprarData.itemsNoDisponibles.length > 0 && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-800 dark:text-red-300 text-xs space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <Ban size={14} />
                  <span>Artículos no disponibles para recompra:</span>
                </span>
                <ul className="list-disc pl-5 space-y-0.5">
                  {volverComprarData.itemsNoDisponibles.map((ina, idx) => (
                    <li key={idx}>
                      <strong>{ina.nombre}:</strong> {ina.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Artículos disponibles listos para agregar */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                Artículos disponibles para agregar al carrito ({volverComprarData.itemsParaCarrito?.length || 0}):
              </span>

              {volverComprarData.itemsParaCarrito && volverComprarData.itemsParaCarrito.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-line/60 rounded-xl border border-slate-200 dark:border-line overflow-hidden max-h-56 overflow-y-auto">
                  {volverComprarData.itemsParaCarrito.map((it) => (
                    <div key={it.id} className="p-3 bg-white dark:bg-card flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{it.nombre}</p>
                        <p className="text-[11px] text-slate-500">
                          {it.marca} · {it.cantidadAgregada} u. a {formatPrice(it.precio)} c/u
                          {it.precioModificado && (
                            <span className="text-amber-500 font-semibold ml-1.5">(precio actualizado)</span>
                          )}
                        </p>
                      </div>
                      <div className="font-black text-slate-900 dark:text-white">
                        {formatPrice(it.precio * it.cantidadAgregada)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-line rounded-xl">
                  Ninguno de los artículos de este pedido cuenta con disponibilidad actualmente.
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-line">
              <button
                type="button"
                onClick={() => setModalVolverComprarOpen(false)}
                className="w-full sm:w-auto rounded-xl border border-slate-300 dark:border-line px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface transition-colors cursor-pointer"
              >
                Cerrar
              </button>

              {volverComprarData.itemsParaCarrito && volverComprarData.itemsParaCarrito.length > 0 && (
                isStaff ? (
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold px-2">
                    Compras deshabilitadas para personal
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleConfirmarAgregarAlCarrito(false)}
                      className="w-full sm:w-auto rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Agregar al carrito
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmarAgregarAlCarrito(true)}
                      className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <ShoppingCart size={14} />
                      <span>Agregar e ir al Carrito</span>
                    </button>
                  </>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
