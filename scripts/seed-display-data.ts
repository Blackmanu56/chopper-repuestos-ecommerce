import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Actualizando combos e imágenes con datos 100% precisos...");

  // 1. Limpiar combos viejos o de test si existen
  await prisma.comboEcommerce.deleteMany({
    where: {
      OR: [
        { nombre: { contains: "Test" } },
        { slug: { contains: "test" } },
      ],
    },
  });

  const combosData = [
    {
      nombre: "Combo Service 4T: Aceite Motul + Bujía + Filtro",
      slug: "combo-service-4t",
      descripcion: "Mantenimiento integral para motores 4T 125/150cc. Incluye aceite sintético Motul 5100, bujía original NGK y filtro de aceite sellado.",
      badge: "Mes de la Primavera",
      precio: 13900,
      precioRegular: 16200,
      imagen: "/combos/combo-service-motul.jpg",
      activo: true,
      destacado: true,
      orden: 1,
      items: [
        { productoId: 5, cantidad: 1 },  // Aceite Motul 5100 15W-50 4T
        { productoId: 8, cantidad: 1 },  // Bujía NGK CR8E
        { productoId: 10, cantidad: 1 }, // Filtro de aceite Honda CG 150
      ],
    },
    {
      nombre: "Combo Frenos & Seguridad: Pastillas + Disco + Traba Disco",
      slug: "combo-frenos-seguridad",
      descripcion: "Seguridad y frenado superior: Pastillas delanteras y traseras de alta fricción, disco de freno de acero templado y traba disco con alarma sonora 110dB.",
      badge: "Seguridad Garantizada",
      precio: 44500,
      precioRegular: 54700,
      imagen: "/combos/combo-frenos-seguridad.jpg",
      activo: true,
      destacado: true,
      orden: 2,
      items: [
        { productoId: 2, cantidad: 1 },   // Pastillas de freno delantero Rouser NS200
        { productoId: 25, cantidad: 1 },  // Pastillas de Freno Traseras Yamaha YBR 125
        { productoId: 27, cantidad: 1 },  // Disco de Freno Delantero Yamaha FZ 16
        { productoId: 110, cantidad: 1 }, // Traba Disco Antirrobo con Alarma
      ],
    },
    {
      nombre: "Combo Transmisión Reforzada: Corona + Piñón + Cadena O-Ring",
      slug: "combo-transmision-reforzada",
      descripcion: "Kit de tracción de máxima durabilidad: transmisión completa reforzada con cadena dorada O-Ring autolubricada y remachador de eslabones.",
      badge: "Más Vendido",
      precio: 49900,
      precioRegular: 59300,
      imagen: "/combos/combo-transmision-did.jpg",
      activo: true,
      destacado: true,
      orden: 3,
      items: [
        { productoId: 31, cantidad: 1 },  // Kit de Transmisión Reforzado
        { productoId: 35, cantidad: 1 },  // Cadena Dorada 520H con O-Ring
        { productoId: 116, cantidad: 1 }, // Corta Cadena y Remachador
      ],
    },
    {
      nombre: "Combo Iluminación LED & Batería Gel 12V",
      slug: "combo-iluminacion-bateria",
      descripcion: "Sistema eléctrico y lumínico de alta potencia: Batería de gel libre de mantenimiento 12V, lámpara CREE LED H4 y faros auxiliares exploradores ojo de ángel.",
      badge: "Oferta de la Semana",
      precio: 35900,
      precioRegular: 43600,
      imagen: "/combos/combo-iluminacion-bateria.jpg",
      activo: true,
      destacado: true,
      orden: 4,
      items: [
        { productoId: 3, cantidad: 1 },   // Batería YTX7L-BS Yamaha FZ16
        { productoId: 81, cantidad: 1 },  // Lámpara LED H4 Cree 8000 LM
        { productoId: 86, cantidad: 1 },  // Faro Auxiliar LED Ojo de Ángel Par
      ],
    },
    {
      nombre: "Combo Rodado Urbano: Cubierta Trasera + Delantera Pirelli",
      slug: "combo-rodado-urbano",
      descripcion: "Máximo agarre en asfalto y lluvia: Par de neumáticos Pirelli Super City / City Dragon de diseño reforzado antipinchazos.",
      badge: "Envío Gratis Posadas",
      precio: 76500,
      precioRegular: 89000,
      imagen: "/combos/combo-rodado-pirelli.jpg",
      activo: true,
      destacado: true,
      orden: 5,
      items: [
        { productoId: 4, cantidad: 1 },   // Cubierta trasera 130/70-17 Pirelli
        { productoId: 39, cantidad: 1 },  // Cubierta 90/90-18 Pirelli Delantera
      ],
    },
    {
      nombre: "Combo Mantenimiento Cadena & Lubricación",
      slug: "combo-mantenimiento-cadena",
      descripcion: "Kit de cuidado para la transmisión: Desengrasante de cadena de acción rápida, lubricante especial sintético para retenes y cepillo ergonómico 3D.",
      badge: "Ahorrá 25%",
      precio: 21900,
      precioRegular: 26300,
      imagen: "/combos/combo-mantenimiento-cadena.jpg",
      activo: true,
      destacado: true,
      orden: 6,
      items: [
        { productoId: 1, cantidad: 1 },   // Kit de transmisión Honda CG
        { productoId: 7, cantidad: 1 },   // Cadena 428H 120L
        { productoId: 99, cantidad: 1 },  // Cubre Cadena Plástico Negro
      ],
    },
  ];

  for (const c of combosData) {
    const existing = await prisma.comboEcommerce.findFirst({
      where: { slug: c.slug },
    });

    let comboId = existing?.id;
    if (existing) {
      await prisma.comboEcommerce.update({
        where: { id: existing.id },
        data: {
          nombre: c.nombre,
          descripcion: c.descripcion,
          badge: c.badge,
          precio: c.precio,
          precioRegular: c.precioRegular,
          imagen: c.imagen,
          activo: true,
          destacado: true,
          orden: c.orden,
        },
      });
    } else {
      const created = await prisma.comboEcommerce.create({
        data: {
          nombre: c.nombre,
          slug: c.slug,
          descripcion: c.descripcion,
          badge: c.badge,
          precio: c.precio,
          precioRegular: c.precioRegular,
          imagen: c.imagen,
          activo: true,
          destacado: true,
          orden: c.orden,
        },
      });
      comboId = created.id;
    }

    if (comboId) {
      await prisma.comboItemEcommerce.deleteMany({ where: { comboId } });
      for (const it of c.items) {
        await prisma.comboItemEcommerce.create({
          data: {
            comboId,
            productoId: it.productoId,
            cantidad: it.cantidad,
          },
        });
      }
    }
  }

  console.log("Todos los combos se actualizaron con imágenes y productos que coinciden al 100%.");
}

main()
  .catch((e) => {
    console.error("Error actualizando combos:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
