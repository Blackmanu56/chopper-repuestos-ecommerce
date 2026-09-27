export interface ComboItem {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  precioOriginal: number;
  ahorro: number;
  imagen: string;
  badge: string;
  marca: string;
  codigo: string;
  stock: number;
}

export const COMBOS_CATEGORY_ID = 9999;
export const COMBOS_CATEGORY_NAME = "Combos Armados";

export const COMBOS_DATA: ComboItem[] = [
  {
    id: 9001,
    nombre: "Combo Service 4T: Aceite Motul 5100 + Filtro K&N + Bujía NGK",
    descripcion: "Kit completo de mantenimiento para motores 4T 125cc a 250cc.",
    precio: 28900,
    precioOriginal: 34500,
    ahorro: 5600,
    imagen: "/combos/combo-service-motul.jpg",
    badge: "Mes de la Primavera",
    marca: "Motul / K&N / NGK",
    codigo: "CMB-SRV-4T",
    stock: 12,
  },
  {
    id: 9002,
    nombre: "Combo Rodado Urbano: Cubierta Pirelli + Cámara Rinaldi + Válvula",
    descripcion: "Máximo agarre y durabilidad en asfalto con cámara reforzada.",
    precio: 118500,
    precioOriginal: 139900,
    ahorro: 21400,
    imagen: "/combos/combo-rodado-pirelli.jpg",
    badge: "Mes de la Primavera",
    marca: "Pirelli / Rinaldi",
    codigo: "CMB-ROD-URB",
    stock: 8,
  },
  {
    id: 9003,
    nombre: "Combo Transmisión Reforzada: Cadena DID Dorada + Corona + Piñón",
    descripcion: "Transmisión de alta resistencia para uso diario o viajes largos.",
    precio: 89900,
    precioOriginal: 106000,
    ahorro: 16100,
    imagen: "/combos/combo-transmision-did.jpg",
    badge: "Mes de la Primavera",
    marca: "DID / Chopper",
    codigo: "CMB-TRN-DID",
    stock: 15,
  },
];

export function getCombosAsProducts() {
  return COMBOS_DATA.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    marca: c.marca,
    categoriaId: COMBOS_CATEGORY_ID,
    categoriaNombre: COMBOS_CATEGORY_NAME,
    precio: c.precio,
    stock: c.stock,
    codigo: c.codigo,
    imagen: c.imagen,
    precioRegular: c.precioOriginal,
    enOferta: true,
    precioOferta: c.precio,
    descuentoPorcentaje: Math.round(((c.precioOriginal - c.precio) / c.precioOriginal) * 100),
    badgePromo: c.badge,
    destacado: true,
    recomendado: true,
    precioOriginal: c.precioOriginal,
    ahorro: c.ahorro,
    descripcion: c.descripcion,
    badge: c.badge,
    esCombo: true,
  }));
}
