export interface ProductSpec {
  caracteristica: string;
  valor: string;
}

export interface ProductCommercialMetadata {
  tituloComercial?: string | null;
  texto: string;
  universal?: boolean;
  especificaciones: ProductSpec[];
  motosCompatibles: string[];
}

/**
 * Genera la descripción descriptiva por defecto para productos que aún no tengan una personalizada guardada.
 * Coincide exactamente con la descripción generada en la ficha pública.
 */
export function getDefaultProductDescription(nombre: string, marca?: string | null): string {
  const m = marca && marca.trim() && marca.trim() !== "Genérico" ? marca.trim() : "Chopper";
  return `El ${nombre} de marca ${m} es un componente para motocicleta fabricado bajo normas de precisión. Diseñado para responder a las exigencias del tránsito urbano y traslados continuos en la región de Posadas y Misiones, asegura durabilidad, óptimo rendimiento mecánico y confiabilidad en tu andar diario.`;
}

/**
 * Parsea el campo descripcion almacenado en ProductoEcommerce.
 * Es compatible tanto con JSON estructurado como con texto plano heredado.
 */
export function parseProductMetadata(rawDescripcion?: string | null): ProductCommercialMetadata {
  if (!rawDescripcion || !rawDescripcion.trim()) {
    return {
      tituloComercial: null,
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
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        ("texto" in parsed ||
          "descripcion" in parsed ||
          "especificaciones" in parsed ||
          "motosCompatibles" in parsed ||
          "tituloComercial" in parsed ||
          "titulo" in parsed)
      ) {
        const tituloComercial =
          typeof parsed.tituloComercial === "string" && parsed.tituloComercial.trim().length > 0
            ? parsed.tituloComercial.trim()
            : typeof parsed.titulo === "string" && parsed.titulo.trim().length > 0
            ? parsed.titulo.trim()
            : null;

        const texto =
          typeof parsed.texto === "string"
            ? parsed.texto
            : typeof parsed.descripcion === "string"
            ? parsed.descripcion
            : "";

        const universal = Boolean(
          parsed.universal ||
          parsed.esUniversal ||
          (Array.isArray(parsed.motosCompatibles) &&
            parsed.motosCompatibles.some((m: any) => typeof m === "string" && m.trim().toUpperCase() === "UNIVERSAL"))
        );

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
              .filter((m: any) => typeof m === "string" && m.trim().length > 0 && m.trim().toUpperCase() !== "UNIVERSAL")
              .map((m: string) => m.trim())
          : [];

        // Deduplicar motos conservando orden
        const uniqueMotos = Array.from(new Set(motosCompatibles));

        return {
          tituloComercial,
          texto,
          universal,
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
    tituloComercial: null,
    texto: trimmed,
    universal: false,
    especificaciones: [],
    motosCompatibles: [],
  };
}

/**
 * Serializa los metadatos comerciales del producto para almacenarlos en ProductoEcommerce.descripcion
 */
export function serializeProductMetadata(metadata: {
  tituloComercial?: string | null;
  texto?: string;
  universal?: boolean;
  especificaciones?: ProductSpec[];
  motosCompatibles?: string[];
}): string | null {
  const tituloComercial = (metadata.tituloComercial || "").trim() || null;
  const texto = (metadata.texto || "").trim();
  const universal = Boolean(metadata.universal);
  const especificaciones = (metadata.especificaciones || [])
    .filter((s) => s && s.caracteristica?.trim() && s.valor?.trim())
    .map((s) => ({ caracteristica: s.caracteristica.trim(), valor: s.valor.trim() }));

  const rawMotos = (metadata.motosCompatibles || [])
    .filter((m) => typeof m === "string" && m.trim().length > 0 && m.trim().toUpperCase() !== "UNIVERSAL")
    .map((m) => m.trim());
  const motosCompatibles = Array.from(new Set(rawMotos));

  // Si no hay datos cargados, retornar null para no ocupar espacio innecesario
  if (!tituloComercial && !texto && !universal && especificaciones.length === 0 && motosCompatibles.length === 0) {
    return null;
  }

  // Si solo hay texto y nada de titulo, universal, specs ni motos, guardar como texto plano directamente
  if (!tituloComercial && !universal && especificaciones.length === 0 && motosCompatibles.length === 0) {
    return texto;
  }

  return JSON.stringify({
    ...(tituloComercial ? { tituloComercial } : {}),
    texto,
    ...(universal ? { universal: true } : {}),
    especificaciones,
    motosCompatibles,
  });
}
