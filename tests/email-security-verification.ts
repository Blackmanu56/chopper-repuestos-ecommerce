/**
 * Suite de Verificación Automatizada: Correos Duplicados y Códigos de Seguridad
 * CHOPPER REPUESTOS - E-COMMERCE & SGI
 *
 * Pruebas A a G según especificación:
 * Prueba A: Una acción válida genera exactamente un intento de envío.
 * Prueba B: Doble clic o dos solicitudes simultáneas no generan notificaciones duplicadas.
 * Prueba C: Error del proveedor se maneja correctamente, sin informar falsamente éxito.
 * Prueba D: Un código válido puede utilizarse una vez (no reutilizable).
 * Prueba E: Código incorrecto o vencido no permite completar la operación.
 * Prueba F: Reenvío de códigos respeta límites (3 máx) y cooldown (60s).
 * Prueba G: Actualización de pedido no dispara dos notificaciones iguales por el mismo cambio.
 */

import nodemailer from "nodemailer";
import { prisma } from "../src/lib/prisma";
import {
  enviarEmailPedidoEvento,
  enviarEmailCodigoRegistro,
  enviarEmailRecuperacionPassword,
} from "../src/lib/email";
import {
  solicitarRegistroClienteAction,
  reenviarCodigoRegistroAction,
  confirmarRegistroClienteAction,
  solicitarRecuperacionPasswordAction,
  verificarCodigoRecuperacionAction,
  restablecerPasswordAction,
} from "../src/actions/auth";

// Interceptor de llamadas a Nodemailer
let sendMailCalls: Array<{ to: string; subject: string; text?: string; html?: string }> = [];
let mockSendMailError: Error | null = null;
let mockSendDelayMs = 0;

// Reemplazar createTransport por mock controlado en memoria
const originalCreateTransport = nodemailer.createTransport;
(nodemailer as any).createTransport = () => {
  return {
    sendMail: async (options: any) => {
      if (mockSendDelayMs > 0) {
        await new Promise((r) => setTimeout(r, mockSendDelayMs));
      }
      if (mockSendMailError) {
        throw mockSendMailError;
      }
      sendMailCalls.push({
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      return { messageId: `mock_${Date.now()}_${Math.random().toString(36).substring(2)}` };
    },
    verify: async () => true,
  } as any;
};

// Variables para pruebas controladas
process.env.SMTP_USER = "chopper.test.audit@gmail.com";
process.env.SMTP_PASS = "mock_app_password_audit";
process.env.SMTP_TEST_MODE = "false"; // Permitir evaluación sin listas blancas para mocks locales

function resetMocks() {
  sendMailCalls = [];
  mockSendMailError = null;
  mockSendDelayMs = 0;
}

interface TestResult {
  prueba: string;
  nombre: string;
  exitosa: boolean;
  detalles: string;
}

const resultados: TestResult[] = [];

async function ejecutarPruebas() {
  console.log("================================================================================");
  console.log("INICIANDO PRUEBAS CONTROLADAS DE CORREOS Y CÓDIGOS DE SEGURIDAD");
  console.log("================================================================================\n");

  const testEmailBase = `test_audit_${Date.now()}@chopper-repuestos-test.com`;

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA A: Una acción válida genera exactamente un intento de envío
  // ──────────────────────────────────────────────────────────────────────────
  {
    resetMocks();
    const emailA = `a_${testEmailBase}`;
    const resA = await enviarEmailCodigoRegistro({
      nombreCliente: "Cliente Prueba A",
      email: emailA,
      codigo: "123456",
    });

    const callsCount = sendMailCalls.filter((c) => c.to === emailA).length;
    const ok = resA.success === true && callsCount === 1;

    resultados.push({
      prueba: "Prueba A",
      nombre: "Una acción válida genera exactamente un intento de envío",
      exitosa: ok,
      detalles: `Resultado acción: success=${resA.success} | Intentos de envío registrados: ${callsCount}`,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA B: Doble clic o solicitudes simultáneas no generan envíos duplicados
  // ──────────────────────────────────────────────────────────────────────────
  {
    resetMocks();
    mockSendDelayMs = 100; // Simular latencia de red/SMTP de 100ms
    const emailB = `b_${Date.now()}@test-dedup.com`;

    // Disparar 2 solicitudes de registro en paralelo con datos idénticos (simulando doble clic)
    const [resB1, resB2] = await Promise.all([
      solicitarRegistroClienteAction({
        nombreCompleto: "Usuario Doble Clic",
        email: emailB,
        telefono: "3764001122",
        password: "passwordSegura123",
      }),
      solicitarRegistroClienteAction({
        nombreCompleto: "Usuario Doble Clic",
        email: emailB,
        telefono: "3764001122",
        password: "passwordSegura123",
      }),
    ]);

    const callsCount = sendMailCalls.filter((c) => c.to === emailB).length;
    const ok = (resB1.success || resB2.success) && callsCount === 1;

    // Limpiar registro temporal de prueba en configuracion
    try {
      await prisma.configuracionEcommerce.delete({ where: { clave: `registro_pendiente_${emailB}` } });
    } catch {}

    resultados.push({
      prueba: "Prueba B",
      nombre: "Doble clic o solicitudes simultáneas no generan notificaciones duplicadas",
      exitosa: ok,
      detalles: `Llamadas concurrentes disparadas: 2 | Correos enviados por SMTP: ${callsCount} (esperado: 1)`,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA C: Error del proveedor SMTP se maneja sin informar falsamente éxito
  // ──────────────────────────────────────────────────────────────────────────
  {
    resetMocks();
    mockSendMailError = new Error("Connection timeout with smtp.gmail.com:465");
    const emailC = `c_${testEmailBase}`;

    const resC = await enviarEmailCodigoRegistro({
      nombreCliente: "Cliente Fallo SMTP",
      email: emailC,
      codigo: "987654",
    });

    // Debe retornar success: false y no simular que el correo fue entregado
    const ok = resC.success === false && Boolean(resC.error);

    resultados.push({
      prueba: "Prueba C",
      nombre: "Error del proveedor se maneja correctamente sin informar falsamente éxito",
      exitosa: ok,
      detalles: `Resultado devuelto: success=${resC.success} | Error capturado: "${resC.error}"`,
    });
    mockSendMailError = null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA D: Un código válido puede utilizarse una sola vez (no reutilizable)
  // ──────────────────────────────────────────────────────────────────────────
  {
    resetMocks();
    const emailD = `d_${Date.now()}@choppertest.com`;

    // 1. Iniciar registro
    const regRes = await solicitarRegistroClienteAction({
      nombreCompleto: "Cliente Unico Uso",
      email: emailD,
      telefono: "3764556677",
      password: "claveSegura123",
    });

    // Extraer el código emitido capturado por el mock
    const lastMail = sendMailCalls.find((c) => c.to === emailD);
    const codeMatch = lastMail?.text?.match(/\b\d{6}\b/);
    const validCode = codeMatch ? codeMatch[0] : "";

    let primerUsoOk = false;
    let segundoUsoRechazado = false;

    if (validCode) {
      // 2. Primer uso del código: debe ser exitoso
      const use1 = await confirmarRegistroClienteAction(emailD, validCode);
      primerUsoOk = use1.success;

      // 3. Segundo intento con el MISMO código: debe ser rechazado
      const use2 = await confirmarRegistroClienteAction(emailD, validCode);
      segundoUsoRechazado = use2.success === false;

      // Limpiar cliente creado de prueba
      if (use1.user?.id) {
        try {
          await prisma.credencialCliente.deleteMany({ where: { clienteId: use1.user.id } });
          await prisma.cliente.delete({ where: { id: use1.user.id } });
        } catch {}
      }
    }

    const ok = primerUsoOk && segundoUsoRechazado;
    resultados.push({
      prueba: "Prueba D",
      nombre: "Un código válido puede utilizarse una vez (no reutilizable)",
      exitosa: ok,
      detalles: `Primer uso: ${primerUsoOk ? "Aprobado" : "Falló"} | Reintento posterior: ${segundoUsoRechazado ? "Rechazado como esperado" : "Aceptado incorrectamente"}`,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA E: Código incorrecto o vencido no permite completar la operación
  // ──────────────────────────────────────────────────────────────────────────
  {
    resetMocks();
    const emailE = `e_${Date.now()}@choppertest.com`;

    await solicitarRegistroClienteAction({
      nombreCompleto: "Cliente Codigo Invalido",
      email: emailE,
      telefono: "3764889900",
      password: "claveSegura123",
    });

    // 1. Probar código erróneo
    const testErroneo = await confirmarRegistroClienteAction(emailE, "000000");
    const rechazoErroneoOk = testErroneo.success === false;

    // 2. Simular vencimiento manipulando la fecha de expiración en base de datos
    const clave = `registro_pendiente_${emailE}`;
    const row = await prisma.configuracionEcommerce.findUnique({ where: { clave } });
    if (row?.valor) {
      const data = JSON.parse(row.valor);
      data.expiraEn = new Date(Date.now() - 60000).toISOString(); // Vencido hace 1 minuto
      await prisma.configuracionEcommerce.update({
        where: { clave },
        data: { valor: JSON.stringify(data) },
      });
    }

    // Extraer código válido pero vencido
    const lastMail = sendMailCalls.find((c) => c.to === emailE);
    const codeMatch = lastMail?.text?.match(/\b\d{6}\b/);
    const validCode = codeMatch ? codeMatch[0] : "123456";

    const testVencido = await confirmarRegistroClienteAction(emailE, validCode);
    const rechazoVencidoOk: boolean = Boolean(testVencido.success === false && testVencido.error?.toLowerCase().includes("vencid"));

    // Limpieza
    try {
      await prisma.configuracionEcommerce.deleteMany({ where: { clave } });
    } catch {}

    const ok: boolean = Boolean(rechazoErroneoOk && rechazoVencidoOk);
    resultados.push({
      prueba: "Prueba E",
      nombre: "Código incorrecto o vencido no permite completar la operación",
      exitosa: ok,
      detalles: `Rechazo código incorrecto: ${rechazoErroneoOk ? "OK" : "Falló"} | Rechazo código vencido: ${rechazoVencidoOk ? "OK" : "Falló"}`,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA F: Reenvío de códigos respeta límites y cooldown
  // ──────────────────────────────────────────────────────────────────────────
  {
    resetMocks();
    const emailF = `f_${Date.now()}@choppertest.com`;

    await solicitarRegistroClienteAction({
      nombreCompleto: "Cliente Reenvio",
      email: emailF,
      telefono: "3764123456",
      password: "claveSegura123",
    });

    // 1. Intento de reenvío inmediato: debe ser bloqueado por cooldown de 60 segundos
    const reenvioInmediato = await reenviarCodigoRegistroAction(emailF);
    const cooldownRespetado: boolean = Boolean(reenvioInmediato.success === false && reenvioInmediato.cooldownSeconds);

    // 2. Simular paso del tiempo y agotar los 3 reenvíos permitidos
    const clave = `registro_pendiente_${emailF}`;
    const row = await prisma.configuracionEcommerce.findUnique({ where: { clave } });
    let limiteMaximoRespetado: boolean = false;

    if (row?.valor) {
      const data = JSON.parse(row.valor);
      data.reenviosRealizados = 3; // Ya agotó los 3 permitidos
      data.ultimoEnvioEn = new Date(Date.now() - 70000).toISOString(); // Pasó el cooldown
      await prisma.configuracionEcommerce.update({
        where: { clave },
        data: { valor: JSON.stringify(data) },
      });

      const reenvioExcedido = await reenviarCodigoRegistroAction(emailF);
      limiteMaximoRespetado = Boolean(reenvioExcedido.success === false && reenvioExcedido.error?.includes("límite"));
    }

    // Limpieza
    try {
      await prisma.configuracionEcommerce.deleteMany({ where: { clave } });
    } catch {}

    const ok: boolean = Boolean(cooldownRespetado && limiteMaximoRespetado);
    resultados.push({
      prueba: "Prueba F",
      nombre: "El reenvío de códigos respeta los límites (3 máx) y cooldown (60s)",
      exitosa: ok,
      detalles: `Bloqueo cooldown (<60s): ${cooldownRespetado ? "OK" : "Falló"} | Bloqueo por límite (3 reenvíos): ${limiteMaximoRespetado ? "OK" : "Falló"}`,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA G: Actualización de pedido no dispara dos notificaciones iguales
  // ──────────────────────────────────────────────────────────────────────────
  {
    resetMocks();
    const testPedidoId = Math.floor(800000 + Math.random() * 100000);
    const mockPedido = {
      id: testPedidoId,
      numero: testPedidoId,
      nombreCliente: "Comprador Auditoría",
      emailCliente: `pedido_test_${Date.now()}_${testPedidoId}@choppertest.com`,
      modalidadEntrega: "RETIRO_LOCAL",
      metodoPago: "TRANSFERENCIA",
      total: 15000,
    };

    // 1. Primer despacho del evento PEDIDO_EN_PREPARACION
    const call1 = await enviarEmailPedidoEvento({
      pedido: mockPedido,
      evento: "PEDIDO_EN_PREPARACION",
    });

    // 2. Segundo despacho del MISMO evento para el MISMO pedido (simulando actualización sin cambio o reintento)
    const call2 = await enviarEmailPedidoEvento({
      pedido: mockPedido,
      evento: "PEDIDO_EN_PREPARACION",
    });

    const callsCount = sendMailCalls.filter((c) => c.to === mockPedido.emailCliente).length;
    // call1 debe ser success: true; call2 debe ser skipped: true por idempotencia
    const ok = call1.success === true && call2.skipped === true && callsCount === 1;

    resultados.push({
      prueba: "Prueba G",
      nombre: "Actualización de pedido no dispara dos notificaciones iguales por el mismo cambio",
      exitosa: ok,
      detalles: `Primer envío: success=${call1.success} | Segundo intento: skipped=${call2.skipped} | Correos emitidos: ${callsCount} (esperado: 1)`,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RESTAURAR TRANSPORTE ORIGINAL
  // ──────────────────────────────────────────────────────────────────────────
  (nodemailer as any).createTransport = originalCreateTransport;

  console.log("================================================================================");
  console.log("RESUMEN DE RESULTADOS DE PRUEBAS CONTROLADAS (MOCKS)");
  console.log("================================================================================\n");

  let todasAprobadas = true;
  for (const r of resultados) {
    const estado = r.exitosa ? "✅ APROBADA" : "❌ FALLIDA";
    if (!r.exitosa) todasAprobadas = false;
    console.log(`${estado} | [${r.prueba}] ${r.nombre}`);
    console.log(`   Detalles: ${r.detalles}\n`);
  }

  console.log("--------------------------------------------------------------------------------");
  console.log(`Resultado global: ${todasAprobadas ? "TODAS LAS PRUEBAS APROBADAS (100% OK)" : "EXISTEN PRUEBAS CON FALLAS"}`);
  console.log("--------------------------------------------------------------------------------\n");

  if (!todasAprobadas) {
    process.exit(1);
  }
}

ejecutarPruebas().catch((err) => {
  console.error("Error crítico al ejecutar suite de pruebas:", err);
  process.exit(1);
});
