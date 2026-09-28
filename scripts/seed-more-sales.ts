import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as any);

async function main() {
  const productos = await prisma.producto.findMany({
    where: { activo: true, cantidad: { gt: 0 } },
    select: { id: true, precioVenta: true, nombre: true, marca: true },
    take: 5,
  });
  if (productos.length === 0) throw new Error("Sin productos activos con stock");

  const last = await prisma.pedidoEcommerce.findFirst({
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  let num = last ? Math.max(1050, last.numero + 1) : 1050;

  const ventasEjemplo = [
    {
      nombreCliente: "Martín Benítez",
      dniCliente: "36458921",
      emailCliente: "martin.benitez@ejemplo.com",
      telefonoCliente: "3764889901",
      modalidadEntrega: "RETIRO_LOCAL",
      estado: "PENDIENTE",
      metodoPago: "TRANSFERENCIA",
      comprobanteUrl: "https://placehold.co/400x600/0f172a/38bdf8?text=Comprobante+Transferencia+Martin",
      notas: "Transferencia bancaria pendiente de verificación por Ventas.",
      preparadorNombre: null,
      prod: productos[0],
      cant: 2,
    },
    {
      nombreCliente: "Camila Giménez",
      dniCliente: "40112344",
      emailCliente: "camila.gimenez@ejemplo.com",
      telefonoCliente: "3764998877",
      modalidadEntrega: "MOTOMANDADO",
      direccionEnvio: "Calle Félix de Azara 1820, Posadas",
      estado: "CONFIRMADO",
      metodoPago: "TARJETA",
      comprobanteUrl: null,
      notas: "Pago con tarjeta aprobado automáticamente. Listo para enviar a Stock.",
      preparadorNombre: null,
      prod: productos[1] || productos[0],
      cant: 1,
    },
    {
      nombreCliente: "Gonzalo Alarcón",
      dniCliente: "34998765",
      emailCliente: "gonzalo.alarcon@ejemplo.com",
      telefonoCliente: "3764123789",
      modalidadEntrega: "RETIRO_LOCAL",
      estado: "PREPARANDO",
      metodoPago: "TRANSFERENCIA",
      comprobanteUrl: "https://placehold.co/400x600/0f172a/38bdf8?text=Comprobante+Gonzalo",
      preparadorUsuarioId: 3,
      preparadorNombre: "María García",
      notas: "Ventas verificó el comprobante. María García está preparando el pedido en depósito.",
      prod: productos[2] || productos[0],
      cant: 1,
    },
    {
      nombreCliente: "Lucía Fernández",
      dniCliente: "39221845",
      emailCliente: "lucia.f@ejemplo.com",
      telefonoCliente: "3764654321",
      modalidadEntrega: "RETIRO_LOCAL",
      estado: "LISTO_PARA_RETIRAR",
      metodoPago: "EFECTIVO_LOCAL",
      preparadorUsuarioId: 3,
      preparadorNombre: "María García",
      notas: "Stock finalizó el armado. El paquete está en mesa de mostrador listo para entregar.",
      prod: productos[0],
      cant: 1,
    },
    {
      nombreCliente: "Esteban Morales",
      dniCliente: "32876543",
      emailCliente: "esteban.morales@ejemplo.com",
      telefonoCliente: "3764776655",
      modalidadEntrega: "MOTOMANDADO",
      direccionEnvio: "Av. Uruguay 2850, Posadas",
      estado: "LISTO_ENTREGA",
      metodoPago: "TARJETA",
      preparadorUsuarioId: 3,
      preparadorNombre: "María García",
      notas: "Paquete embalado y rotulado. Esperando asignación de chofer Moto Uber.",
      prod: productos[1] || productos[0],
      cant: 2,
    },
  ];

  console.log("Creando ventas de ejemplo para el flujo...");
  for (const v of ventasEjemplo) {
    const total = v.prod.precioVenta * v.cant;
    const created = await prisma.pedidoEcommerce.create({
      data: {
        numero: num++,
        clienteId: null,
        nombreCliente: v.nombreCliente,
        dniCliente: v.dniCliente,
        telefonoCliente: v.telefonoCliente,
        emailCliente: v.emailCliente,
        direccionEnvio: v.direccionEnvio ?? null,
        estado: v.estado,
        metodoPago: v.metodoPago,
        modalidadEntrega: v.modalidadEntrega,
        comprobanteUrl: v.comprobanteUrl ?? null,
        preparadorUsuarioId: (v as any).preparadorUsuarioId ?? null,
        preparadorNombre: v.preparadorNombre ?? null,
        total: total,
        notas: v.notas,
        items: {
          create: [
            {
              productoId: v.prod.id,
              nombre: v.prod.nombre,
              marca: v.prod.marca ?? null,
              cantidad: v.cant,
              precioUnitario: v.prod.precioVenta,
              subtotal: total,
            },
          ],
        },
      },
      select: { id: true, numero: true, estado: true, nombreCliente: true },
    });
    console.log(`  ✓ [#ORD-${created.numero}] (${created.estado}) - ${created.nombreCliente}`);
  }
  console.log("\n¡Ventas de ejemplo creadas con éxito!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
