import { prisma } from "@/lib/prisma";

export type TipoNotificacionStaff =
  | "NUEVO_PEDIDO_PENDIENTE_PAGO"
  | "PEDIDO_CONFIRMADO_ARMAR"
  | "SOLICITUD_CANCELACION_CLIENTE"
  | "PEDIDO_LISTO_ENTREGA"
  | "CANCELACION_RESUELTA";

export type CategoriaNotificacion =
  | "PEDIDOS_NUEVOS"
  | "PAGOS_PENDIENTES"
  | "PREPARACION"
  | "ENTREGAS"
  | "CANCELACIONES"
  | "HISTORIAL";

export interface ContadoresAvisos {
  totalPendientes: number;
  noLeidasCount: number;
  pedidosNuevos: number;
  pagosPendientes: number;
  pendientesArmar: number;
  enPreparacion: number;
  listosEntrega: number;
  cancelaciones: number;
  historial: number;
}

export interface GrupoNotificacionOperativa {
  id: string;
  clave: "PAGOS_PENDIENTES" | "PENDIENTES_ARMAR" | "EN_PREPARACION" | "LISTOS_ENTREGA" | "CANCELACIONES";
  rolDestino: "VENTAS" | "STOCK" | "ADMIN" | "TODOS";
  titulo: string;
  descripcion: string;
  cantidad: number;
  urgente?: boolean;
  moduloDestino: "pedidos" | "preparacion" | "entrega";
  filtroDestino?: string;
  icono: "CreditCard" | "Package" | "Truck" | "AlertTriangle" | "Clock";
  colorBadge: "amber" | "indigo" | "blue" | "emerald" | "red";
  pedidosIds: number[];
}

export interface NotificacionStaff {
  id: string;
  tipo: TipoNotificacionStaff;
  rolDestino: "VENTAS" | "STOCK" | "ADMIN" | "TODOS";
  titulo: string;
  mensaje: string;
  pedidoId: number;
  pedidoNumero: number;
  moduloDestino: "pedidos" | "estado_pedidos" | "preparacion" | "entrega";
  leidaPor: number[]; // IDs de empleados que ya la leyeron
  creadaEn: string;
  // Campos enriquecidos dinámicamente según el estado real del pedido
  categoria?: CategoriaNotificacion;
  resuelta?: boolean;
  motivoResolucion?: string;
  estadoActualPedido?: string;
  estadoActualPago?: string;
  leida?: boolean; // Booleano para el usuario en sesión
}

/**
 * Lee las notificaciones almacenadas en ConfiguracionEcommerce
 */
export async function getStoredNotificacionesStaff(): Promise<NotificacionStaff[]> {
  try {
    const record = await prisma.configuracionEcommerce.findUnique({
      where: { clave: "notificaciones_staff" },
    });
    if (record?.valor) {
      const parsed = JSON.parse(record.valor);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error al leer notificaciones de staff:", err);
  }
  return [];
}

/**
 * Guarda las notificaciones en ConfiguracionEcommerce (manteniendo hasta 100 recientes)
 */
export async function saveStoredNotificacionesStaff(notificaciones: NotificacionStaff[]): Promise<void> {
  try {
    const limited = notificaciones.slice(0, 100);
    await prisma.configuracionEcommerce.upsert({
      where: { clave: "notificaciones_staff" },
      update: { valor: JSON.stringify(limited) },
      create: { clave: "notificaciones_staff", valor: JSON.stringify(limited) },
    });
  } catch (err) {
    console.error("Error al persistir notificaciones de staff:", err);
  }
}

/**
 * Crea una nueva notificación interna para el personal de Ventas o Stock
 */
export async function crearNotificacionStaffInternal(params: {
  tipo: TipoNotificacionStaff;
  rolDestino: "VENTAS" | "STOCK" | "ADMIN" | "TODOS";
  titulo: string;
  mensaje: string;
  pedidoId: number;
  pedidoNumero: number;
  moduloDestino: "pedidos" | "estado_pedidos" | "preparacion" | "entrega";
}): Promise<void> {
  try {
    const current = await getStoredNotificacionesStaff();

    // Idempotencia: si ya existe una idéntica en los últimos 15 segundos, ignorar
    const fifteenSecondsAgo = Date.now() - 15000;
    const isVeryRecent = current.some((n) => {
      return (
        n.pedidoId === params.pedidoId &&
        n.tipo === params.tipo &&
        new Date(n.creadaEn).getTime() > fifteenSecondsAgo
      );
    });
    if (isVeryRecent) return;

    // Remover notificación anterior del mismo pedido y tipo para no acumular duplicados del mismo asunto
    const cleaned = current.filter((n) => !(n.pedidoId === params.pedidoId && n.tipo === params.tipo));

    const nueva: NotificacionStaff = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tipo: params.tipo,
      rolDestino: params.rolDestino,
      titulo: params.titulo,
      mensaje: params.mensaje,
      pedidoId: params.pedidoId,
      pedidoNumero: params.pedidoNumero,
      moduloDestino: params.moduloDestino,
      leidaPor: [],
      creadaEn: new Date().toISOString(),
    };

    const updated = [nueva, ...cleaned];
    await saveStoredNotificacionesStaff(updated);
  } catch (err) {
    console.error("Error al crear notificación interna de staff:", err);
  }
}
