/**
 * Test de verificación integral de:
 * 1. Renderizado de plantillas de email (8 eventos, modalidades RETIRO_LOCAL y MOTOMANDADO)
 * 2. Idempotencia y Safe Dry-Run de envío de correos
 * 3. Gestión y filtrado de notificaciones internas de Staff por rol
 */

import { renderEmailTemplate, enviarEmailPedidoEvento, EmailEventoPedido } from "../src/lib/email";
import {
  crearNotificacionStaffInternal,
  getStoredNotificacionesStaff,
  saveStoredNotificacionesStaff,
} from "../src/lib/notifications";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=================================================");
  console.log("1. TEST DE RENDERIZADO DE PLANTILLAS DE EMAIL");
  console.log("=================================================");

  const eventos: EmailEventoPedido[] = [
    "PEDIDO_CREADO",
    "TRANSFERENCIA_APROBADA",
    "PEDIDO_EN_PREPARACION",
    "PEDIDO_LISTO",
    "PEDIDO_ENTREGADO",
    "CANCELACION_SOLICITADA",
    "CANCELACION_APROBADA",
    "CANCELACION_RECHAZADA",
  ];

  const baseDatos = {
    numero: 1042,
    nombreCliente: "Carlos García",
    emailCliente: "carlos.garcia.test@example.com",
    modalidadEntrega: "RETIRO_LOCAL",
    metodoPago: "TRANSFERENCIA",
    total: 45000,
    direccionEnvio: "Av. Corrientes 1234, Posadas",
    items: [
      { nombre: "Pastillas de Freno Chopper", cantidad: 2, precioUnitario: 15000, subtotal: 30000 },
      { nombre: "Filtro de Aceite Honda", cantidad: 1, precioUnitario: 15000, subtotal: 15000 },
    ],
    motivoCancelacion: "Pieza solicitada incompatible con el modelo del cliente",
  };

  for (const ev of eventos) {
    const rendered = renderEmailTemplate(ev, baseDatos);
    if (!rendered.subject || !rendered.html || !rendered.text) {
      throw new Error(`Error: Plantilla para evento ${ev} devolvió asunto o cuerpo vacío.`);
    }
    if (!rendered.html.includes("CHOPPER REPUESTOS")) {
      throw new Error(`Error: Plantilla para evento ${ev} no contiene la marca de la tienda.`);
    }
    if (!rendered.html.includes("1042")) {
      throw new Error(`Error: Plantilla para evento ${ev} no contiene el número de pedido.`);
    }
    console.log(`  ✓ Evento ${ev.padEnd(24)} -> Asunto: "${rendered.subject}"`);
  }

  // Verificar variante MOTOMANDADO para PEDIDO_LISTO
  const motoListo = renderEmailTemplate("PEDIDO_LISTO", {
    ...baseDatos,
    modalidadEntrega: "MOTOMANDADO",
  });
  if (!motoListo.subject.toLowerCase().includes("despacho")) {
    throw new Error(`Error: PEDIDO_LISTO con MOTOMANDADO debería indicar 'despacho' en el asunto.`);
  }
  console.log(`  ✓ Evento PEDIDO_LISTO (MOTOMANDADO) -> Asunto: "${motoListo.subject}"`);

  console.log("\n=================================================");
  console.log("2. TEST DE IDEMPOTENCIA Y SAFE DRY-RUN");
  console.log("=================================================");

  const testPedido = {
    id: 99998,
    numero: 1043,
    nombreCliente: "Carlos García",
    emailCliente: "carlos.garcia.test@example.com",
    modalidadEntrega: "RETIRO_LOCAL",
    metodoPago: "TRANSFERENCIA",
    total: 45000,
    items: [
      { nombre: "Pastillas de Freno Chopper", cantidad: 2, precioUnitario: 15000, subtotal: 30000 },
    ],
  };

  // Primer intento (Dry-run o envío según entorno)
  const res1 = await enviarEmailPedidoEvento({
    pedido: testPedido,
    evento: "PEDIDO_CREADO",
  });

  console.log(`  Intento 1: success=${res1.success}, simulated=${res1.simulated}, skipped=${res1.skipped}`);
  if (!res1.success) {
    throw new Error(`Error: Intento 1 falló inesperadamente: ${res1.error}`);
  }

  // Segundo intento: DEBE detectar clave pedido_99998_PEDIDO_CREADO y retornar skipped=true
  const res2 = await enviarEmailPedidoEvento({
    pedido: testPedido,
    evento: "PEDIDO_CREADO",
  });

  console.log(`  Intento 2: success=${res2.success}, simulated=${res2.simulated}, skipped=${res2.skipped}`);
  if (!res2.skipped) {
    throw new Error(`Error de Idempotencia: el segundo intento debería haber sido omitido (skipped: true).`);
  }
  console.log("  ✓ Idempotencia validada: el segundo intento fue ignorado sin reenvíos accidentales.");

  console.log("\n=================================================");
  console.log("3. TEST DE NOTIFICACIONES INTERNAS DE STAFF");
  console.log("=================================================");

  // Limpiar notificaciones previas de test
  const prevNotifs = await getStoredNotificacionesStaff();
  const filteredNotifs = prevNotifs.filter((n) => n.pedidoNumero !== 9999);
  await saveStoredNotificacionesStaff(filteredNotifs);

  // Crear 3 notificaciones para distintos roles
  await crearNotificacionStaffInternal({
    tipo: "NUEVO_PEDIDO_PENDIENTE_PAGO",
    rolDestino: "VENTAS",
    titulo: "Nuevo pedido por transferencia #ORD-9999",
    mensaje: "Comprobante listo para verificar.",
    pedidoId: 8888,
    pedidoNumero: 9999,
    moduloDestino: "pedidos",
  });

  await crearNotificacionStaffInternal({
    tipo: "PEDIDO_CONFIRMADO_ARMAR",
    rolDestino: "STOCK",
    titulo: "Pedido listo para armar #ORD-9999",
    mensaje: "Pago acreditado, empaquetar productos.",
    pedidoId: 8888,
    pedidoNumero: 9999,
    moduloDestino: "preparacion",
  });

  await crearNotificacionStaffInternal({
    tipo: "SOLICITUD_CANCELACION_CLIENTE",
    rolDestino: "VENTAS",
    titulo: "Solicitud de cancelación #ORD-9999",
    mensaje: "El cliente solicitó cancelar el pedido.",
    pedidoId: 8888,
    pedidoNumero: 9999,
    moduloDestino: "pedidos",
  });

  const stored = await getStoredNotificacionesStaff();
  const testNotifs = stored.filter((n) => n.pedidoNumero === 9999);
  console.log(`  Notificaciones creadas y recuperadas: ${testNotifs.length}`);

  if (testNotifs.length < 3) {
    throw new Error(`Error: Se esperaban al menos 3 notificaciones persistidas.`);
  }

  // Validar separación de roles
  const ventasNotifs = testNotifs.filter((n) => n.rolDestino === "VENTAS");
  const stockNotifs = testNotifs.filter((n) => n.rolDestino === "STOCK");

  console.log(`  ✓ Notificaciones para Ventas: ${ventasNotifs.length}`);
  console.log(`  ✓ Notificaciones para Stock: ${stockNotifs.length}`);

  if (ventasNotifs.length !== 2 || stockNotifs.length !== 1) {
    throw new Error(`Error en la asignación por rol.`);
  }

  // Limpiar datos de prueba en ConfiguracionEcommerce
  const cleanNotifs = stored.filter((n) => n.pedidoNumero !== 9999);
  await saveStoredNotificacionesStaff(cleanNotifs);

  // Limpiar log de idempotencia de prueba
  try {
    const configRecord = await prisma.configuracionEcommerce.findUnique({
      where: { clave: "correos_enviados_log" },
    });
    if (configRecord?.valor) {
      const logs = JSON.parse(configRecord.valor);
      delete logs[`pedido_${testPedido.id}_PEDIDO_CREADO`];
      await prisma.configuracionEcommerce.update({
        where: { clave: "correos_enviados_log" },
        data: { valor: JSON.stringify(logs) },
      });
    }
  } catch {}

  console.log("\n=================================================");
  console.log("¡TODAS LAS PRUEBAS FINALIZARON EXITOSAMENTE!");
  console.log("=================================================");
}

main()
  .catch((e) => {
    console.error("FATAL ERROR EN PRUEBA:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
