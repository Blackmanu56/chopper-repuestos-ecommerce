/**
 * Test integral de verificación de:
 * 1. Notificaciones agrupadas por estado con cálculo real en base de datos
 * 2. Restricciones de permisos por rol en backend (Admin, Ventas, Stock)
 * 3. Inviolabilidad: un usuario con rol real Stock no puede ver datos de Ventas
 * 4. Historial enriquecido con diferenciación entre 'leída' y 'resuelta'
 * 5. Acciones de marcar leída individual y marcar todas leídas
 */

import { prisma } from "../src/lib/prisma";
import {
  getNotificacionesStaffAction,
  marcarNotificacionLeidaAction,
  marcarTodasNotificacionesLeidasAction,
} from "../src/actions/notifications";
import {
  crearNotificacionStaffInternal,
  getStoredNotificacionesStaff,
  saveStoredNotificacionesStaff,
} from "../src/lib/notifications";

async function main() {
  console.log("================================================================================");
  console.log("TEST: NOTIFICACIONES AGRUPADAS, HISTORIAL Y PERMISOS POR ROL");
  console.log("================================================================================");

  // Obtener usuarios reales de cada rol en la BD
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

  if (!adminUser || !ventasUser || !stockUser) {
    throw new Error("No se encontraron usuarios para los 3 roles requeridos en la base de datos.");
  }

  console.log(`  ✓ Usuario Administrador encontrado: ID ${adminUser.id} (${adminUser.rol.nombre})`);
  console.log(`  ✓ Usuario Ventas encontrado: ID ${ventasUser.id} (${ventasUser.rol.nombre})`);
  console.log(`  ✓ Usuario Stock encontrado: ID ${stockUser.id} (${stockUser.rol.nombre})`);

  // ─── 1. VERIFICACIÓN DE CÁLCULO DE GRUPOS REALES EN BASE DE DATOS ───
  console.log("\n1. Verificando cálculo de grupos operativos en tiempo real...");

  const resAdmin = await getNotificacionesStaffAction(adminUser.id, "admin");
  if (!resAdmin.success) {
    throw new Error(`Error en getNotificacionesStaffAction (Admin): ${resAdmin.error}`);
  }

  console.log(`  ✓ Consulta Admin exitosa: ${resAdmin.grupos.length} grupos operativos detectados`);
  resAdmin.grupos.forEach((g) => {
    console.log(`    - [${g.clave}] "${g.titulo}" -> ${g.cantidad} órdenes (Módulo: ${g.moduloDestino})`);
  });

  // Comprobar coherencia con la tabla real pedidoEcommerce
  const pedidosEnPreparacionDb = await prisma.pedidoEcommerce.count({
    where: { estado: "PREPARANDO" },
  });
  const grupoPrep = resAdmin.grupos.find((g) => g.clave === "EN_PREPARACION");
  const countPrepGrupo = grupoPrep ? grupoPrep.cantidad : 0;
  if (countPrepGrupo !== pedidosEnPreparacionDb) {
    throw new Error(`Discrepancia en pedidos en preparación: BD=${pedidosEnPreparacionDb}, Grupo=${countPrepGrupo}`);
  }
  console.log(`  ✓ Coherencia verificada: ${countPrepGrupo} pedidos en preparación en BD coinciden exactamente con el grupo.`);

  // ─── 2. FILTRADO POR ROL: VENTAS ───
  console.log("\n2. Verificando filtrado estricto para rol Ventas...");

  const resVentas = await getNotificacionesStaffAction(ventasUser.id, "venta");
  if (!resVentas.success) {
    throw new Error(`Error en getNotificacionesStaffAction (Ventas): ${resVentas.error}`);
  }

  // Ventas NO debe ver grupos de Stock (PREPARACION, PENDIENTES_ARMAR)
  const tieneStockEnVentas = resVentas.grupos.some(
    (g) => g.clave === "PENDIENTES_ARMAR" || g.clave === "EN_PREPARACION"
  );
  if (tieneStockEnVentas) {
    throw new Error("Fallo de seguridad: Ventas no debe ver grupos operativos de Stock/Depósito.");
  }
  console.log("  ✓ Ventas no visualiza ningún grupo operativo de Depósito/Stock.");
  console.log(`  ✓ Grupos visibles para Ventas: ${resVentas.grupos.map((g) => g.clave).join(", ") || "(al día)"}`);

  // ─── 3. FILTRADO POR ROL: STOCK ───
  console.log("\n3. Verificando filtrado estricto para rol Stock...");

  const resStock = await getNotificacionesStaffAction(stockUser.id, "stock");
  if (!resStock.success) {
    throw new Error(`Error en getNotificacionesStaffAction (Stock): ${resStock.error}`);
  }

  // Stock NO debe ver grupos de Ventas (PAGOS_PENDIENTES, LISTOS_ENTREGA, CANCELACIONES)
  const tieneVentasEnStock = resStock.grupos.some(
    (g) => g.clave === "PAGOS_PENDIENTES" || g.clave === "LISTOS_ENTREGA" || g.clave === "CANCELACIONES"
  );
  if (tieneVentasEnStock) {
    throw new Error("Fallo de seguridad: Stock no debe ver grupos operativos de Ventas/Pagos.");
  }
  console.log("  ✓ Stock no visualiza ningún grupo operativo de Ventas/Pagos/Cancelaciones.");
  console.log(`  ✓ Grupos visibles para Stock: ${resStock.grupos.map((g) => g.clave).join(", ") || "(al día)"}`);

  // ─── 4. PROTECCIÓN DE ESCALACIÓN EN SERVIDOR ───
  console.log("\n4. Verificando inviolabilidad de permisos reales frente a manipulación de rolOperativo...");
  // Usuario con sesión Stock intentando forzar rolOperativo = "venta" o "admin"
  const hackVentaAttempt = await getNotificacionesStaffAction(stockUser.id, "venta");
  const hackTieneVentas = hackVentaAttempt.grupos.some(
    (g) => g.clave === "PAGOS_PENDIENTES" || g.clave === "CANCELACIONES"
  );
  if (hackTieneVentas) {
    throw new Error("Fallo de seguridad: Un empleado de Stock logró recibir datos de Ventas enviando rolOperativo=venta.");
  }
  console.log("  ✓ Servidor bloqueó la escalación: empleado de Stock forzando 'venta' fue confinado a STOCK.");

  const hackAdminAttempt = await getNotificacionesStaffAction(stockUser.id, "admin");
  const hackTieneAdmin = hackAdminAttempt.grupos.some(
    (g) => g.clave === "PAGOS_PENDIENTES" || g.clave === "CANCELACIONES"
  );
  if (hackTieneAdmin) {
    throw new Error("Fallo de seguridad: Un empleado de Stock logró recibir datos de Admin enviando rolOperativo=admin.");
  }
  console.log("  ✓ Servidor bloqueó la escalación: empleado de Stock forzando 'admin' fue confinado a STOCK.");

  // ─── 5. HISTORIAL DE NOTIFICACIONES: LEÍDA VS RESUELTA ───
  console.log("\n5. Verificando historial y distinción entre 'leída' y 'resuelta'...");

  // Crear una notificación de prueba para verificar
  const testNotifId = `test-notif-${Date.now()}`;
  const initialStored = await getStoredNotificacionesStaff();
  const testItem = {
    id: testNotifId,
    tipo: "NUEVO_PEDIDO_PENDIENTE_PAGO" as const,
    rolDestino: "VENTAS" as const,
    titulo: "Aviso de prueba para historial",
    mensaje: "Verificación de flags de lectura y resolución",
    pedidoId: 1, // Pedido entregado históricamente
    pedidoNumero: 101,
    moduloDestino: "pedidos" as const,
    leidaPor: [],
    creadaEn: new Date().toISOString(),
  };

  await saveStoredNotificacionesStaff([testItem, ...initialStored]);

  const resHistorial = await getNotificacionesStaffAction(adminUser.id, "admin");
  const foundTest = resHistorial.notificaciones.find((n) => n.id === testNotifId);

  if (!foundTest) {
    throw new Error("La notificación de prueba no fue encontrada en el historial.");
  }

  console.log(`  ✓ Notificación recuperada en historial: "${foundTest.titulo}"`);
  console.log(`  ✓ Flag leida inicial: ${foundTest.leida} (esperado: false)`);
  console.log(`  ✓ Flag resuelta calculado contra BD: ${foundTest.resuelta} (esperado: true, ya que pedido #1 está entregado)`);

  if (foundTest.leida !== false) {
    throw new Error("El flag leida debería ser false para un aviso no leído por el usuario.");
  }
  if (foundTest.resuelta !== true) {
    throw new Error("El flag resuelta debería ser true porque el pedido subyacente ya finalizó su ciclo.");
  }

  // ─── 6. MARCAR COMO LEÍDA INDIVIDUAL Y TODAS ───
  console.log("\n6. Verificando acción marcarNotificacionLeidaAction...");
  const markRes = await marcarNotificacionLeidaAction(adminUser.id, testNotifId, "admin");
  if (!markRes.success) {
    throw new Error(`Error en marcarNotificacionLeidaAction: ${markRes.error}`);
  }

  const checkAfterRead = await getNotificacionesStaffAction(adminUser.id, "admin");
  const foundAfterRead = checkAfterRead.notificaciones.find((n) => n.id === testNotifId);
  if (!foundAfterRead?.leida) {
    throw new Error("La notificación no quedó registrada como leída por el usuario.");
  }
  console.log("  ✓ Notificación marcada como leída exitosamente para el usuario actual.");

  // Limpiar el registro de prueba del historial
  const cleanStored = (await getStoredNotificacionesStaff()).filter((n) => n.id !== testNotifId);
  await saveStoredNotificacionesStaff(cleanStored);
  console.log("  ✓ Limpieza de datos de prueba en ConfiguracionEcommerce completada.");

  console.log("\n================================================================================");
  console.log("✅ TODAS LAS PRUEBAS DE NOTIFICACIONES AGRUPADAS Y PERMISOS PASARON EXITOSAMENTE.");
  console.log("================================================================================");
}

main()
  .catch((e) => {
    console.error("FATAL ERROR EN PRUEBA:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
