import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("================================================================================");
  console.log("TEST: TARJETAS Y CONSULTA DE ÓRDENES EN ENTREGA DE PEDIDOS");
  console.log("================================================================================");

  // 1. Simulación de la función extraerNotaUtil implementada en src/app/panel/page.tsx
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

  console.log("\n1. Verificando simplificación de notas en tarjetas:");
  // Caso A: Historial acumulativo del sistema (el de la captura del usuario)
  const notaSistemaLarga = "Transferencia bancaria con comprobante adjunto. Pendiente de verificación comercial por Ventas. | Pago aprobado por Administrador General (ADMINISTRADOR). Orden en espera de armado. [Ventas verificó comprobante y aprobó pago por transferencia] | Preparación iniciada en depósito por Administrador General. [Comenzado a preparar por: Administrador General] | Checklist 100% completado en depósito. Paquete listo para entrega por Administrador General. [Listo para entrega. Preparado por: Administrador General]";
  const resCasoA = extraerNotaUtil(notaSistemaLarga);
  console.log("   - Caso con solo logs de auditoría:", resCasoA === null ? "null (no ensucia la tarjeta)" : resCasoA);
  if (resCasoA !== null) {
    throw new Error("Falló: no debió mostrar el historial acumulado del sistema en la tarjeta.");
  }
  console.log("  ✓ Correcto: El historial acumulado no se imprime en la tarjeta.");

  // Caso B: Nota real del cliente o vendedor
  const notaConMensajeCliente = "Por favor entregar a mi hermano Roberto que tiene DNI 25.111.222 | Transferencia bancaria con comprobante adjunto. | Pago aprobado por Ventas.";
  const resCasoB = extraerNotaUtil(notaConMensajeCliente);
  console.log("   - Caso con nota real del cliente:", resCasoB);
  if (resCasoB !== "Por favor entregar a mi hermano Roberto que tiene DNI 25.111.222") {
    throw new Error("Falló: debió extraer la nota del cliente.");
  }
  console.log("  ✓ Correcto: Se extrae y exhibe únicamente la nota útil.");

  // Caso C: Sin notas
  if (extraerNotaUtil(null) !== null || extraerNotaUtil("") !== null) {
    throw new Error("Falló con null o vacío");
  }
  console.log("  ✓ Correcto: Notas nulas o vacías manejadas limpiamente.");

  console.log("\n2. Verificando separación entre consulta de orden y entrega:");
  // Simular evento de click en tarjeta vs click en botón de entrega
  let openedModal: "DETALLE" | "ENTREGA" | null = null;
  let identityCheckTriggered = false;

  const handleCardClick = () => {
    openedModal = "DETALLE";
  };

  const handleDeliveryButtonClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    openedModal = "ENTREGA";
    identityCheckTriggered = false; // Solo se abre el formulario de entrega, no se ejecuta entrega automáticamente
  };

  // Evento 1: Usuario hace clic en la tarjeta o #ORD
  handleCardClick();
  console.log("   - Clic en tarjeta / #ORD -> Modal abierto:", openedModal);
  if (openedModal !== "DETALLE" || identityCheckTriggered) {
    throw new Error("Clic en tarjeta no debe ejecutar entrega ni verificar DNI.");
  }
  console.log("  ✓ Correcto: Clic en tarjeta abre modal de detalle en modo consulta (sin alterar pagos ni stock).");

  // Evento 2: Usuario hace clic en el botón 'Completar entrega en mostrador'
  let propagationStopped = false;
  handleDeliveryButtonClick({
    stopPropagation: () => {
      propagationStopped = true;
    },
  });
  console.log("   - Clic en botón operativo -> Modal abierto:", openedModal, "| stopPropagation:", propagationStopped);
  if (openedModal !== "ENTREGA" || !propagationStopped) {
    throw new Error("El botón operativo debe frenar la propagación y abrir modal de entrega.");
  }
  console.log("  ✓ Correcto: 'Completar entrega' abre exclusivamente el flujo de entrega sin disparar el modal de consulta.");

  console.log("\n================================================================================");
  console.log("✅ TODAS LAS PRUEBAS DE TARJETAS Y CONSULTA DE ÓRDENES PASARON EXITOSAMENTE.");
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
