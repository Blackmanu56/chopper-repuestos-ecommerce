/**
 * Seed demo orders for all lifecycle states + fix order #10 preparer.
 * Run from project root: npx tsx scripts/seed-demo-orders.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  // ── Fix Order #10 preparer ────────────────────────────────────────────────
  console.log("Fixing order #10 preparer...");
  await prisma.pedidoEcommerce.update({
    where: { id: 10 },
    data: { preparadorUsuarioId: 3, preparadorNombre: "María García" },
  });
  console.log("  ✓ Order #10 preparer fixed → María García");

  // ── Fetch first active product ────────────────────────────────────────────
  const producto = await prisma.producto.findFirst({
    where: { activo: true, cantidad: { gt: 0 } },
    select: { id: true, precioVenta: true, nombre: true, marca: true },
  });
  if (!producto) throw new Error("No active product with stock found.");
  console.log(`Using product: ${producto.nombre} (#${producto.id}) @ $${producto.precioVenta}`);

  // ── Calculate next numero ────────────────────────────────────────────────
  const lastOrder = await prisma.pedidoEcommerce.findFirst({
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  let nextNumero = lastOrder ? Math.max(1050, lastOrder.numero + 1) : 1050;

  // ── Demo orders ───────────────────────────────────────────────────────────
  const demoOrders = [
    {
      estado: "PENDIENTE",
      metodoPago: "TRANSFERENCIA",
      modalidadEntrega: "RETIRO_LOCAL",
      comprobanteUrl: "https://placehold.co/400x600/0f172a/ffffff?text=Comprobante+DEMO",
      notas: "DEMO: Transferencia recibida — esperando verificación de Ventas",
      label: "PENDIENTE con comprobante",
    },
    {
      estado: "CONFIRMADO",
      metodoPago: "TARJETA",
      modalidadEntrega: "RETIRO_LOCAL",
      notas: "DEMO: Pago con tarjeta aprobado — listo para enviar a Stock",
      label: "CONFIRMADO (tarjeta)",
    },
    {
      estado: "PREPARANDO",
      metodoPago: "TARJETA",
      modalidadEntrega: "RETIRO_LOCAL",
      preparadorUsuarioId: 3,
      preparadorNombre: "María García",
      notas: "DEMO: Stock preparando el pedido para retiro",
      label: "PREPARANDO (retiro local)",
    },
    {
      estado: "PREPARANDO",
      metodoPago: "EFECTIVO_LOCAL",
      modalidadEntrega: "MOTOMANDADO",
      preparadorUsuarioId: 3,
      preparadorNombre: "María García",
      notas: "DEMO: Stock preparando para motomandado",
      label: "PREPARANDO (motomandado)",
    },
    {
      estado: "LISTO_PARA_RETIRAR",
      metodoPago: "TARJETA",
      modalidadEntrega: "RETIRO_LOCAL",
      preparadorUsuarioId: 3,
      preparadorNombre: "María García",
      notas: "DEMO: Paquete listo — cliente puede retirar. Ventas confirma en mostrador.",
      label: "LISTO PARA RETIRAR",
    },
    {
      estado: "LISTO_ENTREGA",
      metodoPago: "EFECTIVO_LOCAL",
      modalidadEntrega: "MOTOMANDADO",
      preparadorUsuarioId: 3,
      preparadorNombre: "María García",
      notas: "DEMO: Paquete listo para despachar con motomandado",
      label: "LISTO ENTREGA (motomandado)",
    },
    {
      estado: "CANCELADO",
      metodoPago: "TRANSFERENCIA",
      modalidadEntrega: "RETIRO_LOCAL",
      notas: "DEMO: Pedido cancelado — stock restituido",
      label: "CANCELADO",
    },
  ] as const;

  console.log("\nSeeding demo orders...");
  for (const order of demoOrders) {
    const num = nextNumero++;
    const created = await prisma.pedidoEcommerce.create({
      data: {
        numero: num,
        clienteId: null,
        nombreCliente: "Demo Cliente",
        dniCliente: "00000000",
        telefonoCliente: "3764000000",
        emailCliente: "demo@chopperrepuestos.com",
        direccionEnvio: order.modalidadEntrega === "MOTOMANDADO" ? "Av. San Martín 1500, Posadas" : null,
        estado: order.estado,
        metodoPago: order.metodoPago,
        modalidadEntrega: order.modalidadEntrega,
        comprobanteUrl: "comprobanteUrl" in order ? order.comprobanteUrl : null,
        preparadorUsuarioId: "preparadorUsuarioId" in order ? order.preparadorUsuarioId : null,
        preparadorNombre: "preparadorNombre" in order ? order.preparadorNombre : null,
        total: producto.precioVenta,
        notas: order.notas,
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
    console.log(`  ✓ [${order.label}] #${created.id} (ORD-${created.numero}) created`);
  }

  console.log("\n✅ Done! All demo orders seeded.");
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
