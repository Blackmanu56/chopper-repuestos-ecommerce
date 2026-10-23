"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/lib/session";
import { registrarAuditoriaAction } from "@/actions/configuracion";
import {
  ResumenFinanciero,
  OperacionFinanciera,
  ReintegroRecord,
  CierreCajaOnline,
  CajaOnlineEstadoData,
  getStoredReintegros,
  saveStoredReintegros,
  getStoredCajaOnlineEstado,
  saveStoredCajaOnlineEstado,
  getStoredCierresCajaOnline,
  saveStoredCierresCajaOnline,
  extractCobroConfirmadoPor,
  OperacionCierreDiario,
  ReintegroCierreDiario,
  CierreDiarioResumen,
  getFechaArgentinaKey,
  getHoyArgentinaKey,
  formatFechaArgentinaTexto,
  formatHoraArgentina,
} from "@/lib/finanzas";

/**
 * Obtiene el resumen de indicadores financieros del e-commerce
 * Validación de seguridad: Requiere sesión de ADMINISTRADOR o ENCARGADO_VENTAS en el servidor.
 */
export async function getResumenFinancieroAction(): Promise<{
  success: boolean;
  resumen?: ResumenFinanciero;
  error?: string;
}> {
  try {
    const auth = await requireStaffSession(["ADMINISTRADOR", "ENCARGADO_VENTAS"]);
    if (!auth.authorized || !auth.user) {
      return { success: false, error: auth.error || "Acceso denegado a Finanzas Online." };
    }

    const [pedidos, reintegros] = await Promise.all([
      prisma.pedidoEcommerce.findMany({
        select: {
          id: true,
          numero: true,
          total: true,
          metodoPago: true,
          estado: true,
          estadoPago: true,
          fechaPago: true,
          notas: true,
        },
      }),
      getStoredReintegros(),
    ]);

    let totalVentasOnline = 0;
    let totalCobrado = 0;
    let totalPendiente = 0;
    let ingresosPorTransferencia = 0;
    let ingresosPorEfectivo = 0;
    let ingresosPorTarjeta = 0;
    let pedidosCanceladosCount = 0;
    let montoCanceladoTotal = 0;
    let pedidosCanceladosPagadosCount = 0;
    let montoCanceladoPagado = 0;
    let reintegrosPendientesCount = 0;
    let montoReintegrosPendientes = 0;
    let reintegrosCompletadosCount = 0;
    let montoReintegrosCompletados = 0;

    const reintegrosMap = new Map<number, ReintegroRecord>();
    for (const r of reintegros) {
      reintegrosMap.set(r.pedidoId, r);
    }

    for (const p of pedidos) {
      const isCancelado = p.estado === "CANCELADO";
      const isPagado = p.estadoPago === "PAGADO";
      const isPendiente = p.estadoPago === "PENDIENTE";
      const metodo = (p.metodoPago || "").toUpperCase().trim();

      // Ventas activas online (órdenes no canceladas)
      if (!isCancelado) {
        totalVentasOnline += p.total;
      }

      // Dinero efectivamente cobrado y acreditado
      if (isPagado) {
        totalCobrado += p.total;
        if (metodo === "TRANSFERENCIA") {
          ingresosPorTransferencia += p.total;
        } else if (metodo === "EFECTIVO_LOCAL") {
          ingresosPorEfectivo += p.total;
        } else if (metodo === "TARJETA") {
          ingresosPorTarjeta += p.total;
        }
      }

      // Pagos pendientes en órdenes activas
      if (isPendiente && !isCancelado) {
        totalPendiente += p.total;
      }

      // Órdenes canceladas y estado de sus reintegros
      if (isCancelado) {
        pedidosCanceladosCount++;
        montoCanceladoTotal += p.total;

        if (isPagado) {
          pedidosCanceladosPagadosCount++;
          montoCanceladoPagado += p.total;

          const r = reintegrosMap.get(p.id) || (p.notas?.includes("[REINTEGRO_REGISTRADO") ? true : false);
          if (r) {
            reintegrosCompletadosCount++;
            montoReintegrosCompletados += p.total;
          } else {
            reintegrosPendientesCount++;
            montoReintegrosPendientes += p.total;
          }
        }
      }
    }

    const resumen: ResumenFinanciero = {
      totalVentasOnline,
      totalCobrado,
      totalPendiente,
      ingresosPorTransferencia,
      ingresosPorEfectivo,
      ingresosPorTarjeta,
      pedidosCanceladosCount,
      montoCanceladoTotal,
      pedidosCanceladosPagadosCount,
      montoCanceladoPagado,
      reintegrosPendientesCount,
      montoReintegrosPendientes,
      reintegrosCompletadosCount,
      montoReintegrosCompletados,
      totalOperaciones: pedidos.length,
    };

    return { success: true, resumen };
  } catch (error) {
    console.error("Error al calcular resumen financiero:", error);
    return { success: false, error: "Error al calcular métricas financieras." };
  }
}

/**
 * Obtiene el listado completo y trazable de operaciones financieras del e-commerce
 */
export async function getOperacionesFinancierasAction(filtros?: {
  periodo?: "TODOS" | "HOY" | "ULTIMOS_7_DIAS" | "ESTE_MES";
  metodoPago?: "TODOS" | "TRANSFERENCIA" | "EFECTIVO_LOCAL" | "TARJETA";
  estadoPago?: "TODOS" | "PAGADO" | "PENDIENTE" | "RECHAZADO";
  estadoPedido?: string;
  busqueda?: string;
  soloPendientesReintegro?: boolean;
}): Promise<{
  success: boolean;
  operaciones?: OperacionFinanciera[];
  error?: string;
}> {
  try {
    const auth = await requireStaffSession(["ADMINISTRADOR", "ENCARGADO_VENTAS"]);
    if (!auth.authorized || !auth.user) {
      return { success: false, error: auth.error || "Acceso denegado a Finanzas Online." };
    }

    const [pedidos, reintegros] = await Promise.all([
      prisma.pedidoEcommerce.findMany({
        orderBy: { creadoEn: "desc" },
        include: {
          items: {
            select: {
              nombre: true,
              cantidad: true,
              precioUnitario: true,
              subtotal: true,
            },
          },
          cliente: {
            select: {
              id: true,
              nombre: true,
              dni: true,
              email: true,
              telefono: true,
            },
          },
        },
      }),
      getStoredReintegros(),
    ]);

    const reintegrosMap = new Map<number, ReintegroRecord>();
    for (const r of reintegros) {
      reintegrosMap.set(r.pedidoId, r);
    }

    const now = new Date();
    const hoyKey = getHoyArgentinaKey();
    const ultimos7Dias = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const esteMesInicio = new Date(now.getFullYear(), now.getMonth(), 1);

    const cleanBusqueda = filtros?.busqueda?.trim().toLowerCase() || "";

    const operaciones: OperacionFinanciera[] = [];

    for (const p of pedidos) {
      const fechaOperacion = p.fechaPago ? new Date(p.fechaPago) : new Date(p.creadoEn);
      const operacionDateKey = p.fechaPago ? getFechaArgentinaKey(p.fechaPago) : getFechaArgentinaKey(p.creadoEn);

      // Filtro de período
      if (filtros?.periodo === "HOY" && operacionDateKey !== hoyKey) continue;
      if (filtros?.periodo === "ULTIMOS_7_DIAS" && fechaOperacion < ultimos7Dias) continue;
      if (filtros?.periodo === "ESTE_MES" && fechaOperacion < esteMesInicio) continue;

      // Filtro de método de pago
      if (filtros?.metodoPago && filtros.metodoPago !== "TODOS" && p.metodoPago !== filtros.metodoPago) {
        continue;
      }

      // Filtro de estado de pago
      if (filtros?.estadoPago && filtros.estadoPago !== "TODOS" && p.estadoPago !== filtros.estadoPago) {
        continue;
      }

      // Filtro de estado de pedido
      if (filtros?.estadoPedido && filtros.estadoPedido !== "TODOS" && p.estado !== filtros.estadoPedido) {
        continue;
      }

      // Búsqueda por pedido o cliente
      if (cleanBusqueda) {
        const numStr = String(p.numero);
        const nomCliente = (p.nombreCliente || "").toLowerCase();
        const dniCliente = (p.dniCliente || "").toLowerCase();
        const matches = numStr.includes(cleanBusqueda) || nomCliente.includes(cleanBusqueda) || dniCliente.includes(cleanBusqueda);
        if (!matches) continue;
      }

      // Análisis de reintegro
      const isCancelado = p.estado === "CANCELADO";
      const isPagado = p.estadoPago === "PAGADO";
      let reintegroInfo: OperacionFinanciera["reintegro"] = null;

      if (isCancelado && isPagado) {
        const reintegroGuardado = reintegrosMap.get(p.id);
        if (reintegroGuardado) {
          reintegroInfo = {
            requiereReintegro: true,
            reintegrado: true,
            monto: reintegroGuardado.monto,
            fechaReintegro: reintegroGuardado.fechaReintegro,
            metodoReintegro: reintegroGuardado.metodoReintegro,
            responsable: reintegroGuardado.responsableNombre,
            comprobanteOReferencia: reintegroGuardado.comprobanteOReferencia,
            motivo: reintegroGuardado.motivo,
          };
        } else if (p.notas?.includes("[REINTEGRO_REGISTRADO")) {
          reintegroInfo = {
            requiereReintegro: true,
            reintegrado: true,
            monto: p.total,
          };
        } else {
          reintegroInfo = {
            requiereReintegro: true,
            reintegrado: false,
            monto: p.total,
          };
        }
      }

      if (filtros?.soloPendientesReintegro && (!reintegroInfo || !reintegroInfo.requiereReintegro || reintegroInfo.reintegrado)) {
        continue;
      }

      const confirmadoPor = extractCobroConfirmadoPor(p.notas);

      operaciones.push({
        id: p.id,
        numero: p.numero,
        fechaCreacion: p.creadoEn.toISOString(),
        fechaPago: p.fechaPago ? p.fechaPago.toISOString() : null,
        cliente: {
          id: p.cliente?.id || null,
          nombre: p.nombreCliente,
          dni: p.dniCliente,
          email: p.emailCliente,
          telefono: p.telefonoCliente,
        },
        metodoPago: p.metodoPago,
        total: p.total,
        costoEnvio: p.costoEnvio,
        estadoPedido: p.estado,
        estadoPago: p.estadoPago,
        comprobanteUrl: p.comprobanteUrl,
        confirmadoPor,
        modalidadEntrega: p.modalidadEntrega,
        reintegro: reintegroInfo,
        items: p.items.map((it) => ({
          nombre: it.nombre,
          cantidad: it.cantidad,
          precioUnitario: it.precioUnitario,
          subtotal: it.subtotal,
        })),
        notas: p.notas,
      });
    }

    return { success: true, operaciones };
  } catch (error) {
    console.error("Error al obtener operaciones financieras:", error);
    return { success: false, error: "Error al cargar el historial financiero." };
  }
}

/**
 * Consulta el estado actual de la Caja Online con métricas en vivo
 */
export async function getCajaOnlineActualAction(): Promise<{
  success: boolean;
  caja?: {
    estado: "OPERATIVA_24_7" | "ABIERTA" | "CERRADA";
    totalEfectivoRecaudado: number;
    totalTransferenciasRecaudado: number;
    totalCobradoOnline: number;
    totalEfectivoHoy: number;
    totalTransferenciasHoy: number;
    totalCobradoHoy: number;
    pedidosCobradosCount: number;
    apertura?: {
      id: string;
      fechaApertura: string;
      abiertoPor: string;
      saldoInicialEfectivo: number;
      observaciones?: string;
      totalEfectivoRecaudado: number;
      totalTransferenciasRecaudado: number;
      totalEfectivoEsperado: number;
      pedidosCobradosCount: number;
      pedidosIds: number[];
    } | null;
    ultimoCierre?: CierreCajaOnline | null;
  };
  error?: string;
}> {
  try {
    const auth = await requireStaffSession(["ADMINISTRADOR", "ENCARGADO_VENTAS"]);
    if (!auth.authorized) {
      return { success: false, error: auth.error || "No autorizado." };
    }

    const [estadoCaja, cierres, todosCobros] = await Promise.all([
      getStoredCajaOnlineEstado(),
      getStoredCierresCajaOnline(),
      prisma.pedidoEcommerce.findMany({
        where: { estadoPago: "PAGADO" },
        select: { id: true, total: true, metodoPago: true, fechaPago: true },
      }),
    ]);

    const ultimoCierre = cierres.length > 0 ? cierres[0] : null;

    const hoyKey = getHoyArgentinaKey();

    let totalEfectivoRecaudado = 0;
    let totalTransferenciasRecaudado = 0;
    let totalCobradoOnline = 0;
    let totalEfectivoHoy = 0;
    let totalTransferenciasHoy = 0;
    let totalCobradoHoy = 0;

    for (const c of todosCobros) {
      totalCobradoOnline += c.total;
      const isHoy = c.fechaPago ? getFechaArgentinaKey(c.fechaPago) === hoyKey : false;

      if (c.metodoPago === "EFECTIVO_LOCAL") {
        totalEfectivoRecaudado += c.total;
        if (isHoy) totalEfectivoHoy += c.total;
      } else if (c.metodoPago === "TRANSFERENCIA") {
        totalTransferenciasRecaudado += c.total;
        if (isHoy) totalTransferenciasHoy += c.total;
      }

      if (isHoy) {
        totalCobradoHoy += c.total;
      }
    }

    // Datos de apertura histórica si existe
    let apertura = null;
    if (estadoCaja.aperturaActual) {
      apertura = {
        id: estadoCaja.aperturaActual.id,
        fechaApertura: estadoCaja.aperturaActual.fechaApertura,
        abiertoPor: `${estadoCaja.aperturaActual.abiertoPorNombre} (${estadoCaja.aperturaActual.abiertoPorRol})`,
        saldoInicialEfectivo: estadoCaja.aperturaActual.saldoInicialEfectivo,
        observaciones: estadoCaja.aperturaActual.observaciones,
        totalEfectivoRecaudado,
        totalTransferenciasRecaudado,
        totalEfectivoEsperado: estadoCaja.aperturaActual.saldoInicialEfectivo + totalEfectivoRecaudado,
        pedidosCobradosCount: todosCobros.length,
        pedidosIds: todosCobros.map((x) => x.id),
      };
    }

    return {
      success: true,
      caja: {
        estado: "OPERATIVA_24_7",
        totalEfectivoRecaudado,
        totalTransferenciasRecaudado,
        totalCobradoOnline,
        totalEfectivoHoy,
        totalTransferenciasHoy,
        totalCobradoHoy,
        pedidosCobradosCount: todosCobros.length,
        apertura,
        ultimoCierre,
      },
    };
  } catch (error) {
    console.error("Error al obtener estado de caja online:", error);
    return { success: false, error: "Error al consultar estado de Caja Online." };
  }
}

/**
 * Abre una nueva sesión de Caja Online independiente para el e-commerce
 */
export async function abrirCajaOnlineAction(input: {
  saldoInicialEfectivo: number;
  observaciones?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireStaffSession(["ADMINISTRADOR", "ENCARGADO_VENTAS"]);
    if (!auth.authorized || !auth.user) {
      return { success: false, error: auth.error || "No autorizado para abrir caja." };
    }

    const actual = await getStoredCajaOnlineEstado();
    if (actual.estado === "ABIERTA") {
      return { success: false, error: "La Caja Online ya se encuentra abierta. Realizá el cierre previo antes de una nueva apertura." };
    }

    const saldoInicial = Math.max(0, Number(input.saldoInicialEfectivo || 0));

    const nuevaApertura: CajaOnlineEstadoData = {
      estado: "ABIERTA",
      aperturaActual: {
        id: `caja-${Date.now()}`,
        fechaApertura: new Date().toISOString(),
        abiertoPorId: auth.user.id,
        abiertoPorNombre: auth.user.nombreCompleto || auth.nombre || "Personal",
        abiertoPorRol: auth.user.rol || auth.rol || "ENCARGADO_VENTAS",
        saldoInicialEfectivo: saldoInicial,
        observaciones: input.observaciones?.trim() || undefined,
      },
    };

    await saveStoredCajaOnlineEstado(nuevaApertura);

    await registrarAuditoriaAction(
      nuevaApertura.aperturaActual!.abiertoPorNombre,
      `Apertura de Caja Online con saldo inicial de $${saldoInicial.toLocaleString("es-AR")}`,
      "Finanzas"
    );

    try {
      revalidatePath("/panel");
    } catch {}

    return { success: true };
  } catch (error) {
    console.error("Error al abrir caja online:", error);
    return { success: false, error: "Error al procesar la apertura de caja." };
  }
}

/**
 * Realiza el cierre seguro de la Caja Online con balance y cálculo de diferencias
 */
export async function cerrarCajaOnlineAction(input: {
  efectivoRealContado: number;
  observaciones?: string;
}): Promise<{
  success: boolean;
  cierre?: CierreCajaOnline;
  error?: string;
}> {
  try {
    const auth = await requireStaffSession(["ADMINISTRADOR", "ENCARGADO_VENTAS"]);
    if (!auth.authorized || !auth.user) {
      return { success: false, error: auth.error || "No autorizado para cerrar caja." };
    }

    const actual = await getStoredCajaOnlineEstado();
    if (actual.estado !== "ABIERTA" || !actual.aperturaActual) {
      return { success: false, error: "No hay ninguna Caja Online abierta para cerrar." };
    }

    const ap = actual.aperturaActual;
    const fechaApertura = new Date(ap.fechaApertura);
    const fechaCierre = new Date();

    const cobrosSesion = await prisma.pedidoEcommerce.findMany({
      where: {
        estadoPago: "PAGADO",
        fechaPago: {
          gte: fechaApertura,
          lte: fechaCierre,
        },
      },
      select: {
        id: true,
        total: true,
        metodoPago: true,
      },
    });

    let totalEfectivoRecaudado = 0;
    let totalTransferenciasRecaudado = 0;
    const pedidosIds: number[] = [];

    for (const c of cobrosSesion) {
      pedidosIds.push(c.id);
      if (c.metodoPago === "EFECTIVO_LOCAL") {
        totalEfectivoRecaudado += c.total;
      } else if (c.metodoPago === "TRANSFERENCIA") {
        totalTransferenciasRecaudado += c.total;
      }
    }

    const totalEfectivoEsperado = ap.saldoInicialEfectivo + totalEfectivoRecaudado;
    const totalEfectivoReal = Math.max(0, Number(input.efectivoRealContado || 0));
    const diferenciaEfectivo = totalEfectivoReal - totalEfectivoEsperado;

    const cerradoPorNombre = auth.user.nombreCompleto || auth.nombre || "Personal";
    const cerradoPorRol = auth.user.rol || auth.rol || "ENCARGADO_VENTAS";

    const nuevoCierre: CierreCajaOnline = {
      id: `cierre-${Date.now()}`,
      fechaApertura: ap.fechaApertura,
      fechaCierre: fechaCierre.toISOString(),
      abiertoPor: `${ap.abiertoPorNombre} (${ap.abiertoPorRol})`,
      cerradoPor: `${cerradoPorNombre} (${cerradoPorRol})`,
      saldoInicialEfectivo: ap.saldoInicialEfectivo,
      totalEfectivoRecaudado,
      totalTransferenciasRecaudado,
      totalEfectivoEsperado,
      totalEfectivoReal,
      diferenciaEfectivo,
      pedidosCobradosIds: pedidosIds,
      observaciones: input.observaciones?.trim() || "Cierre de caja regular",
    };

    // Actualizar historial y marcar cerrada
    const cierresPrevios = await getStoredCierresCajaOnline();
    await saveStoredCierresCajaOnline([nuevoCierre, ...cierresPrevios]);
    await saveStoredCajaOnlineEstado({ estado: "CERRADA", aperturaActual: null });

    const diffStr = diferenciaEfectivo === 0
      ? "Caja exacta"
      : diferenciaEfectivo > 0
      ? `Sobrante de $${diferenciaEfectivo.toLocaleString("es-AR")}`
      : `Faltante de $${Math.abs(diferenciaEfectivo).toLocaleString("es-AR")}`;

    await registrarAuditoriaAction(
      cerradoPorNombre,
      `Cierre de Caja Online: Efectivo contado $${totalEfectivoReal.toLocaleString("es-AR")} (${diffStr}). Transf: $${totalTransferenciasRecaudado.toLocaleString("es-AR")}`,
      "Finanzas"
    );

    try {
      revalidatePath("/panel");
    } catch {}

    return { success: true, cierre: nuevoCierre };
  } catch (error) {
    console.error("Error al cerrar caja online:", error);
    return { success: false, error: "Error al procesar el cierre de caja." };
  }
}

/**
 * Consulta el historial de cierres de la Caja Online
 */
export async function getHistorialCierresCajaOnlineAction(): Promise<{
  success: boolean;
  cierres?: CierreCajaOnline[];
  error?: string;
}> {
  try {
    const auth = await requireStaffSession(["ADMINISTRADOR", "ENCARGADO_VENTAS"]);
    if (!auth.authorized) {
      return { success: false, error: auth.error || "No autorizado." };
    }

    const cierres = await getStoredCierresCajaOnline();
    return { success: true, cierres };
  } catch (error) {
    console.error("Error al consultar historial de cierres:", error);
    return { success: false, error: "Error al consultar historial de cierres." };
  }
}

/**
 * Registra un reintegro comercial para un pedido cancelado que ya había sido cobrado
 */
export async function registrarReintegroPedidoAction(input: {
  pedidoId: number;
  monto: number;
  metodoReintegro: "TRANSFERENCIA" | "EFECTIVO_MOSTRADOR";
  comprobanteOReferencia: string;
  motivo: string;
}): Promise<{
  success: boolean;
  reintegro?: ReintegroRecord;
  error?: string;
}> {
  try {
    const auth = await requireStaffSession(["ADMINISTRADOR", "ENCARGADO_VENTAS"]);
    if (!auth.authorized || !auth.user) {
      return { success: false, error: auth.error || "No autorizado para registrar reintegros." };
    }

    const pedido = await prisma.pedidoEcommerce.findUnique({
      where: { id: input.pedidoId },
    });

    if (!pedido) {
      return { success: false, error: "Pedido no encontrado." };
    }

    if (pedido.estado !== "CANCELADO") {
      return { success: false, error: "Solo se pueden registrar reintegros para pedidos en estado CANCELADO." };
    }

    if (pedido.estadoPago !== "PAGADO") {
      return { success: false, error: "El pedido no registra pagos confirmados para reintegrar." };
    }

    // Verificar si ya fue reintegrado
    const reintegrosPrevios = await getStoredReintegros();
    const yaExiste = reintegrosPrevios.some((r) => r.pedidoId === pedido.id);
    if (yaExiste || pedido.notas?.includes("[REINTEGRO_REGISTRADO")) {
      return { success: false, error: "Este pedido ya cuenta con un reintegro registrado previamente." };
    }

    const cleanMonto = Number(input.monto);
    if (isNaN(cleanMonto) || cleanMonto <= 0) {
      return { success: false, error: "El monto a reintegrar debe ser mayor a 0." };
    }

    if (cleanMonto > pedido.total) {
      return { success: false, error: `El monto a reintegrar ($${cleanMonto.toLocaleString("es-AR")}) no puede superar el total del pedido ($${pedido.total.toLocaleString("es-AR")}).` };
    }

    const cleanRef = (input.comprobanteOReferencia || "").trim();
    if (!cleanRef) {
      return { success: false, error: "Es obligatorio registrar el comprobante o código de referencia del reintegro." };
    }

    const cleanMotivo = (input.motivo || "").trim();
    if (!cleanMotivo) {
      return { success: false, error: "Ingresá el motivo o justificación del reintegro comercial." };
    }

    const staffNombre = auth.user.nombreCompleto || auth.nombre || "Ventas";
    const staffRol = auth.user.rol || auth.rol || "ENCARGADO_VENTAS";

    const nuevoReintegro: ReintegroRecord = {
      pedidoId: pedido.id,
      pedidoNumero: pedido.numero,
      monto: cleanMonto,
      metodoReintegro: input.metodoReintegro,
      comprobanteOReferencia: cleanRef,
      motivo: cleanMotivo,
      responsableId: auth.user.id,
      responsableNombre: staffNombre,
      responsableRol: staffRol,
      fechaReintegro: new Date().toISOString(),
    };

    // Anotar de forma inmutable en el pedido con lock condicional para evitar concurrencia
    const logReintegro = `[REINTEGRO_REGISTRADO: Monto=$${cleanMonto.toLocaleString("es-AR")} | Método=${input.metodoReintegro} | Ref=${cleanRef} | Motivo="${cleanMotivo}" | Por=${staffNombre} (${staffRol}) el ${new Date().toLocaleDateString("es-AR")}]`;
    const notasActualizadas = pedido.notas ? `${pedido.notas} | ${logReintegro}` : logReintegro;

    const lockResult = await prisma.pedidoEcommerce.updateMany({
      where: {
        id: pedido.id,
        estado: "CANCELADO",
        estadoPago: "PAGADO",
        NOT: {
          notas: { contains: "[REINTEGRO_REGISTRADO" },
        },
      },
      data: {
        notas: notasActualizadas,
      },
    });

    if (lockResult.count === 0) {
      return { success: false, error: "Este pedido ya cuenta con un reintegro registrado previamente o en proceso." };
    }

    // Actualizar registro en ConfiguracionEcommerce
    const reintegrosActuales = await getStoredReintegros();
    if (!reintegrosActuales.some((r) => r.pedidoId === pedido.id)) {
      await saveStoredReintegros([nuevoReintegro, ...reintegrosActuales]);
    }

    await registrarAuditoriaAction(
      staffNombre,
      `Reintegro de $${cleanMonto.toLocaleString("es-AR")} registrado para #ORD-${pedido.numero} (${input.metodoReintegro} - Ref: ${cleanRef})`,
      "Finanzas"
    );

    try {
      revalidatePath("/panel");
      revalidatePath("/mis-pedidos");
    } catch {}

    return { success: true, reintegro: nuevoReintegro };
  } catch (error) {
    console.error("Error al registrar reintegro:", error);
    return { success: false, error: "Error al procesar el reintegro." };
  }
}

/**
 * Consulta el historial de cierres contables diarios de Finanzas Online.
 * Particiona automáticamente las operaciones por día (00:00:00 a 23:59:59 America/Argentina/Buenos_Aires)
 * utilizando la fecha de confirmación efectiva del cobro (fechaPago).
 */
export async function getCierresDiariosAction(filtros?: {
  fechaDesde?: string; // "YYYY-MM-DD"
  fechaHasta?: string; // "YYYY-MM-DD"
  estado?: "TODOS" | "EN_CURSO" | "CERRADA";
  busqueda?: string;
}): Promise<{
  success: boolean;
  cierres?: CierreDiarioResumen[];
  cierreActual?: CierreDiarioResumen;
  error?: string;
}> {
  try {
    const auth = await requireStaffSession(["ADMINISTRADOR", "ENCARGADO_VENTAS"]);
    if (!auth.authorized) {
      return { success: false, error: auth.error || "No autorizado para consultar cierres contables." };
    }

    const [pedidosCobrados, reintegros] = await Promise.all([
      prisma.pedidoEcommerce.findMany({
        where: {
          estadoPago: "PAGADO",
          fechaPago: { not: null },
        },
        select: {
          id: true,
          numero: true,
          total: true,
          metodoPago: true,
          fechaPago: true,
          nombreCliente: true,
          notas: true,
        },
        orderBy: { fechaPago: "desc" },
      }),
      getStoredReintegros(),
    ]);

    const hoyKey = getHoyArgentinaKey();

    // Agrupadores por día (clave YYYY-MM-DD en Argentina)
    const diasMap = new Map<
      string,
      {
        operaciones: OperacionCierreDiario[];
        reintegros: ReintegroCierreDiario[];
        totalTransferencias: number;
        totalEfectivo: number;
        totalTarjeta: number;
        totalBruto: number;
        totalDevoluciones: number;
      }
    >();

    // Inicializar siempre la jornada de hoy (incluso si aún no tiene cobros)
    diasMap.set(hoyKey, {
      operaciones: [],
      reintegros: [],
      totalTransferencias: 0,
      totalEfectivo: 0,
      totalTarjeta: 0,
      totalBruto: 0,
      totalDevoluciones: 0,
    });

    // Agrupar cobros confirmados por su fechaPago efectiva
    for (const p of pedidosCobrados) {
      if (!p.fechaPago) continue;
      const dayKey = getFechaArgentinaKey(p.fechaPago);

      let group = diasMap.get(dayKey);
      if (!group) {
        group = {
          operaciones: [],
          reintegros: [],
          totalTransferencias: 0,
          totalEfectivo: 0,
          totalTarjeta: 0,
          totalBruto: 0,
          totalDevoluciones: 0,
        };
        diasMap.set(dayKey, group);
      }

      const metodo = (p.metodoPago || "").toUpperCase().trim();
      if (metodo === "TRANSFERENCIA") {
        group.totalTransferencias += p.total;
      } else if (metodo === "EFECTIVO_LOCAL") {
        group.totalEfectivo += p.total;
      } else if (metodo === "TARJETA") {
        group.totalTarjeta += p.total;
      }
      group.totalBruto += p.total;

      const confirmadoPor = extractCobroConfirmadoPor(p.notas);

      group.operaciones.push({
        pedidoId: p.id,
        pedidoNumero: p.numero,
        fechaPago: p.fechaPago.toISOString(),
        horaPago: formatHoraArgentina(p.fechaPago),
        metodoPago: p.metodoPago,
        clienteNombre: p.nombreCliente || "Cliente",
        total: p.total,
        confirmadoPor,
      });
    }

    // Agrupar reintegros comerciales registrados por su fechaReintegro
    for (const r of reintegros) {
      if (!r.fechaReintegro) continue;
      const dayKey = getFechaArgentinaKey(r.fechaReintegro);

      let group = diasMap.get(dayKey);
      if (!group) {
        group = {
          operaciones: [],
          reintegros: [],
          totalTransferencias: 0,
          totalEfectivo: 0,
          totalTarjeta: 0,
          totalBruto: 0,
          totalDevoluciones: 0,
        };
        diasMap.set(dayKey, group);
      }

      group.totalDevoluciones += r.monto;
      group.reintegros.push({
        pedidoId: r.pedidoId,
        pedidoNumero: r.pedidoNumero,
        monto: r.monto,
        metodoReintegro: r.metodoReintegro,
        comprobanteOReferencia: r.comprobanteOReferencia,
        motivo: r.motivo,
        fechaReintegro: r.fechaReintegro,
        responsable: r.responsableNombre,
      });
    }

    // Construir los DTOs de CierreDiarioResumen ordenados descendentes
    const keysSortedDesc = Array.from(diasMap.keys()).sort((a, b) => b.localeCompare(a));

    const allCierres: CierreDiarioResumen[] = keysSortedDesc.map((dayKey) => {
      const g = diasMap.get(dayKey)!;
      const isHoy = dayKey === hoyKey;
      const { fechaCorta, fechaLarga } = formatFechaArgentinaTexto(dayKey);

      return {
        fechaKey: dayKey,
        fechaFormateada: fechaCorta,
        fechaTexto: fechaLarga,
        periodoInicio: "00:00:00",
        periodoFin: isHoy ? "En curso" : "23:59:59",
        estado: isHoy ? "EN_CURSO" : "CERRADA",
        pedidosCobradosCount: g.operaciones.length,
        totalBruto: g.totalBruto,
        totalTransferencias: g.totalTransferencias,
        totalEfectivo: g.totalEfectivo,
        totalTarjeta: g.totalTarjeta,
        totalDevoluciones: g.totalDevoluciones,
        totalNeto: Math.max(0, g.totalBruto - g.totalDevoluciones),
        reintegrosCount: g.reintegros.length,
        operaciones: g.operaciones,
        reintegros: g.reintegros,
      };
    });

    const cierreActual = allCierres.find((c) => c.fechaKey === hoyKey);

    // Aplicar filtros opcionales
    let filtered = allCierres;

    if (filtros?.estado && filtros.estado !== "TODOS") {
      filtered = filtered.filter((c) => c.estado === filtros.estado);
    }

    if (filtros?.fechaDesde) {
      filtered = filtered.filter((c) => c.fechaKey >= filtros.fechaDesde!);
    }

    if (filtros?.fechaHasta) {
      filtered = filtered.filter((c) => c.fechaKey <= filtros.fechaHasta!);
    }

    if (filtros?.busqueda) {
      const q = filtros.busqueda.trim().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.fechaKey.includes(q) ||
          c.fechaFormateada.includes(q) ||
          c.fechaTexto.toLowerCase().includes(q) ||
          c.operaciones.some(
            (op) =>
              String(op.pedidoNumero).includes(q) ||
              op.clienteNombre.toLowerCase().includes(q) ||
              op.metodoPago.toLowerCase().includes(q)
          )
      );
    }

    return {
      success: true,
      cierres: filtered,
      cierreActual,
    };
  } catch (error) {
    console.error("Error al obtener cierres diarios:", error);
    return { success: false, error: "Error al calcular el historial de cierres diarios." };
  }
}

/**
 * Consulta el detalle completo de un cierre diario específico por su fechaKey (YYYY-MM-DD)
 */
export async function getDetalleCierreDiarioAction(fechaKey: string): Promise<{
  success: boolean;
  cierre?: CierreDiarioResumen;
  error?: string;
}> {
  try {
    const res = await getCierresDiariosAction({ fechaDesde: fechaKey, fechaHasta: fechaKey });
    if (!res.success || !res.cierres) {
      return { success: false, error: res.error || "No se pudo obtener el cierre." };
    }
    const found = res.cierres.find((c) => c.fechaKey === fechaKey);
    if (!found) {
      const { fechaCorta, fechaLarga } = formatFechaArgentinaTexto(fechaKey);
      const isHoy = fechaKey === getHoyArgentinaKey();
      return {
        success: true,
        cierre: {
          fechaKey,
          fechaFormateada: fechaCorta,
          fechaTexto: fechaLarga,
          periodoInicio: "00:00:00",
          periodoFin: isHoy ? "En curso" : "23:59:59",
          estado: isHoy ? "EN_CURSO" : "CERRADA",
          pedidosCobradosCount: 0,
          totalBruto: 0,
          totalTransferencias: 0,
          totalEfectivo: 0,
          totalTarjeta: 0,
          totalDevoluciones: 0,
          totalNeto: 0,
          reintegrosCount: 0,
          operaciones: [],
          reintegros: [],
        },
      };
    }
    return { success: true, cierre: found };
  } catch (error) {
    console.error("Error al obtener detalle de cierre diario:", error);
    return { success: false, error: "Error al recuperar el detalle del cierre diario." };
  }
}
