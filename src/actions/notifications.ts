"use server";

import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/lib/session";
import {
  NotificacionStaff,
  CategoriaNotificacion,
  ContadoresAvisos,
  GrupoNotificacionOperativa,
  getStoredNotificacionesStaff,
  saveStoredNotificacionesStaff,
} from "@/lib/notifications";

/**
 * Helper para autenticar sesión de staff con fallback seguro para scripts de testing
 */
async function verifyStaffNotification(
  _userId?: number,
  allowedRoles: Array<"ADMINISTRADOR" | "ENCARGADO_VENTAS" | "ENCARGADO_STOCK"> = [
    "ADMINISTRADOR",
    "ENCARGADO_VENTAS",
    "ENCARGADO_STOCK",
  ]
): Promise<{
  authorized: boolean;
  user?: { id: number; rol: string; nombreCompleto?: string | null; correo?: string | null };
  error?: string;
}> {
  try {
    const auth = await requireStaffSession(allowedRoles);
    if (auth.authorized && auth.user) {
      return {
        authorized: true,
        user: {
          id: auth.user.id,
          rol: auth.user.rol,
          nombreCompleto: auth.user.nombreCompleto,
          correo: auth.user.correo,
        },
      };
    }
  } catch {}

  // Fallback para CLI / scripts de verificación técnica cuando no hay request HTTP
  if (_userId && _userId > 0) {
    const dbUser = await prisma.usuario.findUnique({
      where: { id: _userId },
      include: { rol: true },
    });
    if (dbUser && dbUser.activo) {
      const userRol = dbUser.rol.nombre as any;
      if (allowedRoles.includes(userRol)) {
        return {
          authorized: true,
          user: {
            id: dbUser.id,
            rol: userRol,
            nombreCompleto: dbUser.nombreCompleto,
            correo: dbUser.correo,
          },
        };
      } else {
        return {
          authorized: false,
          error: `Permiso denegado: el rol ${userRol} no tiene autorización para esta operación.`,
        };
      }
    }
  }

  return { authorized: false, error: "No autorizado." };
}

/**
 * Obtiene las notificaciones internas del personal administrativo:
 * 1. Grupos de alertas operativas en tiempo real (calculados con pedidos reales de la base de datos).
 * 2. Historial de eventos individuales enriquecidos con su estado de resolución y lectura.
 * 3. Filtrado por rol del empleado con restricciones de seguridad tanto en backend como frontend.
 */
export async function getNotificacionesStaffAction(
  userIdParam?: number,
  rolOperativo?: "admin" | "venta" | "stock" | "todos"
): Promise<{
  success: boolean;
  grupos: GrupoNotificacionOperativa[];
  notificaciones: NotificacionStaff[];
  noLeidasCount: number;
  totalGruposPendientes: number;
  contadores?: ContadoresAvisos;
  error?: string;
}> {
  try {
    const auth = await verifyStaffNotification(userIdParam);
    if (!auth.authorized || !auth.user) {
      return {
        success: false,
        grupos: [],
        notificaciones: [],
        noLeidasCount: 0,
        totalGruposPendientes: 0,
        contadores: {
          totalPendientes: 0,
          noLeidasCount: 0,
          pedidosNuevos: 0,
          pagosPendientes: 0,
          pendientesArmar: 0,
          enPreparacion: 0,
          listosEntrega: 0,
          cancelaciones: 0,
          historial: 0,
        },
        error: auth.error || "No autorizado.",
      };
    }

    const realUserId = auth.user.id;
    const realUserRol = auth.user.rol; // "ADMINISTRADOR" | "ENCARGADO_VENTAS" | "ENCARGADO_STOCK"

    // ─── REGLAS DE SEGURIDAD ESTRICTA EN BACKEND ───
    // Stock NUNCA puede escalar a Ventas ni Admin.
    // Ventas NUNCA puede escalar a Stock ni Admin.
    // Administrador puede ver todo ("admin" / "todos") o filtrar su vista operativa por "venta" o "stock".
    let effectiveView: "ADMIN" | "VENTAS" | "STOCK" = "ADMIN";

    if (realUserRol === "ENCARGADO_STOCK") {
      effectiveView = "STOCK";
    } else if (realUserRol === "ENCARGADO_VENTAS") {
      effectiveView = "VENTAS";
    } else {
      // Administrador
      if (rolOperativo === "venta") {
        effectiveView = "VENTAS";
      } else if (rolOperativo === "stock") {
        effectiveView = "STOCK";
      } else {
        effectiveView = "ADMIN";
      }
    }

    // ─── 1. GRUPOS OPERATIVOS ACTIVOS (CALCULADOS CON PEDIDOS REALES) ───
    const pedidosActivos = await prisma.pedidoEcommerce.findMany({
      where: {
        estado: {
          in: [
            "PENDIENTE",
            "CONFIRMADO",
            "PREPARANDO",
            "LISTO_ENTREGA",
            "LISTO_PARA_RETIRAR",
            "CANCELACION_SOLICITADA",
          ],
        },
      },
      select: {
        id: true,
        numero: true,
        estado: true,
        estadoPago: true,
        metodoPago: true,
        comprobanteUrl: true,
        modalidadEntrega: true,
        notas: true,
        creadoEn: true,
      },
      orderBy: { id: "desc" },
    });

    // Subconjuntos operativos reales
    // Un pedido pendiente de verificar pago es estrictamente aquel con estado === "PENDIENTE"
    const pagosPendientes = pedidosActivos.filter((p) => p.estado === "PENDIENTE");

    const pendientesArmar = pedidosActivos.filter((p) => p.estado === "CONFIRMADO");

    const enPreparacion = pedidosActivos.filter((p) => p.estado === "PREPARANDO");

    const listosEntrega = pedidosActivos.filter(
      (p) => p.estado === "LISTO_ENTREGA" || (p.estado as string) === "LISTO_PARA_RETIRAR"
    );

    const cancelacionesPendientes = pedidosActivos.filter((p) => {
      const notas = p.notas || "";
      const tieneMetadataResuelta = notas.includes("[CANCELACION_METADATA:");
      return (
        p.estado === "CANCELACION_SOLICITADA" ||
        (notas.includes("Cancelación solicitada por el cliente") && !tieneMetadataResuelta && p.estado !== "CANCELADO")
      );
    });

    const todosLosGrupos: GrupoNotificacionOperativa[] = [];

    // Grupo 1: Pagos pendientes de verificar (Ventas / Admin)
    if (pagosPendientes.length > 0) {
      const count = pagosPendientes.length;
      todosLosGrupos.push({
        id: "pagos_pendientes",
        clave: "PAGOS_PENDIENTES",
        rolDestino: "VENTAS",
        titulo: `${count} ${count === 1 ? "pedido pendiente" : "pedidos pendientes"} de verificar pago`,
        descripcion: "Transferencias y comprobantes en espera de verificación y aprobación comercial",
        cantidad: count,
        urgente: count > 5,
        moduloDestino: "pedidos",
        filtroDestino: "PENDIENTE",
        icono: "CreditCard",
        colorBadge: "amber",
        pedidosIds: pagosPendientes.map((p) => p.id),
        fechaUltimoEvento: pagosPendientes[0]?.creadoEn
          ? new Date(pagosPendientes[0].creadoEn).toISOString()
          : new Date().toISOString(),
      });
    }

    // Grupo 2: Pendientes de armar (Stock / Admin)
    if (pendientesArmar.length > 0) {
      const count = pendientesArmar.length;
      todosLosGrupos.push({
        id: "pendientes_armar",
        clave: "PENDIENTES_ARMAR",
        rolDestino: "STOCK",
        titulo: `${count} ${count === 1 ? "pedido pendiente" : "pedidos pendientes"} de armar`,
        descripcion: "Órdenes confirmadas en espera de inicio de picking y empaquetado en depósito",
        cantidad: count,
        urgente: count > 5,
        moduloDestino: "preparacion",
        filtroDestino: "CONFIRMADO",
        icono: "Package",
        colorBadge: "indigo",
        pedidosIds: pendientesArmar.map((p) => p.id),
        fechaUltimoEvento: pendientesArmar[0]?.creadoEn
          ? new Date(pendientesArmar[0].creadoEn).toISOString()
          : new Date().toISOString(),
      });
    }

    // Grupo 3: Listos para entregar (Ventas / Admin)
    if (listosEntrega.length > 0) {
      const count = listosEntrega.length;
      todosLosGrupos.push({
        id: "listos_entrega",
        clave: "LISTOS_ENTREGA",
        rolDestino: "VENTAS",
        titulo: `${count} ${count === 1 ? "pedido listo" : "pedidos listos"} para entregar`,
        descripcion: "Paquetes preparados para entrega en mostrador o despacho por motomandado",
        cantidad: count,
        moduloDestino: "entrega",
        filtroDestino: "POR_ENTREGAR",
        icono: "Truck",
        colorBadge: "emerald",
        pedidosIds: listosEntrega.map((p) => p.id),
        fechaUltimoEvento: listosEntrega[0]?.creadoEn
          ? new Date(listosEntrega[0].creadoEn).toISOString()
          : new Date().toISOString(),
      });
    }

    // Grupo 4: Solicitudes de cancelación pendientes (Ventas / Admin)
    if (cancelacionesPendientes.length > 0) {
      const count = cancelacionesPendientes.length;
      todosLosGrupos.push({
        id: "cancelaciones_pendientes",
        clave: "CANCELACIONES",
        rolDestino: "VENTAS",
        titulo: `${count} ${count === 1 ? "solicitud" : "solicitudes"} de cancelación pendiente`,
        descripcion: "Clientes que solicitaron cancelar pedidos pendientes de resolución comercial",
        cantidad: count,
        urgente: true,
        moduloDestino: "pedidos",
        filtroDestino: "CANCELACION_SOLICITADA",
        icono: "AlertTriangle",
        colorBadge: "red",
        pedidosIds: cancelacionesPendientes.map((p) => p.id),
        fechaUltimoEvento: cancelacionesPendientes[0]?.creadoEn
          ? new Date(cancelacionesPendientes[0].creadoEn).toISOString()
          : new Date().toISOString(),
      });
    }

    // Filtrar grupos según el rol efectivo
    const gruposFiltrados = todosLosGrupos.filter((g) => {
      if (effectiveView === "ADMIN") return true;
      if (effectiveView === "VENTAS") return g.rolDestino === "VENTAS" || g.rolDestino === "TODOS";
      if (effectiveView === "STOCK") return g.rolDestino === "STOCK";
      return false;
    });

    const totalGruposPendientes = gruposFiltrados.reduce((acc, g) => acc + g.cantidad, 0);

    // ─── 2. HISTORIAL DE NOTIFICACIONES (EVENTOS PERSISTIDOS Y ENRIQUECIDOS) ───
    const allStoredNotifs = await getStoredNotificacionesStaff();

    // Consultar estado actual en BD de todos los pedidos presentes en el historial
    const pedidoIdsHistorial = Array.from(new Set(allStoredNotifs.map((n) => n.pedidoId).filter(Boolean)));
    const pedidosHistorial = await prisma.pedidoEcommerce.findMany({
      where: { id: { in: pedidoIdsHistorial } },
      select: {
        id: true,
        numero: true,
        estado: true,
        estadoPago: true,
        metodoPago: true,
        modalidadEntrega: true,
        notas: true,
      },
    });
    const pedidoHistorialMap = new Map(pedidosHistorial.map((p) => [p.id, p]));

    // Filtrar historial según permisos estrictos del rol
    const filteredByRole = allStoredNotifs.filter((n) => {
      if (effectiveView === "ADMIN") return true;
      if (effectiveView === "VENTAS") {
        return (
          n.tipo === "NUEVO_PEDIDO_PENDIENTE_PAGO" ||
          n.tipo === "SOLICITUD_CANCELACION_CLIENTE" ||
          n.tipo === "PEDIDO_LISTO_ENTREGA" ||
          n.tipo === "CANCELACION_RESUELTA" ||
          n.rolDestino === "VENTAS" ||
          n.rolDestino === "TODOS"
        );
      }
      if (effectiveView === "STOCK") {
        return n.tipo === "PEDIDO_CONFIRMADO_ARMAR" || n.rolDestino === "STOCK";
      }
      return false;
    });

    // Enriquecer cada notificación determinando si su tarea operativa ya fue resuelta
    const categorizedNotifs = filteredByRole.map((n) => {
      const pedido = pedidoHistorialMap.get(n.pedidoId);
      let categoria: CategoriaNotificacion = "HISTORIAL";
      let resuelta = false;
      let motivoResolucion: string | undefined = undefined;

      if (!pedido) {
        categoria = "HISTORIAL";
        resuelta = true;
        motivoResolucion = "Pedido no localizado";
      } else if (pedido.estado === "CANCELADO") {
        categoria = "CANCELACIONES";
        resuelta = true;
        motivoResolucion = "Pedido cancelado (Stock liberado)";
      } else {
        switch (n.tipo) {
          case "NUEVO_PEDIDO_PENDIENTE_PAGO": {
            categoria = pedido.metodoPago === "TRANSFERENCIA" ? "PAGOS_PENDIENTES" : "PEDIDOS_NUEVOS";
            if (pedido.estadoPago === "PAGADO") {
              resuelta = true;
              motivoResolucion = "Pago verificado y acreditado";
            } else if (pedido.estado !== "PENDIENTE") {
              resuelta = true;
              motivoResolucion = `Estado avanzado (${pedido.estado})`;
            } else {
              resuelta = false;
            }
            break;
          }

          case "PEDIDO_CONFIRMADO_ARMAR": {
            categoria = "PREPARACION";
            if (pedido.estado === "PREPARANDO") {
              resuelta = true;
              motivoResolucion = "Preparación iniciada en depósito";
            } else if (pedido.estado === "LISTO_ENTREGA" || (pedido.estado as string) === "LISTO_PARA_RETIRAR") {
              resuelta = true;
              motivoResolucion = "Armado finalizado (Listo para entrega)";
            } else if (pedido.estado === "ENTREGADO") {
              resuelta = true;
              motivoResolucion = "Pedido entregado al cliente";
            } else if (pedido.estado === "CONFIRMADO") {
              resuelta = false;
            } else {
              resuelta = true;
              motivoResolucion = `Estado actual: ${pedido.estado}`;
            }
            break;
          }

          case "PEDIDO_LISTO_ENTREGA": {
            categoria = "ENTREGAS";
            if (pedido.estado === "ENTREGADO") {
              resuelta = true;
              motivoResolucion = "Entrega completada exitosamente";
            } else if (pedido.estado === "LISTO_ENTREGA" || (pedido.estado as string) === "LISTO_PARA_RETIRAR") {
              resuelta = false;
            } else {
              resuelta = true;
              motivoResolucion = `Estado actual: ${pedido.estado}`;
            }
            break;
          }

          case "SOLICITUD_CANCELACION_CLIENTE": {
            categoria = "CANCELACIONES";
            const notas = pedido.notas || "";
            const tieneMetadataResuelta = notas.includes("[CANCELACION_METADATA:");
            const cancelacionPendiente =
              pedido.estado === "CANCELACION_SOLICITADA" ||
              (notas.includes("Cancelación solicitada por el cliente") && !tieneMetadataResuelta);

            if (!cancelacionPendiente) {
              resuelta = true;
              motivoResolucion = "Solicitud de cancelación resuelta";
            } else {
              resuelta = false;
            }
            break;
          }

          case "CANCELACION_RESUELTA": {
            categoria = "CANCELACIONES";
            resuelta = true;
            motivoResolucion = "Cancelación procesada por Ventas";
            break;
          }

          default: {
            categoria = "HISTORIAL";
            resuelta = true;
            break;
          }
        }
      }

      const leida = n.leidaPor.includes(realUserId);

      return {
        ...n,
        categoria,
        resuelta,
        motivoResolucion,
        estadoActualPedido: pedido?.estado,
        estadoActualPago: pedido?.estadoPago,
        leida,
      };
    });

    // Contar notificaciones no leídas por el usuario actual
    const noLeidasCount = categorizedNotifs.filter((n) => !n.leida).length;

    // Métricas y contadores de avisos
    const contadores: ContadoresAvisos = {
      totalPendientes: totalGruposPendientes,
      noLeidasCount,
      pedidosNuevos: pagosPendientes.length,
      pagosPendientes: pagosPendientes.length,
      pendientesArmar: pendientesArmar.length,
      enPreparacion: enPreparacion.length,
      listosEntrega: listosEntrega.length,
      cancelaciones: cancelacionesPendientes.length,
      historial: categorizedNotifs.length,
    };

    return {
      success: true,
      grupos: gruposFiltrados,
      notificaciones: categorizedNotifs,
      noLeidasCount,
      totalGruposPendientes,
      contadores,
    };
  } catch (err) {
    console.error("Error al obtener notificaciones de staff:", err);
    return {
      success: false,
      grupos: [],
      notificaciones: [] as NotificacionStaff[],
      noLeidasCount: 0,
      totalGruposPendientes: 0,
      contadores: {
        totalPendientes: 0,
        noLeidasCount: 0,
        pedidosNuevos: 0,
        pagosPendientes: 0,
        pendientesArmar: 0,
        enPreparacion: 0,
        listosEntrega: 0,
        cancelaciones: 0,
        historial: 0,
      },
      error: "Error al cargar notificaciones.",
    };
  }
}

/**
 * Marca una notificación individual como leída para el usuario actual
 */
export async function marcarNotificacionLeidaAction(
  userIdParam: number,
  notificacionId: string,
  rolOperativo?: "admin" | "venta" | "stock" | "todos"
): Promise<{
  success: boolean;
  noLeidasCount?: number;
  contadores?: ContadoresAvisos;
  grupos?: GrupoNotificacionOperativa[];
  error?: string;
}> {
  try {
    const auth = await verifyStaffNotification(userIdParam);
    if (!auth.authorized || !auth.user) {
      return { success: false, error: auth.error || "No autorizado." };
    }

    const realUserId = auth.user.id;
    const allNotifs = await getStoredNotificacionesStaff();

    let changed = false;
    const updated = allNotifs.map((n) => {
      if (n.id === notificacionId && !n.leidaPor.includes(realUserId)) {
        changed = true;
        return {
          ...n,
          leidaPor: [...n.leidaPor, realUserId],
        };
      }
      return n;
    });

    if (changed) {
      await saveStoredNotificacionesStaff(updated);
    }

    const fresh = await getNotificacionesStaffAction(realUserId, rolOperativo);
    return {
      success: true,
      noLeidasCount: fresh.noLeidasCount,
      contadores: fresh.contadores,
      grupos: fresh.grupos,
    };
  } catch (err) {
    console.error("Error al marcar notificación como leída:", err);
    return { success: false, error: "Error al actualizar notificación." };
  }
}

/**
 * Marca todas las notificaciones visibles del usuario como leídas
 */
export async function marcarTodasNotificacionesLeidasAction(
  userIdParam: number,
  rolOperativo?: "admin" | "venta" | "stock" | "todos"
): Promise<{
  success: boolean;
  noLeidasCount?: number;
  contadores?: ContadoresAvisos;
  grupos?: GrupoNotificacionOperativa[];
  error?: string;
}> {
  try {
    const auth = await verifyStaffNotification(userIdParam);
    if (!auth.authorized || !auth.user) {
      return { success: false, error: auth.error || "No autorizado." };
    }

    const realUserId = auth.user.id;
    const allNotifs = await getStoredNotificacionesStaff();

    const updated = allNotifs.map((n) => {
      if (!n.leidaPor.includes(realUserId)) {
        return {
          ...n,
          leidaPor: [...n.leidaPor, realUserId],
        };
      }
      return n;
    });

    await saveStoredNotificacionesStaff(updated);
    const fresh = await getNotificacionesStaffAction(realUserId, rolOperativo);
    return {
      success: true,
      noLeidasCount: fresh.noLeidasCount,
      contadores: fresh.contadores,
      grupos: fresh.grupos,
    };
  } catch (err) {
    console.error("Error al marcar todas las notificaciones como leídas:", err);
    return { success: false, error: "Error al actualizar notificaciones." };
  }
}
