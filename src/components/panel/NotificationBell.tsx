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
  Check,
  CheckCheck,
  RefreshCw,
  ChevronRight,
  Inbox,
  History,
  Calendar,
  Layers,
  ArrowUpDown,
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
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [mostrarMasAvisos, setMostrarMasAvisos] = useState(false);

  // Datos del backend
  const [grupos, setGrupos] = useState<GrupoNotificacionOperativa[]>([]);
  const [notificaciones, setNotificaciones] = useState<NotificacionStaff[]>([]);
  const [noLeidasCount, setNoLeidasCount] = useState<number>(0);
  const [totalGruposPendientes, setTotalGruposPendientes] = useState<number>(0);
  const [contadores, setContadores] = useState<ContadoresAvisos | null>(null);

  // Selector de ordenación: "RECIENTES" (predeterminado) o "ANTIGUAS"
  const [orden, setOrden] = useState<"RECIENTES" | "ANTIGUAS">("RECIENTES");

  // Filtros del Modal de Historial
  const [filtroHistorialEstado, setFiltroHistorialEstado] = useState<
    "TODAS" | "PENDIENTES" | "RESUELTAS" | "NO_LEIDAS"
  >("TODAS");
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

  // Polling suave cada 45s y actualización al cambiar usuario o rol
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 45000);
    return () => clearInterval(interval);
  }, [user?.id, role]);

  // Cerrar desplegable al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsHistoryModalOpen(false);
      }
    };

    if (isOpen || isHistoryModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isHistoryModalOpen]);

  // Clic en un grupo de avisos activos
  const handleGroupClick = (grupo: GrupoNotificacionOperativa) => {
    setIsOpen(false);
    if (onNavigateSection) {
      onNavigateSection(grupo.moduloDestino, grupo.filtroDestino);
    } else if (grupo.pedidosIds.length > 0 && onSelectPedido) {
      onSelectPedido(grupo.pedidosIds[0], grupo.moduloDestino);
    }
  };

  // Clic en un ítem del historial: marcar como leída y abrir el pedido
  const handleHistorialItemClick = (notif: NotificacionStaff) => {
    startTransition(async () => {
      if (!notif.leida) {
        const res = await marcarNotificacionLeidaAction(user.id, notif.id, role);
        if (res.success) {
          setNotificaciones((prev) =>
            prev.map((n) =>
              n.id === notif.id ? { ...n, leida: true, leidaPor: [...n.leidaPor, user.id] } : n
            )
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
        setIsHistoryModalOpen(false);
        onSelectPedido(notif.pedidoId, notif.moduloDestino);
      }
    });
  };

  // Marcar una notificación individual como leída (sin cerrar el modal ni navegar al pedido)
  const handleMarcarIndividualLeida = (notif: NotificacionStaff) => {
    if (notif.leida) return;
    startTransition(async () => {
      const res = await marcarNotificacionLeidaAction(user.id, notif.id, role);
      if (res.success) {
        setNotificaciones((prev) =>
          prev.map((n) =>
            n.id === notif.id ? { ...n, leida: true, leidaPor: [...n.leidaPor, user.id] } : n
          )
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
    });
  };

  // Marcar todas como leídas (tanto desde la campanita como desde el modal)
  const handleMarcarTodasLeidas = () => {
    startTransition(async () => {
      const res = await marcarTodasNotificacionesLeidasAction(user.id, role);
      if (res.success) {
        setNotificaciones((prev) =>
          prev.map((n) => ({
            ...n,
            leida: true,
            leidaPor: Array.from(new Set([...n.leidaPor, user.id])),
          }))
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

  // Filtrado y ordenación reactiva del historial
  const filteredHistorial = useMemo(() => {
    const list = notificaciones.filter((n) => {
      if (filtroHistorialEstado === "PENDIENTES" && n.resuelta) return false;
      if (filtroHistorialEstado === "RESUELTAS" && !n.resuelta) return false;
      if (filtroHistorialEstado === "NO_LEIDAS" && n.leida) return false;

      if (filtroHistorialFecha !== "TODAS") {
        const notifDate = new Date(n.creadaEn).getTime();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (filtroHistorialFecha === "HOY" && now - notifDate > oneDay) return false;
        if (filtroHistorialFecha === "7_DIAS" && now - notifDate > 7 * oneDay) return false;
      }

      return true;
    });

    return list.sort((a, b) => {
      const timeA = new Date(a.creadaEn).getTime();
      const timeB = new Date(b.creadaEn).getTime();
      return orden === "RECIENTES" ? timeB - timeA : timeA - timeB;
    });
  }, [notificaciones, filtroHistorialEstado, filtroHistorialFecha, orden]);

  // Ordenación de grupos operativos según la fecha del evento más reciente
  const gruposOrdenados = useMemo(() => {
    return [...grupos].sort((a, b) => {
      const timeA = a.fechaUltimoEvento ? new Date(a.fechaUltimoEvento).getTime() : 0;
      const timeB = b.fechaUltimoEvento ? new Date(b.fechaUltimoEvento).getTime() : 0;
      return orden === "RECIENTES" ? timeB - timeA : timeA - timeB;
    });
  }, [grupos, orden]);

  // Contador principal: ÚNICAMENTE los avisos pendientes que requieren atención
  const badgeCount = totalGruposPendientes;

  // Límite de grupos mostrados en el desplegable compacto
  const gruposVisibles = mostrarMasAvisos ? gruposOrdenados : gruposOrdenados.slice(0, 3);
  const getGroupIcon = (icono: string) => {
    switch (icono) {
      case "CreditCard":
        return <CreditCard className="w-4.5 h-4.5 text-amber-500 dark:text-amber-400" />;
      case "Package":
        return <Package className="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400" />;
      case "Truck":
        return <Truck className="w-4.5 h-4.5 text-emerald-500 dark:text-emerald-400" />;
      case "AlertTriangle":
        return <AlertTriangle className="w-4.5 h-4.5 text-red-500 dark:text-red-400" />;
      default:
        return <Bell className="w-4.5 h-4.5 text-red-500" />;
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

  return (
    <>
      <div className={`relative ${className}`} ref={containerRef}>
        {/* Botón Campana */}
        <button
          type="button"
          onClick={() => {
            setIsOpen((prev) => !prev);
            if (!isOpen) loadNotifications();
          }}
          aria-label="Notificaciones"
          className={`relative p-2 rounded-xl transition-all border ${
            isOpen
              ? "bg-red-500/10 border-red-500 text-red-600 dark:text-red-400"
              : "bg-slate-100 hover:bg-slate-200/80 border-slate-300/80 text-slate-700 hover:text-slate-900 dark:bg-[#16171c] dark:hover:bg-[#202127] dark:border-[#2e2f38] dark:text-[#9a9ba3] dark:hover:text-white"
          }`}
          title="Avisos y notificaciones"
        >
          <Bell className="w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform hover:scale-105" />

          {/* Badge del contador principal (exclusivamente pedidos pendientes) */}
          {badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white shadow-sm">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </button>

        {/* Desplegable Compacto de Notificaciones */}
        {isOpen && (
          <div
            className="fixed inset-x-2 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 z-50 w-auto sm:w-[380px] max-w-[calc(100vw-1rem)] bg-white dark:bg-[#16171c] border border-slate-200 dark:border-[#2e2f38] rounded-2xl shadow-xl overflow-hidden flex flex-col backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
            style={{ maxHeight: "calc(100vh - 5rem)" }}
          >
            {/* Encabezado limpio: únicamente "Notificaciones" y controles */}
            <div className="p-3 sm:p-3.5 border-b border-slate-200 dark:border-[#26272e] bg-slate-50 dark:bg-[#1a1b22] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-500">
                  <Bell className="w-4 h-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  Notificaciones
                </h3>
              </div>

              <div className="flex items-center gap-1">
                {noLeidasCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarcarTodasLeidas();
                    }}
                    disabled={isPending}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-[#8e8f96] dark:hover:text-white dark:hover:bg-[#26272e] transition-colors"
                    title={`Marcar todas como leídas (${noLeidasCount})`}
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-red-500 hover:text-red-600" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOrden((prev) => (prev === "RECIENTES" ? "ANTIGUAS" : "RECIENTES"))}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-[#8e8f96] dark:hover:text-white dark:hover:bg-[#26272e] transition-colors"
                  title={orden === "RECIENTES" ? "Orden: Más recientes primero (clic para alternar)" : "Orden: Más antiguas primero (clic para alternar)"}
                >
                  <ArrowUpDown className={`w-3.5 h-3.5 ${orden === "ANTIGUAS" ? "text-red-500 rotate-180" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={loadNotifications}
                  disabled={loading}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-[#8e8f96] dark:hover:text-white dark:hover:bg-[#26272e] transition-colors"
                  title="Actualizar"
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

            {/* Selector de ordenación compacto cuando hay avisos */}
            {grupos.length > 1 && (
              <div className="px-3 py-1.5 bg-slate-100/70 dark:bg-[#131418] border-b border-slate-200 dark:border-[#22232a] flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-[#7f808a] font-medium">
                  {grupos.length} avisos operativos
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 dark:text-[#65666f] text-[10px]">Orden:</span>
                  <button
                    type="button"
                    onClick={() => setOrden("RECIENTES")}
                    className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                      orden === "RECIENTES"
                        ? "bg-slate-200 text-slate-900 dark:bg-[#252630] dark:text-white font-bold"
                        : "text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                    }`}
                  >
                    Recientes
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrden("ANTIGUAS")}
                    className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                      orden === "ANTIGUAS"
                        ? "bg-slate-200 text-slate-900 dark:bg-[#252630] dark:text-white font-bold"
                        : "text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                    }`}
                  >
                    Antiguas
                  </button>
                </div>
              </div>
            )}

            {/* Listado de Avisos Operativos que requieren atención */}
            <div className="flex-1 overflow-y-auto max-h-[320px] p-2.5 space-y-2">
              {grupos.length === 0 ? (
                <div className="py-8 px-4 text-center flex flex-col items-center justify-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-[#1a2520] border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                      No hay avisos pendientes
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-[#71727a]">
                      Todo el flujo de trabajo está al día.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {gruposVisibles.map((grupo) => (
                    <div
                      key={grupo.id}
                      onClick={() => handleGroupClick(grupo)}
                      className="w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group relative bg-slate-50 hover:bg-slate-100/90 border-slate-200 hover:border-red-500/40 dark:bg-[#1c1d25] dark:hover:bg-[#22232e] dark:border-[#2b2c36] dark:hover:border-red-500/30"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-white dark:bg-[#141519] border border-slate-200 dark:border-[#282933] shrink-0 mt-0.5 group-hover:border-red-500/30 transition-colors">
                          {getGroupIcon(grupo.icono)}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors truncate">
                            {grupo.titulo}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-[#9a9ba3] line-clamp-1">
                            {grupo.descripcion}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="flex h-5.5 min-w-5.5 items-center justify-center rounded-full bg-slate-200 text-slate-800 dark:bg-[#262732] dark:text-white px-1.5 text-[11px] font-black group-hover:bg-red-600 group-hover:text-white transition-colors">
                          {grupo.cantidad}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-[#52535d] group-hover:text-slate-900 dark:group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  ))}

                  {/* Botón Ver más si hay más de 3 grupos */}
                  {grupos.length > 3 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMostrarMasAvisos((prev) => !prev);
                      }}
                      className="w-full py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:text-[#8e8f96] dark:hover:text-white transition-colors text-center"
                    >
                      {mostrarMasAvisos ? "Mostrar menos avisos" : `Ver ${grupos.length - 3} avisos más`}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Footer con enlace para abrir el modal independiente de historial */}
            <div className="p-2 border-t border-slate-200 dark:border-[#26272e] bg-slate-50 dark:bg-[#141519] flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsHistoryModalOpen(true);
                }}
                className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-700 hover:text-red-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:text-red-400 dark:hover:bg-[#1e1f26] transition-colors flex items-center justify-center gap-1.5"
              >
                <History className="w-3.5 h-3.5" />
                <span>Ver historial completo</span>
                {notificaciones.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-[#252630] font-bold text-slate-600 dark:text-slate-400">
                    {notificaciones.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL INDEPENDIENTE: HISTORIAL COMPLETO DE NOTIFICACIONES               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-2xl bg-white dark:bg-[#16171c] border border-slate-200 dark:border-[#2e2f38] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="p-4 border-b border-slate-200 dark:border-[#26272e] bg-slate-50 dark:bg-[#1a1b22] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-500">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Historial de Notificaciones
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#8e8f96]">
                    {filteredHistorial.length} registros registrados
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {noLeidasCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarcarTodasLeidas}
                    disabled={isPending}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-200/70 hover:bg-slate-200 dark:bg-[#252630] dark:hover:bg-[#2f303d] text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5 transition-colors"
                    title="Marcar todas como leídas"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    <span>Leer todas ({noLeidasCount})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-[#8e8f96] dark:hover:text-white dark:hover:bg-[#26272e] transition-colors"
                  title="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Barra de Filtros del Historial */}
            <div className="p-3 border-b border-slate-200 dark:border-[#22232a] bg-slate-50/60 dark:bg-[#121317] space-y-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-400 dark:text-zinc-500 font-semibold mr-1">Estado:</span>
                {(["TODAS", "PENDIENTES", "RESUELTAS", "NO_LEIDAS"] as const).map((est) => (
                  <button
                    key={est}
                    type="button"
                    onClick={() => setFiltroHistorialEstado(est)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                      filtroHistorialEstado === est
                        ? "bg-slate-900 text-white dark:bg-white dark:text-black"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-[#1c1d25]"
                    }`}
                  >
                    {est === "TODAS"
                      ? "Todas"
                      : est === "PENDIENTES"
                      ? "Acción pendiente"
                      : est === "RESUELTAS"
                      ? "Resueltas"
                      : "Sin leer"}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1.5 border-t border-slate-200/60 dark:border-[#1e1f26]">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400 dark:text-zinc-500 font-semibold mr-1">Período:</span>
                  {(["TODAS", "HOY", "7_DIAS"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFiltroHistorialFecha(f)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        filtroHistorialFecha === f
                          ? "bg-red-600 text-white"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {f === "TODAS" ? "Siempre" : f === "HOY" ? "Hoy" : "Últimos 7 días"}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400 dark:text-zinc-500 font-semibold mr-1">Orden:</span>
                  <button
                    type="button"
                    onClick={() => setOrden("RECIENTES")}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      orden === "RECIENTES"
                        ? "bg-slate-900 text-white dark:bg-white dark:text-black font-bold"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Más recientes
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrden("ANTIGUAS")}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      orden === "ANTIGUAS"
                        ? "bg-slate-900 text-white dark:bg-white dark:text-black font-bold"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Más antiguas
                  </button>
                </div>
              </div>
            </div>

            {/* Listado del Historial con Desplazamiento */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#22232a] p-3 space-y-1.5">
              {filteredHistorial.length === 0 ? (
                <div className="py-16 px-4 text-center flex flex-col items-center justify-center space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#1e2029] border border-slate-200 dark:border-[#2e2f38] flex items-center justify-center text-slate-400 dark:text-[#6e707a]">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-white">
                    No hay registros en el historial
                  </p>
                  <p className="text-xs text-slate-500 dark:text-[#71727a] max-w-[260px]">
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
                      className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer flex items-start gap-3 group relative ${
                        isUnread
                          ? "bg-red-50/50 hover:bg-red-50 dark:bg-[#1c1d25] dark:hover:bg-[#22232e] border border-red-500/20"
                          : "bg-transparent hover:bg-slate-100/70 dark:hover:bg-[#191a21] border border-transparent"
                      }`}
                    >
                      {isUnread && (
                        <span className="absolute left-1.5 top-4 w-1.5 h-1.5 rounded-full bg-red-600 ring-2 ring-red-500/30"></span>
                      )}

                      <div className="p-2 rounded-lg bg-white dark:bg-[#141519] border border-slate-200 dark:border-[#282933] shrink-0 mt-0.5">
                        {getCategoryIcon(n.categoria, n.resuelta)}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors truncate">
                            {n.titulo}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-[#6b6c75] shrink-0 font-medium">
                            {formatFechaAviso(n.creadaEn)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-[#9a9ba3] line-clamp-2 leading-relaxed">
                          {n.mensaje}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          {n.pedidoNumero && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200/70 text-slate-700 dark:bg-[#141519] dark:text-[#b8b9c0] border border-slate-300 dark:border-[#2b2c36]">
                              #ORD-{n.pedidoNumero}
                            </span>
                          )}

                          {n.resuelta ? (
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {n.motivoResolucion || "Resuelto"}
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400/90 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              Acción pendiente
                            </span>
                          )}

                          {isUnread ? (
                            <div className="flex items-center gap-1.5 ml-auto">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarcarIndividualLeida(n);
                                }}
                                disabled={isPending}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 bg-slate-200/80 hover:bg-emerald-100 dark:bg-[#252630] dark:hover:bg-emerald-950/40 border border-slate-300 dark:border-[#383944] transition-colors"
                                title="Marcar como leída sin abrir"
                              >
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Marcar leída</span>
                              </button>
                              <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">
                                No leída
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 ml-auto">
                              Leída
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-400 dark:text-[#52535d] group-hover:text-slate-800 dark:group-hover:text-white shrink-0 self-center transition-transform group-hover:translate-x-0.5" />
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer del Modal */}
            <div className="p-3 border-t border-slate-200 dark:border-[#26272e] bg-slate-50 dark:bg-[#141519] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-[#252630] dark:hover:bg-[#2f303d] text-slate-800 dark:text-white text-xs font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
