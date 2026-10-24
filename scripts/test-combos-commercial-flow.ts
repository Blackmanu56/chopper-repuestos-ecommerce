import { prisma } from "../src/lib/prisma";
import { getPublicCombosAction, getComboByIdAction, getAllCombosAdminAction, upsertComboAction } from "../src/actions/combos";
import { crearPedidoOnlineAction } from "../src/actions/pedidos";

async function runCommercialTests() {
  console.log("=== INICIO DE PRUEBAS DE PRECIOS, DESCUENTOS Y STOCK DE COMBOS ===");

  // 1. Obtener o crear dos productos de prueba para armar combos
  let prodA = await prisma.producto.findFirst({ where: { activo: true, cantidad: { gte: 10 } } });
  let prodB = await prisma.producto.findFirst({ where: { activo: true, id: { not: prodA?.id }, cantidad: { gte: 10 } } });

  if (!prodA || !prodB) {
    console.log("Creando productos de prueba...");
    const cat = await prisma.categoria.findFirst();
    const prov = await prisma.proveedor.findFirst();
    prodA = await prisma.producto.create({
      data: {
        codigo: "TEST-PROD-A-" + Date.now(),
        nombre: "Aceite Sintético Test",
        precioCompra: 8000,
        precioVenta: 15000,
        cantidad: 10,
        activo: true,
        categoriaId: cat?.id || 1,
        proveedorId: prov?.id || 1,
      },
    });
    prodB = await prisma.producto.create({
      data: {
        codigo: "TEST-PROD-B-" + Date.now(),
        nombre: "Filtro Aceite Test",
        precioCompra: 2000,
        precioVenta: 5000,
        cantidad: 6,
        activo: true,
        categoriaId: cat?.id || 1,
        proveedorId: prov?.id || 1,
      },
    });
  }

  console.log(`Productos de prueba: ${prodA.nombre} ($${prodA.precioVenta}, stock: ${prodA.cantidad}) y ${prodB.nombre} ($${prodB.precioVenta}, stock: ${prodB.cantidad})`);

  const adminUser = await prisma.usuario.findFirst({
    where: { activo: true, rol: { nombre: "ADMINISTRADOR" } },
  });

  if (!adminUser) {
    throw new Error("No se encontró usuario administrador para pruebas.");
  }

  let testClient = await prisma.cliente.findFirst({ where: { activo: true } });
  if (!testClient) {
    testClient = await prisma.cliente.create({
      data: {
        nombre: "Cliente Comercial Test",
        dni: "35999888",
        telefono: "3764556677",
        email: "test.cliente@chopper.com",
        activo: true,
      },
    });
  }

  // --- ESCENARIO 1: Combo con descuento real ---
  // ProdA (qty 1: $15.000) + ProdB (qty 2: 2 * $5.000 = $10.000) => Total componentes = $25.000
  // Precio combo = $20.000 (Ahorro $5.000, 20% OFF)
  const sumaEsperada = prodA.precioVenta * 1 + prodB.precioVenta * 2;
  const precioOferta = sumaEsperada - 5000;

  console.log(`\n--- ESCENARIO 1: Creación de Combo con oferta real (Suma: $${sumaEsperada}, Precio: $${precioOferta}) ---`);
  const createRes1 = await upsertComboAction(adminUser.id, {
    nombre: "Combo Service Test Con Descuento",
    precio: precioOferta,
    items: [
      { productoId: prodA.id, cantidad: 1 },
      { productoId: prodB.id, cantidad: 2 },
    ],
  });

  if (!createRes1.success || !createRes1.comboId) {
    throw new Error(`Fallo crear combo 1: ${createRes1.error}`);
  }

  const combo1Id = createRes1.comboId;
  const combo1 = await getComboByIdAction(combo1Id);
  if (!combo1) throw new Error("No se pudo recuperar combo 1");

  console.log("Resultado Combo 1:", {
    precio: combo1.precio,
    precioRegular: combo1.precioRegular,
    ahorro: combo1.ahorro,
    descuentoPorcentaje: combo1.descuentoPorcentaje,
    enOferta: combo1.enOferta,
    stockCalculado: combo1.stockCalculado,
  });

  const expectedStock1 = Math.min(
    Math.floor(prodA.cantidad / 1),
    Math.floor(prodB.cantidad / 2)
  );

  if (!combo1.enOferta) throw new Error("Combo 1 debería tener enOferta: true");
  if (combo1.precioRegular !== sumaEsperada) throw new Error(`Precio regular debería ser ${sumaEsperada}, es ${combo1.precioRegular}`);
  if (combo1.ahorro !== 5000) throw new Error(`Ahorro debería ser 5000, es ${combo1.ahorro}`);
  if (combo1.descuentoPorcentaje !== Math.round((5000 / sumaEsperada) * 100)) throw new Error("Descuento porcentual incorrecto");
  if (combo1.stockCalculado !== expectedStock1) throw new Error(`Stock debería ser ${expectedStock1}, es ${combo1.stockCalculado}`);
  console.log("✔ ESCENARIO 1 VALIDADO CON ÉXITO");

  // --- ESCENARIO 2: Combo SIN rebaja efectiva (precio >= suma de componentes) ---
  console.log(`\n--- ESCENARIO 2: Combo sin rebaja efectiva (Precio >= Suma componentes) ---`);
  const precioSinRebaja = sumaEsperada + 2000;
  const createRes2 = await upsertComboAction(adminUser.id, {
    nombre: "Combo Sin Rebaja Test",
    precio: precioSinRebaja,
    items: [
      { productoId: prodA.id, cantidad: 1 },
      { productoId: prodB.id, cantidad: 2 },
    ],
  });

  if (!createRes2.success || !createRes2.comboId) {
    throw new Error(`Fallo crear combo 2: ${createRes2.error}`);
  }

  const combo2Id = createRes2.comboId;
  const combo2 = await getComboByIdAction(combo2Id);
  if (!combo2) throw new Error("No se pudo recuperar combo 2");

  console.log("Resultado Combo 2:", {
    precio: combo2.precio,
    precioRegular: combo2.precioRegular,
    ahorro: combo2.ahorro,
    descuentoPorcentaje: combo2.descuentoPorcentaje,
    enOferta: combo2.enOferta,
  });

  if (combo2.enOferta !== false) throw new Error("Combo 2 no debe estar en oferta");
  if (combo2.precioRegular !== null) throw new Error("Precio regular debe ser null cuando no hay rebaja");
  if (combo2.ahorro !== 0) throw new Error("Ahorro debe ser 0 cuando no hay rebaja");
  if (combo2.descuentoPorcentaje !== 0) throw new Error("Descuento porcentual debe ser 0");
  console.log("✔ ESCENARIO 2 VALIDADO CON ÉXITO");

  // --- ESCENARIO 3: Stock proporcional y restricción de compra si falta stock ---
  console.log(`\n--- ESCENARIO 3: Stock proporcional y restricción por falta de componentes ---`);
  // Ajustar temporalmente stock de prodB a 1 unidad.
  // Como Combo 1 requiere 2 unidades de prodB, el stock del combo DEBE ser 0.
  const stockOriginalB = prodB.cantidad;
  await prisma.producto.update({
    where: { id: prodB.id },
    data: { cantidad: 1 },
  });

  const combo1SinStock = await getComboByIdAction(combo1Id);
  console.log(`Stock prodB = 1, requeridos = 2 -> Stock combo resultante: ${combo1SinStock?.stockCalculado}`);
  if (combo1SinStock?.stockCalculado !== 0) {
    throw new Error(`El stock del combo debió ser 0 pero fue ${combo1SinStock?.stockCalculado}`);
  }

  // Intentar crear un pedido de Combo 1 cuando no alcanza el stock de componentes
  const pedidoFallo = await crearPedidoOnlineAction({
    nombre: testClient.nombre,
    dni: testClient.dni || "35999888",
    tel: testClient.telefono || "3764556677",
    email: testClient.email,
    metodoPago: "EFECTIVO_LOCAL",
    modalidadEntrega: "RETIRO_LOCAL",
    items: [
      { id: combo1Id, nombre: combo1.nombre, cantidad: 1, esCombo: true },
    ],
  }, testClient.id);

  console.log("Resultado intento de compra con stock insuficiente:", pedidoFallo);
  if (pedidoFallo.success) {
    throw new Error("El pedido debió rechazarse por stock insuficiente de componentes.");
  }
  if (!pedidoFallo.error?.includes("Stock insuficiente")) {
    throw new Error(`Se esperaba error de stock insuficiente, pero vino: ${pedidoFallo.error}`);
  }
  console.log("✔ ESCENARIO 3 VALIDADO CON ÉXITO: La compra fue bloqueada correctamente por falta de stock.");

  // Restaurar stock de prodB
  await prisma.producto.update({
    where: { id: prodB.id },
    data: { cantidad: stockOriginalB },
  });

  // --- ESCENARIO 4: Compra exitosa y descuento atómico de componentes ---
  console.log(`\n--- ESCENARIO 4: Compra de combo y descuento de inventario en componentes ---`);
  const stockAntesA = (await prisma.producto.findUnique({ where: { id: prodA.id } }))!.cantidad;
  const stockAntesB = (await prisma.producto.findUnique({ where: { id: prodB.id } }))!.cantidad;

  const pedidoExito = await crearPedidoOnlineAction({
    nombre: testClient.nombre,
    dni: testClient.dni || "35999888",
    tel: testClient.telefono || "3764556677",
    email: testClient.email,
    metodoPago: "EFECTIVO_LOCAL",
    modalidadEntrega: "RETIRO_LOCAL",
    items: [
      { id: combo1Id, nombre: combo1.nombre, cantidad: 1, esCombo: true },
    ],
  }, testClient.id);

  if (!pedidoExito.success || !pedidoExito.pedido) {
    throw new Error(`Fallo crear pedido: ${pedidoExito.error}`);
  }

  const stockDespuesA = (await prisma.producto.findUnique({ where: { id: prodA.id } }))!.cantidad;
  const stockDespuesB = (await prisma.producto.findUnique({ where: { id: prodB.id } }))!.cantidad;

  console.log(`Stock prodA: Antes ${stockAntesA} -> Después ${stockDespuesA} (Descontó ${stockAntesA - stockDespuesA}, esperado: 1)`);
  console.log(`Stock prodB: Antes ${stockAntesB} -> Después ${stockDespuesB} (Descontó ${stockAntesB - stockDespuesB}, esperado: 2)`);

  if (stockAntesA - stockDespuesA !== 1) throw new Error("No se descontó exactamente 1 unidad de prodA");
  if (stockAntesB - stockDespuesB !== 2) throw new Error("No se descontaron exactamente 2 unidades de prodB");

  // Verificar auditoría de movimientos
  const ultimosMovimientos = await prisma.movimientoProducto.findMany({
    where: { productoId: { in: [prodA.id, prodB.id] }, motivo: { contains: String(pedidoExito.pedido.numero) } },
  });
  console.log(`Movimientos de auditoría registrados: ${ultimosMovimientos.length} (esperado: 2)`);
  if (ultimosMovimientos.length !== 2) {
    throw new Error("No se registraron los movimientos de auditoría para cada componente.");
  }

  console.log("✔ ESCENARIO 4 VALIDADO CON ÉXITO: Descuento atómico y auditoría impecables.");

  // Limpiar datos de prueba
  console.log("\nLimpiando datos de prueba...");
  // Eliminar pedido de prueba
  await prisma.detallePedidoEcommerce.deleteMany({ where: { pedidoId: pedidoExito.pedido.id } });
  await prisma.pedidoEcommerce.delete({ where: { id: pedidoExito.pedido.id } });
  // Eliminar movimientos de prueba
  await prisma.movimientoProducto.deleteMany({ where: { id: { in: ultimosMovimientos.map((m) => m.id) } } });
  // Restaurar stock
  await prisma.producto.update({ where: { id: prodA.id }, data: { cantidad: stockAntesA } });
  await prisma.producto.update({ where: { id: prodB.id }, data: { cantidad: stockAntesB } });
  // Eliminar combos de prueba
  await prisma.comboItemEcommerce.deleteMany({ where: { comboId: { in: [combo1Id, combo2Id] } } });
  await prisma.comboEcommerce.deleteMany({ where: { id: { in: [combo1Id, combo2Id] } } });

  console.log("=== TODAS LAS PRUEBAS COMERCIALES FINALIZARON EXITOSAMENTE ===");
}

runCommercialTests()
  .catch((e) => {
    console.error("ERROR EN PRUEBAS:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
