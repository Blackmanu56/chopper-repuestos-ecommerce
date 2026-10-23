export interface ProductSpec {
  caracteristica: string;
  valor: string;
}

export interface ProductCommercialMetadata {
  texto: string;
  especificaciones: ProductSpec[];
  motosCompatibles: string[];
}

/**
 * Parsea el campo descripcion almacenado en ProductoEcommerce.
 * Es compatible tanto con JSON estructurado como con texto plano heredado.
 */
export function parseProductMetadata(rawDescripcion?: string | null): ProductCommercialMetadata {
  if (!rawDescripcion || !rawDescripcion.trim()) {
    return {
      texto: "",
      especificaciones: [],
      motosCompatibles: [],
    };
  }

  const trimmed = rawDescripcion.trim();

  // Intentar parsear como JSON si tiene formato de objeto
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "object" && parsed !== null) {
        const texto =
          typeof parsed.texto === "string"
            ? parsed.texto
            : typeof parsed.descripcion === "string"
            ? parsed.descripcion
            : "";

        const especificaciones: ProductSpec[] = Array.isArray(parsed.especificaciones)
          ? parsed.especificaciones
              .filter(
                (s: any) =>
                  s &&
                  typeof s.caracteristica === "string" &&
                  typeof s.valor === "string" &&
                  s.caracteristica.trim().length > 0 &&
                  s.valor.trim().length > 0
              )
              .map((s: any) => ({
                caracteristica: s.caracteristica.trim(),
                valor: s.valor.trim(),
              }))
          : [];

        const motosCompatibles: string[] = Array.isArray(parsed.motosCompatibles)
          ? parsed.motosCompatibles
              .filter((m: any) => typeof m === "string" && m.trim().length > 0)
              .map((m: string) => m.trim())
          : [];

        // Deduplicar motos conservando orden
        const uniqueMotos = Array.from(new Set(motosCompatibles));

        return {
          texto,
          especificaciones,
          motosCompatibles: uniqueMotos,
        };
      }
    } catch {
      // Si falla el parsing JSON, se procesa como texto plano
    }
  }

  // Texto plano heredado
  return {
    texto: trimmed,
    especificaciones: [],
    motosCompatibles: [],
  };
}

/**
 * Serializa los metadatos comerciales del producto para almacenarlos en ProductoEcommerce.descripcion
 */
export function serializeProductMetadata(metadata: {
  texto?: string;
  especificaciones?: ProductSpec[];
  motosCompatibles?: string[];
}): string | null {
  const texto = (metadata.texto || "").trim();
  const especificaciones = (metadata.especificaciones || [])
    .filter((s) => s && s.caracteristica?.trim() && s.valor?.trim())
    .map((s) => ({ caracteristica: s.caracteristica.trim(), valor: s.valor.trim() }));

  const rawMotos = (metadata.motosCompatibles || [])
    .filter((m) => typeof m === "string" && m.trim().length > 0)
    .map((m) => m.trim());
  const motosCompatibles = Array.from(new Set(rawMotos));

  // Si no hay datos cargados, retornar null para no ocupar espacio innecesario
  if (!texto && especificaciones.length === 0 && motosCompatibles.length === 0) {
    return null;
  }

  // Si solo hay texto y nada de specs ni motos, podemos guardar JSON uniforme para consistencia
  return JSON.stringify({
    texto,
    especificaciones,
    motosCompatibles,
  });
}
