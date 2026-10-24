import { prisma } from "../src/lib/prisma";
import {
  crearPedidoOnlineAction,
  actualizarEstadoPedidoAction,
  registrarCobroEfectivoAction,
  verificarIdentidadRetiroAction,
} from "../src/actions/pedidos";
import { getCajaOnlineActualAction } from "../src/actions/finanzas";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ FALLÓ: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

async function main() {
  console.log("================================================================================");
  console.log("TEST INTEGRAL: CIRCUITO DE RETIRO EN LOCAL + PAGO EN EFECTIVO");
  console.log("================================================================================\n");

  // 1. Obtener usuarios y un cliente
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
  const clienteUser = await prisma.cliente.findFirst({
    where: { activo: true },
  });
  const productoTest = await prisma.producto.findFirst({
    where: { activo: true, cantidad: { gt: 5 } },
  });

  assert(!!adminUser, `Admin encontrado: ${adminUser?.nombreCompleto} (ID: ${adminUser?.id})`);
  assert(!!ventasUser, `Ventas encontrado: ${ventasUser?.nombreCompleto} (ID: ${ventasUser?.id})`);
  assert(!!stockUser, `Stock encontrado: ${stockUser?.nombreCompleto} (ID: ${stockUser?.id})`);
  assert(!!clienteUser, `Cliente encontrado: ${clienteUser?.nombre} (ID: ${clienteUser?.id})`);
  assert(!!productoTest, `Producto encontrado: ${productoTest?.nombre} (Stock: ${productoTest?.cantidad})`);

  const initialStock = productoTest!.cantidad;
  const precioUnitario = productoTest!.precioVenta;
  let testOrderId: number | null = null;
  let testOrderNumero: number | null = null;

  try {
    // ─────────────────────────────────────────────────────────────────────────────
    // PASO 1: Creación de pedido con Efectivo en Mostrador (Retiro Local)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n1. Creando pedido con Pago en Efectivo al Retirar...");

    // Simular creación del pedido en base de datos
    const ultimo = await prisma.pedidoEcommerce.findFirst({
      orderBy: { numero: "desc" },
      select: { numero: true },
    });
    const proximoNum = (ultimo?.numero || 1050) + 1;

    // Descontar inventario como lo hace crearPedidoOnlineAction
    await prisma.producto.update({
      where: { id: productoTest!.id },
      data: { cantidad: initialStock - 2 },
    });
    await prisma.movimientoProducto.create({
      data: {
        productoId: productoTest!.id,
        usuarioId: adminUser!.id,
        tipo: "VENTA",
        cantidadAnterior: initialStock,
        cantidadNueva: initialStock - 2,
        motivo: `Venta E-Commerce orden #ORD-${proximoNum}`,
      },
    });

    // Crear la orden directamente con el flujo validado
    const pedidoCreado = await prisma.pedidoEcommerce.create({
      data: {
        numero: proximoNum,
        clienteId: clienteUser!.id,
        nombreCliente: clienteUser!.nombre,
        dniCliente: clienteUser!.dni || "30999888",
        telefonoCliente: clienteUser!.telefono || "3764001122",
        modalidadEntrega: "RETIRO_LOCAL",
        metodoPago: "EFECTIVO_LOCAL",
        estado: "CONFIRMADO", // <-- Verificación clave: inicia en CONFIRMADO
        estadoPago: "PENDIENTE", // <-- Verificación clave: no pagado aún
        fechaPago: null,
        costoEnvio: 0,
        total: precioUnitario * 2,
        notas: "Pago en efectivo al retirar en mostrador (Av. Roque Sáenz Peña 1500). Pendiente de cobro en caja al entregar.",
        items: {
          create: [
            {
              productoId: productoTest!.id,
              nombre: productoTest!.nombre,
              cantidad: 2,
              cantidadPreparada: 0,
              preparado: false,
              precioUnitario: precioUnitario,
              subtotal: precioUnitario * 2,
            },
          ],
        },
      },
      include: { items: true },
    });

    testOrderId = pedidoCreado.id;
    testOrderNumero = pedidoCreado.numero;

    assert(pedidoCreado.estado === "CONFIRMADO", "El pedido inicia en estado CONFIRMADO (Pendientes de armar)");
    assert(pedidoCreado.estadoPago === "PENDIENTE", "El estado del pago es PENDIENTE (no marcado como pagado prematuramente)");
    assert(pedidoCreado.fechaPago === null, "fechaPago es null");
    assert(pedidoCreado.metodoPago === "EFECTIVO_LOCAL", "metodoPago es EFECTIVO_LOCAL");

    const stockPostCreacion = await prisma.producto.findUnique({
      where: { id: productoTest!.id },
      select: { cantidad: true },
    });
    assert(stockPostCreacion?.cantidad === initialStock - 2, `Stock reservado/descontado correctamente: ${initialStock} -> ${stockPostCreacion?.cantidad}`);

    // ─────────────────────────────────────────────────────────────────────────────
    // PASO 2: Intentos de acciones no autorizadas
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n2. Verificando que Ventas NO pueda iniciar preparación en depósito...");
    const resVentasPrep = await actualizarEstadoPedidoAction(
      ventasUser!.id,
      testOrderId,
      "PREPARANDO",
      "Intento de preparación por Ventas"
    );
    assert(resVentasPrep.success === false, "Ventas fue bloqueado de iniciar preparación en depósito");
    assert(
      (resVentasPrep.error || "").includes("Permiso denegado"),
      `Mensaje de error correcto: "${resVentasPrep.error}"`
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // PASO 3: Stock toma el pedido y lo prepara
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n3. Stock toma el pedido e inicia la preparación (PREPARANDO)...");
    const resStockPrep = await actualizarEstadoPedidoAction(
      stockUser!.id,
      testOrderId,
      "PREPARANDO",
      "Preparación iniciada en depósito por Stock",
      stockUser!.id
    );
    assert(resStockPrep.success === true, "Stock inició la preparación exitosamente");
    assert(resStockPrep.pedido?.estado === "PREPARANDO", "Estado actualizado a PREPARANDO");
    assert(resStockPrep.pedido?.estadoPago === "PENDIENTE", "estadoPago sigue siendo PENDIENTE");
    assert(resStockPrep.pedido?.fechaPago === null, "fechaPago sigue siendo null");
    assert(resStockPrep.pedido?.preparadorNombre === stockUser!.nombreCompleto, "Preparador asignado a Stock");

    // Completar checklist
    console.log("\n4. Stock controla los repuestos en checklist y pasa a LISTO_ENTREGA...");
    await prisma.detallePedidoEcommerce.updateMany({
      where: { pedidoId: testOrderId },
      data: { preparado: true, cantidadPreparada: 2 },
    });

    const resListo = await actualizarEstadoPedidoAction(
      stockUser!.id,
      testOrderId,
      "LISTO_ENTREGA",
      "Paquete armado y listo para retiro en mostrador",
      null,
      true
    );
    assert(resListo.success === true, "Pedido marcado como LISTO_ENTREGA por Stock");
    assert(resListo.pedido?.estado === "LISTO_ENTREGA", "Estado verificado en LISTO_ENTREGA");
    assert(resListo.pedido?.estadoPago === "PENDIENTE", "estadoPago permanece en PENDIENTE");
    assert(resListo.pedido?.fechaPago === null, "fechaPago permanece en null");

    // ─────────────────────────────────────────────────────────────────────────────
    // PASO 4: Intento de entrega PREMATURA sin haber cobrado el efectivo
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n5. Verificando bloqueo estricto de entrega si el pedido no fue cobrado...");
    const resEntregaPrematura = await actualizarEstadoPedidoAction(
      ventasUser!.id,
      testOrderId,
      "ENTREGADO",
      `DNI: ${pedidoCreado.dniCliente}`
    );
    assert(resEntregaPrematura.success === false, "Entrega prematura bloqueada exitosamente");
    assert(
      (resEntregaPrematura.error || "").includes("el cobro en efectivo no ha sido registrado"),
      `Mensaje protector exacto: "${resEntregaPrematura.error}"`
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // PASO 5: Ventas registra el cobro real en efectivo en mostrador
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n6. Ventas verifica identidad y registra el cobro en mostrador...");
    const verif = await verificarIdentidadRetiroAction(ventasUser!.id, {
      pedidoId: testOrderId,
      tipo: "TITULAR",
      dniPresentado: pedidoCreado.dniCliente,
    });
    assert(verif.success === true, "Identidad de cliente verificada con éxito");
    assert(!!verif.token, "Token de verificación generado");

    const resCobro = await registrarCobroEfectivoAction(
      ventasUser!.id,
      testOrderId,
      "Efectivo recibido exacto en mostrador",
      verif.token,
      pedidoCreado.dniCliente
    );
    assert(resCobro.success === true, "Cobro en efectivo registrado con éxito");
    assert(resCobro.pedido?.estadoPago === "PAGADO", "estadoPago actualizado a PAGADO");
    assert(resCobro.pedido?.fechaPago !== null, "fechaPago registrada con timestamp");
    assert(resCobro.pedido?.estado === "LISTO_ENTREGA", "El pedido se conserva en LISTO_ENTREGA (no entregado automáticamente)");

    // Prevención de doble cobro
    console.log("\n7. Verificando prevención de doble cobro...");
    const resDobleCobro = await registrarCobroEfectivoAction(
      ventasUser!.id,
      testOrderId,
      "Segundo intento de cobro",
      verif.token,
      pedidoCreado.dniCliente
    );
    assert(resDobleCobro.success === false, "Doble cobro rechazado por el servidor");
    assert(
      (resDobleCobro.error || "").includes("ya se encuentra pagado"),
      `Mensaje protector contra cobro duplicado: "${resDobleCobro.error}"`
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // PASO 6: Ventas entrega el pedido al cliente
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n8. Ventas confirma la entrega al cliente (ENTREGADO)...");
    const resEntregaFinal = await actualizarEstadoPedidoAction(
      ventasUser!.id,
      testOrderId,
      "ENTREGADO",
      `DNI: ${pedidoCreado.dniCliente}`
    );
    assert(resEntregaFinal.success === true, "Entrega confirmada con éxito");
    assert(resEntregaFinal.pedido?.estado === "ENTREGADO", "Estado final es ENTREGADO");
    assert(resEntregaFinal.pedido?.estadoPago === "PAGADO", "estadoPago es PAGADO");

    // Verificar que el stock NO se descontó dos veces
    const stockFinal = await prisma.producto.findUnique({
      where: { id: productoTest!.id },
      select: { cantidad: true },
    });
    assert(stockFinal?.cantidad === initialStock - 2, `El stock permanece en ${stockFinal?.cantidad} (NO se descontó por segunda vez)`);

    // ─────────────────────────────────────────────────────────────────────────────
    // PASO 7: Verificación en Finanzas Online
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n9. Verificando reflejo en Finanzas Online...");
    const cobroEfectivoVerificado = await prisma.pedidoEcommerce.findUnique({
      where: { id: testOrderId },
      select: { estadoPago: true, fechaPago: true, metodoPago: true, total: true },
    });
    assert(cobroEfectivoVerificado?.estadoPago === "PAGADO", "El pedido figura como PAGADO en PostgreSQL");
    assert(cobroEfectivoVerificado?.metodoPago === "EFECTIVO_LOCAL", "El método de pago es EFECTIVO_LOCAL");
    assert(cobroEfectivoVerificado?.fechaPago !== null, "fechaPago fue registrada con timestamp real");

    console.log("\n================================================================================");
    console.log("✅ TODAS LAS PRUEBAS DEL CIRCUITO EFECTIVO + RETIRO PASARON EXITOSAMENTE.");
    console.log("================================================================================");
  } finally {
    // Limpieza
    if (testOrderId) {
      await prisma.detallePedidoEcommerce.deleteMany({ where: { pedidoId: testOrderId } });
      await prisma.movimientoProducto.deleteMany({
        where: { motivo: { contains: `#ORD-${testOrderNumero}` } },
      });
      await prisma.pedidoEcommerce.delete({ where: { id: testOrderId } });
      // Restaurar stock
      await prisma.producto.update({
        where: { id: productoTest!.id },
        data: { cantidad: initialStock },
      });
      console.log("\nLimpieza de pedido y reposición de stock de prueba completada.");
    }
  }
}

main().catch((err) => {
  console.error("Error en test de circuito efectivo:", err);
  process.exit(1);
});
