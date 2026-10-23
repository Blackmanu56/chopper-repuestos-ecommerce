import { prisma } from "@/lib/prisma";

export interface ReintegroRecord {
  pedidoId: number;
  pedidoNumero: number;
  monto: number;
  metodoReintegro: "TRANSFERENCIA" | "EFECTIVO_MOSTRADOR";
  comprobanteOReferencia: string;
  motivo: string;
  responsableId: number;
  responsableNombre: string;
  responsableRol: string;
  fechaReintegro: string;
}

export interface CierreCajaOnline {
  id: string;
  fechaApertura: string;
  fechaCierre: string;
  abiertoPor: string;
  cerradoPor: string;
  saldoInicialEfectivo: number;
  totalEfectivoRecaudado: number;
  totalTransferenciasRecaudado: number;
  totalEfectivoEsperado: number;
  totalEfectivoReal: number;
  diferenciaEfectivo: number;
  pedidosCobradosIds: number[];
  observaciones: string;
}

export interface CajaOnlineEstadoData {
  estado: "ABIERTA" | "CERRADA";
  aperturaActual: {
    id: string;
    fechaApertura: string;
    abiertoPorId: number;
    abiertoPorNombre: string;
    abiertoPorRol: string;
    saldoInicialEfectivo: number;
    observaciones?: string;
  } | null;
}

export interface ReintegroInfo {
  requiereReintegro: boolean;
  reintegrado: boolean;
  monto?: number;
  fechaReintegro?: string;
  metodoReintegro?: string;
  responsable?: string;
  comprobanteOReferencia?: string;
  motivo?: string;
}

export interface OperacionFinanciera {
  id: number;
  numero: number;
  fechaCreacion: string;
  fechaPago: string | null;
  cliente: {
    id: number | null;
    nombre: string;
    dni: string;
    email: string | null;
    telefono: string | null;
  };
  metodoPago: string;
  total: number;
  costoEnvio: number;
  estadoPedido: string;
  estadoPago: string;
  comprobanteUrl: string | null;
  confirmadoPor: string | null;
  modalidadEntrega: string;
  reintegro: ReintegroInfo | null;
  items: Array<{
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
  notas: string | null;
}

export interface ResumenFinanciero {
  totalVentasOnline: number; // Monto de ventas activas (no canceladas)
  totalCobrado: number; // Monto efectivamente acreditado/cobrado
  totalPendiente: number; // Pagos pendientes de cobrar (pedidos activos no cancelados)
  ingresosPorTransferencia: number;
  ingresosPorEfectivo: number;
  ingresosPorTarjeta: number;
  pedidosCanceladosCount: number;
  montoCanceladoTotal: number;
  pedidosCanceladosPagadosCount: number;
  montoCanceladoPagado: number;
  reintegrosPendientesCount: number;
  montoReintegrosPendientes: number;
  reintegrosCompletadosCount: number;
  montoReintegrosCompletados: number;
  totalOperaciones: number;
}

/**
 * Lee el registro histórico de reintegros desde ConfiguracionEcommerce
 */
export async function getStoredReintegros(): Promise<ReintegroRecord[]> {
  try {
    const record = await prisma.configuracionEcommerce.findUnique({
      where: { clave: "reintegros_pedidos_log" },
    });
    if (record?.valor) {
      const parsed = JSON.parse(record.valor);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error("Error al leer reintegros de ConfiguracionEcommerce:", err);
  }
  return [];
}

/**
 * Guarda el registro histórico de reintegros
 */
export async function saveStoredReintegros(reintegros: ReintegroRecord[]): Promise<void> {
  try {
    await prisma.configuracionEcommerce.upsert({
      where: { clave: "reintegros_pedidos_log" },
      update: { valor: JSON.stringify(reintegros) },
      create: { clave: "reintegros_pedidos_log", valor: JSON.stringify(reintegros) },
    });
  } catch (err) {
    console.error("Error al persistir reintegros:", err);
  }
}

/**
 * Lee el estado actual de la Caja Online
 */
export async function getStoredCajaOnlineEstado(): Promise<CajaOnlineEstadoData> {
  try {
    const record = await prisma.configuracionEcommerce.findUnique({
      where: { clave: "caja_online_estado" },
    });
    if (record?.valor) {
      return JSON.parse(record.valor);
    }
  } catch (err) {
    console.error("Error al leer estado de Caja Online:", err);
  }
  return { estado: "CERRADA", aperturaActual: null };
}

/**
 * Guarda el estado actual de la Caja Online
 */
export async function saveStoredCajaOnlineEstado(data: CajaOnlineEstadoData): Promise<void> {
  try {
    await prisma.configuracionEcommerce.upsert({
      where: { clave: "caja_online_estado" },
      update: { valor: JSON.stringify(data) },
      create: { clave: "caja_online_estado", valor: JSON.stringify(data) },
    });
  } catch (err) {
    console.error("Error al persistir estado de Caja Online:", err);
  }
}

/**
 * Lee el historial de cierres de la Caja Online
 */
export async function getStoredCierresCajaOnline(): Promise<CierreCajaOnline[]> {
  try {
    const record = await prisma.configuracionEcommerce.findUnique({
      where: { clave: "caja_online_cierres" },
    });
    if (record?.valor) {
      const parsed = JSON.parse(record.valor);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error("Error al leer historial de cierres de Caja Online:", err);
  }
  return [];
}

/**
 * Guarda el historial de cierres de la Caja Online (hasta 200 cierres recientes)
 */
export async function saveStoredCierresCajaOnline(cierres: CierreCajaOnline[]): Promise<void> {
  try {
    const limited = cierres.slice(0, 200);
    await prisma.configuracionEcommerce.upsert({
      where: { clave: "caja_online_cierres" },
      update: { valor: JSON.stringify(limited) },
      create: { clave: "caja_online_cierres", valor: JSON.stringify(limited) },
    });
  } catch (err) {
    console.error("Error al persistir historial de cierres de Caja Online:", err);
  }
}

/**
 * Extrae el empleado que confirmó el cobro o transferencia a partir del historial en notas
 */
export function extractCobroConfirmadoPor(notas: string | null): string | null {
  if (!notas) return null;

  // Caso 1: Cobro en efectivo registrado en mostrador por Juan Pérez (ENCARGADO_VENTAS)
  const matchEfectivo = notas.match(/registrado en mostrador por\s+([^,.:\[\]()]+?)(?:\s*\(|\s+el\s+|$|[,.])/i);
  if (matchEfectivo && matchEfectivo[1] && matchEfectivo[1].trim()) {
    return matchEfectivo[1].trim();
  }

  // Caso 2: Pago aprobado por Juan Pérez (ENCARGADO_VENTAS)
  const matchAprobado = notas.match(/Pago aprobado por\s+([^,.:\[\]()]+?)(?:\s*\(|\s+tras\s+|\s+el\s+|$|[,.])/i);
  if (matchAprobado && matchAprobado[1] && matchAprobado[1].trim()) {
    return matchAprobado[1].trim();
  }

  return null;
}

// ════════════════════════════════════════════════════════════════════════════════════
// CIERRE DIARIO AUTOMÁTICO DE FINANZAS ONLINE (Zona horaria: America/Argentina/Buenos_Aires)
// ════════════════════════════════════════════════════════════════════════════════════

export interface OperacionCierreDiario {
  pedidoId: number;
  pedidoNumero: number;
  fechaPago: string; // ISO string
  horaPago: string; // ej: "14:32 hs"
  metodoPago: string;
  clienteNombre: string;
  total: number;
  confirmadoPor: string | null;
}

export interface ReintegroCierreDiario {
  pedidoId: number;
  pedidoNumero: number;
  monto: number;
  metodoReintegro: string;
  comprobanteOReferencia: string;
  motivo: string;
  fechaReintegro: string;
  responsable: string;
}

export interface CierreDiarioResumen {
  fechaKey: string; // "YYYY-MM-DD"
  fechaFormateada: string; // "24/10/2026"
  fechaTexto: string; // "Sábado, 24 de octubre de 2026"
  periodoInicio: string; // "00:00:00"
  periodoFin: string; // "23:59:59" o "En curso"
  estado: "EN_CURSO" | "CERRADA";
  pedidosCobradosCount: number;
  totalBruto: number;
  totalTransferencias: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalDevoluciones: number;
  totalNeto: number;
  reintegrosCount: number;
  operaciones: OperacionCierreDiario[];
  reintegros: ReintegroCierreDiario[];
}

/**
 * Convierte una fecha a la clave de día en formato YYYY-MM-DD en zona horaria America/Argentina/Buenos_Aires
 */
export function getFechaArgentinaKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d);
}

/**
 * Devuelve la clave de la jornada de hoy en Argentina (YYYY-MM-DD)
 */
export function getHoyArgentinaKey(): string {
  return getFechaArgentinaKey(new Date());
}

/**
 * Formatea una fecha YYYY-MM-DD a texto legible en español argentino
 */
export function formatFechaArgentinaTexto(fechaKey: string): { fechaCorta: string; fechaLarga: string } {
  const [year, month, day] = fechaKey.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, 15, 0, 0));

  const fechaCorta = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;

  const formatterLargo = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const texto = formatterLargo.format(d);
  const fechaLarga = texto.charAt(0).toUpperCase() + texto.slice(1);

  return { fechaCorta, fechaLarga };
}

/**
 * Formatea la hora de una fecha en formato 24hs argentino (ej: "14:35 hs")
 */
export function formatHoraArgentina(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${formatter.format(d)} hs`;
}
