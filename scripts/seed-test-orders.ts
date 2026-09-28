import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as any);

async function main() {
  const producto = await prisma.producto.findFirst({
    where: { activo: true, cantidad: { gt: 0 } },
    select: { id: true, precioVenta: true, nombre: true, marca: true },
  });
  if (!producto) throw new Error("Sin producto activo con stock");

  const last = await prisma.pedidoEcommerce.findFirst({
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  let num = last ? Math.max(1050, last.numero + 1) : 1050;

  const orders = [
    {
      nombreCliente: "Juan Pérez",
      dniCliente: "30111001",
      emailCliente: "juan@test.com",
      telefonoCliente: "3764111001",
      modalidadEntrega: "RETIRO_LOCAL",
      label: "Retiro #1 - Juan Pérez",
    },
    {
      nombreCliente: "Ana López",
      dniCliente: "30111002",
      emailCliente: "ana@test.com",
      telefonoCliente: "3764111002",
      modalidadEntrega: "RETIRO_LOCAL",
      label: "Retiro #2 - Ana López",
    },
    {
      nombreCliente: "Rodrigo García",
      dniCliente: "30111003",
      emailCliente: "rodrigo@test.com",
      telefonoCliente: "3764111003",
      modalidadEntrega: "MOTOMANDADO",
      label: "Envío #1 - Rodrigo García",
    },
    {
      nombreCliente: "Valeria Torres",
      dniCliente: "30111004",
      emailCliente: "valeria@test.com",
      telefonoCliente: "3764111004",
      modalidadEntrega: "MOTOMANDADO",
      label: "Envío #2 - Valeria Torres",
    },
  ] as const;

  for (const o of orders) {
    const created = await prisma.pedidoEcommerce.create({
      data: {
        numero: num++,
        clienteId: null,
        nombreCliente: o.nombreCliente,
        dniCliente: o.dniCliente,
        telefonoCliente: o.telefonoCliente,
        emailCliente: o.emailCliente,
        direccionEnvio:
          o.modalidadEntrega === "MOTOMANDADO" ? "Av. San Martín 1500, Posadas" : null,
        estado: "PENDIENTE",
        metodoPago: "TRANSFERENCIA",
        modalidadEntrega: o.modalidadEntrega,
        comprobanteUrl:
          "https://placehold.co/400x600/0f172a/38bdf8?text=Comprobante+Transferencia",
        total: producto.precioVenta,
        notas: "Pedido de prueba con comprobante — listo para flujo manual",
        items: {
          create: [
            {
              productoId: producto.id,
              nombre: producto.nombre,
              marca: producto.marca ?? null,
              cantidad: 1,
              precioUnitario: producto.precioVenta,
              subtotal: producto.precioVenta,
            },
          ],
        },
      },
      select: { id: true, numero: true },
    });
    console.log(`  OK [${o.label}] #${created.id} (ORD-${created.numero})`);
  }
  console.log("\nListo — 4 pedidos PENDIENTE con comprobante creados.");
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
