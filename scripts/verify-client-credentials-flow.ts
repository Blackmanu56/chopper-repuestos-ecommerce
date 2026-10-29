import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import { loginClientAction, registerClientAction } from "../src/actions/auth";

async function main() {
  console.log("================================================================================");
  console.log("   SUITE DE VERIFICACIÓN: MIGRACIÓN DE CREDENCIALES DE CLIENTES A TABLA PROPIA");
  console.log("================================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: any, testName: string, details?: any) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${testName}`);
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error("       Detalles:", details);
    }
  }

  // -------------------------------------------------------------------------
  // 1. ESTADO DE LA TABLA credenciales_clientes Y RESPALDO JSON
  // -------------------------------------------------------------------------
  console.log("--- 1. Integridad de la tabla credenciales_clientes y Respaldo ---");
  const count = await prisma.credencialCliente.count();
  assert(count >= 4, `Total registros en credenciales_clientes es >= 4 (actual: ${count})`);

  const legacyJsonRecord = await prisma.configuracionEcommerce.findUnique({
    where: { clave: "clientes_credenciales_ecommerce" },
  });
  assert(legacyJsonRecord === null, "El registro legacy JSON 'clientes_credenciales_ecommerce' ya NO existe en configuracion_ecommerce");

  const client7Cred = await prisma.credencialCliente.findUnique({
    where: { clienteId: 7 },
    include: { cliente: true },
  });
  assert(
    !!client7Cred &&
    client7Cred.username === "cliente" &&
    client7Cred.avatar === "/uploads/avatars/avatar-cliente-7-1793274174522.jpg" &&
    client7Cred.passwordHash.startsWith("$2b$"),
    "Cliente ID 7: Conserva username='cliente', avatar personalizado y hash bcrypt válido"
  );

  const client6Cred = await prisma.credencialCliente.findUnique({
    where: { clienteId: 6 },
    include: { cliente: true },
  });
  assert(
    !!client6Cred &&
    client6Cred.username === "carlos.motero" &&
    client6Cred.passwordHash.startsWith("$2b$"),
    "Cliente ID 6: Conserva username='carlos.motero' y hash bcrypt válido"
  );

  const client18Cred = await prisma.credencialCliente.findUnique({
    where: { clienteId: 18 },
    include: { cliente: true },
  });
  assert(
    !!client18Cred &&
    client18Cred.username === "lionelgarcia" &&
    client18Cred.passwordHash.startsWith("$2b$"),
    "Cliente ID 18: Conserva username='lionelgarcia' y hash bcrypt válido"
  );

  const client19Cred = await prisma.credencialCliente.findUnique({
    where: { clienteId: 19 },
    include: { cliente: true },
  });
  assert(
    !!client19Cred &&
    client19Cred.username === "ynoue" &&
    client19Cred.passwordHash.startsWith("$2b$"),
    "Cliente ID 19: Conserva username='ynoue' y hash bcrypt válido"
  );

  // -------------------------------------------------------------------------
  // 2. PRUEBAS DE INICIO DE SESIÓN (LOGIN)
  // -------------------------------------------------------------------------
  console.log("\n--- 2. Pruebas de Inicio de Sesión de Clientes ---");

  // Login Carlos Motero (ID 7) por username
  const login7User = await loginClientAction("cliente", "cliente123");
  assert(
    login7User.success === true && login7User.user?.id === 7 && login7User.user?.fotoUrl === client7Cred?.avatar,
    "Login exitoso: Cliente ID 7 por username 'cliente' con avatar correcto"
  );

  // Login Carlos Motero (ID 7) por correo electrónico
  const login7Email = await loginClientAction("cliente@gmail.com", "cliente123");
  assert(
    login7Email.success === true && login7Email.user?.id === 7,
    "Login exitoso: Cliente ID 7 por correo 'cliente@gmail.com'"
  );

  // Login Carlos Motero (ID 7) por DNI
  const login7Dni = await loginClientAction("34567890", "cliente123");
  assert(
    login7Dni.success === true && login7Dni.user?.id === 7,
    "Login exitoso: Cliente ID 7 por DNI '34567890'"
  );

  // Login Carlos Motero Posadas (ID 6) por username
  const login6User = await loginClientAction("carlos.motero", "cliente123");
  assert(
    login6User.success === true && login6User.user?.id === 6,
    "Login exitoso: Cliente ID 6 por username 'carlos.motero'"
  );

  // Login Carlos Motero Posadas (ID 6) por correo electrónico
  const login6Email = await loginClientAction("carlos.motero@gmail.com", "cliente123");
  assert(
    login6Email.success === true && login6Email.user?.id === 6,
    "Login exitoso: Cliente ID 6 por correo 'carlos.motero@gmail.com'"
  );

  // Login Carlos Motero Posadas (ID 6) por DNI
  const login6Dni = await loginClientAction("38999888", "cliente123");
  assert(
    login6Dni.success === true && login6Dni.user?.id === 6,
    "Login exitoso: Cliente ID 6 por DNI '38999888'"
  );

  // Login con contraseña incorrecta
  const loginWrongPass = await loginClientAction("cliente", "clave_invalida_123");
  assert(
    loginWrongPass.success === false && loginWrongPass.error?.includes("incorrectos"),
    "Login rechazado ante contraseña incorrecta"
  );

  // Login con usuario inexistente
  const loginNonExistent = await loginClientAction("usuario_fantasma_999", "password123");
  assert(
    loginNonExistent.success === false && loginNonExistent.error?.includes("incorrectos"),
    "Login rechazado ante usuario inexistente"
  );

  // -------------------------------------------------------------------------
  // 3. PRUEBA DE REGISTRO DE NUEVO CLIENTE (TABLA DEDICADA Y CASCADE)
  // -------------------------------------------------------------------------
  console.log("\n--- 3. Pruebas de Registro de Clientes y Cascada en BD ---");

  const testEmail = "test.migracion.credenciales@chopper.com";
  const testDni = "48111222";
  const testPass = "passwordSegura123";

  // Limpiar previo si existiera
  const prevExisting = await prisma.cliente.findFirst({
    where: { OR: [{ email: testEmail }, { dni: testDni }] },
  });
  if (prevExisting) {
    await prisma.cliente.delete({ where: { id: prevExisting.id } });
  }

  const regResult = await registerClientAction({
    nombreCompleto: "Cliente Prueba Migracion",
    email: testEmail,
    telefono: "1122334455",
    password: testPass,
    dni: testDni,
    direccion: "Av. Pruebas 123",
  });

  assert(regResult.success === true && !!regResult.user?.id, "Registro exitoso de nuevo cliente con registerClientAction");

  const newClientId = regResult.user?.id!;

  // Verificar que se creó el registro en credenciales_clientes
  const createdCred = await prisma.credencialCliente.findUnique({
    where: { clienteId: newClientId },
  });

  assert(
    !!createdCred &&
    createdCred.clienteId === newClientId &&
    createdCred.username === "test.migracion.credenciales" &&
    createdCred.passwordHash.startsWith("$2b$"),
    "Se creó la credencial en PostgreSQL tabla credenciales_clientes vinculada por foreign key"
  );

  // Verificar que el hash es válido para la clave provista
  const hashMatches = createdCred ? await bcrypt.compare(testPass, createdCred.passwordHash) : false;
  assert(hashMatches, "El hash almacenado en credenciales_clientes valida la contraseña registrada");

  // Probar login con el cliente recién registrado
  const loginNewUser = await loginClientAction(testEmail, testPass);
  assert(
    loginNewUser.success === true && loginNewUser.user?.id === newClientId,
    "Login exitoso con la cuenta recién registrada desde credenciales_clientes"
  );

  // Probar restricción de duplicados por DNI
  const dupDniResult = await registerClientAction({
    nombreCompleto: "Otro Cliente",
    email: "otro.mail@chopper.com",
    telefono: "1199887766",
    password: "otraPassword123",
    dni: testDni,
  });
  assert(
    dupDniResult.success === false && dupDniResult.error?.includes("DNI ya se encuentra registrado"),
    "Registro duplicado por DNI bloqueado correctamente"
  );

  // Probar restricción de duplicados por Email
  const dupEmailResult = await registerClientAction({
    nombreCompleto: "Otro Cliente",
    email: testEmail,
    telefono: "1199887766",
    password: "otraPassword123",
    dni: "49333444",
  });
  assert(
    dupEmailResult.success === false && dupEmailResult.error?.includes("correo"),
    "Registro duplicado por Email bloqueado correctamente"
  );

  // Probar eliminación en cascada (ON DELETE CASCADE)
  await prisma.cliente.delete({ where: { id: newClientId } });
  const orphanCred = await prisma.credencialCliente.findUnique({
    where: { clienteId: newClientId },
  });
  assert(orphanCred === null, "ON DELETE CASCADE verificado: al eliminar el cliente se eliminó su credencial automáticamente sin dejar huérfanos");

  // -------------------------------------------------------------------------
  // 4. VERIFICAR QUE NUNCA SE REESCRIBIÓ EL REGISTRO ELIMINADO
  // -------------------------------------------------------------------------
  console.log("\n--- 4. Verificación de No-Reaparición del Registro JSON Legacy ---");
  const finalCheckLegacy = await prisma.configuracionEcommerce.findUnique({
    where: { clave: "clientes_credenciales_ecommerce" },
  });
  assert(
    finalCheckLegacy === null,
    "El registro legacy 'clientes_credenciales_ecommerce' sigue 100% inexistente (ninguna acción lo recreó)"
  );

  console.log("\n================================================================================");
  console.log(`   RESULTADOS FINALES: ${passedTests} de ${totalTests} pruebas superadas (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("================================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error("Error fatal en suite de verificación:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
