import { prisma } from "../src/lib/prisma";
import {
  actualizarChecklistItemsAction,
  actualizarEstadoPedidoAction,
} from "../src/actions/pedidos";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ FALLÓ: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

async function main() {
  console.log("================================================================================");
  console.log("TEST: SINCRONIZACIÓN DEL CHECKLIST DE STOCK Y VALIDACIÓN EN SERVIDOR");
  console.log("================================================================================\n");

  const stockUser = await prisma.usuario.findFirst({
    where: { activo: true, rol: { nombre: "ENCARGADO_STOCK" } },
    include: { rol: true },
  });
  const ventasUser = await prisma.usuario.findFirst({
    where: { activo: true, rol: { nombre: "ENCARGADO_VENTAS" } },
    include: { rol: true },
  });

  assert(!!stockUser, `Usuario Stock encontrado: ${stockUser?.nombreCompleto} (ID: ${stockUser?.id})`);
  assert(!!ventasUser, `Usuario Ventas encontrado: ${ventasUser?.nombreCompleto} (ID: ${ventasUser?.id})`);

  let testOrderId: number | null = null;

  try {
    // 1. Crear pedido de prueba en PREPARANDO con 2 repuestos no preparados
    console.log("\n1. Creando pedido en PREPARANDO con 2 repuestos sin controlar...");
    const pedido = await prisma.pedidoEcommerce.create({
      data: {
        numero: 999777,
        nombreCliente: "Cliente Prueba Checklist",
        dniCliente: "30555666",
        modalidadEntrega: "RETIRO_LOCAL",
        metodoPago: "EFECTIVO_LOCAL",
        estado: "PREPARANDO",
        estadoPago: "PENDIENTE",
        total: 5000,
        preparadorUsuarioId: stockUser!.id,
        preparadorNombre: stockUser!.nombreCompleto,
        items: {
          create: [
            {
              nombre: "Bujía NGK CR8E",
              cantidad: 2,
              cantidadPreparada: 0,
              preparado: false,
              precioUnitario: 1500,
              subtotal: 3000,
            },
            {
              nombre: "Filtro de Aire FZ16",
              cantidad: 1,
              cantidadPreparada: 0,
              preparado: false,
              precioUnitario: 2000,
              subtotal: 2000,
            },
          ],
        },
      },
      include: { items: true },
    });

    testOrderId = pedido.id;
    assert(pedido.items.length === 2, "Pedido creado con 2 items");
    assert(pedido.items.every((it) => !it.preparado), "Ambos items inician con preparado: false");

    const item1 = pedido.items[0];
    const item2 = pedido.items[1];

    // 2. Intento de marcar LISTO_ENTREGA sin controlar items (debe fallar)
    console.log("\n2. Verificando que el servidor bloquee finalizar si no hay repuestos controlados...");
    const resSinChecklist = await actualizarEstadoPedidoAction(
      stockUser!.id,
      pedido.id,
      "LISTO_ENTREGA",
      "Listo para entregar"
    );
    assert(resSinChecklist.success === false, "El servidor rechazó finalizar sin checklist");
    assert(
      (resSinChecklist.error || "").includes("hay 2 repuesto(s) con control de preparación incompleto"),
      `Mensaje exacto del servidor: "${resSinChecklist.error}"`
    );

    // 3. Controlar solo el primer repuesto con actualizarChecklistItemsAction
    console.log("\n3. Guardando control de SOLO el primer repuesto en la base de datos...");
    const resCheckItem1 = await actualizarChecklistItemsAction(stockUser!.id, pedido.id, [
      { itemId: item1.id, preparado: true },
    ]);
    assert(resCheckItem1.success === true, "actualizarChecklistItemsAction ejecutada con éxito");
    assert(resCheckItem1.todosPreparados === false, "todosPreparados es false (falta el item 2)");

    // Verificar en BD que item 1 se guardó con preparado: true y cantidadPreparada: 2
    const item1Db = await prisma.detallePedidoEcommerce.findUnique({ where: { id: item1.id } });
    assert(item1Db?.preparado === true, "Item 1 guardado en BD con preparado = true");
    assert(item1Db?.cantidadPreparada === item1.cantidad, `Item 1 cantidadPreparada = ${item1Db?.cantidadPreparada}`);

    // 4. Intento de marcar LISTO_ENTREGA con 1 de 2 controlados (debe fallar indicando 1 pendiente)
    console.log("\n4. Verificando que el servidor bloquee finalizar si falta 1 repuesto...");
    const resIncompleto = await actualizarEstadoPedidoAction(
      stockUser!.id,
      pedido.id,
      "LISTO_ENTREGA",
      "Listo para entregar"
    );
    assert(resIncompleto.success === false, "El servidor rechazó con 1 repuesto pendiente");
    assert(
      (resIncompleto.error || "").includes("hay 1 repuesto(s) con control de preparación incompleto"),
      `Mensaje exacto del servidor: "${resIncompleto.error}"`
    );

    // 5. Controlar el segundo repuesto
    console.log("\n5. Guardando control del segundo repuesto en la base de datos...");
    const resCheckItem2 = await actualizarChecklistItemsAction(stockUser!.id, pedido.id, [
      { itemId: item2.id, preparado: true },
    ]);
    assert(resCheckItem2.success === true, "Item 2 guardado con éxito");
    assert(resCheckItem2.todosPreparados === true, "todosPreparados es true");

    const item2Db = await prisma.detallePedidoEcommerce.findUnique({ where: { id: item2.id } });
    assert(item2Db?.preparado === true, "Item 2 guardado en BD con preparado = true");
    assert(item2Db?.cantidadPreparada === item2.cantidad, `Item 2 cantidadPreparada = ${item2Db?.cantidadPreparada}`);

    // 6. Ahora finalizar preparación (debe ser aceptado)
    console.log("\n6. Finalizando preparación con todos los repuestos controlados en el servidor...");
    const resFinalizar = await actualizarEstadoPedidoAction(
      stockUser!.id,
      pedido.id,
      "LISTO_ENTREGA",
      "Listo para entregar. Preparación completada.",
      null,
      true
    );
    assert(resFinalizar.success === true, "Pedido avanzado exitosamente a LISTO_ENTREGA");
    assert(resFinalizar.pedido?.estado === "LISTO_ENTREGA", "Estado verificado en LISTO_ENTREGA");

    // 7. Verificar que Ventas no pueda modificar el checklist
    console.log("\n7. Verificando que Ventas NO tenga permisos sobre el checklist de depósito...");
    const resVentasCheck = await actualizarChecklistItemsAction(ventasUser!.id, pedido.id, [
      { itemId: item1.id, preparado: false },
    ]);
    assert(resVentasCheck.success === false, "Ventas fue bloqueado de alterar el checklist");
    assert(
      (resVentasCheck.error || "").includes("Permiso denegado"),
      `Mensaje de seguridad: "${resVentasCheck.error}"`
    );

    console.log("\n================================================================================");
    console.log("✅ TODAS LAS PRUEBAS DE CHECKLIST Y CONTROL DE STOCK PASARON EXITOSAMENTE.");
    console.log("================================================================================");
  } finally {
    if (testOrderId) {
      await prisma.detallePedidoEcommerce.deleteMany({ where: { pedidoId: testOrderId } });
      await prisma.pedidoEcommerce.delete({ where: { id: testOrderId } });
      console.log("\nLimpieza de pedido temporal completada.");
    }
  }
}

main().catch((err) => {
  console.error("Error en test de checklist:", err);
  process.exit(1);
});
