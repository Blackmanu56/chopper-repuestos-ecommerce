import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { generarComprobantePdfPorPedidoId } from "@/lib/comprobantePdf";

export type EmailEventoPedido =
  | "PEDIDO_CREADO"
  | "COMPROBANTE_RECIBIDO"
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
  adjuntoComprobante?: boolean;
}

export interface SmtpConfigInfo {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  from: string;
}

/**
 * Obtiene la configuración SMTP desde variables de entorno del servidor.
 * Soporta de forma transparente nombres estándar (SMTP_USER, SMTP_PASS)
 * y alias de Gmail (GMAIL_USER, GMAIL_APP_PASSWORD).
 * NUNCA expone ni retorna la contraseña en texto plano en logs o diagnósticos.
 */
export function getSmtpConfig(): SmtpConfigInfo | null {
  const user = (process.env.SMTP_USER || process.env.GMAIL_USER || "").trim();
  const pass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "").trim();
  if (!user || !pass) return null;

  const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure = process.env.SMTP_SECURE !== undefined
    ? process.env.SMTP_SECURE === "true"
    : port === 465;
  const from = (process.env.SMTP_FROM || `"Chopper Repuestos" <${user}>`).trim();

  return { host, port, secure, user, from };
}

/**
 * Valida si las credenciales SMTP de Gmail están configuradas por variables de entorno
 */
export function isSmtpConfigured(): boolean {
  return getSmtpConfig() !== null;
}

/**
 * Crea el transporter de Nodemailer utilizando exclusivamente variables de entorno.
 * Configurado con Gmail SMTP (smtp.gmail.com:465 SSL).
 */
function createTransporter() {
  const config = getSmtpConfig();
  if (!config) return null;

  const pass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "").trim();

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure, // true para puerto 465 (SSL directo)
    auth: {
      user: config.user,
      pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

/**
 * Verifica la conexión y autenticación con el servidor SMTP de forma segura,
 * sin exponer credenciales en la respuesta.
 */
export async function verificarConexionSmtp(): Promise<{
  configured: boolean;
  connected: boolean;
  host?: string;
  port?: number;
  userMasked?: string;
  error?: string;
}> {
  const config = getSmtpConfig();
  if (!config) {
    return {
      configured: false,
      connected: false,
      error: "Variables de entorno SMTP no configuradas (SMTP_USER y SMTP_PASS ausentes). El sistema opera en modo simulación (DRY-RUN).",
    };
  }

  const [usuario, dominio] = config.user.split("@");
  const userMasked = usuario ? `${usuario.slice(0, 2)}***@${dominio || "gmail.com"}` : "Configurado";

  try {
    const transporter = createTransporter();
    if (!transporter) {
      return { configured: false, connected: false, error: "No se pudo instanciar el transporte SMTP." };
    }
    await transporter.verify();
    return {
      configured: true,
      connected: true,
      host: config.host,
      port: config.port,
      userMasked,
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      host: config.host,
      port: config.port,
      userMasked,
      error: err?.message || "Error al verificar conexión SMTP con Gmail.",
    };
  }
}

/**
 * Formatea importes en pesos argentinos
 */
function formatCurrency(amount: number): string {
  return "$" + Number(amount || 0).toLocaleString("es-AR");
}

/**
 * Genera el template HTML y texto plano con la identidad de Chopper Repuestos
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

  const metodoPagoTexto = datos.metodoPago === "TRANSFERENCIA"
    ? "Transferencia bancaria"
    : datos.metodoPago === "EFECTIVO_LOCAL"
    ? "Efectivo al retirar en local"
    : datos.metodoPago === "TARJETA"
    ? "Tarjeta de débito/crédito"
    : datos.metodoPago || "A convenir";

  switch (evento) {
    case "PEDIDO_CREADO":
      subject = `Pedido recibido #ORD-${datos.numero} · Chopper Repuestos`;
      statusBadge = "PEDIDO RECIBIDO";
      badgeColor = "#d97706";
      mainTitle = "¡Recibimos tu pedido en Chopper Repuestos!";
      introMessage = `Hola <strong>${datos.nombreCliente}</strong>, registramos tu pedido <strong>#ORD-${datos.numero}</strong> en nuestra tienda online.`;
      calloutMessage = datos.metodoPago === "TRANSFERENCIA"
        ? "<strong>Pago por transferencia:</strong> Podés adjuntar tu comprobante desde la web o responder a este correo. El equipo de Ventas revisará la acreditación para confirmar tu compra y dar paso al armado en depósito."
        : datos.metodoPago === "EFECTIVO_LOCAL"
        ? "<strong>Pago en efectivo:</strong> Tu reserva fue registrada con éxito. Abonás en mano al retirar en nuestro local de Av. Roque Sáenz Peña 1500."
        : "Tu pedido está registrado y pendiente de validación comercial por nuestro equipo de Ventas.";
      break;

    case "COMPROBANTE_RECIBIDO":
      subject = `Comprobante recibido · Pedido #ORD-${datos.numero} · Chopper Repuestos`;
      statusBadge = "COMPROBANTE EN REVISIÓN";
      badgeColor = "#0284c7";
      mainTitle = "Recibimos tu comprobante de pago";
      introMessage = `Hola <strong>${datos.nombreCliente}</strong>, registramos el comprobante de transferencia para tu pedido <strong>#ORD-${datos.numero}</strong>.`;
      calloutMessage = "<strong>En revisión:</strong> Nuestro equipo de Ventas revisará la acreditación bancaria en el horario de atención para confirmar la compra. El pedido continúa pendiente hasta su validación.";
      break;

    case "TRANSFERENCIA_APROBADA":
      subject = `Pago confirmado para tu pedido #ORD-${datos.numero} · Chopper Repuestos`;
      statusBadge = "PAGO CONFIRMADO";
      badgeColor = "#16a34a";
      mainTitle = "¡Tu pago fue aprobado con éxito!";
      introMessage = `Hola <strong>${datos.nombreCliente}</strong>, registramos la confirmación del pago de tu pedido <strong>#ORD-${datos.numero}</strong>.`;
      const comprobanteAviso = datos.adjuntoComprobante
        ? "<br/><br/>📄 <em>Adjuntamos a este correo tu comprobante de compra en formato PDF.</em>"
        : "";
      calloutMessage = `<strong>Importe acreditado:</strong> ${formatCurrency(datos.total)}.<br/><strong>Siguiente paso:</strong> El equipo comercial verificó tu pago y el pedido pasó a Depósito para comenzar su preparación física.${comprobanteAviso}`;
      break;

    case "PEDIDO_EN_PREPARACION":
      subject = `Estamos preparando tu compra #ORD-${datos.numero} · Chopper Repuestos`;
      statusBadge = "EN PREPARACIÓN";
      badgeColor = "#2563eb";
      mainTitle = "Estamos armando tu paquete en depósito";
      introMessage = `Hola <strong>${datos.nombreCliente}</strong>, nuestro personal de Stock comenzó a seleccionar y controlar los repuestos de tu pedido <strong>#ORD-${datos.numero}</strong>.`;
      calloutMessage = "Verificamos cada producto contra nuestro checklist de calidad antes de sellar el paquete. Te avisaremos apenas esté listo para entregar.";
      break;

    case "PEDIDO_LISTO":
      if (esMotomandado) {
        subject = `¡Tu pedido #ORD-${datos.numero} está listo para despacho! · Chopper Repuestos`;
        statusBadge = "LISTO PARA DESPACHO";
        badgeColor = "#7c3aed";
        mainTitle = "Tu paquete está listo para motomandado";
        introMessage = `Hola <strong>${datos.nombreCliente}</strong>, tu pedido <strong>#ORD-${datos.numero}</strong> ya fue empaquetado y se encuentra en depósito esperando asignación de cadetería/Moto Uber.`;
        calloutMessage = `<strong>Modalidad de envío:</strong> Motomandado en el día.<br/><strong>Dirección de destino:</strong> ${datos.direccionEnvio || "Posadas, Misiones"}.<br/>El cadete saldrá en el transcurso del día hacia tu domicilio. Recordá tener el dinero disponible si abonás al recibir.`;
      } else {
        subject = `¡Tu pedido #ORD-${datos.numero} está listo para retirar! · Chopper Repuestos`;
        statusBadge = "LISTO PARA RETIRAR";
        badgeColor = "#16a34a";
        mainTitle = "¡Tu compra está lista para retirar!";
        introMessage = `Hola <strong>${datos.nombreCliente}</strong>, tu compra <strong>#ORD-${datos.numero}</strong> está lista en el mostrador de Chopper Repuestos.`;
        calloutMessage = "<strong>Punto de retiro:</strong> Av. Roque Sáenz Peña 1500 (Posadas, Misiones).<br/><strong>Horarios:</strong> Lunes a Sábados de 8:00 a 12:30 y de 16:30 a 20:30 hs.<br/>Presentá tu DNI o informá el número de pedido al llegar.";
      }
      break;

    case "PEDIDO_ENTREGADO":
      subject = `Confirmación de entrega · Pedido #ORD-${datos.numero} · Chopper Repuestos`;
      statusBadge = "ENTREGADO";
      badgeColor = "#059669";
      mainTitle = "¡Tu pedido fue entregado!";
      introMessage = `Hola <strong>${datos.nombreCliente}</strong>, confirmamos que tu compra <strong>#ORD-${datos.numero}</strong> fue entregada con éxito.`;
      calloutMessage = "¡Gracias por comprar en Chopper Repuestos! Esperamos que disfrutes tus productos y vuelvas a elegirnos para equipar tu moto.";
      break;

    case "CANCELACION_SOLICITADA":
      subject = `Recibimos tu solicitud de cancelación #ORD-${datos.numero} · Chopper Repuestos`;
      statusBadge = "CANCELACIÓN SOLICITADA";
      badgeColor = "#d97706";
      mainTitle = "Recibimos tu solicitud de cancelación";
      introMessage = `Hola <strong>${datos.nombreCliente}</strong>, registramos tu solicitud para cancelar el pedido <strong>#ORD-${datos.numero}</strong>.`;
      calloutMessage = `<strong>Motivo manifestado:</strong> "${datos.motivoCancelacion || "A pedido del cliente"}".<br/><br/>Nuestro equipo de Ventas revisará el estado del pedido y te notificará la resolución a la brevedad.`;
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

  // Generación de la tabla de items únicamente para PEDIDO_CREADO (Requisito 3)
  const esPedidoCreado = evento === "PEDIDO_CREADO";
  let itemsHtml = "";
  let itemsText = "";
  if (esPedidoCreado && datos.items && datos.items.length > 0) {
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

              ${
                esPedidoCreado
                  ? `
              <!-- Modalidad de entrega y medio de pago (solo pedido inicial) -->
              <div style="background-color: #fafafa; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px;">
                <div style="margin-bottom: 6px;">
                  <span style="color: #6b7280; font-size: 11px; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 2px;">Modalidad de entrega:</span>
                  <strong style="color: #111827;">${modalidadTexto}</strong>
                </div>
                <div>
                  <span style="color: #6b7280; font-size: 11px; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 2px;">Medio de pago:</span>
                  <strong style="color: #111827;">${metodoPagoTexto}</strong>
                </div>
              </div>

              <!-- Resumen completo de items para Pedido Recibido -->
              ${
                itemsHtml
                  ? `
                <div style="margin-top: 20px; margin-bottom: 20px;">
                  <span style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Productos del pedido:</span>
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
              `
                  : `
              <!-- Resumen compacto para cambios de estado (sin repetir tabla completa de productos) -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                <span style="color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 10px;">
                  Resumen de la orden
                </span>
                <table width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px; line-height: 1.6;">
                  <tr>
                    <td style="color: #64748b; padding: 4px 0;">Número de pedido:</td>
                    <td style="text-align: right; font-weight: 800; color: #0f172a;">#ORD-${datos.numero}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; padding: 4px 0;">Estado actual:</td>
                    <td style="text-align: right; font-weight: 800; color: ${badgeColor};">${statusBadge}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; padding: 4px 0;">Modalidad:</td>
                    <td style="text-align: right; font-weight: 600; color: #334155;">${esMotomandado ? "Motomandado Posadas" : "Retiro en local"}</td>
                  </tr>
                  ${
                    evento === "TRANSFERENCIA_APROBADA"
                      ? `
                  <tr>
                    <td style="color: #64748b; padding: 8px 0 0 0; font-size: 14px; font-weight: 700; border-top: 1px dashed #cbd5e1;">
                      Importe acreditado:
                    </td>
                    <td style="text-align: right; font-size: 16px; font-weight: 900; color: #dc2626; padding: 8px 0 0 0; border-top: 1px dashed #cbd5e1;">
                      ${formatCurrency(datos.total)}
                    </td>
                  </tr>
                  `
                      : ""
                  }
                </table>
              </div>
              `
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

  const text = esPedidoCreado
    ? `
CHOPPER REPUESTOS · Posadas, Misiones
Pedido #ORD-${datos.numero}
Estado: ${statusBadge}
----------------------------------------
${mainTitle}

${introMessage.replace(/<[^>]+>/g, "")}

${calloutMessage.replace(/<[^>]+>/g, "")}

Modalidad: ${modalidadTexto}
Medio de pago: ${metodoPagoTexto}

${itemsText ? `Items:\n${itemsText}\n` : ""}Total: ${formatCurrency(datos.total)}

Podés ver el seguimiento en: ${pedidosUrl}

Chopper Repuestos · Av. Roque Sáenz Peña 1500, Posadas, Misiones
WhatsApp: +54 9 376 524-3554
    `.trim()
    : `
CHOPPER REPUESTOS · Posadas, Misiones
Pedido #ORD-${datos.numero}
Estado: ${statusBadge}
----------------------------------------
${mainTitle}

${introMessage.replace(/<[^>]+>/g, "")}

${calloutMessage.replace(/<[^>]+>/g, "")}

Resumen:
- Pedido: #ORD-${datos.numero}
- Estado: ${statusBadge}
- Modalidad: ${modalidadTexto}${evento === "TRANSFERENCIA_APROBADA" ? `\n- Importe acreditado: ${formatCurrency(datos.total)}` : ""}

Podés ver el detalle en: ${pedidosUrl}

Chopper Repuestos · Av. Roque Sáenz Peña 1500, Posadas, Misiones
WhatsApp: +54 9 376 524-3554
    `.trim();

  return { subject, html, text };
}

/**
 * Lista de correos autorizados en modo de prueba / demo (Requisito 1).
 * Configurable mediante la variable de entorno SMTP_ALLOWED_EMAILS (separada por comas).
 * Por defecto, en entorno de demostración protege contra rebotes admitiendo solo las 3 cuentas reales:
 * - Manu (acumanu56@gmail.com / manuacu56@gmail.com)
 * - Lionel García (lionelgarcia3333@gmail.com)
 * - Santi (santi_777@hotmail.es)
 */
export function getAllowedEmails(): string[] {
  const envAllowed = process.env.SMTP_ALLOWED_EMAILS;
  if (envAllowed) {
    const parsed = envAllowed
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (parsed.length > 0) return parsed;
  }

  // Direcciones oficiales identificadas de los 3 usuarios de prueba
  return [
    "acumanu56@gmail.com",
    "manuacu56@gmail.com",
    "lionelgarcia3333@gmail.com",
    "santi_777@hotmail.es",
  ];
}

/**
 * Determina si el entorno está operando con filtro de destinatarios (modo prueba / demo).
 * En producción (cuando SMTP_TEST_MODE !== "true" y no está definida una lista restrictiva),
 * se permiten todas las direcciones de clientes reales.
 */
export function isEmailAllowed(email: string): boolean {
  const clean = (email || "").trim().toLowerCase();
  if (!clean || !clean.includes("@")) return false;

  const isTestMode =
    process.env.SMTP_TEST_MODE === "true" ||
    process.env.NODE_ENV !== "production" ||
    Boolean(process.env.SMTP_ALLOWED_EMAILS);

  if (!isTestMode) {
    return true; // En producción sin modo de pruebas, se admite cualquier cliente real
  }

  const allowed = getAllowedEmails();
  return allowed.includes(clean);
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
 * Registro de auditoría interna de correos omitidos/bloqueados en modo pruebas
 * para verificar que se detuvieron sin generar reintentos ni marcarlos como enviados.
 */
export async function getBlockedEmailLogs(): Promise<Record<string, { fecha: string; evento: string; email: string; motivo: string }>> {
  try {
    const record = await prisma.configuracionEcommerce.findUnique({
      where: { clave: "correos_bloqueados_log" },
    });
    if (record?.valor) {
      return JSON.parse(record.valor);
    }
  } catch (err) {
    console.error("Error al leer logs de correos bloqueados:", err);
  }
  return {};
}

async function markEmailAsBlocked(key: string, evento: string, email: string, motivo: string) {
  try {
    const logs = await getBlockedEmailLogs();
    logs[key] = {
      fecha: new Date().toISOString(),
      evento,
      email,
      motivo,
    };

    const entries = Object.entries(logs);
    const trimmed = entries.length > 300 ? Object.fromEntries(entries.slice(-300)) : logs;

    await prisma.configuracionEcommerce.upsert({
      where: { clave: "correos_bloqueados_log" },
      update: { valor: JSON.stringify(trimmed) },
      create: { clave: "correos_bloqueados_log", valor: JSON.stringify(trimmed) },
    });
  } catch (err) {
    console.error("Error al registrar auditoría de correo bloqueado:", err);
  }
}

export interface EmailAdjunto {
  filename: string;
  content: Buffer | string;
  contentType?: string;
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
  adjuntos?: EmailAdjunto[];
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

  // Filtro estricto de seguridad para entorno de demostración / pruebas (Requisito 1)
  // Omite envíos a correos ficticios de pedidos anteriores sin generar reintentos ni marcarlos como enviados
  if (!isEmailAllowed(emailDestino)) {
    console.warn(
      `[EMAIL_SERVICE: OMITIDO (MODO DEMO)] Pedido #ORD-${pedido.numero}: destinatario '${emailDestino}' no autorizado en lista blanca. Envío bloqueado sin reintentos.`
    );
    await markEmailAsBlocked(
      idempotencyKey,
      evento,
      emailDestino,
      "Destinatario no autorizado en lista blanca de pruebas (SMTP_ALLOWED_EMAILS)"
    );
    return {
      success: true,
      skipped: true,
      reason: `Destinatario '${emailDestino}' omitido por filtro de pruebas/demo. No se generarán reintentos ni fallos SMTP.`,
    };
  }

  if (!forzarReenvio) {
    const logs = await getSentEmailLogs();
    if (logs[idempotencyKey]) {
      return { success: true, skipped: true, reason: `Correo para '${evento}' ya fue enviado previamente a ${emailDestino}.` };
    }
  }

  // Para Pago Confirmado, adjuntar automáticamente el Comprobante de Compra PDF adaptado del SGI (Requisitos 1 a 4)
  let adjuntosFinales = params.adjuntos ? [...params.adjuntos] : [];
  if (evento === "TRANSFERENCIA_APROBADA" && adjuntosFinales.length === 0) {
    try {
      const pdfBuffer = await generarComprobantePdfPorPedidoId(pedido.id);
      if (pdfBuffer && pdfBuffer.length > 0) {
        adjuntosFinales.push({
          filename: `Comprobante-Compra-ORD-${pedido.numero}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        });
      }
    } catch (pdfErr) {
      console.error(`[COMPROBANTE_PDF] Error al adjuntar comprobante para pedido #${pedido.numero}:`, pdfErr);
    }
  }

  const tieneComprobanteAdjunto = adjuntosFinales.some(
    (a) => a.contentType === "application/pdf" || a.filename?.toLowerCase().endsWith(".pdf")
  );

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
    adjuntoComprobante: tieneComprobanteAdjunto,
  });

  // Si no hay credenciales SMTP configuradas (modo local/dev/mock)
  if (!isSmtpConfigured()) {
    console.log(
      `[EMAIL_SERVICE: DRY-RUN] Para: ${emailDestino} | Asunto: "${template.subject}" | Evento: ${evento} (SMTP no configurado en entorno: defina SMTP_USER y SMTP_PASS para envíos reales)`
    );
    return { success: true, simulated: true, reason: "SMTP_USER/SMTP_PASS no configurado; evento simulado (DRY-RUN)." };
  }

  try {
    const transporter = createTransporter();
    const config = getSmtpConfig();
    if (!transporter || !config) {
      return { success: false, error: "Transporter SMTP no pudo ser inicializado con la configuración provista." };
    }

    await transporter.sendMail({
      from: config.from,
      to: emailDestino,
      subject: template.subject,
      text: template.text,
      html: template.html,
      attachments: adjuntosFinales.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });

    await markEmailAsSent(idempotencyKey, evento);
    return { success: true };
  } catch (err: any) {
    console.error(`[EMAIL_SERVICE: ERROR SMTP] No se pudo enviar correo de evento ${evento} a ${emailDestino}:`, err?.message || err);
    // Un error de correo no debe romper el flujo de la aplicación
    return { success: false, error: err?.message || "Fallo de conexión SMTP." };
  }
}

/**
 * Envía un correo con token de verificación cuando un cliente solicita cambiar su correo electrónico.
 */
export async function enviarEmailVerificacionCambioCorreo(params: {
  nombreCliente: string;
  emailNuevo: string;
  token: string;
  appUrl?: string;
}): Promise<{ success: boolean; simulated?: boolean; error?: string }> {
  const { nombreCliente, emailNuevo, token, appUrl: customAppUrl } = params;
  const baseUrl = (
    customAppUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3001"
  ).replace(/\/$/, "");
  const linkVerificacion = `${baseUrl}/verificar-correo?token=${token}`;

  const subject = "Confirmá tu nuevo correo electrónico · Chopper Repuestos";

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background-color: #dc2626; padding: 24px 28px; text-align: left;">
              <span style="display: inline-block; background-color: rgba(255,255,255,0.2); color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1px; padding: 3px 8px; border-radius: 6px; text-transform: uppercase;">
                Seguridad de Cuenta
              </span>
              <h1 style="margin: 8px 0 0 0; color: #ffffff; font-size: 22px; font-weight: 900;">
                CHOPPER REPUESTOS
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 18px; font-weight: 800;">
                Confirmación de cambio de correo
              </h2>
              <p style="margin: 0 0 16px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                Hola <strong>${nombreCliente}</strong>, solicitaste actualizar tu dirección de correo electrónico en Chopper Repuestos a:
              </p>
              <div style="background-color: #f1f5f9; border-left: 4px solid #dc2626; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; color: #0f172a; font-weight: 700;">
                ${emailNuevo}
              </div>
              <p style="margin: 0 0 24px 0; color: #475569; font-size: 13px; line-height: 1.5;">
                Por motivos de seguridad, tu correo anterior seguirá activo para iniciar sesión hasta que confirmes este cambio haciendo clic en el siguiente botón:
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${linkVerificacion}" style="background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 13px 28px; font-size: 14px; font-weight: 800; border-radius: 10px; display: inline-block; box-shadow: 0 4px 10px rgba(220, 38, 38, 0.25);">
                  Confirmar mi nuevo correo →
                </a>
              </div>
              <p style="margin: 24px 0 0 0; color: #94a3b8; font-size: 11px; line-height: 1.4;">
                Este enlace es válido por 24 horas. Si no solicitaste este cambio, podés ignorar este mensaje; tu cuenta permanecerá protegida.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0f172a; padding: 18px 24px; text-align: center; color: #94a3b8; font-size: 11px;">
              Chopper Repuestos · Av. Roque Sáenz Peña 1500, Posadas, Misiones<br/>
              WhatsApp: +54 9 376 524-3554
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
CHOPPER REPUESTOS · Posadas, Misiones
Confirmación de cambio de correo electrónico
----------------------------------------
Hola ${nombreCliente}, solicitaste actualizar tu correo en Chopper Repuestos a: ${emailNuevo}.

Para confirmar este cambio, ingresá al siguiente enlace:
${linkVerificacion}

Este enlace es válido por 24 horas. Si no solicitaste este cambio, ignorá este mensaje.
  `.trim();

  if (!isSmtpConfigured()) {
    console.log(
      `[EMAIL_SERVICE: DRY-RUN] Verificación de correo para ${emailNuevo}. Link: ${linkVerificacion}`
    );
    return { success: true, simulated: true };
  }

  // Filtro de lista blanca en modo pruebas/demo
  if (!isEmailAllowed(emailNuevo)) {
    console.warn(
      `[EMAIL_SERVICE: OMITIDO (MODO DEMO)] Verificación de correo para '${emailNuevo}' omitida (destinatario no autorizado en modo pruebas). Link: ${linkVerificacion}`
    );
    return {
      success: true,
      simulated: true,
    };
  }

  try {
    const transporter = createTransporter();
    const config = getSmtpConfig();
    if (!transporter || !config) {
      return { success: false, error: "Transporter SMTP no configurado." };
    }
    await transporter.sendMail({
      from: config.from,
      to: emailNuevo,
      subject,
      text,
      html,
    });
    return { success: true };
  } catch (err: any) {
    console.error("[EMAIL_SERVICE: ERROR SMTP] Error al enviar verificación de correo:", err?.message || err);
    return { success: false, error: err?.message || "Fallo de conexión SMTP." };
  }
}
