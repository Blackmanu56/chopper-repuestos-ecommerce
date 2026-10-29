/**
 * Módulo de parseo, normalización y resolución de compatibilidades de motocicletas
 * para repuestos individuales y combos del e-commerce.
 */

export interface MotoDetalle {
  original: string;
  canonico: string;
  marca: string;
  modelo: string;
  cilindrada?: string;
  version?: string;
  anios?: string;
  colorBadge: {
    bg: string;
    text: string;
    border: string;
  };
}

export const BRAND_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  honda: {
    bg: "bg-red-500/10 dark:bg-red-950/30",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/30",
  },
  yamaha: {
    bg: "bg-blue-500/10 dark:bg-blue-950/30",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
  },
  bajaj: {
    bg: "bg-indigo-500/10 dark:bg-indigo-950/30",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/30",
  },
  gilera: {
    bg: "bg-orange-500/10 dark:bg-orange-950/30",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-500/30",
  },
  corven: {
    bg: "bg-emerald-500/10 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/30",
  },
  motomel: {
    bg: "bg-sky-500/10 dark:bg-sky-950/30",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500/30",
  },
  zanella: {
    bg: "bg-amber-500/10 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-500/30",
  },
  suzuki: {
    bg: "bg-blue-600/10 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-600/30",
  },
  kawasaki: {
    bg: "bg-green-600/10 dark:bg-green-950/30",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-600/30",
  },
  mondial: {
    bg: "bg-purple-500/10 dark:bg-purple-950/30",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/30",
  },
  guerrero: {
    bg: "bg-rose-500/10 dark:bg-rose-950/30",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/30",
  },
};

const DEFAULT_BRAND_STYLE = {
  bg: "bg-slate-500/10 dark:bg-slate-800/40",
  text: "text-slate-700 dark:text-slate-300",
  border: "border-slate-300 dark:border-slate-700",
};

export const KNOWN_BRANDS = [
  "Honda",
  "Yamaha",
  "Bajaj",
  "Motomel",
  "Gilera",
  "Corven",
  "Zanella",
  "Suzuki",
  "Kawasaki",
  "Mondial",
  "Guerrero",
  "BMW",
  "KTM",
  "Benelli",
  "Hero",
];

/**
 * Diccionario y normalizador canónico para asegurar consistencia
 * (ej: "CG Titan 150" o "CG 150 Titan" -> "Honda CG 150 Titan")
 */
export const NORM_MAP: Record<string, string> = {
  // Honda
  "cg titan 150": "Honda CG 150 Titan",
  "cg 150 titan": "Honda CG 150 Titan",
  "honda cg titan 150": "Honda CG 150 Titan",
  "honda cg titan": "Honda CG 150 Titan",
  "titan 150": "Honda CG 150 Titan",
  "cg 150": "Honda CG 150 Titan",
  "cg 150 fan": "Honda CG 150 Fan",
  "wave 110": "Honda Wave 110",
  "wave 110s": "Honda Wave 110",
  "honda wave": "Honda Wave 110",
  "xr 150": "Honda XR 150L",
  "xr 150l": "Honda XR 150L",
  "honda xr 150": "Honda XR 150L",
  "xr 250": "Honda XR 250 Tornado",
  "xr 250 tornado": "Honda XR 250 Tornado",
  "tornado 250": "Honda XR 250 Tornado",
  "honda tornado": "Honda XR 250 Tornado",
  "cb 250": "Honda CB 250 Twister",
  "cb 250 twister": "Honda CB 250 Twister",
  "twister 250": "Honda CB 250 Twister",
  "cbx 250": "Honda CB 250 Twister",
  "cb 190": "Honda CB 190R",
  "cb 190r": "Honda CB 190R",
  "biz 125": "Honda Biz 125",
  "cb1 125": "Honda CB1 125",
  "cb 1 125": "Honda CB1 125",
  "glh 150": "Honda GLH 150 Gaucha",
  "glh 150 gaucha": "Honda GLH 150 Gaucha",
  "pcx 150": "Honda PCX 150",

  // Yamaha
  "ybr 125": "Yamaha YBR 125",
  "ybr 125 ed": "Yamaha YBR 125 ED",
  "ybr 125 esd": "Yamaha YBR 125 ED",
  "fz 16": "Yamaha FZ 16",
  "fz16": "Yamaha FZ 16",
  "fz fi": "Yamaha FZ-FI 2.0",
  "fz fi 2.0": "Yamaha FZ-FI 2.0",
  "fz-fi": "Yamaha FZ-FI 2.0",
  "fz-fi 2.0": "Yamaha FZ-FI 2.0",
  "fz 2.0": "Yamaha FZ-FI 2.0",
  "fz 25": "Yamaha FZ 25",
  "xtz 125": "Yamaha XTZ 125",
  "xtz 250": "Yamaha XTZ 250 Lander",
  "xtz 250 lander": "Yamaha XTZ 250 Lander",
  "lander 250": "Yamaha XTZ 250 Lander",
  "crypton 110": "Yamaha Crypton 110",

  // Bajaj
  "rouser ns 200": "Bajaj Rouser NS 200",
  "ns 200": "Bajaj Rouser NS 200",
  "ns200": "Bajaj Rouser NS 200",
  "rouser 200": "Bajaj Rouser NS 200",
  "rouser ns 160": "Bajaj Rouser NS 160",
  "ns 160": "Bajaj Rouser NS 160",
  "rouser 135": "Bajaj Rouser 135 LS",
  "rouser 135 ls": "Bajaj Rouser 135 LS",
  "135 ls": "Bajaj Rouser 135 LS",
  "dominar 400": "Bajaj Dominar 400",
  "boxer 150": "Bajaj Boxer 150",

  // Gilera
  "smash 110": "Gilera Smash 110",
  "smash": "Gilera Smash 110",
  "vc 150": "Gilera VC 150",
  "sahel 150": "Gilera Sahel 150",

  // Corven
  "energy 110": "Corven Energy 110",
  "triax 150": "Corven Triax 150",
  "triax 250": "Corven Triax 250",
  "hunter 150": "Corven Hunter 150",

  // Motomel
  "s2 150": "Motomel S2 150",
  "motomel s2": "Motomel S2 150",
  "skua 150": "Motomel Skua 150",
  "blitz 110": "Motomel Blitz 110",
  "sirius 150": "Motomel Sirius 150",

  // Zanella
  "zb 110": "Zanella ZB 110",
  "rx 150": "Zanella RX 150",
  "sapucai 150": "Zanella Sapucai 150",
  "zr 150": "Zanella ZR 150",

  // Suzuki
  "gn 125": "Suzuki GN 125",
  "en 125": "Suzuki EN 125",
  "ax 100": "Suzuki AX 100",
  "gixxer 150": "Suzuki Gixxer 150",

  // Kawasaki
  "ninja 300": "Kawasaki Ninja 300",
  "ninja 400": "Kawasaki Ninja 400",
};

/**
 * Normaliza nombres informales de motos a su forma oficial unificada
 */
export function normalizarNombreMoto(raw: string): string {
  const clean = (raw || "").trim();
  if (!clean) return "";

  const lower = clean.toLowerCase();
  if (NORM_MAP[lower]) {
    return NORM_MAP[lower];
  }

  for (const [key, val] of Object.entries(NORM_MAP)) {
    if (lower === val.toLowerCase() || lower === key) {
      return val;
    }
  }

  if (lower.includes("cg") && lower.includes("150") && lower.includes("titan")) {
    return "Honda CG 150 Titan";
  }
  if (lower.includes("wave") && lower.includes("110")) {
    return "Honda Wave 110";
  }
  if (lower.includes("ybr") && lower.includes("125")) {
    return lower.includes("ed") ? "Yamaha YBR 125 ED" : "Yamaha YBR 125";
  }
  if (lower.includes("fz") && (lower.includes("16") || lower.includes("fz16"))) {
    return "Yamaha FZ 16";
  }
  if (lower.includes("fz") && (lower.includes("fi") || lower.includes("2.0"))) {
    return "Yamaha FZ-FI 2.0";
  }
  if (lower.includes("rouser") && (lower.includes("200") || lower.includes("ns200") || lower.includes("ns 200"))) {
    return "Bajaj Rouser NS 200";
  }
  if (lower.includes("tornado") || (lower.includes("xr") && lower.includes("250"))) {
    return "Honda XR 250 Tornado";
  }
  if (lower.includes("twister") || (lower.includes("cb") && lower.includes("250"))) {
    return "Honda CB 250 Twister";
  }

  return clean;
}

/**
 * Desglosa una cadena de moto en sus partes constitutivas:
 * marca, modelo base, cilindrada y versión, evitando duplicaciones.
 */
export function parseMotoDetalle(rawMoto: string): MotoDetalle {
  const canonico = normalizarNombreMoto(rawMoto);
  const clean = canonico || (rawMoto || "").trim();
  if (!clean) {
    return {
      original: "",
      canonico: "",
      marca: "Moto",
      modelo: "Modelo no especificado",
      colorBadge: DEFAULT_BRAND_STYLE,
    };
  }

  let marca = "Otra marca";
  let rest = clean;

  for (const b of KNOWN_BRANDS) {
    if (clean.toLowerCase().startsWith(b.toLowerCase())) {
      marca = b;
      rest = clean.slice(b.length).trim();
      break;
    }
  }

  if (marca === "Otra marca") {
    for (const b of KNOWN_BRANDS) {
      const reg = new RegExp(`\\b${b}\\b`, "i");
      if (reg.test(clean)) {
        marca = b;
        rest = clean.replace(reg, "").replace(/\s+/g, " ").trim();
        break;
      }
    }
  }

  // 1. Detectar rango de años
  let anios: string | undefined;
  const anioMatch =
    rest.match(/\((?:año|años|mod\.?|modelos?)?\s*([12]\d{3}(?:\s*[-–/a]\s*(?:[12]\d{3}|\+))?)\)/i) ||
    rest.match(/\b([12]\d{3}\s*[-–/a]\s*(?:[12]\d{3}|\+))\b/);
  if (anioMatch) {
    anios = anioMatch[1].trim();
    rest = rest.replace(anioMatch[0], "").trim();
  }

  // 2. Detectar cilindrada
  let cilindrada: string | undefined;
  const explicitCc = rest.match(/\b(\d{2,4})\s*(?:cc|c\.c\.)\b/i) || clean.match(/\b(\d{2,4})\s*(?:cc|c\.c\.)\b/i);
  if (explicitCc) {
    cilindrada = `${explicitCc[1]} cc`;
    rest = rest.replace(explicitCc[0], "").trim();
  } else {
    const ccMatch = rest.match(/\b(50|70|90|100|110|125|135|150|160|180|190|200|220|250|300|350|390|400|450|500|600|650|700|750|800|900|1000|1200)\b/);
    if (ccMatch) {
      cilindrada = `${ccMatch[1]} cc`;
      rest = rest.replace(ccMatch[0], "").trim();
    }
  }

  // 3. Detectar versiones y acabados característicos
  let version: string | undefined;
  const versionPatterns = [
    /\b(Titan|Fan|ESD|ED|Lander|Tornado|Twister|Gaucha|Storm|Elite|ZR|S2|Skua|Sirius|Smash|Triax|Energy|Hunter|ZB|RX|AX|GN|EN|Gixxer|Boxer|Dominar|135\s*LS|NS\s*200|NS\s*160|NS|FI\s*2\.0|FI|Adventure|Tuning)\b/i,
  ];
  for (const vp of versionPatterns) {
    const vMatch = rest.match(vp);
    if (vMatch) {
      version = vMatch[1].trim();
      rest = rest.replace(vMatch[0], "").trim();
      break;
    }
  }

  // Modelo principal: extraer nombre limpio sin repetir marca, cc ni versión
  let modelo = rest.replace(/\s+/g, " ").trim();
  if (!modelo && version) {
    modelo = version;
    version = undefined;
  }
  if (!modelo) {
    modelo = clean;
  }

  const brandKey = marca.toLowerCase();
  const colorBadge = BRAND_STYLES[brandKey] || DEFAULT_BRAND_STYLE;

  return {
    original: clean,
    canonico,
    marca,
    modelo,
    cilindrada,
    version,
    anios,
    colorBadge,
  };
}

/**
 * Patrones de compatibilidad verificada según denominación comercial oficial del repuesto
 */
interface ModeloInferido {
  regex: RegExp;
  motos: string[];
}

const REGLAS_INFERENCIA_PRODUCTOS: ModeloInferido[] = [
  // Honda
  { regex: /\b(?:cg\s*150|titan\s*150)\b/i, motos: ["Honda CG 150 Titan"] },
  { regex: /\b(?:wave\s*110|wave\s*110s)\b/i, motos: ["Honda Wave 110"] },
  { regex: /\b(?:tornado\s*250|xr\s*250)\b/i, motos: ["Honda XR 250 Tornado"] },
  { regex: /\b(?:twister\s*250|cb\s*250|cbx\s*250)\b/i, motos: ["Honda CB 250 Twister"] },
  { regex: /\b(?:xr\s*150|xr\s*150l)\b/i, motos: ["Honda XR 150L"] },
  { regex: /\b(?:cb\s*190|cb\s*190r)\b/i, motos: ["Honda CB 190R"] },
  { regex: /\b(?:biz\s*125)\b/i, motos: ["Honda Biz 125"] },
  { regex: /\b(?:cb1\s*125|cb\s*1\s*125)\b/i, motos: ["Honda CB1 125"] },
  { regex: /\b(?:pcx\s*150)\b/i, motos: ["Honda PCX 150"] },
  { regex: /\b(?:glh\s*150|gaucha)\b/i, motos: ["Honda GLH 150 Gaucha"] },

  // Yamaha
  { regex: /\b(?:ybr\s*125)\b/i, motos: ["Yamaha YBR 125", "Yamaha YBR 125 ED"] },
  { regex: /\b(?:fz\s*16|fz16)\b/i, motos: ["Yamaha FZ 16", "Yamaha FZ-FI 2.0"] },
  { regex: /\b(?:fz\s*fi|fz\s*2\.0)\b/i, motos: ["Yamaha FZ-FI 2.0"] },
  { regex: /\b(?:fz\s*25)\b/i, motos: ["Yamaha FZ 25"] },
  { regex: /\b(?:crypton\s*110)\b/i, motos: ["Yamaha Crypton 110"] },
  { regex: /\b(?:xtz\s*125)\b/i, motos: ["Yamaha XTZ 125"] },
  { regex: /\b(?:xtz\s*250|lander)\b/i, motos: ["Yamaha XTZ 250 Lander"] },

  // Bajaj
  { regex: /\b(?:rouser\s*ns\s*200|ns\s*200|ns200)\b/i, motos: ["Bajaj Rouser NS 200"] },
  { regex: /\b(?:rouser\s*ns\s*160|ns\s*160)\b/i, motos: ["Bajaj Rouser NS 160"] },
  { regex: /\b(?:rouser\s*135|135\s*ls)\b/i, motos: ["Bajaj Rouser 135 LS"] },
  { regex: /\b(?:dominar\s*400)\b/i, motos: ["Bajaj Dominar 400"] },
  { regex: /\b(?:boxer\s*150)\b/i, motos: ["Bajaj Boxer 150"] },

  // Gilera
  { regex: /\b(?:smash\s*110|smash)\b/i, motos: ["Gilera Smash 110"] },
  { regex: /\b(?:vc\s*150)\b/i, motos: ["Gilera VC 150"] },
  { regex: /\b(?:sahel\s*150)\b/i, motos: ["Gilera Sahel 150"] },

  // Corven
  { regex: /\b(?:energy\s*110)\b/i, motos: ["Corven Energy 110"] },
  { regex: /\b(?:triax\s*150)\b/i, motos: ["Corven Triax 150"] },
  { regex: /\b(?:triax\s*250)\b/i, motos: ["Corven Triax 250"] },
  { regex: /\b(?:hunter\s*150)\b/i, motos: ["Corven Hunter 150"] },

  // Motomel
  { regex: /\b(?:s2\s*150|motomel\s*s2)\b/i, motos: ["Motomel S2 150"] },
  { regex: /\b(?:skua\s*150)\b/i, motos: ["Motomel Skua 150"] },
  { regex: /\b(?:blitz\s*110)\b/i, motos: ["Motomel Blitz 110"] },
  { regex: /\b(?:sirius\s*150)\b/i, motos: ["Motomel Sirius 150"] },

  // Zanella
  { regex: /\b(?:zb\s*110)\b/i, motos: ["Zanella ZB 110"] },
  { regex: /\b(?:rx\s*150)\b/i, motos: ["Zanella RX 150"] },
  { regex: /\b(?:sapucai\s*150)\b/i, motos: ["Zanella Sapucai 150"] },
  { regex: /\b(?:zr\s*150|zr\s*250)\b/i, motos: ["Zanella ZR 150"] },

  // Suzuki
  { regex: /\b(?:gn\s*125)\b/i, motos: ["Suzuki GN 125"] },
  { regex: /\b(?:en\s*125)\b/i, motos: ["Suzuki EN 125"] },
  { regex: /\b(?:ax\s*100)\b/i, motos: ["Suzuki AX 100"] },
  { regex: /\b(?:gixxer\s*150)\b/i, motos: ["Suzuki Gixxer 150"] },

  // Kawasaki
  { regex: /\b(?:ninja\s*300|ninja\s*400)\b/i, motos: ["Kawasaki Ninja 300", "Kawasaki Ninja 400"] },
];

const PALABRAS_CLAVE_UNIVERSAL = [
  "universal",
  "universales",
  "aceite motul",
  "aceite castrol",
  "aceite yamalube",
  "aceite honda hgo",
  "fork oil",
  "líquido de frenos",
  "liquido de frenos",
  "motocool",
  "refrigerante",
  "anticongelante",
  "chain lube",
  "chain clean",
  "antipinchadura",
  "silicona",
  "carnauba",
  "desengrasante",
  "casco integral",
  "casco abierto",
  "guantes de moto",
  "traje de lluvia",
  "antiparras",
  "saca bujía",
  "extractor de volante",
  "corta cadena",
  "calibrador de válvulas",
  "lámpara led h4",
  "lampara led h4",
  "lámpara halógena h4",
  "foco led auxiliar",
  "ojo de ángel",
  "ojo de angel",
  "tira led flexible",
  "destellador electrónico",
  "flasher",
  "tapa de radiador",
  "funda de asiento térmica",
  "baúl / top case",
  "baul / top case",
  "soporte celular",
  "traba disco",
  "puños de goma",
  "manubrio deportivo",
  "cinta térmica",
  "cinta termica",
];

/**
 * Resuelve las compatibilidades reales de un producto analizando:
 * 1. Metadata explícita guardada en base de datos.
 * 2. Si no tiene metadata registrada, analiza la denominación comercial y código
 *    para recuperar la asociación oficial sin inventar modelos ajenos.
 */
export function resolverCompatibilidadProducto(item: {
  nombre: string;
  categoriaNombre?: string;
  motosCompatibles?: string[];
  universal?: boolean;
}): {
  motos: string[];
  universal: boolean;
} {
  // 1. Si ya tiene datos explícitos de base de datos, respetarlos estrictamente
  if (item.universal) {
    return {
      universal: true,
      motos: item.motosCompatibles || [],
    };
  }

  if (item.motosCompatibles && item.motosCompatibles.length > 0) {
    return {
      universal: false,
      motos: item.motosCompatibles,
    };
  }

  const nombreLower = (item.nombre || "").toLowerCase();
  const catLower = (item.categoriaNombre || "").toLowerCase();

  // 2. Verificar si es de aplicación universal por categoría o insumo evidente
  const esUniversalInsumo =
    catLower.includes("lubricante") ||
    catLower.includes("herramienta") ||
    catLower.includes("indumentaria") ||
    catLower.includes("casco") ||
    catLower.includes("limpieza") ||
    PALABRAS_CLAVE_UNIVERSAL.some((kw) => nombreLower.includes(kw));

  if (esUniversalInsumo) {
    return {
      universal: true,
      motos: [],
    };
  }

  // 3. Verificar si el nombre hace referencia unívoca a modelos de motocicletas
  const motosEncontradas: string[] = [];
  for (const regla of REGLAS_INFERENCIA_PRODUCTOS) {
    if (regla.regex.test(nombreLower)) {
      for (const m of regla.motos) {
        if (!motosEncontradas.includes(m)) {
          motosEncontradas.push(m);
        }
      }
    }
  }

  if (motosEncontradas.length > 0) {
    return {
      universal: false,
      motos: motosEncontradas,
    };
  }

  // 4. Si no se puede verificar inequívocamente, se mantiene como no especificada
  return {
    universal: false,
    motos: [],
  };
}

/**
 * Resuelve la compatibilidad técnica de un combo evaluando:
 * 1. Motos declaradas directamente para el combo (si las hay).
 * 2. Intersección de modelos de los componentes individuales (sin asumir falsas compatibilidades).
 * 3. Desglose específico por componente para kits con aplicaciones diversas.
 */
export function resolverCompatibilidadCombo(combo: {
  motosCompatibles?: string[];
  componentesMotos?: Array<{
    productoId: number;
    productoNombre: string;
    cantidad: number;
    motos: string[];
  }>;
}): {
  tipo: "UNIFICADO" | "MULTI_COMPONENTE" | "NO_ESPECIFICADO";
  motosKit: string[];
  motosPorComponente: Array<{
    productoId: number;
    productoNombre: string;
    cantidad: number;
    motos: string[];
  }>;
} {
  const ownMotos = combo.motosCompatibles || [];
  const compMotos = (combo.componentesMotos || []).filter((c) => c.motos && c.motos.length > 0);

  // Caso 1: Compatibilidad unificada guardada explícitamente en el combo
  if (ownMotos.length > 0) {
    return {
      tipo: "UNIFICADO",
      motosKit: ownMotos,
      motosPorComponente: compMotos,
    };
  }

  // Caso 2: Analizar componentes para ver si todos comparten el mismo modelo (intersección)
  if (compMotos.length > 0) {
    // Tomamos las motos del primer componente específico
    let comunes = [...compMotos[0].motos];

    // Intersectar con los demás componentes específicos
    for (let i = 1; i < compMotos.length; i++) {
      const setB = new Set(compMotos[i].motos.map((m) => m.toLowerCase().trim()));
      comunes = comunes.filter((m) => setB.has(m.toLowerCase().trim()));
    }

    if (comunes.length > 0) {
      return {
        tipo: "UNIFICADO",
        motosKit: comunes,
        motosPorComponente: compMotos,
      };
    }

    // Si los componentes tienen motos pero son incompatibles entre sí (ej: freno NS200 + freno YBR)
    return {
      tipo: "MULTI_COMPONENTE",
      motosKit: [],
      motosPorComponente: compMotos,
    };
  }

  // Caso 3: Ningún componente ni el combo tienen motos asociadas
  return {
    tipo: "NO_ESPECIFICADO",
    motosKit: [],
    motosPorComponente: [],
  };
}
