import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

export interface DetalleItemComprobante {
  codigo?: string | null;
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
  cuitCliente?: string | null;
  telefonoCliente?: string | null;
  emailCliente?: string | null;
  direccionEnvio?: string | null;
  modalidadEntrega: string; // RETIRO_LOCAL | MOTOMANDADO
  metodoPago: string; // TRANSFERENCIA | EFECTIVO_LOCAL | TARJETA
  costoEnvio?: number | null;
  total: number;
  notas?: string | null;
  items: DetalleItemComprobante[];
}

function formatCurrency(n: number): string {
  return "$" + Number(n || 0).toLocaleString("es-AR");
}

function formatDate(d: Date | string): string {
  try {
    return new Date(d).toLocaleDateString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return new Date().toLocaleDateString("es-AR");
  }
}

function formatTime24(d: Date | string): string {
  try {
    return new Date(d).toLocaleTimeString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }) + " hs";
  } catch {
    return "";
  }
}

/**
 * Genera el Buffer binario del comprobante PDF de compra online,
 * replicando con estricta fidelidad el diseño de la Factura A4 del SGI
 * (implementada en VentasTerminal.tsx líneas 1110-1246 y 1295-1426).
 */
export function buildComprobantePdf(data: PedidoComprobanteData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Formato A4 vertical estándar: 595.28 x 841.89 pt
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 36, bottom: 36, left: 36, right: 36 },
      autoFirstPage: true,
      info: {
        Title: `Comprobante de Compra #ORD-${data.numero} - Chopper Repuestos`,
        Author: "Chopper Repuestos",
        Subject: "Comprobante de compra no fiscal - E-commerce",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = 36;
    const right = 595.28 - 36; // 559.28 pt
    const contentWidth = right - left; // 523.28 pt

    let y = 36;

    // ─── 1. ENCABEZADO (Idéntico a VentasTerminal.tsx del SGI) ───
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    const logoY = y;
    const logoHeight = 44;
    const logoWidth = 66; // Aspect ratio 1.5

    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, left, logoY, { width: logoWidth, height: logoHeight });
      } catch {}
    }

    // Nombre "CHOPPER REPUESTOS" en rojo a la derecha del logo
    const titleX = left + logoWidth + 10;
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor("#D62828")
      .text("CHOPPER REPUESTOS", titleX, logoY + 4);

    // Información comercial debajo del nombre
    const infoY = logoY + 26;
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor("#555555")
      .lineGap(1.5)
      .text(
        "Av. Roque Saenz Peña 1500 · Posadas, Misiones\nTel: (0376) 444-5555 · WhatsApp: +54 9 376 524-3554\nEmail: info@chopperrepuestos.com.ar\nCUIT: 37-32340054-6 · Condición IVA: Responsable Inscripto",
        titleX,
        infoY,
        { width: 280 }
      );

    // Bloque derecho: Identificación del comprobante en recuadro rojo
    const boxWidth = 195;
    const boxX = right - boxWidth;
    const boxY = y + 2;

    doc
      .lineWidth(1.8)
      .strokeColor("#D62828")
      .rect(boxX, boxY, boxWidth, 32)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor("#D62828")
      .text("COMPROBANTE DE COMPRA", boxX, boxY + 6, { width: boxWidth, align: "center" });

    doc
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .fillColor("#D62828")
      .text("NO FISCAL", boxX, boxY + 18, { width: boxWidth, align: "center" });

    // Metadatos: Nº, Fecha y Hora alineados a la derecha
    const metaRightY = boxY + 38;
    const fechaOp = data.fechaPago || data.creadoEn;

    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor("#555555")
      .text("Nº: ", boxX, metaRightY, { width: boxWidth - 110, align: "right" });
    doc
      .font("Helvetica-Bold")
      .fillColor("#1a1a1a")
      .text(`#ORD-${data.numero}`, boxX + boxWidth - 105, metaRightY, { width: 105, align: "right" });

    doc
      .font("Helvetica")
      .fillColor("#555555")
      .text("Fecha: ", boxX, metaRightY + 12, { width: boxWidth - 110, align: "right" });
    doc
      .font("Helvetica-Bold")
      .fillColor("#1a1a1a")
      .text(formatDate(fechaOp), boxX + boxWidth - 105, metaRightY + 12, { width: 105, align: "right" });

    doc
      .font("Helvetica")
      .fillColor("#555555")
      .text("Hora: ", boxX, metaRightY + 24, { width: boxWidth - 110, align: "right" });
    doc
      .font("Helvetica-Bold")
      .fillColor("#1a1a1a")
      .text(formatTime24(fechaOp), boxX + boxWidth - 105, metaRightY + 24, { width: 105, align: "right" });

    // Línea divisoria roja continua inferior del encabezado
    y = Math.max(infoY + 48, metaRightY + 40);
    doc
      .lineWidth(2)
      .strokeColor("#D62828")
      .moveTo(left, y)
      .lineTo(right, y)
      .stroke();
    y += 12;

    // ─── 2. DATOS DEL CLIENTE + OPERACIÓN ONLINE (Columnas SGI) ───
    const colGap = 24;
    const colWidth = (contentWidth - colGap) / 2;
    const col1X = left;
    const col2X = left + colWidth + colGap;

    // Encabezado Columna 1
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#D62828")
      .text("DATOS DEL CLIENTE", col1X, y);
    doc
      .lineWidth(0.8)
      .strokeColor("#e0e0e0")
      .moveTo(col1X, y + 12)
      .lineTo(col1X + colWidth, y + 12)
      .stroke();

    // Encabezado Columna 2
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#D62828")
      .text("INFORMACIÓN DE ENTREGA", col2X, y);
    doc
      .lineWidth(0.8)
      .strokeColor("#e0e0e0")
      .moveTo(col2X, y + 12)
      .lineTo(col2X + colWidth, y + 12)
      .stroke();

    y += 18;

    const rowH = 13.5;
    let rY1 = y;

    const drawRow = (x: number, w: number, label: string, val: string, curY: number) => {
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#1a1a1a").text(label, x, curY, { width: 80 });
      doc.font("Helvetica").fontSize(8.5).fillColor("#1a1a1a").text(val || "-", x + 80, curY, { width: w - 80, align: "right" });
    };

    drawRow(col1X, colWidth, "Nombre:", data.nombreCliente || "Cliente Chopper", rY1);
    rY1 += rowH;
    const dniText = data.dniCliente ? (data.cuitCliente ? `${data.dniCliente} / ${data.cuitCliente}` : data.dniCliente) : "-";
    drawRow(col1X, colWidth, "DNI/CUIT:", dniText, rY1);
    rY1 += rowH;
    if (data.telefonoCliente) {
      drawRow(col1X, colWidth, "Teléfono:", data.telefonoCliente, rY1);
      rY1 += rowH;
    }
    if (data.emailCliente) {
      drawRow(col1X, colWidth, "Email:", data.emailCliente, rY1);
      rY1 += rowH;
    }

    let rY2 = y;
    const modalidadLabel = data.modalidadEntrega === "MOTOMANDADO"
      ? "Motomandado en el día"
      : "Retiro en mostrador";
    drawRow(col2X, colWidth, "Modalidad:", modalidadLabel, rY2);
    rY2 += rowH;

    if (data.modalidadEntrega === "MOTOMANDADO") {
      drawRow(col2X, colWidth, "Destino:", data.direccionEnvio || "Posadas, Misiones", rY2);
      rY2 += rowH;
    } else {
      drawRow(col2X, colWidth, "Punto retiro:", "Av. Roque Sáenz Peña 1500", rY2);
      rY2 += rowH;
    }

    const metodoPagoLabel = data.metodoPago === "TRANSFERENCIA"
      ? "Transferencia bancaria"
      : data.metodoPago === "EFECTIVO_LOCAL"
      ? "Efectivo contra entrega"
      : "Tarjeta de Débito";
    drawRow(col2X, colWidth, "Medio de pago:", metodoPagoLabel, rY2);
    rY2 += rowH;

    drawRow(col2X, colWidth, "Canal:", "Tienda Online (E-commerce)", rY2);
    rY2 += rowH;

    y = Math.max(rY1, rY2) + 12;

    // ─── 3. TABLA DE PRODUCTOS (Encabezado rojo idéntico al SGI) ───
    const colW_codigo = 70;
    const colW_cant = 42;
    const colW_punit = 68;
    const colW_desc = 58;
    const colW_subt = 78;
    const colW_prod = contentWidth - (colW_codigo + colW_cant + colW_punit + colW_desc + colW_subt); // ~207.28 pt

    const x_codigo = left;
    const x_prod = x_codigo + colW_codigo;
    const x_cant = x_prod + colW_prod;
    const x_punit = x_cant + colW_cant;
    const x_desc = x_punit + colW_punit;
    const x_subt = x_desc + colW_desc;

    const tableHeaderH = 20;
    doc
      .rect(left, y, contentWidth, tableHeaderH)
      .fill("#D62828");

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor("#ffffff");

    doc.text("CÓDIGO", x_codigo + 6, y + 6, { width: colW_codigo - 12, align: "left" });
    doc.text("PRODUCTO", x_prod + 6, y + 6, { width: colW_prod - 12, align: "left" });
    doc.text("CANT.", x_cant, y + 6, { width: colW_cant, align: "center" });
    doc.text("P. UNIT.", x_punit, y + 6, { width: colW_punit - 6, align: "right" });
    doc.text("DESCUENTO", x_desc, y + 6, { width: colW_desc - 6, align: "right" });
    doc.text("SUBTOTAL", x_subt, y + 6, { width: colW_subt - 6, align: "right" });

    y += tableHeaderH;

    let subtotalProductos = 0;
    data.items.forEach((item, idx) => {
      // Paginación segura para pedidos con extensa lista de productos
      if (y > doc.page.height - 180) {
        doc.addPage();
        y = 36;

        doc.rect(left, y, contentWidth, tableHeaderH).fill("#D62828");
        doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff");
        doc.text("CÓDIGO", x_codigo + 6, y + 6, { width: colW_codigo - 12, align: "left" });
        doc.text("PRODUCTO (cont.)", x_prod + 6, y + 6, { width: colW_prod - 12, align: "left" });
        doc.text("CANT.", x_cant, y + 6, { width: colW_cant, align: "center" });
        doc.text("P. UNIT.", x_punit, y + 6, { width: colW_punit - 6, align: "right" });
        doc.text("DESCUENTO", x_desc, y + 6, { width: colW_desc - 6, align: "right" });
        doc.text("SUBTOTAL", x_subt, y + 6, { width: colW_subt - 6, align: "right" });
        y += tableHeaderH;
      }

      const isEven = idx % 2 === 0;
      const isCombo = Boolean(item.comboId);
      const nombreTexto = isCombo ? `[COMBO] ${item.nombre}` : item.nombre;

      doc.font(isCombo ? "Helvetica-Bold" : "Helvetica").fontSize(8.5);
      const textH = doc.heightOfString(nombreTexto, { width: colW_prod - 12 });
      const rowHeight = Math.max(18, textH + 8);

      if (!isEven) {
        doc.rect(left, y, contentWidth, rowHeight).fill("#fafafa");
      }

      const itemY = y + 5;

      // Código
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#1a1a1a")
        .text(item.codigo || "-", x_codigo + 6, itemY, { width: colW_codigo - 12, align: "left" });

      // Producto
      doc
        .font(isCombo ? "Helvetica-Bold" : "Helvetica")
        .fontSize(8.5)
        .fillColor("#1a1a1a")
        .text(nombreTexto, x_prod + 6, itemY, { width: colW_prod - 12, align: "left" });

      // Cantidad
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor("#1a1a1a")
        .text(String(item.cantidad), x_cant, itemY, { width: colW_cant, align: "center" });

      // Precio Unitario (monospace Courier)
      doc
        .font("Courier")
        .fontSize(8.5)
        .fillColor("#1a1a1a")
        .text(formatCurrency(item.precioUnitario), x_punit, itemY, { width: colW_punit - 6, align: "right" });

      // Descuento
      doc
        .font("Courier")
        .fontSize(8.5)
        .fillColor("#1a1a1a")
        .text("-", x_desc, itemY, { width: colW_desc - 6, align: "right" });

      // Subtotal (monospace Courier)
      doc
        .font("Courier")
        .fontSize(8.5)
        .fillColor("#1a1a1a")
        .text(formatCurrency(item.subtotal), x_subt, itemY, { width: colW_subt - 6, align: "right" });

      // Borde suave inferior
      doc
        .lineWidth(0.6)
        .strokeColor("#eeeeee")
        .moveTo(left, y + rowHeight)
        .lineTo(right, y + rowHeight)
        .stroke();

      subtotalProductos += item.subtotal;
      y += rowHeight;
    });

    y += 10;

    // ─── 4. TOTALES (Alineados a la derecha) ───
    const summaryWidth = 270;
    const summaryX = right - summaryWidth;

    const drawSummaryRow = (label: string, val: string, isTotal = false) => {
      doc
        .font(isTotal ? "Helvetica-Bold" : "Helvetica")
        .fontSize(isTotal ? 11 : 8.5)
        .fillColor("#1a1a1a")
        .text(label, summaryX, y, { width: 150, align: "left" });

      doc
        .font(isTotal ? "Courier-Bold" : "Courier")
        .fontSize(isTotal ? 13 : 8.5)
        .fillColor(isTotal ? "#D62828" : "#1a1a1a")
        .text(val, summaryX + 150, y - (isTotal ? 1 : 0), { width: summaryWidth - 150, align: "right" });

      y += isTotal ? 20 : 13;
    };

    drawSummaryRow("Subtotal:", formatCurrency(subtotalProductos));

    if (data.costoEnvio && data.costoEnvio > 0) {
      drawSummaryRow("Costo de envío (Motomandado):", formatCurrency(data.costoEnvio));
    }

    // Línea roja superior del Total: borderTop: 2px solid #D62828
    doc
      .lineWidth(2)
      .strokeColor("#D62828")
      .moveTo(summaryX, y + 2)
      .lineTo(right, y + 2)
      .stroke();
    y += 7;

    drawSummaryRow("TOTAL PAGADO:", formatCurrency(data.total), true);

    y += 6;

    // ─── 5. FORMA DE PAGO (Caja con borde SGI) ───
    const paymentBoxH = 24;
    doc
      .lineWidth(0.8)
      .strokeColor("#dddddd")
      .rect(left, y, contentWidth, paymentBoxH)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor("#1a1a1a")
      .text("Forma de Pago:", left + 12, y + 7, { width: 120 });

    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor("#1a1a1a")
      .text(metodoPagoLabel, left + 130, y + 7, { width: contentWidth - 142, align: "right" });

    y += paymentBoxH + 8;

    // ─── 6. OBSERVACIONES (Caja dashed SGI) ───
    let cleanNota = "";
    if (data.notas) {
      const parts = data.notas.split("|").map((s) => s.trim()).filter(Boolean);
      const firstPart = parts[0] || "";
      if (!firstPart.includes("por Administrador") && !firstPart.includes("Checklist 100%")) {
        cleanNota = firstPart;
      }
    }

    if (!cleanNota) {
      cleanNota = data.modalidadEntrega === "MOTOMANDADO"
        ? `Despacho por motomandado/Moto Uber a domicilio (${data.direccionEnvio || "Posadas"}).`
        : `Retiro por mostrador en el local (Av. Roque Sáenz Peña 1500, Posadas).`;
    }

    const obsBoxH = 32;
    doc
      .dash(3, { space: 2.5 })
      .lineWidth(0.8)
      .strokeColor("#cccccc")
      .rect(left, y, contentWidth, obsBoxH)
      .stroke()
      .undash();

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#555555")
      .text(`Observaciones: ${cleanNota}`, left + 10, y + 6, { width: contentWidth - 20, lineBreak: false, ellipsis: true });

    doc
      .font("Helvetica-Oblique")
      .fontSize(7)
      .fillColor("#888888")
      .text("Documento no válido como factura fiscal · Operación registrada a través del e-commerce Chopper Repuestos", left + 10, y + 18, { width: contentWidth - 20 });

    y += obsBoxH + 12;

    // ─── 7. FOOTER (Línea roja SGI) ───
    doc
      .lineWidth(2)
      .strokeColor("#D62828")
      .moveTo(left, y)
      .lineTo(right, y)
      .stroke();
    y += 8;

    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor("#1a1a1a")
      .text("¡GRACIAS POR SU COMPRA! · CHOPPER REPUESTOS", left, y, { width: contentWidth, align: "center" });

    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor("#666666")
      .text("Horarios de atención: Lunes a Sábados 8:00 - 12:30 / 16:30 - 20:30 hs · Av. Roque Sáenz Peña 1500, Posadas", left, y + 11, { width: contentWidth, align: "center" });

    doc.end();
  });
}

/**
 * Consulta un pedido en PostgreSQL y genera su comprobante PDF no fiscal
 * con el formato oficial de la Factura A4 del SGI.
 */
export async function generarComprobantePdfPorPedidoId(pedidoId: number): Promise<Buffer | null> {
  try {
    const pedido = await prisma.pedidoEcommerce.findFirst({
      where: {
        OR: [
          { id: pedidoId },
          { numero: pedidoId },
        ],
      },
      include: {
        items: {
          include: {
            producto: true,
          },
        },
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
      cuitCliente: pedido.cliente?.cuit,
      telefonoCliente: pedido.telefonoCliente || pedido.cliente?.telefono,
      emailCliente: pedido.emailCliente || pedido.cliente?.email,
      direccionEnvio: pedido.direccionEnvio || pedido.cliente?.direccion,
      modalidadEntrega: pedido.modalidadEntrega,
      metodoPago: pedido.metodoPago,
      costoEnvio: pedido.costoEnvio,
      total: pedido.total,
      notas: pedido.notas,
      items: pedido.items.map((it) => ({
        codigo: it.producto?.codigo || "-",
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
