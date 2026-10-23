export interface EtiquetaOferta {
  id: string;
  nombre: string;
  emoji?: string | null;
  activa: boolean;
  count?: number;
}

export interface EtiquetaEmojiOption {
  emoji: string;
  label: string;
  categoria: "Promociones y descuentos" | "Campañas y fechas especiales";
}

export const EMOJIS_DISPONIBLES: EtiquetaEmojiOption[] = [
  // Promociones y descuentos
  { emoji: "🔥", label: "Oferta especial", categoria: "Promociones y descuentos" },
  { emoji: "🏷️", label: "Descuento", categoria: "Promociones y descuentos" },
  { emoji: "⚡", label: "Oferta flash", categoria: "Promociones y descuentos" },
  { emoji: "⭐", label: "Destacado", categoria: "Promociones y descuentos" },
  { emoji: "🎁", label: "Regalo", categoria: "Promociones y descuentos" },
  { emoji: "💎", label: "Premium", categoria: "Promociones y descuentos" },
  { emoji: "💸", label: "Ahorro", categoria: "Promociones y descuentos" },
  { emoji: "🎉", label: "Promoción", categoria: "Promociones y descuentos" },

  // Campañas y fechas especiales
  { emoji: "🎃", label: "Halloween", categoria: "Campañas y fechas especiales" },
  { emoji: "🎄", label: "Navidad", categoria: "Campañas y fechas especiales" },
  { emoji: "🎅", label: "Campaña navideña", categoria: "Campañas y fechas especiales" },
  { emoji: "❤️", label: "Especial", categoria: "Campañas y fechas especiales" },
];

/**
 * Formatea el nombre de la etiqueta con su emoji decorativo evitando duplicaciones
 */
export function formatBadgeWithEmoji(nombre: string, emoji?: string | null): string {
  const cleanNombre = (nombre || "").trim();
  if (!cleanNombre) return "";
  if (!emoji || !emoji.trim()) return cleanNombre;

  const cleanEmoji = emoji.trim();
  if (cleanNombre.startsWith(cleanEmoji)) return cleanNombre;

  // Si el texto ya empieza con algún emoji gráfico, no duplicar
  const leadingEmojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation})/u;
  if (leadingEmojiRegex.test(cleanNombre)) return cleanNombre;

  return `${cleanEmoji} ${cleanNombre}`;
}
