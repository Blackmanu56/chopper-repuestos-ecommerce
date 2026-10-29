import { prisma } from "../src/lib/prisma";
import { registerClientAction, updateStaffProfileAction } from "../src/actions/auth";

async function runTests() {
  console.log("=================================================");
  console.log("SUITE DE PRUEBAS: VALIDACIÓN Y UNICIDAD DE DNI");
  console.log("=================================================");

  const testDni1 = "99887766";
  const testDniWithPunctuation = "99.887.766";
  const testDniWithDashes = "99-887-766";
  const testEmail1 = "test.dni1@example.com";
  const testEmail2 = "test.dni2@example.com";
  const testEmail3 = "test.dni3@example.com";

  let createdClientId1: number | null = null;
  let createdClientId2: number | null = null;

  try {
    // Limpieza previa por si quedaron datos de corridas anteriores
    await prisma.cliente.deleteMany({
      where: {
        OR: [
          { email: { in: [testEmail1, testEmail2, testEmail3] } },
          { dni: { in: [testDni1, "99887765"] } },
        ],
      },
    });

    // -----------------------------------------------------------------
    // TEST 1: Registro con DNI nuevo -> Debe permitirse
    // -----------------------------------------------------------------
    console.log("\n[TEST 1] Registro con DNI nuevo...");
    const reg1 = await registerClientAction({
      nombreCompleto: "Cliente Test DNI 1",
      email: testEmail1,
      telefono: "3764000001",
      password: "password123",
      dni: testDni1,
    });

    if (reg1.success && reg1.user?.id) {
      createdClientId1 = reg1.user.id;
      console.log(`✅ TEST 1 PASÓ: Cliente creado con ID ${createdClientId1} y DNI ${testDni1}`);
    } else {
      throw new Error(`TEST 1 FALLÓ: ${reg1.error}`);
    }

    // -----------------------------------------------------------------
    // TEST 2: Registro con DNI existente idéntico -> Debe rechazarse
    // -----------------------------------------------------------------
    console.log("\n[TEST 2] Registro con DNI existente idéntico...");
    const reg2 = await registerClientAction({
      nombreCompleto: "Cliente Test DNI 2",
      email: testEmail2,
      telefono: "3764000002",
      password: "password123",
      dni: testDni1,
    });

    if (!reg2.success && reg2.error?.includes("ya se encuentra registrado")) {
      console.log(`✅ TEST 2 PASÓ: Rechazado correctamente con error: "${reg2.error}"`);
    } else {
      throw new Error(`TEST 2 FALLÓ: Se esperaba rechazo pero devolvió: ${JSON.stringify(reg2)}`);
    }

    // -----------------------------------------------------------------
    // TEST 3: Registro con DNI existente formateado con puntos/guiones -> Debe rechazarse
    // -----------------------------------------------------------------
    console.log("\n[TEST 3] Registro con DNI formateado con puntos ('99.887.766')...");
    const reg3 = await registerClientAction({
      nombreCompleto: "Cliente Test DNI 3",
      email: testEmail2,
      telefono: "3764000003",
      password: "password123",
      dni: testDniWithPunctuation,
    });

    if (!reg3.success && reg3.error?.includes("ya se encuentra registrado")) {
      console.log(`✅ TEST 3 (Puntos) PASÓ: Rechazado correctamente con error: "${reg3.error}"`);
    } else {
      throw new Error(`TEST 3 (Puntos) FALLÓ: Devolvió: ${JSON.stringify(reg3)}`);
    }

    console.log("\n[TEST 3b] Registro con DNI formateado con guiones ('99-887-766')...");
    const reg3b = await registerClientAction({
      nombreCompleto: "Cliente Test DNI 3b",
      email: testEmail2,
      telefono: "3764000003",
      password: "password123",
      dni: testDniWithDashes,
    });

    if (!reg3b.success && reg3b.error?.includes("ya se encuentra registrado")) {
      console.log(`✅ TEST 3b (Guiones) PASÓ: Rechazado correctamente con error: "${reg3b.error}"`);
    } else {
      throw new Error(`TEST 3b (Guiones) FALLÓ: Devolvió: ${JSON.stringify(reg3b)}`);
    }

    // -----------------------------------------------------------------
    // TEST 4: Crear un segundo cliente con DNI distinto
    // -----------------------------------------------------------------
    console.log("\n[SETUP] Creando cliente 2 con DNI '99887765'...");
    const regCliente2 = await registerClientAction({
      nombreCompleto: "Cliente Test DNI 2 Diferente",
      email: testEmail2,
      telefono: "3764000004",
      password: "password123",
      dni: "99887765",
    });
    if (!regCliente2.success || !regCliente2.user?.id) {
      throw new Error(`No se pudo crear cliente 2: ${regCliente2.error}`);
    }
    createdClientId2 = regCliente2.user.id;
    console.log(`✅ Cliente 2 creado con ID ${createdClientId2}`);

    // -----------------------------------------------------------------
    // TEST 5: Actualizar perfil conservando su propio DNI -> Debe permitirse
    // -----------------------------------------------------------------
    console.log("\n[TEST 5] Actualizar perfil conservando su propio DNI...");
    const updateOwn = await updateStaffProfileAction(createdClientId1, {
      nombreCompleto: "Cliente Test DNI 1 Modificado",
      dni: testDni1,
      telefono: "3764999999",
    });

    if (updateOwn.success) {
      console.log("✅ TEST 5 PASÓ: El cliente pudo actualizar sus datos conservando su DNI sin conflicto.");
    } else {
      throw new Error(`TEST 5 FALLÓ: Se rechazó la actualización del propio DNI: ${updateOwn.error}`);
    }

    // -----------------------------------------------------------------
    // TEST 6: Actualizar perfil intentando apropiarse del DNI de otro cliente -> Debe rechazarse
    // -----------------------------------------------------------------
    console.log("\n[TEST 6] Cliente 2 intenta cambiar su DNI al DNI del Cliente 1 ('99887766')...");
    const updateConflict = await updateStaffProfileAction(createdClientId2, {
      dni: testDni1,
    });

    if (!updateConflict.success && updateConflict.error?.includes("ya se encuentra registrado")) {
      console.log(`✅ TEST 6 PASÓ: Rechazado conflicto de DNI ajeno con: "${updateConflict.error}"`);
    } else {
      throw new Error(`TEST 6 FALLÓ: Devolvió: ${JSON.stringify(updateConflict)}`);
    }

    // -----------------------------------------------------------------
    // TEST 7: Concurrencia - Dos registros simultáneos con el mismo DNI
    // -----------------------------------------------------------------
    console.log("\n[TEST 7] Concurrencia: 2 registros simultáneos con el mismo DNI '99887700'...");
    const concurrentDni = "99887700";
    const p1 = registerClientAction({
      nombreCompleto: "Concurrente 1",
      email: "concurrente1@example.com",
      telefono: "3764111111",
      password: "password123",
      dni: concurrentDni,
    });
    const p2 = registerClientAction({
      nombreCompleto: "Concurrente 2",
      email: "concurrente2@example.com",
      telefono: "3764222222",
      password: "password123",
      dni: concurrentDni,
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    const successes = [r1, r2].filter((r) => r.success);
    const errors = [r1, r2].filter((r) => !r.success);

    console.log(`Resultados de concurrencia: ${successes.length} éxito(s), ${errors.length} error(es).`);
    if (successes.length === 1 && errors.length === 1) {
      console.log(`✅ TEST 7 PASÓ: Exactamente 1 registro tuvo éxito y el otro fue capturado limpiamente sin duplicados.`);
      // Limpiar el registro concurrente
      const createdId = successes[0].user?.id;
      if (createdId) {
        await prisma.cliente.delete({ where: { id: createdId } }).catch(() => {});
      }
    } else {
      throw new Error(`TEST 7 FALLÓ: Resultados inesperados en concurrencia: r1=${JSON.stringify(r1)}, r2=${JSON.stringify(r2)}`);
    }

  } finally {
    // Limpieza de datos de prueba
    console.log("\n[CLEANUP] Eliminando registros creados durante el test...");
    if (createdClientId1) {
      await prisma.cliente.delete({ where: { id: createdClientId1 } }).catch(() => {});
    }
    if (createdClientId2) {
      await prisma.cliente.delete({ where: { id: createdClientId2 } }).catch(() => {});
    }
    await prisma.cliente.deleteMany({
      where: {
        OR: [
          { email: { in: [testEmail1, testEmail2, testEmail3, "concurrente1@example.com", "concurrente2@example.com"] } },
          { dni: { in: [testDni1, "99887765", "99887700"] } },
        ],
      },
    }).catch(() => {});

    // Limpiar del mapa de credenciales si se hubieran guardado
    const credsRow = await prisma.configuracionEcommerce.findUnique({
      where: { clave: "clientes_credenciales_ecommerce" },
    });
    if (credsRow?.valor) {
      const creds = JSON.parse(credsRow.valor);
      let changed = false;
      for (const [id, c] of Object.entries(creds) as any) {
        if (
          [testEmail1, testEmail2, testEmail3, "concurrente1@example.com", "concurrente2@example.com"].includes(c.email) ||
          [testDni1, "99887765", "99887700"].includes(c.dni)
        ) {
          delete creds[id];
          changed = true;
        }
      }
      if (changed) {
        await prisma.configuracionEcommerce.update({
          where: { clave: "clientes_credenciales_ecommerce" },
          data: { valor: JSON.stringify(creds) },
        });
      }
    }
    console.log("✅ Cleanup finalizado. Base de datos limpia e intacta.");
  }
}

runTests()
  .then(() => {
    console.log("\n=================================================");
    console.log("TODAS LAS PRUEBAS DE DNI FINALIZARON CON ÉXITO");
    console.log("=================================================");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ ERROR EN PRUEBAS:", err);
    process.exit(1);
  });
