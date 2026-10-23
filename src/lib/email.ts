import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export type EmailEventoPedido =
  | "PEDIDO_CREADO"
  | "TRANSFERENCIA_APROBADA"
  | "PEDIDO_EN_PREPARACION"
  | "PEDIDO_LISTO"
  | "PEDIDO_ENTREGADO"
  | "CANCELACION_SOLICITADA"
  | "CANCELACION_APROBADA"
  | "CANCELACION_RECHAZADA";

export interface ItemEmailResumen {
  nombre: string;
  marca?: string | null;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface DatosEmailPedido {
  numero: number;
  nombreCliente: string;
  emailCliente: string;
  modalidadEntrega: string; // RETIRO_LOCAL | MOTOMANDADO
  metodoPago: string; // TRANSFERENCIA | EFECTIVO_LOCAL | TARJETA
  costoEnvio?: number;
  total: number;
  items?: ItemEmailResumen[];
  direccionEnvio?: string | null;
  motivoCancelacion?: string;
  estadoPago?: string;
}

/**
 * Valida si las credenciales SMTP de Gmail están configuradas por variables de entorno
 */
export function isSmtpConfigured(): boolean {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return Boolean(user && user.trim() && pass && pass.trim());
}

/**
 * Crea el transporter de Nodemailer utilizando exclusivamente variables de entorno
 */
function createTransporter() {
  if (!isSmtpConfigured()) return null;

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure = process.env.SMTP_SECURE === "false" ? false : port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER?.trim(),
      pass: process.env.SMTP_PASS?.trim(),
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Formatea importes en pesos argentinos
 */
function formatCurrency(amount: number): string {
  return "$" + Number(amount || 0).toLocaleString("es-AR");
}

/**
 * Genera el template HTML y texto plano con la identidad oficial de Chopper Repuestos
 */
export function renderEmailTemplate(
  evento: EmailEventoPedido,
  datos: DatosEmailPedido
): { subject: string; html: string; text: string } {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const pedidosUrl = `${appUrl}/mis-pedidos`;

  const esMotomandado = datos.modalidadEntrega === "MOTOMANDADO";
  const modalidadTexto = esMotomandado
    ? "🛵 Envío por Motomandado / Moto Uber en el día en Posadas"
    : "🏪 Retiro en mostrador · Av. Roque Sáenz Peña 1500, Posadas";

  let statusBadge = "";
  let badgeColor = "#dc2626";
  let mainTitle = "";
  let introMessage = "";
  let calloutMessage = "";
  let subject = "";

  switch (evento) {
    case "PEDIDO_CREADO":
      subject = `Pedido recibido #ORD-${datos.numero} · Chopper Repuestos`;
      statusBadge = "PEDIDO RECIBIDO";
      badgeColor = "#d97706";
      mainTitle = "¡Recibimos tu pedido en Chopper Repuestos!";
      introMessage = `Hola <strong>${datos.nombreCliente}</strong>, registramos tu pedido <strong>#ORD-${datos.numero}</strong> en nuestra tienda online.`;
      calloutMessage = datos.metodoPago === "TRANSFERENCIA"
        ? "<strong>Pago por transferencia:</strong> Nuestro equipo de Ventas revisará tu comprobante para confirmar la operación y dar paso al armado del paquete."
        : datos.metodoPago === "EFECTIVO_LOCAL"
        ? "<strong>Pago en efectivo:</strong> Tu reserva fue registrada con éxito. Pagás en mano al retirar en nuestro local de Av. Roque Sáenz Peña 1500."
        : "Tu pedido está registrado y pendiente de validación comercial por nuestro equipo de Ventas.";
      break;

    case "TRANSFERENCIA_APROBADA":
      subject = `Pago confirmado para tu pedido #ORD-${datos.numero} · Chopper Repuestos`;
      statusBadge = "PAGO CONFIRMADO";
      badgeColor = "#16a34a";
      mainTitle = "¡Tu pago fue aprobado con éxito!";
      introMessage = `Hola <strong>${datos.nombreCliente}</strong>, el equipo de Ventas verificó y aprobó el pago de tu pedido <strong>#ORD-${datos.numero}</strong>.`;
      calloutMessage = "Tu pedido pasó a estado <strong>Confirmado</strong> y ya fue derivado a nuestro sector de Depósito/Stock para su preparación física.";
      break;

    case "PEDIDO_EN_PREPARACION":
      subject = `Estamos preparando tu compra #ORD-${datos.numero} · Chopper Repuestos`;
      statusBadge = "EN PREPARACIÓN";
      badgeColor = "#2563eb";
      mainTitle = "Estamos armando tu paquete en depósito";
      introMessage = `Hola <strong>${datos.nombreCliente}</strong>, nuestro personal de Stock comenzó a seleccionar y controlar los repuestos de tu pedido <strong>#ORD-${datos.numero}</strong>.`;
      calloutMessage = "Verificamos cada producto contra nuestro checklist de calidad antes de sellar el paquete. Te avisaremos apenas esté listo.";
      break;

    case "PEDIDO_LISTO":
      if (esMotomandado) {
        subject = `¡Tu pedido #ORD-${datos.numero} está listo para despacho! · Chopper Repuestos`;
        statusBadge = "LISTO PARA DESPACHO";
        badgeColor = "#7c3aed";
        mainTitle = "Tu paquete está listo para motomandado";
        introMessage = `Hola <strong>${datos.nombreCliente}</strong>, tu pedido <strong>#ORD-${datos.numero}</strong> ya fue empaquetado y se encuentra listo en depósito esperando la asignación de cadetería/Moto Uber.`;
        calloutMessage = `<strong>Dirección de entrega:</strong> ${datos.direccionEnvio || "Posadas, Misiones"}.<br/><br/>⚠️ <em>Aviso importante:</em> El pedido se encuentra listo en local; en breve saldrá hacia tu domicilio. Recordá tener el dinero disponible si abonás al recibir.`;
      } else {
        subject = `¡Tu pedido #ORD-${datos.numero} está listo para retirar! · Chopper Repuestos`;
        statusBadge = "LISTO PARA RETIRAR";
        badgeColor = "#16a34a";
        mainTitle = "¡Tu pedido está listo para retirar!";
        introMessage = `Hola <strong>${datos.nombreCliente}</strong>, tu compra <strong>#ORD-${datos.numero}</strong> está lista en el mostrador de Chopper Repuestos.`;
        calloutMessage = "<strong>Punto de retiro:</strong> Av. Roque Sáenz Peña 1500 (Posadas, Misiones).<br/><strong>Horarios:</strong> Lunes a Sábado de 8:00 a 12:30 y de 16:30 a 20:30 hs.<br/>Presentá tu DNI o informá el número de pedido al llegar.";
      }
      break;

    case "PEDIDO_ENTREGADO":
      subject = `Confirmación de entrega · Pedido #ORD-${datos.numero} · Chopper Repuestos`;
      statusBadge = "ENTREGADO";
      badgeColor = "#059669";
      mainTitle = "¡Tu pedido fue entregado!";
      introMessage = `Hola <strong>${datos.nombreCliente}</strong>, confirmamos que el pedido <strong>#ORD-${datos.numero}</strong> fue entregado con éxito.`;
      calloutMessage = "¡Muchas gracias por confiar en Chopper Repuestos! Todos nuestros repuestos cuentan con garantía oficial de fábrica.";
      break;

    case "CANCELACION_SOLICITADA":
      subject = `Recibimos tu solicitud de cancelación #ORD-${datos.numero} · Chopper Repuestos`;
      statusBadge = "CANCELACIÓN SOLICITADA";
      badgeColor = "#d97706";
      mainTitle = "Recibimos tu solicitud de cancelación";
      introMessage = `Hola <strong>${datos.nombreCliente}</strong>, registramos tu solicitud para cancelar el pedido <strong>#ORD-${datos.numero}</strong>.`;
      calloutMessage = `<strong>Motivo manifestado:</strong> "${datos.motivoCancelacion || "A pedido del cliente"}".<br/><br/>Nuestro equipo de Ventas y Administración revisará el estado del pedido y te notificará la resolución a la brevedad.`;
      break;

    case "CANCELACION_APROBADA":
      subject = `Pedido #ORD-${datos.numero} cancelado · Chopper Repuestos`;
      statusBadge = "PEDIDO CANCELADO";
      badgeColor = "#dc2626";
      mainTitle = "Tu pedido fue cancelado";
      introMessage = `Hola <strong>${datos.nombreCliente}</strong>, te informamos que el pedido <strong>#ORD-${datos.numero}</strong> fue cancelado en nuestro sistema.`;
      const pagoInfo = datos.estadoPago === "PAGADO"
        ? "<br/><br/>💳 <strong>Información sobre tu pago:</strong> Como el pedido figura con pago acreditado, nuestro equipo de Ventas se contactará para coordinar el reintegro correspondiente, o podés escribirnos por WhatsApp."
        : "<br/><br/>Las unidades reservadas fueron liberadas nuevamente al inventario.";
      calloutMessage = `<strong>Resolución:</strong> Cancelación aprobada por el comercio.${pagoInfo}`;
      break;

    case "CANCELACION_RECHAZADA":
      subject = `Actualización de solicitud para pedido #ORD-${datos.numero} · Chopper Repuestos`;
      statusBadge = "SOLICITUD NO APROBADA";
      badgeColor = "#4b5563";
      mainTitle = "Tu solicitud de cancelación no fue aprobada";
      introMessage = `Hola <strong>${datos.nombreCliente}</strong>, tu solicitud de cancelación para el pedido <strong>#ORD-${datos.numero}</strong> fue evaluada por nuestro equipo comercial.`;
      calloutMessage = `<strong>Motivo informado:</strong> "${datos.motivoCancelacion || "El pedido ya se encuentra en etapa final de entrega/despacho y no puede cancelarse"}".<br/><br/>El pedido continúa su curso normal hacia entrega. Si tenés dudas, podés contactarnos por WhatsApp.`;
      break;
  }

  // Generación de la tabla de items si existen
  let itemsHtml = "";
  let itemsText = "";
  if (datos.items && datos.items.length > 0) {
    itemsHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; text-align: left;">
        <thead>
          <tr style="border-bottom: 2px solid #e2e8f0; color: #64748b;">
            <th style="padding: 8px 4px;">Producto</th>
            <th style="padding: 8px 4px; text-align: center;">Cant</th>
            <th style="padding: 8px 4px; text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${datos.items
            .map(
              (it) => `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 4px; color: #1e293b;">
                <strong>${it.nombre}</strong>
                ${it.marca ? `<br/><span style="font-size: 11px; color: #dc2626; font-weight: bold;">${it.marca}</span>` : ""}
              </td>
              <td style="padding: 10px 4px; text-align: center; color: #334155; font-weight: bold;">${it.cantidad}</td>
              <td style="padding: 10px 4px; text-align: right; color: #0f172a; font-weight: bold;">${formatCurrency(it.subtotal)}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;

    itemsText = datos.items
      .map((it) => `- ${it.cantidad}x ${it.nombre} (${it.marca || "Repuesto"}) = ${formatCurrency(it.subtotal)}`)
      .join("\n");
  }

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Contenedor Principal (max-width: 600px) -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Encabezado Rojo Institucional -->
          <tr>
            <td style="background-color: #dc2626; padding: 24px 28px; text-align: left;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: rgba(255,255,255,0.2); color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1px; padding: 3px 8px; border-radius: 6px; text-transform: uppercase;">
                      Posadas · Misiones
                    </span>
                    <h1 style="margin: 8px 0 0 0; color: #ffffff; font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">
                      CHOPPER REPUESTOS
                    </h1>
                    <p style="margin: 2px 0 0 0; color: rgba(255,255,255,0.85); font-size: 12px;">
                      Repuestos y accesorios para motos
                    </p>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="background-color: #ffffff; color: #dc2626; font-size: 13px; font-weight: 900; padding: 6px 12px; border-radius: 8px; display: inline-block;">
                      #ORD-${datos.numero}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Contenido Central -->
          <tr>
            <td style="padding: 28px;">
              <!-- Status Badge -->
              <div style="margin-bottom: 16px;">
                <span style="display: inline-block; background-color: ${badgeColor}15; color: ${badgeColor}; border: 1px solid ${badgeColor}30; font-size: 11px; font-weight: 800; letter-spacing: 0.8px; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">
                  ${statusBadge}
                </span>
              </div>

              <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 800; line-height: 1.3;">
                ${mainTitle}
              </h2>

              <p style="margin: 0 0 16px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                ${introMessage}
              </p>

              <!-- Callout informativo del estado -->
              <div style="background-color: #f1f5f9; border-left: 4px solid ${badgeColor}; padding: 14px 16px; border-radius: 8px; margin-bottom: 22px; font-size: 13px; color: #334155; line-height: 1.5;">
                ${calloutMessage}
              </div>

              <!-- Modalidad de entrega -->
              <div style="background-color: #fafafa; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px;">
                <span style="color: #6b7280; font-size: 11px; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 4px;">Modalidad de entrega:</span>
                <strong style="color: #111827;">${modalidadTexto}</strong>
              </div>

              <!-- Resumen de items si corresponde -->
              ${
                itemsHtml
                  ? `
                <div style="margin-top: 20px; margin-bottom: 20px;">
                  <span style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Resumen de compra:</span>
                  ${itemsHtml}
                  
                  <table width="100%" style="margin-top: 12px; font-size: 14px;">
                    ${
                      datos.costoEnvio && datos.costoEnvio > 0
                        ? `
                      <tr>
                        <td style="padding: 4px 0; color: #64748b;">Costo de envío:</td>
                        <td style="padding: 4px 0; text-align: right; color: #334155; font-weight: 600;">${formatCurrency(datos.costoEnvio)}</td>
                      </tr>
                    `
                        : ""
                    }
                    <tr>
                      <td style="padding: 8px 0; color: #0f172a; font-size: 16px; font-weight: 800; border-top: 2px solid #e2e8f0;">Total del pedido:</td>
                      <td style="padding: 8px 0; text-align: right; color: #dc2626; font-size: 18px; font-weight: 900; border-top: 2px solid #e2e8f0;">${formatCurrency(datos.total)}</td>
                    </tr>
                  </table>
                </div>
              `
                  : ""
              }

              <!-- Botón CTA a Mis Pedidos -->
              <div style="text-align: center; margin: 30px 0 16px 0;">
                <a href="${pedidosUrl}" style="background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 13px 28px; font-size: 14px; font-weight: 800; border-radius: 10px; display: inline-block; box-shadow: 0 4px 10px rgba(220, 38, 38, 0.25);">
                  Ver detalle en Mis Pedidos →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer con datos de contacto -->
          <tr>
            <td style="background-color: #0f172a; padding: 22px 28px; text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.5;">
              <strong style="color: #ffffff; font-size: 13px;">Chopper Repuestos</strong><br/>
              Av. Roque Sáenz Peña 1500 · Posadas, Misiones<br/>
              WhatsApp de atención: <strong>+54 9 376 524-3554</strong><br/>
              Horarios: Lunes a Sábados 8:00 - 12:30 / 16:30 - 20:30 hs
            </td>
          </tr>
        </table>
        
        <p style="margin-top: 14px; font-size: 11px; color: #94a3b8; text-align: center;">
          Este correo fue enviado automáticamente para tu compra en chopper-repuestos.com
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
CHOPPER REPUESTOS · Posadas, Misiones
Pedido #ORD-${datos.numero}
Estado: ${statusBadge}
----------------------------------------
${mainTitle}

${introMessage.replace(/<[^>]+>/g, "")}

${calloutMessage.replace(/<[^>]+>/g, "")}

Modalidad: ${modalidadTexto}

${itemsText ? `Items:\n${itemsText}\nTotal: ${formatCurrency(datos.total)}\n` : `Total: ${formatCurrency(datos.total)}\n`}

Podés ver el seguimiento en: ${pedidosUrl}

Chopper Repuestos · Av. Roque Sáenz Peña 1500, Posadas, Misiones
WhatsApp: +54 9 376 524-3554
  `.trim();

  return { subject, html, text };
}

/**
 * Registro de deduplicación de correos enviados en ConfiguracionEcommerce
 */
async function getSentEmailLogs(): Promise<Record<string, { fecha: string; evento: string }>> {
  try {
    const record = await prisma.configuracionEcommerce.findUnique({
      where: { clave: "correos_enviados_log" },
    });
    if (record?.valor) {
      return JSON.parse(record.valor);
    }
  } catch (err) {
    console.error("Error al leer logs de correos enviados:", err);
  }
  return {};
}

async function markEmailAsSent(key: string, evento: string) {
  try {
    const logs = await getSentEmailLogs();
    logs[key] = {
      fecha: new Date().toISOString(),
      evento,
    };

    // Conservar los últimos 300 logs para evitar crecimiento desmedido
    const entries = Object.entries(logs);
    const trimmed = entries.length > 300 ? Object.fromEntries(entries.slice(-300)) : logs;

    await prisma.configuracionEcommerce.upsert({
      where: { clave: "correos_enviados_log" },
      update: { valor: JSON.stringify(trimmed) },
      create: { clave: "correos_enviados_log", valor: JSON.stringify(trimmed) },
    });
  } catch (err) {
    console.error("Error al asentar log de correo enviado:", err);
  }
}

/**
 * Envía el correo automático al cliente garantizando estricta idempotencia y tolerancia a fallos
 */
export async function enviarEmailPedidoEvento(params: {
  pedido: {
    id: number;
    numero: number;
    nombreCliente: string;
    emailCliente?: string | null;
    modalidadEntrega: string;
    metodoPago: string;
    costoEnvio?: number;
    total: number;
    items?: Array<{
      nombre: string;
      marca?: string | null;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
    }>;
    direccionEnvio?: string | null;
    estadoPago?: string;
  };
  evento: EmailEventoPedido;
  motivoCancelacion?: string;
  forzarReenvio?: boolean;
}): Promise<{
  success: boolean;
  skipped?: boolean;
  simulated?: boolean;
  reason?: string;
  error?: string;
}> {
  const { pedido, evento, motivoCancelacion, forzarReenvio } = params;

  const emailDestino = pedido.emailCliente?.trim().toLowerCase();
  if (!emailDestino || !emailDestino.includes("@")) {
    return { success: true, skipped: true, reason: "El pedido no tiene un correo de cliente válido asignado." };
  }

  // Clave única de idempotencia: pedido_{id}_{evento}
  const idempotencyKey = `pedido_${pedido.id}_${evento}`;

  if (!forzarReenvio) {
    const logs = await getSentEmailLogs();
    if (logs[idempotencyKey]) {
      return { success: true, skipped: true, reason: `Correo para '${evento}' ya fue enviado previamente a ${emailDestino}.` };
    }
  }

  const template = renderEmailTemplate(evento, {
    numero: pedido.numero,
    nombreCliente: pedido.nombreCliente,
    emailCliente: emailDestino,
    modalidadEntrega: pedido.modalidadEntrega,
    metodoPago: pedido.metodoPago,
    costoEnvio: pedido.costoEnvio,
    total: pedido.total,
    items: pedido.items,
    direccionEnvio: pedido.direccionEnvio,
    motivoCancelacion,
    estadoPago: pedido.estadoPago,
  });

  // Si no hay credenciales SMTP configuradas (modo local/dev/mock)
  if (!isSmtpConfigured()) {
    console.log(
      `[EMAIL_SERVICE: SIMULACIÓN/DRY-RUN] Para: ${emailDestino} | Asunto: "${template.subject}" | Evento: ${evento} (SMTP no configurado en .env)`
    );
    await markEmailAsSent(idempotencyKey, evento);
    return { success: true, simulated: true, reason: "SMTP_USER/SMTP_PASS no configurado; envío simulado correctamente sin errores." };
  }

  try {
    const transporter = createTransporter();
    if (!transporter) {
      await markEmailAsSent(idempotencyKey, evento);
      return { success: true, simulated: true, reason: "Transporter no inicializado." };
    }

    const fromAddress = process.env.SMTP_FROM || `"Chopper Repuestos" <${process.env.SMTP_USER}>`;

    await transporter.sendMail({
      from: fromAddress,
      to: emailDestino,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });

    await markEmailAsSent(idempotencyKey, evento);
    return { success: true };
  } catch (err: any) {
    console.error(`[EMAIL_SERVICE: ERROR SMTP] No se pudo enviar correo de evento ${evento} a ${emailDestino}:`, err?.message || err);
    // Un error de correo no debe romper el flujo de la aplicación
    return { success: false, error: err?.message || "Fallo de conexión SMTP." };
  }
}
