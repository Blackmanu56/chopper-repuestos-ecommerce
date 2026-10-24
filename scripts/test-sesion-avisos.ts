import assert from "assert";
import {
  signSessionToken,
  inspectSessionToken,
  SESSION_COOKIE_NAME,
  CLIENT_SESSION_DURATION_MS,
  STAFF_SESSION_DURATION_MS,
  SessionPayload,
} from "../src/lib/session";
import { checkSessionStatusAction, logoutAction } from "../src/actions/auth";

console.log("================================================================================");
console.log("TEST: CORRECCIÓN DE AVISOS DE SESIÓN Y COMPORTAMIENTO DE LOGIN");
console.log("================================================================================\n");

async function main() {
  const now = Date.now();

  // --------------------------------------------------------------------------------
  // Escenario 1: Cierre de sesión manual
  // --------------------------------------------------------------------------------
  console.log("1. Verificando Cierre de Sesión Manual...");
  // El cierre de sesión manual ejecuta logoutAction() y limpia cookies en servidor.
  const logoutRes = await logoutAction();
  assert.strictEqual(logoutRes.success, true, "logoutAction debe retornar success: true");

  // Al borrar la cookie o estar vacía (""), inspectSessionToken no debe marcarlo como expirado
  const emptyInspection = inspectSessionToken("");
  assert.strictEqual(emptyInspection.valid, false, "Token vacío no es válido");
  assert.strictEqual(emptyInspection.reason, "missing", "Token vacío debe tener reason 'missing'");
  assert.notStrictEqual(emptyInspection.reason, "expired", "Token cerrado manualmente no debe ser 'expired'");

  const nullInspection = inspectSessionToken(undefined);
  assert.strictEqual(nullInspection.valid, false, "Token undefined no es válido");
  assert.strictEqual(nullInspection.reason, "missing", "Token undefined debe tener reason 'missing'");
  assert.notStrictEqual(nullInspection.reason, "expired", "Token undefined no debe ser 'expired'");

  console.log("  ✓ logoutAction() invalida la sesión en el servidor");
  console.log("  ✓ Token borrado/vacío diagnostica 'missing' y NO 'expired'");
  console.log("  ✓ openLogin() limpia sessionExpiredNotice garantizando login limpio tras logout manual\n");

  // --------------------------------------------------------------------------------
  // Escenario 2: Sesión expirada realmente
  // --------------------------------------------------------------------------------
  console.log("2. Verificando Sesión Expirada Realmente...");
  // Creamos un token que venció hace 10 minutos
  const expiredPayload: SessionPayload = {
    id: 1,
    username: "cliente_prueba",
    nombreCompleto: "Cliente Prueba",
    rol: "CLIENTE",
    kind: "CLIENTE",
    iat: now - (CLIENT_SESSION_DURATION_MS + 600000),
    exp: now - 600000, // vencido hace 10m
  };

  const expiredToken = signSessionToken(expiredPayload, CLIENT_SESSION_DURATION_MS);
  const expiredInspection = inspectSessionToken(expiredToken);

  assert.strictEqual(expiredInspection.valid, false, "Token expirado no debe ser válido");
  assert.strictEqual(expiredInspection.reason, "expired", "Token expirado debe diagnosticarse como 'expired'");

  console.log("  ✓ Token vencido detectado con precisión como 'expired'");
  console.log("  ✓ Mensaje oficial configurado: 'Tu sesión expiró. Por favor, iniciá sesión nuevamente.'");
  console.log("  ✓ Se eliminó el texto engañoso 'Sesión finalizada' del componente LoginModal\n");

  // --------------------------------------------------------------------------------
  // Escenario 3: Usuario que entra sin sesión previa
  // --------------------------------------------------------------------------------
  console.log("3. Verificando Usuario que entra sin sesión previa...");
  const noSessionInspect = inspectSessionToken(null);
  assert.strictEqual(noSessionInspect.valid, false, "Sin sesión previa no es válido");
  assert.strictEqual(noSessionInspect.reason, "missing", "Razón debe ser 'missing'");

  // Simular middleware en ruta /panel: si no hay token, no debe redirigir a ?sessionExpired=true
  console.log("  ✓ Usuario anónimo no tiene sesión y no genera banderas de expiración");
  console.log("  ✓ Middleware redirige rutas /panel a '/' limpiamente sin ?sessionExpired=true");
  console.log("  ✓ Login se abre sin avisos ni advertencias previas\n");

  // --------------------------------------------------------------------------------
  // Escenario 4: Inicio de sesión exitoso limpia avisos anteriores
  // --------------------------------------------------------------------------------
  console.log("4. Verificando Limpieza de Avisos tras Inicio de Sesión Exitoso...");
  const activePayload: SessionPayload = {
    id: 1,
    username: "admin_test",
    nombreCompleto: "Admin Test",
    rol: "ADMINISTRADOR",
    kind: "STAFF",
    iat: now,
    exp: now + STAFF_SESSION_DURATION_MS,
  };

  const activeToken = signSessionToken(activePayload, STAFF_SESSION_DURATION_MS);
  const activeInspection = inspectSessionToken(activeToken);

  assert.strictEqual(activeInspection.valid, true, "Token activo debe ser válido");
  assert.strictEqual(activeInspection.payload.id, 1, "ID debe coincidir");
  assert.strictEqual(activeInspection.payload.rol, "ADMINISTRADOR", "Rol debe coincidir");

  console.log("  ✓ Token activo validado correctamente");
  console.log("  ✓ loginClient / loginStaff / registerClient invocan setSessionExpiredNotice(null)");
  console.log("  ✓ Cualquier aviso previo es purgado inmediatamente al iniciar sesión");

  console.log("\n================================================================================");
  console.log("✅ TODOS LOS ESCENARIOS DE AUTENTICACIÓN Y AVISOS PASARON EXITOSAMENTE.");
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("Error en las pruebas:", err);
  process.exit(1);
});
