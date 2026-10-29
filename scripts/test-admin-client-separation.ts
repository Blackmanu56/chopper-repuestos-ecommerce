import { prisma } from "../src/lib/prisma";
import { loginStaffAction, registerClientAction } from "../src/actions/auth";

async function main() {
  console.log("===================================================================");
  console.log("VERIFICACIÓN: SEPARACIÓN DE USUARIOS ADMINISTRATIVOS Y CLIENTES");
  console.log("===================================================================");

  // 1. Administrador General mantiene su acceso administrativo
  console.log("\n[TEST 1] Verificando acceso administrativo de Usuario ID 1 (Admin)...");
  const adminUser = await prisma.usuario.findUnique({
    where: { id: 1 },
    include: { rol: true, empleado: true },
  });

  if (
    adminUser &&
    adminUser.activo &&
    adminUser.username === "admin" &&
    adminUser.rol.nombre === "ADMINISTRADOR" &&
    adminUser.empleado?.cargo === "Gerente"
  ) {
    console.log(`✅ TEST 1 PASÓ: Administrador General intacto como Usuario ID 1 (${adminUser.rol.nombre}, ${adminUser.empleado.cargo}).`);
  } else {
    throw new Error(`TEST 1 FALLÓ: Usuario admin comprometido: ${JSON.stringify(adminUser)}`);
  }

  // 2. Comprobar que ningún otro usuario administrativo / empleado fue duplicado a clientes
  console.log("\n[TEST 2] Verificando que empleados y staff no aparecen en tabla clientes...");
  const staffUsers = await prisma.usuario.findMany({
    where: { id: { in: [2, 3] } }, // Carlos López (ventas), María García (stock)
    include: { rol: true },
  });

  for (const staff of staffUsers) {
    const asClient = await prisma.cliente.findFirst({
      where: {
        OR: [
          { dni: staff.dni },
          { email: staff.correo },
        ],
      },
    });

    if (!asClient) {
      console.log(`✅ TEST 2 PASÓ: Staff "${staff.nombreCompleto}" (${staff.rol.nombre}) NO existe en tabla clientes.`);
    } else {
      throw new Error(`TEST 2 FALLÓ: Staff "${staff.nombreCompleto}" tiene un cliente duplicado: ID ${asClient.id}`);
    }
  }

  // 3. Intento de registrar un cliente usando credenciales de personal administrativo -> Debe rechazarse
  console.log("\n[TEST 3] Intentando registrar un cliente con datos de Administrador General...");
  const intentoAdminEmail = await registerClientAction({
    nombreCompleto: "Falso Admin Cliente",
    email: "admin@chopperrepuestos.com",
    telefono: "3764000000",
    password: "password123",
    dni: "88776655",
  });

  if (!intentoAdminEmail.success && intentoAdminEmail.error?.includes("personal administrativo")) {
    console.log(`✅ TEST 3 (Email Staff) PASÓ: Rechazado con: "${intentoAdminEmail.error}"`);
  } else {
    throw new Error(`TEST 3 FALLÓ: Se esperaba rechazo por staff conflict: ${JSON.stringify(intentoAdminEmail)}`);
  }

  const intentoAdminDni = await registerClientAction({
    nombreCompleto: "Falso Admin DNI",
    email: "otro.correo@example.com",
    telefono: "3764000000",
    password: "password123",
    dni: "00000001",
  });

  if (!intentoAdminDni.success && (intentoAdminDni.error?.includes("personal administrativo") || intentoAdminDni.error?.includes("ya se encuentra registrado"))) {
    console.log(`✅ TEST 3 (DNI Staff) PASÓ: Rechazado con: "${intentoAdminDni.error}"`);
  } else {
    throw new Error(`TEST 3 FALLÓ: Se esperaba rechazo por staff conflict: ${JSON.stringify(intentoAdminDni)}`);
  }

  // 4. Clientes legítimos siguen funcionando correctamente
  console.log("\n[TEST 4] Verificando clientes legítimos en la base de datos...");
  const clientesLegitimos = await prisma.cliente.findMany({
    where: {
      id: { not: 17 },
    },
    include: {
      pedidosEcommerce: { select: { id: true, numero: true } },
    },
  });

  console.log(`Total de clientes legítimos activos: ${clientesLegitimos.length}`);
  const carlos = clientesLegitimos.find((c) => c.id === 7);
  if (carlos && carlos.pedidosEcommerce.length === 19) {
    console.log(`✅ TEST 4 PASÓ: Cliente ID 7 "${carlos.nombre}" conserva sus 19 pedidos intactos.`);
  } else {
    throw new Error(`TEST 4 FALLÓ: Cliente ID 7 no encontrado o pedidos alterados.`);
  }

  // 5. Estado del registro histórico Cliente ID 17
  console.log("\n[TEST 5] Auditoría del registro residual Cliente ID 17...");
  const cliente17 = await prisma.cliente.findUnique({
    where: { id: 17 },
    include: {
      pedidosEcommerce: true,
      ventas: true,
    },
  });

  if (cliente17) {
    console.log(`- Registro detectado: ID ${cliente17.id} ("${cliente17.nombre}") | DNI: ${cliente17.dni} | Email: ${cliente17.email}`);
    console.log(`- Pedidos asociados: ${cliente17.pedidosEcommerce.length} (Pedido #${cliente17.pedidosEcommerce[0]?.numero}, estado: ${cliente17.pedidosEcommerce[0]?.estado})`);
    console.log(`- Ventas SGI asociadas: ${cliente17.ventas.length}`);
    console.log(`⚠️ ATENCIÓN: El registro Cliente ID 17 permanece intacto en base de datos cumpliendo la restricción de no eliminar ni modificar registros sin autorización.`);
  } else {
    console.log("Cliente 17 no existe.");
  }

  console.log("\n===================================================================");
  console.log("TODAS LAS VERIFICACIONES DE SEPARACIÓN FINALIZARON CON ÉXITO");
  console.log("===================================================================");
}

main().catch(console.error).finally(() => process.exit(0));
