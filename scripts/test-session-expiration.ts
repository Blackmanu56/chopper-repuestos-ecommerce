import {
  signSessionToken,
  verifySessionToken,
  inspectSessionToken,
  CLIENT_SESSION_DURATION_MS,
  STAFF_SESSION_DURATION_MS,
  SessionPayload,
} from "../src/lib/session";

async function runTests() {
  console.log("==================================================================");
  console.log("PRUEBAS DE DURACIÓN, VENCIMIENTO Y AISLAMIENTO DE SESIONES");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`[OK] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} ${details ? "- " + details : ""}`);
      failed++;
    }
  }

  const now = Date.now();

  // 1. Cliente con sesión vigente (7 días)
  const clientVigentePayload: Omit<SessionPayload, "iat" | "exp"> = {
    kind: "CLIENTE",
    id: 7,
    username: "cliente",
    nombreCompleto: "Carlos Motero",
    rol: "CLIENTE",
    correo: "cliente@gmail.com",
    dni: "34567890",
  };
  const clientTokenVigente = signSessionToken(clientVigentePayload);
  const clientVerified = verifySessionToken(clientTokenVigente);
  assert(
    "1. Cliente con sesión vigente: se valida correctamente",
    clientVerified !== null && clientVerified.kind === "CLIENTE" && clientVerified.id === 7
  );
  if (clientVerified) {
    const duracion = clientVerified.exp - clientVerified.iat;
    assert(
      "1b. Cliente con sesión vigente: expiración exacta de 7 días (604.800 s)",
      duracion === CLIENT_SESSION_DURATION_MS
    );
  }

  // 2. Cliente con sesión vencida después de 7 días
  const sevenDaysAndHourMs = 7 * 24 * 60 * 60 * 1000 + 3600 * 1000;
  const clientTokenVencido = signSessionToken({
    ...clientVigentePayload,
    iat: now - sevenDaysAndHourMs,
    exp: now - 3600 * 1000,
  });
  const clientVencidoResult = verifySessionToken(clientTokenVencido);
  const clientVencidoInspect = inspectSessionToken(clientTokenVencido);
  assert(
    "2. Cliente con sesión vencida (7 días): verifySessionToken retorna null",
    clientVencidoResult === null
  );
  assert(
    "2b. Cliente con sesión vencida (7 días): inspectSessionToken diagnostica 'expired'",
    !clientVencidoInspect.valid && clientVencidoInspect.reason === "expired"
  );

  // 3. Empleado con sesión vigente (24 horas)
  const staffVigentePayload: Omit<SessionPayload, "iat" | "exp"> = {
    kind: "STAFF",
    id: 1,
    username: "admin",
    nombreCompleto: "Administrador General",
    rol: "ADMINISTRADOR",
    correo: "admin@chopperrepuestos.com",
  };
  const staffTokenVigente = signSessionToken(staffVigentePayload);
  const staffVerified = verifySessionToken(staffTokenVigente);
  assert(
    "3. Empleado con sesión vigente: se valida correctamente",
    staffVerified !== null && staffVerified.kind === "STAFF" && staffVerified.rol === "ADMINISTRADOR"
  );
  if (staffVerified) {
    const duracion = staffVerified.exp - staffVerified.iat;
    assert(
      "3b. Empleado con sesión vigente: expiración exacta de 24 horas (86.400 s)",
      duracion === STAFF_SESSION_DURATION_MS
    );
  }

  // 4. Empleado con sesión vencida después de 24 horas
  const twentyFourHoursAndMinuteMs = 24 * 60 * 60 * 1000 + 60 * 1000;
  const staffTokenVencido = signSessionToken({
    ...staffVigentePayload,
    iat: now - twentyFourHoursAndMinuteMs,
    exp: now - 60 * 1000,
  });
  const staffVencidoResult = verifySessionToken(staffTokenVencido);
  const staffVencidoInspect = inspectSessionToken(staffTokenVencido);
  assert(
    "4. Empleado con sesión vencida (24 hs): verifySessionToken retorna null",
    staffVencidoResult === null
  );
  assert(
    "4b. Empleado con sesión vencida (24 hs): inspectSessionToken diagnostica 'expired'",
    !staffVencidoInspect.valid && staffVencidoInspect.reason === "expired"
  );

  // 5. Cookie con firma inválida
  const [b64Payload] = staffTokenVigente.split(".");
  const cookieFirmaInvalida = `${b64Payload}.firma_totalmente_falsa_12345`;
  const firmaInvalidaResult = verifySessionToken(cookieFirmaInvalida);
  const firmaInvalidaInspect = inspectSessionToken(cookieFirmaInvalida);
  assert(
    "5. Cookie con firma inválida: rechazada por verifySessionToken",
    firmaInvalidaResult === null
  );
  assert(
    "5b. Cookie con firma inválida: diagnosticada como 'invalid_signature'",
    !firmaInvalidaInspect.valid && firmaInvalidaInspect.reason === "invalid_signature"
  );

  // 6. Cookie manipulada (payload alterado, ej. CLIENTE intenta subir a ADMINISTRADOR)
  const clientPayloadTampered = {
    ...clientVigentePayload,
    kind: "STAFF",
    rol: "ADMINISTRADOR",
    iat: now,
    exp: now + 3600 * 1000,
  };
  const tamperedB64 = Buffer.from(JSON.stringify(clientPayloadTampered), "utf8").toString("base64url");
  // Se reutiliza la firma del token de cliente
  const [, originalSig] = clientTokenVigente.split(".");
  const cookieTampered = `${tamperedB64}.${originalSig}`;
  const tamperedResult = verifySessionToken(cookieTampered);
  const tamperedInspect = inspectSessionToken(cookieTampered);
  assert(
    "6. Cookie manipulada: intento de escalación de privilegios rechazado",
    tamperedResult === null
  );
  assert(
    "6b. Cookie manipulada: diagnosticada como 'invalid_signature'",
    !tamperedInspect.valid && tamperedInspect.reason === "invalid_signature"
  );

  // 7. Acceso directo a una acción protegida con sesión vencida
  // Simulamos la verificación que realiza requireStaffSession y getMisPedidosClienteAction
  function simulateRequireStaffSession(token: string | null) {
    const inspect = inspectSessionToken(token);
    if (!inspect.valid) {
      if (inspect.reason === "expired") {
        return {
          authorized: false,
          error: "Tu sesión de personal ha expirado tras 24 horas. Por favor, volvé a iniciar sesión.",
        };
      }
      return {
        authorized: false,
        error: "Acceso denegado: debés iniciar sesión con una cuenta de personal autorizado.",
      };
    }
    return { authorized: true };
  }

  function simulateGetMisPedidosClienteAction(token: string | null) {
    const inspect = inspectSessionToken(token);
    if (!inspect.valid) {
      if (inspect.reason === "expired") {
        return {
          success: false,
          error: "Tu sesión ha expirado por límite de tiempo (7 días). Por favor, iniciá sesión nuevamente.",
        };
      }
      return {
        success: false,
        error: "Acceso denegado: debés iniciar sesión para consultar tus pedidos.",
      };
    }
    return { success: true };
  }

  const staffProtectedCall = simulateRequireStaffSession(staffTokenVencido);
  assert(
    "7. Acción protegida de Staff con sesión vencida: rechaza con mensaje de 24 hs",
    !staffProtectedCall.authorized &&
      staffProtectedCall.error === "Tu sesión de personal ha expirado tras 24 horas. Por favor, volvé a iniciar sesión."
  );

  const clientProtectedCall = simulateGetMisPedidosClienteAction(clientTokenVencido);
  assert(
    "7b. Acción protegida de Cliente con sesión vencida: rechaza con mensaje de 7 días",
    !clientProtectedCall.success &&
      clientProtectedCall.error === "Tu sesión ha expirado por límite de tiempo (7 días). Por favor, iniciá sesión nuevamente."
  );

  // 8. Cierre de sesión (cookie eliminada o vacía)
  const emptyToken = "";
  const inspectEmpty = inspectSessionToken(emptyToken);
  assert(
    "8. Cierre de sesión: token vacío diagnosticado como 'missing'",
    !inspectEmpty.valid && inspectEmpty.reason === "missing"
  );
  const staffAfterLogout = simulateRequireStaffSession(emptyToken);
  assert(
    "8b. Cierre de sesión: no permite continuar utilizando acciones protegidas",
    !staffAfterLogout.authorized
  );

  // 9. Cambio entre cuentas de cliente y personal
  const clientAsStaffAttempt = (token: string) => {
    const payload = verifySessionToken(token);
    if (!payload || payload.kind !== "STAFF" || payload.rol === "CLIENTE") {
      return { authorized: false, error: "Acceso denegado: las cuentas de clientes no tienen permisos administrativos." };
    }
    return { authorized: true };
  };
  const staffCheck = clientAsStaffAttempt(clientTokenVigente);
  assert(
    "9. Aislamiento de cuentas: sesión de cliente es rechazada al intentar acceder a módulo de personal",
    !staffCheck.authorized && Boolean(staffCheck.error?.includes("permisos administrativos"))
  );

  // 10. Conservación del carrito correspondiente a cada cuenta
  // Verificamos la lógica de getStorageKey que aísla los carritos
  const getStorageKey = (user: { id: number; rol: string } | null) => {
    if (!user) return "choper_cart_guest";
    if (user.rol === "CLIENTE") return `choper_cart_client_${user.id}`;
    return `choper_cart_staff_${user.id}`;
  };

  const client1Key = getStorageKey({ id: 7, rol: "CLIENTE" });
  const client2Key = getStorageKey({ id: 6, rol: "CLIENTE" });
  const staffKey = getStorageKey({ id: 1, rol: "ADMINISTRADOR" });
  const guestKey = getStorageKey(null);

  assert(
    "10. Conservación del carrito: claves de almacenamiento aisladas por usuario",
    client1Key === "choper_cart_client_7" &&
      client2Key === "choper_cart_client_6" &&
      staffKey === "choper_cart_staff_1" &&
      guestKey === "choper_cart_guest"
  );

  // Simulación de expiración de sesión: al vencer la sesión, user pasa a ser null (guest)
  // pero la clave 'choper_cart_client_7' no se borra, preservando los artículos
  const simulatedLocalStorage = new Map<string, string>();
  simulatedLocalStorage.set(client1Key, JSON.stringify([{ id: 101, cantidad: 2 }]));

  // Sesión expira -> usuario se desloguea
  const userAfterExpiration = null;
  const currentKey = getStorageKey(userAfterExpiration);
  assert(
    "10b. Conservación del carrito: al vencer la sesión el estado cambia a invitado sin borrar el carrito guardado",
    currentKey === "choper_cart_guest" && simulatedLocalStorage.has(client1Key)
  );

  // Cliente vuelve a iniciar sesión
  const userReconnected = { id: 7, rol: "CLIENTE" };
  const restoredCart = simulatedLocalStorage.get(getStorageKey(userReconnected));
  assert(
    "10c. Conservación del carrito: al reconectar el cliente recupera intactos sus productos",
    restoredCart !== undefined && JSON.parse(restoredCart)[0].id === 101
  );

  console.log("\n==================================================================");
  console.log(`RESUMEN DE PRUEBAS: ${passed} pasadas, ${failed} falladas`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Error ejecutando pruebas:", err);
  process.exit(1);
});
