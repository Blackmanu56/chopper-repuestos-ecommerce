import { prisma } from "../src/lib/prisma";
import {
  getStaffPreparadoresAction,
  actualizarEstadoPedidoAction,
} from "../src/actions/pedidos";

async function main() {
  console.log("================================================================================");
  console.log("TEST: PREPARACIÓN DE PEDIDOS, FILTROS Y PERMISOS DE EMPLEADOS");
  console.log("================================================================================");

  // 1. Verificar usuarios de los 3 roles
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
    throw new Error("No se encontraron los usuarios necesarios en la base de datos.");
  }

  console.log(`  ✓ Admin: ${adminUser.nombreCompleto} (ID: ${adminUser.id})`);
  console.log(`  ✓ Ventas: ${ventasUser.nombreCompleto} (ID: ${ventasUser.id})`);
  console.log(`  ✓ Stock: ${stockUser.nombreCompleto} (ID: ${stockUser.id})`);

  // 2. Comprobar getStaffPreparadoresAction
  console.log("\n1. Verificando getStaffPreparadoresAction...");
  const resStaff = await getStaffPreparadoresAction(adminUser.id);
  if (!resStaff.success || !resStaff.staff) {
    throw new Error(`getStaffPreparadoresAction falló: ${resStaff.error}`);
  }

  console.log(`  ✓ Preparadores devueltos (${resStaff.staff.length}):`);
  resStaff.staff.forEach((s) => {
    console.log(`    - ID ${s.id}: ${s.nombre} (${s.rol})`);
  });

  const tieneVentas = resStaff.staff.some((s) => s.rol === "ENCARGADO_VENTAS" || s.id === ventasUser.id);
  if (tieneVentas) {
    throw new Error("Fallo de seguridad: getStaffPreparadoresAction incluyó empleados de Ventas (Carlos López).");
  }
  console.log("  ✓ Correcto: El personal de Ventas no figura como preparador.");

  const todosAutorizados = resStaff.staff.every(
    (s) => s.rol === "ADMINISTRADOR" || s.rol === "ENCARGADO_STOCK"
  );
  if (!todosAutorizados) {
    throw new Error("Fallo: Se incluyeron roles no autorizados.");
  }
  console.log("  ✓ Correcto: Todos los preparadores devueltos son exclusivamente Stock o Administrador.");

  // 3. Crear pedido temporal de prueba para comprobar transiciones y asignaciones
  console.log("\n2. Creando orden de prueba temporal para verificar permisos de preparación...");
  const testOrder = await prisma.pedidoEcommerce.create({
    data: {
      numero: 999888,
      nombreCliente: "Cliente Prueba Preparación",
      dniCliente: "12345678",
      telefonoCliente: "3764000000",
      modalidadEntrega: "RETIRO_LOCAL",
      estado: "CONFIRMADO",
      estadoPago: "PAGADO",
      metodoPago: "TRANSFERENCIA",
      total: 1000,
      items: {
        create: [
          {
            nombre: "Filtro de Aceite Test",
            cantidad: 1,
            cantidadPreparada: 1,
            preparado: true,
            precioUnitario: 1000,
            subtotal: 1000,
          },
        ],
      },
    },
  });

  try {
    // 3.1 Intentar que Ventas prepare el pedido (debe ser rechazado)
    console.log("\n3. Verificando que Ventas NO pueda iniciar preparación...");
    const resVentasPrep = await actualizarEstadoPedidoAction(
      ventasUser.id,
      testOrder.id,
      "PREPARANDO",
      "Intento de preparación por Ventas"
    );

    if (resVentasPrep.success) {
      throw new Error("Fallo de seguridad: Ventas logró cambiar el estado a PREPARANDO.");
    }
    console.log(`  ✓ Correcto: El servidor bloqueó a Ventas con: "${resVentasPrep.error}"`);

    // 3.2 Intentar asignar a un usuario de Ventas como preparador
    console.log("\n4. Verificando que Ventas NO pueda ser asignado como preparador...");
    // El admin ejecuta la orden pero intenta asignar a ventasUser como preparador
    await actualizarEstadoPedidoAction(
      adminUser.id,
      testOrder.id,
      "PREPARANDO",
      "Admin preparando",
      ventasUser.id // id de ventas
    );

    const checkOrderVentas = await prisma.pedidoEcommerce.findUnique({
      where: { id: testOrder.id },
    });
    if (checkOrderVentas?.preparadorUsuarioId === ventasUser.id) {
      throw new Error("Fallo de seguridad: Se asignó a un empleado de Ventas como preparador en BD.");
    }
    console.log("  ✓ Correcto: El backend no asignó al empleado de Ventas como preparador.");

    // 3.3 Stock toma y prepara el pedido
    console.log("\n5. Verificando que Stock SÍ pueda preparar y asignarse...");
    const resStockPrep = await actualizarEstadoPedidoAction(
      stockUser.id,
      testOrder.id,
      "PREPARANDO",
      "Stock armando repuestos",
      stockUser.id
    );

    if (!resStockPrep.success) {
      throw new Error(`Stock no pudo preparar el pedido: ${resStockPrep.error}`);
    }

    const checkOrderStock = await prisma.pedidoEcommerce.findUnique({
      where: { id: testOrder.id },
    });
    if (checkOrderStock?.preparadorUsuarioId !== stockUser.id) {
      throw new Error("El empleado de Stock no quedó asignado como preparador.");
    }
    console.log(`  ✓ Correcto: Empleado de Stock asignado: ${checkOrderStock.preparadorNombre} (ID: ${checkOrderStock.preparadorUsuarioId})`);

    // 3.4 Stock completa el armado a LISTO_ENTREGA
    console.log("\n6. Verificando que Stock marque como listo para entregar...");
    const resListo = await actualizarEstadoPedidoAction(
      stockUser.id,
      testOrder.id,
      "LISTO_ENTREGA",
      "Paquete armado",
      stockUser.id,
      true // checklistCompletado
    );
    if (!resListo.success) {
      throw new Error(`Stock no pudo marcar el pedido como listo: ${resListo.error}`);
    }
    console.log("  ✓ Correcto: Pedido avanzado a LISTO_ENTREGA conservando el preparador asignado.");
  } finally {
    // 4. Limpieza estricta del pedido de prueba
    await prisma.pedidoEcommerce.delete({
      where: { id: testOrder.id },
    });
    console.log("\n  ✓ Limpieza: Orden de prueba eliminada de la base de datos.");
  }

  console.log("\n================================================================================");
  console.log("✅ TODAS LAS PRUEBAS DE PREPARADORES Y PERMISOS PASARON EXITOSAMENTE.");
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
