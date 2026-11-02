import { prisma } from "../src/lib/prisma";
import {
  solicitarRegistroClienteAction,
  confirmarRegistroClienteAction,
  reenviarCodigoRegistroAction,
  loginClientAction,
  solicitarRecuperacionPasswordAction,
} from "../src/actions/auth";
import crypto from "crypto";

async function main() {
  console.log("================================================================================");
  console.log("   SUITE DE PRUEBAS: VERIFICACIÓN DE CORREO EN REGISTRO DE CLIENTES (6 DÍGITOS)  ");
  console.log("================================================================================");

  let passed = 0;
  let failed = 0;

  function assert(cond: boolean | undefined | null, desc: string, details?: string) {
    if (Boolean(cond)) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}${details ? ` -> ${details}` : ""}`);
      failed++;
    }
  }

  const testEmail = `test.audit.reg.${Date.now()}@chopper.com`;
  const testDni = `98${Date.now().toString().slice(-6)}`;
  const testPassword = "PasswordSegura123!";

  try {
    // -------------------------------------------------------------------------
    // 1. Solicitud inicial de registro: validaciones y despacho
    // -------------------------------------------------------------------------
    console.log("\n--- 1. Solicitud de Registro y Almacenamiento Seguro ---");
    const solRes = await solicitarRegistroClienteAction({
      nombreCompleto: "Auditoría Verificación",
      email: testEmail,
      telefono: "3764001122",
      password: testPassword,
      dni: testDni,
    });

    assert(solRes.success === true, "Solicitud de registro exitosa", solRes.error);
    assert(Boolean(solRes.emailMasked), "Retorna correo enmascarado para la UI");
    assert(solRes.cooldownSeconds === 60, "Retorna cooldown de 60 segundos");

    // Verificar que el cliente NO fue creado en la tabla `clientes` de PostgreSQL todavía
    const clientePrecheck = await prisma.cliente.findFirst({
      where: { email: { equals: testEmail, mode: "insensitive" } },
    });
    assert(clientePrecheck === null, "El cliente NO se creó en PostgreSQL antes de verificar el correo");

    // Obtener la solicitud temporal desde configuracion_ecommerce
    const row = await prisma.configuracionEcommerce.findUnique({
      where: { clave: `registro_pendiente_${testEmail}` },
    });
    assert(row !== null, "La solicitud temporal se guardó en configuracion_ecommerce");

    const pendingData = row ? JSON.parse(row.valor) : null;
    assert(
      pendingData && !("password" in pendingData) && pendingData.passwordHash.startsWith("$2"),
      "La contraseña está protegida con hash bcrypt y NUNCA en texto plano"
    );
    assert(
      pendingData && !("codigo" in pendingData) && Boolean(pendingData.codigoHmac),
      "El código numérico está protegido con HMAC-SHA256 y NUNCA en texto plano"
    );

    const expiraMs = new Date(pendingData.expiraEn).getTime() - Date.now();
    assert(
      expiraMs > 4 * 60 * 1000 && expiraMs <= 5 * 60 * 1000,
      "El código de verificación tiene una ventana de expiración exacta de 5 minutos",
      `expiraMs: ${expiraMs}`
    );

    // -------------------------------------------------------------------------
    // 2. Cooldown de 60 segundos en reenvío inmediato
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Control de Cooldown de Reenvío (60s) ---");
    const reenvioTemprano = await reenviarCodigoRegistroAction(testEmail);
    assert(
      reenvioTemprano.success === false && (reenvioTemprano.cooldownSeconds || 0) > 0,
      "Bloquea reenvío antes de los 60 segundos con mensaje de espera",
      reenvioTemprano.error
    );

    // -------------------------------------------------------------------------
    // 3. Código incorrecto e incremento de intentos fallidos
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Código Incorrecto y Control de Intentos Fallidos ---");
    const intentoInvalido1 = await confirmarRegistroClienteAction(testEmail, "000000");
    assert(
      intentoInvalido1.success === false && intentoInvalido1.error?.includes("Te quedan 4 intento(s)"),
      "Rechaza código incorrecto y descuenta intentos (quedan 4)",
      intentoInvalido1.error
    );

    // -------------------------------------------------------------------------
    // 4. Límite de 5 intentos fallidos provoca la cancelación de la solicitud
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Agotamiento de 5 Intentos Fallidos ---");
    await confirmarRegistroClienteAction(testEmail, "000001"); // Intento 2 (quedan 3)
    await confirmarRegistroClienteAction(testEmail, "000002"); // Intento 3 (quedan 2)
    await confirmarRegistroClienteAction(testEmail, "000003"); // Intento 4 (quedan 1)
    const intentoFinal = await confirmarRegistroClienteAction(testEmail, "000004"); // Intento 5 (agotado)

    assert(
      intentoFinal.success === false && intentoFinal.error?.includes("Se agotaron los 5 intentos"),
      "Al 5to intento fallido rechaza y cancela la solicitud",
      intentoFinal.error
    );

    // Al siguiente intento ya no debe existir la solicitud
    const intentoPosterior = await confirmarRegistroClienteAction(testEmail, "000005");
    assert(
      intentoPosterior.success === false && intentoPosterior.error?.includes("No hay ninguna solicitud"),
      "La solicitud agotada fue eliminada y no permite más operaciones"
    );

    // -------------------------------------------------------------------------
    // 5. Simulación de solicitud con vencimiento de 5 minutos
    // -------------------------------------------------------------------------
    console.log("\n--- 5. Control de Expiración (5 Minutos) ---");
    const solVenceEmail = `test.vence.${Date.now()}@chopper.com`;
    await solicitarRegistroClienteAction({
      nombreCompleto: "Vencimiento Test",
      email: solVenceEmail,
      telefono: "3764112233",
      password: testPassword,
    });

    // Forzar expiración en el registro
    const rowVence = await prisma.configuracionEcommerce.findUnique({
      where: { clave: `registro_pendiente_${solVenceEmail}` },
    });
    if (rowVence) {
      const dataVence = JSON.parse(rowVence.valor);
      dataVence.expiraEn = new Date(Date.now() - 5000).toISOString(); // 5 seg en el pasado (> 5 min transcurridos)
      await prisma.configuracionEcommerce.update({
        where: { clave: `registro_pendiente_${solVenceEmail}` },
        data: { valor: JSON.stringify(dataVence) },
      });
    }

    const testVenceRes = await confirmarRegistroClienteAction(solVenceEmail, "123456");
    assert(
      testVenceRes.success === false && testVenceRes.error?.includes("ha vencido"),
      "Rechaza verificación de código vencido (> 5 min)",
      testVenceRes.error
    );

    // -------------------------------------------------------------------------
    // 6. Límite de 3 reenvíos de código
    // -------------------------------------------------------------------------
    console.log("\n--- 6. Límite de 3 Reenvíos de Código ---");
    const solReenvioEmail = `test.reenvios.${Date.now()}@chopper.com`;
    await solicitarRegistroClienteAction({
      nombreCompleto: "Reenvíos Test",
      email: solReenvioEmail,
      telefono: "3764556677",
      password: testPassword,
    });

    // Simular que pasaron 60 segundos para permitir reenvíos 1, 2 y 3
    for (let r = 1; r <= 3; r++) {
      const rowR = await prisma.configuracionEcommerce.findUnique({
        where: { clave: `registro_pendiente_${solReenvioEmail}` },
      });
      if (rowR) {
        const dataR = JSON.parse(rowR.valor);
        dataR.ultimoEnvioEn = new Date(Date.now() - 65 * 1000).toISOString();
        await prisma.configuracionEcommerce.update({
          where: { clave: `registro_pendiente_${solReenvioEmail}` },
          data: { valor: JSON.stringify(dataR) },
        });
      }
      const reenvioRes = await reenviarCodigoRegistroAction(solReenvioEmail);
      assert(reenvioRes.success === true, `Reenvío ${r} de 3 permitido con éxito`);
    }

    // El 4to reenvío debe ser bloqueado por superar el máximo de 3
    const rowR4 = await prisma.configuracionEcommerce.findUnique({
      where: { clave: `registro_pendiente_${solReenvioEmail}` },
    });
    if (rowR4) {
      const dataR4 = JSON.parse(rowR4.valor);
      dataR4.ultimoEnvioEn = new Date(Date.now() - 65 * 1000).toISOString();
      await prisma.configuracionEcommerce.update({
        where: { clave: `registro_pendiente_${solReenvioEmail}` },
        data: { valor: JSON.stringify(dataR4) },
      });
    }

    const reenvioBloqueado = await reenviarCodigoRegistroAction(solReenvioEmail);
    assert(
      reenvioBloqueado.success === false && reenvioBloqueado.error?.includes("máximo de 3 reenvíos"),
      "Bloquea el 4to reenvío por superar el límite permitido",
      reenvioBloqueado.error
    );

    // Limpiar prueba de reenvíos
    await prisma.configuracionEcommerce.delete({
      where: { clave: `registro_pendiente_${solReenvioEmail}` },
    });

    // -------------------------------------------------------------------------
    // 7. Flujo completo exitoso: Registro + Código Correcto + Creación en BD
    // -------------------------------------------------------------------------
    console.log("\n--- 7. Flujo Exitoso: Verificación de Código y Creación en PostgreSQL ---");
    const solExitoEmail = `test.exito.${Date.now()}@chopper.com`;
    const solExitoDni = `88${Date.now().toString().slice(-6)}`;

    await solicitarRegistroClienteAction({
      nombreCompleto: "Cliente Verificado",
      email: solExitoEmail,
      telefono: "3764889900",
      password: testPassword,
      dni: solExitoDni,
      direccion: "Calle Posadas 123",
    });

    // Extraer HMAC para calcular un código válido en la prueba
    const rowExito = await prisma.configuracionEcommerce.findUnique({
      where: { clave: `registro_pendiente_${solExitoEmail}` },
    });
    assert(rowExito !== null, "Solicitud guardada para verificación exitosa");

    // Reemplazar temporalmente el HMAC por el de un código conocido '778899' para validar el flujo
    const codigoPrueba = "778899";
    const secret = process.env.JWT_SECRET || "chopper_default_secure_secret_2026";
    const hmacConocido = crypto.createHmac("sha256", secret).update(codigoPrueba).digest("hex");

    if (rowExito) {
      const dataExito = JSON.parse(rowExito.valor);
      dataExito.codigoHmac = hmacConocido;
      await prisma.configuracionEcommerce.update({
        where: { clave: `registro_pendiente_${solExitoEmail}` },
        data: { valor: JSON.stringify(dataExito) },
      });
    }

    // Confirmar con el código correcto
    const confirmRes = await confirmarRegistroClienteAction(solExitoEmail, codigoPrueba);
    assert(confirmRes.success === true, "Confirmación con código correcto exitosa", confirmRes.error);
    assert(confirmRes.user?.rol === "CLIENTE", "El usuario devuelto tiene rol CLIENTE");
    assert(confirmRes.user?.correo === solExitoEmail, "El correo coincide con el verificado");

    // Comprobar que AHORA SÍ existe en PostgreSQL en la tabla `clientes`
    const clienteCreado = await prisma.cliente.findFirst({
      where: { email: solExitoEmail },
      include: { credencial: true },
    });
    assert(clienteCreado !== null, "El cliente se creó efectivamente en PostgreSQL tras verificar el código");
    assert(
      clienteCreado?.credencial !== null && clienteCreado?.credencial?.passwordHash.startsWith("$2"),
      "La credencial se vinculó en PostgreSQL con hash bcrypt"
    );

    // Comprobar que la solicitud temporal se borró de configuracion_ecommerce (un solo uso)
    const rowPostConfirm = await prisma.configuracionEcommerce.findUnique({
      where: { clave: `registro_pendiente_${solExitoEmail}` },
    });
    assert(rowPostConfirm === null, "La solicitud temporal se eliminó (código de un solo uso)");

    // Intentar reusar el mismo código debe fallar
    const reusoRes = await confirmarRegistroClienteAction(solExitoEmail, codigoPrueba);
    assert(reusoRes.success === false, "Reutilización del mismo código rechazada de inmediato");

    // -------------------------------------------------------------------------
    // 8. Intentar registrar duplicados (mismo correo o mismo DNI)
    // -------------------------------------------------------------------------
    console.log("\n--- 8. Prevención de Duplicados en Solicitud ---");
    const solDupEmail = await solicitarRegistroClienteAction({
      nombreCompleto: "Otro Cliente",
      email: solExitoEmail, // Mismo correo
      telefono: "3764999999",
      password: testPassword,
    });
    assert(
      solDupEmail.success === false && solDupEmail.error?.includes("Ya existe una cuenta registrada"),
      "Bloquea solicitud con correo ya registrado"
    );

    const solDupDni = await solicitarRegistroClienteAction({
      nombreCompleto: "Otro Cliente Más",
      email: `otro.${Date.now()}@chopper.com`,
      telefono: "3764999999",
      password: testPassword,
      dni: solExitoDni, // Mismo DNI
    });
    assert(
      solDupDni.success === false && solDupDni.error?.includes("DNI ya se encuentra registrado"),
      "Bloquea solicitud con DNI ya registrado"
    );

    // -------------------------------------------------------------------------
    // 9. Login con la nueva cuenta y Login de clientes existentes
    // -------------------------------------------------------------------------
    console.log("\n--- 9. Verificación de Login (Nueva Cuenta y Cuentas Existentes) ---");
    const loginNuevaCuenta = await loginClientAction(solExitoEmail, testPassword);
    assert(
      loginNuevaCuenta.success === true && loginNuevaCuenta.user?.id === clienteCreado?.id,
      "Inicio de sesión exitoso con la cuenta recién verificada"
    );

    // Login Carlos Motero (Cliente ID 7)
    const loginCarlos = await loginClientAction("cliente", "cliente123");
    assert(
      loginCarlos.success === true && loginCarlos.user?.id === 7,
      "Login de cliente existente Carlos Motero (ID 7) intacto y operativo"
    );

    // -------------------------------------------------------------------------
    // 10. Flujo de recuperación de contraseña sin regresiones
    // -------------------------------------------------------------------------
    console.log("\n--- 10. Compatibilidad con Recuperación de Contraseña ---");
    const solRecup = await solicitarRecuperacionPasswordAction("cliente@gmail.com");
    assert(solRecup.success === true, "Solicitud de recuperación de contraseña operativa");

    // -------------------------------------------------------------------------
    // Limpieza de datos de prueba
    // -------------------------------------------------------------------------
    console.log("\n--- Limpieza de Registros de Prueba ---");
    if (clienteCreado) {
      await prisma.credencialCliente.deleteMany({ where: { clienteId: clienteCreado.id } });
      await prisma.cliente.delete({ where: { id: clienteCreado.id } });
      console.log(`[CLEANUP] Cliente ID ${clienteCreado.id} eliminado correctamente.`);
    }

  } catch (err: any) {
    console.error("Error inesperado en suite de pruebas:", err);
    failed++;
  }

  console.log("\n================================================================================");
  console.log(`   RESULTADOS: ${passed} de ${passed + failed} pruebas superadas (${failed === 0 ? "100% OK" : "HAY FALLOS"})`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(console.error).finally(() => process.exit(0));
