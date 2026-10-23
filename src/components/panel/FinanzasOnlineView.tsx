"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  X,
  CreditCard,
  Building2,
  Banknote,
  RotateCcw,
  Lock,
  Unlock,
  History,
  FileText,
  User,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  Calendar,
  CalendarDays,
  Printer,
  Receipt,
  Download,
} from "lucide-react";
import {
  ResumenFinanciero,
  OperacionFinanciera,
  CierreCajaOnline,
  CierreDiarioResumen,
  OperacionCierreDiario,
  ReintegroCierreDiario,
  getHoyArgentinaKey,
  formatFechaArgentinaTexto,
  formatHoraArgentina,
} from "@/lib/finanzas";
import {
  getResumenFinancieroAction,
  getOperacionesFinancierasAction,
  getCajaOnlineActualAction,
  getHistorialCierresCajaOnlineAction,
  registrarReintegroPedidoAction,
  getCierresDiariosAction,
  getDetalleCierreDiarioAction,
} from "@/actions/finanzas";

interface FinanzasOnlineViewProps {
  user: {
    id: number;
    nombreCompleto?: string;
    rol?: string;
  };
  role: "admin" | "venta" | "stock";
  showFeedback: (type: "success" | "error", msg: string) => void;
}

export function FinanzasOnlineView({
  user,
  role,
  showFeedback,
}: FinanzasOnlineViewProps) {
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState<ResumenFinanciero | null>(null);
  const [operaciones, setOperaciones] = useState<OperacionFinanciera[]>([]);
  const [cajaActual, setCajaActual] = useState<{
    estado: string;
    totalEfectivoRecaudado?: number;
    totalTransferenciasRecaudado?: number;
    totalCobradoOnline?: number;
    totalEfectivoHoy?: number;
    totalTransferenciasHoy?: number;
    totalCobradoHoy?: number;
    pedidosCobradosCount?: number;
    apertura?: any;
    ultimoCierre?: CierreCajaOnline | null;
  } | null>(null);

  // Pestaña principal de la vista
  const [seccionTab, setSeccionTab] = useState<"OPERACIONES" | "CIERRES_DIARIOS">("OPERACIONES");

  // Cierres Diarios Automáticos
  const [cierresDiarios, setCierresDiarios] = useState<CierreDiarioResumen[]>([]);
  const [cierreActualHoy, setCierreActualHoy] = useState<CierreDiarioResumen | null>(null);
  const [cierreSeleccionado, setCierreSeleccionado] = useState<CierreDiarioResumen | null>(null);
  const [modalDetalleCierre, setModalDetalleCierre] = useState(false);

  // Filtros de Cierres Diarios
  const [filtroCierreEstado, setFiltroCierreEstado] = useState<"TODOS" | "EN_CURSO" | "CERRADA">("TODOS");
  const [filtroCierreDesde, setFiltroCierreDesde] = useState<string>("");
  const [filtroCierreHasta, setFiltroCierreHasta] = useState<string>("");
  const [busquedaCierre, setBusquedaCierre] = useState<string>("");

  // Filtros de Operaciones
  const [metodoTab, setMetodoTab] = useState<
    "TODOS" | "TRANSFERENCIA" | "EFECTIVO_LOCAL" | "TARJETA" | "REINTEGROS"
  >("TODOS");
  const [filtroPeriodo, setFiltroPeriodo] = useState<
    "TODOS" | "HOY" | "ULTIMOS_7_DIAS" | "ESTE_MES"
  >("TODOS");
  const [filtroEstadoPago, setFiltroEstadoPago] = useState<
    "TODOS" | "PAGADO" | "PENDIENTE" | "RECHAZADO"
  >("TODOS");
  const [busqueda, setBusqueda] = useState("");

  // Modales
  const [selectedOperacion, setSelectedOperacion] =
    useState<OperacionFinanciera | null>(null);
  const [modalHistorialCierres, setModalHistorialCierres] = useState(false);
  const [historialCierres, setHistorialCierres] = useState<CierreCajaOnline[]>(
    []
  );
  const [modalReintegro, setModalReintegro] =
    useState<OperacionFinanciera | null>(null);

  const [savingAction, setSavingAction] = useState(false);

  // Form reintegro
  const [reintegroMontoInput, setReintegroMontoInput] = useState<string>("");
  const [reintegroMetodoInput, setReintegroMetodoInput] = useState<
    "TRANSFERENCIA" | "EFECTIVO_MOSTRADOR"
  >("TRANSFERENCIA");
  const [reintegroRefInput, setReintegroRefInput] = useState<string>("");
  const [reintegroMotivoInput, setReintegroMotivoInput] = useState<string>("");

  // Carga inicial y refresco
  const loadData = async () => {
    setLoading(true);
    try {
      const [resResumen, resOps, resCaja, resCierres] = await Promise.all([
        getResumenFinancieroAction(),
        getOperacionesFinancierasAction(),
        getCajaOnlineActualAction(),
        getCierresDiariosAction(),
      ]);

      if (resResumen.success && resResumen.resumen) {
        setResumen(resResumen.resumen);
      }
      if (resOps.success && resOps.operaciones) {
        setOperaciones(resOps.operaciones);
      }
      if (resCaja.success && resCaja.caja) {
        setCajaActual(resCaja.caja);
      }
      if (resCierres.success && resCierres.cierres) {
        setCierresDiarios(resCierres.cierres);
        if (resCierres.cierreActual) {
          setCierreActualHoy(resCierres.cierreActual);
        }
      }
    } catch (err) {
      console.error("Error al cargar finanzas online:", err);
      showFeedback("error", "Error al cargar la información financiera.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtrado de operaciones en memoria
  const operacionesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const now = new Date();
    const hoyInicio = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const ultimos7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const esteMes = new Date(now.getFullYear(), now.getMonth(), 1);

    return operaciones.filter((op) => {
      // Pestaña método
      if (metodoTab === "REINTEGROS") {
        if (!op.reintegro || !op.reintegro.requiereReintegro) return false;
      } else if (metodoTab !== "TODOS") {
        if (op.metodoPago !== metodoTab) return false;
      }

      // Período
      const f = op.fechaPago ? new Date(op.fechaPago) : new Date(op.fechaCreacion);
      if (filtroPeriodo === "HOY" && f < hoyInicio) return false;
      if (filtroPeriodo === "ULTIMOS_7_DIAS" && f < ultimos7) return false;
      if (filtroPeriodo === "ESTE_MES" && f < esteMes) return false;

      // Estado de pago
      if (filtroEstadoPago !== "TODOS" && op.estadoPago !== filtroEstadoPago) {
        return false;
      }

      // Búsqueda
      if (q) {
        const matchesNum = String(op.numero).includes(q);
        const matchesNom = op.cliente.nombre.toLowerCase().includes(q);
        const matchesDni = op.cliente.dni.toLowerCase().includes(q);
        if (!matchesNum && !matchesNom && !matchesDni) return false;
      }

      return true;
    });
  }, [operaciones, metodoTab, filtroPeriodo, filtroEstadoPago, busqueda]);

  // Filtrado de Cierres Diarios
  const cierresFiltrados = useMemo(() => {
    return cierresDiarios.filter((c) => {
      if (filtroCierreEstado !== "TODOS" && c.estado !== filtroCierreEstado) {
        return false;
      }
      if (filtroCierreDesde && c.fechaKey < filtroCierreDesde) {
        return false;
      }
      if (filtroCierreHasta && c.fechaKey > filtroCierreHasta) {
        return false;
      }
      if (busquedaCierre.trim()) {
        const q = busquedaCierre.trim().toLowerCase();
        const matchFecha =
          c.fechaKey.includes(q) ||
          c.fechaFormateada.includes(q) ||
          c.fechaTexto.toLowerCase().includes(q);
        const matchOp = c.operaciones.some(
          (op) =>
            String(op.pedidoNumero).includes(q) ||
            op.clienteNombre.toLowerCase().includes(q) ||
            op.metodoPago.toLowerCase().includes(q)
        );
        if (!matchFecha && !matchOp) return false;
      }
      return true;
    });
  }, [cierresDiarios, filtroCierreEstado, filtroCierreDesde, filtroCierreHasta, busquedaCierre]);

  // Acciones de Cierres Diarios
  const handleVerDetalleCierre = async (fechaKey: string) => {
    try {
      const res = await getDetalleCierreDiarioAction(fechaKey);
      if (res.success && res.cierre) {
        setCierreSeleccionado(res.cierre);
        setModalDetalleCierre(true);
      } else {
        showFeedback("error", res.error || "No se pudo cargar el detalle del cierre.");
      }
    } catch (err) {
      console.error("Error al obtener detalle de cierre:", err);
      showFeedback("error", "Error al cargar detalle del cierre.");
    }
  };

  const handleImprimirCierre = (cierre: CierreDiarioResumen) => {
    setCierreSeleccionado(cierre);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Ver historial de cierres anteriores (auditoría histórica preservada)
  const handleOpenHistorialCierres = async () => {
    try {
      const res = await getHistorialCierresCajaOnlineAction();
      if (res.success && res.cierres) {
        setHistorialCierres(res.cierres);
        setModalHistorialCierres(true);
      } else {
        showFeedback("error", res.error || "No se pudo cargar el historial.");
      }
    } catch {
      showFeedback("error", "Error al cargar historial de cierres.");
    }
  };

  // Apertura y confirmación de Reintegro comercial
  const handleOpenModalReintegro = (op: OperacionFinanciera) => {
    setModalReintegro(op);
    setReintegroMontoInput(String(op.total));
    setReintegroMetodoInput("TRANSFERENCIA");
    setReintegroRefInput("");
    setReintegroMotivoInput(
      op.reintegro?.motivo
        ? `Devolución por cancelación: ${op.reintegro.motivo}`
        : op.notas
        ? `Devolución: ${op.notas}`
        : "Devolución comercial de pedido cancelado"
    );
  };

  const handleConfirmarReintegro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalReintegro) return;
    const monto = parseFloat(reintegroMontoInput);
    if (isNaN(monto) || monto <= 0 || monto > modalReintegro.total) {
      showFeedback(
        "error",
        `Monto inválido. Debe ser entre $1 y $${modalReintegro.total.toLocaleString("es-AR")}`
      );
      return;
    }
    if (!reintegroRefInput.trim()) {
      showFeedback("error", "Ingresá el comprobante o referencia bancaria/recibo.");
      return;
    }
    setSavingAction(true);
    try {
      const res = await registrarReintegroPedidoAction({
        pedidoId: modalReintegro.id,
        monto,
        metodoReintegro: reintegroMetodoInput,
        comprobanteOReferencia: reintegroRefInput.trim(),
        motivo: reintegroMotivoInput.trim() || "Devolución comercial",
      });
      if (res.success) {
        showFeedback(
          "success",
          `Reintegro asentado correctamente para pedido #ORD-${modalReintegro.numero}`
        );
        setModalReintegro(null);
        if (selectedOperacion?.id === modalReintegro.id) {
          setSelectedOperacion(null);
        }
        await loadData();
      } else {
        showFeedback("error", res.error || "No se pudo asentar el reintegro.");
      }
    } catch (err) {
      console.error(err);
      showFeedback("error", "Error al registrar reintegro.");
    } finally {
      setSavingAction(false);
    }
  };

  return (
    <section className="space-y-6 w-full">
      {/* ─── ENCABEZADO DE VISTA ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Finanzas Online
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
              E-Commerce
            </span>
          </div>
          <p className="text-xs sm:text-[13px] text-slate-500 dark:text-[#9a9ba3] mt-0.5">
            Control de cobros reales de la tienda web, balance de caja y reintegros independientes del SGI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenHistorialCierres}
            className="px-3 py-1.5 text-xs bg-white dark:bg-[#16171c] border border-slate-200 dark:border-[#35363d] rounded-lg text-slate-700 dark:text-[#d7d8dd] hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors font-medium shadow-xs"
          >
            <History className="w-3.5 h-3.5 text-slate-400 dark:text-[#9a9ba3]" />
            <span>Cierres anteriores</span>
          </button>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3 py-1.5 text-xs bg-white dark:bg-[#16171c] border border-slate-200 dark:border-[#35363d] rounded-lg text-slate-700 dark:text-[#d7d8dd] hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors font-medium shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* ─── PESTAÑAS PRINCIPALES DE FINANZAS ONLINE ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-[#26272e] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSeccionTab("OPERACIONES")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              seccionTab === "OPERACIONES"
                ? "bg-slate-900 text-white dark:bg-white dark:text-black shadow-xs"
                : "text-slate-600 dark:text-[#9a9ba3] hover:bg-slate-100 dark:hover:bg-[#1a1b20]"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Resumen & Operaciones</span>
          </button>

          <button
            type="button"
            onClick={() => setSeccionTab("CIERRES_DIARIOS")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              seccionTab === "CIERRES_DIARIOS"
                ? "bg-slate-900 text-white dark:bg-white dark:text-black shadow-xs"
                : "text-slate-600 dark:text-[#9a9ba3] hover:bg-slate-100 dark:hover:bg-[#1a1b20]"
            }`}
          >
            <CalendarDays className="w-4 h-4 text-emerald-500" />
            <span>Cierres Diarios Contables</span>
            {cierreActualHoy && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400">
                Hoy: ${(cierreActualHoy.totalNeto || 0).toLocaleString("es-AR")}
              </span>
            )}
          </button>
        </div>

        {cierreActualHoy && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleVerDetalleCierre(cierreActualHoy.fechaKey)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-[#d7d8dd] bg-slate-100 dark:bg-[#1f2026] hover:bg-slate-200 dark:hover:bg-[#2b2c34] rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Cierre de hoy</span>
            </button>
            <button
              type="button"
              onClick={() => handleImprimirCierre(cierreActualHoy)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-[#d7d8dd] bg-slate-100 dark:bg-[#1f2026] hover:bg-slate-200 dark:hover:bg-[#2b2c34] rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Imprimir hoy</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── VISTA: RESUMEN Y OPERACIONES EN VIVO ─── */}
      {seccionTab === "OPERACIONES" && (
        <>
      {/* ─── BANNER DE CAJA ONLINE INDEPENDIENTE ─── */}
      {/* ─── BANNER DE CAJA ONLINE 24/7 PERMANENTE ─── */}
      <div className="bg-white dark:bg-[#16171c] border border-slate-200 dark:border-[#26272e] rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-xl border flex-shrink-0 bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
              <Building2 className="w-6 h-6" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Caja Online del E-Commerce
                </span>
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                  OPERATIVA 24/7
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#9a9ba3] mt-1">
                La tienda web opera las 24 hs de forma continua. Todos los cobros y pedidos se registran en tiempo real sin requerir apertura ni cierre manual de caja.
              </p>
            </div>
          </div>

          {/* Métricas del día en vivo */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-slate-50 dark:bg-[#0f1012] border border-slate-200 dark:border-[#26272e] rounded-lg px-3 py-1.5 text-right">
              <span className="text-[10px] text-slate-500 dark:text-[#8e8f96] uppercase font-semibold block">
                Cobrado Hoy
              </span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                ${(cajaActual?.totalCobradoHoy || 0).toLocaleString("es-AR")}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-[#0f1012] border border-slate-200 dark:border-[#26272e] rounded-lg px-3 py-1.5 text-right">
              <span className="text-[10px] text-slate-500 dark:text-[#8e8f96] uppercase font-semibold block">
                Efectivo Hoy
              </span>
              <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 font-mono">
                ${(cajaActual?.totalEfectivoHoy || 0).toLocaleString("es-AR")}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-[#0f1012] border border-slate-200 dark:border-[#26272e] rounded-lg px-3 py-1.5 text-right">
              <span className="text-[10px] text-slate-500 dark:text-[#8e8f96] uppercase font-semibold block">
                Transf. Hoy
              </span>
              <span className="text-sm font-bold text-sky-600 dark:text-sky-400 font-mono">
                ${(cajaActual?.totalTransferenciasHoy || 0).toLocaleString("es-AR")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── INDICADORES CALCULADOS (KPI CARDS) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Cobrado Efectivo */}
        <div className="bg-white dark:bg-[#16171c] border border-slate-200 dark:border-[#26272e] rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-[#8e8f96] uppercase tracking-wider">
              Efectivamente Cobrado
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              ${(resumen?.totalCobrado || 0).toLocaleString("es-AR")}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#9a9ba3] mt-1 flex flex-wrap gap-x-2">
              <span>
                Transf:{" "}
                <strong className="text-slate-700 dark:text-zinc-200">
                  ${(resumen?.ingresosPorTransferencia || 0).toLocaleString("es-AR")}
                </strong>
              </span>
              <span>&bull;</span>
              <span>
                Efect:{" "}
                <strong className="text-slate-700 dark:text-zinc-200">
                  ${(resumen?.ingresosPorEfectivo || 0).toLocaleString("es-AR")}
                </strong>
              </span>
            </p>
          </div>
        </div>

        {/* Card 2: Ventas Online Registradas */}
        <div className="bg-white dark:bg-[#16171c] border border-slate-200 dark:border-[#26272e] rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-[#8e8f96] uppercase tracking-wider">
              Ventas Online Activas
            </span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              ${(resumen?.totalVentasOnline || 0).toLocaleString("es-AR")}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#9a9ba3] mt-1">
              {resumen?.totalOperaciones || 0} operaciones registradas en tienda.
            </p>
          </div>
        </div>

        {/* Card 3: Pagos Pendientes */}
        <div className="bg-white dark:bg-[#16171c] border border-slate-200 dark:border-[#26272e] rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-[#8e8f96] uppercase tracking-wider">
              Pagos Pendientes
            </span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
              ${(resumen?.totalPendiente || 0).toLocaleString("es-AR")}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#9a9ba3] mt-1">
              Por verificar o pendientes de cobro al retirar.
            </p>
          </div>
        </div>

        {/* Card 4: Reintegros Pendientes */}
        <div className="bg-white dark:bg-[#16171c] border border-slate-200 dark:border-[#26272e] rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-[#8e8f96] uppercase tracking-wider">
              Reintegros Pendientes
            </span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
              ${(resumen?.montoReintegrosPendientes || 0).toLocaleString("es-AR")}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#9a9ba3] mt-1">
              {resumen?.reintegrosPendientesCount || 0} pedidos cancelados que estaban cobrados.
            </p>
          </div>
        </div>
      </div>

      {/* ─── BARRA DE FILTROS Y PESTAÑAS ─── */}
      <div className="bg-white dark:bg-[#16171c] border border-slate-200 dark:border-[#26272e] rounded-xl p-4 space-y-3.5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Pestañas de Métodos */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setMetodoTab("TODOS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                metodoTab === "TODOS"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-black shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-[#1a1b20] dark:text-[#9a9ba3] dark:hover:text-white"
              }`}
            >
              Todos los cobros ({operaciones.length})
            </button>
            <button
              onClick={() => setMetodoTab("TRANSFERENCIA")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                metodoTab === "TRANSFERENCIA"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-[#1a1b20] dark:text-[#9a9ba3] dark:hover:text-white"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Transferencia</span>
            </button>
            <button
              onClick={() => setMetodoTab("EFECTIVO_LOCAL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                metodoTab === "EFECTIVO_LOCAL"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-[#1a1b20] dark:text-[#9a9ba3] dark:hover:text-white"
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Efectivo</span>
            </button>
            <button
              onClick={() => setMetodoTab("REINTEGROS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                metodoTab === "REINTEGROS"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-[#1a1b20] dark:text-[#9a9ba3] dark:hover:text-white"
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reintegros</span>
              {(resumen?.reintegrosPendientesCount || 0) > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              )}
            </button>
          </div>

          {/* Búsqueda */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#6b6c75]" />
            <input
              type="text"
              placeholder="Buscar por N° pedido o cliente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0f1012] border border-slate-200 dark:border-[#35363d] rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-red-600 placeholder:text-slate-400 dark:placeholder:text-[#6b6c75]"
            />
          </div>
        </div>

        {/* Sub-filtros por período y estado */}
        <div className="pt-2 border-t border-slate-100 dark:border-[#26272e] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 dark:text-[#6b6c75] font-semibold text-[11px] uppercase">
              Período:
            </span>
            {(["TODOS", "HOY", "ULTIMOS_7_DIAS", "ESTE_MES"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setFiltroPeriodo(p)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  filtroPeriodo === p
                    ? "bg-slate-200 text-slate-900 dark:bg-[#26272e] dark:text-white font-bold"
                    : "text-slate-500 hover:text-slate-800 dark:text-[#8e8f96] dark:hover:text-white"
                }`}
              >
                {p === "TODOS"
                  ? "Todos"
                  : p === "HOY"
                  ? "Hoy"
                  : p === "ULTIMOS_7_DIAS"
                  ? "Últimos 7 días"
                  : "Este mes"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 dark:text-[#6b6c75] font-semibold text-[11px] uppercase">
              Estado Pago:
            </span>
            {(["TODOS", "PAGADO", "PENDIENTE", "RECHAZADO"] as const).map((ep) => (
              <button
                key={ep}
                onClick={() => setFiltroEstadoPago(ep)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  filtroEstadoPago === ep
                    ? "bg-slate-200 text-slate-900 dark:bg-[#26272e] dark:text-white font-bold"
                    : "text-slate-500 hover:text-slate-800 dark:text-[#8e8f96] dark:hover:text-white"
                }`}
              >
                {ep === "TODOS"
                  ? "Todos"
                  : ep === "PAGADO"
                  ? "Pagados"
                  : ep === "PENDIENTE"
                  ? "Pendientes"
                  : "Rechazados"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── TABLA DE OPERACIONES FINANCIERAS ─── */}
      <div className="bg-white dark:bg-[#16171c] border border-slate-200 dark:border-[#26272e] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#121316] border-b border-slate-200 dark:border-[#26272e] text-slate-500 dark:text-[#8e8f96] font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Pedido</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Método</th>
                <th className="py-3 px-4 text-right">Importe</th>
                <th className="py-3 px-4 text-center">Estado Pago</th>
                <th className="py-3 px-4 text-center">Estado Pedido</th>
                <th className="py-3 px-4">Confirmado Por</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#202127]">
              {operacionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400 dark:text-[#6b6c75]">
                    No se encontraron operaciones financieras para los filtros aplicados.
                  </td>
                </tr>
              ) : (
                operacionesFiltradas.map((op) => {
                  const isPagado = op.estadoPago === "PAGADO";
                  const isPendiente = op.estadoPago === "PENDIENTE";
                  const isCancelado = op.estadoPedido === "CANCELADO";

                  return (
                    <tr
                      key={op.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-[#1a1b20] transition-colors"
                    >
                      {/* Fecha */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-[#9a9ba3]">
                        <div>
                          {new Date(op.fechaPago || op.fechaCreacion).toLocaleDateString("es-AR")}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-[#6b6c75]">
                          {new Date(op.fechaPago || op.fechaCreacion).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Pedido */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-white">
                          #ORD-{op.numero}
                        </span>
                      </td>

                      {/* Cliente */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 dark:text-zinc-200">
                          {op.cliente.nombre}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-[#6b6c75]">
                          DNI {op.cliente.dni}
                        </div>
                      </td>

                      {/* Método */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {op.metodoPago === "TRANSFERENCIA" ? (
                          <span className="inline-flex items-center gap-1.5 text-sky-700 bg-sky-50 dark:bg-sky-500/10 dark:text-sky-400 px-2 py-0.5 rounded-md font-medium text-[11px]">
                            <Building2 className="w-3 h-3" />
                            Transferencia
                          </span>
                        ) : op.metodoPago === "EFECTIVO_LOCAL" ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-0.5 rounded-md font-medium text-[11px]">
                            <Banknote className="w-3 h-3" />
                            Efectivo mostrador
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-purple-700 bg-purple-50 dark:bg-purple-500/10 dark:text-purple-400 px-2 py-0.5 rounded-md font-medium text-[11px]">
                            <CreditCard className="w-3 h-3" />
                            Tarjeta
                          </span>
                        )}
                      </td>

                      {/* Importe */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="font-bold font-mono text-slate-900 dark:text-white">
                          ${op.total.toLocaleString("es-AR")}
                        </div>
                        {op.costoEnvio > 0 && (
                          <div className="text-[10px] text-slate-400 dark:text-[#6b6c75]">
                            Envío: ${op.costoEnvio.toLocaleString("es-AR")}
                          </div>
                        )}
                      </td>

                      {/* Estado Pago */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isPagado ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                            PAGADO
                          </span>
                        ) : isPendiente ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30">
                            PENDIENTE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30">
                            RECHAZADO
                          </span>
                        )}

                        {/* Badge de Reintegro si corresponde */}
                        {op.reintegro?.requiereReintegro && (
                          <div className="mt-1">
                            {op.reintegro.reintegrado ? (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-400">
                                REINTEGRADO
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400 animate-pulse">
                                DEV. PENDIENTE
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Estado Pedido */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            op.estadoPedido === "ENTREGADO"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : op.estadoPedido === "CANCELADO"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
                              : "bg-slate-100 text-slate-700 dark:bg-[#1f2026] dark:text-[#9a9ba3]"
                          }`}
                        >
                          {op.estadoPedido}
                        </span>
                      </td>

                      {/* Confirmado Por */}
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-[#9a9ba3]">
                        {op.confirmadoPor ? (
                          <span className="font-medium text-slate-800 dark:text-zinc-300">
                            {op.confirmadoPor}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-[#6b6c75] italic">
                            Sin registro
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedOperacion(op)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#1f2026] dark:hover:bg-[#2a2c35] dark:text-[#e7e7ea] transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                          <span>Detalle</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* ─── VISTA: CIERRES DIARIOS CONTABLES ─── */}
      {seccionTab === "CIERRES_DIARIOS" && (
        <div className="space-y-6">
          {/* Banner de Jornada Diaria Contable */}
          <div className="bg-white dark:bg-[#16171c] border border-slate-200 dark:border-[#26272e] rounded-xl p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-3 rounded-xl border flex-shrink-0 bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      Cierres Contables Diarios Automáticos
                    </span>
                    <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-300 dark:border-blue-500/30">
                      ZONA HORARIA ARGENTINA (UTC-3)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#9a9ba3] mt-1">
                    Cada jornada abarca de 00:00:00 a 23:59:59 hs. Los ingresos se computan estrictamente por la fecha en que se confirmó efectivamente el cobro (fechaPago) y los reintegros en su fecha de asentamiento. La tienda opera 24/7 sin bloqueos de ventas ni duplicación de registros.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cards Resumen de Cierres Diarios */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Jornada de Hoy */}
            <div className="bg-white dark:bg-[#16171c] border border-slate-200 dark:border-[#26272e] rounded-xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-[#8e8f96] uppercase tracking-wider">
                  Jornada de Hoy
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  EN CURSO
                </span>
              </div>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                ${(cierreActualHoy?.totalNeto || 0).toLocaleString("es-AR")}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#9a9ba3]">
                {cierreActualHoy?.pedidosCobradosCount || 0} pedidos cobrados hoy ({cierreActualHoy?.fechaFormateada || "Hoy"}).
              </p>
              {cierreActualHoy && (
                <div className="pt-2 flex items-center gap-2 border-t border-slate-100 dark:border-[#26272e]">
                  <button
                    type="button"
                    onClick={() => handleVerDetalleCierre(cierreActualHoy.fechaKey)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver detalle</span>
                  </button>
                  <span className="text-slate-300 dark:text-[#35363d]">&bull;</span>
                  <button
                    type="button"
                    onClick={() => handleImprimirCierre(cierreActualHoy)}
                    className="text-xs text-slate-600 dark:text-[#9a9ba3] hover:text-slate-900 dark:hover:text-white font-semibold flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir</span>
                  </button>
                </div>
              )}
            </div>

            {/* Card 2: Total Neto Histórico */}
            <div className="bg-white dark:bg-[#16171c] border border-slate-200 dark:border-[#26272e] rounded-xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-[#8e8f96] uppercase tracking-wider">
                  Total Neto Histórico
                </span>
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                ${cierresDiarios.reduce((acc, c) => acc + c.totalNeto, 0).toLocaleString("es-AR")}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#9a9ba3]">
                Acumulado en todas las jornadas registradas en la tienda web.
              </p>
            </div>

            {/* Card 3: Jornadas Registradas */}
            <div className="bg-white dark:bg-[#16171c] border border-slate-200 dark:border-[#26272e] rounded-xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-[#8e8f96] uppercase tracking-wider">
                  Jornadas Registradas
                </span>
                <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                  <Calendar className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                {cierresDiarios.length}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#9a9ba3]">
                {cierresDiarios.filter((c) => c.estado === "CERRADA").length} jornadas cerradas y 1 en curso.
              </p>
            </div>
          </div>

          {/* Barra de Filtros de Cierres Diarios */}
          <div className="bg-white dark:bg-[#16171c] border border-slate-200 dark:border-[#26272e] rounded-xl p-4 space-y-3.5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Filtro de Estado */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-[#8e8f96] uppercase mr-1">
                  Estado:
                </span>
                {(["TODOS", "EN_CURSO", "CERRADA"] as const).map((est) => (
                  <button
                    key={est}
                    type="button"
                    onClick={() => setFiltroCierreEstado(est)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      filtroCierreEstado === est
                        ? "bg-slate-900 text-white dark:bg-white dark:text-black shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-[#1a1b20] dark:text-[#9a9ba3] dark:hover:text-white"
                    }`}
                  >
                    {est === "TODOS"
                      ? `Todas (${cierresDiarios.length})`
                      : est === "EN_CURSO"
                      ? "En curso"
                      : "Cerradas"}
                  </button>
                ))}
              </div>

              {/* Buscador de Cierres */}
              <div className="relative w-full lg:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#6b6c75]" />
                <input
                  type="text"
                  placeholder="Buscar por fecha, #ORD, cliente o método..."
                  value={busquedaCierre}
                  onChange={(e) => setBusquedaCierre(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0f1012] border border-slate-200 dark:border-[#35363d] rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-red-600 placeholder:text-slate-400 dark:placeholder:text-[#6b6c75]"
                />
              </div>
            </div>

            {/* Sub-filtro por Rango de Fechas */}
            <div className="pt-2 border-t border-slate-100 dark:border-[#26272e] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-slate-500 dark:text-[#6b6c75] font-semibold text-[11px] uppercase flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  Rango de Fechas:
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-slate-400">Desde:</label>
                  <input
                    type="date"
                    value={filtroCierreDesde}
                    onChange={(e) => setFiltroCierreDesde(e.target.value)}
                    className="bg-slate-50 dark:bg-[#0f1012] border border-slate-200 dark:border-[#35363d] rounded-md px-2 py-1 text-xs text-slate-800 dark:text-zinc-200"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-slate-400">Hasta:</label>
                  <input
                    type="date"
                    value={filtroCierreHasta}
                    onChange={(e) => setFiltroCierreHasta(e.target.value)}
                    className="bg-slate-50 dark:bg-[#0f1012] border border-slate-200 dark:border-[#35363d] rounded-md px-2 py-1 text-xs text-slate-800 dark:text-zinc-200"
                  />
                </div>
                {(filtroCierreDesde || filtroCierreHasta || busquedaCierre || filtroCierreEstado !== "TODOS") && (
                  <button
                    type="button"
                    onClick={() => {
                      setFiltroCierreDesde("");
                      setFiltroCierreHasta("");
                      setBusquedaCierre("");
                      setFiltroCierreEstado("TODOS");
                    }}
                    className="text-xs text-rose-600 hover:underline font-medium ml-2"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>

              <div className="text-[11px] text-slate-400">
                Mostrando {cierresFiltrados.length} de {cierresDiarios.length} jornadas
              </div>
            </div>
          </div>

          {/* Tabla de Cierres Diarios */}
          <div className="bg-white dark:bg-[#16171c] border border-slate-200 dark:border-[#26272e] rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#121316] border-b border-slate-200 dark:border-[#26272e] text-slate-500 dark:text-[#8e8f96] font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Fecha del Cierre</th>
                    <th className="py-3 px-4">Período Horario</th>
                    <th className="py-3 px-4 text-center">Pedidos Cobrados</th>
                    <th className="py-3 px-4 text-right">Total Bruto</th>
                    <th className="py-3 px-4 text-right">Devoluciones</th>
                    <th className="py-3 px-4 text-right">Total Neto</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#202127]">
                  {cierresFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-400 dark:text-[#6b6c75]">
                        No se encontraron cierres contables para los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    cierresFiltrados.map((c) => {
                      const isHoy = c.estado === "EN_CURSO";

                      return (
                        <tr
                          key={c.fechaKey}
                          className="hover:bg-slate-50/70 dark:hover:bg-[#1a1b20] transition-colors"
                        >
                          {/* Fecha */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {c.fechaFormateada}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-[#9a9ba3]">
                              {c.fechaTexto}
                            </div>
                          </td>

                          {/* Período Horario */}
                          <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-[#9a9ba3] font-mono text-[11px]">
                            {c.periodoInicio} hs &rarr; {c.periodoFin === "En curso" ? "En curso" : `${c.periodoFin} hs`}
                          </td>

                          {/* Cantidad de pedidos */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-[#202127] dark:text-zinc-200">
                              {c.pedidosCobradosCount} {c.pedidosCobradosCount === 1 ? "pedido" : "pedidos"}
                            </span>
                          </td>

                          {/* Total Bruto */}
                          <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-semibold text-slate-800 dark:text-zinc-200">
                            ${c.totalBruto.toLocaleString("es-AR")}
                          </td>

                          {/* Devoluciones */}
                          <td className="py-3 px-4 text-right whitespace-nowrap font-mono">
                            {c.totalDevoluciones > 0 ? (
                              <span className="text-rose-600 font-semibold">
                                -${c.totalDevoluciones.toLocaleString("es-AR")}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-[#6b6c75]">$0</span>
                            )}
                          </td>

                          {/* Total Neto */}
                          <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            ${c.totalNeto.toLocaleString("es-AR")}
                          </td>

                          {/* Estado */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {isHoy ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                                En curso
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-[#202127] dark:text-[#9a9ba3] border border-slate-200 dark:border-[#35363d]">
                                Cerrada
                              </span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleVerDetalleCierre(c.fechaKey)}
                                className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 rounded-lg transition-colors flex items-center gap-1"
                                title="Ver desglose y operaciones"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver detalle</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleImprimirCierre(c)}
                                className="p-1 text-slate-500 hover:text-slate-800 dark:text-[#9a9ba3] dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-[#202127] dark:hover:bg-[#2b2c34] rounded-lg transition-colors"
                                title="Imprimir cierre o exportar a PDF"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: DETALLE FINANCIERO DE OPERACIÓN ─── */}
      {selectedOperacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#16171c] border border-slate-200 dark:border-[#26272e] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl text-slate-800 dark:text-[#e7e7ea] space-y-5">
            {/* Cabecera */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#26272e] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    Detalle Financiero #ORD-{selectedOperacion.numero}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedOperacion.estadoPago === "PAGADO"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400"
                    }`}
                  >
                    {selectedOperacion.estadoPago}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-[#9a9ba3] mt-0.5">
                  Registrado el{" "}
                  {new Date(selectedOperacion.fechaCreacion).toLocaleString("es-AR")}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOperacion(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Datos del Cliente y Operación */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-[#0f1012] p-3 rounded-xl border border-slate-100 dark:border-[#26272e]">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Cliente
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedOperacion.cliente.nombre}
                </span>
                <span className="text-slate-500 dark:text-[#9a9ba3] block">
                  DNI: {selectedOperacion.cliente.dni}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Modalidad de Entrega
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedOperacion.modalidadEntrega === "MOTOMANDADO"
                    ? "🛵 Motomandado / Uber"
                    : "🏪 Retiro en mostrador"}
                </span>
              </div>
            </div>

            {/* Desglose de Productos */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8e8f96] mb-2">
                Repuestos de la orden
              </h4>
              <div className="border border-slate-200 dark:border-[#26272e] rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-[#202127] text-xs">
                {selectedOperacion.items.map((it, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {it.nombre}
                      </span>
                      <span className="text-slate-500 dark:text-[#9a9ba3] block text-[11px]">
                        {it.cantidad} unidad(es) &times; ${it.precioUnitario.toLocaleString("es-AR")}
                      </span>
                    </div>
                    <div className="font-bold font-mono text-slate-900 dark:text-white">
                      ${it.subtotal.toLocaleString("es-AR")}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total final */}
              <div className="mt-2 text-right space-y-0.5 text-xs">
                {selectedOperacion.costoEnvio > 0 && (
                  <div className="text-slate-500 dark:text-[#9a9ba3]">
                    Costo de envío:{" "}
                    <span className="font-mono">
                      ${selectedOperacion.costoEnvio.toLocaleString("es-AR")}
                    </span>
                  </div>
                )}
                <div className="text-base font-bold text-slate-900 dark:text-white">
                  Total Final:{" "}
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                    ${selectedOperacion.total.toLocaleString("es-AR")}
                  </span>
                </div>
              </div>
            </div>

            {/* Datos de Comprobante / Cobro */}
            <div className="border-t border-slate-100 dark:border-[#26272e] pt-3 text-xs space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white">
                Evidencia de Cobro / Transacción
              </h4>

              {selectedOperacion.confirmadoPor && (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-[#9a9ba3]">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Operación confirmada por:{" "}
                    <strong className="text-slate-800 dark:text-zinc-200">
                      {selectedOperacion.confirmadoPor}
                    </strong>
                  </span>
                </div>
              )}

              {selectedOperacion.comprobanteUrl ? (
                <div className="p-3 bg-slate-50 dark:bg-[#0f1012] border border-slate-200 dark:border-[#26272e] rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-500" />
                    <span className="font-medium text-xs">Comprobante de Transferencia adjunto</span>
                  </div>
                  <a
                    href={selectedOperacion.comprobanteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 text-xs bg-white dark:bg-[#1a1b20] border border-slate-300 dark:border-[#35363d] rounded-lg font-semibold hover:border-red-600 flex items-center gap-1 text-red-600 dark:text-red-400 transition-colors"
                  >
                    <span>Ver archivo</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : selectedOperacion.metodoPago === "TRANSFERENCIA" ? (
                <div className="p-2.5 text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 rounded-lg text-xs">
                  Sin comprobante de transferencia cargado.
                </div>
              ) : null}
            </div>

            {/* Sección de Reintegro si corresponde */}
            {selectedOperacion.reintegro?.requiereReintegro && (
              <div className="border-t border-slate-100 dark:border-[#26272e] pt-3 text-xs space-y-2">
                <h4 className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Control de Reintegro Comercial</span>
                </h4>

                {selectedOperacion.reintegro.reintegrado ? (
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30 text-purple-900 dark:text-purple-300 space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-purple-600" />
                      Reintegro asentado por $
                      {(selectedOperacion.reintegro.monto || selectedOperacion.total).toLocaleString(
                        "es-AR"
                      )}
                    </div>
                    {selectedOperacion.reintegro.metodoReintegro && (
                      <p className="text-[11px]">
                        Método: {selectedOperacion.reintegro.metodoReintegro} &bull; Ref:{" "}
                        {selectedOperacion.reintegro.comprobanteOReferencia}
                      </p>
                    )}
                    {selectedOperacion.reintegro.responsable && (
                      <p className="text-[11px]">
                        Responsable: {selectedOperacion.reintegro.responsable}
                      </p>
                    )}
                    {selectedOperacion.reintegro.motivo && (
                      <p className="text-[11px] italic">
                        Motivo: "{selectedOperacion.reintegro.motivo}"
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 text-rose-900 dark:text-rose-300 space-y-2">
                    <p className="text-xs">
                      Este pedido fue <strong>cancelado</strong> habiendo registrado cobro previo
                      de <strong>${selectedOperacion.total.toLocaleString("es-AR")}</strong>. El
                      dinero permanece pendiente de devolución al cliente.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenModalReintegro(selectedOperacion)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Registrar Reintegro Comercial</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}



      {/* ─── MODAL: REGISTRAR REINTEGRO COMERCIAL ─── */}
      {modalReintegro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <form
            onSubmit={handleConfirmarReintegro}
            className="bg-white dark:bg-[#16171c] border border-slate-200 dark:border-[#26272e] rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-800 dark:text-[#e7e7ea] space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#26272e] pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Registrar Reintegro #ORD-{modalReintegro.numero}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalReintegro(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Monto a Reintegrar ($)</label>
                <input
                  type="number"
                  min="1"
                  max={modalReintegro.total}
                  step="any"
                  required
                  value={reintegroMontoInput}
                  onChange={(e) => setReintegroMontoInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0f1012] border border-slate-200 dark:border-[#35363d] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:border-rose-600 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 dark:text-[#6b6c75] mt-0.5 block">
                  Total cobrado en el pedido: ${modalReintegro.total.toLocaleString("es-AR")}
                </span>
              </div>

              <div>
                <label className="block font-semibold mb-1">Método de Devolución</label>
                <select
                  value={reintegroMetodoInput}
                  onChange={(e) =>
                    setReintegroMetodoInput(
                      e.target.value as "TRANSFERENCIA" | "EFECTIVO_MOSTRADOR"
                    )
                  }
                  className="w-full bg-slate-50 dark:bg-[#0f1012] border border-slate-200 dark:border-[#35363d] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-rose-600 focus:outline-none"
                >
                  <option value="TRANSFERENCIA">Transferencia Bancaria / CBU / Alias</option>
                  <option value="EFECTIVO_MOSTRADOR">Efectivo en Mostrador</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  N° de Comprobante / Referencia Bancaria
                </label>
                <input
                  type="text"
                  required
                  value={reintegroRefInput}
                  onChange={(e) => setReintegroRefInput(e.target.value)}
                  placeholder="Ej: Transf. N° 9948271 o Recibo N° 0012"
                  className="w-full bg-slate-50 dark:bg-[#0f1012] border border-slate-200 dark:border-[#35363d] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-rose-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Motivo Comercial</label>
                <textarea
                  rows={2}
                  required
                  value={reintegroMotivoInput}
                  onChange={(e) => setReintegroMotivoInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0f1012] border border-slate-200 dark:border-[#35363d] rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:border-rose-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-[#26272e]">
              <button
                type="button"
                onClick={() => setModalReintegro(null)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-[#9a9ba3] hover:text-slate-900 dark:hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingAction}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                {savingAction ? "Asentando..." : "Asentar Reintegro"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── MODAL: HISTORIAL DE CIERRES ANTERIORES ─── */}
      {modalHistorialCierres && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#16171c] border border-slate-200 dark:border-[#26272e] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl text-slate-800 dark:text-[#e7e7ea] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#26272e] pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-slate-700 dark:text-white" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Historial de Cierres de Caja Online
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalHistorialCierres(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {historialCierres.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 dark:text-[#6b6c75]">
                No hay cierres de caja registrados todavía.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-[#26272e] text-xs space-y-3">
                {historialCierres.map((c) => (
                  <div key={c.id} className="pt-3 first:pt-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">
                        Cierre del {new Date(c.fechaCierre).toLocaleDateString("es-AR")}{" "}
                        {new Date(c.fechaCierre).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                          c.diferenciaEfectivo === 0
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400"
                            : c.diferenciaEfectivo > 0
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400"
                        }`}
                      >
                        {c.diferenciaEfectivo === 0
                          ? "Caja Exacta"
                          : c.diferenciaEfectivo > 0
                          ? `+${c.diferenciaEfectivo.toLocaleString("es-AR")}`
                          : `-${Math.abs(c.diferenciaEfectivo).toLocaleString("es-AR")}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-[#0f1012] p-2 rounded-lg text-[11px]">
                      <div>
                        <span className="text-slate-400 block">Saldo Inicial</span>
                        <span className="font-mono font-semibold">
                          ${c.saldoInicialEfectivo.toLocaleString("es-AR")}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Efectivo Recaudado</span>
                        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          ${c.totalEfectivoRecaudado.toLocaleString("es-AR")}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Efectivo Real</span>
                        <span className="font-mono font-semibold">
                          ${c.totalEfectivoReal.toLocaleString("es-AR")}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Transferencias</span>
                        <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">
                          ${c.totalTransferenciasRecaudado.toLocaleString("es-AR")}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-[#9a9ba3]">
                      Cerrado por: <strong>{c.cerradoPor}</strong> &bull; Observaciones:{" "}
                      <em>"{c.observaciones}"</em>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL: DETALLE DE CIERRE DIARIO CONTABLE ─── */}
      {modalDetalleCierre && cierreSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#16171c] border border-slate-200 dark:border-[#26272e] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl text-slate-800 dark:text-[#e7e7ea] space-y-6">
            {/* Header del Modal */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-[#26272e] pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    Cierre Diario Contable — Chopper Repuestos
                  </h3>
                  {cierreSeleccionado.estado === "EN_CURSO" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                      EN CURSO
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-[#26272e] dark:text-[#9a9ba3]">
                      JORNADA CERRADA
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-[#9a9ba3] mt-1">
                  <strong>{cierreSeleccionado.fechaTexto}</strong> ({cierreSeleccionado.fechaFormateada}) &bull; Período: {cierreSeleccionado.periodoInicio} hs a {cierreSeleccionado.periodoFin === "En curso" ? "En curso (registro en vivo)" : `${cierreSeleccionado.periodoFin} hs`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleImprimirCierre(cierreSeleccionado)}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-black rounded-lg hover:opacity-90 flex items-center gap-1.5 shadow-xs transition-opacity"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir cierre</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalDetalleCierre(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tarjetas de Resumen Financiero de la Jornada */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-slate-50 dark:bg-[#0f1012] border border-slate-200 dark:border-[#26272e] rounded-xl p-3">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Bruto</span>
                <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
                  ${cierreSeleccionado.totalBruto.toLocaleString("es-AR")}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-[#0f1012] border border-slate-200 dark:border-[#26272e] rounded-xl p-3">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Transferencias</span>
                <span className="text-base font-extrabold font-mono text-sky-600 dark:text-sky-400">
                  ${cierreSeleccionado.totalTransferencias.toLocaleString("es-AR")}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-[#0f1012] border border-slate-200 dark:border-[#26272e] rounded-xl p-3">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Efectivo Mostrador</span>
                <span className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                  ${cierreSeleccionado.totalEfectivo.toLocaleString("es-AR")}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-[#0f1012] border border-slate-200 dark:border-[#26272e] rounded-xl p-3">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Tarjetas</span>
                <span className="text-base font-extrabold font-mono text-purple-600 dark:text-purple-400">
                  ${cierreSeleccionado.totalTarjeta.toLocaleString("es-AR")}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-[#0f1012] border border-slate-200 dark:border-[#26272e] rounded-xl p-3">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Devoluciones</span>
                <span className="text-base font-extrabold font-mono text-rose-600">
                  {cierreSeleccionado.totalDevoluciones > 0
                    ? `-$${cierreSeleccionado.totalDevoluciones.toLocaleString("es-AR")}`
                    : "$0"}
                </span>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-3">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold block">TOTAL NETO</span>
                <span className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">
                  ${cierreSeleccionado.totalNeto.toLocaleString("es-AR")}
                </span>
              </div>
            </div>

            {/* Listado de Operaciones del Día */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Operaciones de la jornada ({cierreSeleccionado.operaciones.length} pedidos cobrados)</span>
                </h4>
                <span className="text-xs text-slate-500">
                  Computadas por fecha efectiva de cobro
                </span>
              </div>

              <div className="border border-slate-200 dark:border-[#26272e] rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#121316] border-b border-slate-200 dark:border-[#26272e] text-slate-500 dark:text-[#8e8f96] font-semibold text-[10px] uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Pedido</th>
                        <th className="py-2.5 px-3">Hora Cobro</th>
                        <th className="py-2.5 px-3">Método</th>
                        <th className="py-2.5 px-3">Cliente</th>
                        <th className="py-2.5 px-3">Confirmado Por</th>
                        <th className="py-2.5 px-3 text-right">Importe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#202127]">
                      {cierreSeleccionado.operaciones.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-slate-400">
                            No se registraron cobros en esta jornada.
                          </td>
                        </tr>
                      ) : (
                        cierreSeleccionado.operaciones.map((op) => (
                          <tr key={op.pedidoId} className="hover:bg-slate-50/50 dark:hover:bg-[#1f2026]">
                            <td className="py-2.5 px-3 whitespace-nowrap font-bold text-red-600">
                              #ORD-{op.pedidoNumero}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-600 dark:text-[#9a9ba3]">
                              {op.horaPago}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-[#202127] text-slate-800 dark:text-zinc-200">
                                {op.metodoPago === "TRANSFERENCIA"
                                  ? "Transferencia"
                                  : op.metodoPago === "EFECTIVO_LOCAL"
                                  ? "Efectivo Mostrador"
                                  : op.metodoPago}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                              {op.clienteNombre}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-[#9a9ba3]">
                              {op.confirmadoPor || "Sistema E-Commerce"}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-bold text-slate-900 dark:text-white">
                              ${op.total.toLocaleString("es-AR")}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Listado de Reintegros si existieran */}
            {cierreSeleccionado.reintegros.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-[#26272e]">
                <h4 className="font-bold text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4" />
                  <span>Devoluciones y ajustes asentados en esta fecha ({cierreSeleccionado.reintegros.length})</span>
                </h4>
                <div className="border border-slate-200 dark:border-[#26272e] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#121316] border-b border-slate-200 dark:border-[#26272e] text-slate-500 font-semibold text-[10px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Pedido</th>
                        <th className="py-2.5 px-3">Motivo</th>
                        <th className="py-2.5 px-3">Método / Ref</th>
                        <th className="py-2.5 px-3">Responsable</th>
                        <th className="py-2.5 px-3 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#202127]">
                      {cierreSeleccionado.reintegros.map((r, idx) => (
                        <tr key={idx} className="hover:bg-rose-50/20">
                          <td className="py-2 px-3 font-bold text-red-600">#ORD-{r.pedidoNumero}</td>
                          <td className="py-2 px-3 text-slate-700 dark:text-zinc-300">{r.motivo}</td>
                          <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                            {r.metodoReintegro} ({r.comprobanteOReferencia})
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-[#9a9ba3]">{r.responsable}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                            -${r.monto.toLocaleString("es-AR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer Modal */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-[#26272e]">
              <span className="text-xs text-slate-400">
                Chopper Repuestos &bull; Finanzas Online
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleImprimirCierre(cierreSeleccionado)}
                  className="px-4 py-2 text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-black rounded-lg hover:opacity-90 flex items-center gap-1.5 transition-opacity"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir informe</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalDetalleCierre(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-[#9a9ba3] dark:hover:text-white bg-slate-100 dark:bg-[#202127] rounded-lg transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PLANTILLA DE IMPRESIÓN A4 / PDF (SOLO VISIBLE AL IMPRIMIR) ─── */}
      {cierreSeleccionado && (
        <div id="seccion-impresion-cierre" className="print-only-container">
          <style dangerouslySetInnerHTML={{ __html: `
            @media screen {
              .print-only-container {
                display: none !important;
              }
            }
            @media print {
              body * {
                visibility: hidden !important;
              }
              .print-only-container,
              .print-only-container * {
                visibility: visible !important;
              }
              .print-only-container {
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: #ffffff !important;
                color: #000000 !important;
                padding: 10mm 15mm !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                font-size: 11pt !important;
                line-height: 1.4 !important;
              }
              @page {
                size: A4 portrait;
                margin: 10mm 12mm;
              }
            }
          `}} />

          {/* Membrete comercial */}
          <div style={{ borderBottom: "2px solid #000", paddingBottom: "12px", marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h1 style={{ fontSize: "18pt", fontWeight: "bold", margin: 0, textTransform: "uppercase" }}>
                  Chopper Repuestos
                </h1>
                <p style={{ margin: "2px 0 0 0", fontSize: "10pt", color: "#444" }}>
                  E-Commerce · Informe Contable de Cierre Diario de Finanzas Online
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{
                  display: "inline-block",
                  padding: "4px 8px",
                  border: "1px solid #000",
                  fontWeight: "bold",
                  fontSize: "9pt",
                  textTransform: "uppercase"
                }}>
                  {cierreSeleccionado.estado === "EN_CURSO" ? "JORNADA EN CURSO" : "JORNADA CERRADA"}
                </span>
                <p style={{ margin: "4px 0 0 0", fontSize: "8pt", color: "#666" }}>
                  Emisión: {new Date().toLocaleString("es-AR")}
                </p>
              </div>
            </div>
          </div>

          {/* Datos de la Jornada */}
          <div style={{ marginBottom: "16px", background: "#f8f9fa", padding: "10px 14px", border: "1px solid #ddd" }}>
            <table style={{ width: "100%", fontSize: "10pt" }}>
              <tbody>
                <tr>
                  <td style={{ width: "50%", padding: "2px 0" }}>
                    <strong>Fecha:</strong> {cierreSeleccionado.fechaTexto} ({cierreSeleccionado.fechaFormateada})
                  </td>
                  <td style={{ width: "50%", padding: "2px 0" }}>
                    <strong>Período Horario:</strong> {cierreSeleccionado.periodoInicio} hs a {cierreSeleccionado.periodoFin === "En curso" ? "En curso" : `${cierreSeleccionado.periodoFin} hs`}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "2px 0" }}>
                    <strong>Zona Horaria:</strong> America/Argentina/Buenos_Aires (UTC-3)
                  </td>
                  <td style={{ padding: "2px 0" }}>
                    <strong>Cantidad de Pedidos Cobrados:</strong> {cierreSeleccionado.pedidosCobradosCount}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Resumen Financiero Consolidado */}
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ fontSize: "11pt", fontWeight: "bold", margin: "0 0 8px 0", textTransform: "uppercase" }}>
              Resumen Financiero de la Jornada
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt" }}>
              <thead>
                <tr style={{ background: "#eee", borderTop: "1px solid #000", borderBottom: "1px solid #000" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>Concepto</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Importe ($)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "6px 8px" }}>Cobros por Transferencia Bancaria</td>
                  <td style={{ textAlign: "right", padding: "6px 8px", fontFamily: "monospace" }}>
                    ${cierreSeleccionado.totalTransferencias.toLocaleString("es-AR")}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "6px 8px" }}>Cobros en Efectivo en Mostrador</td>
                  <td style={{ textAlign: "right", padding: "6px 8px", fontFamily: "monospace" }}>
                    ${cierreSeleccionado.totalEfectivo.toLocaleString("es-AR")}
                  </td>
                </tr>
                {cierreSeleccionado.totalTarjeta > 0 && (
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "6px 8px" }}>Cobros con Tarjeta</td>
                    <td style={{ textAlign: "right", padding: "6px 8px", fontFamily: "monospace" }}>
                      ${cierreSeleccionado.totalTarjeta.toLocaleString("es-AR")}
                    </td>
                  </tr>
                )}
                <tr style={{ borderBottom: "1px solid #000", fontWeight: "bold" }}>
                  <td style={{ padding: "6px 8px" }}>TOTAL BRUTO RECAUDADO</td>
                  <td style={{ textAlign: "right", padding: "6px 8px", fontFamily: "monospace" }}>
                    ${cierreSeleccionado.totalBruto.toLocaleString("es-AR")}
                  </td>
                </tr>
                {cierreSeleccionado.totalDevoluciones > 0 && (
                  <tr style={{ borderBottom: "1px solid #000", color: "#c00" }}>
                    <td style={{ padding: "6px 8px" }}>Devoluciones y Ajustes Comerciales</td>
                    <td style={{ textAlign: "right", padding: "6px 8px", fontFamily: "monospace" }}>
                      -${cierreSeleccionado.totalDevoluciones.toLocaleString("es-AR")}
                    </td>
                  </tr>
                )}
                <tr style={{ background: "#f0f0f0", borderBottom: "2px solid #000", fontWeight: "bold", fontSize: "11pt" }}>
                  <td style={{ padding: "8px" }}>TOTAL NETO DE LA JORNADA</td>
                  <td style={{ textAlign: "right", padding: "8px", fontFamily: "monospace", fontSize: "12pt" }}>
                    ${cierreSeleccionado.totalNeto.toLocaleString("es-AR")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Detalle de Operaciones Cobradas */}
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ fontSize: "11pt", fontWeight: "bold", margin: "0 0 8px 0", textTransform: "uppercase" }}>
              Detalle de Operaciones Cobradas ({cierreSeleccionado.operaciones.length})
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt" }}>
              <thead>
                <tr style={{ background: "#eee", borderTop: "1px solid #000", borderBottom: "1px solid #000" }}>
                  <th style={{ textAlign: "left", padding: "5px 6px" }}>N° Pedido</th>
                  <th style={{ textAlign: "left", padding: "5px 6px" }}>Hora</th>
                  <th style={{ textAlign: "left", padding: "5px 6px" }}>Método de Pago</th>
                  <th style={{ textAlign: "left", padding: "5px 6px" }}>Cliente</th>
                  <th style={{ textAlign: "left", padding: "5px 6px" }}>Confirmado Por</th>
                  <th style={{ textAlign: "right", padding: "5px 6px" }}>Importe</th>
                </tr>
              </thead>
              <tbody>
                {cierreSeleccionado.operaciones.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "12px", color: "#777" }}>
                      No se registraron cobros en esta jornada.
                    </td>
                  </tr>
                ) : (
                  cierreSeleccionado.operaciones.map((op) => (
                    <tr key={op.pedidoId} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "5px 6px", fontWeight: "bold" }}>#ORD-{op.pedidoNumero}</td>
                      <td style={{ padding: "5px 6px", fontFamily: "monospace" }}>{op.horaPago}</td>
                      <td style={{ padding: "5px 6px" }}>
                        {op.metodoPago === "TRANSFERENCIA"
                          ? "Transferencia"
                          : op.metodoPago === "EFECTIVO_LOCAL"
                          ? "Efectivo Mostrador"
                          : op.metodoPago}
                      </td>
                      <td style={{ padding: "5px 6px" }}>{op.clienteNombre}</td>
                      <td style={{ padding: "5px 6px", color: "#555" }}>{op.confirmadoPor || "Sistema E-Commerce"}</td>
                      <td style={{ textAlign: "right", padding: "5px 6px", fontFamily: "monospace", fontWeight: "bold" }}>
                        ${op.total.toLocaleString("es-AR")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Cuadro de firmas para auditoría contable */}
          <div style={{ marginTop: "40px", paddingTop: "20px", pageBreakInside: "avoid" }}>
            <table style={{ width: "100%", textAlign: "center" }}>
              <tbody>
                <tr>
                  <td style={{ width: "45%", padding: "0 20px" }}>
                    <div style={{ borderTop: "1px solid #000", paddingTop: "6px" }}>
                      <p style={{ margin: 0, fontWeight: "bold", fontSize: "9pt" }}>
                        Firma y Aclaración
                      </p>
                      <p style={{ margin: "2px 0 0 0", fontSize: "8pt", color: "#555" }}>
                        Responsable de Caja Online
                      </p>
                    </div>
                  </td>
                  <td style={{ width: "10%" }}></td>
                  <td style={{ width: "45%", padding: "0 20px" }}>
                    <div style={{ borderTop: "1px solid #000", paddingTop: "6px" }}>
                      <p style={{ margin: 0, fontWeight: "bold", fontSize: "9pt" }}>
                        Firma y Aclaración
                      </p>
                      <p style={{ margin: "2px 0 0 0", fontSize: "8pt", color: "#555" }}>
                        Administración Contable
                      </p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
