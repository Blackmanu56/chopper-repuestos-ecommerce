import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

export interface DetalleItemComprobante {
  nombre: string;
  marca?: string | null;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  comboId?: number | null;
}

export interface PedidoComprobanteData {
  numero: number;
  creadoEn: Date | string;
  fechaPago?: Date | string | null;
  nombreCliente: string;
  dniCliente?: string | null;
  telefonoCliente?: string | null;
  emailCliente?: string | null;
  direccionEnvio?: string | null;
  modalidadEntrega: string; // RETIRO_LOCAL | MOTOMANDADO
  metodoPago: string; // TRANSFERENCIA | EFECTIVO_LOCAL | TARJETA
  costoEnvio?: number | null;
  total: number;
  items: DetalleItemComprobante[];
}

function formatCurrency(n: number): string {
  return "$" + Number(n || 0).toLocaleString("es-AR");
}

function formatDate(d: Date | string): string {
  try {
    return new Date(d).toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return new Date().toLocaleDateString("es-AR");
  }
}

/**
 * Genera el Buffer binario del comprobante PDF reutilizando estrictamente
 * la estructura y diseño del Ticket del SGI (TicketModal.tsx) con mejoras visuales para A4.
 */
export function buildComprobantePdf(data: PedidoComprobanteData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
      info: {
        Title: `Comprobante de Compra #ORD-${data.numero} - Chopper Repuestos`,
        Author: "Chopper Repuestos",
        Subject: "Comprobante de compra no fiscal",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width; // 595.28 pt
    const leftMargin = 40;
    const rightMargin = pageWidth - 40; // 555.28 pt
    const contentWidth = rightMargin - leftMargin; // 515.28 pt

    let y = 35;

    // 1. Logo original de Chopper Repuestos centrado
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    if (fs.existsSync(logoPath)) {
      try {
        const logoWidth = 110;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.image(logoPath, logoX, y, { width: logoWidth });
        y += 55;
      } catch {
        y += 10;
      }
    }

    // 2. Encabezado institucional con datos del comercio (idéntico al SGI TicketModal)
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor("#0f172a")
      .text("CHOPPER REPUESTOS", leftMargin, y, { align: "center", width: contentWidth });
    y += 18;

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#475569")
      .text("Av. Roque Sáenz Peña 1500 · Posadas, Misiones", leftMargin, y, { align: "center", width: contentWidth });
    y += 13;

    doc
      .text("CUIT: 37-32340054-6 · WhatsApp de atención: +54 9 376 524-3554", leftMargin, y, { align: "center", width: contentWidth });
    y += 18;

    // Línea divisoria punteada estilo Ticket SGI
    doc
      .dash(3, { space: 3 })
      .moveTo(leftMargin, y)
      .lineTo(rightMargin, y)
      .strokeColor("#cbd5e1")
      .stroke()
      .undash();
    y += 12;

    // 3. Título del documento: COMPROBANTE DE COMPRA — NO FISCAL (Requisito 3)
    doc
      .rect(leftMargin, y, contentWidth, 32)
      .fillAndStroke("#f8fafc", "#e2e8f0");

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#dc2626")
      .text("COMPROBANTE DE COMPRA — NO FISCAL", leftMargin, y + 6, { align: "center", width: contentWidth });

    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor("#64748b")
      .text("Documento no válido como factura fiscal · Constancia de operación online", leftMargin, y + 19, { align: "center", width: contentWidth });
    y += 42;

    // 4. Bloque de Metadata en dos columnas (Datos de Operación y Datos de Cliente)
    const colWidth = (contentWidth - 16) / 2;
    const col1X = leftMargin;
    const col2X = leftMargin + colWidth + 16;
    const metaBoxY = y;

    // Fondo blanco con borde para metadata
    doc
      .rect(leftMargin, metaBoxY, contentWidth, 76)
      .fillAndStroke("#ffffff", "#e2e8f0");

    // Columna 1: Operación
    let metaY = metaBoxY + 8;
    const drawMetaRow = (x: number, label: string, val: string, isValBold = false, valColor = "#0f172a") => {
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#64748b").text(label, x + 8, metaY);
      doc.font(isValBold ? "Helvetica-Bold" : "Helvetica").fontSize(8.5).fillColor(valColor).text(val, x + 85, metaY, { width: colWidth - 95, align: "left" });
      metaY += 16;
    };

    drawMetaRow(col1X, "COMPROBANTE:", `#ORD-${data.numero}`, true, "#dc2626");
    drawMetaRow(col1X, "FECHA:", formatDate(data.fechaPago || data.creadoEn));
    const metodoPagoLabel = data.metodoPago === "TRANSFERENCIA"
      ? "Transferencia bancaria"
      : data.metodoPago === "EFECTIVO_LOCAL"
      ? "Efectivo en mostrador"
      : "Tarjeta de crédito/débito";
    drawMetaRow(col1X, "MEDIO DE PAGO:", metodoPagoLabel);
    const modalidadLabel = data.modalidadEntrega === "MOTOMANDADO"
      ? "Motomandado en el día"
      : "Retiro en local (Av. Roque Sáenz Peña 1500)";
    drawMetaRow(col1X, "MODALIDAD:", modalidadLabel);

    // Columna 2: Cliente
    metaY = metaBoxY + 8;
    drawMetaRow(col2X, "CLIENTE:", data.nombreCliente, true);
    drawMetaRow(col2X, "DNI / CUIT:", data.dniCliente || "No informado");
    drawMetaRow(col2X, "TELÉFONO:", data.telefonoCliente || "No informado");
    const entregaDir = data.modalidadEntrega === "MOTOMANDADO"
      ? (data.direccionEnvio || "Posadas, Misiones")
      : "Mostrador Chopper (Posadas)";
    drawMetaRow(col2X, "DESTINO:", entregaDir);

    y = metaBoxY + 86;

    // 5. Tabla de Productos (Estructura de TicketModal SGI)
    const tableHeaderY = y;
    doc
      .rect(leftMargin, tableHeaderY, contentWidth, 20)
      .fillAndStroke("#f1f5f9", "#cbd5e1");

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor("#475569");

    doc.text("DETALLE / PRODUCTO", leftMargin + 10, tableHeaderY + 6, { width: 260 });
    doc.text("CANT", leftMargin + 280, tableHeaderY + 6, { width: 40, align: "center" });
    doc.text("PRECIO UNIT", leftMargin + 330, tableHeaderY + 6, { width: 85, align: "right" });
    doc.text("SUBTOTAL", leftMargin + 425, tableHeaderY + 6, { width: 80, align: "right" });

    y = tableHeaderY + 20;

    let subtotalProductos = 0;
    data.items.forEach((item, idx) => {
      // Paginación automática si la lista de productos sobrepasa el límite seguro de la página
      if (y > doc.page.height - 160) {
        doc.addPage();
        y = 40;

        // Redibujar encabezado de tabla en la página siguiente
        doc
          .rect(leftMargin, y, contentWidth, 20)
          .fillAndStroke("#f1f5f9", "#cbd5e1");

        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor("#475569");

        doc.text("DETALLE / PRODUCTO (cont.)", leftMargin + 10, y + 6, { width: 260 });
        doc.text("CANT", leftMargin + 280, y + 6, { width: 40, align: "center" });
        doc.text("PRECIO UNIT", leftMargin + 330, y + 6, { width: 85, align: "right" });
        doc.text("SUBTOTAL", leftMargin + 425, y + 6, { width: 80, align: "right" });

        y += 20;
      }

      const rowY = y;
      const isEven = idx % 2 === 0;
      if (!isEven) {
        doc.rect(leftMargin, rowY, contentWidth, 22).fill("#fafafa");
      }

      // Nombre y marca (con soporte para combos comerciales)
      const isCombo = Boolean(item.comboId);
      const nombreTexto = isCombo ? `[COMBO] ${item.nombre}` : item.nombre;
      
      doc
        .font(isCombo ? "Helvetica-Bold" : "Helvetica")
        .fontSize(8.5)
        .fillColor("#0f172a")
        .text(nombreTexto, leftMargin + 10, rowY + 5, { width: 260, lineBreak: false, ellipsis: true });

      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor("#334155")
        .text(String(item.cantidad), leftMargin + 280, rowY + 5, { width: 40, align: "center" });

      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor("#475569")
        .text(formatCurrency(item.precioUnitario), leftMargin + 330, rowY + 5, { width: 85, align: "right" });

      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor("#0f172a")
        .text(formatCurrency(item.subtotal), leftMargin + 425, rowY + 5, { width: 80, align: "right" });

      // Línea divisoria muy suave entre filas
      doc
        .moveTo(leftMargin, rowY + 22)
        .lineTo(rightMargin, rowY + 22)
        .strokeColor("#e2e8f0")
        .stroke();

      subtotalProductos += item.subtotal;
      y += 22;
    });

    // Paginación si el bloque de totales y pie excede la página
    if (y > doc.page.height - 180) {
      doc.addPage();
      y = 40;
    }

    y += 10;

    // 6. Bloque de Totales (Alineado a la derecha)
    const totalsBoxWidth = 220;
    const totalsBoxX = rightMargin - totalsBoxWidth;

    if (data.costoEnvio && data.costoEnvio > 0) {
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor("#64748b")
        .text("Subtotal productos:", totalsBoxX, y, { width: 110 });
      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor("#334155")
        .text(formatCurrency(subtotalProductos), totalsBoxX + 110, y, { width: 110, align: "right" });
      y += 16;

      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor("#64748b")
        .text("Costo de envío:", totalsBoxX, y, { width: 110 });
      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor("#334155")
        .text(formatCurrency(data.costoEnvio), totalsBoxX + 110, y, { width: 110, align: "right" });
      y += 16;
    }

    // Fila destacada de TOTAL PAGADO (Requisito 1)
    doc
      .rect(totalsBoxX, y, totalsBoxWidth, 26)
      .fillAndStroke("#f8fafc", "#cbd5e1");

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#0f172a")
      .text("TOTAL PAGADO:", totalsBoxX + 10, y + 8, { width: 95 });

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#dc2626")
      .text(formatCurrency(data.total), totalsBoxX + 105, y + 7, { width: 105, align: "right" });

    y += 45;

    // Línea punteada final
    doc
      .dash(3, { space: 3 })
      .moveTo(leftMargin, y)
      .lineTo(rightMargin, y)
      .strokeColor("#cbd5e1")
      .stroke()
      .undash();
    y += 15;

    // 7. Pie institucional (idéntico al SGI TicketModal sin la palabra 'oficial')
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#0f172a")
      .text("¡GRACIAS POR SU COMPRA!", leftMargin, y, { align: "center", width: contentWidth });
    y += 14;

    doc
      .font("Helvetica-Oblique")
      .fontSize(8)
      .fillColor("#64748b")
      .text("Este comprobante sirve como constancia de compra online en Chopper Repuestos.", leftMargin, y, { align: "center", width: contentWidth });
    y += 12;

    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor("#94a3b8")
      .text("Para retiros en mostrador presente este documento y su DNI · Horarios: Lunes a Sábados 8:00-12:30 / 16:30-20:30 hs", leftMargin, y, { align: "center", width: contentWidth });

    doc.end();
  });
}

/**
 * Consulta un pedido en PostgreSQL y genera su comprobante PDF no fiscal
 */
export async function generarComprobantePdfPorPedidoId(pedidoId: number): Promise<Buffer | null> {
  try {
    const pedido = await prisma.pedidoEcommerce.findUnique({
      where: { id: pedidoId },
      include: {
        items: true,
        cliente: true,
      },
    });

    if (!pedido) return null;

    return await buildComprobantePdf({
      numero: pedido.numero,
      creadoEn: pedido.creadoEn,
      fechaPago: pedido.fechaPago,
      nombreCliente: pedido.nombreCliente || pedido.cliente?.nombre || "Cliente Chopper",
      dniCliente: pedido.dniCliente || pedido.cliente?.dni,
      telefonoCliente: pedido.telefonoCliente || pedido.cliente?.telefono,
      emailCliente: pedido.emailCliente || pedido.cliente?.email,
      direccionEnvio: pedido.direccionEnvio || pedido.cliente?.direccion,
      modalidadEntrega: pedido.modalidadEntrega,
      metodoPago: pedido.metodoPago,
      costoEnvio: pedido.costoEnvio,
      total: pedido.total,
      items: pedido.items.map((it) => ({
        nombre: it.nombre,
        marca: it.marca,
        cantidad: it.cantidad,
        precioUnitario: it.precioUnitario,
        subtotal: it.subtotal,
        comboId: it.comboId,
      })),
    });
  } catch (error) {
    console.error(`[COMPROBANTE_PDF] Error al generar PDF para pedido ID ${pedidoId}:`, error);
    return null;
  }
}
