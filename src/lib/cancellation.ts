export interface SolicitudCancelacionData {
  estado: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  motivo: string;
  fechaSolicitud: string;
  solicitadoPor: string; // e.g. "CLIENTE", "ADMINISTRADOR", "VENTAS"
  resueltaPor?: string; // Nombre y rol de quien resolvió
  fechaResolucion?: string;
  motivoResolucion?: string;
}

const METADATA_TAG_START = "[CANCELACION_METADATA:";
const METADATA_TAG_END = "]";

/**
 * Parsea la información estructurada de cancelación desde el campo notas de PedidoEcommerce.
 */
export function parseCancellationRequest(notas?: string | null): SolicitudCancelacionData | null {
  if (!notas) return null;

  const startIndex = notas.indexOf(METADATA_TAG_START);
  if (startIndex === -1) return null;

  const endIndex = notas.indexOf(METADATA_TAG_END, startIndex + METADATA_TAG_START.length);
  if (endIndex === -1) return null;

  const rawJson = notas.substring(startIndex + METADATA_TAG_START.length, endIndex);
  try {
    const parsed = JSON.parse(rawJson);
    if (parsed && (parsed.estado === "PENDIENTE" || parsed.estado === "APROBADA" || parsed.estado === "RECHAZADA")) {
      return parsed as SolicitudCancelacionData;
    }
  } catch {
    // Si no es JSON válido, retornar null
  }

  return null;
}

/**
 * Inserta o reemplaza el tag de cancelación estructurado en las notas, conservando el texto histórico.
 */
export function setCancellationMetadata(
  notas: string | null | undefined,
  data: SolicitudCancelacionData,
  textoAuditoriaAdicional?: string
): string {
  let baseNotes = (notas || "").trim();

  // Si ya existía un tag previo, removerlo limpiamente
  const startIndex = baseNotes.indexOf(METADATA_TAG_START);
  if (startIndex !== -1) {
    const endIndex = baseNotes.indexOf(METADATA_TAG_END, startIndex + METADATA_TAG_START.length);
    if (endIndex !== -1) {
      const before = baseNotes.substring(0, startIndex).trim();
      const after = baseNotes.substring(endIndex + METADATA_TAG_END.length).trim();
      baseNotes = [before, after].filter(Boolean).join(" | ");
    }
  }

  const tag = `${METADATA_TAG_START}${JSON.stringify(data)}${METADATA_TAG_END}`;
  const parts = [baseNotes, textoAuditoriaAdicional?.trim(), tag].filter(Boolean);

  return parts.join(" | ");
}
