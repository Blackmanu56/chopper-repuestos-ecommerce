/**
 * Módulo de validación, formateo y detección de tarjetas de crédito y débito
 * para el modo de simulación de pago en Chopper Repuestos.
 *
 * Cumple con:
 * - Algoritmo de Luhn (módulo 10)
 * - Detección de marcas: Visa, Mastercard, American Express, Tarjeta Naranja, Cabal, Diners
 * - Formato dinámico según marca (4-4-4-4 para Visa/Mastercard, 4-6-5 para Amex, etc.)
 * - Validación de vencimiento (mes 01-12, no vencida)
 * - Validación de CVV (3 dígitos o 4 para Amex)
 * - Cero almacenamiento de CVV ni PAN completo
 */

export interface MarcaTarjeta {
  id: "visa" | "mastercard" | "amex" | "naranja" | "cabal" | "diners" | "generica";
  nombre: string;
  longitudes: number[];
  maxDigitos: number;
  cvvLength: number;
  placeholder: string;
  colorBadge: string;
  iconoText: string;
}

export const MARCAS_TARJETA: Record<string, MarcaTarjeta> = {
  visa: {
    id: "visa",
    nombre: "Visa",
    longitudes: [16, 13, 19],
    maxDigitos: 16,
    cvvLength: 3,
    placeholder: "•••• •••• •••• ••••",
    colorBadge: "bg-[#1a1f71] text-white border-blue-900",
    iconoText: "VISA",
  },
  mastercard: {
    id: "mastercard",
    nombre: "Mastercard",
    longitudes: [16],
    maxDigitos: 16,
    cvvLength: 3,
    placeholder: "•••• •••• •••• ••••",
    colorBadge: "bg-[#eb001b] text-white border-red-700",
    iconoText: "MC",
  },
  amex: {
    id: "amex",
    nombre: "American Express",
    longitudes: [15],
    maxDigitos: 15,
    cvvLength: 4,
    placeholder: "•••• •••••• •••••",
    colorBadge: "bg-[#007bc1] text-white border-sky-800",
    iconoText: "AMEX",
  },
  naranja: {
    id: "naranja",
    nombre: "Tarjeta Naranja",
    longitudes: [16],
    maxDigitos: 16,
    cvvLength: 3,
    placeholder: "•••• •••• •••• ••••",
    colorBadge: "bg-[#ff6600] text-white border-orange-700",
    iconoText: "NARANJA",
  },
  cabal: {
    id: "cabal",
    nombre: "Cabal",
    longitudes: [16],
    maxDigitos: 16,
    cvvLength: 3,
    placeholder: "•••• •••• •••• ••••",
    colorBadge: "bg-[#b91c1c] text-white border-red-900",
    iconoText: "CABAL",
  },
  diners: {
    id: "diners",
    nombre: "Diners Club",
    longitudes: [14, 16],
    maxDigitos: 14,
    cvvLength: 3,
    placeholder: "•••• •••••• ••••",
    colorBadge: "bg-[#004a97] text-white border-blue-950",
    iconoText: "DINERS",
  },
  generica: {
    id: "generica",
    nombre: "Tarjeta",
    longitudes: [16],
    maxDigitos: 16,
    cvvLength: 3,
    placeholder: "•••• •••• •••• ••••",
    colorBadge: "bg-slate-700 text-white border-slate-600",
    iconoText: "CARD",
  },
};

/**
 * Detecta la marca de la tarjeta según los primeros dígitos (BIN).
 */
export function detectarMarcaTarjeta(rawNumber: string): MarcaTarjeta {
  const digits = rawNumber.replace(/\D/g, "");

  if (!digits) return MARCAS_TARJETA.generica;

  // Tarjeta Naranja (BINs frecuentes en Argentina: 589562, 5895, 4029)
  if (/^(589562|5895|4029)/.test(digits)) {
    return MARCAS_TARJETA.naranja;
  }

  // Cabal (BINs frecuentes: 6042, 6043, 5896, 5041)
  if (/^(6042|6043|5896|5041)/.test(digits)) {
    return MARCAS_TARJETA.cabal;
  }

  // American Express (empieza con 34 o 37)
  if (/^3[47]/.test(digits)) {
    return MARCAS_TARJETA.amex;
  }

  // Visa (empieza con 4)
  if (/^4/.test(digits)) {
    return MARCAS_TARJETA.visa;
  }

  // Mastercard (51-55 o 2221-2720)
  if (/^(5[1-5]|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)/.test(digits)) {
    return MARCAS_TARJETA.mastercard;
  }

  // Diners Club (300-305, 36, 38)
  if (/^(30[0-5]|36|38)/.test(digits)) {
    return MARCAS_TARJETA.diners;
  }

  return MARCAS_TARJETA.generica;
}

/**
 * Aplica el algoritmo de Luhn (módulo 10) para verificar integridad de numeración.
 */
export function validarLuhn(rawNumber: string): boolean {
  const digits = rawNumber.replace(/\D/g, "");
  if (!digits || digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (isNaN(digit)) return false;

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

/**
 * Formatea el número de tarjeta según la marca (espaciado dinámico).
 */
export function formatearNumeroTarjeta(rawNumber: string): string {
  const digits = rawNumber.replace(/\D/g, "");
  const marca = detectarMarcaTarjeta(digits);
  const truncated = digits.slice(0, marca.maxDigitos);

  if (marca.id === "amex") {
    // Formato 4-6-5
    const p1 = truncated.slice(0, 4);
    const p2 = truncated.slice(4, 10);
    const p3 = truncated.slice(10, 15);
    const parts = [p1, p2, p3].filter((p) => p.length > 0);
    return parts.join(" ");
  }

  if (marca.id === "diners" && marca.maxDigitos === 14) {
    // Formato 4-6-4
    const p1 = truncated.slice(0, 4);
    const p2 = truncated.slice(4, 10);
    const p3 = truncated.slice(10, 14);
    const parts = [p1, p2, p3].filter((p) => p.length > 0);
    return parts.join(" ");
  }

  // Formato estándar en bloques de 4 dígitos
  const chunks = truncated.match(/.{1,4}/g);
  return chunks ? chunks.join(" ") : truncated;
}

/**
 * Valida el número de tarjeta (longitud y formato según marca, sin algoritmo de Luhn por ser simulación de tesis).
 * Admite tarjetas ficticias con dígitos repetidos siempre que cumplan con la longitud válida de la marca.
 */
export function validarNumeroTarjeta(rawNumber: string): {
  valido: boolean;
  marca: MarcaTarjeta;
  error?: string;
} {
  const digits = rawNumber.replace(/\D/g, "");
  const marca = detectarMarcaTarjeta(digits);

  if (!digits) {
    return { valido: false, marca, error: "Ingresá el número de tarjeta." };
  }

  const minDigitos = Math.min(...marca.longitudes);

  if (digits.length < minDigitos) {
    return { valido: false, marca, error: "Ingresá un número de tarjeta completo." };
  }

  if (digits.length > marca.maxDigitos) {
    return {
      valido: false,
      marca,
      error: `El número supera el límite permitido (${marca.maxDigitos} dígitos para ${marca.nombre}).`,
    };
  }

  if (!marca.longitudes.includes(digits.length)) {
    return {
      valido: false,
      marca,
      error: "Ingresá un número de tarjeta completo.",
    };
  }

  return { valido: true, marca };
}

/**
 * Formatea automáticamente el vencimiento como MM/AA.
 */
export function formatearVencimiento(raw: string, prevValue?: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (!digits) return "";

  // Si el usuario está borrando y teníamos '/', permitir volver al primer dígito
  if (prevValue && prevValue.endsWith("/") && raw.length < prevValue.length) {
    return digits.slice(0, 1);
  }

  if (digits.length === 1) {
    // Si escribe un mes mayor a 1 directamente (ej: 2 a 9), prefijar con 0
    const num = parseInt(digits, 10);
    if (num >= 2 && num <= 9) {
      return `0${digits}/`;
    }
    return digits;
  }

  if (digits.length >= 2) {
    const mm = digits.slice(0, 2);
    const aa = digits.slice(2, 4);
    if (digits.length === 2) {
      return `${mm}/`;
    }
    return `${mm}/${aa}`;
  }

  return digits;
}

/**
 * Valida la fecha de vencimiento contra la fecha actual y rango de meses.
 */
export function validarVencimiento(
  raw: string,
  currentDate: Date = new Date()
): { valido: boolean; error?: string } {
  const clean = raw.trim();
  if (!clean) {
    return { valido: false, error: "Ingresá la fecha de vencimiento." };
  }

  const match = clean.match(/^(\d{1,2})\/(\d{2})$/);
  if (!match) {
    return { valido: false, error: "El formato debe ser MM/AA (ej: 12/28)." };
  }

  const month = parseInt(match[1], 10);
  const yearShort = parseInt(match[2], 10);
  const year = 2000 + yearShort;

  if (month < 1 || month > 12) {
    return { valido: false, error: "El mes debe estar entre 01 y 12." };
  }

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return { valido: false, error: "La tarjeta se encuentra vencida." };
  }

  if (year > currentYear + 25) {
    return { valido: false, error: "El año de vencimiento excede el límite permitido." };
  }

  return { valido: true };
}

/**
 * Valida el código de seguridad (CVV / CVC / CID).
 * Admite pasar el ID de la marca (ej: "amex") o directamente la longitud esperada (3 o 4).
 */
export function validarCvv(
  raw: string,
  marcaOrLength?: string | number
): { valido: boolean; error?: string } {
  const digits = raw.replace(/\D/g, "");
  const expectedLength =
    typeof marcaOrLength === "number"
      ? marcaOrLength
      : marcaOrLength === "amex"
      ? 4
      : 3;

  if (!digits) {
    return { valido: false, error: "Ingresá el código de seguridad." };
  }

  if (digits.length !== expectedLength) {
    return {
      valido: false,
      error: `El código debe tener exactamente ${expectedLength} dígitos${expectedLength === 4 ? " (frente de Amex)" : ""}.`,
    };
  }

  return { valido: true };
}

/**
 * Valida el titular de la tarjeta.
 */
export function validarTitular(raw: string): { valido: boolean; error?: string } {
  const clean = raw.trim();
  if (!clean) {
    return { valido: false, error: "Ingresá el nombre y apellido del titular como figura en el plástico." };
  }

  if (clean.length < 3) {
    return { valido: false, error: "El nombre del titular debe tener al menos 3 caracteres." };
  }

  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(clean)) {
    return { valido: false, error: "El nombre solo puede contener letras y espacios." };
  }

  return { valido: true };
}

/**
 * Genera la máscara segura de número de tarjeta para notas de auditoría.
 * Ejemplo: "Visa **** 4242"
 */
export function enmascararNumeroTarjeta(rawNumber: string): string {
  const digits = rawNumber.replace(/\D/g, "");
  const marca = detectarMarcaTarjeta(digits);
  const last4 = digits.length >= 4 ? digits.slice(-4) : "••••";
  return `${marca.nombre} **** ${last4}`;
}
