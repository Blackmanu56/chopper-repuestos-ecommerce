"use client";

import React, { useState, useEffect, useRef, useTransition, useMemo } from "react";
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Package,
  Truck,
  CreditCard,
  X,
  CheckCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Inbox,
  Filter,
  Layers,
  History,
  Calendar,
  Sparkles,
} from "lucide-react";
import {
  getNotificacionesStaffAction,
  marcarNotificacionLeidaAction,
  marcarTodasNotificacionesLeidasAction,
} from "@/actions/notifications";
import {
  NotificacionStaff,
  ContadoresAvisos,
  GrupoNotificacionOperativa,
  CategoriaNotificacion,
} from "@/lib/notifications";

interface NotificationBellProps {
  user: {
    id: number;
    rol: string;
    nombreCompleto?: string | null;
    correo?: string;
  };
  role?: "admin" | "venta" | "stock"; // Selector operativo actual del panel
  onSelectPedido?: (pedidoId: number, moduloDestino?: string) => void;
  onNavigateSection?: (modulo: "pedidos" | "preparacion" | "entrega", filtroEstado?: string) => void;
  className?: string;
}

export function NotificationBell({
  user,
  role = "admin",
  onSelectPedido,
  onNavigateSection,
  className = "",
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Pestaña principal: "GRUPOS" (Avisos activos agrupados) vs "HISTORIAL"
  const [activeTab, setActiveTab] = useState<"GRUPOS" | "HISTORIAL">("GRUPOS");

  // Datos del backend
  const [grupos, setGrupos] = useState<GrupoNotificacionOperativa[]>([]);
  const [notificaciones, setNotificaciones] = useState<NotificacionStaff[]>([]);
  const [noLeidasCount, setNoLeidasCount] = useState<number>(0);
  const [totalGruposPendientes, setTotalGruposPendientes] = useState<number>(0);
  const [contadores, setContadores] = useState<ContadoresAvisos | null>(null);

  // Filtros del Historial
  const [filtroHistorialEstado, setFiltroHistorialEstado] = useState<"TODAS" | "PENDIENTES" | "RESUELTAS" | "NO_LEIDAS">("TODAS");
  const [filtroHistorialCategoria, setFiltroHistorialCategoria] = useState<string>("TODAS");
  const [filtroHistorialFecha, setFiltroHistorialFecha] = useState<"TODAS" | "HOY" | "7_DIAS">("TODAS");

  const containerRef = useRef<HTMLDivElement>(null);

  // Cargar notificaciones del servidor con el rol operativo seleccionado
  const loadNotifications = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await getNotificacionesStaffAction(user.id, role);
      if (res.success) {
        setGrupos(res.grupos || []);
        setNotificaciones(res.notificaciones || []);
        setNoLeidasCount(res.noLeidasCount || 0);
        setTotalGruposPendientes(res.totalGruposPendientes || 0);
        if (res.contadores) {
          setContadores(res.contadores);
        }
      }
    } catch (err) {
      console.error("Error al cargar notificaciones:", err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar al montar, al cambiar el rol operativo o el usuario, y con polling cada 45s
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 45000);
    return () => clearInterval(interval);
  }, [user?.id, role]);

  // Cerrar al hacer click afuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Clic en un grupo de avisos activos
  const handleGroupClick = (grupo: GrupoNotificacionOperativa) => {
    setIsOpen(false);
    if (onNavigateSection) {
      onNavigateSection(grupo.moduloDestino, grupo.filtroDestino);
    } else if (grupo.pedidosIds.length > 0 && onSelectPedido) {
      onSelectPedido(grupo.pedidosIds[0], grupo.moduloDestino);
    }
  };

  // Clic en un item del historial: marcar como leída y abrir el pedido
  const handleHistorialItemClick = (notif: NotificacionStaff) => {
    startTransition(async () => {
      if (!notif.leida) {
        const res = await marcarNotificacionLeidaAction(user.id, notif.id, role);
        if (res.success) {
          setNotificaciones((prev) =>
            prev.map((n) => (n.id === notif.id ? { ...n, leida: true, leidaPor: [...n.leidaPor, user.id] } : n))
          );
          if (typeof res.noLeidasCount === "number") {
            setNoLeidasCount(res.noLeidasCount);
          }
          if (res.contadores) {
            setContadores(res.contadores);
          }
          if (res.grupos) {
            setGrupos(res.grupos);
          }
        }
      }

      if (notif.pedidoId && onSelectPedido) {
        setIsOpen(false);
        onSelectPedido(notif.pedidoId, notif.moduloDestino);
      }
    });
  };

  // Marcar todas como leídas
  const handleMarcarTodasLeidas = () => {
    startTransition(async () => {
      const res = await marcarTodasNotificacionesLeidasAction(user.id, role);
      if (res.success) {
        setNotificaciones((prev) =>
          prev.map((n) => ({ ...n, leida: true, leidaPor: Array.from(new Set([...n.leidaPor, user.id])) }))
        );
        setNoLeidasCount(0);
        if (res.contadores) {
          setContadores(res.contadores);
        }
        if (res.grupos) {
          setGrupos(res.grupos);
        }
      }
    });
  };

  // Filtrado reactivo del historial
  const filteredHistorial = useMemo(() => {
    return notificaciones.filter((n) => {
      // Filtro de Estado
      if (filtroHistorialEstado === "PENDIENTES" && n.resuelta) return false;
      if (filtroHistorialEstado === "RESUELTAS" && !n.resuelta) return false;
      if (filtroHistorialEstado === "NO_LEIDAS" && n.leida) return false;

      // Filtro de Categoría
      if (filtroHistorialCategoria !== "TODAS" && n.categoria !== filtroHistorialCategoria) return false;

      // Filtro de Fecha
      if (filtroHistorialFecha !== "TODAS") {
        const notifDate = new Date(n.creadaEn).getTime();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (filtroHistorialFecha === "HOY" && now - notifDate > oneDay) return false;
        if (filtroHistorialFecha === "7_DIAS" && now - notifDate > 7 * oneDay) return false;
      }

      return true;
    });
  }, [notificaciones, filtroHistorialEstado, filtroHistorialCategoria, filtroHistorialFecha]);

  // Ícono representativo para grupos
  const getGroupIcon = (icono: string, color: string) => {
    switch (icono) {
      case "CreditCard":
        return <CreditCard className="w-5 h-5 text-amber-500 dark:text-amber-400" />;
      case "Package":
        return <Package className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />;
      case "Clock":
        return <Clock className="w-5 h-5 text-blue-500 dark:text-blue-400" />;
      case "Truck":
        return <Truck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />;
      case "AlertTriangle":
        return <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />;
      default:
        return <Bell className="w-5 h-5 text-red-500" />;
    }
  };

  // Ícono de historial
  const getCategoryIcon = (categoria?: CategoriaNotificacion, resuelta?: boolean) => {
    if (resuelta) return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    switch (categoria) {
      case "PEDIDOS_NUEVOS":
        return <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case "PAGOS_PENDIENTES":
        return <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case "PREPARACION":
        return <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case "ENTREGAS":
        return <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case "CANCELACIONES":
        return <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500 dark:text-zinc-400" />;
    }
  };

  // Formato de fecha relativo y legible
  const formatFechaAviso = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMin / 60);

      if (diffMin < 1) return "Recién";
      if (diffMin < 60) return `Hace ${diffMin} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      return date.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const badgeTotal = totalGruposPendientes + noLeidasCount;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Botón Campana con soporte adaptable claro/oscuro */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) loadNotifications();
        }}
        aria-label="Centro de notificaciones de staff"
        className={`relative p-2 rounded-xl transition-all border ${
          isOpen
            ? "bg-red-500/10 border-red-500 text-red-600 dark:text-red-400"
            : "bg-slate-100 hover:bg-slate-200/80 border-slate-300/80 text-slate-700 hover:text-slate-900 dark:bg-[#16171c] dark:hover:bg-[#202127] dark:border-[#2e2f38] dark:text-[#9a9ba3] dark:hover:text-white"
        }`}
        title="Avisos agrupados y notificaciones del equipo"
      >
        <Bell className="w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform hover:scale-105" />

        {/* Badge contador visible y proporcionado */}
        {badgeTotal > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white shadow-md shadow-red-600/30">
            {badgeTotal > 99 ? "99+" : badgeTotal}
          </span>
        )}
      </button>

      {/* Desplegable de Notificaciones */}
      {isOpen && (
        <div
          className="fixed inset-x-2 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 z-50 w-auto sm:w-[440px] max-w-[calc(100vw-1rem)] bg-white dark:bg-[#16171c] border border-slate-200 dark:border-[#2e2f38] rounded-2xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
          style={{ maxHeight: "calc(100vh - 5rem)" }}
        >
          {/* Encabezado limpio y adaptable */}
          <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-[#26272e] bg-slate-50 dark:bg-[#1a1b22] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-500 border border-red-500/20">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  Notificaciones y Avisos
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-[#8e8f96]">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Área: {role === "admin" ? "General (Admin)" : role === "venta" ? "Ventas" : "Depósito (Stock)"}
                  </span>
                  <span>·</span>
                  <span>{totalGruposPendientes} pendientes</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={loadNotifications}
                disabled={loading}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-[#8e8f96] dark:hover:text-white dark:hover:bg-[#26272e] transition-colors"
                title="Actualizar datos"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-[#8e8f96] dark:hover:text-white dark:hover:bg-[#26272e] transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Selector de Pestañas: Avisos Activos vs Historial */}
          <div className="px-3.5 py-2 border-b border-slate-200 dark:border-[#26272e] bg-slate-100/60 dark:bg-[#141519] flex items-center justify-between gap-2">
            <div className="inline-flex rounded-xl bg-slate-200/70 dark:bg-[#0f1012] p-1 border border-slate-300/60 dark:border-[#26272e] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("GRUPOS")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "GRUPOS"
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-[#8e8f96] hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Avisos activos</span>
                {totalGruposPendientes > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    activeTab === "GRUPOS" ? "bg-white/20 text-white" : "bg-red-500/10 text-red-600 dark:text-red-400"
                  }`}>
                    {totalGruposPendientes}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("HISTORIAL")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "HISTORIAL"
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-[#8e8f96] hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Historial</span>
                {noLeidasCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-red-600 text-white animate-pulse">
                    {noLeidasCount}
                  </span>
                )}
              </button>
            </div>

            {activeTab === "HISTORIAL" && noLeidasCount > 0 && (
              <button
                type="button"
                onClick={handleMarcarTodasLeidas}
                disabled={isPending}
                className="text-[11px] text-slate-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 flex items-center gap-1 font-semibold transition-colors"
                title="Marcar todas las notificaciones como leídas"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Leer todas</span>
              </button>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════ */}
          {/* VISTA 1: AVISOS ACTIVOS AGRUPADOS POR ESTADO                  */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeTab === "GRUPOS" && (
            <div className="flex-1 overflow-y-auto max-h-[400px] p-3 space-y-2.5">
              {grupos.length === 0 ? (
                <div className="py-12 px-4 text-center flex flex-col items-center justify-center space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-[#1a2520] border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      ¡Todo al día en esta área!
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-[#71727a] max-w-[260px] mx-auto mt-0.5">
                      No hay pedidos en espera de acción para el rol de {role === "admin" ? "Administrador" : role === "venta" ? "Ventas" : "Stock"}.
                    </p>
                  </div>
                </div>
              ) : (
                grupos.map((grupo) => (
                  <div
                    key={grupo.id}
                    onClick={() => handleGroupClick(grupo)}
                    className="w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group relative bg-slate-50 hover:bg-slate-100/90 border-slate-200 hover:border-red-500/40 dark:bg-[#1c1d25] dark:hover:bg-[#22232e] dark:border-[#2b2c36] dark:hover:border-red-500/30 shadow-sm"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-[#141519] border border-slate-200 dark:border-[#282933] shrink-0 mt-0.5 group-hover:border-red-500/30 transition-colors shadow-xs">
                        {getGroupIcon(grupo.icono, grupo.colorBadge)}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors truncate">
                            {grupo.titulo}
                          </h4>
                          {grupo.urgente && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                              Urgente
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-[#9a9ba3] line-clamp-1 leading-relaxed">
                          {grupo.descripcion}
                        </p>

                        <div className="pt-1 flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                            Sección: <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{grupo.moduloDestino}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-200 text-slate-800 dark:bg-[#262732] dark:text-white px-2 text-xs font-black group-hover:bg-red-600 group-hover:text-white transition-colors">
                        {grupo.cantidad}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 dark:text-[#52535d] group-hover:text-slate-900 dark:group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* VISTA 2: HISTORIAL COMPLETO DE NOTIFICACIONES                  */}
          {/* ════════════════════════════════════════════════════════════ */}
          {activeTab === "HISTORIAL" && (
            <div className="flex flex-col flex-1 max-h-[420px]">
              {/* Barra de Filtros del Historial */}
              <div className="p-2.5 border-b border-slate-200 dark:border-[#22232a] bg-slate-50/50 dark:bg-[#121317] space-y-2">
                <div className="flex flex-wrap items-center gap-1 text-[11px]">
                  {/* Filtro Estado */}
                  <span className="text-slate-400 dark:text-zinc-500 font-semibold mr-1">Estado:</span>
                  {(["TODAS", "PENDIENTES", "RESUELTAS", "NO_LEIDAS"] as const).map((est) => (
                    <button
                      key={est}
                      type="button"
                      onClick={() => setFiltroHistorialEstado(est)}
                      className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                        filtroHistorialEstado === est
                          ? "bg-slate-900 text-white dark:bg-white dark:text-black"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#1c1d25]"
                      }`}
                    >
                      {est === "TODAS"
                        ? "Todas"
                        : est === "PENDIENTES"
                        ? "Pendientes"
                        : est === "RESUELTAS"
                        ? "Resueltas"
                        : "Sin leer"}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[11px] gap-2 pt-1 border-t border-slate-200/60 dark:border-[#1e1f26]">
                  {/* Filtro Fecha */}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {(["TODAS", "HOY", "7_DIAS"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFiltroHistorialFecha(f)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                          filtroHistorialFecha === f
                            ? "bg-red-600 text-white"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        {f === "TODAS" ? "Siempre" : f === "HOY" ? "Hoy" : "7 días"}
                      </button>
                    ))}
                  </div>

                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                    {filteredHistorial.length} registros
                  </span>
                </div>
              </div>

              {/* Lista del Historial */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#22232a] p-2 space-y-1">
                {filteredHistorial.length === 0 ? (
                  <div className="py-10 px-4 text-center flex flex-col items-center justify-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#1e2029] border border-slate-200 dark:border-[#2e2f38] flex items-center justify-center text-slate-400 dark:text-[#6e707a]">
                      <Inbox className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-white">
                      No hay registros en el historial
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-[#71727a] max-w-[220px]">
                      No se encontraron avisos con los filtros seleccionados.
                    </p>
                  </div>
                ) : (
                  filteredHistorial.map((n) => {
                    const isUnread = !n.leida;
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleHistorialItemClick(n)}
                        className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-start gap-2.5 group relative ${
                          isUnread
                            ? "bg-red-50/50 hover:bg-red-50 dark:bg-[#1c1d25] dark:hover:bg-[#22232e] border border-red-500/20"
                            : "bg-transparent hover:bg-slate-100/70 dark:hover:bg-[#191a21] border border-transparent"
                        }`}
                      >
                        {isUnread && (
                          <span className="absolute left-1.5 top-3.5 w-1.5 h-1.5 rounded-full bg-red-600 ring-2 ring-red-500/30"></span>
                        )}

                        <div className="p-2 rounded-lg bg-white dark:bg-[#141519] border border-slate-200 dark:border-[#282933] shrink-0 mt-0.5">
                          {getCategoryIcon(n.categoria, n.resuelta)}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[11px] font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors truncate">
                              {n.titulo}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-[#6b6c75] shrink-0 font-medium">
                              {formatFechaAviso(n.creadaEn)}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 dark:text-[#9a9ba3] line-clamp-2 leading-relaxed">
                            {n.mensaje}
                          </p>

                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {n.pedidoNumero && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-200/70 text-slate-700 dark:bg-[#141519] dark:text-[#b8b9c0] border border-slate-300 dark:border-[#2b2c36]">
                                #ORD-{n.pedidoNumero}
                              </span>
                            )}

                            {n.resuelta ? (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {n.motivoResolucion || "Resuelto"}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400/90 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Acción pendiente
                              </span>
                            )}

                            {isUnread ? (
                              <span className="text-[9px] font-semibold text-red-600 dark:text-red-400 ml-auto">
                                No leída
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold text-slate-400 dark:text-zinc-500 ml-auto">
                                Leída
                              </span>
                            )}
                          </div>
                        </div>

                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-[#52535d] group-hover:text-slate-800 dark:group-hover:text-white shrink-0 self-center transition-transform group-hover:translate-x-0.5" />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Footer limpio y contextual */}
          <div className="p-2.5 border-t border-slate-200 dark:border-[#26272e] bg-slate-50 dark:bg-[#141519] flex items-center justify-between text-[11px] text-slate-500 dark:text-[#6b6c75]">
            <span>Chopper Repuestos · Panel Staff</span>
            <span className="font-semibold text-slate-700 dark:text-slate-400">
              {activeTab === "GRUPOS" ? `${grupos.length} grupos operativos` : `${notificaciones.length} eventos históricos`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
