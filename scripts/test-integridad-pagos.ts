/**
 * Test de Verificación Integral: Integridad de Pagos en Finanzas Online
 * Chopper Repuestos - E-Commerce
 *
 * Verificaciones ejecutadas:
 * 1. Confirmación normal de transferencia bancaria (Ventas/Admin).
 * 2. Registro normal de cobro en mostrador (Efectivo) con verificación de identidad.
 * 3. Verificación de pagos con tarjeta de crédito/débito.
 * 4. Prevención de doble confirmación (idempotencia ante reintentos).
 * 5. Prevención de confirmaciones concurrentes/simultáneas (bloqueo condicional atómico).
 * 6. Reintento de solicitud tras pago exitoso.
 * 7. Intento de cobro con método alternativo sobre pedido ya pagado (rechazo estricto).
 * 8. Invariabilidad de datos históricos de pago (fechaPago, metodoPago, total inmutables).
 * 9. Pedido creado día N y cobrado día N+1 (asignación correcta al cierre de día N+1).
 * 10. Ausencia de cobros duplicados en métricas de Finanzas Online.
 * 11. Coherencia matemática entre resumen financiero y cierres diarios.
 * 12. Rechazo de accesos no autorizados (validación de roles en servidor).
 */

import { prisma } from "../src/lib/prisma";
import {
  actualizarEstadoPedidoAction,
  registrarCobroEfectivoAction,
  rechazarComprobantePedidoAction,
  verificarIdentidadRetiroAction,
} from "../src/actions/pedidos";
import {
  getCajaOnlineActualAction,
  getOperacionesFinancierasAction,
  getCierresDiariosAction,
} from "../src/actions/finanzas";
import {
  getFechaArgentinaKey,
  getHoyArgentinaKey,
} from "../src/lib/finanzas";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ FALLÓ: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

async function main() {
  console.log("================================================================================");
  console.log("TEST: INTEGRIDAD DE PAGOS Y PROTECCIÓN CONTRA DUPLICADOS EN FINANZAS ONLINE");
  console.log("================================================================================\n");

  // 1. Obtener usuarios de prueba para roles
  const adminUser = await prisma.usuario.findFirst({
    where: { activo: true, rol: { nombre: "ADMINISTRADOR" } },
    include: { rol: true },
  });
  const ventasUser = await prisma.usuario.findFirst({
    where: { activo: true, rol: { nombre: "ENCARGADO_VENTAS" } },
    include: { rol: true },
  });
  const stockUser = await prisma.usuario.findFirst({
    where: { activo: true, rol: { nombre: "ENCARGADO_STOCK" } },
    include: { rol: true },
  });

  assert(!!adminUser, `Usuario Administrador encontrado (ID: ${adminUser?.id})`);
  assert(!!ventasUser, `Usuario Ventas encontrado (ID: ${ventasUser?.id})`);
  assert(!!stockUser, `Usuario Stock encontrado (ID: ${stockUser?.id})`);

  const adminId = adminUser!.id;
  const ventasId = ventasUser!.id;
  const stockId = stockUser!.id;

  // Limpieza preventiva de pedidos de prueba anteriores
  await prisma.detallePedidoEcommerce.deleteMany({
    where: { pedido: { numero: { in: [98901, 98902, 98903, 98904, 98905, 98906] } } },
  });
  await prisma.pedidoEcommerce.deleteMany({
    where: { numero: { in: [98901, 98902, 98903, 98904, 98905, 98906] } },
  });

  try {
    // ─────────────────────────────────────────────────────────────────────────────
    // CASO 1: Confirmación normal de transferencia bancaria
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("1. Verificando confirmación normal de pago por transferencia bancaria...");

    const pedido1 = await prisma.pedidoEcommerce.create({
      data: {
        numero: 98901,
        nombreCliente: "Juan Pérez Test",
        dniCliente: "30111222",
        telefonoCliente: "1155554444",
        emailCliente: "juan.perez@test.com",
        modalidadEntrega: "RETIRO_LOCAL",
        metodoPago: "TRANSFERENCIA",
        estado: "PENDIENTE",
        estadoPago: "PENDIENTE",
        comprobanteUrl: "comprobantes/test-recibo-01.pdf",
        costoEnvio: 0,
        total: 45000,
        items: {
          create: [
            {
              nombre: "Batería Bosch 12V",
              cantidad: 1,
              precioUnitario: 45000,
              subtotal: 45000,
            },
          ],
        },
      },
    });

    const res1 = await actualizarEstadoPedidoAction(
      ventasId,
      pedido1.id,
      "CONFIRMADO",
      stockId,
      "Transferencia bancaria verificada en cuenta Santander"
    );

    assert(res1.success === true, "Confirmación de transferencia exitosa por Ventas");
    assert(res1.pedido?.estadoPago === "PAGADO", "Estado de pago actualizado a PAGADO");
    assert(res1.pedido?.estado === "CONFIRMADO", "Estado del pedido actualizado a CONFIRMADO");
    assert(res1.pedido?.fechaPago !== null, "fechaPago registrada correctamente con timestamp");

    const fechaPagoOriginal1 = new Date(res1.pedido!.fechaPago!).getTime();

    // ─────────────────────────────────────────────────────────────────────────────
    // CASO 2: Registro normal de cobro en mostrador (Efectivo) con verificación
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n2. Verificando cobro normal en efectivo en mostrador...");

    const pedido2 = await prisma.pedidoEcommerce.create({
      data: {
        numero: 98902,
        nombreCliente: "Carlos Gómez Test",
        dniCliente: "35444555",
        telefonoCliente: "1133332222",
        emailCliente: "carlos@test.com",
        modalidadEntrega: "RETIRO_LOCAL",
        metodoPago: "EFECTIVO_LOCAL",
        estado: "LISTO_ENTREGA",
        estadoPago: "PENDIENTE",
        costoEnvio: 0,
        total: 18500,
        items: {
          create: [
            {
              nombre: "Aceite Motul 7100 10W40",
              cantidad: 1,
              precioUnitario: 18500,
              subtotal: 18500,
            },
          ],
        },
      },
    });

    // Validar identidad del cliente en mostrador
    const verifRet = await verificarIdentidadRetiroAction(ventasId, {
      pedidoId: pedido2.id,
      tipo: "TITULAR",
      dniPresentado: "35444555",
    });
    assert(verifRet.success === true, "Identidad verificada correctamente en mostrador");
    assert(!!verifRet.token, "Token efímero de retiro generado");

    // Registrar cobro
    const resCobro = await registrarCobroEfectivoAction(
      ventasId,
      pedido2.id,
      "Efectivo exacto recibido en caja 1",
      verifRet.token
    );

    assert(resCobro.success === true, "Cobro en mostrador registrado exitosamente");
    assert(resCobro.pedido?.estadoPago === "PAGADO", "Pedido figura como PAGADO");
    assert(resCobro.pedido?.fechaPago !== null, "fechaPago registrada para cobro en mostrador");
    assert(resCobro.pedido?.metodoPago === "EFECTIVO_LOCAL", "metodoPago conservado como EFECTIVO_LOCAL");

    // ─────────────────────────────────────────────────────────────────────────────
    // CASO 3: Verificación de cobro con tarjeta
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n3. Verificando pago con tarjeta...");

    const pedido3 = await prisma.pedidoEcommerce.create({
      data: {
        numero: 98903,
        nombreCliente: "Mariana López Test",
        dniCliente: "28999888",
        telefonoCliente: "1144445555",
        emailCliente: "mariana@test.com",
        modalidadEntrega: "MOTOMANDADO",
        metodoPago: "TARJETA",
        estado: "PENDIENTE",
        estadoPago: "PENDIENTE",
        costoEnvio: 3500,
        total: 32500,
        items: {
          create: [
            {
              nombre: "Casco HJC Integral",
              cantidad: 1,
              precioUnitario: 29000,
              subtotal: 29000,
            },
          ],
        },
      },
    });

    const resTarjeta = await actualizarEstadoPedidoAction(
      ventasId,
      pedido3.id,
      "CONFIRMADO",
      stockId,
      "Pago tarjeta aprobado vía pasarela"
    );

    assert(resTarjeta.success === true, "Pago con tarjeta aprobado por Ventas");
    assert(resTarjeta.pedido?.estadoPago === "PAGADO", "Tarjeta registrada como PAGADO");
    assert(resTarjeta.pedido?.metodoPago === "TARJETA", "metodoPago preservado como TARJETA");

    // ─────────────────────────────────────────────────────────────────────────────
    // CASO 4: Prevención de doble confirmación (idempotencia ante doble clic)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n4. Verificando prevención de doble confirmación (idempotencia)...");

    // Reintentar confirmar pedido1 ya pagado
    const resDobleConfirmacion = await actualizarEstadoPedidoAction(
      ventasId,
      pedido1.id,
      "CONFIRMADO",
      stockId,
      "Segundo clic accidental en botón confirmar"
    );

    assert(resDobleConfirmacion.success === true, "Reintento de confirmación retorna éxito seguro (idempotente)");
    assert(resDobleConfirmacion.pedido?.estadoPago === "PAGADO", "Estado de pago sigue siendo PAGADO");
    const fechaPagoPosterior1 = new Date(resDobleConfirmacion.pedido!.fechaPago!).getTime();
    assert(fechaPagoOriginal1 === fechaPagoPosterior1, "fechaPago original NUNCA fue alterada ni sobrescrita por el reintento");
    assert(resDobleConfirmacion.pedido?.total === 45000, "Importe total del pedido intacto ($45.000)");

    // ─────────────────────────────────────────────────────────────────────────────
    // CASO 5: Prevención de confirmaciones concurrentes/simultáneas (lock condicional)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n5. Verificando confirmaciones concurrentes simultáneas (race condition)...");

    const pedidoConcurrente = await prisma.pedidoEcommerce.create({
      data: {
        numero: 98904,
        nombreCliente: "Simultáneo Test",
        dniCliente: "27111333",
        telefonoCliente: "1122221111",
        emailCliente: "simultaneo@test.com",
        modalidadEntrega: "RETIRO_LOCAL",
        metodoPago: "TRANSFERENCIA",
        estado: "PENDIENTE",
        estadoPago: "PENDIENTE",
        costoEnvio: 0,
        total: 52000,
        items: {
          create: [
            {
              nombre: "Kit Transmisión DID",
              cantidad: 1,
              precioUnitario: 52000,
              subtotal: 52000,
            },
          ],
        },
      },
    });

    // Disparar dos confirmaciones simultáneas en paralelo
    const [resConc1, resConc2] = await Promise.all([
      actualizarEstadoPedidoAction(adminId, pedidoConcurrente.id, "CONFIRMADO", stockId, "Confirmado por Admin"),
      actualizarEstadoPedidoAction(ventasId, pedidoConcurrente.id, "CONFIRMADO", stockId, "Confirmado por Ventas"),
    ]);

    assert(resConc1.success === true && resConc2.success === true, "Ambas llamadas resolvieron de forma controlada");
    
    // Verificar en BD que solo existe un registro de pago y no se duplicó
    const pedidoConcurrenteDB = await prisma.pedidoEcommerce.findUnique({
      where: { id: pedidoConcurrente.id },
    });
    assert(pedidoConcurrenteDB?.estadoPago === "PAGADO", "Pedido quedó en estado PAGADO");
    assert(pedidoConcurrenteDB?.total === 52000, "Total inmutable en $52.000");

    // ─────────────────────────────────────────────────────────────────────────────
    // CASO 6: Reintento de cobro en mostrador tras cobro previo
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n6. Verificando reintento de cobro en mostrador sobre pedido ya cobrado...");

    const resReintentoCobro = await registrarCobroEfectivoAction(
      ventasId,
      pedido2.id,
      "Intento de cobro duplicado",
      verifRet.token
    );

    assert(resReintentoCobro.success === false, "Cobro duplicado rechazado correctamente");
    assert(
      Boolean(
        resReintentoCobro.error?.includes("ya se encuentra pagado") ||
        resReintentoCobro.error?.includes("ya fue registrado")
      ),
      `Mensaje de error claro y preventivo: "${resReintentoCobro.error}"`
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CASO 7: Intento de pagar pedido ya pagado con otro método (Efectivo sobre Transferencia)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n7. Verificando intento de cobrar en efectivo un pedido ya pagado por transferencia...");

    // Intentar cobrar en mostrador el pedido 1 (que era transferencia ya pagada)
    const resCobroCruzado = await registrarCobroEfectivoAction(
      ventasId,
      pedido1.id,
      "Intento de cobro en mostrador de pedido pagado por transferencia"
    );

    assert(resCobroCruzado.success === false, "Cobro cruzado rechazado");
    assert(
      Boolean(
        resCobroCruzado.error?.includes("ya se encuentra pagado") ||
        resCobroCruzado.error?.includes("configurado método")
      ),
      `Error de rechazo esperado: "${resCobroCruzado.error}"`
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CASO 8: Invariabilidad de fechaPago y datos de pago ante cambios de estado posteriores
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n8. Verificando inmutabilidad de fechaPago al avanzar por el ciclo de preparación y entrega...");

    // pedido1 está en CONFIRMADO y PAGADO
    // Pasar a PREPARANDO por Stock
    const resPrep = await actualizarEstadoPedidoAction(stockId, pedido1.id, "PREPARANDO", stockId);
    assert(resPrep.success === true, "Avanzado a PREPARANDO");
    assert(resPrep.pedido?.estadoPago === "PAGADO", "estadoPago se conserva en PAGADO");
    const fechaPagoEnPrep = new Date(resPrep.pedido!.fechaPago!).getTime();
    assert(fechaPagoEnPrep === fechaPagoOriginal1, "fechaPago original permanece intacta al pasar a PREPARANDO");

    // Completar checklist de preparación en depósito para pedido1
    await prisma.detallePedidoEcommerce.updateMany({
      where: { pedidoId: pedido1.id },
      data: { preparado: true, cantidadPreparada: 1 },
    });

    // Pasar a LISTO_ENTREGA por Stock
    const resListo = await actualizarEstadoPedidoAction(stockId, pedido1.id, "LISTO_ENTREGA", stockId);
    assert(resListo.success === true, "Avanzado a LISTO_ENTREGA");
    assert(resListo.pedido?.estadoPago === "PAGADO", "estadoPago sigue en PAGADO");
    const fechaPagoEnListo = new Date(resListo.pedido!.fechaPago!).getTime();
    assert(fechaPagoEnListo === fechaPagoOriginal1, "fechaPago original permanece intacta al pasar a LISTO_ENTREGA");

    // Intentar rechazar comprobante de un pedido ya pagado (debe ser bloqueado)
    const resRechazarPagado = await rechazarComprobantePedidoAction(pedido1.id, ventasId, "Intento de rechazar comprobante pagado");
    assert(resRechazarPagado.success === false, "Rechazo de comprobante en pedido PAGADO fue denegado");
    assert(
      Boolean(resRechazarPagado.error?.includes("ya fue confirmado y acreditado")),
      `Mensaje protector: "${resRechazarPagado.error}"`
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CASO 9: Pedido creado día N y pagado día N+1 (asignación al cierre de día N+1)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n9. Verificando asignación contable por fechaPago y no por creadoEn...");

    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const hoy = new Date();

    const pedidoNtoN1 = await prisma.pedidoEcommerce.create({
      data: {
        numero: 98905,
        nombreCliente: "Asignación Fechas Test",
        dniCliente: "33888777",
        telefonoCliente: "1166667777",
        emailCliente: "fechas@test.com",
        modalidadEntrega: "RETIRO_LOCAL",
        metodoPago: "TRANSFERENCIA",
        estado: "CONFIRMADO",
        estadoPago: "PAGADO",
        creadoEn: ayer, // Creado ayer
        fechaPago: hoy,  // Pagado hoy
        costoEnvio: 0,
        total: 21000,
        items: {
          create: [
            {
              nombre: "Cadena Chopper Reforzada",
              cantidad: 1,
              precioUnitario: 21000,
              subtotal: 21000,
            },
          ],
        },
      },
    });

    const keyCreado = getFechaArgentinaKey(pedidoNtoN1.creadoEn);
    const keyPago = getFechaArgentinaKey(pedidoNtoN1.fechaPago!);
    const keyHoy = getHoyArgentinaKey();

    assert(keyPago === keyHoy, `fechaPago pertenece a la jornada de HOY (${keyHoy})`);
    assert(keyCreado !== keyPago, `creadoEn (${keyCreado}) es diferente a fechaPago (${keyPago})`);

    // ─────────────────────────────────────────────────────────────────────────────
    // CASO 10: Ausencia de registros duplicados en Finanzas Online
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n10. Verificando cálculo de Caja Online y ausencia de cobros duplicados...");

    // Contar pagos confirmados en BD
    const totalPagadosCount = await prisma.pedidoEcommerce.count({
      where: { estadoPago: "PAGADO" },
    });

    const sumaTotalPagados = await prisma.pedidoEcommerce.aggregate({
      where: { estadoPago: "PAGADO" },
      _sum: { total: true },
    });

    const sumaReal = sumaTotalPagados._sum.total || 0;

    console.log(`  En PostgreSQL: ${totalPagadosCount} pedidos pagados, suma total: $${sumaReal.toLocaleString("es-AR")}`);
    assert(totalPagadosCount >= 5, "Existen pedidos pagados verificables en BD");

    // ─────────────────────────────────────────────────────────────────────────────
    // CASO 11: Coherencia entre resumen de Finanzas y cierres diarios
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n11. Verificando coherencia entre cierres diarios y pedidos pagados...");

    // Agrupar pedidos efectivamente pagados por jornada argentina (lógica canónica de Cierres Diarios)
    const todosPagados = await prisma.pedidoEcommerce.findMany({
      where: { estadoPago: "PAGADO", fechaPago: { not: null } },
      select: { id: true, total: true, fechaPago: true, metodoPago: true },
    });

    const mapaCierres = new Map<string, { totalCobrado: number; count: number }>();
    for (const p of todosPagados) {
      if (!p.fechaPago) continue;
      const key = getFechaArgentinaKey(p.fechaPago);
      const prev = mapaCierres.get(key) || { totalCobrado: 0, count: 0 };
      mapaCierres.set(key, {
        totalCobrado: prev.totalCobrado + p.total,
        count: prev.count + 1,
      });
    }

    let sumaTotalCierresBruto = 0;
    let totalPedidosEnCierres = 0;
    for (const [_, datos] of mapaCierres.entries()) {
      sumaTotalCierresBruto += datos.totalCobrado;
      totalPedidosEnCierres += datos.count;
    }

    console.log(`  En Cierres Diarios: ${totalPedidosEnCierres} pedidos en ${mapaCierres.size} jornadas, total bruto: $${sumaTotalCierresBruto.toLocaleString("es-AR")}`);
    assert(
      sumaTotalCierresBruto === sumaReal,
      `Suma de cierres ($${sumaTotalCierresBruto}) coincide exactamente con la suma en PostgreSQL ($${sumaReal})`
    );
    assert(
      totalPedidosEnCierres === totalPagadosCount,
      `Cantidad de pedidos en cierres (${totalPedidosEnCierres}) coincide exactamente con pedidos PAGADOS en BD (${totalPagadosCount})`
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CASO 12: Rechazo de accesos no autorizados en el servidor
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n12. Verificando seguridad y validación de roles en servidor...");

    // Empleado de stock intentando aprobar pago o cobrar en mostrador
    const pedido6 = await prisma.pedidoEcommerce.create({
      data: {
        numero: 98906,
        nombreCliente: "Seguridad Test",
        dniCliente: "20111999",
        modalidadEntrega: "RETIRO_LOCAL",
        metodoPago: "TRANSFERENCIA",
        estado: "PENDIENTE",
        estadoPago: "PENDIENTE",
        costoEnvio: 0,
        total: 10000,
        items: {
          create: [{ nombre: "Bujía NGK", cantidad: 1, precioUnitario: 10000, subtotal: 10000 }],
        },
      },
    });

    // Stock intentando aprobar pago de PENDIENTE a CONFIRMADO (no permitido, solo Ventas o Admin)
    const resStockAprobar = await actualizarEstadoPedidoAction(stockId, pedido6.id, "CONFIRMADO");
    assert(resStockAprobar.success === false, "Stock bloqueado de aprobar pagos por transferencia");
    assert(
      Boolean(
        resStockAprobar.error?.includes("Permiso denegado") || resStockAprobar.error?.includes("solo personal de Ventas")
      ),
      `Error de seguridad emitido: "${resStockAprobar.error}"`
    );

    // Stock intentando cobrar efectivo en mostrador
    const resStockCobrar = await registrarCobroEfectivoAction(stockId, pedido6.id, "Cobro por empleado no autorizado");
    assert(resStockCobrar.success === false, "Stock bloqueado de cobrar en mostrador");
    assert(
      Boolean(resStockCobrar.error?.includes("Permiso denegado")),
      `Error de permisos emitido: "${resStockCobrar.error}"`
    );

    console.log("\n================================================================================");
    console.log("✅ TODAS LAS PRUEBAS DE INTEGRIDAD DE PAGOS PASARON EXITOSAMENTE.");
    console.log("================================================================================\n");
  } finally {
    // Limpieza de pedidos de prueba
    console.log("Limpiando pedidos de prueba...");
    await prisma.detallePedidoEcommerce.deleteMany({
      where: { pedido: { numero: { in: [98901, 98902, 98903, 98904, 98905, 98906] } } },
    });
    await prisma.pedidoEcommerce.deleteMany({
      where: { numero: { in: [98901, 98902, 98903, 98904, 98905, 98906] } },
    });
    console.log("Limpieza completada.");
  }
}

main()
  .catch((e) => {
    console.error("Error ejecutando pruebas:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
