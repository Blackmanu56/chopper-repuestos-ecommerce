import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("================================================================================");
  console.log("TEST: SIMPLIFICACIÓN DE DETALLE DE PEDIDO EN ENTREGA DE PEDIDOS");
  console.log("================================================================================");

  function extraerNotaUtil(notas: string | null | undefined): string | null {
    if (!notas || !notas.trim()) return null;

    const partes = notas
      .split(" | ")
      .map((s) => s.trim())
      .filter(Boolean);

    const esLogSistema = (texto: string) => {
      const t = texto.toLowerCase();
      return (
        t.startsWith("transferencia bancaria") ||
        t.startsWith("pago con tarjeta") ||
        t.startsWith("pago en efectivo al retirar") ||
        t.startsWith("comprobante de transferencia") ||
        t.startsWith("comprobante cargado") ||
        t.startsWith("pago aprobado por") ||
        t.startsWith("preparación iniciada") ||
        t.startsWith("preparacion iniciada") ||
        t.includes("checklist 100% completado") ||
        t.startsWith("paquete listo para entrega") ||
        t.startsWith("cobro en efectivo de") ||
        t.startsWith("cancelado por") ||
        t.startsWith("ventas verificó") ||
        t.startsWith("ventas verifico") ||
        t.startsWith("entregado a") ||
        t.startsWith("entregado en") ||
        t.startsWith("confirmación de entrega") ||
        (t.startsWith("[") && t.endsWith("]"))
      );
    };

    const notasUtiles = partes.filter((p) => !esLogSistema(p));

    if (notasUtiles.length > 0) {
      const notaLimpia = notasUtiles.join(" · ").replace(/^nota:\s*/i, "").trim();
      if (notaLimpia.length > 120) {
        return notaLimpia.substring(0, 117) + "...";
      }
      return notaLimpia;
    }

    return null;
  }

  // Simulación del renderizado de la tarjeta 4 según la vista activa
  function renderTarjeta4(activeView: string, notas: string | null | undefined) {
    const isEntregaView = activeView === "entrega";
    const obsUtil = extraerNotaUtil(notas);

    if (isEntregaView) {
      return {
        seccion: "Preparación y Control",
        muestraHistorialAuditoria: false,
        muestraObservaciones: Boolean(obsUtil),
        contenidoObservaciones: obsUtil || null,
      };
    } else {
      return {
        seccion: "Preparación y Control",
        muestraHistorialAuditoria: Boolean(notas),
        muestraObservaciones: Boolean(obsUtil),
        contenidoObservaciones: obsUtil || null,
      };
    }
  }

  const logsAuditoria = "Transferencia bancaria con comprobante adjunto. | Pago aprobado por Administrador General. | Preparación iniciada en depósito. | Checklist 100% completado.";
  const notasConMensaje = "Entregar urgente antes de las 18 hs | Transferencia bancaria con comprobante adjunto. | Pago aprobado por Ventas.";

  console.log("\n1. En vista 'entrega' con solo logs automáticos:");
  const caso1 = renderTarjeta4("entrega", logsAuditoria);
  console.log("   - muestraHistorialAuditoria:", caso1.muestraHistorialAuditoria);
  console.log("   - muestraObservaciones:", caso1.muestraObservaciones);
  if (caso1.muestraHistorialAuditoria !== false || caso1.muestraObservaciones !== false) {
    throw new Error("Falló: en entrega con solo logs no debe mostrar historial ni observaciones vacías.");
  }
  console.log("  ✓ Correcto: El historial automático queda eliminado y la sección de observaciones se oculta por completo.");

  console.log("\n2. En vista 'entrega' con nota real del cliente:");
  const caso2 = renderTarjeta4("entrega", notasConMensaje);
  console.log("   - muestraHistorialAuditoria:", caso2.muestraHistorialAuditoria);
  console.log("   - muestraObservaciones:", caso2.muestraObservaciones);
  console.log("   - contenidoObservaciones:", caso2.contenidoObservaciones);
  if (caso2.muestraHistorialAuditoria !== false || !caso2.muestraObservaciones || caso2.contenidoObservaciones !== "Entregar urgente antes de las 18 hs") {
    throw new Error("Falló: en entrega con nota del cliente debe mostrar solo 'Observaciones' compacta.");
  }
  console.log("  ✓ Correcto: Muestra únicamente la sección compacta 'Observaciones' con el texto útil, sin el historial automático.");

  console.log("\n3. En otras vistas (ej. 'pedidos') con logs automáticos:");
  const caso3 = renderTarjeta4("pedidos", logsAuditoria);
  console.log("   - muestraHistorialAuditoria:", caso3.muestraHistorialAuditoria);
  if (caso3.muestraHistorialAuditoria !== true) {
    throw new Error("Falló: en otras vistas se debe conservar el historial completo.");
  }
  console.log("  ✓ Correcto: En la vista de pedidos general se conserva el historial completo de auditoría.");

  console.log("\n================================================================================");
  console.log("✅ TODAS LAS PRUEBAS DE SIMPLIFICACIÓN DE DETALLE PASARON EXITOSAMENTE.");
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
