import { prisma } from "../src/lib/prisma";
import assert from "assert";
import {
  actualizarEstadoPedidoAction,
  rechazarComprobantePedidoAction,
  actualizarChecklistItemsAction,
} from "../src/actions/pedidos";

async function runTests() {
  console.log("================================================================================");
  console.log("TEST: CIRCUITO COMPLETO DE PAGOS POR TRANSFERENCIA BANCARIA");
  console.log("================================================================================\n");

  // 1. Identificar usuarios de prueba (Ventas, Stock, Admin)
  const userVentas = await prisma.usuario.findFirst({
    where: { activo: true, rol: { nombre: "ENCARGADO_VENTAS" } },
  });
  const userStock = await prisma.usuario.findFirst({
    where: { activo: true, rol: { nombre: "ENCARGADO_STOCK" } },
  });
  const userAdmin = await prisma.usuario.findFirst({
    where: { activo: true, rol: { nombre: "ADMINISTRADOR" } },
  });

  assert(userVentas, "Debe existir un usuario con rol ENCARGADO_VENTAS");
  assert(userStock, "Debe existir un usuario con rol ENCARGADO_STOCK");
  assert(userAdmin, "Debe existir un usuario con rol ADMINISTRADOR");

  console.log("1. Personal verificado:");
  console.log(`   - Ventas: ${userVentas.nombreCompleto} (ID: ${userVentas.id})`);
  console.log(`   - Stock: ${userStock.nombreCompleto} (ID: ${userStock.id})`);
  console.log(`   - Admin: ${userAdmin.nombreCompleto} (ID: ${userAdmin.id})\n`);

  // 2. Obtener un producto de catálogo para la orden de prueba
  const productoTest = await prisma.producto.findFirst({
    where: { activo: true, cantidad: { gt: 5 } },
  });
  assert(productoTest, "Debe existir al menos un producto con stock");

  const stockInicial = productoTest.cantidad;

  // 3. Crear pedido de prueba en estado PENDIENTE con comprobante de transferencia
  console.log("2. Creando pedido simulado con transferencia bancaria...");
  const ultimo = await prisma.pedidoEcommerce.findFirst({
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  const numeroPedidoTest = (ultimo?.numero || 2000) + 1;

  const precioItem = productoTest.precioVenta || 15000;

  const pedidoTest = await prisma.pedidoEcommerce.create({
    data: {
      numero: numeroPedidoTest,
      nombreCliente: "Cliente Prueba Transferencia",
      dniCliente: "38999111",
      telefonoCliente: "3764112233",
      emailCliente: "test.transferencia@chopper.com",
      direccionEnvio: "Av. Corrientes 1234, Posadas",
      modalidadEntrega: "RETIRO_LOCAL",
      metodoPago: "TRANSFERENCIA",
      estado: "PENDIENTE",
      estadoPago: "PENDIENTE",
      fechaPago: null,
      comprobanteUrl: "/uploads/comprobantes/test-comprobante-transferencia.png",
      total: precioItem,
      notas: "Transferencia bancaria con comprobante adjunto. Pendiente de verificación por Ventas.",
      items: {
        create: [
          {
            nombre: productoTest.nombre,
            marca: productoTest.marca,
            cantidad: 1,
            precioUnitario: precioItem,
            subtotal: precioItem,
            productoId: productoTest.id,
          },
        ],
      },
    },
    include: { items: true },
  });

  console.log(`  ✓ Pedido creado #ORD-${pedidoTest.numero}`);
  assert(pedidoTest.estado === "PENDIENTE", "El pedido debe nacer en PENDIENTE");
  assert(pedidoTest.estadoPago === "PENDIENTE", "El estadoPago debe nacer en PENDIENTE");
  assert(pedidoTest.comprobanteUrl !== null, "Debe contener comprobanteUrl");

  try {
    // 4. Probar control de permisos: Stock NO puede aprobar comprobante ni confirmar pago
    console.log("\n3. Probando permisos de aprobación de pago...");
    const resIntentoStock = await actualizarEstadoPedidoAction(
      userStock.id,
      pedidoTest.id,
      "CONFIRMADO"
    );
    assert(
      resIntentoStock.success === false,
      "Stock no debe poder confirmar el pago/pedido de un comprobante"
    );
    console.log("  ✓ Permiso denegado a Stock para aprobar comprobante (requiere Ventas o Admin)");

    // 5. Rechazo de comprobante por Ventas
    console.log("\n4. Probando rechazo de comprobante por Ventas...");
    const resRechazo = await rechazarComprobantePedidoAction(
      userVentas.id,
      pedidoTest.id,
      "Comprobante ilegible o sin número de operación visible"
    );
    assert(resRechazo.success === true, "Ventas debe poder rechazar comprobante");
    assert(resRechazo.pedido?.estado === "PENDIENTE", "El pedido debe seguir en PENDIENTE");
    assert(resRechazo.pedido?.comprobanteUrl === null, "El comprobanteUrl debe quedar limpio");
    assert(
      (resRechazo.pedido?.notas || "").includes("Comprobante rechazado por"),
      "Debe quedar constancia en notas"
    );
    console.log("  ✓ Comprobante rechazado correctamente: comprobanteUrl eliminado y orden en PENDIENTE");

    // Simular que el cliente re-subió un nuevo comprobante válido
    await prisma.pedidoEcommerce.update({
      where: { id: pedidoTest.id },
      data: {
        comprobanteUrl: "/uploads/comprobantes/comprobante-valido-reemplazo.pdf",
        notas: `${resRechazo.pedido?.notas} | Nuevo comprobante adjuntado por cliente`,
      },
    });

    // 6. Aprobación del comprobante por Ventas -> pasa a CONFIRMADO y PAGADO
    console.log("\n5. Aprobando comprobante con personal de Ventas...");
    const resAprobacion = await actualizarEstadoPedidoAction(
      userVentas.id,
      pedidoTest.id,
      "CONFIRMADO",
      "Ventas verificó acreditación bancaria en Santander Río"
    );
    assert(resAprobacion.success === true, "La aprobación de Ventas debe ser exitosa");
    assert(resAprobacion.pedido?.estado === "CONFIRMADO", "El pedido debe pasar a CONFIRMADO");
    assert(resAprobacion.pedido?.estadoPago === "PAGADO", "El pago debe pasar a PAGADO");
    assert(resAprobacion.pedido?.fechaPago !== null, "Debe registrar fechaPago de acreditación");
    console.log("  ✓ Pedido pasa a CONFIRMADO (Pendiente de armar) y estadoPago a PAGADO");

    // 7. Verificar que el pedido NO se considere pendiente de cobro en Finanzas
    console.log("\n6. Verificando estado en Finanzas Online...");
    const checkDbFinanzas = await prisma.pedidoEcommerce.findUnique({
      where: { id: pedidoTest.id },
    });
    assert(checkDbFinanzas?.estadoPago === "PAGADO", "Finanzas debe registrar estadoPago = PAGADO");
    assert(checkDbFinanzas?.fechaPago !== null, "Finanzas debe tener fecha de pago registrada");
    console.log("  ✓ El pedido figura como cobrado y acreditado en Finanzas Online (no pendiente)");

    // 8. Preparación por Stock: Stock toma el pedido en CONFIRMADO y lo pasa a PREPARANDO
    console.log("\n7. Stock inicia preparación del pedido...");
    const resPreparando = await actualizarEstadoPedidoAction(
      userStock.id,
      pedidoTest.id,
      "PREPARANDO",
      userStock.id
    );
    assert(resPreparando.success === true, "Stock debe poder iniciar preparación");
    assert(resPreparando.pedido?.estado === "PREPARANDO", "Estado debe ser PREPARANDO");
    assert(
      resPreparando.pedido?.preparadorUsuarioId === userStock.id,
      "Debe quedar asignado al empleado de Stock"
    );
    console.log(`  ✓ Pedido en preparación por ${resPreparando.pedido?.preparadorNombre}`);

    // 9. Checklist de preparación por Stock
    console.log("\n8. Control de checklist por Stock...");
    const itemId = pedidoTest.items[0].id;
    const resChecklist = await actualizarChecklistItemsAction(userStock.id, pedidoTest.id, [
      { itemId, preparado: true, cantidadPreparada: 1 },
    ]);
    assert(resChecklist.success === true, "Checklist debe actualizarse con éxito");

    const resListo = await actualizarEstadoPedidoAction(
      userStock.id,
      pedidoTest.id,
      "LISTO_ENTREGA",
      null,
      null,
      true
    );
    assert(resListo.success === true, "Debe poder marcarse listo para entrega");
    assert(resListo.pedido?.estado === "LISTO_ENTREGA", "Debe estar en LISTO_ENTREGA");
    console.log("  ✓ Checklist 100% completado y pedido en 'LISTO_ENTREGA'");

    // 10. Entrega en mostrador por Ventas con validación de DNI
    console.log("\n9. Ventas realiza la entrega en mostrador...");
    // 10.1 Intento de entrega con DNI incorrecto
    const resEntregaDniMalo = await actualizarEstadoPedidoAction(
      userVentas.id,
      pedidoTest.id,
      "ENTREGADO",
      "Entrega mostrador DNI: 99999999",
      "DNI: 99999999"
    );
    assert(
      resEntregaDniMalo.success === false,
      "DNI no coincidente debe ser rechazado en el servidor"
    );
    console.log("  ✓ Servidor rechaza entrega si el DNI presentado no coincide con el pedido");

    // 10.2 Entrega con DNI correcto del cliente
    const resEntregaOk = await actualizarEstadoPedidoAction(
      userVentas.id,
      pedidoTest.id,
      "ENTREGADO",
      `Entrega en mostrador DNI: ${pedidoTest.dniCliente}`,
      `DNI: ${pedidoTest.dniCliente}`
    );
    assert(resEntregaOk.success === true, "Entrega con DNI válido debe ser aprobada");
    assert(resEntregaOk.pedido?.estado === "ENTREGADO", "Estado final debe ser ENTREGADO");
    assert(resEntregaOk.pedido?.estadoPago === "PAGADO", "Pago permanece PAGADO sin requerir cobro");
    console.log("  ✓ Entrega confirmada con verificación de identidad exitosa");

    // 11. Idempotencia: intentar entregar o aprobar de nuevo
    console.log("\n10. Verificando protección contra duplicaciones...");
    const resReaprobacion = await actualizarEstadoPedidoAction(
      userVentas.id,
      pedidoTest.id,
      "CONFIRMADO"
    );
    assert(
      resReaprobacion.success === false,
      "No se puede modificar un pedido en estado terminal ENTREGADO"
    );
    console.log("  ✓ Pedido protegido contra dobles cobros o cambios en estado terminal");
  } finally {
    // Limpieza de pedido de prueba para no alterar datos del negocio
    await prisma.detallePedidoEcommerce.deleteMany({
      where: { pedidoId: pedidoTest.id },
    });
    await prisma.pedidoEcommerce.delete({
      where: { id: pedidoTest.id },
    });
    console.log("\n  ✓ Limpieza de datos de prueba completada.");
  }

  console.log("\n================================================================================");
  console.log("✅ TODAS LAS PRUEBAS DEL CIRCUITO DE TRANSFERENCIAS PASARON EXITOSAMENTE.");
  console.log("================================================================================");
}

runTests()
  .catch((e) => {
    console.error("Error en pruebas de transferencias:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
